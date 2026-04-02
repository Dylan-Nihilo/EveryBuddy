import path from "node:path";

import { OpenAICompatibleProvider } from "../soul/providers/openai.js";
import type { AIProvider } from "../soul/providers/types.js";
import { resolveBuddyConfig } from "../storage/config.js";
import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";
import type {
  CommandTracker,
  EventImportance,
  MemoryEntry,
  ObservedCommand,
  ObservedCommandCategory,
  ShellEvent,
  SidecarState,
  SidecarStatus,
} from "./types.js";

const OBSERVER_SYSTEM_PROMPT = [
  "You write the speech bubble text for a terminal companion.",
  "The companion is a separate watcher, not the main assistant.",
  "Return only one short line of bubble text.",
  "Do not narrate. Do not explain. Do not restate the raw command.",
].join(" ");
const DEFAULT_LANGUAGE: BuddyLanguage = "zh";
const DEFAULT_LLM_COOLDOWN_MS = 6_000;
const DEDUPE_WINDOW_MS = 18_000;
const MEMORY_LIMIT = 5;
const MAX_REACTION_LENGTH = 72;
const LONG_COMMAND_MS = 20_000;

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
  command: ObservedCommand;
  memory: MemoryEntry[];
  event: ShellEvent;
  language: BuddyLanguage;
  durationMs: number | undefined;
  importance: EventImportance;
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
  private readonly llmCooldownMs: number;

  constructor(options: CompanionObserverOptions) {
    this.companion = options.companion;
    this.language = options.language ?? DEFAULT_LANGUAGE;
    this.provider = options.provider;
    this.now = options.now ?? Date.now;
    this.llmCooldownMs = options.llmCooldownMs ?? DEFAULT_LLM_COOLDOWN_MS;
  }

  observe(event: ShellEvent, state: Pick<SidecarState, "memory" | "commandTrackers" | "status">): ObserverReactionPlan {
    const command = event.command ? observeCommand(event.command, event.cwd, this.companion?.soul.name) : undefined;
    const tracker = state.commandTrackers[event.paneId];
    const effectiveCommand =
      command ?? (tracker ? observeCommand(tracker.commandRaw, tracker.cwd, this.companion?.soul.name) : undefined);
    const durationMs = tracker ? Math.max(0, event.timestamp - tracker.startedAt) : undefined;
    const importance = classifyEventImportance({
      event,
      command: effectiveCommand,
      memory: state.memory,
      durationMs,
    });

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
      if (!command) {
        return {
          status: "idle",
          reactionMode: "clear",
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

      if (command.addressedToBuddy) {
        return {
          status: "typing",
          reactionMode: "persistent",
          reactionText: fallbackReactionForDirectAddress("input", this.language),
          importance,
          command,
          durationMs: undefined,
          shouldGenerateModel: false,
          shouldRemember: false,
          addressedToBuddy: true,
          pulse: true,
        };
      }

      return {
        status: "typing",
        reactionMode: "clear",
        reactionText: undefined,
        importance,
        command,
        durationMs: undefined,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: false,
        pulse: false,
      };
    }

    if (event.type === "command_start") {
      if (!effectiveCommand) {
        return {
          status: "thinking",
          reactionMode: "preserve",
          reactionText: undefined,
          importance: "low",
          command: undefined,
          durationMs: undefined,
          shouldGenerateModel: false,
          shouldRemember: false,
          addressedToBuddy: false,
          pulse: false,
        };
      }

      return {
        status: "thinking",
        reactionMode:
          importance === "high" || importance === "addressed" ? "transient" : "preserve",
        reactionText:
          importance === "high" || importance === "addressed"
            ? fallbackReactionForStart(effectiveCommand, this.language)
            : undefined,
        importance,
        command: effectiveCommand,
        durationMs: undefined,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: effectiveCommand.addressedToBuddy,
        pulse: effectiveCommand.addressedToBuddy,
      };
    }

    if (!effectiveCommand) {
      return {
        status: "finished",
        reactionMode: "clear",
        reactionText: undefined,
        importance: "silent",
        command: undefined,
        durationMs,
        shouldGenerateModel: false,
        shouldRemember: false,
        addressedToBuddy: false,
        pulse: false,
      };
    }

    const shouldGenerateModel = importance === "high" || importance === "addressed";
    const reactionText =
      importance === "silent"
        ? undefined
        : fallbackReactionForEnd({
            command: effectiveCommand,
            exitCode: event.exitCode,
            language: this.language,
            durationMs,
          });

    return {
      status: "finished",
      reactionMode: reactionText ? "transient" : "clear",
      reactionText,
      importance,
      command: effectiveCommand,
      durationMs,
      shouldGenerateModel,
      shouldRemember:
        importance === "high" || importance === "addressed" || (event.exitCode ?? 0) !== 0,
      addressedToBuddy: effectiveCommand.addressedToBuddy,
      pulse: shouldPulse(effectiveCommand, event.exitCode),
    };
  }

  async maybeGenerateReaction(
    plan: ObserverReactionPlan,
    event: ShellEvent,
    state: Pick<SidecarState, "memory" | "recentReaction" | "recentNotableReactionAt">,
  ): Promise<string | undefined> {
    if (!this.provider || !this.companion || !plan.shouldGenerateModel || !plan.command) {
      return undefined;
    }

    const now = this.now();
    const bypassCooldown = plan.importance === "addressed" || (event.exitCode ?? 0) !== 0;

    if (
      !bypassCooldown &&
      state.recentNotableReactionAt !== undefined &&
      now - state.recentNotableReactionAt < this.llmCooldownMs
    ) {
      return undefined;
    }

    if (
      state.recentReaction &&
      now - state.recentReaction.at < DEDUPE_WINDOW_MS &&
      state.recentReaction.category === plan.command.category
    ) {
      return undefined;
    }

    try {
      const response = await this.provider.complete(
        buildObserverPrompt({
          companion: this.companion,
          command: plan.command,
          memory: selectRelevantMemoryEntries(state.memory, plan.command),
          event,
          language: this.language,
          durationMs: plan.durationMs,
          importance: plan.importance,
        }),
      );
      const normalized = normalizeObserverResponse(response, plan.command);
      if (!normalized) {
        return undefined;
      }

      if (state.recentReaction && isNearDuplicateReaction(state.recentReaction.text, normalized)) {
        return undefined;
      }

      return normalized;
    } catch {
      return undefined;
    }
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
      provider = new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        systemPrompt: OBSERVER_SYSTEM_PROMPT,
      });
    }
  } catch {
    // Fall back to static reactions if runtime config cannot be resolved.
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
  const addressedToBuddy = isDirectBuddyAddress(normalized, companionName);
  const category = classifyCommandCategory(normalized, addressedToBuddy);

  return {
    raw,
    normalized,
    category,
    significance: classifySignificance(category),
    cwdRole: describeCwdRole(cwd),
    addressedToBuddy,
  };
}

