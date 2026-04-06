export interface HatchCommandOptions {
    user?: string | undefined;
    storageDir?: string | undefined;
}
export declare function runHatchCommand(options: HatchCommandOptions): Promise<void>;
