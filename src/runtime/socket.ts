import { mkdir, unlink } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import type { ShellEvent } from "./types.js";

export function socketDirectory(env: NodeJS.ProcessEnv = process.env): string {
  const root = env.EVERYBUDDY_TMPDIR?.trim() || os.tmpdir();
  return path.join(root, "everybuddy");
}

export function socketPathForWindow(
  windowId: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return path.join(socketDirectory(env), `${sanitizeWindowId(windowId)}.sock`);
}

export async function ensureSocketDirectory(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await mkdir(socketDirectory(env), { recursive: true });
}

export async function removeSocketIfExists(socketPath: string): Promise<void> {
  try {
    await unlink(socketPath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }
}

export async function sendShellEvent(
  event: ShellEvent,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const socketPath = socketPathForWindow(event.windowId, env);

  await new Promise<void>((resolve) => {
    const client = net.createConnection(socketPath);
    const payload = `${JSON.stringify(event)}\n`;

    client.on("connect", () => {
      client.end(payload);
    });

    client.on("error", () => {
      resolve();
    });

    client.on("close", () => {
      resolve();
    });
  });
}

function sanitizeWindowId(windowId: string): string {
  return windowId.replace(/[^\w.-]/g, "_");
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
