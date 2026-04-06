export interface DetachCommandOptions {
    quiet?: boolean | undefined;
}
export declare function runDetachCommand(options?: DetachCommandOptions): Promise<void>;
