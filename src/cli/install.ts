import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { constants as fsConstants } from "node:fs";

import { uiText } from "../i18n/ui.js";
import { resolveBuddyConfig } from "../storage/config.js";
import { createConsoleIO, type PromptIO } from "./io.js";

export const EVERYBUDDY_HOOK_START = "# >>> EveryBuddy tmux hook >>>";
export const EVERYBUDDY_HOOK_END = "# <<< EveryBuddy tmux hook <<<";
export const EVERYBUDDY_ZSHRC_LINE = 'eval "$(buddy init zsh)"';

export interface InstallTmuxCommandOptions {
  io?: PromptIO | undefined;
  homeDir?: string | undefined;
  shellPath?: string | undefined;
  pathEnv?: string | undefined;
  checkTmuxAvailable?: (() => Promise<boolean>) | undefined;
}

export interface TmuxInstallStatus {
  tmuxAvailable: boolean;
  shellSupported: boolean;
  hookInstalled: boolean;
  zshrcPath: string;
}

export interface TmuxInstallResult {
  status: "installed" | "already_installed" | "skipped" | "tmux_missing" | "unsupported_shell";
  zshrcPath: string;
}

export async function runInstallTmuxCommand(options: InstallTmuxCommandOptions = {}): Promise<TmuxInstallResult> {
  const io = options.io ?? createConsoleIO();
  const storageDir = path.join(options.homeDir ?? os.homedir(), ".terminal-buddy");
  const language = (await resolveBuddyConfig({ storageDir })).language;
  const text = uiText(language);
  const status = await detectTmuxInstallStatus(options);

  if (!status.tmuxAvailable) {
    io.writeLine(text.tmuxMissing);
    io.writeLine(text.tmuxMissingHint);
    io.writeLine(text.macInstallTmux);
    return { status: "tmux_missing", zshrcPath: status.zshrcPath };
  }

  if (!status.shellSupported) {
    io.writeLine(text.zshOnly);
    io.writeLine(text.zshOnlyHint);
    return { status: "unsupported_shell", zshrcPath: status.zshrcPath };
  }

  if (status.hookInstalled) {
    io.writeLine(text.alreadyInstalled(status.zshrcPath));
    io.writeLine(text.sourceHint(status.zshrcPath));
    io.writeLine(text.openTmuxHint);
    return { status: "already_installed", zshrcPath: status.zshrcPath };
  }

  if (!io.isInteractive) {
    throw new Error(text.interactiveRequired);
  }

  const confirmed = await io.confirm(text.installConfirm, true);
  if (!confirmed) {
    io.writeLine(text.skippedInstall);
    io.writeLine(text.installLaterHint);
    return { status: "skipped", zshrcPath: status.zshrcPath };
  }

  await installTmuxHook({ zshrcPath: status.zshrcPath });
  io.writeLine(text.installedInto(status.zshrcPath));
  io.writeLine(text.sourceHint(status.zshrcPath));
  io.writeLine(text.openTmuxSessionHint);
  io.writeLine(text.autoAppearHint);
  return { status: "installed", zshrcPath: status.zshrcPath };
}

export async function detectTmuxInstallStatus(
  options: InstallTmuxCommandOptions = {},
): Promise<TmuxInstallStatus> {
  const homeDir = options.homeDir ?? os.homedir();
  const zshrcPath = path.join(homeDir, ".zshrc");
  const shellPath = options.shellPath ?? process.env.SHELL ?? "";
  const file = await readFile(zshrcPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  });

  return {
    tmuxAvailable: await (options.checkTmuxAvailable?.() ?? isTmuxAvailable(options.pathEnv ?? process.env.PATH)),
    shellSupported: path.basename(shellPath || "") === "zsh",
    hookInstalled: hasEveryBuddyHook(file),
    zshrcPath,
  };
}

export function renderManagedZshHookBlock(): string {
  return [EVERYBUDDY_HOOK_START, EVERYBUDDY_ZSHRC_LINE, EVERYBUDDY_HOOK_END].join("\n");
}

export function hasEveryBuddyHook(content: string): boolean {
  return (
    content.includes(EVERYBUDDY_HOOK_START) ||
    content.includes(EVERYBUDDY_ZSHRC_LINE) ||
    content.includes("buddy init zsh")
  );
}

export function mergeZshrcWithEveryBuddyHook(content: string): { content: string; changed: boolean } {
  if (hasEveryBuddyHook(content)) {
    return { content, changed: false };
  }

  const normalized = content.endsWith("\n") || content.length === 0 ? content : `${content}\n`;
  return {
    content: `${normalized}${normalized.length > 0 ? "\n" : ""}${renderManagedZshHookBlock()}\n`,
    changed: true,
  };
}

export async function installTmuxHook(options: { zshrcPath: string }): Promise<void> {
  const current = await readFile(options.zshrcPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) {
      return "";
    }

    throw error;
  });
  const merged = mergeZshrcWithEveryBuddyHook(current);
  if (!merged.changed) {
    return;
  }

  const tempPath = `${options.zshrcPath}.everybuddy.${process.pid}.${Date.now().toString(36)}.tmp`;
  await mkdir(path.dirname(options.zshrcPath), { recursive: true });
  await writeFile(tempPath, merged.content, "utf8");
  await rename(tempPath, options.zshrcPath);
}

async function isTmuxAvailable(pathEnv = process.env.PATH): Promise<boolean> {
  const candidate = await findExecutable("tmux", pathEnv);
  return candidate !== undefined;
}

async function findExecutable(binary: string, pathEnv = process.env.PATH): Promise<string | undefined> {
  for (const segment of (pathEnv ?? "").split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(segment, binary);
    try {
      await access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Keep searching.
    }
  }

  return undefined;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
