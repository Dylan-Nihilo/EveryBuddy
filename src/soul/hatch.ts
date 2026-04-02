import { getDumpStat, getPeakStat } from "../bones/stats.js";
import type {
  BuddyLanguage,
  CompanionBones,
  CompanionRecord,
  CompanionSoul,
} from "../types/companion.js";
import type { AIProvider } from "./providers/types.js";

export async function hatchSoul(
  bones: CompanionBones,
  provider: AIProvider,
  language: BuddyLanguage,
): Promise<CompanionSoul> {
  const prompt = buildHatchPrompt(bones, language);
  const response = await provider.complete(prompt);
  const parsed = parseHatchResponse(response);

  return {
    name: parsed.name,
    personality: parsed.personality,
    modelUsed: provider.modelId,
  };
}

export function buildCompanionRecord(
  userId: string,
  bones: CompanionBones,
  soul: CompanionSoul,
): CompanionRecord {
  return {
    userId,
    bones,
    soul,
    createdAt: new Date().toISOString(),
  };
}

export function parseHatchResponse(response: string): Pick<CompanionSoul, "name" | "personality"> {
  const stripped = stripMarkdownFence(response);
  const parsed = JSON.parse(stripped) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Hatch response must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  const name = normalizeField(record.name);
  const personality = normalizeField(record.personality);

  if (name.length === 0 || name.length > 40) {
    throw new Error("Hatch response `name` must be between 1 and 40 characters.");
  }

  if (personality.length === 0 || personality.length > 300) {
    throw new Error("Hatch response `personality` must be between 1 and 300 characters.");
  }

  return { name, personality };
}

export function buildHatchPrompt(bones: CompanionBones, language: BuddyLanguage): string {
  const [peakStat, peakValue] = getPeakStat(bones.stats);
  const [dumpStat, dumpValue] = getDumpStat(bones.stats);
  const languageInstruction =
    language === "zh"
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
    "- Personality must be 2-3 sentences.",
    "- Personality must reference the peak stat as a defining trait.",
    "- Personality must reference the dump stat as a charming flaw.",
    `- ${languageInstruction}`,
    "- Return only valid JSON.",
    '- JSON shape: {"name":"...","personality":"..."}',
  ].join("\n");
}

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
