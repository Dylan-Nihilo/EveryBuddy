import type { AIProvider } from "./types.js";
export interface AnthropicProviderOptions {
    apiKey: string;
    model: string;
    baseUrl?: string | undefined;
    systemPrompt?: string | undefined;
    requestTimeoutMs?: number | undefined;
}
export declare class AnthropicProvider implements AIProvider {
    readonly modelId: string;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly systemPrompt;
    private readonly requestTimeoutMs;
    constructor(options: AnthropicProviderOptions);
    complete(prompt: string): Promise<string>;
}
