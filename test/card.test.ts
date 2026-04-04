import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getCardOutput } from "../src/cli/card.js";
import { renderCompanionCard } from "../src/render/card.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("getCardOutput prompts the user to hatch when no persisted companion exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-card-"));

  try {
    const output = await getCardOutput(storageDir);
    assert.equal(output, "未找到宠物。先运行 `buddy` 来抽取一只。");
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("renderCompanionCard surfaces localized rarity and companion identity prominently", () => {
  const record = {
    templateId: "sassy-tanuki",
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
      observerProfile: {
        voice: "playful",
        chattiness: 4,
        sharpness: 4,
        patience: 2,
      },
      modelUsed: "bundled",
    },
    createdAt: "2026-04-02T08:09:26.636Z",
  } satisfies CompanionRecord;
  const zhOutput = renderCompanionCard(record);
  const enOutput = renderCompanionCard(record, { language: "en" });

  assert.match(zhOutput, /╭─/);
  assert.match(zhOutput, /稀有/);
  assert.match(zhOutput, /★ ★ ★/);
  assert.match(zhOutput, /Sassy Tanuki/);
  assert.match(zhOutput, /█/);
  assert.doesNotMatch(zhOutput, /bundled/);

  assert.match(enOutput, /╭─/);
  assert.match(enOutput, /RARE/);
  assert.match(enOutput, /Sassy Tanuki/);
});
