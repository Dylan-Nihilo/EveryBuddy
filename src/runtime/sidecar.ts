import net from "node:net";
import path from "node:path";

import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { readCompanionRecord } from "../storage/companion.js";
import { composeFrame } from "../render/compose.js";
import { bold, colorize, dim } from "../render/color.js";
import { EYES, SPECIES, renderCompactFace } from "../render/sprites.js";
import {
  buildCommandTracker,
  buildCommandWindowEntry,
  buildMemoryEntry,
  createCompanionObserver,
  rememberCommandWindowEntry,
  rememberMemoryEntry,
} from "./observer.js";
import { ensureSocketDirectory, removeSocketIfExists, socketPathForWindow } from "./socket.js";
import { SIDECAR_OPTION, TARGET_OPTION, TmuxClient } from "./tmux.js";
import type { RenderMode, ShellEvent, SidecarState } from "./types.js";
import type { CompanionRecord, ObserverVoice, StatName } from "../types/companion.js";

const FRAME_TICK_MS = 500;
const HEALTH_TICK_MS = 1000;
const FULL_MODE_MIN_WIDTH = 26;
const DEFAULT_PANE_WIDTH = 30;
const DEFAULT_PANE_HEIGHT = 24;
const BUBBLE_SHOW_MS = 10_000;
const FADE_WINDOW_MS = 3_000;
const BUBBLE_MAX_WIDTH = 24;
const BUBBLE_MAX_LINES = 5;
const IDLE_SUMMARY_WIDTH = 24;
const IDLE_SUMMARY_MAX_LINES = 3;
const NARROW_REACTION_MAX_LINES = 2;
const PULSE_TICKS = 4;
const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];
const PET_BURST_FRAMES = [
  ["   ♥    ♥   "],
  ["  ♥  ♥   ♥  "],
  [" ♥   ♥    ♥ "],
  ["  ·   ·   · "],
];

export interface SidecarCommandOptions {
  windowId: string;
  targetPane?: string | undefined;
}

export async function runSidecarCommand(options: SidecarCommandOptions): Promise<void> {
  const tmux = new TmuxClient();
  const sidecarPaneId = process.env.TMUX_PANE?.trim();
  if (!sidecarPaneId) {
    throw new Error("EveryBuddy sidecar requires a tmux pane.");
  }

  const socketPath = socketPathForWindow(options.windowId);
  await ensureSocketDirectory();
  await removeSocketIfExists(socketPath);

  const state: SidecarState = {
    windowId: options.windowId,
    sidecarPaneId,
    targetPaneId: options.targetPane,
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
      await tmux.setWindowOption(options.windowId, TARGET_OPTION, nextTarget).catch(() => {});
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
  await new Promise<void>((resolve, reject) => {
    server.on("error", reject);
    server.listen(socketPath, () => resolve());
  });

  rerender();
}

export function resolveTargetPane(
  paneIds: string[],
  sidecarPaneId: string,
  currentTargetPaneId?: string,
): string | undefined {
  const workPaneIds = paneIds.filter((paneId) => paneId !== sidecarPaneId);

  if (currentTargetPaneId && workPaneIds.includes(currentTargetPaneId)) {
    return currentTargetPaneId;
  }

  return workPaneIds[0];
}

export function resolveRenderMode(columns: number): RenderMode {
  return columns >= FULL_MODE_MIN_WIDTH ? "full" : "narrow";
}

async function handleShellEvent(
  state: SidecarState,
  payload: string,
  observer: Awaited<ReturnType<typeof createCompanionObserver>>,
  rerender: () => void,
  eventVersion: number,
  isCurrent: () => boolean,
): Promise<void> {
  try {
    const event = JSON.parse(payload) as ShellEvent;

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
        state.commandWindows[event.paneId] = rememberCommandWindowEntry(
          state.commandWindows[event.paneId] ?? [],
          buildCommandWindowEntry({
            event,
            command: plan.command,
            durationMs: plan.durationMs,
          }),
        );
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
      state.memory = rememberMemoryEntry(
        state.memory,
        buildMemoryEntry({
          event,
          command: plan.command,
          importance: plan.importance,
          durationMs: plan.durationMs,
          reactionText: finalReaction,
          topic: modelDecision?.topic,
          mood: modelDecision?.mood,
        }),
      );
    }
  } catch {
    // Ignore malformed events from shell hooks.
    void eventVersion;
  }
}

