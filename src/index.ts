#!/usr/bin/env node

import { Command } from "commander";

import { runAttachCommand } from "./cli/attach.js";
import { runCardCommand } from "./cli/card.js";
import { runDetachCommand } from "./cli/detach.js";
import { runEventCommand } from "./cli/event.js";
import { runHatchCommand } from "./cli/hatch.js";
import { runInitCommand } from "./cli/init.js";
import { runInstallTmuxCommand } from "./cli/install.js";
import { runSidecarCliCommand } from "./cli/sidecar.js";
import { runBuddyHomeCommand, runSetupCommand } from "./cli/setup.js";

const program = new Command();

program
  .name("buddy")
  .description("A terminal companion that hatches on first run and follows you through tmux.")
  .version("0.1.0");

program
  .command("card")
  .description("Render the persisted buddy card.")
  .action(async () => {
    await runCardCommand();
  });

program
  .command("pet")
  .description("Show the current companion card.")
  .action(async () => {
    await runCardCommand();
  });

program
  .command("hatch")
  .description("Hatch a companion from the bundled atlas and persist it to ~/.terminal-buddy/companion.json.")
  .option("-u, --user <id>", "Deterministic user id seed")
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
  .command("setup")
  .description("Run the first-time EveryBuddy setup flow with a bundled companion draw.")
  .option("-u, --user <id>", "Deterministic user id seed")
  .action(async (options) => {
    await runSetupCommand({ ...options, purpose: "setup" });
  });

program
  .command("rehatch")
  .description("Draw a new companion and replace the current one.")
  .option("-u, --user <id>", "Deterministic user id seed")
  .action(async (options) => {
    await runSetupCommand({ ...options, purpose: "rehatch" });
  });

program
  .command("install <target>")
  .description("Install EveryBuddy into a supported terminal host.")
  .action(async (target) => {
    if (target !== "tmux") {
      throw new Error("Only `buddy install tmux` is supported right now.");
    }

    await runInstallTmuxCommand();
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
    process.stdout.write("Gallery export is not implemented yet. Start with `buddy pet`.\n");
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
    await runBuddyHomeCommand();
    return;
  }

  await program.parseAsync();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
