import path from "node:path";

import {
  buildBundledCompanionRecord,
  selectBundledCompanionTemplate,
} from "../atlas/bundled.js";
import { getDumpStat, getPeakStat } from "../bones/stats.js";
import { getLocalizedSoulCopy } from "../i18n/companion.js";
import {
  localizeEyeLabel,
  localizeHatLabel,
  localizeRarityName,
  localizeSpeciesName,
  localizeStatName,
  uiText,
} from "../i18n/ui.js";
import { renderCompanionCard } from "../render/card.js";
import { playGachaAnimation } from "../render/gacha.js";
import { createProvider } from "../soul/providers/index.js";
import { colorize, dim } from "../render/color.js";
import { composeFrame } from "../render/compose.js";
import { EYES, HATS, SPECIES } from "../render/sprites.js";
import { readCompanionRecord, writeCompanionRecord, checkCompanionIntegrity } from "../storage/companion.js";
import { companionFilePath } from "../storage/paths.js";
import {
  PROVIDER_DEFAULTS,
  resolveBuddyConfig,
  resolveUserId,
  updateBuddyConfigFile,
} from "../storage/config.js";
import type { BuddyLanguage, BuddyProvider, CompanionRecord, CompanionSoul } from "../types/companion.js";
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
  storageDir?: string | undefined;
  io?: PromptIO | undefined;
  installFlow?: ((params: { io: PromptIO }) => Promise<unknown>) | undefined;
  sleep?: ((ms: number) => Promise<void>) | undefined;
  purpose?: "first_run" | "setup" | undefined;
}

export interface BuddyHomeCommandOptions {
  storageDir?: string | undefined;
  io?: PromptIO | undefined;
  startSetup?: ((options?: SetupCommandOptions) => Promise<void>) | undefined;
  detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}

export async function runBuddyHomeCommand(options: BuddyHomeCommandOptions = {}): Promise<void> {
  const language = (await resolveBuddyConfig({ storageDir: options.storageDir })).language;
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
    language,
    detectInstallStatus: options.detectInstallStatus,
  });
  io.writeLine(output);
}

export async function runSetupCommand(options: SetupCommandOptions = {}): Promise<void> {
  const language = (await resolveBuddyConfig({ storageDir: options.storageDir })).language;
  const text = uiText(language);
  const io = options.io ?? createConsoleIO();
  const sleep = options.sleep ?? defaultSleep;
  const purpose = options.purpose ?? "setup";
  const installFlow = options.installFlow ?? ((params: { io: PromptIO }) => runInstallTmuxCommand(params));
  const existing = await readCompanionRecord(options.storageDir);

  if (existing) {
    io.writeLine(text.companionExistsTitle);
    io.writeLine(dim(text.stillBound(existing.soul.name)));
    await installFlow({ io });
    return;
  }

  const userId = resolveSetupUserId(options.user, existing);
  const template = selectBundledCompanionTemplate(userId);
  const record = buildBundledCompanionRecord(userId, template);
  const scene: HatchSceneState = {
    step: "bones_reveal",
    userId,
    bones: record.bones,
    record,
    attempt: 0,
  };

  io.writeLine(text.wakingUp);
  io.writeLine(dim(text.seedLocked(userId)));
  await sleep(STAGE_DELAY_MS);

  await playGachaAnimation({ record, language, io, sleep });

  await writeCompanionRecord(record, options.storageDir);
  io.writeLine("");
  io.writeLine(text.savedTo(companionFilePath(options.storageDir)));
  io.writeLine(text.installTmuxNext);

  const resolvedConfig = await resolveBuddyConfig({
    ...(options.storageDir ? { storageDir: options.storageDir } : {}),
  });
  await ensureRuntimeConfig(resolvedConfig, io);

  await installFlow({ io });
}

export async function getBuddyHomeOutput(options: {
  companion: CompanionRecord;
  language: BuddyLanguage;
  detectInstallStatus?: (() => Promise<TmuxInstallStatus>) | undefined;
}): Promise<string> {
  const text = uiText(options.language);
  const status = await (options.detectInstallStatus ?? detectTmuxInstallStatus)().catch(() => ({
    tmuxAvailable: false,
    shellSupported: false,
    hookInstalled: false,
    zshrcPath: path.join(process.env.HOME ?? "", ".zshrc"),
  }));

  const integrity = await checkCompanionIntegrity();
  const tamperWarning =
    integrity && !integrity.valid
      ? [colorize("⚠ companion record has been modified.", "#FF6B6B"), ""]
      : integrity && integrity.userMismatch
        ? [colorize("⚠ companion was drawn on a different machine.", "#FF6B6B"), ""]
        : integrity && integrity.envSeeded
          ? [dim("⚠ drawn with custom seed (EVERYBUDDY_USER_ID)"), ""]
          : [];

  const lines = [
    renderCompanionCard(options.companion, { language: options.language }),
    "",
    ...tamperWarning,
    dim(text.alreadyHatched),
    status.hookInstalled ? text.tmuxInstalledHint : text.installTmuxHint,
    text.petAgainHint,
  ];

  return lines.join("\n");
}