export function classifyEventImportance(params: {
  event: ShellEvent;
  command: ObservedCommand | undefined;
  memory: MemoryEntry[];
  durationMs?: number | undefined;
}): EventImportance {
  const { event, command, memory, durationMs } = params;

  if (!command) {
    return "silent";
  }

  if (command.addressedToBuddy) {
    return "addressed";
  }

  if (event.type === "input_update") {
    return isLowSignalCommand(command) ? "silent" : "low";
  }

  if (event.type === "command_start") {
    return isHighSignalCommand(command) ? "high" : "low";
  }

  if ((event.exitCode ?? 0) !== 0) {
    return "high";
  }

  if ((durationMs ?? 0) >= LONG_COMMAND_MS) {
    return "high";
  }

  if (isLowSignalCommand(command)) {
    return "silent";
  }

  if (isRecentDuplicateSuccess(command, memory, event.timestamp)) {
    return "silent";
  }

  return isHighSignalCommand(command) ? "high" : "low";
}

export function buildCommandTracker(
  event: ShellEvent,
  command: ObservedCommand,
  importance: EventImportance,
): CommandTracker {
  return {
    paneId: event.paneId,
    commandRaw: command.raw,
    startedAt: event.timestamp,
    cwd: event.cwd,
    category: command.category,
    importance,
    addressedToBuddy: command.addressedToBuddy,
    significance: command.significance,
    cwdRole: command.cwdRole,
  };
}

