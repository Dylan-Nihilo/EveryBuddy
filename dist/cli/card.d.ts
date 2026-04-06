export declare const NO_COMPANION_MESSAGE: string;
export interface CardCommandOptions {
    color?: boolean | undefined;
}
export declare function runCardCommand(options?: CardCommandOptions): Promise<void>;
export declare function getCardOutput(storageDir?: string): Promise<string>;