function applyObserverPlan(
  state: SidecarState,
  plan: {
    status: SidecarState["status"];
    reactionMode: "clear" | "persistent" | "transient" | "preserve";
    reactionText: string | undefined;
  },
  observedAt: number,
): void {
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

function renderSidecar(state: SidecarState, previousLineCount: number): number {
  void previousLineCount;

  const bodyLines = state.companion
    ? renderCompanionSidecar(state)
    : renderEmptySidecar(state);
  const nextLineCount = currentPaneHeight();
  const lines = bottomAlignLines(bodyLines, nextLineCount);
  process.stdout.write(buildRenderBuffer(lines, nextLineCount));
  return nextLineCount;
}

function renderCompanionSidecar(state: SidecarState): string[] {
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
  const spriteFrame = resolveSpriteFrameState(
    state.frameTick,
    state.status !== "idle" || reaction.text !== undefined,
    species.frames.length,
    isPulseActive(state),
  );
  const frame = species.frames[spriteFrame.frameIndex] ?? species.frames[0];
  if (!frame) {
    return renderEmptySidecar(state);
  }

  const sprite = maybeBlinkSprite(
    composeFrame(frame, eye.char, companion.bones.hat, companion.bones.color),
    eye.char,
    spriteFrame.blink,
  );
  const burst = renderPetBurst(state, companion.bones.color.accent);

  if (state.renderMode === "narrow") {
    return renderNarrowCompanion(state, reaction, eye.char, companion.bones.color.primary);
  }

  const paneWidth = currentPaneWidth();
  const paneHeight = currentPaneHeight();
  const statusHint = statusHintText(state.status, state.lastExitCode);
  const dockLines = renderCompanionDock(
    state,
    sprite,
    burst,
    paneWidth,
    companion.bones.color.primary,
    companion.bones.color.accent,
    resolveIdleSummaryWidth(paneWidth),
  );
  const lines: string[] = [];

  if (reaction.text) {
    lines.push(
      ...centerBlock(
        renderSpeechBubble(
          reaction.text,
          reaction.fading,
          companion.bones.color.primary,
          resolveBubbleContentWidth(paneWidth),
          resolveBubbleMaxLines(paneHeight, dockLines.length),
        ),
        paneWidth,
      ),
    );
    lines.push("");
  } else if (statusHint) {
    lines.push(dim(centerLine(statusHint, paneWidth)));
    lines.push("");
  }

  lines.push(...dockLines);

  return trimTrailingEmptyLines(lines);
}

function renderNarrowCompanion(
  state: SidecarState,
  reaction: { text: string | undefined; fading: boolean },
  eyeChar: string,
  color: string,
): string[] {
  const paneWidth = currentPaneWidth();
  const face = styleCompactFace(
    renderCompactFace(state.companion?.bones.species ?? "tanuki", eyeChar),
    color,
    isPulseActive(state),
  );
  const rawLabel = reaction.text ?? state.companion?.soul.name ?? "EveryBuddy";
  const labelLines = wrapText(
    rawLabel,
    Math.max(10, paneWidth - 2),
    reaction.text ? NARROW_REACTION_MAX_LINES : 1,
  ).map((line) => {
    const styled = reaction.fading ? dim(line) : styleNarrowLabel(line, state, color);
    return centerLine(styled, paneWidth);
  });
  const statusHint = !reaction.text ? statusHintText(state.status, state.lastExitCode) : undefined;

  return trimTrailingEmptyLines([
    centerLine(face, paneWidth),
    ...labelLines,
    ...(statusHint ? [dim(centerLine(statusHint, paneWidth))] : []),
  ]);
}

function renderEmptySidecar(state: SidecarState): string[] {
  const paneWidth = currentPaneWidth();
  const paneHeight = currentPaneHeight();
  const reaction = resolveReactionBubble(state, Date.now());
  const lines = [
    centerLine(dim("No companion hatched yet."), paneWidth),
    centerLine("Run `buddy`", paneWidth),
  ];

  if (reaction.text) {
    lines.push("");
    lines.push(
      ...centerBlock(
        renderSpeechBubble(
          reaction.text,
          reaction.fading,
          "#9CA3AF",
          resolveBubbleContentWidth(paneWidth),
          resolveBubbleMaxLines(paneHeight, lines.length),
        ),
        paneWidth,
      ),
    );
  }

  return trimTrailingEmptyLines(lines);
}

function renderCompanionDock(
  state: SidecarState,
  sprite: string[],
  burst: string[],
  paneWidth: number,
  primaryColor: string,
  accentColor: string,
  summaryWidth: number,
): string[] {
  const companion = state.companion;
  if (!companion) {
    return [];
  }

  const [peakStat, peakValue] = getPeakStat(companion.bones.stats);
  const [dumpStat, dumpValue] = getDumpStat(companion.bones.stats);
  const rarityLine = colorize(
    `◆ ${companion.bones.rarity.name.toUpperCase()} ${companion.bones.rarity.stars}`,
    companion.bones.rarity.color,
  );
  const projectName = state.cwd ? path.basename(state.cwd) || state.cwd : undefined;
  const infoLine = dim(
    [companion.bones.species, projectName ? `in ${projectName}` : undefined].filter(Boolean).join(" · "),
  );
  const statLine = dim(
    `${peakStat.toLowerCase()} ${String(peakValue).padStart(2, "0")} · ${dumpStat.toLowerCase()} ${String(dumpValue).padStart(2, "0")}`,
  );
  const summary = buildIdleSoulSummary(companion);
  const personalityLines =
    state.reactionText === undefined
      ? wrapText(summary, summaryWidth, IDLE_SUMMARY_MAX_LINES).map((line) =>
          dim(centerLine(line, paneWidth)),
        )
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
    centerLine(dim(colorize(companion.bones.rarity.name, accentColor)), paneWidth),
  ]);
}

