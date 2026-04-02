import { runSidecarCommand as startSidecar } from "../runtime/sidecar.js";

export interface SidecarCliOptions {
  windowId?: string | undefined;
  targetPane?: string | undefined;
}

export async function runSidecarCliCommand(options: SidecarCliOptions): Promise<void> {
  const windowId = options.windowId?.trim();
  if (!windowId) {
    throw new Error("EveryBuddy sidecar requires `--window-id`.");
  }

  await startSidecar({
    windowId,
    targetPane: options.targetPane?.trim() || undefined,
  });
}
