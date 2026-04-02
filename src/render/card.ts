import { getDumpStat, getPeakStat, STATS } from "../bones/stats.js";
import { composeFrame } from "./compose.js";
import { bold, colorize, dim } from "./color.js";
import { EYES, HATS, SPECIES } from "./sprites.js";
import type { CompanionBones, CompanionRecord, StatName } from "../types/companion.js";

const MIN_CARD_WIDTH = 44;

export function renderCompanionCard(companion: CompanionRecord): string {
  const bones = companion.bones;
  const soul = companion.soul;
  const species = assertExists(SPECIES[bones.species], `Unknown species: ${bones.species}`);
  const eye = assertExists(EYES[bones.eye], `Unknown eye: ${bones.eye}`);
  const hat = assertExists(HATS[bones.hat], `Unknown hat: ${bones.hat}`);
  const baseFrame = assertExists(
    species.frames[0],
    `Species ${bones.species} does not have a base frame.`,
  );
  const sprite = normalizeSpriteForCard(composeFrame(baseFrame, eye.char, bones.hat, bones.color), bones.hat);
  const [peakStat] = getPeakStat(bones.stats);
  const [dumpStat] = getDumpStat(bones.stats);
  const speciesLine = `${species.name}${bones.shiny ? " · SHINY" : ""}`;
  const rarityBadge = colorize(`◆ ${bones.rarity.name.toUpperCase()} ${bones.rarity.stars}`, bones.rarity.color);
  const subtitle = dim([speciesLine, soul.modelUsed].join(" · "));
  const personalityLines = wrapText(soul.personality, MIN_CARD_WIDTH - 4).map((line) => `  ${line}`);
  const statLines = STATS.map((statName) =>
    formatStatLine(statName, bones.stats[statName], peakStat, dumpStat, bones.color),
  );

  const lines = [
    colorize("EveryBuddy Companion", bones.color.accent),
    rarityBadge,
    bold(soul.name),
    subtitle,
    dim(`seed ${companion.userId}`),
    "",
    ...centerBlock(sprite),
    "",
    colorize("Personality", bones.color.accent),
    ...personalityLines,
    "",
    colorize("Traits", bones.color.accent),
    `  Species  ${speciesLine}`,
    `  Rarity   ${bones.rarity.name} ${bones.rarity.stars}`,
    `  Eyes     ${eye.label} (${eye.char})`,
    `  Hat      ${hat.label}`,
    `  Born     ${formatTimestamp(companion.createdAt)}`,
    "",
    colorize("Stats", bones.color.accent),
    ...statLines,
  ];

  const innerWidth = Math.max(MIN_CARD_WIDTH, ...lines.map((line) => visibleLength(line)));
  return renderPanel(lines, innerWidth);
}

function formatStatLine(
  statName: StatName,
  value: number,
  peakStat: StatName,
  dumpStat: StatName,
  color: CompanionBones["color"],
): string {
  const bar = makeBar(value);
  const marker = statName === peakStat ? "peak" : statName === dumpStat ? "dump" : "";
  const label = statName.padEnd(5, " ");
  const coloredBar = colorize(bar, statName === dumpStat ? "#6B7280" : color.primary);
  return `  ${label} ${String(value).padStart(3, " ")} ${coloredBar}${marker ? ` ${dim(marker)}` : ""}`;
}

function makeBar(value: number): string {
  const filled = Math.max(1, Math.round(value / 10));
  const empty = Math.max(0, 10 - filled);
  return `${"#".repeat(filled)}${"-".repeat(empty)}`;
}

function renderPanel(lines: string[], innerWidth: number): string {
  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  const bottom = `╰${"─".repeat(innerWidth + 2)}╯`;
  const body = lines.map((line) => `│ ${padDisplayWidth(line, innerWidth)} │`);
  return [top, ...body, bottom].join("\n");
}

function centerBlock(lines: string[]): string[] {
  const width = Math.max(0, ...lines.map((line) => visibleLength(line)));
  return lines.map((line) => {
    const left = Math.max(0, Math.floor((MIN_CARD_WIDTH - visibleLength(line)) / 2));
    const shifted = `${" ".repeat(left)}${line}`;
    return padDisplayWidth(shifted, Math.max(width, MIN_CARD_WIDTH));
  });
}

function wrapText(text: string, width: number): string[] {
  if (!text.trim()) {
    return [""];
  }

  const hasWhitespace = /\s/.test(text);
  const tokens = hasWhitespace ? text.trim().split(/\s+/) : Array.from(text.trim());
  const lines: string[] = [];
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

function splitByWidth(value: string, width: number): [string, string] {
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

function padDisplayWidth(value: string, width: number): string {
  const padding = Math.max(0, width - visibleLength(value));
  return `${value}${" ".repeat(padding)}`;
}

function visibleLength(value: string): number {
  const stripped = value.replace(/\u001B\[[0-9;]*m/g, "");
  return Array.from(stripped).reduce((sum, char) => sum + charWidth(char), 0);
}

function charWidth(char: string): number {
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

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace("T", " ").slice(0, 16);
}

function normalizeSpriteForCard(lines: string[], hatId: string): string[] {
  if (hatId === "none" && lines[0]?.trim().length === 0) {
    return lines.slice(1);
  }

  return lines;
}

function assertExists<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}
