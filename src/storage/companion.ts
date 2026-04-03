import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_OBSERVER_PROFILE, parseOptionalObserverProfile } from "../soul/profile.js";
import { companionFilePath, defaultStorageDir } from "./paths.js";
import type {
  ColorPalette,
  CompanionBones,
  CompanionRecord,
  CompanionSoul,
  Rarity,
  StatBlock,
} from "../types/companion.js";

export async function readCompanionRecord(
  storageDir = defaultStorageDir(),
): Promise<CompanionRecord | null> {
  const targetPath = companionFilePath(storageDir);

  try {
    const raw = await readFile(targetPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseCompanionRecord(parsed);
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw new Error(`Failed to read companion at ${targetPath}: ${getErrorMessage(error)}`);
  }
}

export async function writeCompanionRecord(
  record: CompanionRecord,
  storageDir = defaultStorageDir(),
): Promise<void> {
  const targetPath = companionFilePath(storageDir);
  const tempPath = path.join(
    storageDir,
    `.companion.${process.pid}.${Date.now().toString(36)}.tmp`,
  );
  const payload = JSON.stringify(record, null, 2);

  await mkdir(storageDir, { recursive: true });
  await writeFile(tempPath, payload, "utf8");
  await rename(tempPath, targetPath);
}

function parseCompanionRecord(value: unknown): CompanionRecord {
  if (!isPlainObject(value)) {
    throw new Error("Companion file must contain a JSON object.");
  }

  const { userId, bones, soul, createdAt } = value;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("Companion `userId` must be a non-empty string.");
  }

  if (typeof createdAt !== "string" || createdAt.trim().length === 0) {
    throw new Error("Companion `createdAt` must be a non-empty string.");
  }

  return {
    userId,
    bones: parseCompanionBones(bones),
    soul: parseCompanionSoul(soul),
    createdAt,
  };
}

function parseCompanionBones(value: unknown): CompanionBones {
  if (!isPlainObject(value)) {
    throw new Error("Companion `bones` must be an object.");
  }

  const { userId, species, rarity, eye, hat, stats, color, shiny } = value;

  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("Companion bones `userId` must be a non-empty string.");
  }

  if (typeof species !== "string" || species.trim().length === 0) {
    throw new Error("Companion bones `species` must be a non-empty string.");
  }

  if (typeof eye !== "string" || eye.trim().length === 0) {
    throw new Error("Companion bones `eye` must be a non-empty string.");
  }

  if (typeof hat !== "string" || hat.trim().length === 0) {
    throw new Error("Companion bones `hat` must be a non-empty string.");
  }

  if (typeof shiny !== "boolean") {
    throw new Error("Companion bones `shiny` must be a boolean.");
  }

  return {
    userId,
    species,
    rarity: parseRarity(rarity),
    eye,
    hat,
    stats: parseStatBlock(stats),
    color: parseColorPalette(color),
    shiny,
  };
}

function parseCompanionSoul(value: unknown): CompanionSoul {
  if (!isPlainObject(value)) {
    throw new Error("Companion `soul` must be an object.");
  }

  const { name, tagline, personality, modelUsed } = value;
  const observerProfile = parseOptionalObserverProfile(value.observerProfile);

  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Companion soul `name` must be a non-empty string.");
  }

  if (tagline !== undefined && (typeof tagline !== "string" || tagline.trim().length === 0)) {
    throw new Error("Companion soul `tagline` must be a non-empty string when present.");
  }

  if (typeof personality !== "string" || personality.trim().length === 0) {
    throw new Error("Companion soul `personality` must be a non-empty string.");
  }

  if (typeof modelUsed !== "string" || modelUsed.trim().length === 0) {
    throw new Error("Companion soul `modelUsed` must be a non-empty string.");
  }

  return {
    name: name.trim(),
    ...(typeof tagline === "string" ? { tagline: tagline.trim() } : {}),
    personality: personality.trim(),
    observerProfile: observerProfile ?? { ...DEFAULT_OBSERVER_PROFILE },
    modelUsed: modelUsed.trim(),
  };
}

function parseRarity(value: unknown): Rarity {
  if (!isPlainObject(value)) {
    throw new Error("Companion rarity must be an object.");
  }

  const { tier, name, stars, color, weight, floor } = value;

  if (
    typeof tier !== "number" ||
    typeof name !== "string" ||
    typeof stars !== "string" ||
    typeof color !== "string" ||
    typeof weight !== "number" ||
    typeof floor !== "number"
  ) {
    throw new Error("Companion rarity is invalid.");
  }

  return { tier, name, stars, color, weight, floor };
}

function parseStatBlock(value: unknown): StatBlock {
  if (!isPlainObject(value)) {
    throw new Error("Companion stats must be an object.");
  }

  const statNames = ["GRIT", "FOCUS", "CHAOS", "WIT", "SASS"] as const;
  const stats = {} as StatBlock;

  for (const statName of statNames) {
    const statValue = value[statName];
    if (typeof statValue !== "number") {
      throw new Error(`Companion stat ${statName} must be a number.`);
    }

    stats[statName] = statValue;
  }

  return stats;
}

function parseColorPalette(value: unknown): ColorPalette {
  if (!isPlainObject(value)) {
    throw new Error("Companion color palette must be an object.");
  }

  const { primary, accent } = value;

  if (typeof primary !== "string" || typeof accent !== "string") {
    throw new Error("Companion color palette is invalid.");
  }

  return { primary, accent };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
