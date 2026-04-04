import {
  buildBundledCompanionRecord,
  selectBundledCompanionTemplate,
} from "../atlas/bundled.js";
import { uiText } from "../i18n/ui.js";
import { writeCompanionRecord, readCompanionRecord } from "../storage/companion.js";
import { resolveBuddyConfig, resolveUserId } from "../storage/config.js";

export interface HatchCommandOptions {
  user?: string | undefined;
  storageDir?: string | undefined;
}

export async function runHatchCommand(options: HatchCommandOptions): Promise<void> {
  const language = (await resolveBuddyConfig({ storageDir: options.storageDir })).language;
  const text = uiText(language);
  const existingCompanion = await readCompanionRecord(options.storageDir);

  if (existingCompanion) {
    throw new Error("A companion already exists. Each user gets exactly one draw.");
  }

  const userId = options.user?.trim() ? resolveUserId(options.user) : resolveUserId();
  const template = selectBundledCompanionTemplate(userId);
  const record = buildBundledCompanionRecord(userId, template);

  await writeCompanionRecord(record, options.storageDir);
  process.stdout.write(`${text.hatchSuccess(record.soul.name, userId)}\n`);
}