export function buildMemoryEntry(params: {
  event: ShellEvent;
  command: ObservedCommand;
  importance: EventImportance;
  durationMs?: number | undefined;
  reactionText?: string | undefined;
}): MemoryEntry {
  const { event, command, importance, durationMs, reactionText } = params;

  return {
    timestamp: event.timestamp,
    commandRaw: command.raw,
    commandNormalized: command.normalized,
    category: command.category,
    cwd: event.cwd,
    outcome: command.addressedToBuddy
      ? "addressed"
      : (event.exitCode ?? 0) === 0
        ? "success"
        : "failure",
    durationMs,
    importance,
    reactionText,
    addressedToBuddy: command.addressedToBuddy,
    significance: command.significance,
    cwdRole: command.cwdRole,
  };
}

export function rememberMemoryEntry(memory: MemoryEntry[], entry: MemoryEntry): MemoryEntry[] {
  return [entry, ...memory].slice(0, MEMORY_LIMIT);
}

export function selectRelevantMemoryEntries(
  memory: MemoryEntry[],
  command: ObservedCommand,
): MemoryEntry[] {
  const preferred = memory.filter(
    (entry) => entry.category === command.category || entry.cwdRole === command.cwdRole,
  );

  return (preferred.length > 0 ? preferred : memory).slice(0, 3);
}

export function buildObserverPrompt(context: ObserverPromptContext): string {
  const { companion, command, event, memory, language, durationMs, importance } = context;
  const languageInstruction =
    language === "zh"
      ? "Use Simplified Chinese. Keep it to one short sentence, ideally under 16 Chinese characters."
      : "Use English. Keep it to one short sentence, under 12 words.";
  const outcome =
    command.addressedToBuddy
      ? "The user addressed you directly."
      : (event.exitCode ?? 0) === 0
        ? "The command finished successfully."
        : `The command failed with exit code ${event.exitCode ?? "unknown"}.`;
  const durationText = durationMs !== undefined ? `${durationMs}ms` : "unknown";
  const recentMemory =
    memory.length > 0
      ? memory
          .map((entry, index) => {
            return `${index + 1}. ${entry.significance} in ${entry.cwdRole}; outcome=${entry.outcome}; reaction=${entry.reactionText ?? "(none)"}`;
          })
          .join("\n")
      : "(none)";

  return [
    `A small ${companion.bones.species} named ${companion.soul.name} sits beside the user's terminal and occasionally comments in a speech bubble.`,
    `You are ${companion.soul.name}. You are a separate watcher, not the main assistant.`,
    "",
    `Personality: ${companion.soul.personality}`,
    `Current project role: ${command.cwdRole}`,
    `Current significance: ${command.significance}`,
    `Current category: ${command.category}`,
    `Current importance: ${importance}`,
    `Observed outcome: ${outcome}`,
    `Observed duration: ${durationText}`,
    `Original cwd: ${event.cwd}`,
    "",
    "Recent memory:",
    recentMemory,
    "",
    "Rules:",
    "- React to the situation, not the raw command text.",
    "- Do not restate the command line.",
    "- Return only the bubble text.",
    "- One line only.",
    "- No markdown, no code fences, no quotes, no prefixes, no explanations.",
    `- ${languageInstruction}`,
  ].join("\n");
}

