import type { AttachContext } from "../runtime/types.js";
export interface AttachCommandOptions {
    quiet?: boolean | undefined;
}
export declare function runAttachCommand(options: AttachCommandOptions): Promise<AttachContext | null>;
