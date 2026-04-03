export type StatName = "GRIT" | "FOCUS" | "CHAOS" | "WIT" | "SASS";
export type BuddyProvider = "openai";
export type BuddyLanguage = "zh" | "en";
export type ObserverVoice = "quiet" | "dry" | "playful" | "deadpan";

export interface ColorPalette {
  primary: string;
  accent: string;
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  color: ColorPalette;
  frames: string[][];
}

export interface EyeDefinition {
  id: string;
  label: string;
  char: string;
}

export interface HatDefinition {
  id: string;
  label: string;
  art: string;
}

export interface Rarity {
  tier: number;
  name: string;
  stars: string;
  color: string;
  weight: number;
  floor: number;
}

export type StatBlock = Record<StatName, number>;

export interface CompanionBones {
  userId: string;
  species: string;
  rarity: Rarity;
  eye: string;
  hat: string;
  stats: StatBlock;
  color: ColorPalette;
  shiny: boolean;
}

export interface BuddyConfig {
  provider?: BuddyProvider | undefined;
  model?: string | undefined;
  observerModel?: string | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  language?: BuddyLanguage | undefined;
}

export interface ResolvedBuddyConfig {
  provider: BuddyProvider;
  model: string;
  observerModel: string | undefined;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  language: BuddyLanguage;
  storageDir: string;
}

export interface HatchReadyConfig extends ResolvedBuddyConfig {
  apiKey: string;
  model: string;
}

export interface ObserverProfile {
  voice: ObserverVoice;
  chattiness: 1 | 2 | 3 | 4 | 5;
  sharpness: 1 | 2 | 3 | 4 | 5;
  patience: 1 | 2 | 3 | 4 | 5;
}

export interface CompanionSoul {
  name: string;
  personality: string;
  observerProfile: ObserverProfile;
  modelUsed: string;
}

export interface CompanionRecord {
  userId: string;
  bones: CompanionBones;
  soul: CompanionSoul;
  createdAt: string;
}
