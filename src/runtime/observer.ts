import path from "node:path";

import { createProvider } from "../soul/providers/index.js";
import type { AIProvider } from "../soul/providers/types.js";
import { DEFAULT_OBSERVER_PROFILE } from "../soul/profile.js";
import { resolveBuddyConfig } from "../storage/config.js";
import type { BuddyLanguage, CompanionRecord, ObserverProfile } from "../types/companion.js";
import type {
  CommandTracker,
  CommandWindowEntry,
  EventImportance,
  MemoryEntry,
  ObservedCommand,
  ObserverDecision,
  ShellEvent,
  SidecarState,
  SidecarStatus,
} from "./types.js";

const OBSERVER_SYSTEM_PROMPT = [
  "You decide whether a terminal companion should speak in a small bubble.",
  "The companion is a separate watcher, not the main assistant.",
  "You receive a recent window of terminal commands plus the companion personality.",
  "Return strict JSON only.",
].join(" ");
const DEFAULT_LANGUAGE: BuddyLanguage = "zh";
const DEFAULT_LLM_COOLDOWN_MS = 6_000;
const DEDUPE_WINDOW_MS = 18_000;
const MEMORY_LIMIT = 5;
const COMMAND_WINDOW_LIMIT = 5;

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

export class CompanionObserver {
  private readonly companion: CompanionRecord | null;
  private readonly language: BuddyLanguage;
  private readonly provider: AIProvider | undefined;
  private readonly now: () => number;
  private readonly llmCooldownMs: number | undefined;

  constructor(options: CompanionObserverOptions) {
    this.companion = options.companion;
    this.language = options.language ?? DEFAULT_LANGUAGE;
    this.provider = options.provider;
    this.now = options.now ?? Date.now;
    this.llmCooldownMs = options.llmCooldownMs;
  }

  observe(event: ShellEvent, state: Pick<SidecarState, "commandTrackers" | "status">): ObserverReactionPlan {
    const command = event.command
      ? observeCommand(event.command, event.cwd, this.companion?.soul.name)
      : undefined;
    const tracker = state.commandTrackers[event.paneId];
    const effectiveCommand =
      command ??
      (tracker ? observeCommand(tracker.commandRaw, tracker.cwd, this.companion?.soul.name) : undefined);
    const durationMs = tracker ? Math.max(0, event.timestamp - tracker.startedAt) : undefined;

    if (event.type === "pane_active") {
      return {
        status: "idle",
        reactionMode: state.status === "typing" ? "clear" : "preserve",
        reactionText: undefined,
        importance: "silent",
        command: undefined,
        durationMs: undefined,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: false,
        pulse: false,
      };
    }

    if (event.type === "input_update") {
      return {
        status: command ? "typing" : "idle",
        reactionMode: "preserve",
        reactionText: undefined,
        importance: command?.addressedToBuddy ? "addressed" : command ? "low" : "silent",
        command,
        durationMs: undefined,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: command?.addressedToBuddy ?? false,
        pulse: command?.addressedToBuddy ?? false,
      };
    }

    if (event.type === "command_start") {
      return {
        status: "thinking",
        reactionMode: "preserve",
        reactionText: undefined,
        importance: effectiveCommand?.addressedToBuddy ? "addressed" : "low",
        command: effectiveCommand,
        durationMs: undefined,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: effectiveCommand?.addressedToBuddy ?? false,
        pulse: effectiveCommand?.addressedToBuddy ?? false,
      };
    }

    return {
      status: "finished",
      reactionMode: "clear",
      reactionText: undefined,
      importance: effectiveCommand?.addressedToBuddy ? "addressed" : "low",
      command: effectiveCommand,
      durationMs,
      shouldGenerateModel: effectiveCommand !== undefined,
      shouldRemember: false,
      addressedToBuddy: effectiveCommand?.addressedToBuddy ?? false,
      pulse: effectiveCommand?.addressedToBuddy ?? false,
    };
  }

