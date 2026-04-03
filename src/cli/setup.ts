import path from "node:path";

import { rollCompanion } from "../bones/roll.js";
import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { renderCompanionCard } from "../render/card.js";
import { colorize, dim } from "../render/color.js";
import { composeFrame } from "../render/compose.js";
import { EYES, SPECIES } from "../render/sprites.js";
import { buildCompanionRecord, hatchSoul } from "../soul/hatch.js";
import { OpenAICompatibleProvider } from "../soul/providers/openai.js";
import type { AIProvider } from "../soul/providers/types.js";
import { readCompanionRecord, writeCompanionRecord } from "../storage/companion.js";
import { companionFilePath } from "../storage/paths.js";
import {
  resolveBuddyConfig,
  resolveUserId,
  updateBuddyConfigFile,
} from "../storage/config.js";
import type { CompanionBones, CompanionRecord, CompanionSoul } from "../types/companion.js";
import type { HatchSceneState } from "../types/onboarding.js";
import { createConsoleIO, type PromptIO } from "./io.js";
import {
  detectTmuxInstallStatus,
  runInstallTmuxCommand,
  type TmuxInstallStatus,
} from "./install.js";

const STAGE_DELAY_MS = 180;
const SPINNER_FRAMES = ["·  ", "·· ", "···", " ··"];

export interface SetupCommandOptions {
  user?: string | undefined;
  model?: string | undefined;
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  storageDir?: string | undefined;
  io?: PromptIO | undefined;
  providerFactory?: ((params: { apiKey: string; model: string; baseUrl: string }) => AIProvider) | undefined;
  installFlow?: ((params: { io: PromptIO }) => Promise<unknown>) | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  purpose?: "first_run" | "setup" | "rehatch" | undefined;
}

export interface BuddyHomeCommandOptions {
  storageDir?: string | undefined;
  io?: PromptIO | undefined;
  startSetup?: ((options?: SetupCommandOptions) => Promise<void>) | undefined;
  detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}

export async function runBuddyHomeCommand(options: BuddyHomeCommandOptions = {}): Promise<void> {
  const companion = await readCompanionRecord(options.storageDir);
  if (!companion) {
    await (options.startSetup ?? runSetupCommand)({
      ...(options.storageDir ? { storageDir: options.storageDir } : {}),
      ...(options.io ? { io: options.io } : {}),
      purpose: "first_run",
    });
    return;
  }

  const io = options.io ?? createConsoleIO();
  const output = await getBuddyHomeOutput({
    companion,
    detectInstallStatus: options.detectInstallStatus,
  });
  io.writeLine(output);
}

export async function runSetupCommand(options: SetupCommandOptions = {}): Promise<void> {
  const io = options.io ?? createConsoleIO();
  const sleep = options.sleep ?? defaultSleep;
  const purpose = options.purpose ?? "setup";
  const installFlow = options.installFlow ?? ((params: { io: PromptIO }) => runInstallTmuxCommand(params));
  const existing = await readCompanionRecord(options.storageDir);

  if (existing) {
    if (purpose === "rehatch") {
      if (!io.isInteractive) {
        throw new Error("EveryBuddy needs confirmation before replacing the current companion.");
      }

      const confirmed = await io.confirm("Replace your current companion with a new draw?", false);
      if (!confirmed) {
        io.writeLine("Rehatch cancelled.");
        return;
      }
    } else if (purpose === "setup") {
      io.writeLine("A companion is already hatched.");
      io.writeLine(dim(`${existing.soul.name} is still bound to this terminal.`));

      if (io.isInteractive) {
        const reroll = await io.confirm("Draw a new companion now?", false);
        if (!reroll) {
          await installFlow({ io });
          return;
        }
      } else {
        throw new Error("A companion already exists. Run `buddy rehatch` to replace it.");
      }
    }
  }

  const resolvedConfig = await resolveBuddyConfig({
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    ...(options.storageDir ? { storageDir: options.storageDir } : {}),
  });
  const userId = resolveUserId(options.user);
  const bones = rollCompanion(userId);
  const scene: HatchSceneState = {
    step: "bones_reveal",
    userId,
    bones,
    attempt: 0,
  };

  io.writeLine(purpose === "rehatch" ? "Rebinding EveryBuddy..." : "EveryBuddy is waking up...");
  await playBonesReveal(scene, io, sleep);

  const configured = await ensureRuntimeConfig(resolvedConfig, io);
  await updateBuddyConfigFile(
    {
      provider: "openai",
      model: configured.model,
      observerModel: configured.observerModel,
      baseUrl: configured.baseUrl,
      language: configured.language,
      apiKey: configured.apiKey,
    },
    configured.storageDir,
  );
  const providerFactory = options.providerFactory ?? defaultProviderFactory;
  const provider = providerFactory({
    apiKey: configured.apiKey,
    model: configured.model,
    baseUrl: configured.baseUrl,
  });
  const soul = await imprintSoul(scene, provider, configured.language, io);
  const record = buildCompanionRecord(userId, bones, soul);

  await writeCompanionRecord(record, configured.storageDir);
  await playFinalReveal(record, configured.storageDir, io, sleep);
  await installFlow({ io });
}

export async function getBuddyHomeOutput(options: {
  companion: CompanionRecord;
  detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}): Promise<string> {
  const status = await (options.detectInstallStatus ?? detectTmuxInstallStatus)().catch(() => ({
    tmuxAvailable: false,
    shellSupported: false,
    hookInstalled: false,
    zshrcPath: path.join(process.env.HOME ?? "", ".zshrc"),
  }));

  const lines = [
    renderCompanionCard(options.companion),
    "",
    dim("EveryBuddy is already hatched."),
    status.hookInstalled
      ? "tmux follow mode is installed. Open a new tmux window to see it."
      : "Run `buddy install tmux` to add the sidecar to tmux.",
    "Run `buddy pet` to view this card again.",
    "Run `buddy rehatch` to draw a new companion.",
  ];

  return lines.join("\n");
}

