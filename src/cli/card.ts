import { readCompanionRecord } from "../storage/companion.js";
import { renderCompanionCard } from "../render/card.js";

export const NO_COMPANION_MESSAGE = "No companion found. Run `buddy` to hatch one.";

export async function runCardCommand(): Promise<void> {
  const output = await getCardOutput();
  process.stdout.write(`${output}\n`);
}

export async function getCardOutput(storageDir?: string): Promise<string> {
  const companion = await readCompanionRecord(storageDir);
  if (!companion) {
    return NO_COMPANION_MESSAGE;
  }

  return renderCompanionCard(companion);
}
