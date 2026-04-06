#!/usr/bin/env node

import os from "node:os";

import { buildBundledCompanionRecord, selectBundledCompanionTemplate } from "./atlas/bundled.js";
import { readCompanionRecord, writeCompanionRecord } from "./storage/companion.js";

async function main(): Promise<void> {
  const existing = await readCompanionRecord().catch(() => null);
  if (existing) {
    return;
  }

  const userId = os.userInfo().username || "claude-code-user";
  const template = selectBundledCompanionTemplate(userId);
  const record = buildBundledCompanionRecord(userId, template);
  await writeCompanionRecord(record);
}

main().catch(() => {
  // Silent — don't block CC startup.
});
