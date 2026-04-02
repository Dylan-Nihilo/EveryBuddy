import type { CompanionRecord } from "../types/companion.js";

export type ShellEventType = "pane_active" | "input_update" | "command_start" | "command_end";
export type SidecarStatus = "idle" | "typing" | "thinking" | "finished";
export type EventImportance = "silent" | "low" | "high" | "addressed";
export type RenderMode = "full" | "narrow";
export type ObservedCommandCategory =
  | "addressed"
  | "routine"
  | "navigation"
  | "git"
  | "git_commit"
  | "git_push"
  | "git_integrate"
  | "test"
  | "build"
  | "deploy"
  | "docker"
  | "install"
  | "shell";
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
  category: ObservedCommandCategory;
  significance: string;
  cwdRole: string;
  addressedToBuddy: boolean;
}

export interface MemoryEntry {
  timestamp: number;
  commandRaw: string;
  commandNormalized: string;
  category: ObservedCommandCategory;
  cwd: string;
  outcome: ObservedOutcome;
  durationMs: number | undefined;
  importance: EventImportance;
  reactionText: string | undefined;
  addressedToBuddy: boolean;
  significance: string;
  cwdRole: string;
}

export interface CommandTracker {
  paneId: string;
  commandRaw: string;
  startedAt: number;
  cwd: string;
  category: ObservedCommandCategory;
  importance: EventImportance;
  addressedToBuddy: boolean;
  significance: string;
  cwdRole: string;
}

export interface RecentReaction {
  text: string;
  at: number;
  importance: EventImportance;
  category: ObservedCommandCategory;
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
