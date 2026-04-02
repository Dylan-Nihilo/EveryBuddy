import { removeSocketIfExists, socketPathForWindow } from "../runtime/socket.js";
import { isEveryBuddySidecarPane, SIDECAR_OPTION, TARGET_OPTION, TmuxClient } from "../runtime/tmux.js";

export interface DetachCommandOptions {
  quiet?: boolean | undefined;
}

export async function runDetachCommand(options: DetachCommandOptions = {}): Promise<void> {
  const tmux = new TmuxClient();

  if (!tmux.isInsideTmux()) {
    if (options.quiet) {
      return;
    }

    throw new Error("EveryBuddy detach requires tmux.");
  }

  const windowId = await tmux.currentWindowId();
  const sidecarPaneId = await tmux.getWindowOption(windowId, SIDECAR_OPTION);
  const paneInfos = await tmux.listWindowPaneInfo(windowId).catch(() => []);
  const sidecarPaneIds = [
    ...new Set([
      ...paneInfos.filter(isEveryBuddySidecarPane).map((pane) => pane.paneId),
      ...(sidecarPaneId ? [sidecarPaneId] : []),
    ]),
  ];

  await tmux.unsetWindowOption(windowId, SIDECAR_OPTION);
  await tmux.unsetWindowOption(windowId, TARGET_OPTION);
  await removeSocketIfExists(socketPathForWindow(windowId));

  if (sidecarPaneIds.length === 0) {
    if (!options.quiet) {
      process.stdout.write(`No EveryBuddy sidecar is attached to ${windowId}.\n`);
    }
    return;
  }

  for (const paneId of sidecarPaneIds) {
    await tmux.killPane(paneId).catch(() => {});
  }

  if (!options.quiet) {
    process.stdout.write(`Detached EveryBuddy from ${windowId}.\n`);
  }
}
