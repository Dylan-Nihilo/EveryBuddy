import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommandTracker,
  buildObserverPrompt,
  classifyEventImportance,
  CompanionObserver,
  normalizeObserverResponse,
  observeCommand,
  rememberMemoryEntry,
} from "../src/runtime/observer.js";
import type { MemoryEntry, ShellEvent } from "../src/runtime/types.js";
import type { CompanionRecord } from "../src/types/companion.js";

const companion: CompanionRecord = {
  userId: "dylan",
  createdAt: "2026-04-02T00:00:00.000Z",
  bones: {
    userId: "dylan",
    species: "tanuki",
    eye: "dot",
    hat: "none",
    shiny: false,
    color: {
      primary: "#111111",
      accent: "#222222",
    },
    rarity: {
      tier: 2,
      name: "rare",
      stars: "**",
      color: "#ffffff",
      weight: 10,
      floor: 20,
    },
    stats: {
      GRIT: 70,
      FOCUS: 61,
      CHAOS: 12,
      WIT: 55,
      SASS: 40,
    },
  },
  soul: {
    name: "Snarky Tanuki",
    personality: "Sharp-tongued, observant, and quietly fond of clean wins.",
    modelUsed: "qwen3.5-plus",
  },
};

test("buildObserverPrompt frames the buddy as a separate watcher without parroting the raw command", () => {
  const prompt = buildObserverPrompt({
    companion,
    command: observeCommand("pnpm test", "/tmp/project", companion.soul.name),
    memory: [],
    event: {
      type: "command_end",
      paneId: "%1",
      windowId: "@1",
      cwd: "/tmp/project",
      command: "pnpm test",
      exitCode: 0,
      timestamp: 1_000,
    },
    language: "zh",
    durationMs: 2_200,
    importance: "high",
  });

  assert.match(prompt, /You are Snarky Tanuki/);
  assert.match(prompt, /separate watcher, not the main assistant/);
  assert.match(prompt, /Current category: test/);
  assert.doesNotMatch(prompt, /Observed command:/);
  assert.match(prompt, /Use Simplified Chinese/);
});

test("normalizeObserverResponse strips fences but rejects command echo", () => {
  assert.equal(
    normalizeObserverResponse('```text\n"干得不错。"\n第二行忽略\n```'),
    "干得不错。",
  );

  assert.equal(
    normalizeObserverResponse("pnpm test passed", {
      raw: "pnpm test",
      normalized: "pnpm test",
    }),
    undefined,
  );
});

test("observer stays quiet for generic typing but reacts when called by name", () => {
  const observer = new CompanionObserver({
    companion,
  });
  const baseState = {
    memory: [] as MemoryEntry[],
    commandTrackers: {},
    status: "idle" as const,
  };

  assert.deepEqual(
    observer.observe(
      {
        type: "input_update",
        paneId: "%1",
        windowId: "@1",
        cwd: "/tmp/project",
        command: "git push origin main",
        timestamp: 1_000,
      },
      baseState,
    ),
    {
      status: "typing",
      reactionMode: "clear",
      reactionText: undefined,
      importance: "low",
      command: observeCommand("git push origin main", "/tmp/project", companion.soul.name),
      durationMs: undefined,
      shouldGenerateModel: false,
      shouldRemember: false,
      addressedToBuddy: false,
      pulse: false,
    },
  );

  assert.deepEqual(
    observer.observe(
      {
        type: "input_update",
        paneId: "%1",
        windowId: "@1",
        cwd: "/tmp/project",
        command: "Snarky Tanuki you there?",
        timestamp: 1_100,
      },
      baseState,
    ),
    {
      status: "typing",
      reactionMode: "persistent",
      reactionText: "在呢。",
      importance: "addressed",
      command: observeCommand("Snarky Tanuki you there?", "/tmp/project", companion.soul.name),
      durationMs: undefined,
      shouldGenerateModel: false,
      shouldRemember: false,
      addressedToBuddy: true,
      pulse: true,
    },
  );

  assert.deepEqual(
    observer.observe(
      {
        type: "pane_active",
        paneId: "%2",
        windowId: "@1",
        cwd: "/tmp/project",
        timestamp: 1_200,
      },
      {
        ...baseState,
        status: "typing",
      },
    ),
    {
      status: "idle",
      reactionMode: "clear",
      reactionText: undefined,
      importance: "silent",
      command: undefined,
      durationMs: undefined,
      shouldGenerateModel: false,
      shouldRemember: false,
      addressedToBuddy: false,
      pulse: false,
    },
  );
});

