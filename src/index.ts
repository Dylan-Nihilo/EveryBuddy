#!/usr/bin/env node

import { Command } from "commander";

import { runAttachCommand } from "./cli/attach.js";
import { runCardCommand } from "./cli/card.js";
import { runDetachCommand } from "./cli/detach.js";
import { runEventCommand } from "./cli/event.js";
import { runHatchCommand } from "./cli/hatch.js";
import { runInitCommand } from "./cli/init.js";
import { runSidecarCliCommand } from "./cli/sidecar.js";

const program = new Command();

program
  .name("buddy")
  .description("An open terminal AI companion with deterministic bones and future AI soul.")
  .version("0.1.0");

program
  .command("card")
  .description("Render the persisted buddy card.")
  .action(async () => {
    await runCardCommand();
  });

program
  .command("hatch")
  .description("Hatch a companion and persist it to ~/.terminal-buddy/companion.json.")
  .option("-u, --user <id>", "Deterministic user id seed")
  .option("--model <id>", "OpenAI-compatible model id")
  .option("--base-url <url>", "OpenAI-compatible API base URL")
  .option("--api-key <key>", "OpenAI-compatible API key")
  .option("--force", "Replace an existing companion")
  .action(async (options) => {
    await runHatchCommand(options);
  });

program
  .command("init <shell>")
  .description("Print shell hook setup for automatic tmux sidecar follow mode.")
  .action((shell) => {
    runInitCommand(shell);
  });

program
  .command("attach")
  .description("Attach an EveryBuddy sidecar to the current tmux window.")
  .option("--quiet", "Silence attach output")
  .action(async (options) => {
    await runAttachCommand(options);
  });

program
  .command("detach")
  .description("Detach the EveryBuddy sidecar from the current tmux window.")
  .option("--quiet", "Silence detach output")
  .action(async (options) => {
    await runDetachCommand(options);
  });

program
  .command("gallery")
  .description("Placeholder for species gallery export.")
  .action(() => {
    process.stdout.write("Gallery export is not implemented yet. Start with `buddy card`.\n");
  });

program
  .command("event <type>")
  .description("Internal shell event bridge for the EveryBuddy tmux sidecar.")
  .addHelpText("after", "\nSupported types: pane_active, input_update, command_start, command_end.")
  .option("--cwd <path>", "Working directory")
  .option("--command <text>", "Command text")
  .option("--exit-code <code>", "Exit code for command_end")
  .action(async (type, options) => {
    await runEventCommand(type, options);
  });

program
  .command("sidecar")
  .description("Internal sidecar runtime for tmux follow mode.")
  .option("--window-id <id>", "tmux window id")
  .option("--target-pane <id>", "Initial target pane id")
  .action(async (options) => {
    await runSidecarCliCommand(options);
  });

async function main(): Promise<void> {
  if (process.argv.length <= 2) {
    await runCardCommand();
    return;
  }

  await program.parseAsync();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