export function normalizeObserverResponse(
  response: string,
  command?: Pick<ObservedCommand, "normalized" | "raw">,
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

  if (isCommandEcho(normalized, command)) {
    return undefined;
  }

  return normalized.length <= MAX_REACTION_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_REACTION_LENGTH - 3).trimEnd()}...`;
}

export function fallbackReactionForDirectAddress(
  phase: "input" | "finish",
  language: BuddyLanguage,
): string {
  if (language === "en") {
    return phase === "input" ? "I'm here." : "Yes. I'm listening.";
  }

  return phase === "input" ? "在呢。" : "嗯，我听着。";
}

function fallbackReactionForStart(
  command: ObservedCommand,
  language: BuddyLanguage,
): string | undefined {
  if (command.addressedToBuddy) {
    return fallbackReactionForDirectAddress("input", language);
  }

  if (language === "en") {
    if (command.category === "test") {
      return "Let's see if it holds.";
    }

    if (command.category === "build") {
      return "Watching the build.";
    }

    if (command.category === "git_push") {
      return "Careful push.";
    }

    if (command.category === "deploy") {
      return "That one matters.";
    }

    if (command.category === "git_integrate") {
      return "This could get messy.";
    }

    return "Watching closely.";
  }

  if (command.category === "test") {
    return "看这轮测试。";
  }

  if (command.category === "build") {
    return "盯着这次构建。";
  }

  if (command.category === "git_push") {
    return "这次 push 别翻车。";
  }

  if (command.category === "deploy") {
    return "这下要见真章了。";
  }

  if (command.category === "git_integrate") {
    return "这步容易起火。";
  }

  return "我先盯着。";
}

function fallbackReactionForEnd(params: {
  command: ObservedCommand;
  exitCode?: number | undefined;
  language: BuddyLanguage;
  durationMs?: number | undefined;
}): string | undefined {
  const { command, exitCode, language, durationMs } = params;
  const failed = (exitCode ?? 0) !== 0;
  const longRun = (durationMs ?? 0) >= LONG_COMMAND_MS;

  if (command.addressedToBuddy) {
    return fallbackReactionForDirectAddress("finish", language);
  }

  if (language === "en") {
    if (failed) {
      if (command.category === "test") {
        return "Tests cracked.";
      }

      if (command.category === "build") {
        return "Build fell apart.";
      }

      if (command.category === "git_integrate") {
        return "That smells like conflicts.";
      }

      if (command.category === "git_push") {
        return "Push bounced.";
      }

      return "That one needs another look.";
    }

    if (command.category === "test") {
      return "This run came back green.";
    }

    if (command.category === "build") {
      return "Build held together.";
    }

    if (command.category === "git_push") {
      return "That push landed.";
    }

    if (command.category === "git_commit") {
      return "Locked into history.";
    }

    if (command.category === "deploy") {
      return "That one's out in the world.";
    }

    if (command.category === "install") {
      return "Dependencies are in.";
    }

    if (command.category === "docker") {
      return "Containers are moving.";
    }

    return longRun ? "Finally finished." : undefined;
  }

  if (failed) {
    if (command.category === "test") {
      return "测试炸了。";
    }

    if (command.category === "build") {
      return "构建没过去。";
    }

    if (command.category === "git_integrate") {
      return "冲突味有点重。";
    }

    if (command.category === "git_push") {
      return "这次没推上去。";
    }

    return "这下得回头看看。";
  }

  if (command.category === "test") {
    return "这轮全绿。";
  }

  if (command.category === "build") {
    return "构建过了。";
  }

  if (command.category === "git_push") {
    return "推上去了。";
  }

  if (command.category === "git_commit") {
    return "这次记进历史了。";
  }

  if (command.category === "deploy") {
    return "已经发出去了。";
  }

  if (command.category === "install") {
    return "依赖进来了。";
  }

  if (command.category === "docker") {
    return "容器那边动起来了。";
  }

  return longRun ? "终于跑完了。" : undefined;
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

function classifyCommandCategory(
  normalized: string,
  addressedToBuddy: boolean,
): ObservedCommandCategory {
  if (addressedToBuddy) {
    return "addressed";
  }

  if (/^(ls|pwd|clear|echo|whoami)(\b|$)/.test(normalized)) {
    return "routine";
  }

  if (/^(cd|z|zi|j)\b/.test(normalized)) {
    return "navigation";
  }

  if (
    /\b(pnpm|npm|yarn|bun)\s+(test|run test)\b/.test(normalized) ||
    /\b(vitest|jest|pytest|go test|cargo test)\b/.test(normalized)
  ) {
    return "test";
  }

  if (
    /\b(pnpm|npm|yarn|bun)\s+(run build|build)\b/.test(normalized) ||
    /\b(next build|vite build|turbo build|tsc|cargo build)\b/.test(normalized)
  ) {
    return "build";
  }

  if (/\b(git)\s+(commit)\b/.test(normalized)) {
    return "git_commit";
  }

  if (/\b(git)\s+(push)\b/.test(normalized)) {
    return "git_push";
  }

  if (/\b(git)\s+(rebase|merge|cherry-pick|pull --rebase|pull)\b/.test(normalized)) {
    return "git_integrate";
  }

  if (/\bgit\b/.test(normalized)) {
    return "git";
  }

  if (
    /\b(vercel|netlify|fly deploy|wrangler deploy|railway up|deploy)\b/.test(normalized)
  ) {
    return "deploy";
  }

  if (/\b(docker|docker-compose|podman)\b/.test(normalized)) {
    return "docker";
  }

  if (
    /\b(pnpm add|pnpm install|npm install|yarn add|brew install|pip install|uv add)\b/.test(
      normalized,
    )
  ) {
    return "install";
  }

  return "shell";
}

function classifySignificance(category: ObservedCommandCategory): string {
  switch (category) {
    case "addressed":
      return "direct address from the user";
    case "test":
      return "quality check";
    case "build":
      return "build verification";
    case "git_push":
      return "delivery move";
    case "git_commit":
      return "history checkpoint";
    case "git_integrate":
      return "integration risk";
    case "deploy":
      return "release step";
    case "docker":
      return "runtime environment change";
    case "install":
      return "dependency change";
    case "navigation":
      return "moving around the project";
    case "git":
      return "source control work";
    case "routine":
      return "routine shell movement";
    default:
      return "general shell work";
  }
}

function describeCwdRole(cwd: string): string {
  const home = process.env.HOME?.trim();
  if (home && cwd === home) {
    return "home";
  }

  const base = path.basename(cwd);
  return base.length > 0 ? base : cwd;
}

function isLowSignalCommand(command: ObservedCommand): boolean {
  if (command.category === "routine" || command.category === "navigation") {
    return true;
  }

  return command.category === "git" && command.normalized.includes("git status");
}

function isHighSignalCommand(command: ObservedCommand): boolean {
  return (
    command.category === "addressed" ||
    command.category === "test" ||
    command.category === "build" ||
    command.category === "git_commit" ||
    command.category === "git_push" ||
    command.category === "git_integrate" ||
    command.category === "deploy" ||
    command.category === "docker" ||
    command.category === "install"
  );
}

function isRecentDuplicateSuccess(
  command: ObservedCommand,
  memory: MemoryEntry[],
  now: number,
): boolean {
  const latest = memory[0];
  if (!latest) {
    return false;
  }

  return (
    latest.outcome === "success" &&
    latest.commandNormalized === command.normalized &&
    now - latest.timestamp < DEDUPE_WINDOW_MS
  );
}

function shouldPulse(command: ObservedCommand, exitCode?: number | undefined): boolean {
  if (command.addressedToBuddy) {
    return true;
  }

  return (exitCode ?? 0) === 0 && (
    command.category === "test" ||
    command.category === "build" ||
    command.category === "git_push" ||
    command.category === "deploy"
  );
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

function isCommandEcho(
  response: string,
  command?: Pick<ObservedCommand, "normalized" | "raw">,
): boolean {
  if (!command) {
    return false;
  }

  const normalizedResponse = normalizeCommand(response);
  const normalizedCommand = normalizeCommand(command.normalized || command.raw);
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
}

function isNearDuplicateReaction(previous: string, next: string): boolean {
  return normalizeCommand(previous) === normalizeCommand(next);
}
