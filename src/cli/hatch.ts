import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { rollCompanion } from "../bones/roll.js";
import { hatchSoul, buildCompanionRecord } from "../soul/hatch.js";
import { OpenAICompatibleProvider } from "../soul/providers/openai.js";
import { writeCompanionRecord, readCompanionRecord } from "../storage/companion.js";
import {
  assertHatchReadyConfig,
  resolveBuddyConfig,
  resolveUserId,
} from "../storage/config.js";

export interface HatchCommandOptions {
  user?: string | undefined;
  model?: string | undefined;
  baseUrl?: string | undefined;
  apiKey?: string | undefined;
  force?: boolean | undefined;
}

export async function runHatchCommand(options: HatchCommandOptions): Promise<void> {
  const resolvedConfig = await resolveBuddyConfig({
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });
  const config = await withPromptedApiKey(resolvedConfig);
  const existingCompanion = await readCompanionRecord(config.storageDir);

  if (existingCompanion && !options.force) {
    throw new Error("A companion already exists. Run `buddy hatch --force` to replace it.");
  }

  const readyConfig = assertHatchReadyConfig(config);
  const userId = resolveUserId(options.user);
  const bones = rollCompanion(userId);
  const provider = new OpenAICompatibleProvider({
    apiKey: readyConfig.apiKey,
    model: readyConfig.model,
    baseUrl: readyConfig.baseUrl,
  });
  process.stdout.write(`Hatching with ${readyConfig.model} via ${readyConfig.baseUrl}...\n`);
  const soul = await hatchSoul(bones, provider, readyConfig.language);
  const record = buildCompanionRecord(userId, bones, soul);

  await writeCompanionRecord(record, readyConfig.storageDir);
  process.stdout.write(`Hatched ${soul.name} for ${userId} using ${soul.modelUsed}.\n`);
}

async function withPromptedApiKey(
  config: Awaited<ReturnType<typeof resolveBuddyConfig>>,
): Promise<Awaited<ReturnType<typeof resolveBuddyConfig>>> {
  if (config.apiKey) {
    return config;
  }

  if (!input.isTTY || !output.isTTY) {
    return config;
  }

  const rl = createInterface({ input, output });

  try {
    const apiKey = (await rl.question("OpenAI-compatible API key: ")).trim();
    return {
      ...config,
      apiKey: apiKey.length > 0 ? apiKey : undefined,
    };
  } finally {
    rl.close();
  }
}
