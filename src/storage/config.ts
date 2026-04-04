import os from "node:os";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { configFilePath, defaultStorageDir } from "./paths.js";
import type {
  BuddyConfig,
  BuddyLanguage,
  BuddyProvider,
  HatchReadyConfig,
  ResolvedBuddyConfig,
} from "../types/companion.js";

export const DEFAULT_OPENAI_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";
export const DEFAULT_OPENAI_MODEL = "qwen3.5-plus";
export const DEFAULT_OPENAI_OBSERVER_MODEL = "qwen3-coder-next";
export const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";
export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_ANTHROPIC_OBSERVER_MODEL = "claude-haiku-4-5-20251001";

export const PROVIDER_DEFAULTS = {
  openai: {
    baseUrl: DEFAULT_OPENAI_BASE_URL,
    model: DEFAULT_OPENAI_MODEL,
    observerModel: DEFAULT_OPENAI_OBSERVER_MODEL,
  },
  anthropic: {
    baseUrl: DEFAULT_ANTHROPIC_BASE_URL,
    model: DEFAULT_ANTHROPIC_MODEL,
    observerModel: DEFAULT_ANTHROPIC_OBSERVER_MODEL,
  },
  custom: {
    baseUrl: undefined as string | undefined,
    model: undefined as string | undefined,
    observerModel: undefined as string | undefined,
  },
} as const satisfies Record<
  BuddyProvider,
  {
    baseUrl: string | undefined;
    model: string | undefined;
    observerModel: string | undefined;
  }
>;

export interface ResolveBuddyConfigOptions {
  model?: string | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  storageDir?: string | undefined;
}

const DEFAULT_CONFIG: Pick<ResolvedBuddyConfig, "provider" | "language"> = {
  provider: "openai",
  language: "zh",
};

