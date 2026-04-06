import { type PromptIO } from "./io.js";
export interface CCInstallOptions {
    io?: PromptIO | undefined;
    claudeDir?: string | undefined;
}
export interface CCInstallResult {
    statusLine: "installed" | "already_installed" | "skipped";
    companion: "hatched" | "already_exists";
}
export declare function runInstallClaudeCodeCommand(options?: CCInstallOptions): Promise<CCInstallResult>;
