import type { AIProvider } from "./types.js";

export interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string | undefined;
  systemPrompt?: string | undefined;
  requestTimeoutMs?: number | undefined;
}

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_SYSTEM_PROMPT =
  "You create concise terminal companion metadata. Follow the user request exactly and return only the requested JSON.";

export class AnthropicProvider implements AIProvider {
  readonly modelId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly systemPrompt: string;
  private readonly requestTimeoutMs: number;

  constructor(options: AnthropicProviderOptions) {
    this.modelId = options.model;
    this.apiKey = options.apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.systemPrompt = options.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
    this.requestTimeoutMs = normalizeTimeoutMs(options.requestTimeoutMs);
  }

  async complete(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, this.requestTimeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 1024,
          system: this.systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          `Provider request timed out after ${Math.ceil(this.requestTimeoutMs / 1000)}s.`,
        );
      }

      throw new Error(`Provider request failed: ${getErrorMessage(error)}`);
    } finally {
      clearTimeout(timeout);
    }

    const payload = (await response.json().catch(async () => {
      const text = await response.text();
      throw new Error(`Provider returned invalid JSON: ${text}`);
    })) as Record<string, unknown>;

    if (!response.ok) {
      throw new Error(
        `Provider request failed (${response.status} ${response.statusText}): ${extractErrorMessage(payload)}`,
      );
    }

    const content = payload.content;
    const text =
      Array.isArray(content) &&
      content.length > 0 &&
      typeof content[0] === "object" &&
      content[0] !== null &&
      "text" in content[0] &&
      typeof content[0].text === "string"
        ? content[0].text
        : undefined;

    if (!text || text.trim().length === 0) {
      throw new Error("Provider returned an empty response.");
    }

    return text;
  }
}

function normalizeBaseUrl(value?: string): string {
  const normalized = value?.trim() || DEFAULT_BASE_URL;
  return normalized.replace(/\/+$/, "");
}

function normalizeTimeoutMs(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return Math.floor(value);
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}

function extractErrorMessage(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const error = record.error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = error.message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    }
  }

  return "unknown provider error";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
