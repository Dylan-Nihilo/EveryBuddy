export interface PromptIO {
    readonly isInteractive: boolean;
    readonly supportsAnsi: boolean;
    write(text: string): void;
    writeLine(text?: string): void;
    prompt(question: string): Promise<string>;
    confirm(question: string, defaultValue?: boolean): Promise<boolean>;
}
export declare function createConsoleIO(): PromptIO;
