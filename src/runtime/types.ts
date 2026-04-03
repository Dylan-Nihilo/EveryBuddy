import type { CompanionRecord } from "../types/companion.js";

export type ShellEventType = "pane_active" | "input_update" | "command_start" | "command_end";
export type SidecarStatus = "idle" | "typing" | "thinking" | "finished";
export type EventImportance = "silent" | "low" | "high" | "addressed";
export type RenderMode = "full" | "narrow";
export type ObservedOutcome = "success" | "failure" | "addressed" | "unknown";

export interface ShellEvent {
  type: ShellEventType;
  paneId: string;
  windowId: string;
  cwd: string;
  command?: string;
  exitCode?: number;
  timestamp: number;
}

export interface ObservedCommand {
  raw: string;
  normalized: string;
  cwdRole: string;
  addressedToBuddy: boolean;
}

export interface CommandWindowEntry {
  command: string;
  normalizedCommand: string;
  cwd: string;
  cwdRole: string;
  exitCode: number | undefined;
  durationMs: number | undefined;
  timestamp: number;
  addressedToBuddy: boolean;
}

export interface ObserverDecision {
  shouldSpeak: boolean;
  reaction?: string | undefined;
  topic?: string | undefined;
  mood?: string | undefined;
}

export interface MemoryEntry {
  timestamp: number;
  commandRaw: string;
  commandNormalized: string;
  cwd: string;
  cwdRole: string;
  outcome: ObservedOutcome;
  exitCode: number | undefined;
  durationMs: number | undefined;
  importance: EventImportance;
  reactionText: string | undefined;
  addressedToBuddy: boolean;
  topic?: string | undefined;
  mood?: string | undefined;
}

export interface CommandTracker {
  paneId: string;
  commandRaw: string;
  startedAt: number;
  cwd: string;
  addressedToBuddy: boolean;
  cwdRole: string;
}

export interface RecentReaction {
  text: string;
  at: number;
  topic?: string | undefined;
  mood?: string | undefined;
}

export interface SidecarState {
  windowId: string;
  sidecarPaneId: string;
  targetPaneId: string | undefined;
  companion: CompanionRecord | null;
  frameTick: number;
  renderMode: RenderMode;
  status: SidecarStatus;
  reactionText: string | undefined;
  reactionExpiresAt: number | undefined;
  lastCommand: string | undefined;
  lastExitCode: number | undefined;
  cwd: string | undefined;
  lastUpdatedAt: number;
  memory: MemoryEntry[];
  commandTrackers: Record<string, CommandTracker>;
  commandWindows: Record<string, CommandWindowEntry[]>;
  recentReaction: RecentReaction | undefined;
  recentNotableReactionAt: number | undefined;
  directAddressActive: boolean;
  pulseUntilTick: number | undefined;
}

export interface AttachContext {
  windowId: string;
  targetPaneId: string;
  existingSidecarPaneId?: string;
  sidecarPaneId: string;
  created: boolean;
}
