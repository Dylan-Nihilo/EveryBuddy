import type { AIProvider } from "./types.js";
export interface OpenAICompatibleProviderOptions {
    apiKey: string;
    model: string;
    baseUrl?: string | undefined;
    systemPrompt?: string | undefined;
    requestTimeoutMs?: number | undefined;
}
export declare const DEFAULT_SYSTEM_PROMPT = "You create concise terminal companion metadata. Follow the user request exactly and return only the requested JSON.";
export declare class OpenAICompatibleProvider implements AIProvider {
    readonly modelId: string;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly systemPrompt;
    private readonly requestTimeoutMs;
    private readonly disableThinking;
    constructor(options: OpenAICompatibleProviderOptions);
    complete(prompt: string): Promise<string>;
}
export declare function shouldDisableThinking(baseUrl: string): boolean;