export async function resolveBuddyConfig(
  options: ResolveBuddyConfigOptions = {},
): Promise<ResolvedBuddyConfig> {
  const storageDir = options.storageDir ?? defaultStorageDir();
  const fileConfig = await readBuddyConfigFile(storageDir);
  const envConfig = readEnvConfig();
  const cliConfig = compactConfig({
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  const merged = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    ...cliConfig,
    storageDir,
  };

  const provider = isValidProvider(merged.provider) ? merged.provider : DEFAULT_CONFIG.provider;
  const defaults = PROVIDER_DEFAULTS[provider];
  const baseUrl = normalizeOptionalString(merged.baseUrl) ?? defaults.baseUrl ?? "";
  const model = normalizeOptionalString(merged.model) ?? defaults.model ?? "";
  const observerModel =
    normalizeOptionalString(merged.observerModel) ?? defaults.observerModel;

  return {
    provider,
    model,
    observerModel,
    apiKey: normalizeOptionalString(merged.apiKey),
    baseUrl,
    language: normalizeLanguage(merged.language),
    storageDir,
  };
}

export function assertHatchReadyConfig(config: ResolvedBuddyConfig): HatchReadyConfig {
  const missing: string[] = [];

  if (!config.apiKey) {
    missing.push("API key (--api-key or env variable)");
  }

  if (!config.model) {
    missing.push("model (--model)");
  }

  if (missing.length > 0) {
    throw new Error(`Missing hatch configuration: ${missing.join(", ")}.`);
  }

  const apiKey = config.apiKey;
  const model = config.model;
  if (!apiKey) {
    throw new Error("Missing hatch configuration: API key (--api-key or env variable).");
  }

  return {
    ...config,
    apiKey,
    model,
  };
}

export function resolveUserId(cliUserId?: string): string {
  const candidate = cliUserId?.trim() || process.env.EVERYBUDDY_USER_ID?.trim();
  if (candidate) {
    return candidate;
  }

  return os.userInfo().username || "buddy-user";
}

export async function readBuddyConfigFile(storageDir = defaultStorageDir()): Promise<BuddyConfig> {
  const targetPath = configFilePath(storageDir);

  try {
    const raw = await readFile(targetPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseBuddyConfig(parsed);
  } catch (error) {
    if (isMissingFileError(error)) {
      return {};
    }

    throw new Error(`Failed to read config at ${targetPath}: ${getErrorMessage(error)}`);
  }
}

export async function writeBuddyConfigFile(
  config: BuddyConfig,
  storageDir = defaultStorageDir(),
): Promise<void> {
  const normalized = parseBuddyConfig(config);
  const targetPath = configFilePath(storageDir);
  const tempPath = path.join(
    storageDir,
    `.config.${process.pid}.${Date.now().toString(36)}.tmp`,
  );
  const payload = JSON.stringify(normalized, null, 2);

  await mkdir(storageDir, { recursive: true });
  await writeFile(tempPath, payload, "utf8");
  await rename(tempPath, targetPath);
}

export async function updateBuddyConfigFile(
  updates: BuddyConfig,
  storageDir = defaultStorageDir(),
): Promise<BuddyConfig> {
  const current = await readBuddyConfigFile(storageDir);
  const next = parseBuddyConfig({
    ...current,
    ...compactConfig(updates),
  });

  await writeBuddyConfigFile(next, storageDir);
  return next;
}

function readEnvConfig(): BuddyConfig {
  const explicitProvider = normalizeProvider(process.env.BUDDY_PROVIDER);
  const openaiKey = process.env.OPENAI_API_KEY ?? process.env.DASHSCOPE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let provider = explicitProvider;
  let apiKey: string | undefined;

  if (provider === "anthropic") {
    apiKey = anthropicKey;
  } else if (provider === "openai" || provider === "custom") {
    apiKey = openaiKey;
  } else if (anthropicKey && !openaiKey) {
    provider = "anthropic";
    apiKey = anthropicKey;
  } else if (openaiKey) {
    provider = "openai";
    apiKey = openaiKey;
  }

  return compactConfig({
    provider,
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL ?? process.env.BUDDY_MODEL,
    observerModel: process.env.OPENAI_OBSERVER_MODEL,
  });
}

function parseBuddyConfig(value: unknown): BuddyConfig {
  if (!isPlainObject(value)) {
    throw new Error("Config file must contain a JSON object.");
  }

  const provider = value.provider;
  const model = value.model;
  const observerModel = value.observerModel;
  const apiKey = value.apiKey;
  const baseUrl = value.baseUrl;
  const language = value.language;

  if (provider !== undefined && !isValidProvider(provider)) {
    throw new Error("Config `provider` must be one of: openai, anthropic, custom.");
  }

  if (model !== undefined && typeof model !== "string") {
    throw new Error("Config `model` must be a string.");
  }

  if (apiKey !== undefined && typeof apiKey !== "string") {
    throw new Error("Config `apiKey` must be a string.");
  }

  if (observerModel !== undefined && typeof observerModel !== "string") {
    throw new Error("Config `observerModel` must be a string.");
  }

  if (baseUrl !== undefined && typeof baseUrl !== "string") {
    throw new Error("Config `baseUrl` must be a string.");
  }

  if (language !== undefined && !isLanguage(language)) {
    throw new Error("Config `language` must be `zh` or `en`.");
  }

  return compactConfig({
    provider,
    model,
    observerModel,
    apiKey,
    baseUrl,
    language,
  });
}

function compactConfig(config: BuddyConfig): BuddyConfig {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  ) as BuddyConfig;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeLanguage(value: unknown): BuddyLanguage {
  return isLanguage(value) ? value : DEFAULT_CONFIG.language;
}

function isLanguage(value: unknown): value is BuddyLanguage {
  return value === "zh" || value === "en";
}

function normalizeProvider(value: unknown): BuddyProvider | undefined {
  return isValidProvider(value) ? value : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidProvider(value: unknown): value is BuddyProvider {
  return value === "openai" || value === "anthropic" || value === "custom";
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
