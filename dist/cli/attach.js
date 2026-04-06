import os from "node:os";
import path from "node:path";
import { uiText } from "../i18n/ui.js";
import { removeSocketIfExists, socketPathForWindow } from "../runtime/socket.js";
import { resolveBuddyConfig } from "../storage/config.js";
import { buildAttachContext, buildSidecarCommand, choosePrimarySidecarPane, isEveryBuddySidecarPane, SIDECAR_OPTION, TARGET_OPTION, TmuxClient, resolveSidecarWidth, } from "../runtime/tmux.js";
export async function runAttachCommand(options) {
    const tmux = new TmuxClient();
    if (!tmux.isInsideTmux() || process.env.EVERYBUDDY_SIDECAR) {
        if (options.quiet) {
            return null;
        }
        const storageDir = path.join(os.homedir(), ".terminal-buddy");
        const language = (await resolveBuddyConfig({ storageDir })).language;
        const text = uiText(language);
        process.stderr.write(`${text.attachRequiresTmux}\n${text.attachRequiresTmuxHint}\n`);
        process.exitCode = 1;
        return null;
    }
    const targetPaneId = await tmux.currentPaneId();
    const windowId = await tmux.currentWindowId();
    const existingSidecarPaneId = await tmux.getWindowOption(windowId, SIDECAR_OPTION);
    const sidecarStillAlive = existingSidecarPaneId
        ? await tmux.paneExists(existingSidecarPaneId)
        : false;
    let sidecarPaneId = existingSidecarPaneId;
    let created = false;
    if (!sidecarStillAlive) {
        await tmux.unsetWindowOption(windowId, SIDECAR_OPTION);
    }
    let candidateSidecarPaneIds = await getEveryBuddySidecarPaneIds(tmux, windowId, sidecarStillAlive ? existingSidecarPaneId : undefined);
    if (candidateSidecarPaneIds.length === 0) {
        const windowWidth = await tmux.currentWindowWidth(windowId).catch(() => 120);
        const createdPaneId = await tmux.splitWindow(windowId, buildSidecarCommand(windowId, targetPaneId), resolveSidecarWidth(windowWidth));
        candidateSidecarPaneIds = await getEveryBuddySidecarPaneIds(tmux, windowId, createdPaneId);
        sidecarPaneId = choosePrimarySidecarPane(candidateSidecarPaneIds) ?? createdPaneId;
        created = sidecarPaneId === createdPaneId;
    }
    else {
        sidecarPaneId = choosePrimarySidecarPane(candidateSidecarPaneIds);
    }
    if (!sidecarPaneId) {
        await removeSocketIfExists(socketPathForWindow(windowId));
        throw new Error(`EveryBuddy could not resolve a sidecar pane for ${windowId}.`);
    }
    for (const extraPaneId of candidateSidecarPaneIds) {
        if (extraPaneId !== sidecarPaneId) {
            await tmux.killPane(extraPaneId).catch(() => { });
        }
    }
    await tmux.setWindowOption(windowId, SIDECAR_OPTION, sidecarPaneId);
    await tmux.setWindowOption(windowId, TARGET_OPTION, targetPaneId);
    const context = buildAttachContext({
        windowId,
        targetPaneId,
        sidecarPaneId,
        ...(existingSidecarPaneId ? { existingSidecarPaneId } : {}),
        created,
    });
    if (!options.quiet) {
        process.stdout.write(`${created ? "Attached" : "Updated"} EveryBuddy in ${windowId} with sidecar ${sidecarPaneId}.\n`);
    }
    return context;
}
async function getEveryBuddySidecarPaneIds(tmux, windowId, fallbackPaneId) {
    const paneInfos = await tmux.listWindowPaneInfo(windowId).catch(() => []);
    const paneIds = paneInfos.filter(isEveryBuddySidecarPane).map((pane) => pane.paneId);
    if (fallbackPaneId && !paneIds.includes(fallbackPaneId)) {
        paneIds.push(fallbackPaneId);
    }
    return [...new Set(paneIds)];
}
//# sourceMappingURL=attach.js.map