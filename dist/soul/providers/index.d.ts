import type { BuddyProvider } from "../../types/companion.js";
import type { AIProvider } from "./types.js";
export interface CreateProviderParams {
    provider: BuddyProvider;
    apiKey: string;
    model: string;
    baseUrl?: string | undefined;
    systemPrompt?: string | undefined;
}
export declare function createProvider(params: CreateProviderParams): AIProvider;
