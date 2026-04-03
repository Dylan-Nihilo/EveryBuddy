import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EVERYBUDDY_HOOK_START,
  EVERYBUDDY_ZSHRC_LINE,
  mergeZshrcWithEveryBuddyHook,
  runInstallTmuxCommand,
} from "../src/cli/install.js";
import type { PromptIO } from "../src/cli/io.js";

test("mergeZshrcWithEveryBuddyHook appends a single managed block", () => {
  const first = mergeZshrcWithEveryBuddyHook("export PATH=$PATH:$HOME/bin\n");
  const second = mergeZshrcWithEveryBuddyHook(first.content);

  assert.equal(first.changed, true);
  assert.match(first.content, /EveryBuddy tmux hook/);
  assert.equal(second.changed, false);
  assert.equal(countOccurrences(first.content, EVERYBUDDY_HOOK_START), 1);
  assert.equal(countOccurrences(first.content, EVERYBUDDY_ZSHRC_LINE), 1);
});

test("runInstallTmuxCommand writes ~/.zshrc once and stays idempotent on repeat installs", async () => {
  const homeDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-install-"));
  const zshrcPath = path.join(homeDir, ".zshrc");

  try {
    const firstIo = createTestIO({ confirms: [true] });
    const first = await runInstallTmuxCommand({
      io: firstIo,
      homeDir,
      shellPath: "/bin/zsh",
      checkTmuxAvailable: async () => true,
    });

    assert.equal(first.status, "installed");
    assert.match(firstIo.output, /Installed EveryBuddy into/);

    const firstContent = await readFile(zshrcPath, "utf8");
    assert.equal(countOccurrences(firstContent, EVERYBUDDY_HOOK_START), 1);
    assert.equal(countOccurrences(firstContent, EVERYBUDDY_ZSHRC_LINE), 1);

    const secondIo = createTestIO({ confirms: [true] });
    const second = await runInstallTmuxCommand({
      io: secondIo,
      homeDir,
      shellPath: "/bin/zsh",
      checkTmuxAvailable: async () => true,
    });

    assert.equal(second.status, "already_installed");
    assert.match(secondIo.output, /already installed/);

    const secondContent = await readFile(zshrcPath, "utf8");
    assert.equal(countOccurrences(secondContent, EVERYBUDDY_HOOK_START), 1);
    assert.equal(countOccurrences(secondContent, EVERYBUDDY_ZSHRC_LINE), 1);
  } finally {
    await rm(homeDir, { recursive: true, force: true });
  }
});

interface TestIOOptions {
  interactive?: boolean;
  confirms?: boolean[];
}

function createTestIO(options: TestIOOptions = {}): PromptIO & { output: string } {
  const chunks: string[] = [];
  const confirms = [...(options.confirms ?? [])];

  return {
    isInteractive: options.interactive ?? true,
    supportsAnsi: false,
    get output() {
      return chunks.join("");
    },
    write(text: string): void {
      chunks.push(text);
    },
    writeLine(text = ""): void {
      chunks.push(`${text}\n`);
    },
    async prompt(question: string): Promise<string> {
      chunks.push(question);
      return "";
    },
    async confirm(question: string, defaultValue = true): Promise<boolean> {
      chunks.push(`${question}\n`);
      if (confirms.length === 0) {
        return defaultValue;
      }

      return confirms.shift() ?? defaultValue;
    },
  };
}

function countOccurrences(value: string, pattern: string): number {
  return value.split(pattern).length - 1;
}
