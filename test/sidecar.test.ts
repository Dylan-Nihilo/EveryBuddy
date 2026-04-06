import assert from "node:assert/strict";
import test from "node:test";

import {
  buildIdleSoulSummary,
  resolveReactionBubble,
  resolveRenderMode,
  resolveSpriteFrameState,
} from "../src/render/layout.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("resolveReactionBubble hides expired reactions and fades near expiry", () => {
  assert.deepEqual(
    resolveReactionBubble({ reactionText: undefined, reactionExpiresAt: undefined }, 1_000),
    { text: undefined, fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: undefined }, 1_000),
    { text: "Build finished cleanly.", fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 5_000),
    { text: "Build finished cleanly.", fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 7_500),
    { text: "Build finished cleanly.", fading: true },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 10_000),
    { text: undefined, fading: false },
  );
});

test("resolveSpriteFrameState uses a sparse idle sequence with occasional blink", () => {
  assert.deepEqual(resolveSpriteFrameState(0, false, 3), { frameIndex: 0, blink: false });
  assert.deepEqual(resolveSpriteFrameState(4, false, 3), { frameIndex: 1, blink: false });
  assert.deepEqual(resolveSpriteFrameState(8, false, 3), { frameIndex: 0, blink: true });
  assert.deepEqual(resolveSpriteFrameState(11, false, 3), { frameIndex: 2, blink: false });
});

test("resolveSpriteFrameState cycles all frames while animated", () => {
  assert.deepEqual(resolveSpriteFrameState(0, true, 3), { frameIndex: 0, blink: false });
  assert.deepEqual(resolveSpriteFrameState(4, true, 3), { frameIndex: 1, blink: false });
  assert.deepEqual(resolveSpriteFrameState(5, true, 3), { frameIndex: 2, blink: false });
});

test("resolveSpriteFrameState uses the excited cycle during a perk-up pulse", () => {
  assert.deepEqual(resolveSpriteFrameState(2, false, 3, true), { frameIndex: 2, blink: false });
});

test("resolveRenderMode switches between full and narrow layouts by pane width", () => {
  assert.equal(resolveRenderMode(30), "full");
  assert.equal(resolveRenderMode(26), "full");
  assert.equal(resolveRenderMode(22), "narrow");
});

test("buildIdleSoulSummary prefers the hatched tagline when present", () => {
  const companion: CompanionRecord = {
    userId: "dylan",
    createdAt: "2026-04-03T00:00:00.000Z",
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
        tier: 1,
        name: "Common",
        stars: "*",
        color: "#ffffff",
        weight: 10,
        floor: 0,
      },
      stats: {
        GRIT: 20,
        FOCUS: 22,
        CHAOS: 8,
        WIT: 14,
        SASS: 95,
      },
    },
    soul: {
      name: "Honk",
      tagline: "它在命令回响里收拢一身坏笑。",
      personality: "这只鹅自认为是最毒舌的评论家。",
      observerProfile: {
        voice: "dry",
        chattiness: 4,
        sharpness: 5,
        patience: 2,
      },
      modelUsed: "qwen3.5-plus",
    },
  };

  assert.equal(buildIdleSoulSummary(companion), "它在命令回响里收拢一身坏笑。");
});

test("buildIdleSoulSummary falls back to a compact local summary for old companions", () => {
  const companion: CompanionRecord = {
    userId: "dylan",
    createdAt: "2026-04-03T00:00:00.000Z",
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
        tier: 1,
        name: "Common",
        stars: "*",
        color: "#ffffff",
        weight: 10,
        floor: 0,
      },
      stats: {
        GRIT: 20,
        FOCUS: 22,
        CHAOS: 8,
        WIT: 14,
        SASS: 95,
      },
    },
    soul: {
      name: "Honk",
      personality: "这只鹅自认为是最毒舌的评论家。",
      observerProfile: {
        voice: "dry",
        chattiness: 4,
        sharpness: 5,
        patience: 2,
      },
      modelUsed: "qwen3.5-plus",
    },
  };

  assert.equal(buildIdleSoulSummary(companion), "冷面型 · 毒舌强，混沌低");
});