  async maybeGenerateDecision(
    plan: ObserverReactionPlan,
    event: ShellEvent,
    state: Pick<
      SidecarState,
      "commandWindows" | "memory" | "recentReaction" | "recentNotableReactionAt" | "status"
    >,
  ): Promise<ObserverDecision | undefined> {
    if (!this.provider || !this.companion || !plan.shouldGenerateModel || !plan.command) {
      return undefined;
    }

    const commandWindow = state.commandWindows[event.paneId] ?? [];
    const profile = this.companion.soul.observerProfile ?? DEFAULT_OBSERVER_PROFILE;
    const now = this.now();

    if (commandWindow.length < minimumWindowSize(profile)) {
      return undefined;
    }

    const cooldownMs = this.llmCooldownMs ?? cooldownMsForProfile(profile);
    if (
      state.recentNotableReactionAt !== undefined &&
      now - state.recentNotableReactionAt < cooldownMs
    ) {
      return undefined;
    }

    try {
      const response = await this.provider.complete(
        buildObserverPrompt({
          companion: this.companion,
          commandWindow,
          command: plan.command,
          memory: selectRecentBubbleMemory(state.memory),
          event,
          language: this.language,
          status: state.status,
          observerProfile: profile,
        }),
      );
      const decision = parseObserverDecision(response);
      if (!decision.shouldSpeak || !decision.reaction) {
        return undefined;
      }

      const normalized = normalizeObserverResponse(decision.reaction, commandWindow);
      if (!normalized) {
        return undefined;
      }

      if (
        state.recentReaction &&
        now - state.recentReaction.at < DEDUPE_WINDOW_MS &&
        isNearDuplicateReaction(state.recentReaction.text, normalized)
      ) {
        return undefined;
      }

      return {
        ...decision,
        reaction: normalized,
      };
    } catch {
      return undefined;
    }
  }

  async maybeGenerateReaction(
    plan: ObserverReactionPlan,
    event: ShellEvent,
    state: Pick<
      SidecarState,
      "commandWindows" | "memory" | "recentReaction" | "recentNotableReactionAt" | "status"
    >,
  ): Promise<string | undefined> {
    return (await this.maybeGenerateDecision(plan, event, state))?.reaction;
  }
}

export async function createCompanionObserver(
  companion: CompanionRecord | null,
): Promise<CompanionObserver> {
  let language = DEFAULT_LANGUAGE;
  let provider: AIProvider | undefined;

  try {
    const config = await resolveBuddyConfig();
    language = config.language;

    if (config.apiKey) {
      provider = createProvider({
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.observerModel ?? config.model,
        baseUrl: config.baseUrl,
        systemPrompt: OBSERVER_SYSTEM_PROMPT,
      });
    }
  } catch {
    // Fall back to a silent observer when config is not available.
  }

  return new CompanionObserver({
    companion,
    language,
    provider,
  });
}

export function observeCommand(
  command: string,
  cwd: string,
  companionName?: string,
): ObservedCommand {
  const raw = command.trim();
  const normalized = normalizeCommand(raw);
  return {
    raw,
    normalized,
    cwdRole: describeCwdRole(cwd),
    addressedToBuddy: isDirectBuddyAddress(normalized, companionName),
  };
}

export function classifyEventImportance(params: {
  event: ShellEvent;
  command: ObservedCommand | undefined;
  memory: MemoryEntry[];
  durationMs?: number | undefined;
}): EventImportance {
  const { event, command } = params;

  if (!command) {
    return "silent";
  }

  if (command.addressedToBuddy) {
    return "addressed";
  }

  if (event.type === "input_update") {
    return "low";
  }

  if (event.type === "command_start") {
    return "low";
  }

  return "low";
}

export function buildCommandTracker(
  event: ShellEvent,
  command: ObservedCommand,
  _importance: EventImportance,
): CommandTracker {
  return {
    paneId: event.paneId,
    commandRaw: command.raw,
    startedAt: event.timestamp,
    cwd: event.cwd,
    addressedToBuddy: command.addressedToBuddy,
    cwdRole: command.cwdRole,
  };
}

export function buildCommandWindowEntry(params: {
  event: ShellEvent;
  command: ObservedCommand;
  durationMs?: number | undefined;
}): CommandWindowEntry {
  const { event, command, durationMs } = params;

  return {
    command: command.raw,
    normalizedCommand: command.normalized,
    cwd: event.cwd,
    cwdRole: command.cwdRole,
    exitCode: event.exitCode,
    durationMs,
    timestamp: event.timestamp,
    addressedToBuddy: command.addressedToBuddy,
  };
}

