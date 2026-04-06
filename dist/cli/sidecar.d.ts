export interface SidecarCliOptions {
    windowId?: string | undefined;
    targetPane?: string | undefined;
}
export declare function runSidecarCliCommand(options: SidecarCliOptions): Promise<void>;
