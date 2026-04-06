import { getDumpStat, getPeakStat, STATS } from "../bones/stats.js";
import { getLocalizedSoulCopy } from "../i18n/companion.js";
import { localizeEyeLabel, localizeHatLabel, localizeRarityName, localizeSpeciesName, localizeStatName, uiText, } from "../i18n/ui.js";
import { composeFrame } from "./compose.js";
import { bold, colorize, dim, italic, rainbow } from "./color.js";
import { EYES, HATS, SPECIES } from "./sprites.js";
const MIN_CARD_WIDTH = 44;
export function renderCompanionCard(companion, options = {}) {
    const language = options.language ?? "zh";
    const bones = companion.bones;
    const soul = companion.soul;
    const localizedSoul = getLocalizedSoulCopy(companion, language);
    const species = assertExists(SPECIES[bones.species], `Unknown species: ${bones.species}`);
    const eye = assertExists(EYES[bones.eye], `Unknown eye: ${bones.eye}`);
    const hat = assertExists(HATS[bones.hat], `Unknown hat: ${bones.hat}`);
    const frameIndex = options.spriteFrameIndex ?? 0;
    const frame = species.frames[frameIndex % species.frames.length] ?? species.frames[0];
    const sprite = normalizeSpriteForCard(composeFrame(frame, eye.char, bones.hat, bones.color), bones.hat);
    const [peakStat] = getPeakStat(bones.stats);
    const [dumpStat] = getDumpStat(bones.stats);
    const speciesName = localizeSpeciesName(bones.species, species.name, language);
    const eyeLabel = localizeEyeLabel(bones.eye, eye.label, language);
    const hatLabel = localizeHatLabel(bones.hat, hat.label, language);
    const rarityName = localizeRarityName(bones.rarity.name, language);
    const speciesLine = `${speciesName}${bones.shiny ? ` · ${uiText(language).shinyLabel}` : ""}`;
    const rarityLabel = language === "zh" ? rarityName : rarityName.toUpperCase();
    const rarityText = `◆ ${rarityLabel} ${bones.rarity.stars}`;
    const rarityBadge = bones.rarity.tier >= 4 ? rainbow(rarityText) : colorize(rarityText, bones.rarity.color);
    // Stars — scale with rarity
    const starChar = "★";
    const starCount = Math.max(1, bones.rarity.tier + 1);
    const starsLine = Array(starCount).fill(starChar).join(" ");
    const coloredStars = bones.rarity.tier >= 4 ? rainbow(starsLine) : colorize(starsLine, bones.rarity.color);
    // Personality — italic dim, compact
    const personalityLines = wrapText(localizedSoul.personality, MIN_CARD_WIDTH - 4).map((line) => `  ${dim(italic(line))}`);
    // Stats — █░ bars
    const statLines = STATS.map((statName) => formatStatLine(statName, bones.stats[statName], peakStat, dumpStat, bones, language));
    // Footer — traits compressed to one dim line
    const footerParts = [
        `${eyeLabel} (${eye.char})`,
        hatLabel,
        formatTimestamp(companion.createdAt).slice(0, 10),
    ];
    const footer = dim(footerParts.join(" · "));
    const lines = [
        "",
        centerText(coloredStars, MIN_CARD_WIDTH),
        "",
        ...centerBlock(sprite),
        "",
        centerText(bold(colorize(soul.name, bones.rarity.color)), MIN_CARD_WIDTH),
        centerText(`${dim(speciesLine)} ${dim("·")} ${rarityBadge}`, MIN_CARD_WIDTH),
        "",
        ...personalityLines,
        "",
        ...statLines,
        "",
        centerText(footer, MIN_CARD_WIDTH),
        "",
    ];
    const innerWidth = Math.max(MIN_CARD_WIDTH, ...lines.map((line) => visibleLength(line)));
    return renderPanel(lines, innerWidth, bones.rarity.color);
}
/** Number of sprite frames available for a companion's species. */
export function getSpriteFrameCount(companion) {
    return SPECIES[companion.bones.species]?.frames.length ?? 1;
}
/** Total line count of a rendered card (for ANSI redraw calculations). */
export function getCardLineCount(cardOutput) {
    return cardOutput.split("\n").length;
}
function formatStatLine(statName, value, peakStat, dumpStat, bones, language) {
    const text = uiText(language);
    const marker = statName === peakStat ? text.peakMarker : statName === dumpStat ? text.dumpMarker : "";
    const label = padDisplayWidth(localizeStatName(statName, language), 5);
    const filled = Math.max(1, Math.round(value / 10));
    const empty = Math.max(0, 10 - filled);
    const filledBar = "█".repeat(filled);
    const emptyBar = "░".repeat(empty);
    const isDump = statName === dumpStat;
    const coloredBar = colorize(filledBar, isDump ? "#6B7280" : bones.color.primary) + dim(emptyBar);
    const valueStr = isDump ? dim(String(value).padStart(3, " ")) : String(value).padStart(3, " ");
    return `  ${label} ${coloredBar} ${valueStr}${marker ? ` ${dim(marker)}` : ""}`;
}
function renderPanel(lines, innerWidth, borderColor) {
    const c = (text) => borderColor ? colorize(text, borderColor) : text;
    const top = `${c("╭")}${c("─".repeat(innerWidth + 2))}${c("╮")}`;
    const bottom = `${c("╰")}${c("─".repeat(innerWidth + 2))}${c("╯")}`;
    const body = lines.map((line) => `${c("│")} ${padDisplayWidth(line, innerWidth)} ${c("│")}`);
    return [top, ...body, bottom].join("\n");
}
function centerText(text, width) {
    const len = visibleLength(text);
    const left = Math.max(0, Math.floor((width - len) / 2));
    return `${" ".repeat(left)}${text}`;
}
function centerBlock(lines) {
    const width = Math.max(0, ...lines.map((line) => visibleLength(line)));
    return lines.map((line) => {
        const left = Math.max(0, Math.floor((MIN_CARD_WIDTH - visibleLength(line)) / 2));
        const shifted = `${" ".repeat(left)}${line}`;
        return padDisplayWidth(shifted, Math.max(width, MIN_CARD_WIDTH));
    });
}
function wrapText(text, width) {
    if (!text.trim()) {
        return [""];
    }
    const hasWhitespace = /\s/.test(text);
    const tokens = hasWhitespace ? text.trim().split(/\s+/) : Array.from(text.trim());
    const lines = [];
    let current = "";
    for (const token of tokens) {
        const candidate = current ? `${current}${hasWhitespace ? " " : ""}${token}` : token;
        if (visibleLength(candidate) <= width) {
            current = candidate;
            continue;
        }
        if (current) {
            lines.push(current);
        }
        if (visibleLength(token) <= width) {
            current = token;
            continue;
        }
        let rest = token;
        while (visibleLength(rest) > width) {
            const [head, tail] = splitByWidth(rest, width);
            lines.push(head);
            rest = tail;
        }
        current = rest;
    }
    if (current) {
        lines.push(current);
    }
    return lines;
}
function splitByWidth(value, width) {
    let head = "";
    let used = 0;
    for (const char of Array.from(value)) {
        const next = charWidth(char);
        if (head && used + next > width) {
            break;
        }
        head += char;
        used += next;
    }
    return [head, value.slice(head.length)];
}
function padDisplayWidth(value, width) {
    const padding = Math.max(0, width - visibleLength(value));
    return `${value}${" ".repeat(padding)}`;
}
function visibleLength(value) {
    const stripped = value.replace(/\u001B\[[0-9;]*m/g, "");
    return Array.from(stripped).reduce((sum, char) => sum + charWidth(char), 0);
}
function charWidth(char) {
    if (/[\u0300-\u036f]/u.test(char)) {
        return 0;
    }
    if (/[\u1100-\u115f\u2329\u232a\u2e80-\u303e\u3040-\u30ff\u3100-\u312f\u3130-\u318f\u3190-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(char)) {
        return 2;
    }
    return 1;
}
function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toISOString().replace("T", " ").slice(0, 16);
}
function normalizeSpriteForCard(lines, hatId) {
    if (hatId === "none" && lines[0]?.trim().length === 0) {
        return lines.slice(1);
    }
    return lines;
}
function assertExists(value, message) {
    if (value === undefined) {
        throw new Error(message);
    }
    return value;
}
//# sourceMappingURL=card.js.map