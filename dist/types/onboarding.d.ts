import type { CompanionBones, CompanionRecord, CompanionSoul } from "./companion.js";
export type OnboardingStep = "bones_reveal" | "soul_imprint" | "final_reveal" | "install_tmux";
export type InstallTarget = "tmux";
export interface HatchSceneState {
    step: OnboardingStep;
    userId: string;
    bones: CompanionBones;
    soul?: CompanionSoul | undefined;
    record?: CompanionRecord | undefined;
    attempt: number;
    error?: string | undefined;
}
