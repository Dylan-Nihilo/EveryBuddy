import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getCardOutput, NO_COMPANION_MESSAGE } from "../src/cli/card.js";
import { renderCompanionCard } from "../src/render/card.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("getCardOutput prompts the user to hatch when no persisted companion exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-card-"));

  try {
    const output = await getCardOutput(storageDir);
    assert.equal(output, NO_COMPANION_MESSAGE);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("renderCompanionCard surfaces rarity and companion identity prominently", () => {
  const output = renderCompanionCard({
    userId: "dylanthomas",
    bones: {
      userId: "dylanthomas",
      species: "tanuki",
      rarity: {
        tier: 2,
        name: "Rare",
        stars: "***",
        color: "#60A5FA",
        weight: 10,
        floor: 35,
      },
      eye: "dot",
      hat: "crown",
      stats: {
        GRIT: 74,
        FOCUS: 27,
        CHAOS: 8,
        WIT: 14,
        SASS: 95,
      },
      color: {
        primary: "#C4A882",
        accent: "#8B7355",
      },
      shiny: false,
    },
    soul: {
      name: "Sassy Tanuki",
      personality: "嘴很毒，但观察力很准。",
      modelUsed: "qwen3.5-plus",
    },
    createdAt: "2026-04-02T08:09:26.636Z",
  } satisfies CompanionRecord);

  assert.match(output, /EveryBuddy Companion/);
  assert.match(output, /RARE/);
  assert.match(output, /Sassy Tanuki/);
  assert.match(output, /Rarity\s+Rare \*\*\*/);
});
