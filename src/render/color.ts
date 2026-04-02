const RESET = "\u001B[0m";

export function colorize(text: string, hex: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }

  const [red, green, blue] = hexToRgb(hex);
  return `\u001B[38;2;${red};${green};${blue}m${text}${RESET}`;
}

export function bold(text: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }

  return `\u001B[1m${text}${RESET}`;
}

export function dim(text: string): string {
  if (!process.stdout.isTTY) {
    return text;
  }

  return `\u001B[2m${text}${RESET}`;
}

function hexToRgb(hex: string): [number, number, number] {
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
