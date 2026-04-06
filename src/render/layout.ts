import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { getLocalizedSoulCopy } from "../i18n/companion.js";
import { localizeStatName, localizeVoiceLabel } from "../i18n/ui.js";
import { colorize, dim } from "./color.js";
import type { RenderMode } from "../runtime/types.js";
import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";

// ── Constants ────────────────────────────────────────────────────────────────

export const FADE_WINDOW_MS = 3_000;
export const BUBBLE_MAX_WIDTH = 24;
export const BUBBLE_MAX_LINES = 5;
export const IDLE_SUMMARY_WIDTH = 24;
export const IDLE_SUMMARY_MAX_LINES = 3;
export const FULL_MODE_MIN_WIDTH = 26;

export const IDLE_SEQUENCE = [0, 0, 0, 0, 1, 0, 0, 0, -1, 0, 0, 2, 0, 0, 0];

// ── Display width ────────────────────────────────────────────────────────────

export function charDisplayWidth(char: string): number {
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

export function visibleLength(value: string): number {
  const stripped = value.replace(/\u001B\[[0-9;]*m/g, "");
  return Array.from(stripped).reduce((sum, char) => sum + charDisplayWidth(char), 0);
}

export function padDisplayWidth(value: string, width: number): string {
  const padding = Math.max(0, width - visibleLength(value));
  return `${value}${" ".repeat(padding)}`;
}

// ── Text wrapping ────────────────────────────────────────────────────────────

export function splitWrapTokens(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [""];
  }

  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/);
  }

  return Array.from(trimmed);
}

export function splitTokenByDisplayWidth(token: string, width: number): [string, string] {
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

export function truncateDisplayWidth(value: string, width: number): string {
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

export function wrapText(text: string, width: number, maxLines: number): string[] {
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

// ── Layout centering ─────────────────────────────────────────────────────────

export function centerLine(text: string, width: number): string {
  const visible = visibleLength(text);
  const left = Math.max(0, Math.floor((width - visible) / 2));
  return `${" ".repeat(left)}${text}`;
}

export function centerBlock(lines: string[], width: number): string[] {
  const blockWidth = Math.max(0, ...lines.map((line) => visibleLength(line)));
  const left = Math.max(0, Math.floor((width - blockWidth) / 2));
  return lines.map((line) => `${" ".repeat(left)}${line}`);
}

// ── Speech bubble ────────────────────────────────────────────────────────────

export function styleBubbleBorder(text: string, color: string, fading: boolean): string {
  const colored = colorize(text, color);
  return fading ? dim(colored) : colored;
}

export function styleBubbleText(text: string, fading: boolean): string {
  return fading ? dim(text) : text;
}

export function renderSpeechBubble(
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

// ── Sprite / reaction state ──────────────────────────────────────────────────

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

export function resolveReactionBubble(
  state: Pick<{ reactionText: string | undefined; reactionExpiresAt: number | undefined }, "reactionText" | "reactionExpiresAt">,
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

export function resolveRenderMode(columns: number): RenderMode {
  return columns >= FULL_MODE_MIN_WIDTH ? "full" : "narrow";
}

// ── Locale helpers ───────────────────────────────────────────────────────────

export function inferCompanionLanguage(companion: CompanionRecord): BuddyLanguage {
  return /[\u3400-\u9fff]/u.test(companion.soul.personality) ? "zh" : "en";
}

export function buildIdleSoulSummary(
  companion: CompanionRecord,
  language: BuddyLanguage = inferCompanionLanguage(companion),
): string {
  const tagline = getLocalizedSoulCopy(companion, language).tagline?.trim();
  if (tagline) {
    return tagline;
  }

  const profile = companion.soul.observerProfile;
  const [peakStat] = getPeakStat(companion.bones.stats);
  const [dumpStat] = getDumpStat(companion.bones.stats);

  if (language === "zh") {
    return `${localizeVoiceLabel(profile.voice, language)} · ${localizeStatName(peakStat, language)}强，${localizeStatName(dumpStat, language)}低`;
  }

  return `${localizeVoiceLabel(profile.voice, language)} · high ${localizeStatName(peakStat, language).toLowerCase()} · low ${localizeStatName(dumpStat, language).toLowerCase()}`;
}
