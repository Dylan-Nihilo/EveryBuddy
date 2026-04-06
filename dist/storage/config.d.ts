import type { BuddyConfig, HatchReadyConfig, ResolvedBuddyConfig } from "../types/companion.js";
export declare const DEFAULT_OPENAI_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";
export declare const DEFAULT_OPENAI_MODEL = "qwen3.5-plus";
export declare const DEFAULT_OPENAI_OBSERVER_MODEL = "qwen3-coder-next";
export declare const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";
export declare const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export declare const DEFAULT_ANTHROPIC_OBSERVER_MODEL = "claude-haiku-4-5-20251001";
export declare const PROVIDER_DEFAULTS: {
    readonly openai: {
        readonly baseUrl: "https://coding.dashscope.aliyuncs.com/v1";
        readonly model: "qwen3.5-plus";
        readonly observerModel: "qwen3-coder-next";
    };
    readonly anthropic: {
        readonly baseUrl: "https://api.anthropic.com";
        readonly model: "claude-haiku-4-5-20251001";
        readonly observerModel: "claude-haiku-4-5-20251001";
    };
    readonly custom: {
        readonly baseUrl: string | undefined;
        readonly model: string | undefined;
        readonly observerModel: string | undefined;
    };
};
export interface ResolveBuddyConfigOptions {
    model?: string | undefined;
    apiKey?: string | undefined;
    baseUrl?: string | undefined;
    storageDir?: string | undefined;
}
export declare function resolveBuddyConfig(options?: ResolveBuddyConfigOptions): Promise<ResolvedBuddyConfig>;
export declare function assertHatchReadyConfig(config: ResolvedBuddyConfig): HatchReadyConfig;
export declare function resolveUserId(cliUserId?: string): string;
export declare function readBuddyConfigFile(storageDir?: string): Promise<BuddyConfig>;
export declare function writeBuddyConfigFile(config: BuddyConfig, storageDir?: string): Promise<void>;
export declare function updateBuddyConfigFile(updates: BuddyConfig, storageDir?: string): Promise<BuddyConfig>;
