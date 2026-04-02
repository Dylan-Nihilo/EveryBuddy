import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { AttachContext } from "./types.js";

const execFileAsync = promisify(execFile);

export const SIDECAR_OPTION = "@everybuddy_sidecar_pane";
export const TARGET_OPTION = "@everybuddy_target_pane";
export const SIDECAR_WIDTH_WIDE = 30;
export const SIDECAR_WIDTH_MEDIUM = 26;
export const SIDECAR_WIDTH_NARROW = 22;

export interface TmuxPaneInfo {
  paneId: string;
  currentCommand: string;
  startCommand: string;
  width: number;
}

export class TmuxClient {
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  isInsideTmux(): boolean {
    return Boolean(this.env.TMUX);
  }

  currentPaneId(): Promise<string> {
    const envPane = this.env.TMUX_PANE?.trim();
    if (envPane) {
      return Promise.resolve(envPane);
    }

    return this.displayMessage("#{pane_id}");
  }

  currentWindowId(): Promise<string> {
    return this.displayMessage("#{window_id}");
  }

  async currentWindowWidth(windowId?: string): Promise<number> {
    const width = await this.displayMessage("#{window_width}", windowId);
    const parsed = Number.parseInt(width.trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`tmux reported an invalid window width: ${width}`);
    }

    return parsed;
  }

  async paneExists(paneId: string): Promise<boolean> {
    try {
      const result = await this.run(["display-message", "-p", "-t", paneId, "#{pane_id}"]);
      return result.trim() === paneId;
    } catch {
      return false;
    }
  }

  async getWindowOption(windowId: string, optionName: string): Promise<string | undefined> {
    try {
      const result = await this.run(["show-options", "-wqv", "-t", windowId, optionName]);
      const trimmed = result.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  }

  async setWindowOption(windowId: string, optionName: string, value: string): Promise<void> {
    await this.run(["set-option", "-wq", "-t", windowId, optionName, value]);
  }

  async unsetWindowOption(windowId: string, optionName: string): Promise<void> {
    try {
      await this.run(["set-option", "-wu", "-t", windowId, optionName]);
    } catch {
      // Nothing to do.
    }
  }

  async splitWindow(windowId: string, command: string, width = SIDECAR_WIDTH_WIDE): Promise<string> {
    const result = await this.run([
      "split-window",
      "-d",
      "-h",
      "-l",
      String(width),
      "-P",
      "-F",
      "#{pane_id}",
      "-t",
      windowId,
      command,
    ]);

    return result.trim();
  }

  async killPane(paneId: string): Promise<void> {
    await this.run(["kill-pane", "-t", paneId]);
  }

  async listWindowPanes(windowId: string): Promise<string[]> {
    const result = await this.run(["list-panes", "-t", windowId, "-F", "#{pane_id}"]);
    return result
      .split("\n")
      .map((paneId) => paneId.trim())
      .filter((paneId) => paneId.length > 0);
  }

  async listWindowPaneInfo(windowId: string): Promise<TmuxPaneInfo[]> {
    const result = await this.run([
      "list-panes",
      "-t",
      windowId,
      "-F",
      "#{pane_id}\t#{pane_current_command}\t#{pane_start_command}\t#{pane_width}",
    ]);

    return result
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [paneId = "", currentCommand = "", startCommand = "", width = "0"] = line.split("\t");
        return {
          paneId,
          currentCommand,
          startCommand,
          width: Number.parseInt(width, 10) || 0,
        };
      });
  }

  private displayMessage(format: string, target?: string): Promise<string> {
    const args = ["display-message", "-p"];
    if (target) {
      args.push("-t", target);
    }
    args.push(format);
    return this.run(args).then((value) => value.trim());
  }

  private async run(args: string[]): Promise<string> {
    const tmuxBin = this.env.TMUX_BIN?.trim() || "tmux";

    try {
      const result = await execFileAsync(tmuxBin, args, { env: this.env });
      return result.stdout;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`tmux command failed: ${tmuxBin} ${args.join(" ")}: ${message}`);
    }
  }
}

export function resolveSidecarWidth(windowWidth: number): number {
  if (windowWidth >= 120) {
    return SIDECAR_WIDTH_WIDE;
  }

  if (windowWidth >= 90) {
    return SIDECAR_WIDTH_MEDIUM;
  }

  return SIDECAR_WIDTH_NARROW;
}

export function buildAttachContext(params: {
  windowId: string;
  targetPaneId: string;
  sidecarPaneId: string;
  existingSidecarPaneId?: string;
  created: boolean;
}): AttachContext {
  return {
    windowId: params.windowId,
    targetPaneId: params.targetPaneId,
    sidecarPaneId: params.sidecarPaneId,
    ...(params.existingSidecarPaneId
      ? { existingSidecarPaneId: params.existingSidecarPaneId }
      : {}),
    created: params.created,
  };
}

export function buildSidecarCommand(windowId: string, targetPaneId: string): string {
  const nodePath = shellEscape(process.execPath);
  const entryPath = shellEscape(process.argv[1] || "buddy");
  const escapedWindowId = shellEscape(windowId);
  const escapedTargetPaneId = shellEscape(targetPaneId);

  return [
    "EVERYBUDDY_SIDECAR=1",
    nodePath,
    entryPath,
    "sidecar",
    "--window-id",
    escapedWindowId,
    "--target-pane",
    escapedTargetPaneId,
  ].join(" ");
}

export function isEveryBuddySidecarPane(pane: Pick<TmuxPaneInfo, "startCommand">): boolean {
  const startCommand = pane.startCommand.trim();
  return startCommand.includes("EVERYBUDDY_SIDECAR=1") && startCommand.includes(" sidecar ");
}

export function choosePrimarySidecarPane(paneIds: string[]): string | undefined {
  return [...new Set(paneIds)].sort(comparePaneIdsDescending)[0];
}

function comparePaneIdsDescending(left: string, right: string): number {
  return paneIdNumber(right) - paneIdNumber(left);
}

function paneIdNumber(paneId: string): number {
  const parsed = Number.parseInt(paneId.replace(/^\D+/, ""), 10);
  return Number.isFinite(parsed) ? parsed : -1;
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