function renderSpeechBubble(
  text: string,
  fading: boolean,
  color: string,
  contentWidth: number,
  maxLines: number,
): string[] {
  const wrapped = wrapText(text, contentWidth, maxLines);
  const innerWidth = Math.max(...wrapped.map((line) => visibleLength(line)), 8);
  const borderTop = styleBubbleBorder(`╭${"─".repeat(innerWidth + 2)}╮`, color, fading);
  const borderBottom = styleBubbleBorder(`╰${"─".repeat(innerWidth + 2)}╯`, color, fading);
  const tailPadding = " ".repeat(Math.max(0, Math.floor((innerWidth + 4) / 2)));

  return [
    borderTop,
    ...wrapped.map((line) => {
      const textLine = `${styleBubbleBorder("│", color, fading)} ${styleBubbleText(
        padDisplayWidth(line, innerWidth),
        fading,
      )} ${styleBubbleBorder("│", color, fading)}`;
      return textLine;
    }),
    borderBottom,
    `${tailPadding}${styleBubbleBorder("╲", color, fading)}`,
  ];
}

function resolveBubbleContentWidth(paneWidth: number): number {
  return Math.max(16, Math.min(BUBBLE_MAX_WIDTH, paneWidth - 6));
}

function resolveBubbleMaxLines(paneHeight: number, dockLineCount: number): number {
  const available = paneHeight - dockLineCount - 4;
  return Math.max(2, Math.min(BUBBLE_MAX_LINES, available));
}

function resolveIdleSummaryWidth(paneWidth: number): number {
  return Math.max(16, Math.min(IDLE_SUMMARY_WIDTH, paneWidth - 6));
}

function styleBubbleBorder(text: string, color: string, fading: boolean): string {
  const colored = colorize(text, color);
  return fading ? dim(colored) : colored;
}

function styleBubbleText(text: string, fading: boolean): string {
  return fading ? dim(text) : text;
}

function styleCompanionName(name: string, state: SidecarState, color: string): string {
  if (state.directAddressActive || isPulseActive(state)) {
    return bold(colorize(` ${name} `, color));
  }

  if (state.reactionText) {
    return colorize(name, color);
  }

  return dim(name);
}

function styleCompactFace(text: string, color: string, pulsing: boolean): string {
  const colored = colorize(text, color);
  return pulsing ? bold(colored) : colored;
}

function styleNarrowLabel(text: string, state: SidecarState, color: string): string {
  if (state.directAddressActive || state.reactionText) {
    return colorize(text, color);
  }

  return dim(text);
}

function statusHintText(status: SidecarState["status"], exitCode?: number): string | undefined {
  if (status === "thinking") {
    return "thinking";
  }

  if (status === "finished" && exitCode !== undefined && exitCode !== 0) {
    return "command failed";
  }

  return undefined;
}