test("classifier silences low-signal work, remembers notable work, and trims memory", () => {
  const lowSignal = classifyEventImportance({
    event: {
      type: "command_end",
      paneId: "%1",
      windowId: "@1",
      cwd: "/tmp/project",
      command: "pwd",
      exitCode: 0,
      timestamp: 1_000,
    },
    command: observeCommand("pwd", "/tmp/project", companion.soul.name),
    memory: [],
    durationMs: 5,
  });
  assert.equal(lowSignal, "silent");

  const notable = classifyEventImportance({
    event: {
      type: "command_end",
      paneId: "%1",
      windowId: "@1",
      cwd: "/tmp/project",
      command: "pnpm test",
      exitCode: 0,
      timestamp: 2_000,
    },
    command: observeCommand("pnpm test", "/tmp/project", companion.soul.name),
    memory: [],
    durationMs: 2_500,
  });
  assert.equal(notable, "high");

  let memory: MemoryEntry[] = [];
  for (let index = 0; index < 7; index += 1) {
    memory = rememberMemoryEntry(memory, {
      timestamp: index,
      commandRaw: `cmd-${index}`,
      commandNormalized: `cmd-${index}`,
      category: "shell",
      cwd: "/tmp/project",
      outcome: "success",
      durationMs: 10,
      importance: "high",
      reactionText: `r-${index}`,
      addressedToBuddy: false,
      significance: "general shell work",
      cwdRole: "project",
    });
  }

  assert.equal(memory.length, 5);
  assert.equal(memory[0]?.commandRaw, "cmd-6");
  assert.equal(memory[4]?.commandRaw, "cmd-2");
});

test("CompanionObserver uses the model for command_end and respects cooldown state", async () => {
  let prompt = "";
  let now = 10_000;

  const observer = new CompanionObserver({
    companion,
    language: "zh",
    now: () => now,
    llmCooldownMs: 4_000,
    provider: {
      modelId: "mock-model",
      async complete(nextPrompt: string): Promise<string> {
        prompt = nextPrompt;
        return '```text\n"测试全绿。"\n```';
      },
    },
  });

  const startEvent: ShellEvent = {
    type: "command_start",
    paneId: "%1",
    windowId: "@1",
    cwd: "/tmp/project",
    command: "pnpm test",
    timestamp: 9_000,
  };
  const endEvent: ShellEvent = {
    type: "command_end",
    paneId: "%1",
    windowId: "@1",
    cwd: "/tmp/project",
    command: "pnpm test",
    exitCode: 0,
    timestamp: 10_000,
  };
  const command = observeCommand("pnpm test", "/tmp/project", companion.soul.name);
  const tracker = buildCommandTracker(startEvent, command, "high");
  const plan = observer.observe(endEvent, {
    memory: [],
    commandTrackers: { "%1": tracker },
    status: "thinking",
  });

  assert.equal(await observer.maybeGenerateReaction(plan, endEvent, {
    memory: [],
    recentReaction: undefined,
    recentNotableReactionAt: undefined,
  }), "测试全绿。");
  assert.match(prompt, /Current category: test/);
  assert.doesNotMatch(prompt, /Observed command:/);

  assert.equal(await observer.maybeGenerateReaction(plan, endEvent, {
    memory: [],
    recentReaction: undefined,
    recentNotableReactionAt: 10_000,
  }), undefined);

  now = 14_500;
  assert.equal(await observer.maybeGenerateReaction(plan, endEvent, {
    memory: [],
    recentReaction: undefined,
    recentNotableReactionAt: 10_000,
  }), "测试全绿。");
});
