import os from "node:os";
import { readFile } from "node:fs/promises";

import { configFilePath, defaultStorageDir } from "./paths.js";
import type {
  BuddyConfig,
  BuddyLanguage,
  HatchReadyConfig,
  ResolvedBuddyConfig,
} from "../types/companion.js";

export const DEFAULT_OPENAI_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1";
export const DEFAULT_OPENAI_MODEL = "qwen3.5-plus";

export interface ResolveBuddyConfigOptions {
  model?: string | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  storageDir?: string | undefined;
}

const DEFAULT_CONFIG: Pick<ResolvedBuddyConfig, "provider" | "model" | "language"> = {
  provider: "openai",
  model: DEFAULT_OPENAI_MODEL,
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

  return {
    provider: "openai",
    model: typeof merged.model === "string" ? merged.model.trim() : "",
    apiKey: normalizeOptionalString(merged.apiKey),
    baseUrl: normalizeOptionalString(merged.baseUrl) ?? DEFAULT_OPENAI_BASE_URL,
    language: normalizeLanguage(merged.language),
    storageDir,
  };
}

export function assertHatchReadyConfig(config: ResolvedBuddyConfig): HatchReadyConfig {
  const missing: string[] = [];

  if (!config.apiKey) {
    missing.push("OPENAI_API_KEY or --api-key");
  }

  if (!config.model) {
    missing.push("OPENAI_MODEL or --model");
  }

  if (missing.length > 0) {
    throw new Error(`Missing hatch configuration: ${missing.join(", ")}.`);
  }

  const apiKey = config.apiKey;
  const model = config.model;
  if (!apiKey) {
    throw new Error("Missing hatch configuration: OPENAI_API_KEY or --api-key.");
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

function readEnvConfig(): BuddyConfig {
  return compactConfig({
    apiKey: process.env.OPENAI_API_KEY ?? process.env.DASHSCOPE_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL,
  });
}

function parseBuddyConfig(value: unknown): BuddyConfig {
  if (!isPlainObject(value)) {
    throw new Error("Config file must contain a JSON object.");
  }

  const provider = value.provider;
  const model = value.model;
  const apiKey = value.apiKey;
  const baseUrl = value.baseUrl;
  const language = value.language;

  if (provider !== undefined && provider !== "openai") {
    throw new Error("Only provider `openai` is supported in Phase 2.");
  }

  if (model !== undefined && typeof model !== "string") {
    throw new Error("Config `model` must be a string.");
  }

  if (apiKey !== undefined && typeof apiKey !== "string") {
    throw new Error("Config `apiKey` must be a string.");
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
