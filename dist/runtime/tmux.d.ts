import type { AttachContext } from "./types.js";
export declare const SIDECAR_OPTION = "@everybuddy_sidecar_pane";
export declare const TARGET_OPTION = "@everybuddy_target_pane";
export declare const SIDECAR_WIDTH_WIDE = 30;
export declare const SIDECAR_WIDTH_MEDIUM = 26;
export declare const SIDECAR_WIDTH_NARROW = 22;
export interface TmuxPaneInfo {
    paneId: string;
    currentCommand: string;
    startCommand: string;
    width: number;
}
export declare class TmuxClient {
    private readonly env;
    constructor(env?: NodeJS.ProcessEnv);
    isInsideTmux(): boolean;
    currentPaneId(): Promise<string>;
    currentWindowId(): Promise<string>;
    currentWindowWidth(windowId?: string): Promise<number>;
    paneExists(paneId: string): Promise<boolean>;
    getWindowOption(windowId: string, optionName: string): Promise<string | undefined>;
    setWindowOption(windowId: string, optionName: string, value: string): Promise<void>;
    unsetWindowOption(windowId: string, optionName: string): Promise<void>;
    splitWindow(windowId: string, command: string, width?: number): Promise<string>;
    killPane(paneId: string): Promise<void>;
    listWindowPanes(windowId: string): Promise<string[]>;
    listWindowPaneInfo(windowId: string): Promise<TmuxPaneInfo[]>;
    private displayMessage;
    private run;
}
export declare function resolveSidecarWidth(windowWidth: number): number;
export declare function buildAttachContext(params: {
    windowId: string;
    targetPaneId: string;
    sidecarPaneId: string;
    existingSidecarPaneId?: string;
    created: boolean;
}): AttachContext;
export declare function buildSidecarCommand(windowId: string, targetPaneId: string): string;
export declare function isEveryBuddySidecarPane(pane: Pick<TmuxPaneInfo, "startCommand">): boolean;
export declare function choosePrimarySidecarPane(paneIds: string[]): string | undefined;
