import {
  buildBundledCompanionRecord,
  selectBundledCompanionTemplate,
  selectReplacementBundledCompanionTemplate,
} from "../atlas/bundled.js";
import { uiText } from "../i18n/ui.js";
import { writeCompanionRecord, readCompanionRecord } from "../storage/companion.js";
import { resolveBuddyConfig, resolveUserId } from "../storage/config.js";

export interface HatchCommandOptions {
  user?: string | undefined;
  force?: boolean | undefined;
  storageDir?: string | undefined;
}

export async function runHatchCommand(options: HatchCommandOptions): Promise<void> {
  const language = (await resolveBuddyConfig({ storageDir: options.storageDir })).language;
  const text = uiText(language);
  const existingCompanion = await readCompanionRecord(options.storageDir);

  if (existingCompanion && !options.force) {
    throw new Error("A companion already exists. Run `buddy hatch --force` to replace it.");
  }

  const userId = options.user?.trim() ? resolveUserId(options.user) : existingCompanion?.userId ?? resolveUserId();
  const template =
    existingCompanion && options.force
      ? selectReplacementBundledCompanionTemplate(userId, existingCompanion)
      : selectBundledCompanionTemplate(userId);
  const record = buildBundledCompanionRecord(userId, template);

  await writeCompanionRecord(record, options.storageDir);
  process.stdout.write(`${text.hatchSuccess(record.soul.name, userId)}\n`);
}
