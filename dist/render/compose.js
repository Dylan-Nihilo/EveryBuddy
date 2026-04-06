import { HATS } from "./sprites.js";
import { colorize } from "./color.js";
export function composeFrame(frame, eyeChar, hatId, color) {
    const lines = [...frame].map((line) => line.replace(/\{E\}/g, eyeChar));
    if (hatId !== "none" && HATS[hatId] && (lines[0]?.trim().length ?? 0) === 0) {
        lines[0] = HATS[hatId].art;
    }
    return lines.map((line, index) => colorize(line, index === 0 && hatId !== "none" ? color.accent : color.primary));
}
//# sourceMappingURL=compose.js.map