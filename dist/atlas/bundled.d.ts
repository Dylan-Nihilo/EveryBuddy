import type { CompanionBones, CompanionRecord, CompanionSoul } from "../types/companion.js";
export declare const BUNDLED_MODEL_SOURCE = "bundled";
export interface BundledCompanionTemplate {
    id: string;
    weight: number;
    bones: Omit<CompanionBones, "userId">;
    soul: CompanionSoul;
}
export declare const BUNDLED_COMPANION_TEMPLATES: BundledCompanionTemplate[];
export declare function selectBundledCompanionTemplate(userId: string, options?: {
    previousTemplateId?: string | undefined;
}): BundledCompanionTemplate;
export declare function resolveBundledTemplateId(companion: Pick<CompanionRecord, "templateId" | "bones"> | null | undefined): string | undefined;
export declare function selectReplacementBundledCompanionTemplate(userId: string, companion: Pick<CompanionRecord, "templateId" | "bones"> | null | undefined): BundledCompanionTemplate;
export declare function buildBundledCompanionRecord(userId: string, template: BundledCompanionTemplate): CompanionRecord;
