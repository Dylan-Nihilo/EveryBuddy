import type { ShellEventType } from "../runtime/types.js";
export interface EventCommandOptions {
    cwd?: string | undefined;
    command?: string | undefined;
    exitCode?: string | undefined;
}
export declare function runEventCommand(type: ShellEventType, options: EventCommandOptions): Promise<void>;
