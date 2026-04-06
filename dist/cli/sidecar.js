import { runSidecarCommand as startSidecar } from "../runtime/sidecar.js";
export async function runSidecarCliCommand(options) {
    const windowId = options.windowId?.trim();
    if (!windowId) {
        throw new Error("EveryBuddy sidecar requires `--window-id`.");
    }
    await startSidecar({
        windowId,
        targetPane: options.targetPane?.trim() || undefined,
    });
}
//# sourceMappingURL=sidecar.js.map