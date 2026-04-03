import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { rollCompanion } from "../src/bones/roll.js";
import { readBuddyConfigFile } from "../src/storage/config.js";
import { readCompanionRecord, writeCompanionRecord } from "../src/storage/companion.js";
import { runBuddyHomeCommand, runSetupCommand } from "../src/cli/setup.js";
import type { PromptIO } from "../src/cli/io.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("runBuddyHomeCommand starts first-run setup when no companion exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-home-empty-"));
  const io = createTestIO();
  let receivedOptions:
    | {
        storageDir?: string | undefined;
        io?: PromptIO | undefined;
        purpose?: "first_run" | "setup" | "rehatch" | undefined;
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
    assert.match(io.output, /Run `buddy install tmux` to add the sidecar to tmux\./);
    assert.match(io.output, /Run `buddy pet` to view this card again\./);
    assert.match(io.output, /Run `buddy rehatch` to draw a new companion\./);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand prompts for a missing API key, saves config, and persists the new companion", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-setup-config-"));
  const io = createTestIO({
    prompts: ["sk-test-key"],
  });
  const previousEnv = snapshotApiEnv();
  delete process.env.OPENAI_API_KEY;
  delete process.env.DASHSCOPE_API_KEY;

  try {
    await runSetupCommand({
      storageDir,
      user: "setup-user",
      model: "test-model",
      baseUrl: "https://provider.example/v1",
      io,
      providerFactory: ({ model }) => ({
        modelId: model,
        async complete() {
          return '{"name":"Ember Tanuki","personality":"Quiet, precise, and always watching your terminal habits.","observerProfile":{"voice":"dry","chattiness":2,"sharpness":3,"patience":4}}';
        },
      }),
      installFlow: async () => undefined,
      sleep: async () => undefined,
    });

    const config = await readBuddyConfigFile(storageDir);
    const companion = await readCompanionRecord(storageDir);

    assert.equal(config.apiKey, "sk-test-key");
    assert.equal(config.model, "test-model");
    assert.equal(config.observerModel, undefined);
    assert.equal(config.baseUrl, "https://provider.example/v1");
    assert.equal(companion?.soul.name, "Ember Tanuki");
    assert.equal(companion?.soul.observerProfile.voice, "dry");
    assert.equal(companion?.soul.modelUsed, "test-model");
    assert.match(io.output, /Saved API key to/);
    assert.match(io.output, /Final Reveal/);
  } finally {
    restoreApiEnv(previousEnv);
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand does not write companion.json when soul imprint fails", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-setup-fail-"));
  const io = createTestIO({
    prompts: ["sk-fail-key"],
    confirms: [false],
  });
  const previousEnv = snapshotApiEnv();
  delete process.env.OPENAI_API_KEY;
  delete process.env.DASHSCOPE_API_KEY;

  try {
    await assert.rejects(
      () =>
        runSetupCommand({
          storageDir,
          user: "failure-user",
          model: "failure-model",
          baseUrl: "https://provider.example/v1",
          io,
          providerFactory: ({ model }) => ({
            modelId: model,
            async complete() {
              throw new Error("upstream 500");
            },
          }),
          installFlow: async () => undefined,
          sleep: async () => undefined,
        }),
      /upstream 500/,
    );

    assert.equal(await readCompanionRecord(storageDir), null);
    assert.match(io.output, /Soul imprint failed: upstream 500/);
  } finally {
    restoreApiEnv(previousEnv);
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand retries soul imprint and succeeds on the second attempt", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-setup-retry-"));
  const io = createTestIO({
    prompts: ["sk-retry-key"],
    confirms: [true],
  });
  const previousEnv = snapshotApiEnv();
  delete process.env.OPENAI_API_KEY;
  delete process.env.DASHSCOPE_API_KEY;
  let attempts = 0;

  try {
    await runSetupCommand({
      storageDir,
      user: "retry-user",
      model: "retry-model",
      baseUrl: "https://provider.example/v1",
      io,
      providerFactory: ({ model }) => ({
        modelId: model,
        async complete() {
          attempts += 1;
          if (attempts === 1) {
            throw new Error("temporary upstream failure");
          }

          return '{"name":"Retry Fox","personality":"It remembers your stumbles and smirks when you recover.","observerProfile":{"voice":"playful","chattiness":4,"sharpness":4,"patience":2}}';
        },
      }),
      installFlow: async () => undefined,
      sleep: async () => undefined,
    });

    const companion = await readCompanionRecord(storageDir);
    assert.equal(attempts, 2);
    assert.equal(companion?.soul.name, "Retry Fox");
    assert.match(io.output, /Soul imprint failed: temporary upstream failure/);
    assert.match(io.output, /Final Reveal/);
  } finally {
    restoreApiEnv(previousEnv);
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runSetupCommand cancels rehatch when the user declines overwrite", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-rehatch-cancel-"));
  const existing = createCompanionRecord("rehatch-user", "Old Spirit");
  const io = createTestIO({
    confirms: [false],
  });

  try {
    await writeCompanionRecord(existing, storageDir);
    await runSetupCommand({
      storageDir,
      io,
      purpose: "rehatch",
      providerFactory: () => {
        throw new Error("provider should not be called when rehatch is cancelled");
      },
      installFlow: async () => undefined,
      sleep: async () => undefined,
    });

    assert.deepEqual(await readCompanionRecord(storageDir), existing);
    assert.match(io.output, /Rehatch cancelled\./);
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
      providerFactory: () => {
        throw new Error("provider should not be called when reroll is declined");
      },
      installFlow: async () => {
        installCalls += 1;
      },
      sleep: async () => undefined,
    });

    assert.equal(installCalls, 1);
    assert.deepEqual(await readCompanionRecord(storageDir), existing);
    assert.match(io.output, /A companion is already hatched\./);
    assert.match(io.output, /Resident Fox is still bound to this terminal\./);
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

function snapshotApiEnv(): Record<"OPENAI_API_KEY" | "DASHSCOPE_API_KEY", string | undefined> {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };
}

function restoreApiEnv(snapshot: Record<"OPENAI_API_KEY" | "DASHSCOPE_API_KEY", string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}
