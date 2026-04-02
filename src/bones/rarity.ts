import type { Rarity } from "../types/companion.js";

export const RARITIES: Rarity[] = [
  {
    tier: 0,
    name: "Common",
    stars: "*",
    color: "#8B8B8B",
    weight: 60,
    floor: 5,
  },
  {
    tier: 1,
    name: "Uncommon",
    stars: "**",
    color: "#4ADE80",
    weight: 25,
    floor: 15,
  },
  {
    tier: 2,
    name: "Rare",
    stars: "***",
    color: "#60A5FA",
    weight: 10,
    floor: 25,
  },
  {
    tier: 3,
    name: "Epic",
    stars: "****",
    color: "#C084FC",
    weight: 4,
    floor: 35,
  },
  {
    tier: 4,
    name: "Legendary",
    stars: "*****",
    color: "#FBBF24",
    weight: 1,
    floor: 50,
  },
];
