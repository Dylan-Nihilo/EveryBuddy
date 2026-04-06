import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
export function createConsoleIO() {
    return {
        isInteractive: Boolean(input.isTTY && output.isTTY),
        supportsAnsi: Boolean(output.isTTY),
        write(text) {
            output.write(text);
        },
        writeLine(text = "") {
            output.write(`${text}\n`);
        },
        async prompt(question) {
            if (!input.isTTY || !output.isTTY) {
                throw new Error("EveryBuddy needs an interactive terminal for this step.");
            }
            const rl = createInterface({ input, output });
            try {
                return (await rl.question(question)).trim();
            }
            finally {
                rl.close();
            }
        },
        async confirm(question, defaultValue = true) {
            const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
            const answer = (await this.prompt(`${question}${suffix}`)).trim().toLowerCase();
            if (answer.length === 0) {
                return defaultValue;
            }
            return answer === "y" || answer === "yes";
        },
    };
}
//# sourceMappingURL=io.js.map