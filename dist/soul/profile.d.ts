import type { ObserverProfile, ObserverVoice } from "../types/companion.js";
export declare const OBSERVER_VOICES: readonly ["quiet", "dry", "playful", "deadpan"];
export declare const DEFAULT_OBSERVER_PROFILE: ObserverProfile;
export declare function isObserverVoice(value: unknown): value is ObserverVoice;
export declare function parseObserverProfile(value: unknown, fallback?: ObserverProfile): ObserverProfile;
export declare function parseOptionalObserverProfile(value: unknown): ObserverProfile | undefined;
