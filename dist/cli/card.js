import { readCompanionRecord } from "../storage/companion.js";
import { resolveBuddyConfig } from "../storage/config.js";
import { renderCompanionCard } from "../render/card.js";
import { uiText } from "../i18n/ui.js";
export const NO_COMPANION_MESSAGE = uiText("zh").noCompanionFound;
export async function runCardCommand(options = {}) {
    if (options.color) {
        Object.defineProperty(process.stdout, "isTTY", { value: true });
    }
    const output = await getCardOutput();
    process.stdout.write(`${output}\n`);
}
export async function getCardOutput(storageDir) {
    const language = (await resolveBuddyConfig({ storageDir })).language;
    const text = uiText(language);
    const companion = await readCompanionRecord(storageDir);
    if (!companion) {
        return text.noCompanionFound;
    }
    return renderCompanionCard(companion, { language });
}
//# sourceMappingURL=card.js.map