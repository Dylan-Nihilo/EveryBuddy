import { sendShellEvent } from "../runtime/socket.js";
import { TmuxClient } from "../runtime/tmux.js";
export async function runEventCommand(type, options) {
    if (process.env.EVERYBUDDY_SIDECAR) {
        return;
    }
    const tmux = new TmuxClient();
    if (!tmux.isInsideTmux()) {
        return;
    }
    const paneId = await tmux.currentPaneId().catch(() => "");
    const windowId = await tmux.currentWindowId().catch(() => "");
    if (!paneId || !windowId) {
        return;
    }
    const command = options.command?.trim() || undefined;
    const exitCode = normalizeExitCode(options.exitCode);
    await sendShellEvent({
        type,
        paneId,
        windowId,
        cwd: options.cwd?.trim() || process.cwd(),
        ...(command ? { command } : {}),
        ...(exitCode !== undefined ? { exitCode } : {}),
        timestamp: Date.now(),
    });
}
function normalizeExitCode(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
}
//# sourceMappingURL=event.js.map