export function resolveReactionBubble(
  state: Pick<SidecarState, "reactionText" | "reactionExpiresAt">,
  now: number,
): { text: string | undefined; fading: boolean } {
  if (!state.reactionText) {
    return { text: undefined, fading: false };
  }

  if (state.reactionExpiresAt === undefined) {
    return { text: state.reactionText, fading: false };
  }

  if (now >= state.reactionExpiresAt) {
    return { text: undefined, fading: false };
  }

  return {
    text: state.reactionText,
    fading: now >= state.reactionExpiresAt - FADE_WINDOW_MS,
  };
}

export function resolveSpriteFrameState(
  frameTick: number,
  animated: boolean,
  frameCount: number,
  pulsing = false,
): { frameIndex: number; blink: boolean } {
  if (frameCount <= 1) {
    return { frameIndex: 0, blink: false };
  }

  if (animated || pulsing) {
    return { frameIndex: frameTick % frameCount, blink: false };
  }

  const sequenceStep = IDLE_SEQUENCE[frameTick % IDLE_SEQUENCE.length] ?? 0;
  if (sequenceStep === -1) {
    return { frameIndex: 0, blink: true };
  }

  return { frameIndex: sequenceStep % frameCount, blink: false };
}

function wrapText(text: string, width: number, maxLines: number): string[] {
  if (text.trim().length === 0) {
    return [""];
  }

  const words = splitWrapTokens(text);
  const joiner = /\s/.test(text.trim()) ? " " : "";
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current}${joiner}${word}`;
    if (visibleLength(candidate) <= width) {
      current = candidate;
      continue;
    }

    if (current.length === 0 && visibleLength(word) > width) {
      const [head, tail] = splitTokenByDisplayWidth(word, width);
      lines.push(head);
      current = tail;
      if (lines.length >= maxLines - 1) {
        break;
      }
      continue;
    }

    if (current.length > 0) {
      lines.push(current);
    }

    current = word;
    if (lines.length >= maxLines - 1) {
      break;
    }
  }

  if (current.length > 0 && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === 0) {
    lines.push(splitTokenByDisplayWidth(text, width)[0]);
  }

  return lines.slice(0, maxLines).map((line, index, allLines) => {
    if (index === allLines.length - 1 && visibleLength(line) > width) {
      return truncateDisplayWidth(line, width);
    }

    if (index === maxLines - 1 && visibleLength(words.join(joiner)) > visibleLength(lines.join(joiner))) {
      return truncateDisplayWidth(line, width);
    }

    return line;
  });
}

function expireReactionIfNeeded(state: SidecarState, now: number): void {
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

function setTransientReaction(
  state: SidecarState,
  text: string,
  startedAt = Date.now(),
): void {
  state.reactionText = text;
  state.reactionExpiresAt = startedAt + BUBBLE_SHOW_MS;
}

function maybeBlinkSprite(sprite: string[], eyeChar: string, blink: boolean): string[] {
  if (!blink) {
    return sprite;
  }

  return sprite.map((line) => line.replaceAll(eyeChar, "-"));
}

function buildRenderBuffer(lines: string[], lineCount: number): string {
  const output: string[] = ["\u001B[H"];

  for (let index = 0; index < lineCount; index += 1) {
    output.push("\u001B[2K");
    output.push(lines[index] ?? "");

    if (index < lineCount - 1) {
      output.push("\n");
    }
  }

  return output.join("");
}

function centerLine(text: string, width: number): string {
  const visible = visibleLength(text);
  const left = Math.max(0, Math.floor((width - visible) / 2));
  return `${" ".repeat(left)}${text}`;
}

function visibleLength(value: string): number {
  const stripped = value.replace(/\u001B\[[0-9;]*m/g, "");
  return Array.from(stripped).reduce((sum, char) => sum + charDisplayWidth(char), 0);
}

function currentPaneWidth(): number {
  return process.stdout.columns ?? DEFAULT_PANE_WIDTH;
}

function currentPaneHeight(): number {
  return process.stdout.rows ?? DEFAULT_PANE_HEIGHT;
}

function isPulseActive(state: Pick<SidecarState, "frameTick" | "pulseUntilTick">): boolean {
  return state.pulseUntilTick !== undefined && state.frameTick < state.pulseUntilTick;
}

function trimTrailingEmptyLines(lines: string[]): string[] {
  const output = [...lines];

  while (output.length > 0 && output[output.length - 1]?.trim().length === 0) {
    output.pop();
  }

  return output;
}

function bottomAlignLines(lines: string[], height: number): string[] {
  if (height <= 0) {
    return lines;
  }

  const trimmed = trimTrailingEmptyLines(lines);
  if (trimmed.length >= height) {
    return trimmed.slice(trimmed.length - height);
  }

  return [...Array.from({ length: height - trimmed.length }, () => ""), ...trimmed];
}

function renderPetBurst(state: SidecarState, color: string): string[] {
  if (!isPulseActive(state)) {
    return [];
  }

  const frame = PET_BURST_FRAMES[state.frameTick % PET_BURST_FRAMES.length] ?? ["   ♥    ♥   "];
  return frame.map((line) => colorize(line, color));
}

function centerBlock(lines: string[], width: number): string[] {
  const blockWidth = Math.max(0, ...lines.map((line) => visibleLength(line)));
  const left = Math.max(0, Math.floor((width - blockWidth) / 2));
  return lines.map((line) => `${" ".repeat(left)}${line}`);
}

function splitWrapTokens(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [""];
  }

  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/);
  }

  return Array.from(trimmed);
}

export function buildIdleSoulSummary(companion: CompanionRecord): string {
  const tagline = companion.soul.tagline?.trim();
  if (tagline) {
    return tagline;
  }

  const profile = companion.soul.observerProfile;
  const [peakStat] = getPeakStat(companion.bones.stats);
  const [dumpStat] = getDumpStat(companion.bones.stats);

  if (looksChinese(companion.soul.personality)) {
    return `${voiceLabelZh(profile.voice)} · ${statLabelZh(peakStat)}强，${statLabelZh(dumpStat)}低`;
  }

  return `${voiceLabelEn(profile.voice)} · high ${statLabelEn(peakStat)} · low ${statLabelEn(dumpStat)}`;
}

function looksChinese(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function voiceLabelZh(voice: ObserverVoice): string {
  switch (voice) {
    case "quiet":
      return "安静型";
    case "dry":
      return "冷面型";
    case "playful":
      return "俏皮型";
    case "deadpan":
      return "面瘫型";
  }
}

function voiceLabelEn(voice: ObserverVoice): string {
  switch (voice) {
    case "quiet":
      return "quiet";
    case "dry":
      return "dry";
    case "playful":
      return "playful";
    case "deadpan":
      return "deadpan";
  }
}

function statLabelZh(stat: StatName): string {
  switch (stat) {
    case "GRIT":
      return "抗压";
    case "FOCUS":
      return "专注";
    case "CHAOS":
      return "混沌";
    case "WIT":
      return "机灵";
    case "SASS":
      return "毒舌";
  }
}

function statLabelEn(stat: StatName): string {
  switch (stat) {
    case "GRIT":
      return "grit";
    case "FOCUS":
      return "focus";
    case "CHAOS":
      return "chaos";
    case "WIT":
      return "wit";
    case "SASS":
      return "sass";
  }
}

function splitTokenByDisplayWidth(token: string, width: number): [string, string] {
  let head = "";
  let used = 0;
  const chars = Array.from(token);

  for (const char of chars) {
    const next = charDisplayWidth(char);
    if (used + next > width && head.length > 0) {
      break;
    }
    head += char;
    used += next;
    if (used >= width) {
      break;
    }
  }

  return [head, token.slice(head.length)];
}

function truncateDisplayWidth(value: string, width: number): string {
  const ellipsis = "…";
  const target = Math.max(0, width - visibleLength(ellipsis));
  let output = "";
  let used = 0;

  for (const char of Array.from(value)) {
    const next = charDisplayWidth(char);
    if (used + next > target) {
      break;
    }
    output += char;
    used += next;
  }

  return `${output}${ellipsis}`;
}

function padDisplayWidth(value: string, width: number): string {
  const padding = Math.max(0, width - visibleLength(value));
  return `${value}${" ".repeat(padding)}`;
}

function charDisplayWidth(char: string): number {
  if (/[\u0300-\u036f]/u.test(char)) {
    return 0;
  }

  if (
    /[\u1100-\u115f\u2329\u232a\u2e80-\u303e\u3040-\u30ff\u3100-\u312f\u3130-\u318f\u3190-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(
      char,
    )
  ) {
    return 2;
  }

  return 1;
}

function hideCursor(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\u001B[?25l");
  }
}

function showCursor(): void {
  if (process.stdout.isTTY) {
    process.stdout.write("\u001B[?25h");
  }
}
