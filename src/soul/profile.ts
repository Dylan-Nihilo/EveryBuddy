import type { ObserverProfile, ObserverVoice } from "../types/companion.js";

export const OBSERVER_VOICES = ["quiet", "dry", "playful", "deadpan"] as const satisfies readonly ObserverVoice[];

export const DEFAULT_OBSERVER_PROFILE: ObserverProfile = {
  voice: "dry",
  chattiness: 3,
  sharpness: 3,
  patience: 3,
};

export function isObserverVoice(value: unknown): value is ObserverVoice {
  return typeof value === "string" && OBSERVER_VOICES.includes(value as ObserverVoice);
}

export function parseObserverProfile(
  value: unknown,
  fallback: ObserverProfile = DEFAULT_OBSERVER_PROFILE,
): ObserverProfile {
  if (!isPlainObject(value)) {
    return { ...fallback };
  }

  const voice = value.voice;
  const chattiness = parseObserverLevel(value.chattiness, "chattiness");
  const sharpness = parseObserverLevel(value.sharpness, "sharpness");
  const patience = parseObserverLevel(value.patience, "patience");

  if (!isObserverVoice(voice)) {
    throw new Error("Observer profile `voice` is invalid.");
  }

  return {
    voice,
    chattiness,
    sharpness,
    patience,
  };
}

export function parseOptionalObserverProfile(value: unknown): ObserverProfile | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseObserverProfile(value);
}

function parseObserverLevel(
  value: unknown,
  field: "chattiness" | "sharpness" | "patience",
): 1 | 2 | 3 | 4 | 5 {
  if (
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5
  ) {
    return value;
  }

  throw new Error(`Observer profile \`${field}\` must be an integer between 1 and 5.`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
