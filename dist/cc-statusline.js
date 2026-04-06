#!/usr/bin/env node
import { runCCStatusLineCommand } from "./cli/cc-statusline.js";
runCCStatusLineCommand().catch(() => {
    process.exitCode = 1;
});
//# sourceMappingURL=cc-statusline.js.map