const RESET = "\u001B[0m";
export function colorize(text, hex) {
    if (!process.stdout.isTTY) {
        return text;
    }
    const [red, green, blue] = hexToRgb(hex);
    return `\u001B[38;2;${red};${green};${blue}m${text}${RESET}`;
}
export function bold(text) {
    if (!process.stdout.isTTY) {
        return text;
    }
    return `\u001B[1m${text}${RESET}`;
}
export function dim(text) {
    if (!process.stdout.isTTY) {
        return text;
    }
    return `\u001B[2m${text}${RESET}`;
}
export function italic(text) {
    if (!process.stdout.isTTY) {
        return text;
    }
    return `\u001B[3m${text}${RESET}`;
}
export function rainbow(text) {
    if (!process.stdout.isTTY) {
        return text;
    }
    const chars = Array.from(text);
    const visibleCount = chars.filter((c) => c.trim().length > 0).length;
    let visibleIndex = 0;
    return (chars
        .map((char) => {
        if (char.trim().length === 0) {
            return char;
        }
        const hue = (visibleIndex / Math.max(1, visibleCount)) * 360;
        visibleIndex += 1;
        const [r, g, b] = hslToRgb(hue, 0.85, 0.65);
        return `\u001B[38;2;${r};${g};${b}m${char}`;
    })
        .join("") + RESET);
}
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0;
    let g1 = 0;
    let b1 = 0;
    if (h < 60) {
        r1 = c;
        g1 = x;
    }
    else if (h < 120) {
        r1 = x;
        g1 = c;
    }
    else if (h < 180) {
        g1 = c;
        b1 = x;
    }
    else if (h < 240) {
        g1 = x;
        b1 = c;
    }
    else if (h < 300) {
        r1 = x;
        b1 = c;
    }
    else {
        r1 = c;
        b1 = x;
    }
    return [
        Math.round((r1 + m) * 255),
        Math.round((g1 + m) * 255),
        Math.round((b1 + m) * 255),
    ];
}
function hexToRgb(hex) {
    const value = hex.replace("#", "");
    const normalized = value.length === 3
        ? value
            .split("")
            .map((segment) => `${segment}${segment}`)
            .join("")
        : value;
    if (!/^[\da-fA-F]{6}$/.test(normalized)) {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
    ];
}
//# sourceMappingURL=color.js.map