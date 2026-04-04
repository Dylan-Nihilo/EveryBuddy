#!/usr/bin/env node
/**
 * img2ascii — Convert an image to Ghostty-style density ASCII art.
 *
 * Usage:
 *   node tools/img2ascii.mjs <image-path> [--width 100] [--height 46] [--invert] [--threshold 240]
 *
 * The script outputs two layers (base + highlight) as JSON, ready to paste
 * into heroGlyphFrames in showcase/app.js.
 */

import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// --- Density ramp: lightest → darkest ---
// Chosen to match the Ghostty aesthetic: smooth density gradient
const RAMP = " .·:=+*x%$@#";
const RAMP_CHARS = [...RAMP];

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}

const imagePath = args.find((a) => !a.startsWith("--"));
if (!imagePath) {
  console.error("Usage: node tools/img2ascii.mjs <image-path> [--width N] [--height N] [--invert] [--threshold N]");
  process.exit(1);
}

const WIDTH = parseInt(getArg("--width", "110"), 10);
const HEIGHT = parseInt(getArg("--height", "50"), 10);
const INVERT = args.includes("--invert");
const BG_THRESHOLD = parseInt(getArg("--threshold", "220"), 10);
const OUTPUT = getArg("--output", null);

// Terminal characters are ~2x taller than wide.
// To preserve aspect ratio we sample fewer rows.
const CHAR_ASPECT = 2.0;

async function main() {
  const img = sharp(resolve(imagePath));
  const meta = await img.metadata();
  const imgAspect = meta.width / meta.height;

  // Calculate sampling dimensions preserving aspect ratio
  let cols = WIDTH;
  let rows = Math.round(cols / imgAspect / CHAR_ASPECT);
  if (rows > HEIGHT) {
    rows = HEIGHT;
    cols = Math.round(rows * imgAspect * CHAR_ASPECT);
  }

  console.error(`Image: ${meta.width}x${meta.height} → ASCII: ${cols}x${rows}`);

  // Resize and extract raw grayscale pixels
  const { data, info } = await img
    .resize(cols, rows, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build base layer
  const baseLines = [];
  const highlightLines = [];

  for (let y = 0; y < rows; y++) {
    let baseLine = "";
    let highlightLine = "";

    for (let x = 0; x < cols; x++) {
      const pixel = data[y * info.width + x];
      let brightness = pixel / 255; // 0=black, 1=white

      if (INVERT) brightness = 1 - brightness;

      // Treat near-white (background) as empty
      if (pixel > BG_THRESHOLD && !INVERT) {
        baseLine += " ";
        highlightLine += " ";
        continue;
      }
      if (INVERT && pixel < (255 - BG_THRESHOLD)) {
        baseLine += " ";
        highlightLine += " ";
        continue;
      }

      // Map brightness to density character
      // For dark-on-light source: darker pixel → denser character
      const density = 1 - brightness; // 0=light, 1=dark
      const rampIdx = Math.min(
        RAMP_CHARS.length - 1,
        Math.floor(density * RAMP_CHARS.length)
      );
      const ch = RAMP_CHARS[rampIdx];
      baseLine += ch;

      // Highlight layer: sparse edge glow effect
      // Only place highlight chars on medium-density areas (edges/transitions)
      if (density > 0.15 && density < 0.55 && (x + y) % 3 === 0) {
        highlightLine += "·";
      } else if (density > 0.7 && (x + y * 7) % 11 === 0) {
        highlightLine += "*";
      } else {
        highlightLine += " ";
      }
    }

    baseLines.push(baseLine);
    highlightLines.push(highlightLine);
  }

  // Pad all lines to the same width
  const maxLen = Math.max(...baseLines.map((l) => l.length), ...highlightLines.map((l) => l.length));
  const pad = (line) => line.padEnd(maxLen);

  const frame = {
    base: baseLines.map(pad),
    highlight: highlightLines.map(pad),
  };

  // Output as JS-ready JSON
  const output = JSON.stringify(frame, null, 2);

  if (OUTPUT) {
    writeFileSync(OUTPUT, output, "utf8");
    console.error(`Written to ${OUTPUT}`);
  } else {
    console.log(output);
  }

  // Also output a preview to stderr
  console.error("\n--- BASE LAYER PREVIEW ---");
  for (const line of baseLines) {
    console.error(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
