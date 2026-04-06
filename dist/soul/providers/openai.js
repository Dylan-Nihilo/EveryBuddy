const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
export const DEFAULT_SYSTEM_PROMPT = "You create concise terminal companion metadata. Follow the user request exactly and return only the requested JSON.";
export class OpenAICompatibleProvider {
    modelId;
    apiKey;
    baseUrl;
    systemPrompt;
    requestTimeoutMs;
    disableThinking;
    constructor(options) {
        this.modelId = options.model;
        this.apiKey = options.apiKey;
        this.baseUrl = normalizeBaseUrl(options.baseUrl);
        this.systemPrompt = options.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT;
        this.requestTimeoutMs = normalizeTimeoutMs(options.requestTimeoutMs);
        this.disableThinking = shouldDisableThinking(this.baseUrl);
    }
    async complete(prompt) {
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, this.requestTimeoutMs);
        const requestBody = {
            model: this.modelId,
            messages: [
                { role: "system", content: this.systemPrompt },
                { role: "user", content: prompt },
            ],
        };
        if (this.disableThinking) {
            requestBody.enable_thinking = false;
        }
        let response;
        try {
            response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
        }
        catch (error) {
            if (isAbortError(error)) {
                throw new Error(`Provider request timed out after ${Math.ceil(this.requestTimeoutMs / 1000)}s.`);
            }
            throw new Error(`Provider request failed: ${getErrorMessage(error)}`);
        }
        finally {
            clearTimeout(timeout);
        }
        const payload = (await response.json().catch(async () => {
            const text = await response.text();
            throw new Error(`Provider returned invalid JSON: ${text}`);
        }));
        if (!response.ok) {
            throw new Error(`Provider request failed (${response.status} ${response.statusText}): ${extractErrorMessage(payload)}`);
        }
        const choices = payload.choices;
        const content = Array.isArray(choices) &&
            typeof choices[0] === "object" &&
            choices[0] !== null &&
            "message" in choices[0] &&
            typeof choices[0].message === "object" &&
            choices[0].message !== null &&
            "content" in choices[0].message
            ? choices[0].message.content
            : undefined;
        if (typeof content !== "string" || content.trim().length === 0) {
            throw new Error("Provider returned an empty response.");
        }
        return content;
    }
}
function normalizeBaseUrl(value) {
    const normalized = value?.trim() || DEFAULT_BASE_URL;
    return normalized.replace(/\/+$/, "");
}
function normalizeTimeoutMs(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return DEFAULT_REQUEST_TIMEOUT_MS;
    }
    return Math.floor(value);
}
export function shouldDisableThinking(baseUrl) {
    try {
        const url = new URL(baseUrl);
        return url.hostname.endsWith("dashscope.aliyuncs.com");
    }
    catch {
        return false;
    }
}
function isAbortError(error) {
    return ((error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"));
}
function extractErrorMessage(value) {
    if (typeof value === "object" && value !== null) {
        const record = value;
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
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=openai.js.map