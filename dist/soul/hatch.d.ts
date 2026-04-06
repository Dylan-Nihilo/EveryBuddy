import type { BuddyLanguage, CompanionBones, CompanionRecord, CompanionSoul } from "../types/companion.js";
import type { AIProvider } from "./providers/types.js";
export declare function hatchSoul(bones: CompanionBones, provider: AIProvider, language: BuddyLanguage): Promise<CompanionSoul>;
export declare function buildCompanionRecord(userId: string, bones: CompanionBones, soul: CompanionSoul): CompanionRecord;
export declare function parseHatchResponse(response: string): Pick<CompanionSoul, "name" | "tagline" | "personality" | "observerProfile">;
export declare function buildHatchPrompt(bones: CompanionBones, language: BuddyLanguage): string;
