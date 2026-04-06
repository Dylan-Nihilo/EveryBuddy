import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
import type { PromptIO } from "../cli/io.js";
export interface GachaAnimationOptions {
    record: CompanionRecord;
    language: BuddyLanguage;
    io: PromptIO;
    sleep: (ms: number) => Promise<void>;
}
export declare function playGachaAnimation(options: GachaAnimationOptions): Promise<void>;
