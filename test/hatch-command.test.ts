import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { selectBundledCompanionTemplate } from "../src/atlas/bundled.js";
import { runHatchCommand } from "../src/cli/hatch.js";
import { readCompanionRecord } from "../src/storage/companion.js";

test("runHatchCommand persists the deterministic bundled draw", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-hatch-local-"));
  const expectedTemplate = selectBundledCompanionTemplate("hatch-user");

  try {
    await runHatchCommand({
      storageDir,
      user: "hatch-user",
    });

    const companion = await readCompanionRecord(storageDir);
    assert.equal(companion?.templateId, expectedTemplate.id);
    assert.equal(companion?.soul.name, expectedTemplate.soul.name);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("runHatchCommand force replaces the current bundled companion with a different one", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-hatch-force-"));

  try {
    await runHatchCommand({
      storageDir,
      user: "hatch-force-user",
    });
    const first = await readCompanionRecord(storageDir);

    await runHatchCommand({
      storageDir,
      force: true,
    });
    const second = await readCompanionRecord(storageDir);

    assert.equal(second?.userId, "hatch-force-user");
    assert.notEqual(second?.templateId, first?.templateId);
    assert.notEqual(second?.bones.species, first?.bones.species);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});