export function rememberCommandWindowEntry(
  entries: CommandWindowEntry[],
  entry: CommandWindowEntry,
): CommandWindowEntry[] {
  return [...entries, entry].slice(-COMMAND_WINDOW_LIMIT);
}

export function buildMemoryEntry(params: {
  event: ShellEvent;
  command: ObservedCommand;
  importance: EventImportance;
  durationMs?: number | undefined;
  reactionText?: string | undefined;
  topic?: string | undefined;
  mood?: string | undefined;
}): MemoryEntry {
  const { event, command, importance, durationMs, reactionText, topic, mood } = params;

  return {
    timestamp: event.timestamp,
    commandRaw: command.raw,
    commandNormalized: command.normalized,
    cwd: event.cwd,
    cwdRole: command.cwdRole,
    outcome:
      command.addressedToBuddy
        ? "addressed"
        : event.exitCode === undefined
          ? "unknown"
          : event.exitCode === 0
            ? "success"
            : "failure",
    exitCode: event.exitCode,
    durationMs,
    importance,
    reactionText,
    addressedToBuddy: command.addressedToBuddy,
    topic,
    mood,
  };
}

export function rememberMemoryEntry(memory: MemoryEntry[], entry: MemoryEntry): MemoryEntry[] {
  return [entry, ...memory].slice(0, MEMORY_LIMIT);
}

export function buildObserverPrompt(context: ObserverPromptContext): string {
  const { companion, commandWindow, command, memory, event, language, status, observerProfile } = context;
  const languageInstruction =
    language === "zh"
      ? "Use Simplified Chinese. Keep `reaction` to one short sentence, ideally under 16 Chinese characters."
      : "Use English. Keep `reaction` to one short sentence, under 12 words.";
  const recentWindow = commandWindow
    .map((entry, index) => {
      return `${index + 1}. command=${entry.command}; cwd=${entry.cwdRole}; exit=${entry.exitCode ?? "?"}; duration=${entry.durationMs ?? "?"}ms; addressed=${entry.addressedToBuddy ? "yes" : "no"}`;
    })
    .join("\n");
  const recentMemory =
    memory.length > 0
      ? memory
          .map((entry, index) => {
            return `${index + 1}. reaction=${entry.reactionText ?? "(none)"}; outcome=${entry.outcome}; topic=${entry.topic ?? "(none)"}; mood=${entry.mood ?? "(none)"}`;
          })
          .join("\n")
      : "(none)";

  return [
    `A small ${companion.bones.species} named ${companion.soul.name} sits beside the user's terminal and occasionally comments in a speech bubble.`,
    `You are ${companion.soul.name}. You are a separate watcher, not the main assistant.`,
    "",
    `Personality: ${companion.soul.personality}`,
    `Observer voice: ${observerProfile.voice}`,
    `Observer chattiness: ${observerProfile.chattiness}/5`,
    `Observer sharpness: ${observerProfile.sharpness}/5`,
    `Observer patience: ${observerProfile.patience}/5`,
    `Current pane status: ${status}`,
    `Latest cwd role: ${command.cwdRole}`,
    `Latest command addressed you directly: ${command.addressedToBuddy ? "yes" : "no"}`,
    `Latest command exit code: ${event.exitCode ?? "unknown"}`,
    "",
    "Recent command window (oldest to newest):",
    recentWindow || "(none)",
    "",
    "Recent bubbles:",
    recentMemory,
    "",
    "Rules:",
    "- Decide whether the current command window is worth commenting on.",
    "- React to the pattern and mood, not the raw command text.",
    "- Do not restate the command line.",
    "- Stay sharp and playful, never mean-spirited.",
    "- Avoid repeating the recent bubbles.",
    "- If this moment is not worth a bubble, set shouldSpeak to false and leave reaction empty.",
    "- If speaking, reaction must be one line only.",
    "- No markdown, no code fences, no quotes around reaction text.",
    `- ${languageInstruction}`,
    "",
    'Return strict JSON only: {"shouldSpeak":true|false,"reaction":"...","topic":"...","mood":"..."}',
  ].join("\n");
}

