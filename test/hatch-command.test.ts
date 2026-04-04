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

test("runHatchCommand rejects when companion already exists", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-hatch-block-"));

  try {
    await runHatchCommand({
      storageDir,
      user: "hatch-block-user",
    });
    const first = await readCompanionRecord(storageDir);

    await assert.rejects(
      () => runHatchCommand({ storageDir }),
      { message: /already exists/ },
    );

    const after = await readCompanionRecord(storageDir);
    assert.deepEqual(after, first);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});
