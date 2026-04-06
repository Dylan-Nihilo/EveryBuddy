import { renderCompanionCard, getSpriteFrameCount, getCardLineCount } from "./card.js";
import { colorize, bold, dim, rainbow } from "./color.js";
import { composeFrame } from "./compose.js";
import { SPECIES, EYES } from "./sprites.js";
const CANVAS_WIDTH = 44;
const CANVAS_HEIGHT = 12;
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\x1b[2K";
const MOVE_UP = (n) => `\x1b[${n}A`;
function getPhaseTimings(tier) {
    const timings = [
        { charge: 800, summon: 500, hold: 300, flash: 250, silhouette: 400, reveal: 500 }, // Common
        { charge: 1000, summon: 600, hold: 400, flash: 350, silhouette: 400, reveal: 500 }, // Uncommon
        { charge: 1200, summon: 800, hold: 500, flash: 450, silhouette: 450, reveal: 500 }, // Rare
        { charge: 1400, summon: 1000, hold: 600, flash: 600, silhouette: 450, reveal: 600 }, // Epic
        { charge: 1800, summon: 1200, hold: 800, flash: 800, silhouette: 500, reveal: 700 }, // Legendary
    ];
    return timings[Math.min(tier, timings.length - 1)];
}
const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
// --- Canvas management ---
function drawCanvas(io, lines) {
    const padded = padCanvasLines(lines);
    for (const line of padded) {
        io.writeLine(line);
    }
}
function redrawCanvas(io, lines) {
    const padded = padCanvasLines(lines);
    io.write(MOVE_UP(CANVAS_HEIGHT));
    for (const line of padded) {
        io.write(`${CLEAR_LINE}${line}\n`);
    }
}
function padCanvasLines(lines) {
    const result = [];
    for (let i = 0; i < CANVAS_HEIGHT; i++) {
        result.push(lines[i] ?? "");
    }
    return result;
}
function centerLine(text, width) {
    const stripped = text.replace(/\u001B\[[0-9;]*m/g, "");
    const visible = Array.from(stripped).length;
    const pad = Math.max(0, Math.floor((width - visible) / 2));
    return " ".repeat(pad) + text;
}
// --- Phase 1: Summon (particle convergence) ---
function renderParticleFrames(tier) {
    const chars = [".", "·", "*", "✦", "★"];
    const particle = chars[Math.min(tier, chars.length - 1)];
    const frameCount = tier <= 0 ? 2 : tier <= 2 ? 3 : 5;
    const frames = [];
    for (let step = 0; step < frameCount; step++) {
        const progress = step / Math.max(1, frameCount - 1);
        const spread = Math.round((1 - progress) * (CANVAS_WIDTH / 2 - 2));
        const lines = [];
        for (let row = 0; row < CANVAS_HEIGHT; row++) {
            const distFromCenter = Math.abs(row - Math.floor(CANVAS_HEIGHT / 2));
            if (distFromCenter > Math.round((1 - progress) * (CANVAS_HEIGHT / 2))) {
                lines.push("");
                continue;
            }
            const chars = new Array(CANVAS_WIDTH).fill(" ");
            const center = Math.floor(CANVAS_WIDTH / 2);
            // Place particles symmetrically converging toward center
            const offset = Math.max(0, spread - distFromCenter * 2);
            if (offset > 0 && center - offset >= 0)
                chars[center - offset] = particle;
            if (offset > 0 && center + offset < CANVAS_WIDTH)
                chars[center + offset] = particle;
            if (progress > 0.5)
                chars[center] = particle;
            const line = chars.join("");
            lines.push(tier >= 4 ? colorize(line, "#FBBF24") : tier >= 3 ? colorize(line, "#C084FC") : dim(line));
        }
        frames.push(lines);
    }
    return frames;
}
// --- Phase 2: Rarity flash ---
function renderRarityFlash(bones) {
    const { rarity } = bones;
    const tier = rarity.tier;
    const color = rarity.color;
    const starsText = `${rarity.stars}`;
    const frames = [];
    // Flash frame
    const flashLines = [];
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        const center = Math.floor(CANVAS_HEIGHT / 2);
        const dist = Math.abs(row - center);
        if (tier <= 0) {
            // Common: only center line
            flashLines.push(row === center ? colorize(centerLine(starsText, CANVAS_WIDTH), color) : "");
        }
        else if (tier <= 1) {
            // Uncommon: two lines
            flashLines.push(dist <= 1 ? colorize(centerLine(dist === 0 ? starsText : "·  ·  ·", CANVAS_WIDTH), color) : "");
        }
        else {
            // Rare+: full canvas colored
            const fill = row === center ? starsText : "─".repeat(CANVAS_WIDTH);
            flashLines.push(colorize(centerLine(row === center ? fill : fill, CANVAS_WIDTH), color));
        }
    }
    frames.push(flashLines);
    // Epic: add shake frames
    if (tier >= 3) {
        const shakeLeft = flashLines.map((line) => ` ${line}`);
        const shakeRight = flashLines.map((line) => line.startsWith(" ") ? line.slice(1) : line);
        frames.push(shakeLeft, shakeRight);
    }
    // Legendary: rainbow stars frame
    if (tier >= 4) {
        const rainbowLines = [];
        for (let row = 0; row < CANVAS_HEIGHT; row++) {
            const center = Math.floor(CANVAS_HEIGHT / 2);
            if (row === center) {
                rainbowLines.push(centerLine(rainbow(`★  ${starsText}  ★`), CANVAS_WIDTH));
            }
            else if (row === center - 1 || row === center + 1) {
                rainbowLines.push(centerLine(rainbow("✦  ·  ✦  ·  ✦"), CANVAS_WIDTH));
            }
            else {
                rainbowLines.push(colorize(centerLine("·", CANVAS_WIDTH), color));
            }
        }
        frames.push(rainbowLines);
    }
    return frames;
}
// --- Phase 3: Silhouette ---
function renderSilhouette(bones) {
    const species = SPECIES[bones.species];
    const eye = EYES[bones.eye];
    if (!species?.frames[0] || !eye)
        return emptyCanvas();
    // Compose with real eye but render all as dim
    const frame = species.frames[0];
    const raw = frame.map((line) => line.replace(/\{E\}/g, "?"));
    const silhouetteLines = [];
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        const spriteStart = Math.floor((CANVAS_HEIGHT - raw.length) / 2);
        const spriteRow = row - spriteStart;
        if (spriteRow >= 0 && spriteRow < raw.length) {
            silhouetteLines.push(centerLine(dim(raw[spriteRow]), CANVAS_WIDTH));
        }
        else {
            silhouetteLines.push("");
        }
    }
    return silhouetteLines;
}
// --- Phase 4: Full reveal ---
function renderRevealSprite(bones) {
    const species = SPECIES[bones.species];
    const eye = EYES[bones.eye];
    if (!species?.frames[0] || !eye)
        return emptyCanvas();
    const sprite = composeFrame(species.frames[0], eye.char, bones.hat, bones.color);
    const lines = [];
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        const spriteStart = Math.floor((CANVAS_HEIGHT - sprite.length) / 2) - 1;
        const spriteRow = row - spriteStart;
        if (spriteRow >= 0 && spriteRow < sprite.length) {
            lines.push(centerLine(sprite[spriteRow], CANVAS_WIDTH));
        }
        else {
            lines.push("");
        }
    }
    return lines;
}
function renderRevealWithName(bones, soul, nameProgress) {
    const species = SPECIES[bones.species];
    const eye = EYES[bones.eye];
    if (!species?.frames[0] || !eye)
        return emptyCanvas();
    const sprite = composeFrame(species.frames[0], eye.char, bones.hat, bones.color);
    const lines = [];
    const nameChars = Math.round(soul.name.length * nameProgress);
    const partialName = soul.name.slice(0, nameChars);
    const rarityText = `◆ ${bones.rarity.stars}`;
    const rarityLine = bones.rarity.tier >= 4 ? rainbow(rarityText) : colorize(rarityText, bones.rarity.color);
    for (let row = 0; row < CANVAS_HEIGHT; row++) {
        const spriteStart = Math.floor((CANVAS_HEIGHT - sprite.length - 3) / 2);
        const spriteRow = row - spriteStart;
        const nameRow = spriteStart + sprite.length + 1;
        const rarityRow = nameRow + 1;
        if (spriteRow >= 0 && spriteRow < sprite.length) {
            lines.push(centerLine(sprite[spriteRow], CANVAS_WIDTH));
        }
        else if (row === nameRow && nameProgress > 0) {
            lines.push(centerLine(bold(partialName), CANVAS_WIDTH));
        }
        else if (row === rarityRow && nameProgress >= 1) {
            lines.push(centerLine(rarityLine, CANVAS_WIDTH));
        }
        else {
            lines.push("");
        }
    }
    return lines;
}
function emptyCanvas() {
    return new Array(CANVAS_HEIGHT).fill("");
}
// --- Main animation ---
export async function playGachaAnimation(options) {
    const { record, language, io, sleep } = options;
    const { bones, soul } = record;
    if (!io.supportsAnsi) {
        // Non-TTY fallback: just print the card
        io.writeLine(renderCompanionCard(record, { language }));
        return;
    }
    const timings = getPhaseTimings(bones.rarity.tier);
    io.write(HIDE_CURSOR);
    try {
        // Phase 0: Charge — spinner builds anticipation
        const chargeLabel = language === "zh" ? "正在召唤" : "Summoning";
        const chargeFrameCount = Math.round(timings.charge / 80);
        const chargeCanvas = emptyCanvas();
        const centerRow = Math.floor(CANVAS_HEIGHT / 2);
        chargeCanvas[centerRow] = centerLine(dim(`${SPINNER_CHARS[0]} ${chargeLabel}...`), CANVAS_WIDTH);
        drawCanvas(io, chargeCanvas);
        for (let i = 1; i < chargeFrameCount; i++) {
            await sleep(80);
            const spinner = SPINNER_CHARS[i % SPINNER_CHARS.length];
            // Intensify text as charge progresses
            const progress = i / chargeFrameCount;
            const dots = progress < 0.33 ? "." : progress < 0.66 ? ".." : "...";
            const label = `${spinner} ${chargeLabel}${dots}`;
            const frame = emptyCanvas();
            frame[centerRow] = centerLine(progress > 0.7 ? colorize(label, bones.rarity.color) : dim(label), CANVAS_WIDTH);
            // Add peripheral particles in later phase of charge
            if (progress > 0.5) {
                const sparkle = progress > 0.8 ? "✦" : "·";
                frame[centerRow - 2] = centerLine(dim(sparkle), CANVAS_WIDTH);
                frame[centerRow + 2] = centerLine(dim(sparkle), CANVAS_WIDTH);
            }
            redrawCanvas(io, frame);
        }
        // Phase 1: Summon particles converge
        const particleFrames = renderParticleFrames(bones.rarity.tier);
        const summonPerFrame = Math.round(timings.summon / particleFrames.length);
        redrawCanvas(io, particleFrames[0]);
        for (let i = 1; i < particleFrames.length; i++) {
            await sleep(summonPerFrame);
            redrawCanvas(io, particleFrames[i]);
        }
        // Hold — particles freeze at center, tension before the flash
        await sleep(timings.hold);
        // Phase 2: Rarity flash
        const flashFrames = renderRarityFlash(bones);
        const flashPerFrame = Math.round(timings.flash / flashFrames.length);
        for (const frame of flashFrames) {
            await sleep(flashPerFrame);
            redrawCanvas(io, frame);
        }
        // Phase 3: Silhouette
        await sleep(100);
        const silhouette = renderSilhouette(bones);
        redrawCanvas(io, silhouette);
        await sleep(timings.silhouette);
        // Phase 4: Full reveal with typewriter name
        const revealSprite = renderRevealSprite(bones);
        redrawCanvas(io, revealSprite);
        await sleep(150);
        // Typewriter name effect
        const nameSteps = Math.max(3, Math.min(soul.name.length, 8));
        const typeDelay = Math.round((timings.reveal - 150) / nameSteps);
        for (let step = 1; step <= nameSteps; step++) {
            const progress = step / nameSteps;
            redrawCanvas(io, renderRevealWithName(bones, soul, progress));
            await sleep(typeDelay);
        }
        // Brief hold on complete reveal
        await sleep(300);
        // Phase 5: Clear gacha canvas completely
        io.write(MOVE_UP(CANVAS_HEIGHT));
        for (let i = 0; i < CANVAS_HEIGHT; i++) {
            io.write(`${CLEAR_LINE}\n`);
        }
        io.write(MOVE_UP(CANVAS_HEIGHT));
        // Render first card to measure its height
        const firstCard = renderCompanionCard(record, { language, spriteFrameIndex: 0 });
        const cardLines = getCardLineCount(firstCard);
        // If the card is taller than the canvas, scroll down to make room
        // by printing blank lines, then move back up
        if (cardLines > CANVAS_HEIGHT) {
            const extra = cardLines - CANVAS_HEIGHT;
            for (let i = 0; i < extra; i++) {
                io.write("\n");
            }
            io.write(MOVE_UP(extra));
        }
        // Animate card with cycling sprite frames
        const frameCount = getSpriteFrameCount(record);
        const animCycles = 6;
        const animDelay = 300;
        // Write first frame
        for (const line of firstCard.split("\n")) {
            io.write(`${CLEAR_LINE}${line}\n`);
        }
        for (let i = 1; i < animCycles * frameCount; i++) {
            await sleep(animDelay);
            const card = renderCompanionCard(record, { language, spriteFrameIndex: i });
            io.write(MOVE_UP(cardLines));
            for (const line of card.split("\n")) {
                io.write(`${CLEAR_LINE}${line}\n`);
            }
        }
    }
    finally {
        io.write(SHOW_CURSOR);
    }
    // No need to reprint — the last animated frame IS the final card in terminal history
}
//# sourceMappingURL=gacha.js.map