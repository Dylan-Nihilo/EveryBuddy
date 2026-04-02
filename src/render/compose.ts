import { HATS } from "./sprites.js";
import { colorize } from "./color.js";
import type { ColorPalette } from "../types/companion.js";

export function composeFrame(
  frame: string[],
  eyeChar: string,
  hatId: string,
  color: ColorPalette,
): string[] {
  const lines = [...frame].map((line) => line.replace(/\{E\}/g, eyeChar));

  if (hatId !== "none" && HATS[hatId] && (lines[0]?.trim().length ?? 0) === 0) {
    lines[0] = HATS[hatId].art;
  }

  return lines.map((line, index) =>
    colorize(line, index === 0 && hatId !== "none" ? color.accent : color.primary),
  );
}
