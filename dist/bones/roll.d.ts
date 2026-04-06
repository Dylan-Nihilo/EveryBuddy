import { type RNG } from "./stats.js";
import type { CompanionBones } from "../types/companion.js";
export declare function rollCompanion(userId: string): CompanionBones;
export declare function defaultUserId(): string;
export declare function mulberry32(seed: number): RNG;
export declare function hashString(value: string): number;
export declare function pickRandom<T>(rng: RNG, values: T[]): T;
export declare function pickWeighted<T extends {
    weight: number;
}>(rng: RNG, values: T[]): T;