async function ensureRuntimeConfig(
  config: Awaited<ReturnType<typeof resolveBuddyConfig>>,
  io: PromptIO,
): Promise<void> {
  if (config.apiKey) {
    return;
  }

  if (!io.isInteractive) {
    return;
  }

  const providerPresets = [
    { key: "1",  name: "DashScope",      label: "Qwen",   baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus",        note: "free tier" },
    { key: "2",  name: "DeepSeek",       label: "",        baseUrl: "https://api.deepseek.com/v1",                       model: "deepseek-chat",    note: "free tier" },
    { key: "3",  name: "Zhipu AI",       label: "GLM",     baseUrl: "https://open.bigmodel.cn/api/paas/v4",              model: "glm-4-flash",      note: "free forever" },
    { key: "4",  name: "Moonshot",       label: "Kimi",    baseUrl: "https://api.moonshot.cn/v1",                         model: "moonshot-v1-8k",   note: "rate-limited free" },
    { key: "5",  name: "Doubao",         label: "Volcengine", baseUrl: "https://ark.cn-beijing.volces.com/api/v3",        model: "doubao-lite-32k",  note: "200M tokens/day free" },
    { key: "6",  name: "SiliconFlow",    label: "",        baseUrl: "https://api.siliconflow.cn/v1",                      model: "Qwen/Qwen2.5-7B-Instruct", note: "aggregator" },
    { key: "7",  name: "OpenAI",         label: "",        baseUrl: "https://api.openai.com/v1",                          model: "gpt-4o-mini",      note: "" },
    { key: "8",  name: "Anthropic",      label: "Claude",  baseUrl: "https://api.anthropic.com",                          model: "claude-haiku-4-5-20251001", note: "" },
    { key: "9",  name: "Custom",         label: "",        baseUrl: "",                                                   model: "",                 note: "any OpenAI-compatible" },
  ];

  io.writeLine("");
  io.writeLine("Choose your LLM provider (powers the tmux sidecar observer):");
  for (const p of providerPresets) {
    const tag = p.label ? ` (${p.label})` : "";
    const noteTag = p.note ? `, ${p.note}` : "";
    const modelTag = p.model ? `, ${p.model}` : "";
    io.writeLine(`  ${p.key}. ${p.name.padEnd(14)}${tag}${modelTag}${noteTag}`);
  }
  io.writeLine(`  0. Skip          (set up later with env vars)`);
  io.writeLine("");

  const choice = (await io.prompt(`Enter 1-9 or 0 [1]: `)).trim() || "1";

  if (choice === "0") {
    io.writeLine(dim("Skipped. Set your provider's API key as an env var later to enable the observer."));
    return;
  }

  const preset = providerPresets.find((p) => p.key === choice);
  if (!preset) {
    io.writeLine(dim("Invalid choice. Skipping provider setup."));
    return;
  }

  let provider: BuddyProvider;
  let model = config.model;
  let observerModel = config.observerModel;
  let baseUrl = config.baseUrl;

  if (preset.name === "Anthropic") {
    provider = "anthropic";
    const defaults = PROVIDER_DEFAULTS.anthropic;
    model = model || defaults.model;
    observerModel = observerModel ?? defaults.observerModel;
    baseUrl = baseUrl || defaults.baseUrl;
  } else if (preset.name === "Custom") {
    provider = "custom";
    baseUrl = (await io.prompt("Base URL (OpenAI-compatible): ")).trim();
    if (!baseUrl) {
      io.writeLine(dim("No base URL provided. Skipping provider setup."));
      return;
    }
    model = (await io.prompt("Model name: ")).trim();
    if (!model) {
      io.writeLine(dim("No model provided. Skipping provider setup."));
      return;
    }
    observerModel = model;
  } else if (preset.name === "DashScope") {
    provider = "openai";
    model = model || preset.model;
    observerModel = observerModel ?? "qwen3-coder-next";
    baseUrl = baseUrl || preset.baseUrl;
  } else {
    // All other OpenAI-compatible presets
    provider = "openai";
    model = model || preset.model;
    observerModel = observerModel ?? preset.model;
    baseUrl = baseUrl || preset.baseUrl;
  }

  const keyLabel = preset.name;
  const apiKey = (await io.prompt(`Paste your ${keyLabel} API key: `)).trim();
  if (!apiKey) {
    io.writeLine(dim("No API key provided. Skipping provider setup."));
    return;
  }

  const text = uiText(config.language);
  const testLabel = config.language === "zh" ? "测试连接" : "Testing connection";
  try {
    await runWithSpinner(io, testLabel, async () => {
      const testProvider = createProvider({
        provider,
        apiKey,
        model: model!,
        baseUrl: baseUrl!,
        systemPrompt: "Reply with exactly: ok",
      });
      await testProvider.complete("ping");
    });
  } catch {
    io.writeLine(dim(text.providerTestFailed));
  }

  await updateBuddyConfigFile(
    {
      provider,
      model,
      observerModel,
      baseUrl,
      language: config.language,
      apiKey,
    },
    config.storageDir,
  );
  io.writeLine(dim(`Saved config to ${path.join(config.storageDir, "config.json")}.`));
}

async function playBonesReveal(
  scene: HatchSceneState,
  language: BuddyLanguage,
  io: PromptIO,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const text = uiText(language);
  const species = SPECIES[scene.bones.species];
  const eye = EYES[scene.bones.eye];
  const spriteFrame = species?.frames[0];
  const sprite =
    species && eye && spriteFrame
      ? composeFrame(spriteFrame, eye.char, scene.bones.hat, scene.bones.color)
      : [];
  const [peakStat, peakValue] = getPeakStat(scene.bones.stats);
  const [dumpStat, dumpValue] = getDumpStat(scene.bones.stats);

  io.writeLine(colorize(text.bonesReveal, scene.bones.rarity.color));
  io.writeLine(dim(text.seedLocked(scene.userId)));
  await sleep(STAGE_DELAY_MS);
  io.writeLine(
    `${colorize(text.rarityLabel.toLowerCase(), scene.bones.rarity.color)} ${localizeRarityName(scene.bones.rarity.name, language)} ${scene.bones.rarity.stars}`,
  );
  await sleep(STAGE_DELAY_MS);
  io.writeLine(
    `${colorize(text.speciesLabel.toLowerCase(), scene.bones.color.accent)} ${localizeSpeciesName(scene.bones.species, species?.name ?? scene.bones.species, language)}`,
  );
  io.writeLine(
    `${colorize(text.eyesLabel.toLowerCase(), scene.bones.color.accent)} ${localizeEyeLabel(scene.bones.eye, eye?.label ?? scene.bones.eye, language)}`,
  );
  io.writeLine(
    `${colorize(text.hatLabel.toLowerCase(), scene.bones.color.accent)} ${localizeHatLabel(scene.bones.hat, HATS[scene.bones.hat]?.label ?? scene.bones.hat, language)}`,
  );
  await sleep(STAGE_DELAY_MS);
  if (sprite.length > 0) {
    io.writeLine("");
    for (const line of sprite) {
      io.writeLine(line);
    }
  }
  io.writeLine("");
  io.writeLine(
    dim(
      `${text.peakMarker} ${localizeStatName(peakStat, language)} ${peakValue} · ${text.dumpMarker} ${localizeStatName(dumpStat, language)} ${dumpValue}`,
    ),
  );
  io.writeLine("");
}

async function imprintSoul(
  scene: HatchSceneState,
  soul: CompanionSoul,
  language: BuddyLanguage,
  io: PromptIO,
  sleep: (ms: number) => Promise<void>,
): Promise<CompanionSoul> {
  const text = uiText(language);
  scene.step = "soul_imprint";
  scene.attempt += 1;
  io.writeLine(colorize(text.soulImprint, scene.bones.color.primary));
  io.writeLine(dim(text.soulImprintLead));

  const bindingLabel = language === "zh" ? "正在绑定灵魂" : "Binding the soul";
  const boundSoul = await runWithSpinner(io, bindingLabel, async () => {
    await sleep(STAGE_DELAY_MS * 3);
    return cloneSoul(soul);
  });

  scene.soul = boundSoul;
  const localizedSoul = getLocalizedSoulCopy({ templateId: scene.record?.templateId ?? undefined, soul: boundSoul }, language);
  if (localizedSoul.tagline) {
    io.writeLine(dim(localizedSoul.tagline));
  }
  return boundSoul;
}

async function playFinalReveal(
  record: CompanionRecord,
  storageDir: string | undefined,
  language: BuddyLanguage,
  io: PromptIO,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const text = uiText(language);
  io.writeLine("");
  io.writeLine(colorize(text.finalReveal, record.bones.rarity.color));
  await sleep(STAGE_DELAY_MS);
  io.writeLine(renderCompanionCard(record, { language }));
  io.writeLine("");
  io.writeLine(text.savedTo(companionFilePath(storageDir)));
  io.writeLine(text.installTmuxNext);
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

function resolveSetupUserId(
  cliUserId: string | undefined,
  existing: CompanionRecord | null,
): string {
  if (cliUserId?.trim()) {
    return resolveUserId(cliUserId);
  }

  return existing?.userId ?? resolveUserId();
}

function cloneSoul(soul: CompanionSoul): CompanionSoul {
  return {
    name: soul.name,
    ...(soul.tagline ? { tagline: soul.tagline } : {}),
    personality: soul.personality,
    observerProfile: { ...soul.observerProfile },
    modelUsed: soul.modelUsed,
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
