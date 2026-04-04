import type { BuddyProvider } from "../../types/companion.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai.js";
import type { AIProvider } from "./types.js";

export interface CreateProviderParams {
  provider: BuddyProvider;
  apiKey: string;
  model: string;
  baseUrl?: string | undefined;
  systemPrompt?: string | undefined;
}

export function createProvider(params: CreateProviderParams): AIProvider {
  switch (params.provider) {
    case "anthropic":
      return new AnthropicProvider({
        apiKey: params.apiKey,
        model: params.model,
        baseUrl: params.baseUrl,
        systemPrompt: params.systemPrompt,
      });
    case "openai":
    case "custom":
    default:
      return new OpenAICompatibleProvider({
        apiKey: params.apiKey,
        model: params.model,
        baseUrl: params.baseUrl,
        systemPrompt: params.systemPrompt,
      });
  }
}
