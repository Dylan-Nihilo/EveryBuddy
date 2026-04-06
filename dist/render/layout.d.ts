import type { RenderMode } from "../runtime/types.js";
import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
export declare const FADE_WINDOW_MS = 3000;
export declare const BUBBLE_MAX_WIDTH = 24;
export declare const BUBBLE_MAX_LINES = 5;
export declare const IDLE_SUMMARY_WIDTH = 24;
export declare const IDLE_SUMMARY_MAX_LINES = 3;
export declare const FULL_MODE_MIN_WIDTH = 26;
export declare const IDLE_SEQUENCE: number[];
export declare function charDisplayWidth(char: string): number;
export declare function visibleLength(value: string): number;
export declare function padDisplayWidth(value: string, width: number): string;
export declare function splitWrapTokens(text: string): string[];
export declare function splitTokenByDisplayWidth(token: string, width: number): [string, string];
export declare function truncateDisplayWidth(value: string, width: number): string;
export declare function wrapText(text: string, width: number, maxLines: number): string[];
export declare function centerLine(text: string, width: number): string;
export declare function centerBlock(lines: string[], width: number): string[];
export declare function styleBubbleBorder(text: string, color: string, fading: boolean): string;
export declare function styleBubbleText(text: string, fading: boolean): string;
export declare function renderSpeechBubble(text: string, fading: boolean, color: string, contentWidth: number, maxLines: number): string[];
export declare function resolveSpriteFrameState(frameTick: number, animated: boolean, frameCount: number, pulsing?: boolean): {
    frameIndex: number;
    blink: boolean;
};
export declare function resolveReactionBubble(state: Pick<{
    reactionText: string | undefined;
    reactionExpiresAt: number | undefined;
}, "reactionText" | "reactionExpiresAt">, now: number): {
    text: string | undefined;
    fading: boolean;
};
export declare function resolveRenderMode(columns: number): RenderMode;
export declare function inferCompanionLanguage(companion: CompanionRecord): BuddyLanguage;
export declare function buildIdleSoulSummary(companion: CompanionRecord, language?: BuddyLanguage): string;