export function parseObserverDecision(response: string): ObserverDecision {
  const stripped = stripMarkdownFence(response).trim();
  const parsed = JSON.parse(stripped) as unknown;

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Observer response must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  const shouldSpeak = record.shouldSpeak;
  const reaction = normalizeOptionalField(record.reaction);
  const topic = normalizeOptionalField(record.topic);
  const mood = normalizeOptionalField(record.mood);

  if (typeof shouldSpeak !== "boolean") {
    throw new Error("Observer response `shouldSpeak` must be a boolean.");
  }

  if (shouldSpeak && (!reaction || reaction.length === 0)) {
    throw new Error("Observer response `reaction` must be non-empty when `shouldSpeak` is true.");
  }

  return {
    shouldSpeak,
    ...(reaction ? { reaction } : {}),
    ...(topic ? { topic } : {}),
    ...(mood ? { mood } : {}),
  };
}

export function normalizeObserverResponse(
  response: string,
  commandWindow?: CommandWindowEntry[],
): string | undefined {
  const stripped = stripMarkdownFence(response).trim();
  if (stripped.length === 0) {
    return undefined;
  }

  const firstLine = stripped
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) {
    return undefined;
  }

  const unquoted = stripMatchingQuotes(firstLine);
  const normalized = unquoted.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (isCommandEcho(normalized, commandWindow)) {
    return undefined;
  }

  return normalized;
}

function selectRecentBubbleMemory(memory: MemoryEntry[]): MemoryEntry[] {
  return memory.filter((entry) => entry.reactionText && entry.reactionText.length > 0).slice(0, 2);
}

function minimumWindowSize(profile: ObserverProfile): number {
  if (profile.chattiness >= 4) {
    return 1;
  }

  if (profile.chattiness >= 2) {
    return 2;
  }

  return 3;
}

function cooldownMsForProfile(profile: ObserverProfile): number {
  switch (profile.chattiness) {
    case 5:
      return 2_000;
    case 4:
      return 3_000;
    case 3:
      return 4_500;
    case 2:
      return 6_000;
    case 1:
    default:
      return 8_000;
  }
}

function normalizeCommand(command?: string): string {
  return command?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function isDirectBuddyAddress(normalized: string, companionName?: string): boolean {
  if (normalized === "/buddy" || normalized.startsWith("/buddy ")) {
    return true;
  }

  if (!companionName) {
    return false;
  }

  const buddyName = normalizeCommand(companionName);
  return normalized === buddyName || normalized.startsWith(`${buddyName} `);
}

function describeCwdRole(cwd: string): string {
  const home = process.env.HOME?.trim();
  if (home && cwd === home) {
    return "home";
  }

  const base = path.basename(cwd);
  return base.length > 0 ? base : cwd;
}

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:[\w-]+)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function stripMatchingQuotes(value: string): string {
  const trimmed = value.trim();
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
  ];

  for (const [left, right] of pairs) {
    if (trimmed.startsWith(left) && trimmed.endsWith(right)) {
      return trimmed.slice(left.length, trimmed.length - right.length).trim();
    }
  }

  return trimmed;
}

function normalizeOptionalField(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isCommandEcho(response: string, commandWindow?: CommandWindowEntry[]): boolean {
  if (!commandWindow || commandWindow.length === 0) {
    return false;
  }

  const normalizedResponse = normalizeCommand(response);
  return commandWindow.some((entry) => {
    const normalizedCommand = normalizeCommand(entry.normalizedCommand || entry.command);
    if (normalizedCommand.length === 0) {
      return false;
    }

    if (normalizedResponse === normalizedCommand || normalizedResponse.includes(normalizedCommand)) {
      return true;
    }

    const commandTokens = normalizedCommand.split(" ").filter((token) => token.length >= 3);
    if (commandTokens.length === 0) {
      return false;
    }

    const matchedTokens = commandTokens.filter((token) => normalizedResponse.includes(token)).length;
    return matchedTokens >= Math.min(2, commandTokens.length);
  });
}

function isNearDuplicateReaction(previous: string, next: string): boolean {
  return normalizeCommand(previous) === normalizeCommand(next);
}
