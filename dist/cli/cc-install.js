import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildBundledCompanionRecord, selectBundledCompanionTemplate } from "../atlas/bundled.js";
import { readCompanionRecord, writeCompanionRecord } from "../storage/companion.js";
import { createConsoleIO } from "./io.js";
export async function runInstallClaudeCodeCommand(options = {}) {
    const io = options.io ?? createConsoleIO();
    const claudeDir = options.claudeDir ?? path.join(os.homedir(), ".claude");
    const settingsPath = path.join(claudeDir, "settings.json");
    // Step 1: Auto-hatch companion if missing.
    let companionStatus = "already_exists";
    const existing = await readCompanionRecord().catch(() => null);
    if (!existing) {
        const userId = os.userInfo().username || "claude-code-user";
        const template = selectBundledCompanionTemplate(userId);
        const record = buildBundledCompanionRecord(userId, template);
        await writeCompanionRecord(record);
        io.writeLine(`Hatched ${record.soul.name} (${record.bones.species}) for ${userId}.`);
        companionStatus = "hatched";
    }
    else {
        io.writeLine(`Companion already exists: ${existing.soul.name}.`);
    }
    // Step 2: Merge statusLine into ~/.claude/settings.json.
    const settings = await readJSONFile(settingsPath);
    if (settings.statusLine) {
        const current = typeof settings.statusLine === "object" ? settings.statusLine.command : null;
        if (typeof current === "string" && current.includes("cc-statusline")) {
            io.writeLine("statusLine already configured for EveryBuddy.");
            return { statusLine: "already_installed", companion: companionStatus };
        }
        io.writeLine(`Warning: statusLine is already set to: ${JSON.stringify(current)}`);
        if (io.isInteractive) {
            const overwrite = await io.confirm("Overwrite with EveryBuddy statusLine?", false);
            if (!overwrite) {
                io.writeLine("Skipped statusLine configuration.");
                return { statusLine: "skipped", companion: companionStatus };
            }
        }
        else {
            io.writeLine("Skipped — run interactively to overwrite.");
            return { statusLine: "skipped", companion: companionStatus };
        }
    }
    settings.statusLine = {
        type: "command",
        command: "buddy-cc-statusline",
    };
    await writeJSONFile(settingsPath, settings);
    io.writeLine(`Wrote statusLine config to ${settingsPath}.`);
    io.writeLine("");
    io.writeLine("Done! Restart Claude Code to see your companion in the status bar.");
    return { statusLine: "installed", companion: companionStatus };
}
async function readJSONFile(filePath) {
    try {
        const content = await readFile(filePath, "utf8");
        return JSON.parse(content);
    }
    catch {
        return {};
    }
}
async function writeJSONFile(filePath, data) {
    const content = JSON.stringify(data, null, 2) + "\n";
    const tempPath = `${filePath}.everybuddy.${process.pid}.tmp`;
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, filePath);
}
//# sourceMappingURL=cc-install.js.map