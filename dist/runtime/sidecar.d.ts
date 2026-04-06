export interface SidecarCommandOptions {
    windowId: string;
    targetPane?: string | undefined;
}
export declare function runSidecarCommand(options: SidecarCommandOptions): Promise<void>;
export declare function resolveTargetPane(paneIds: string[], sidecarPaneId: string, currentTargetPaneId?: string): string | undefined;
