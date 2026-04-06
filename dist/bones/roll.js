import os from "node:os";
import { RARITIES } from "./rarity.js";
import { SPECIES_POOL } from "./species.js";
import { generateStats } from "./stats.js";
import { EYES, HATS, SPECIES } from "../render/sprites.js";
const SALT = "terminal-buddy-2026";
export function rollCompanion(userId) {
    const seed = hashString(`${userId}:${SALT}`);
    const rng = mulberry32(seed);
    const speciesId = pickRandom(rng, SPECIES_POOL);
    const rarity = pickWeighted(rng, RARITIES);
    const eyeId = pickRandom(rng, Object.keys(EYES));
    const hatPool = Object.keys(HATS).filter((hatId) => hatId !== "none");
    const hatId = rarity.tier > 0 ? pickRandom(rng, hatPool) : "none";
    const stats = generateStats(rng, rarity.floor);
    const shiny = rng() < 0.01;
    const species = SPECIES[speciesId];
    if (!species) {
        throw new Error(`Unknown species generated: ${speciesId}`);
    }
    return {
        userId,
        species: speciesId,
        rarity,
        eye: eyeId,
        hat: hatId,
        stats,
        color: { ...species.color },
        shiny,
    };
}
export function defaultUserId() {
    return process.env.EVERYBUDDY_USER_ID?.trim() || os.userInfo().username || "buddy-user";
}
export function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (Math.imul(31, hash) + value.charCodeAt(index)) | 0;
    }
    return hash;
}
export function pickRandom(rng, values) {
    if (values.length === 0) {
        throw new Error("Cannot pick from an empty collection.");
    }
    return values[Math.floor(rng() * values.length)];
}
export function pickWeighted(rng, values) {
    if (values.length === 0) {
        throw new Error("Cannot pick from an empty weighted collection.");
    }
    const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
    let roll = rng() * totalWeight;
    for (const value of values) {
        roll -= value.weight;
        if (roll < 0) {
            return value;
        }
    }
    return values[values.length - 1];
}
//# sourceMappingURL=roll.js.map