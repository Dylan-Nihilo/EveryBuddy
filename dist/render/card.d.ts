import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
export interface RenderCardOptions {
    language?: BuddyLanguage;
    spriteFrameIndex?: number;
}
export declare function renderCompanionCard(companion: CompanionRecord, options?: RenderCardOptions): string;
/** Number of sprite frames available for a companion's species. */
export declare function getSpriteFrameCount(companion: CompanionRecord): number;
/** Total line count of a rendered card (for ANSI redraw calculations). */
export declare function getCardLineCount(cardOutput: string): number;
