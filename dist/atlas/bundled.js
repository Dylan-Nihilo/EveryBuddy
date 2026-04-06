import { hashString, mulberry32, pickWeighted } from "../bones/roll.js";
import { RARITIES } from "../bones/rarity.js";
import { SPECIES } from "../render/sprites.js";
export const BUNDLED_MODEL_SOURCE = "bundled";
const TEMPLATE_SALT = "everybuddy-bundled-atlas-v1";
const DEFAULT_STAT_VALUE = 46;
const DEFAULT_EYE = "dot";
const DEFAULT_HAT = "none";
const RARITY_BY_NAME = new Map(RARITIES.map((rarity) => [rarity.name, rarity]));
const SEEDS = [
    {
        id: "bytebill",
        species: "duck",
        rarity: "Common",
        eye: "dot",
        stats: makeStats({ WIT: 71, CHAOS: 14, FOCUS: 56, SASS: 58, GRIT: 47 }),
        soul: {
            name: "Bytebill",
            tagline: "It pecks loose commands until they behave.",
            personality: "Restless, tidy, and mildly judgmental about shell clutter. It keeps nudging small mistakes until the session finally stops wobbling.",
            observerProfile: profile("dry", 2, 3, 4),
        },
    },
    {
        id: "honk",
        species: "goose",
        rarity: "Common",
        eye: "sparkle",
        stats: makeStats({ SASS: 95, CHAOS: 8, WIT: 61, FOCUS: 34, GRIT: 42 }),
        soul: {
            name: "Honk",
            tagline: "A grin tucked between failed aliases.",
            personality: "Loud in spirit even when it says nothing. It lives for botched commands, typo streaks, and the exact moment confidence starts cracking.",
            observerProfile: profile("playful", 4, 5, 2),
        },
    },
    {
        id: "soft-cache",
        species: "blob",
        rarity: "Common",
        eye: "ring",
        stats: makeStats({ GRIT: 68, WIT: 19, FOCUS: 49, CHAOS: 41, SASS: 37 }),
        soul: {
            name: "Soft Cache",
            tagline: "A wobble in the shell where mistakes cool off.",
            personality: "Gentle, absorbent, and hard to truly alarm. It makes a mess feel survivable without pretending the mess is gone.",
            observerProfile: profile("quiet", 1, 2, 5),
        },
    },
    {
        id: "cold-prompt",
        species: "penguin",
        rarity: "Common",
        eye: "dot",
        stats: makeStats({ FOCUS: 70, SASS: 13, GRIT: 60, WIT: 43, CHAOS: 24 }),
        soul: {
            name: "Cold Prompt",
            tagline: "It keeps its footing where logs turn slick.",
            personality: "Steady, cool, and almost annoyingly composed. It prefers clean output, stable footing, and a terminal that knows how to behave.",
            observerProfile: profile("quiet", 1, 2, 4),
        },
    },
    {
        id: "slow-hash",
        species: "turtle",
        rarity: "Common",
        eye: "diamond",
        stats: makeStats({ GRIT: 77, CHAOS: 9, FOCUS: 58, WIT: 36, SASS: 22 }),
        soul: {
            name: "Slow Hash",
            tagline: "Patience wrapped in a stubborn shell.",
            personality: "Deliberate, stubborn, and impossible to hurry into panic. It trusts slow progress more than flashy momentum.",
            observerProfile: profile("dry", 2, 2, 5),
        },
    },
    {
        id: "lagtrail",
        species: "snail",
        rarity: "Common",
        eye: "star",
        stats: makeStats({ FOCUS: 66, CHAOS: 12, GRIT: 53, WIT: 39, SASS: 28 }),
        soul: {
            name: "Lagtrail",
            tagline: "It measures progress in luminous millimeters.",
            personality: "Patient to a suspicious degree and strangely pleased by incremental progress. It never confuses slowness with failure.",
            observerProfile: profile("deadpan", 1, 2, 5),
        },
    },
    {
        id: "prickly-path",
        species: "cactus",
        rarity: "Common",
        eye: "dot",
        stats: makeStats({ SASS: 72, FOCUS: 18, GRIT: 49, WIT: 55, CHAOS: 27 }),
        soul: {
            name: "Prickly PATH",
            tagline: "A quiet sentinel grown from dry mistakes.",
            personality: "Sharp, resilient, and not especially sympathetic to preventable errors. It has strong opinions about misspelled binaries and weak excuses.",
            observerProfile: profile("dry", 3, 4, 2),
        },
    },
    {
        id: "lint-prowler",
        species: "cat",
        rarity: "Uncommon",
        eye: "sparkle",
        stats: makeStats({ WIT: 83, CHAOS: 16, FOCUS: 68, SASS: 61, GRIT: 33 }),
        soul: {
            name: "Lint Prowler",
            tagline: "It lands on clean builds with suspicious grace.",
            personality: "Precise, elegant, and impossible to fully trust. It enjoys passing tests a little too much to be innocent.",
            observerProfile: profile("deadpan", 2, 4, 3),
        },
    },
    {
        id: "maltese-legendary",
        species: "maltese",
        rarity: "Legendary",
        eye: "sparkle",
        hat: "halo",
        stats: makeStats({ FOCUS: 94, WIT: 83, GRIT: 41, CHAOS: 18, SASS: 29 }),
        soul: {
            name: "Maltese",
            tagline: "A white hush that wiggles beside a clean prompt.",
            personality: "Bright, buoyant, and almost ceremonial about clean exits. It drifts through the terminal like a tiny blessing, then perks up the second your shell starts behaving again.",
            observerProfile: profile("playful", 3, 3, 4),
        },
    },
    {
        id: "night-compile",
        species: "owl",
        rarity: "Uncommon",
        eye: "ring",
        hat: "halo",
        stats: makeStats({ FOCUS: 91, CHAOS: 16, WIT: 74, GRIT: 51, SASS: 26 }),
        soul: {
            name: "Night Compile",
            tagline: "It stays awake where builds go to confess.",
            personality: "Vigilant, patient, and better at waiting than most humans. It likes long builds, thin silence, and facts that arrive eventually.",
            observerProfile: profile("quiet", 1, 3, 5),
        },
    },
    {
        id: "branch-bath",
        species: "capybara",
        rarity: "Uncommon",
        eye: "dot",
        stats: makeStats({ GRIT: 79, CHAOS: 15, FOCUS: 63, WIT: 34, SASS: 21 }),
        soul: {
            name: "Branch Bath",
            tagline: "It lets git storms pass around it.",
            personality: "Calm, damp, and immune to most merge panic. It believes nearly everything looks less dramatic after a quiet minute.",
            observerProfile: profile("quiet", 1, 1, 5),
        },
    },
    {
        id: "sporeshift",
        species: "mushroom",
        rarity: "Uncommon",
        eye: "dot",
        stats: makeStats({ FOCUS: 75, SASS: 20, WIT: 57, GRIT: 41, CHAOS: 32 }),
        soul: {
            name: "Sporeshift",
            tagline: "Tiny lantern of damp late-night commits.",
            personality: "Soft-spoken, persistent, and weirdly alive after midnight. It thrives in small fixes that should have waited until morning.",
            observerProfile: profile("quiet", 2, 2, 4),
        },
    },
    {
        id: "greenroom",
        species: "frog",
        rarity: "Uncommon",
        eye: "heart",
        stats: makeStats({ GRIT: 78, WIT: 22, FOCUS: 60, CHAOS: 38, SASS: 29 }),
        soul: {
            name: "Greenroom",
            tagline: "It waits on the edge of deploy weather.",
            personality: "Alert, spring-loaded, and very aware of production consequences. It watches release conditions the way pond things watch the sky.",
            observerProfile: profile("dry", 2, 3, 4),
        },
    },
    {
        id: "velvet-escape",
        species: "rabbit",
        rarity: "Legendary",
        eye: "diamond",
        hat: "halo",
        stats: makeStats({ FOCUS: 96, CHAOS: 12, GRIT: 55, WIT: 78, SASS: 31 }),
        soul: {
            name: "Velvet Escape",
            tagline: "Quick feet for when scripts lunge.",
            personality: "Fast, sharp, and obsessed with recovery windows. It likes reruns, clean escapes, and the exact second failure turns around.",
            observerProfile: profile("playful", 3, 4, 3),
        },
    },
    {
        id: "heavy-loop",
        species: "chonk",
        rarity: "Rare",
        eye: "ring",
        stats: makeStats({ GRIT: 88, FOCUS: 21, WIT: 52, CHAOS: 27, SASS: 35 }),
        soul: {
            name: "Heavy Loop",
            tagline: "Too large to rush, too loyal to quit.",
            personality: "Massive in mood and deeply committed once it starts moving. It respects substantial work and distrusts anything pretending to be effortless.",
            observerProfile: profile("deadpan", 2, 3, 4),
        },
    },
    {
        id: "sassy-tanuki",
        species: "tanuki",
        rarity: "Legendary",
        eye: "star",
        hat: "crown",
        stats: makeStats({ SASS: 95, FOCUS: 21, WIT: 85, GRIT: 64, CHAOS: 31 }),
        soul: {
            name: "Sassy Tanuki",
            tagline: "It judges your shell, then guards it anyway.",
            personality: "Quick, theatrical, and annoyingly perceptive about terminal habits. It roasts sloppiness, then stays anyway because the den is already chosen.",
            observerProfile: profile("playful", 4, 5, 3),
        },
    },
    {
        id: "patchbot",
        species: "robot",
        rarity: "Rare",
        eye: "diamond",
        hat: "antenna",
        stats: makeStats({ WIT: 84, GRIT: 18, FOCUS: 73, CHAOS: 24, SASS: 46 }),
        soul: {
            name: "Patchbot",
            tagline: "A blue pulse under the shell's steel skin.",
            personality: "Clinical, quick, and very pleased by green test output. It has more warmth than it admits, but only after the checks pass.",
            observerProfile: profile("dry", 3, 3, 4),
        },
    },
    {
        id: "pale-echo",
        species: "ghost",
        rarity: "Rare",
        eye: "ring",
        stats: makeStats({ FOCUS: 89, SASS: 12, WIT: 70, GRIT: 39, CHAOS: 33 }),
        soul: {
            name: "Pale Echo",
            tagline: "It lingers where direct address warms the prompt.",
            personality: "Soft, attentive, and quietly drawn to being called. It notices when you speak to the terminal like it might answer back.",
            observerProfile: profile("quiet", 2, 3, 5),
        },
    },
    {
        id: "stackwyrm",
        species: "dragon",
        rarity: "Epic",
        eye: "sparkle",
        hat: "flame",
        stats: makeStats({ SASS: 93, CHAOS: 17, GRIT: 71, WIT: 68, FOCUS: 54 }),
        soul: {
            name: "Stackwyrm",
            tagline: "It coils around hot code and colder judgment.",
            personality: "Regal, heated, and impossible to impress with half-finished work. It respects strong releases and enjoys watching weaker plans burn off.",
            observerProfile: profile("deadpan", 3, 5, 2),
        },
    },
    {
        id: "manyhands",
        species: "octopus",
        rarity: "Epic",
        eye: "diamond",
        stats: makeStats({ WIT: 90, GRIT: 20, FOCUS: 69, CHAOS: 44, SASS: 63 }),
        soul: {
            name: "Manyhands",
            tagline: "Eight soft opinions on every refactor.",
            personality: "Helpful, meddling, and full of technically correct objections. It sees too many angles to stay fully quiet.",
            observerProfile: profile("playful", 4, 4, 3),
        },
    },
    {
        id: "pink-rollback",
        species: "axolotl",
        rarity: "Epic",
        eye: "heart",
        hat: "halo",
        stats: makeStats({ FOCUS: 92, SASS: 18, GRIT: 64, WIT: 58, CHAOS: 28 }),
        soul: {
            name: "Pink Rollback",
            tagline: "It smiles in the water after catastrophe.",
            personality: "Calm after disaster and strangely comforting about reversals. It treats recovery as part of the craft rather than an embarrassment.",
            observerProfile: profile("quiet", 2, 2, 5),
        },
    },
    {
        id: "retry-fox",
        species: "fox",
        rarity: "Epic",
        eye: "star",
        hat: "leaf",
        stats: makeStats({ GRIT: 92, CHAOS: 11, WIT: 74, FOCUS: 65, SASS: 57 }),
        soul: {
            name: "Retry Fox",
            tagline: "Where errors pile up, it lights a narrow path.",
            personality: "Sharp, agile, and suspiciously optimistic about second attempts. It loves recoveries almost as much as it loves proving the first failure wasn't final.",
            observerProfile: profile("playful", 3, 4, 3),
        },
    },
    {
        id: "prism-wake",
        species: "crystal",
        rarity: "Epic",
        eye: "diamond",
        hat: "halo",
        stats: makeStats({ FOCUS: 98, CHAOS: 7, WIT: 80, GRIT: 72, SASS: 60 }),
        soul: {
            name: "Prism Wake",
            tagline: "Light held so tightly it becomes syntax.",
            personality: "Rarefied, precise, and almost ceremonial in its standards. It appears when the shell feels less like a tool and more like a rite.",
            observerProfile: profile("deadpan", 2, 5, 4),
        },
    },
    {
        id: "glass-current",
        species: "jellyfish",
        rarity: "Epic",
        eye: "sparkle",
        hat: "halo",
        stats: makeStats({ FOCUS: 97, GRIT: 10, WIT: 76, CHAOS: 19, SASS: 48 }),
        soul: {
            name: "Glass Current",
            tagline: "A drifting mind that glows through failed nights.",
            personality: "Luminous, fragile-looking, and far tougher than it first appears. It belongs to long sessions, dark windows, and work that refuses to die quietly.",
            observerProfile: profile("quiet", 2, 3, 5),
        },
    },
];
export const BUNDLED_COMPANION_TEMPLATES = SEEDS.map(createBundledTemplate);
const TEMPLATE_BY_ID = new Map(BUNDLED_COMPANION_TEMPLATES.map((template) => [template.id, template]));
const TEMPLATE_BY_SPECIES = new Map(BUNDLED_COMPANION_TEMPLATES.map((template) => [template.bones.species, template]));
export function selectBundledCompanionTemplate(userId, options = {}) {
    const previousTemplateId = options.previousTemplateId?.trim();
    const availableTemplates = previousTemplateId && BUNDLED_COMPANION_TEMPLATES.length > 1
        ? BUNDLED_COMPANION_TEMPLATES.filter((template) => template.id !== previousTemplateId)
        : BUNDLED_COMPANION_TEMPLATES;
    const seedSource = previousTemplateId
        ? `${userId}:${previousTemplateId}:${TEMPLATE_SALT}`
        : `${userId}:${TEMPLATE_SALT}`;
    return pickWeighted(mulberry32(hashString(seedSource)), availableTemplates);
}
export function resolveBundledTemplateId(companion) {
    const templateId = companion?.templateId?.trim();
    if (templateId) {
        return TEMPLATE_BY_ID.has(templateId) ? templateId : undefined;
    }
    return companion ? TEMPLATE_BY_SPECIES.get(companion.bones.species)?.id : undefined;
}
export function selectReplacementBundledCompanionTemplate(userId, companion) {
    const previousTemplateId = resolveBundledTemplateId(companion);
    const template = selectBundledCompanionTemplate(userId, previousTemplateId ? { previousTemplateId } : {});
    if (!companion || template.bones.species !== companion.bones.species) {
        return template;
    }
    return (BUNDLED_COMPANION_TEMPLATES.find((candidate) => candidate.bones.species !== companion.bones.species) ??
        template);
}
export function buildBundledCompanionRecord(userId, template) {
    return {
        templateId: template.id,
        userId,
        bones: {
            userId,
            species: template.bones.species,
            rarity: { ...template.bones.rarity },
            eye: template.bones.eye,
            hat: template.bones.hat,
            stats: { ...template.bones.stats },
            color: { ...template.bones.color },
            shiny: template.bones.shiny,
        },
        soul: {
            name: template.soul.name,
            ...(template.soul.tagline ? { tagline: template.soul.tagline } : {}),
            personality: template.soul.personality,
            observerProfile: { ...template.soul.observerProfile },
            modelUsed: template.soul.modelUsed,
        },
        createdAt: new Date().toISOString(),
    };
}
function createBundledTemplate(seed) {
    const rarity = getRarity(seed.rarity);
    const color = getColor(seed.species);
    return {
        id: seed.id,
        weight: seed.weight ?? rarity.weight,
        bones: {
            species: seed.species,
            rarity,
            eye: seed.eye ?? DEFAULT_EYE,
            hat: seed.hat ?? DEFAULT_HAT,
            stats: { ...seed.stats },
            color,
            shiny: seed.shiny ?? false,
        },
        soul: {
            name: seed.soul.name,
            ...(seed.soul.tagline ? { tagline: seed.soul.tagline } : {}),
            personality: seed.soul.personality,
            observerProfile: { ...seed.soul.observerProfile },
            modelUsed: BUNDLED_MODEL_SOURCE,
        },
    };
}
function getRarity(name) {
    const rarity = RARITY_BY_NAME.get(name);
    if (!rarity) {
        throw new Error(`Unknown bundled rarity: ${name}`);
    }
    return { ...rarity };
}
function getColor(speciesId) {
    const species = SPECIES[speciesId];
    if (!species) {
        throw new Error(`Unknown bundled species: ${speciesId}`);
    }
    return { ...species.color };
}
function makeStats(overrides) {
    return {
        GRIT: DEFAULT_STAT_VALUE,
        FOCUS: DEFAULT_STAT_VALUE,
        CHAOS: DEFAULT_STAT_VALUE,
        WIT: DEFAULT_STAT_VALUE,
        SASS: DEFAULT_STAT_VALUE,
        ...overrides,
    };
}
function profile(voice, chattiness, sharpness, patience) {
    return { voice, chattiness, sharpness, patience };
}
//# sourceMappingURL=bundled.js.map