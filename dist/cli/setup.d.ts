import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
import { type PromptIO } from "./io.js";
import { type TmuxInstallStatus } from "./install.js";
export interface SetupCommandOptions {
    user?: string | undefined;
    storageDir?: string | undefined;
    io?: PromptIO | undefined;
    installFlow?: ((params: {
        io: PromptIO;
    }) => Promise<unknown>) | undefined;
    sleep?: ((ms: number) => Promise<void>) | undefined;
    purpose?: "first_run" | "setup" | undefined;
}
export interface BuddyHomeCommandOptions {
    storageDir?: string | undefined;
    io?: PromptIO | undefined;
    startSetup?: ((options?: SetupCommandOptions) => Promise<void>) | undefined;
    detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}
export declare function runBuddyHomeCommand(options?: BuddyHomeCommandOptions): Promise<void>;
export declare function runSetupCommand(options?: SetupCommandOptions): Promise<void>;
export declare function getBuddyHomeOutput(options: {
    companion: CompanionRecord;
    language: BuddyLanguage;
    detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}): Promise<string>;
