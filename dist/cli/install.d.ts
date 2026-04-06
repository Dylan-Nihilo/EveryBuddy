import { type PromptIO } from "./io.js";
export declare const EVERYBUDDY_HOOK_START = "# >>> EveryBuddy tmux hook >>>";
export declare const EVERYBUDDY_HOOK_END = "# <<< EveryBuddy tmux hook <<<";
export declare const EVERYBUDDY_ZSHRC_LINE = "eval \"$(buddy init zsh)\"";
export interface InstallTmuxCommandOptions {
    io?: PromptIO | undefined;
    homeDir?: string | undefined;
    shellPath?: string | undefined;
    pathEnv?: string | undefined;
    checkTmuxAvailable?: (() => Promise<boolean>) | undefined;
}
export interface TmuxInstallStatus {
    tmuxAvailable: boolean;
    shellSupported: boolean;
    hookInstalled: boolean;
    zshrcPath: string;
}
export interface TmuxInstallResult {
    status: "installed" | "already_installed" | "skipped" | "tmux_missing" | "unsupported_shell";
    zshrcPath: string;
}
export declare function runInstallTmuxCommand(options?: InstallTmuxCommandOptions): Promise<TmuxInstallResult>;
export declare function detectTmuxInstallStatus(options?: InstallTmuxCommandOptions): Promise<TmuxInstallStatus>;
export declare function renderManagedZshHookBlock(): string;
export declare function hasEveryBuddyHook(content: string): boolean;
export declare function mergeZshrcWithEveryBuddyHook(content: string): {
    content: string;
    changed: boolean;
};
export declare function installTmuxHook(options: {
    zshrcPath: string;
}): Promise<void>;
