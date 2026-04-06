import { execFileSync } from "node:child_process";
import { composeFrame } from "../render/compose.js";
import { colorize, dim } from "../render/color.js";
import { padDisplayWidth } from "../render/layout.js";
import { SPECIES, EYES } from "../render/sprites.js";
import { localizeSpeciesName } from "../i18n/ui.js";
import { readCompanionRecord } from "../storage/companion.js";
import { resolveBuddyConfig } from "../storage/config.js";
const SPRITE_PAD_WIDTH = 14;
const SIDE_GAP = "  ";
const LEFT_MARGIN = " ";
export async function runCCStatusLineCommand() {
    // Claude Code pipes stdout — force isTTY so ANSI colors render.
    Object.defineProperty(process.stdout, "isTTY", { value: true });
    const [session, companion, config] = await Promise.all([
        readStdinJSON(),
        readCompanionRecord().catch(() => null),
        resolveBuddyConfig().catch(() => ({ language: "zh" })),
    ]);
    const language = config.language;
    const output = companion
        ? renderCompanionStatusLine(companion, session, language)
        : renderEmptyStatusLine(session);
    process.stdout.write(output);
}
// ── Rendering ────────────────────────────────────────────────────────────────
export function renderCompanionStatusLine(companion, session, language) {
    const species = SPECIES[companion.bones.species];
    const eye = EYES[companion.bones.eye];
    if (!species || !eye) {
        return renderEmptyStatusLine(session);
    }
    const frameIndex = Math.floor(Date.now() / 600) % species.frames.length;
    const frame = species.frames[frameIndex];
    if (!frame) {
        return renderEmptyStatusLine(session);
    }
    const spriteLines = composeFrame(frame, eye.char, companion.bones.hat, companion.bones.color);
    const speciesName = localizeSpeciesName(species.id, species.name, language);
    const nameLabel = colorize(companion.soul.name, companion.bones.color.primary);
    const rightLines = [
        `${nameLabel} · ${speciesName}`,
        buildInfoBar(session, language),
    ];
    return composeSideBySide(spriteLines, rightLines, true);
}
export function renderEmptyStatusLine(session) {
    const rightLines = [
        dim("No companion — run `buddy` to hatch"),
        buildInfoBar(session, "en"),
    ];
    return rightLines.join("\n");
}
export function composeSideBySide(spriteLines, rightLines, centerRight = false) {
    const height = Math.max(spriteLines.length, rightLines.length);
    const lines = [];
    const rightOffset = centerRight
        ? Math.max(0, Math.floor((spriteLines.length - rightLines.length) / 2))
        : 0;
    for (let i = 0; i < height; i++) {
        const sprite = padDisplayWidth(spriteLines[i] ?? "", SPRITE_PAD_WIDTH);
        const right = rightLines[i - rightOffset] ?? "";
        lines.push(`${LEFT_MARGIN}${sprite}${SIDE_GAP}${right}`);
    }
    return lines.join("\n");
}
export function buildInfoBar(session, language) {
    if (!session) {
        return "";
    }
    const parts = [];
    const rawModelName = session.model?.display_name ?? "Claude";
    const modelName = rawModelName.split(/\s/)[0] ?? rawModelName;
    parts.push(`[${modelName}]`);
    const pct = Math.floor(session.context_window?.used_percentage ?? 0);
    parts.push(`${pct}%`);
    const cwd = session.workspace?.current_dir ?? session.cwd;
    if (cwd) {
        const branch = detectGitBranch(cwd);
        if (branch) {
            parts.push(branch);
        }
    }
    const cost = session.cost?.total_cost_usd ?? 0;
    if (cost > 0) {
        parts.push(`$${cost.toFixed(2)}`);
    }
    return dim(parts.join(" | "));
}
// ── Helpers ──────────────────────────────────────────────────────────────────
function detectGitBranch(cwd) {
    try {
        const result = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd,
            timeout: 500,
            stdio: ["ignore", "pipe", "ignore"],
        });
        const branch = result.toString("utf8").trim();
        return branch.length > 0 ? branch : null;
    }
    catch {
        return null;
    }
}
export function parseSessionJSON(raw) {
    if (!raw.trim()) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function readStdinJSON() {
    return new Promise((resolve) => {
        if (process.stdin.isTTY) {
            resolve(null);
            return;
        }
        let data = "";
        const timeout = setTimeout(() => {
            process.stdin.removeAllListeners();
            resolve(parseSessionJSON(data));
        }, 1_000);
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => {
            data += chunk;
        });
        process.stdin.on("end", () => {
            clearTimeout(timeout);
            resolve(parseSessionJSON(data));
        });
        process.stdin.on("error", () => {
            clearTimeout(timeout);
            resolve(null);
        });
        process.stdin.resume();
    });
}
//# sourceMappingURL=cc-statusline.js.map