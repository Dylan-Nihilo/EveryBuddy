import { mkdir, unlink } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
export function socketDirectory(env = process.env) {
    const root = env.EVERYBUDDY_TMPDIR?.trim() || os.tmpdir();
    return path.join(root, "everybuddy");
}
export function socketPathForWindow(windowId, env = process.env) {
    return path.join(socketDirectory(env), `${sanitizeWindowId(windowId)}.sock`);
}
export async function ensureSocketDirectory(env = process.env) {
    await mkdir(socketDirectory(env), { recursive: true });
}
export async function removeSocketIfExists(socketPath) {
    try {
        await unlink(socketPath);
    }
    catch (error) {
        if (!isMissingFileError(error)) {
            throw error;
        }
    }
}
export async function sendShellEvent(event, env = process.env) {
    const socketPath = socketPathForWindow(event.windowId, env);
    await new Promise((resolve) => {
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
function sanitizeWindowId(windowId) {
    return windowId.replace(/[^\w.-]/g, "_");
}
function isMissingFileError(error) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
//# sourceMappingURL=socket.js.map