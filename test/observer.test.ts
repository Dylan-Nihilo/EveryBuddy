import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCommandTracker,
  buildCommandWindowEntry,
  buildMemoryEntry,
  buildObserverPrompt,
  CompanionObserver,
  normalizeObserverResponse,
  observeCommand,
  parseObserverDecision,
  rememberCommandWindowEntry,
  rememberMemoryEntry,
} from "../src/runtime/observer.js";
import type { CommandWindowEntry, MemoryEntry, ShellEvent } from "../src/runtime/types.js";
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
    observerProfile: {
      voice: "playful",
      chattiness: 4,
      sharpness: 4,
      patience: 2,
    },
    modelUsed: "qwen3.5-plus",
  },
};

test("buildObserverPrompt frames the buddy as a separate watcher and includes structured soul plus command window", () => {
  const prompt = buildObserverPrompt({
    companion,
    command: observeCommand("pnpm dev", "/tmp/project", companion.soul.name),
    commandWindow: [
      {
        command: "pnpm install",
        normalizedCommand: "pnpm install",
        cwd: "/tmp/project",
        cwdRole: "project",
        exitCode: 0,
        durationMs: 420,
        timestamp: 900,
        addressedToBuddy: false,
      },
      {
        command: "pnpm dev",
        normalizedCommand: "pnpm dev",
        cwd: "/tmp/project",
        cwdRole: "project",
        exitCode: 1,
        durationMs: 1200,
        timestamp: 1_000,
        addressedToBuddy: false,
      },
    ],
    memory: [
      {
        timestamp: 800,
        commandRaw: "pnpm build",
        commandNormalized: "pnpm build",
        cwd: "/tmp/project",
        cwdRole: "project",
        outcome: "failure",
        exitCode: 1,
        durationMs: 600,
        importance: "low",
        reactionText: "工具链今天脾气不小。",
        addressedToBuddy: false,
        topic: "frontend tooling spiral",
        mood: "dry",
      },
    ],
    event: {
      type: "command_end",
      paneId: "%1",
      windowId: "@1",
      cwd: "/tmp/project",
      command: "pnpm dev",
      exitCode: 1,
      timestamp: 1_000,
    },
    language: "zh",
    status: "finished",
    observerProfile: companion.soul.observerProfile,
  });

  assert.match(prompt, /You are Snarky Tanuki/);
  assert.match(prompt, /Observer voice: playful/);
  assert.match(prompt, /Observer chattiness: 4\/5/);
  assert.match(prompt, /Recent command window/);
  assert.match(prompt, /Return strict JSON only/);
  assert.doesNotMatch(prompt, /Current category:/);
  // No source → defaults to [user] tag.
  assert.match(prompt, /\[user\] command=pnpm install/);
  assert.match(prompt, /\[user\] command=pnpm dev/);
});


test("parseObserverDecision reads structured JSON and normalizeObserverResponse rejects command echo", () => {
  const decision = parseObserverDecision(
    '```json\n{"shouldSpeak":true,"reaction":"工具链今天真拧巴。","topic":"frontend spiral","mood":"dry"}\n```',
  );

  assert.equal(decision.shouldSpeak, true);
  assert.equal(decision.reaction, "工具链今天真拧巴。");
  assert.equal(decision.topic, "frontend spiral");

  assert.equal(
    normalizeObserverResponse("pnpm dev failed", [
      {
        command: "pnpm dev",
        normalizedCommand: "pnpm dev",
        cwd: "/tmp/project",
        cwdRole: "project",
        exitCode: 1,
        durationMs: 200,
        timestamp: 1_000,
        addressedToBuddy: false,
      },
    ]),
    undefined,
  );

  const longReaction = "你今天已经把同一套命令折腾了三轮，工具链都快开始怀疑你是不是故意的了。";
  assert.equal(normalizeObserverResponse(longReaction), longReaction);
});

test("observer only perks up during input and does not emit hardcoded speech", () => {
  const observer = new CompanionObserver({
    companion,
  });
  const baseState = {
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
        command: "Snarky Tanuki look at this",
        timestamp: 1_000,
      },
      baseState,
    ),
    {
      status: "typing",
      reactionMode: "preserve",
      reactionText: undefined,
      importance: "addressed",
      command: observeCommand("Snarky Tanuki look at this", "/tmp/project", companion.soul.name),
      durationMs: undefined,
      shouldGenerateModel: false,
      shouldRemember: false,
      addressedToBuddy: true,
      pulse: true,
    },
  );
});

test("rememberCommandWindowEntry and rememberMemoryEntry keep only recent history", () => {
  let windowEntries: CommandWindowEntry[] = [];
  for (let index = 0; index < 8; index += 1) {
    windowEntries = rememberCommandWindowEntry(windowEntries, {
      command: `cmd-${index}`,
      normalizedCommand: `cmd-${index}`,
      cwd: "/tmp/project",
      cwdRole: "project",
      exitCode: index % 2,
      durationMs: 10,
      timestamp: index,
      addressedToBuddy: false,
    });
  }

  assert.equal(windowEntries.length, 5);
  assert.equal(windowEntries[0]?.command, "cmd-3");
  assert.equal(windowEntries[4]?.command, "cmd-7");

  let memory: MemoryEntry[] = [];
  for (let index = 0; index < 7; index += 1) {
    memory = rememberMemoryEntry(memory, {
      timestamp: index,
      commandRaw: `cmd-${index}`,
      commandNormalized: `cmd-${index}`,
      cwd: "/tmp/project",
      cwdRole: "project",
      outcome: "success",
      exitCode: 0,
      durationMs: 10,
      importance: "low",
      reactionText: `r-${index}`,
      addressedToBuddy: false,
      topic: `topic-${index}`,
      mood: "dry",
    });
  }

  assert.equal(memory.length, 5);
  assert.equal(memory[0]?.commandRaw, "cmd-6");
  assert.equal(memory[4]?.commandRaw, "cmd-2");
});

