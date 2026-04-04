import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildBundledCompanionRecord, selectBundledCompanionTemplate } from "../src/atlas/bundled.js";
import { rollCompanion } from "../src/bones/roll.js";
import { runBuddyHomeCommand, runSetupCommand } from "../src/cli/setup.js";
import type { PromptIO } from "../src/cli/io.js";
import { readBuddyConfigFile } from "../src/storage/config.js";
import { readCompanionRecord, writeCompanionRecord } from "../src/storage/companion.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("runBuddyHomeCommand starts first-run setup when no companion exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-home-empty-"));
  const io = createTestIO();
  let receivedOptions:
    | {
        storageDir?: string | undefined;
        io?: PromptIO | undefined;
        purpose?: "first_run" | "setup" | undefined;
      }
    | undefined;

  try {
    await runBuddyHomeCommand({
      storageDir,
      io,
      startSetup: async (options) => {
        receivedOptions = options;
      },
    });

    assert.deepEqual(receivedOptions, {
      storageDir,
      io,
      purpose: "first_run",
    });
    assert.equal(io.output, "");
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runBuddyHomeCommand shows the current pet card and tmux guidance once a companion exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-home-card-"));
  const io = createTestIO({ interactive: false });

  try {
    await writeCompanionRecord(createCompanionRecord("home-user", "Pocket Butler"), storageDir);

    await runBuddyHomeCommand({
      storageDir,
      io,
      detectInstallStatus: async () => ({
        tmuxAvailable: true,
        shellSupported: true,
        hookInstalled: false,
        zshrcPath: path.join(storageDir, ".zshrc"),
      }),
    });

    assert.match(io.output, /Pocket Butler/);
    assert.match(io.output, /运行 `buddy install tmux` 把 sidecar 接进 tmux。/);
    assert.match(io.output, /运行 `buddy pet` 再看一次这张卡。/);
    assert.match(io.output, /╭─/);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand draws a bundled companion locally and prompts for provider config", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-setup-bundled-"));
  const io = createTestIO({
    prompts: ["4"],
  });
  const expectedTemplate = selectBundledCompanionTemplate("setup-user");

  try {
    await runSetupCommand({
      storageDir,
      user: "setup-user",
      io,
      installFlow: async () => undefined,
      sleep: async () => undefined,
    });

    const config = await readBuddyConfigFile(storageDir);
    const companion = await readCompanionRecord(storageDir);

    assert.deepEqual(config, {});
    assert.equal(companion?.templateId, expectedTemplate.id);
    assert.equal(companion?.soul.name, expectedTemplate.soul.name);
    assert.equal(companion?.soul.tagline, expectedTemplate.soul.tagline);
    assert.equal(companion?.soul.modelUsed, "bundled");
    assert.match(io.output, /seed 已锁定到/);
    assert.match(io.output, /╭─/);
    assert.match(io.output, /已保存到/);
    assert.match(io.output, /Choose your LLM provider/);
    assert.match(io.output, /Skipped\. Set DASHSCOPE_API_KEY/);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand blocks re-draw when companion already exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-no-redraw-"));
  const existing = createCompanionRecord("block-user", "Old Spirit");
  const io = createTestIO({});
  let installCalls = 0;

  try {
    await writeCompanionRecord(existing, storageDir);
    await runSetupCommand({
      storageDir,
      io,
      purpose: "setup",
      installFlow: async () => { installCalls += 1; },
      sleep: async () => undefined,
    });

    assert.deepEqual(await readCompanionRecord(storageDir), existing);
    assert.match(io.output, /已经有一只宠物了。/);
    assert.equal(installCalls, 1);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand keeps the current companion and still runs tmux install guidance when reroll is declined", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-setup-install-"));
  const existing = createCompanionRecord("setup-existing-user", "Resident Fox");
  const io = createTestIO({
    confirms: [false],
  });
  let installCalls = 0;

  try {
    await writeCompanionRecord(existing, storageDir);
    await runSetupCommand({
      storageDir,
      io,
      purpose: "setup",
      installFlow: async () => {
        installCalls += 1;
      },
      sleep: async () => undefined,
    });

    assert.equal(installCalls, 1);
    assert.deepEqual(await readCompanionRecord(storageDir), existing);
    assert.match(io.output, /已经有一只宠物了。/);
    assert.match(io.output, /Resident Fox 还绑定在这个终端上。/);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

interface TestIOOptions {
  interactive?: boolean;
  prompts?: string[];
  confirms?: boolean[];
}

function createTestIO(options: TestIOOptions = {}): PromptIO & { output: string } {
  const chunks: string[] = [];
  const prompts = [...(options.prompts ?? [])];
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
      return prompts.shift() ?? "";
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

function createCompanionRecord(userId: string, name: string): CompanionRecord {
  return {
    userId,
    bones: rollCompanion(userId),
    soul: {
      name,
      tagline: "A small shadow at the edge of the shell.",
      personality: "Quiet, observant, and not impressed by sloppy shell work.",
      observerProfile: {
        voice: "dry",
        chattiness: 3,
        sharpness: 3,
        patience: 3,
      },
      modelUsed: "qwen3.5-plus",
    },
    createdAt: "2026-04-02T00:00:00.000Z",
  };
}