async function ensureRuntimeConfig(
  config: Awaited<ReturnType<typeof resolveBuddyConfig>>,
  io: PromptIO,
): Promise<{
  apiKey: string;
  model: string;
  observerModel: string | undefined;
  baseUrl: string;
  language: typeof config.language;
  storageDir: string;
}> {
  if (config.apiKey) {
    return {
      apiKey: config.apiKey,
      model: config.model,
      observerModel: config.observerModel,
      baseUrl: config.baseUrl ?? "",
      language: config.language,
      storageDir: config.storageDir,
    };
  }

  if (!io.isInteractive) {
    throw new Error("Missing API key. Set OPENAI_API_KEY or run `buddy` in an interactive terminal.");
  }

  const apiKey = (await io.prompt("Paste your OpenAI-compatible API key: ")).trim();
  if (!apiKey) {
    throw new Error("EveryBuddy could not continue without an API key.");
  }

  await updateBuddyConfigFile(
    {
      provider: "openai",
      model: config.model,
      observerModel: config.observerModel,
      baseUrl: config.baseUrl,
      language: config.language,
      apiKey,
    },
    config.storageDir,
  );
  io.writeLine(`Saved API key to ${path.join(config.storageDir, "config.json")}.`);

  return {
    apiKey,
    model: config.model,
    observerModel: config.observerModel,
    baseUrl: config.baseUrl ?? "",
    language: config.language,
    storageDir: config.storageDir,
  };
}

async function playBonesReveal(
  scene: HatchSceneState,
  io: PromptIO,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const species = SPECIES[scene.bones.species];
  const eye = EYES[scene.bones.eye];
  const spriteFrame = species?.frames[0];
  const sprite =
    species && eye && spriteFrame
      ? composeFrame(spriteFrame, eye.char, scene.bones.hat, scene.bones.color)
      : [];
  const [peakStat, peakValue] = getPeakStat(scene.bones.stats);
  const [dumpStat, dumpValue] = getDumpStat(scene.bones.stats);

  io.writeLine(colorize("Bones Reveal", scene.bones.rarity.color));
  io.writeLine(dim(`seed locked to ${scene.userId}`));
  await sleep(STAGE_DELAY_MS);
  io.writeLine(
    `${colorize("rarity", scene.bones.rarity.color)} ${scene.bones.rarity.name} ${scene.bones.rarity.stars}`,
  );
  await sleep(STAGE_DELAY_MS);
  io.writeLine(`${colorize("species", scene.bones.color.accent)} ${species?.name ?? scene.bones.species}`);
  io.writeLine(`${colorize("eyes", scene.bones.color.accent)} ${eye?.label ?? scene.bones.eye}`);
  io.writeLine(`${colorize("hat", scene.bones.color.accent)} ${scene.bones.hat}`);
  await sleep(STAGE_DELAY_MS);
  if (sprite.length > 0) {
    io.writeLine("");
    for (const line of sprite) {
      io.writeLine(line);
    }
  }
  io.writeLine("");
  io.writeLine(dim(`peak ${peakStat.toLowerCase()} ${peakValue} · flaw ${dumpStat.toLowerCase()} ${dumpValue}`));
  io.writeLine("");
}

async function imprintSoul(
  scene: HatchSceneState,
  provider: AIProvider,
  language: "zh" | "en",
  io: PromptIO,
): Promise<CompanionSoul> {
  while (true) {
    scene.step = "soul_imprint";
    scene.attempt += 1;
    io.writeLine(colorize("Soul Imprint", scene.bones.color.primary));
    io.writeLine(dim("Rarity anchors the shell. The name is still forming."));

    try {
      const soul = await runWithSpinner(io, "Binding the soul", () =>
        hatchSoul(scene.bones, provider, language),
      );
      scene.soul = soul;
      return soul;
    } catch (error) {
      scene.error = error instanceof Error ? error.message : String(error);
      io.writeLine(`Soul imprint failed: ${scene.error}`);

      if (!io.isInteractive) {
        throw error;
      }

      const retry = await io.confirm("Retry the soul imprint with the same draw?", true);
      if (!retry) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
  }
}

async function playFinalReveal(
  record: CompanionRecord,
  storageDir: string,
  io: PromptIO,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  io.writeLine("");
  io.writeLine(colorize("Final Reveal", record.bones.rarity.color));
  await sleep(STAGE_DELAY_MS);
  io.writeLine(renderCompanionCard(record));
  io.writeLine("");
  io.writeLine(`Saved to ${companionFilePath(storageDir)}`);
  io.writeLine("Next: install tmux follow mode so this companion can live beside your shell.");
}

async function runWithSpinner<T>(io: PromptIO, label: string, task: () => Promise<T>): Promise<T> {
  if (!io.supportsAnsi) {
    return task();
  }

  let frame = 0;
  const timer = setInterval(() => {
    io.write(`\r${label} ${SPINNER_FRAMES[frame % SPINNER_FRAMES.length]}`);
    frame += 1;
  }, 120);

  try {
    const result = await task();
    io.write(`\r${label} done.   \n`);
    return result;
  } catch (error) {
    io.write(`\r${label} failed. \n`);
    throw error;
  } finally {
    clearInterval(timer);
  }
}

function defaultProviderFactory(params: { apiKey: string; model: string; baseUrl: string }): AIProvider {
  return new OpenAICompatibleProvider(params);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
