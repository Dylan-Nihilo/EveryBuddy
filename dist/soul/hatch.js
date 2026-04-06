import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { parseObserverProfile } from "./profile.js";
export async function hatchSoul(bones, provider, language) {
    const prompt = buildHatchPrompt(bones, language);
    const response = await provider.complete(prompt);
    const parsed = parseHatchResponse(response);
    return {
        name: parsed.name,
        tagline: parsed.tagline,
        personality: parsed.personality,
        observerProfile: parsed.observerProfile,
        modelUsed: provider.modelId,
    };
}
export function buildCompanionRecord(userId, bones, soul) {
    return {
        userId,
        bones,
        soul,
        createdAt: new Date().toISOString(),
    };
}
export function parseHatchResponse(response) {
    const stripped = stripMarkdownFence(response);
    const parsed = JSON.parse(stripped);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Hatch response must be a JSON object.");
    }
    const record = parsed;
    const name = normalizeField(record.name);
    const tagline = normalizeField(record.tagline);
    const personality = normalizeField(record.personality);
    const observerProfile = parseObserverProfile(record.observerProfile);
    if (name.length === 0 || name.length > 40) {
        throw new Error("Hatch response `name` must be between 1 and 40 characters.");
    }
    if (tagline.length === 0 || tagline.length > 80) {
        throw new Error("Hatch response `tagline` must be between 1 and 80 characters.");
    }
    if (personality.length === 0 || personality.length > 300) {
        throw new Error("Hatch response `personality` must be between 1 and 300 characters.");
    }
    return { name, tagline, personality, observerProfile };
}
export function buildHatchPrompt(bones, language) {
    const [peakStat, peakValue] = getPeakStat(bones.stats);
    const [dumpStat, dumpValue] = getDumpStat(bones.stats);
    const languageInstruction = language === "zh"
        ? "Write the personality in Simplified Chinese."
        : "Write the personality in English.";
    return [
        "You are naming and defining a terminal companion pet.",
        "",
        `Species: ${bones.species}`,
        `Rarity: ${bones.rarity.name}`,
        `Stats: ${JSON.stringify(bones.stats)}`,
        `Shiny: ${bones.shiny ? "yes" : "no"}`,
        `Peak stat: ${peakStat} (${peakValue})`,
        `Dump stat: ${dumpStat} (${dumpValue})`,
        "",
        "Rules:",
        "- Name must be 1-2 words.",
        "- Name must fit the species and rarity.",
        "- Tagline must be one short, evocative flavor-text sentence like a game companion card.",
        "- Tagline must feel poetic and memorable, not a literal summary.",
        "- Tagline must stay under 80 characters.",
        "- Personality must be 2-3 sentences.",
        "- Personality must reference the peak stat as a defining trait.",
        "- Personality must reference the dump stat as a charming flaw.",
        "- Observer profile must match the same personality and control how often the pet comments.",
        '- Observer profile JSON shape: {"voice":"quiet|dry|playful|deadpan","chattiness":1-5,"sharpness":1-5,"patience":1-5}',
        `- ${languageInstruction}`,
        "- Return only valid JSON.",
        '- JSON shape: {"name":"...","tagline":"...","personality":"...","observerProfile":{"voice":"...","chattiness":3,"sharpness":3,"patience":3}}',
    ].join("\n");
}
function stripMarkdownFence(value) {
    const trimmed = value.trim();
    if (!trimmed.startsWith("```")) {
        return trimmed;
    }
    return trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
}
function normalizeField(value) {
    return typeof value === "string" ? value.trim() : "";
}
//# sourceMappingURL=hatch.js.map