import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
interface LocalizedSoulCopy {
    tagline?: string | undefined;
    personality: string;
}
export declare function getLocalizedSoulCopy(companion: Pick<CompanionRecord, "templateId" | "soul">, language: BuddyLanguage): LocalizedSoulCopy;
export declare function localizePersonalityText(companion: Pick<CompanionRecord, "templateId" | "soul">, language: BuddyLanguage): string;
export declare function localizeTaglineText(companion: Pick<CompanionRecord, "templateId" | "soul">, language: BuddyLanguage): string | undefined;
export {};
