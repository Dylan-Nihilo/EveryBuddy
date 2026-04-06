import net from "node:net";
import path from "node:path";
import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { localizeRarityName, localizeSpeciesName, localizeStatName, uiText, } from "../i18n/ui.js";
import { readCompanionRecord } from "../storage/companion.js";
import { resolveBuddyConfig } from "../storage/config.js";
import { composeFrame } from "../render/compose.js";
import { bold, colorize, dim, italic } from "../render/color.js";
import { BUBBLE_MAX_LINES, BUBBLE_MAX_WIDTH, IDLE_SUMMARY_MAX_LINES, IDLE_SUMMARY_WIDTH, buildIdleSoulSummary, centerBlock, centerLine, renderSpeechBubble, resolveReactionBubble, resolveRenderMode, resolveSpriteFrameState, wrapText, } from "../render/layout.js";
import { EYES, SPECIES, renderCompactFace } from "../render/sprites.js";
import { buildCommandTracker, buildCommandWindowEntry, buildMemoryEntry, createCompanionObserver, rememberCommandWindowEntry, rememberMemoryEntry, } from "./observer.js";
import { ensureSocketDirectory, removeSocketIfExists, socketPathForWindow } from "./socket.js";
import { SIDECAR_OPTION, TARGET_OPTION, TmuxClient } from "./tmux.js";
const FRAME_TICK_MS = 500;
const HEALTH_TICK_MS = 1000;
const DEFAULT_PANE_WIDTH = 30;
const DEFAULT_PANE_HEIGHT = 24;
const BUBBLE_SHOW_MS = 10_000;
const NARROW_REACTION_MAX_LINES = 2;
const PULSE_TICKS = 4;
const PET_BURST_FRAMES = [
    ["   ♥    ♥   "],
    ["  ♥  ♥   ♥  "],
    [" ♥   ♥    ♥ "],
    ["  ·   ·   · "],
];
export async function runSidecarCommand(options) {
    const tmux = new TmuxClient();
    const config = await resolveBuddyConfig();
    const sidecarPaneId = process.env.TMUX_PANE?.trim();
    if (!sidecarPaneId) {
        throw new Error("EveryBuddy sidecar requires a tmux pane.");
    }
    const socketPath = socketPathForWindow(options.windowId);
    await ensureSocketDirectory();
    await removeSocketIfExists(socketPath);
    const state = {
        windowId: options.windowId,
        sidecarPaneId,
        targetPaneId: options.targetPane,
        language: config.language,
        companion: await readCompanionRecord(),
        frameTick: 0,
        renderMode: resolveRenderMode(currentPaneWidth()),
        status: "idle",
        reactionText: undefined,
        reactionExpiresAt: undefined,
        lastCommand: undefined,
        lastExitCode: undefined,
        cwd: undefined,
        lastUpdatedAt: Date.now(),
        memory: [],
        commandTrackers: {},
        commandWindows: {},
        recentReaction: undefined,
        recentNotableReactionAt: undefined,
        directAddressActive: false,
        pulseUntilTick: undefined,
    };
    const observer = await createCompanionObserver(state.companion);
    let observerEventVersion = 0;
    let renderedLineCount = 0;
    const rerender = () => {
        state.renderMode = resolveRenderMode(currentPaneWidth());
        renderedLineCount = renderSidecar(state, renderedLineCount);
    };
    const server = net.createServer((connection) => {
        let buffer = "";
        connection.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            let newlineIndex = buffer.indexOf("\n");
            while (newlineIndex >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                newlineIndex = buffer.indexOf("\n");
                if (line.length > 0) {
                    const eventVersion = ++observerEventVersion;
                    void handleShellEvent(state, line, observer, rerender, eventVersion, () => {
                        return observerEventVersion === eventVersion;
                    });
                }
            }
        });
    });
    let closed = false;
    const cleanup = async () => {
        if (closed) {
            return;
        }
        closed = true;
        clearInterval(frameTimer);
        clearInterval(healthTimer);
        server.close();
        const registeredSidecarPaneId = await tmux
            .getWindowOption(options.windowId, SIDECAR_OPTION)
            .catch(() => undefined);
        if (registeredSidecarPaneId === sidecarPaneId) {
            await removeSocketIfExists(socketPath);
            await tmux.unsetWindowOption(options.windowId, SIDECAR_OPTION);
            await tmux.unsetWindowOption(options.windowId, TARGET_OPTION);
        }
        showCursor();
    };
    const frameTimer = setInterval(() => {
        state.frameTick += 1;
        state.renderMode = resolveRenderMode(currentPaneWidth());
        expireReactionIfNeeded(state, Date.now());
        rerender();
    }, FRAME_TICK_MS);
    const healthTimer = setInterval(async () => {
        const panes = await tmux.listWindowPanes(options.windowId).catch(() => []);
        const nextTarget = resolveTargetPane(panes, sidecarPaneId, state.targetPaneId);
        if (!nextTarget) {
            await cleanup();
            process.exit(0);
            return;
        }
        if (nextTarget !== state.targetPaneId) {
            state.targetPaneId = nextTarget;
            state.directAddressActive = false;
            await tmux.setWindowOption(options.windowId, TARGET_OPTION, nextTarget).catch(() => { });
            state.status = "idle";
            state.lastUpdatedAt = Date.now();
            rerender();
        }
    }, HEALTH_TICK_MS);
    process.on("SIGINT", () => {
        void cleanup().finally(() => process.exit(0));
    });
    process.on("SIGTERM", () => {
        void cleanup().finally(() => process.exit(0));
    });
    hideCursor();
    await new Promise((resolve, reject) => {
        server.on("error", reject);
        server.listen(socketPath, () => resolve());
    });
    rerender();
}
export function resolveTargetPane(paneIds, sidecarPaneId, currentTargetPaneId) {
    const workPaneIds = paneIds.filter((paneId) => paneId !== sidecarPaneId);
    if (currentTargetPaneId && workPaneIds.includes(currentTargetPaneId)) {
        return currentTargetPaneId;
    }
    return workPaneIds[0];
}
async function handleShellEvent(state, payload, observer, rerender, eventVersion, isCurrent) {
    try {
        const event = JSON.parse(payload);
        if (event.windowId !== state.windowId) {
            return;
        }
        state.targetPaneId = event.paneId;
        state.cwd = event.cwd;
        state.lastUpdatedAt = event.timestamp;
        state.renderMode = resolveRenderMode(currentPaneWidth());
        if (event.type === "input_update" || event.type === "command_start" || event.type === "command_end") {
            state.lastCommand = event.command;
        }
        if (event.type === "command_start") {
            state.lastExitCode = undefined;
        }
        if (event.type === "command_end") {
            state.lastExitCode = event.exitCode;
        }
        const plan = observer.observe(event, state);
        state.directAddressActive =
            (event.type === "input_update" || event.type === "command_start") && plan.addressedToBuddy;
        if (event.type === "command_start" && plan.command) {
            state.commandTrackers[event.paneId] = buildCommandTracker(event, plan.command, plan.importance);
        }
        if (event.type === "command_end") {
            if (plan.command) {
                state.commandWindows[event.paneId] = rememberCommandWindowEntry(state.commandWindows[event.paneId] ?? [], buildCommandWindowEntry({
                    event,
                    command: plan.command,
                    durationMs: plan.durationMs,
                }));
            }
            delete state.commandTrackers[event.paneId];
            state.directAddressActive = false;
        }
        applyObserverPlan(state, plan, event.timestamp);
        if (plan.pulse) {
            state.pulseUntilTick = state.frameTick + PULSE_TICKS;
        }
        rerender();
        if (event.type !== "command_end") {
            return;
        }
        const modelDecision = await observer.maybeGenerateDecision(plan, event, state);
        if (!isCurrent()) {
            return;
        }
        const modelReaction = modelDecision?.reaction;
        const finalReaction = modelReaction ?? plan.reactionText;
        if (modelReaction) {
            setTransientReaction(state, modelReaction, Date.now());
            rerender();
        }
        if (finalReaction && plan.command) {
            state.recentReaction = {
                text: finalReaction,
                at: Date.now(),
                topic: modelDecision?.topic,
                mood: modelDecision?.mood,
            };
            state.recentNotableReactionAt = Date.now();
        }
        if (finalReaction && plan.command) {
            state.memory = rememberMemoryEntry(state.memory, buildMemoryEntry({
                event,
                command: plan.command,
                importance: plan.importance,
                durationMs: plan.durationMs,
                reactionText: finalReaction,
                topic: modelDecision?.topic,
                mood: modelDecision?.mood,
            }));
        }
    }
    catch {
        // Ignore malformed events from shell hooks.
        void eventVersion;
    }
}
function applyObserverPlan(state, plan, observedAt) {
    state.status = plan.status;
    if (plan.reactionMode === "preserve") {
        return;
    }
    if (plan.reactionMode === "clear") {
        state.reactionText = undefined;
        state.reactionExpiresAt = undefined;
        return;
    }
    if (!plan.reactionText) {
        state.reactionText = undefined;
        state.reactionExpiresAt = undefined;
        return;
    }
    if (plan.reactionMode === "persistent") {
        state.reactionText = plan.reactionText;
        state.reactionExpiresAt = undefined;
        return;
    }
    setTransientReaction(state, plan.reactionText, observedAt);
}
function renderSidecar(state, previousLineCount) {
    void previousLineCount;
    const bodyLines = state.companion
        ? renderCompanionSidecar(state)
        : renderEmptySidecar(state);
    const nextLineCount = currentPaneHeight();
    const lines = bottomAlignLines(bodyLines, nextLineCount);
    process.stdout.write(buildRenderBuffer(lines, nextLineCount));
    return nextLineCount;
}
function renderCompanionSidecar(state) {
    const companion = state.companion;
    if (!companion) {
        return renderEmptySidecar(state);
    }
    const species = SPECIES[companion.bones.species];
    const eye = EYES[companion.bones.eye];
    if (!species || !eye) {
        return renderEmptySidecar(state);
    }
    const reaction = resolveReactionBubble(state, Date.now());
    const spriteFrame = resolveSpriteFrameState(state.frameTick, state.status !== "idle" || reaction.text !== undefined, species.frames.length, isPulseActive(state));
    const frame = species.frames[spriteFrame.frameIndex] ?? species.frames[0];
    if (!frame) {
        return renderEmptySidecar(state);
    }
    const sprite = maybeBlinkSprite(composeFrame(frame, eye.char, companion.bones.hat, companion.bones.color), eye.char, spriteFrame.blink);
    const burst = renderPetBurst(state, companion.bones.color.accent);
    if (state.renderMode === "narrow") {
        return renderNarrowCompanion(state, reaction, eye.char, companion.bones.color.primary);
    }
    const paneWidth = currentPaneWidth();
    const paneHeight = currentPaneHeight();
    const statusHint = statusHintText(state.status, state.lastExitCode, state.language);
    const dockLines = renderCompanionDock(state, sprite, burst, paneWidth, companion.bones.color.primary, companion.bones.color.accent, resolveIdleSummaryWidth(paneWidth));
    const lines = [];
    if (reaction.text) {
        lines.push(...centerBlock(renderSpeechBubble(reaction.text, reaction.fading, companion.bones.color.primary, resolveBubbleContentWidth(paneWidth), resolveBubbleMaxLines(paneHeight, dockLines.length)), paneWidth));
        lines.push("");
    }
    else if (statusHint) {
        lines.push(dim(centerLine(statusHint, paneWidth)));
        lines.push("");
    }
    lines.push(...dockLines);
    return trimTrailingEmptyLines(lines);
}
function renderNarrowCompanion(state, reaction, eyeChar, color) {
    const paneWidth = currentPaneWidth();
    const face = styleCompactFace(renderCompactFace(state.companion?.bones.species ?? "tanuki", eyeChar), color, isPulseActive(state));
    const rawLabel = reaction.text ?? state.companion?.soul.name ?? "EveryBuddy";
    const labelLines = wrapText(rawLabel, Math.max(10, paneWidth - 2), reaction.text ? NARROW_REACTION_MAX_LINES : 1).map((line) => {
        const styled = reaction.fading ? dim(line) : styleNarrowLabel(line, state, color);
        return centerLine(styled, paneWidth);
    });
    const statusHint = !reaction.text
        ? statusHintText(state.status, state.lastExitCode, state.language)
        : undefined;
    return trimTrailingEmptyLines([
        centerLine(face, paneWidth),
        ...labelLines,
        ...(statusHint ? [dim(centerLine(statusHint, paneWidth))] : []),
    ]);
}
function renderEmptySidecar(state) {
    const paneWidth = currentPaneWidth();
    const paneHeight = currentPaneHeight();
    const reaction = resolveReactionBubble(state, Date.now());
    const text = uiText(state.language);
    const lines = [
        centerLine(dim(text.noCompanionSidecar), paneWidth),
        centerLine(text.runBuddyHint, paneWidth),
    ];
    if (reaction.text) {
        lines.push("");
        lines.push(...centerBlock(renderSpeechBubble(reaction.text, reaction.fading, "#9CA3AF", resolveBubbleContentWidth(paneWidth), resolveBubbleMaxLines(paneHeight, lines.length)), paneWidth));
    }
    return trimTrailingEmptyLines(lines);
}
function renderCompanionDock(state, sprite, burst, paneWidth, primaryColor, accentColor, summaryWidth) {
    const companion = state.companion;
    if (!companion) {
        return [];
    }
    const text = uiText(state.language);
    const [peakStat, peakValue] = getPeakStat(companion.bones.stats);
    const [dumpStat, dumpValue] = getDumpStat(companion.bones.stats);
    const localizedRarity = localizeRarityName(companion.bones.rarity.name, state.language);
    const rarityLine = colorize(`◆ ${state.language === "zh" ? localizedRarity : localizedRarity.toUpperCase()} ${companion.bones.rarity.stars}`, companion.bones.rarity.color);
    const projectName = state.cwd ? path.basename(state.cwd) || state.cwd : undefined;
    const infoLine = dim([
        localizeSpeciesName(companion.bones.species, SPECIES[companion.bones.species]?.name ?? companion.bones.species, state.language),
        projectName ? text.inProject(projectName) : undefined,
    ]
        .filter(Boolean)
        .join(" · "));
    const statLine = dim(`${localizeStatName(peakStat, state.language)} ${String(peakValue).padStart(2, "0")} · ${localizeStatName(dumpStat, state.language)} ${String(dumpValue).padStart(2, "0")}`);
    const summary = buildIdleSoulSummary(companion, state.language);
    const personalityLines = state.reactionText === undefined
        ? wrapText(summary, summaryWidth, IDLE_SUMMARY_MAX_LINES).map((line) => dim(centerLine(line, paneWidth)))
        : [];
    return trimTrailingEmptyLines([
        centerLine(rarityLine, paneWidth),
        centerLine(infoLine, paneWidth),
        centerLine(statLine, paneWidth),
        ...(personalityLines.length > 0 ? ["", ...personalityLines, ""] : [""]),
        ...(burst.length > 0 ? centerBlock(burst, paneWidth) : []),
        ...centerBlock(sprite, paneWidth),
        "",
        centerLine(styleCompanionName(companion.soul.name, state, primaryColor), paneWidth),
        centerLine(dim(colorize(localizedRarity, accentColor)), paneWidth),
    ]);
}
function resolveBubbleContentWidth(paneWidth) {
    return Math.max(16, Math.min(BUBBLE_MAX_WIDTH, paneWidth - 6));
}
function resolveBubbleMaxLines(paneHeight, dockLineCount) {
    const available = paneHeight - dockLineCount - 4;
    return Math.max(2, Math.min(BUBBLE_MAX_LINES, available));
}
function resolveIdleSummaryWidth(paneWidth) {
    return Math.max(16, Math.min(IDLE_SUMMARY_WIDTH, paneWidth - 6));
}
function styleCompanionName(name, state, color) {
    const styledName = italic(name);
    if (state.directAddressActive || isPulseActive(state)) {
        return bold(italic(colorize(` ${name} `, color)));
    }
    if (state.reactionText) {
        return italic(colorize(name, color));
    }
    return dim(styledName);
}
function styleCompactFace(text, color, pulsing) {
    const colored = colorize(text, color);
    return pulsing ? bold(colored) : colored;
}
function styleNarrowLabel(text, state, color) {
    if (state.directAddressActive || state.reactionText) {
        return colorize(text, color);
    }
    return dim(text);
}
function statusHintText(status, exitCode, language) {
    const text = uiText(language);
    if (status === "thinking") {
        return text.thinking;
    }
    if (status === "finished" && exitCode !== undefined && exitCode !== 0) {
        return text.commandFailed;
    }
    return undefined;
}
function expireReactionIfNeeded(state, now) {
    if (state.reactionExpiresAt === undefined || now < state.reactionExpiresAt) {
        return;
    }
    state.reactionText = undefined;
    state.reactionExpiresAt = undefined;
    if (state.status === "finished") {
        state.status = "idle";
        state.lastExitCode = undefined;
    }
}
function setTransientReaction(state, text, startedAt = Date.now()) {
    state.reactionText = text;
    state.reactionExpiresAt = startedAt + BUBBLE_SHOW_MS;
}
function maybeBlinkSprite(sprite, eyeChar, blink) {
    if (!blink) {
        return sprite;
    }
    return sprite.map((line) => line.replaceAll(eyeChar, "-"));
}
function buildRenderBuffer(lines, lineCount) {
    const output = ["\u001B[H"];
    for (let index = 0; index < lineCount; index += 1) {
        output.push("\u001B[2K");
        output.push(lines[index] ?? "");
        if (index < lineCount - 1) {
            output.push("\n");
        }
    }
    return output.join("");
}
function currentPaneWidth() {
    return process.stdout.columns ?? DEFAULT_PANE_WIDTH;
}
function currentPaneHeight() {
    return process.stdout.rows ?? DEFAULT_PANE_HEIGHT;
}
function isPulseActive(state) {
    return state.pulseUntilTick !== undefined && state.frameTick < state.pulseUntilTick;
}
function trimTrailingEmptyLines(lines) {
    const output = [...lines];
    while (output.length > 0 && output[output.length - 1]?.trim().length === 0) {
        output.pop();
    }
    return output;
}
function bottomAlignLines(lines, height) {
    if (height <= 0) {
        return lines;
    }
    const trimmed = trimTrailingEmptyLines(lines);
    if (trimmed.length >= height) {
        return trimmed.slice(trimmed.length - height);
    }
    return [...Array.from({ length: height - trimmed.length }, () => ""), ...trimmed];
}
function renderPetBurst(state, color) {
    if (!isPulseActive(state)) {
        return [];
    }
    const frame = PET_BURST_FRAMES[state.frameTick % PET_BURST_FRAMES.length] ?? ["   ♥    ♥   "];
    return frame.map((line) => colorize(line, color));
}
function hideCursor() {
    if (process.stdout.isTTY) {
        process.stdout.write("\u001B[?25l");
    }
}
function showCursor() {
    if (process.stdout.isTTY) {
        process.stdout.write("\u001B[?25h");
    }
}
//# sourceMappingURL=sidecar.js.map