test("CompanionObserver waits for minimum window size, honors cooldown, and accepts varied follow-up lines", async () => {
  const replies = [
    '{"shouldSpeak":true,"reaction":"你又在和工具链较劲。","topic":"frontend spiral","mood":"playful"}',
    '{"shouldSpeak":true,"reaction":"今天这套前端栈不太给你面子。","topic":"frontend spiral","mood":"playful"}',
  ];
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
        return replies.shift() ?? '{"shouldSpeak":false}';
      },
    },
  });

  const startEvent: ShellEvent = {
    type: "command_start",
    paneId: "%1",
    windowId: "@1",
    cwd: "/tmp/project",
    command: "pnpm dev",
    timestamp: 9_000,
  };
  const endEvent: ShellEvent = {
    type: "command_end",
    paneId: "%1",
    windowId: "@1",
    cwd: "/tmp/project",
    command: "pnpm dev",
    exitCode: 1,
    timestamp: 10_000,
  };
  const command = observeCommand("pnpm dev", "/tmp/project", companion.soul.name);
  const tracker = buildCommandTracker(startEvent, command, "low");
  const plan = observer.observe(endEvent, {
    commandTrackers: { "%1": tracker },
    status: "thinking",
  });

  const singleEntryState = {
    commandWindows: {
      "%1": [
        buildCommandWindowEntry({
          event: endEvent,
          command,
          durationMs: 1_000,
        }),
      ],
    },
    memory: [] as MemoryEntry[],
    recentReaction: undefined,
    recentNotableReactionAt: undefined,
    status: "finished" as const,
  };
  assert.equal((await observer.maybeGenerateDecision(plan, endEvent, singleEntryState))?.reaction, "你又在和工具链较劲。");
  assert.match(prompt, /Recent command window/);
  assert.match(prompt, /Observer sharpness: 4\/5/);

  assert.equal(
    await observer.maybeGenerateDecision(plan, endEvent, {
      ...singleEntryState,
      recentNotableReactionAt: 10_000,
    }),
    undefined,
  );

  now = 14_500;
  const followUp = await observer.maybeGenerateDecision(plan, endEvent, {
    ...singleEntryState,
    recentReaction: {
      text: "你又在和工具链较劲。",
      at: 10_000,
      topic: "frontend spiral",
      mood: "playful",
    },
    recentNotableReactionAt: 10_000,
  });
  assert.equal(followUp?.reaction, "今天这套前端栈不太给你面子。");
});

test("CompanionObserver accepts shouldSpeak=false and stays silent", async () => {
  const quietCompanion: CompanionRecord = {
    ...companion,
    soul: {
      ...companion.soul,
      observerProfile: {
        voice: "quiet",
        chattiness: 1,
        sharpness: 2,
        patience: 5,
      },
    },
  };
  const observer = new CompanionObserver({
    companion: quietCompanion,
    provider: {
      modelId: "mock-model",
      async complete(): Promise<string> {
        return '{"shouldSpeak":false,"topic":"nothing notable"}';
      },
    },
  });
  const command = observeCommand("pnpm dev", "/tmp/project", quietCompanion.soul.name);
  const endEvent: ShellEvent = {
    type: "command_end",
    paneId: "%1",
    windowId: "@1",
    cwd: "/tmp/project",
    command: "pnpm dev",
    exitCode: 1,
    timestamp: 2_000,
  };
  const plan = observer.observe(endEvent, {
    commandTrackers: {
      "%1": {
        paneId: "%1",
        commandRaw: "pnpm dev",
        startedAt: 1_000,
        cwd: "/tmp/project",
        addressedToBuddy: false,
        cwdRole: "project",
      },
    },
    status: "thinking",
  });

  assert.equal(
    await observer.maybeGenerateDecision(plan, endEvent, {
      commandWindows: {
        "%1": [
          {
            command: "pnpm dev",
            normalizedCommand: "pnpm dev",
            cwd: "/tmp/project",
            cwdRole: "project",
            exitCode: 1,
            durationMs: 1_000,
            timestamp: 2_000,
            addressedToBuddy: false,
          },
          {
            command: "pnpm build",
            normalizedCommand: "pnpm build",
            cwd: "/tmp/project",
            cwdRole: "project",
            exitCode: 0,
            durationMs: 400,
            timestamp: 1_000,
            addressedToBuddy: false,
          },
          {
            command: "pnpm test",
            normalizedCommand: "pnpm test",
            cwd: "/tmp/project",
            cwdRole: "project",
            exitCode: 0,
            durationMs: 300,
            timestamp: 500,
            addressedToBuddy: false,
          },
        ],
      },
      memory: [],
      recentReaction: undefined,
      recentNotableReactionAt: undefined,
      status: "finished",
    }),
    undefined,
  );
});
