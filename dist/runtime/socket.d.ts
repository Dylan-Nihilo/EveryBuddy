import type { ShellEvent } from "./types.js";
export declare function socketDirectory(env?: NodeJS.ProcessEnv): string;
export declare function socketPathForWindow(windowId: string, env?: NodeJS.ProcessEnv): string;
export declare function ensureSocketDirectory(env?: NodeJS.ProcessEnv): Promise<void>;
export declare function removeSocketIfExists(socketPath: string): Promise<void>;
export declare function sendShellEvent(event: ShellEvent, env?: NodeJS.ProcessEnv): Promise<void>;
