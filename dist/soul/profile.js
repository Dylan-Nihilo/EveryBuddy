export const OBSERVER_VOICES = ["quiet", "dry", "playful", "deadpan"];
export const DEFAULT_OBSERVER_PROFILE = {
    voice: "dry",
    chattiness: 3,
    sharpness: 3,
    patience: 3,
};
export function isObserverVoice(value) {
    return typeof value === "string" && OBSERVER_VOICES.includes(value);
}
export function parseObserverProfile(value, fallback = DEFAULT_OBSERVER_PROFILE) {
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
export function parseOptionalObserverProfile(value) {
    if (value === undefined) {
        return undefined;
    }
    return parseObserverProfile(value);
}
function parseObserverLevel(value, field) {
    if (value === 1 ||
        value === 2 ||
        value === 3 ||
        value === 4 ||
        value === 5) {
        return value;
    }
    throw new Error(`Observer profile \`${field}\` must be an integer between 1 and 5.`);
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=profile.js.map