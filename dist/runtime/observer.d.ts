import type { AIProvider } from "../soul/providers/types.js";
import type { BuddyLanguage, CompanionRecord, ObserverProfile } from "../types/companion.js";
import type { CommandTracker, CommandWindowEntry, EventImportance, MemoryEntry, ObservedCommand, ObserverDecision, ShellEvent, SidecarState, SidecarStatus } from "./types.js";
type ReactionMode = "clear" | "persistent" | "transient" | "preserve";
export interface ObserverReactionPlan {
    status: SidecarStatus;
    reactionMode: ReactionMode;
    reactionText: string | undefined;
    importance: EventImportance;
    command: ObservedCommand | undefined;
    durationMs: number | undefined;
    shouldGenerateModel: boolean;
    shouldRemember: boolean;
    addressedToBuddy: boolean;
    pulse: boolean;
}
export interface ObserverPromptContext {
    companion: CompanionRecord;
    commandWindow: CommandWindowEntry[];
    command: ObservedCommand;
    memory: MemoryEntry[];
    event: ShellEvent;
    language: BuddyLanguage;
    status: SidecarStatus;
    observerProfile: ObserverProfile;
}
export interface CompanionObserverOptions {
    companion: CompanionRecord | null;
    language?: BuddyLanguage | undefined;
    provider?: AIProvider | undefined;
    now?: (() => number) | undefined;
    llmCooldownMs?: number | undefined;
}
export declare class CompanionObserver {
    private readonly companion;
    private readonly language;
    private readonly provider;
    private readonly now;
    private readonly llmCooldownMs;
    constructor(options: CompanionObserverOptions);
    observe(event: ShellEvent, state: Pick<SidecarState, "commandTrackers" | "status">): ObserverReactionPlan;
    maybeGenerateDecision(plan: ObserverReactionPlan, event: ShellEvent, state: Pick<SidecarState, "commandWindows" | "memory" | "recentReaction" | "recentNotableReactionAt" | "status">): Promise<ObserverDecision | undefined>;
    maybeGenerateReaction(plan: ObserverReactionPlan, event: ShellEvent, state: Pick<SidecarState, "commandWindows" | "memory" | "recentReaction" | "recentNotableReactionAt" | "status">): Promise<string | undefined>;
}
export declare function createCompanionObserver(companion: CompanionRecord | null): Promise<CompanionObserver>;
export declare function observeCommand(command: string, cwd: string, companionName?: string): ObservedCommand;
export declare function classifyEventImportance(params: {
    event: ShellEvent;
    command: ObservedCommand | undefined;
    memory: MemoryEntry[];
    durationMs?: number | undefined;
}): EventImportance;
export declare function buildCommandTracker(event: ShellEvent, command: ObservedCommand, _importance: EventImportance): CommandTracker;
export declare function buildCommandWindowEntry(params: {
    event: ShellEvent;
    command: ObservedCommand;
    durationMs?: number | undefined;
}): CommandWindowEntry;
export declare function rememberCommandWindowEntry(entries: CommandWindowEntry[], entry: CommandWindowEntry): CommandWindowEntry[];
export declare function buildMemoryEntry(params: {
    event: ShellEvent;
    command: ObservedCommand;
    importance: EventImportance;
    durationMs?: number | undefined;
    reactionText?: string | undefined;
    topic?: string | undefined;
    mood?: string | undefined;
}): MemoryEntry;
export declare function rememberMemoryEntry(memory: MemoryEntry[], entry: MemoryEntry): MemoryEntry[];
export declare function buildObserverPrompt(context: ObserverPromptContext): string;
export declare function parseObserverDecision(response: string): ObserverDecision;
export declare function normalizeObserverResponse(response: string, commandWindow?: CommandWindowEntry[]): string | undefined;
export {};
