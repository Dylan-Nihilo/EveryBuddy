import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { rollCompanion } from "../src/bones/roll.js";
import { readCompanionRecord, writeCompanionRecord } from "../src/storage/companion.js";
import type { CompanionRecord } from "../src/types/companion.js";

test("writeCompanionRecord persists and readCompanionRecord restores the full record", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-companion-"));
  const bones = rollCompanion("storage-spec-user");
  const record: CompanionRecord = {
    templateId: "storage-template",
    userId: "storage-spec-user",
    bones,
    soul: {
      name: "Mochi",
      tagline: "A dry spark behind the prompt.",
      personality: "Calm, observant, and slightly judgmental about messy git history.",
      observerProfile: {
        voice: "dry",
        chattiness: 3,
        sharpness: 3,
        patience: 3,
      },
      modelUsed: "gpt-4o-mini",
    },
    createdAt: "2026-04-02T00:00:00.000Z",
  };

  try {
    await writeCompanionRecord(record, storageDir);
    const restored = await readCompanionRecord(storageDir);

    assert.deepEqual(restored, record);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});
