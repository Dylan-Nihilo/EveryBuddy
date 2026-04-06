import type { StatBlock, StatName } from "../types/companion.js";
export declare const STATS: StatName[];
export type RNG = () => number;
export declare function generateStats(rng: RNG, floor: number): StatBlock;
export declare function getPeakStat(stats: StatBlock): [StatName, number];
export declare function getDumpStat(stats: StatBlock): [StatName, number];
