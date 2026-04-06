import { AnthropicProvider } from "./anthropic.js";
import { OpenAICompatibleProvider } from "./openai.js";
export function createProvider(params) {
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
//# sourceMappingURL=index.js.map