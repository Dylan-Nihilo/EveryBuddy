import type { StatBlock, StatName } from "../types/companion.js";

export const STATS: StatName[] = ["GRIT", "FOCUS", "CHAOS", "WIT", "SASS"];

export type RNG = () => number;

export function generateStats(rng: RNG, floor: number): StatBlock {
  const stats = {} as StatBlock;
  const peakIndex = Math.floor(rng() * STATS.length);
  const dumpOffset = 1 + Math.floor(rng() * (STATS.length - 1));
  const dumpIndex = (peakIndex + dumpOffset) % STATS.length;

  STATS.forEach((statName, index) => {
    if (index === peakIndex) {
      stats[statName] = randomRange(rng, floor + 30, 100);
      return;
    }

    if (index === dumpIndex) {
      stats[statName] = randomRange(rng, 0, Math.max(floor, 20));
      return;
    }

    stats[statName] = randomRange(rng, floor, 80);
  });

  return stats;
}

export function getPeakStat(stats: StatBlock): [StatName, number] {
  const firstStat = STATS[0];
  if (!firstStat) {
    throw new Error("Stats table is empty.");
  }

  let peakStat = firstStat;
  let peakValue = stats[firstStat];

  for (const statName of STATS.slice(1)) {
    if (stats[statName] > peakValue) {
      peakStat = statName;
      peakValue = stats[statName];
    }
  }

  return [peakStat, peakValue];
}

export function getDumpStat(stats: StatBlock): [StatName, number] {
  const firstStat = STATS[0];
  if (!firstStat) {
    throw new Error("Stats table is empty.");
  }

  let dumpStat = firstStat;
  let dumpValue = stats[firstStat];

  for (const statName of STATS.slice(1)) {
    if (stats[statName] < dumpValue) {
      dumpStat = statName;
      dumpValue = stats[statName];
    }
  }

  return [dumpStat, dumpValue];
}

function randomRange(rng: RNG, min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(rng() * (high - low + 1)) + low;
}
