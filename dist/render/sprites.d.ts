import type { EyeDefinition, HatDefinition, SpeciesDefinition } from "../types/companion.js";
export declare const SPECIES: Record<string, SpeciesDefinition>;
export declare const EYES: Record<string, EyeDefinition>;
export declare const HATS: Record<string, HatDefinition>;
export declare function renderCompactFace(speciesId: string, eyeChar: string): string;
