export interface AIProvider {
    readonly modelId: string;
    complete(prompt: string): Promise<string>;
}
