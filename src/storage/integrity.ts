import { createHmac } from "node:crypto";
import os from "node:os";
import type { CompanionRecord } from "../types/companion.js";

// Embedded key — not truly secret (ships in dist/), but raises the bar
// for casual tampering. Real anti-cheat requires a server.
const HMAC_KEY = "eb:companion:v1:9f3a7c2e";

export interface SignedCompanionRecord extends CompanionRecord {
  _sig?: string | undefined;
  _env?: boolean | undefined;
}

/**
 * Compute HMAC-SHA256 signature over the deterministic fields of a companion.
 * Covers: templateId, userId, species, rarity name, eye, hat, stats, shiny.
 * Does NOT cover soul (AI-generated, may vary) or createdAt.
 */
function computeSignature(record: CompanionRecord): string {
  const payload = [
    record.templateId ?? "",
    record.userId,
    record.bones.species,
    record.bones.rarity.name,
    record.bones.eye,
    record.bones.hat,
    String(record.bones.shiny),
    record.bones.stats.GRIT,
    record.bones.stats.FOCUS,
    record.bones.stats.CHAOS,
    record.bones.stats.WIT,
    record.bones.stats.SASS,
  ].join("|");

  return createHmac("sha256", HMAC_KEY).update(payload).digest("hex").slice(0, 16);
}

/** Sign a companion record before writing to disk. */
export function signRecord(record: CompanionRecord): SignedCompanionRecord {
  const usedEnvSeed = Boolean(process.env.EVERYBUDDY_USER_ID?.trim());
  return {
    ...record,
    _sig: computeSignature(record),
    ...(usedEnvSeed ? { _env: true } : {}),
  };
}

export interface IntegrityStatus {
  valid: boolean;
  envSeeded: boolean;
  userMismatch: boolean;
}

/** Verify a companion record's integrity. */
export function verifyRecord(record: SignedCompanionRecord): IntegrityStatus {
  const sig = record._sig;
  const envSeeded = record._env === true;

  // No signature = legacy or tampered
  if (typeof sig !== "string") {
    return { valid: false, envSeeded, userMismatch: false };
  }

  const expected = computeSignature(record);
  const valid = sig === expected;

  // Check if userId matches current system username
  const currentUser = os.userInfo().username || "buddy-user";
  const userMismatch = !envSeeded && record.userId !== currentUser;

  return { valid, envSeeded, userMismatch };
}
