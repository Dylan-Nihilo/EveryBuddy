# EveryBuddy Claude Code StatusLine Plugin

**Date**: 2026-04-03
**Status**: Draft
**Author**: Dylan + N.O.V.A.

## 1. Goal

Make EveryBuddy's hatched companion live inside the Claude Code status line as a reactive mascot. The companion observes Claude's tool calls (file edits, bash commands, test runs) and reacts with AI-driven speech bubbles — the same Observer personality system used in tmux mode, but adapted for the Claude Code lifecycle.

### Non-goals

- Replacing Gravet (built-in companion UI; not configurable by third parties)
- Modifying Claude's behavior or injecting prompts into conversations
- Providing tools or resources to Claude via MCP

### Success criteria

- `buddy install claude-code` writes valid hooks + statusLine config to `settings.json`
- Companion sprite + reaction bubble renders in the Claude Code status bar
- Observer fires LLM reactions on tool completions, with the same cooldown/dedup/personality logic as tmux mode
- Zero impact on Claude Code response latency (all hook work is fire-and-forget)

## 2. Architecture Overview

```
┌── Claude Code ───────────────────────────────────────┐
│                                                       │
│  ┌─ Hooks (settings.json) ─────────────────────────┐  │
│  │ PreToolUse  → buddy cc-event tool_start <json>  │  │
│  │ PostToolUse → buddy cc-event tool_end <json>    │  │
│  │ Notification → buddy cc-event notify <json>     │  │
│  │ Stop        → buddy cc-event session_end        │  │
│  └─────────────────────────────────────────────────┘  │
│                        │ fire-and-forget               │
│                        ▼                               │
│              Unix Socket (IPC)                         │
│         /tmp/everybuddy/cc-{pid}.sock                  │
│                        │                               │
│  ┌─ cc-daemon ─────────┴───────────────────────────┐  │
│  │  • Receives hook events                         │  │
│  │  • Runs CompanionObserver.observe()             │  │
│  │  • Calls LLM via maybeGenerateDecision()        │  │
│  │  • Writes cc-state.json on every state change   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ StatusLine command (settings.json) ────────────┐  │
│  │  buddy cc-statusline < session.json             │  │
│  │  • Reads cc-state.json (companion state)        │  │
│  │  • Reads stdin (Claude Code session JSON)       │  │
│  │  • Outputs multi-line ANSI: sprite + bubble +   │  │
│  │    info bar (model, branch, context%, cost)     │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

### Three components

| Component | Role | Lifecycle | Latency budget |
|-----------|------|-----------|----------------|
| `buddy cc-event` | CLI shim; sends JSON to daemon socket | Per-hook, <50ms | Must not block Claude |
| `buddy cc-daemon` | Long-running; Observer + LLM + state writer | Starts with first hook, exits on `session_end` or idle timeout | Async, unbounded |
| `buddy cc-statusline` | StatusLine renderer; reads state file + stdin | Per-render (after each assistant message) | <200ms target |

### Why a daemon?

StatusLine commands and hook commands are both short-lived processes. Neither can hold state across invocations or make async LLM calls without blocking Claude Code. A long-running daemon solves both:

- **State continuity**: command window, memory, cooldown timers, reaction expiry — all live in the daemon's memory (same as current `SidecarState`)
- **Async LLM**: Observer decides to call LLM → daemon fires the request → updates state file when response arrives → next statusline render picks it up
- **Socket reuse**: identical pattern to existing tmux sidecar (`/tmp/everybuddy/{id}.sock`)

### Auto-start / auto-stop

The daemon does NOT run as a global background service. It is lazy-started:

1. First `buddy cc-event` call checks if the socket exists
2. If not, it spawns `buddy cc-daemon --session-id <id>` as a detached child (`stdio: 'ignore', detached: true, unref()`)
3. Waits up to 500ms for socket to appear, then sends the event
4. Daemon exits on `session_end` event or after 5 minutes of no events (idle timeout)

## 3. Event Mapping

### Claude Code hook events → ShellEvent

The Observer operates on `ShellEvent` (types: `command_start`, `command_end`, `pane_active`, `input_update`). CC hooks map cleanly:

| CC Hook | Fires when | Maps to | Details |
|---------|-----------|---------|---------|
| `PreToolUse` | Before any tool call | `command_start` | `command = "{toolName} {summary}"` |
| `PostToolUse` (success) | Tool completed ok | `command_end` (exit 0) | Duration computed from paired start |
| `PostToolUse` (error) | Tool errored | `command_end` (exit 1) | |
| `Notification` | Auth, errors, etc. | `pane_active` | Low-priority awareness signal |
| `Stop` | Session ending | (cleanup) | Daemon exits, removes socket |

### Adapter function

```typescript
// src/runtime/cc-adapter.ts

interface CCHookPayload {
  hook: "PreToolUse" | "PostToolUse" | "Notification" | "Stop";
  toolName?: string;      // e.g. "Bash", "Edit", "Write", "Read"
  toolInput?: string;     // first ~80 chars of tool input (file path, command, etc.)
  error?: string;         // present on PostToolUse failures
  sessionId: string;
  cwd: string;
  timestamp: number;
}

function mapCCHookToShellEvent(payload: CCHookPayload): ShellEvent {
  const isEnd = payload.hook === "PostToolUse";
  const summary = payload.toolName
    ? `${payload.toolName} ${payload.toolInput ?? ""}`.trim().slice(0, 80)
    : "unknown";

  return {
    type: isEnd ? "command_end" : payload.hook === "PreToolUse" ? "command_start" : "pane_active",
    paneId: "claude-code",               // fixed — CC has no pane concept
    windowId: payload.sessionId,
    cwd: payload.cwd,
    command: summary,
    exitCode: isEnd ? (payload.error ? 1 : 0) : undefined,
    timestamp: payload.timestamp,
  };
}
```

This adapter is the **only new translation layer**. Once a `ShellEvent` is produced, the existing `CompanionObserver.observe()` and `maybeGenerateDecision()` work unchanged.

### Observer prompt adaptation

The Observer prompt (`buildObserverPrompt`) currently says "a companion sits beside the user's terminal". For CC mode, we adjust one line:

```
- "sits beside the user's terminal"
+ "sits in the Claude Code status bar, watching the AI assistant work"
```

The command window entries will show tool names instead of shell commands:
```
1. command=Edit src/runtime/observer.ts; cwd=EveryBuddy; exit=0; duration=1200ms
2. command=Bash pnpm test; cwd=EveryBuddy; exit=1; duration=8500ms
3. command=Edit src/runtime/observer.ts; cwd=EveryBuddy; exit=0; duration=900ms
```

This gives the LLM rich context about what Claude is doing.

## 4. State File

The daemon writes `~/.terminal-buddy/cc-state.json` on every state mutation. The statusline script reads this file on each render.

```typescript
// src/runtime/cc-state.ts

interface CCStateFile {
  version: 1;
  sessionId: string;
  updatedAt: number;         // epoch ms

  // Companion identity (static for the session)
  companion: {
    name: string;
    species: string;
    eye: string;
    hat: string;
    color: ColorPalette;
    rarity: { name: string; color: string; stars: string };
    stats: Record<StatName, number>;
    tagline?: string;
  } | null;

  // Dynamic state
  status: "idle" | "typing" | "thinking" | "finished";
  reactionText: string | null;
  reactionExpiresAt: number | null;
  reactionFading: boolean;
  frameTick: number;
  lastToolName: string | null;
  lastToolSuccess: boolean | null;

  // Sprite resolution hints (daemon pre-computes to keep statusline fast)
  spriteFrameIndex: number;
  spriteBlink: boolean;
  pulseActive: boolean;
}
```

### Write strategy

- Atomic write via `writeFileSync(tmpPath, data)` + `renameSync(tmpPath, finalPath)` to prevent partial reads
- Debounced at 50ms — multiple rapid events batch into one write
- State file is <2KB; filesystem overhead is negligible

### Read strategy (statusline)

- `readFileSync` — the statusline process is short-lived, sync is fine
- If file is missing or stale (>30s), render a minimal fallback (no companion, just session info)

## 5. StatusLine Rendering

### Layout (multi-line output)

The statusline script outputs 3-5 lines depending on state:

**With reaction (5 lines):**
```
   .----.
  ( @@ @@ )    "这个 refactor 搞得漂亮！"
  (______)
  /\/\/\/\      Gravet · octopus · ◆ LEGENDARY
 [Opus] 📁 EveryBuddy | 🌿 main | ████░░░░░░ 42% | $0.23
```

**Idle (3 lines):**
```
  ( @@ @@ )     Gravet · octopus
  (______)      安静型 · 专注强
 [Opus] 📁 EveryBuddy | 🌿 main | ████░░░░░░ 42% | $0.23
```

**Thinking (3 lines, animated dots):**
```
  ( @@  @@ )    thinking...
  (________)
 [Opus] 📁 EveryBuddy | 🌿 main | ████░░░░░░ 42% | $0.23
```

### Layout strategy: side-by-side

Sprite on the left (~16 chars wide), text on the right. This avoids the mascot-statusline's truncation issue (where tall sprites get cut if any line exceeds width). Our sprite is only 3-4 lines tall, placed beside the info text.

```
  [sprite line 1]  [right-side info line 1]
  [sprite line 2]  [right-side info line 2]
  [sprite line 3]  [right-side info line 3]
  [━━━━ info bar (full width) ━━━━━━━━━━━━]
```

### Terminal width handling

The statusline command receives JSON on stdin but doesn't get terminal width. Following mascot-statusline's approach:

1. Detect parent process TTY via `ps` → query `stty size`
2. Cache result for 5 seconds
3. If width < 60: compact mode (face emoji + one-line reaction + info bar)
4. If width >= 60: full mode (sprite + bubble + info bar)

### Compact mode (narrow terminals)

```
🐙 "这个 refactor 搞得漂亮！" | [Opus] 42% | 🌿 main
```

### Info bar (bottom line)

Composed from Claude Code's stdin JSON + companion state:

```typescript
function renderInfoBar(session: CCSessionJSON, state: CCStateFile): string {
  const parts: string[] = [];
  parts.push(`[${session.model.display_name}]`);
  parts.push(`📁 ${basename(session.workspace.current_dir)}`);

  // Git branch (from cwd, cached)
  const branch = cachedGitBranch(session.workspace.current_dir);
  if (branch) parts.push(`🌿 ${branch}`);

  // Context bar
  const pct = Math.floor(session.context_window.used_percentage ?? 0);
  const bar = renderContextBar(pct);
  parts.push(`${bar} ${pct}%`);

  // Cost
  const cost = session.cost.total_cost_usd ?? 0;
  if (cost > 0) parts.push(`$${cost.toFixed(2)}`);

  return parts.join(" | ");
}
```

### Sprite rendering

Reuses existing `composeFrame()` + `SPECIES` + `EYES` + `HATS` registries. The statusline script:

1. Reads `state.companion` to know species/eye/hat/color
2. Reads `state.spriteFrameIndex` and `state.spriteBlink` (pre-computed by daemon)
3. Calls `composeFrame(frame, eyeChar, hatId, color)` to get colored sprite lines

The daemon advances `frameTick` on a 500ms timer (same as tmux sidecar) and pre-computes sprite state so the statusline script stays fast.

## 6. Hook Configuration

### Generated `settings.json` entries

`buddy install claude-code` writes:

```jsonc
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [{
          "type": "command",
          "command": "buddy cc-event tool_start --tool $TOOL_NAME --session $SESSION_ID --cwd $CWD &"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [{
          "type": "command",
          "command": "buddy cc-event tool_end --tool $TOOL_NAME --session $SESSION_ID --cwd $CWD --exit $EXIT_CODE &"
        }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{
          "type": "command",
          "command": "buddy cc-event session_end --session $SESSION_ID &"
        }]
      }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "buddy cc-statusline"
  }
}
```

### Hook environment variables

Claude Code passes context to hooks via environment variables and/or stdin JSON. The exact variable names need verification during implementation — the hook documentation should be checked for:

- `$TOOL_NAME` — which tool was called
- `$SESSION_ID` — unique session identifier
- Tool input summary
- Exit status for PostToolUse

If variables are not available, the hook command can parse `stdin` JSON instead.

### Merging strategy

The installer reads existing `settings.json`, merges hook arrays (preserving user's existing hooks), and sets `statusLine` (warning if one already exists). Same approach as mascot-statusline's `setup-helper.js`.

## 7. CLI Commands

### `buddy cc-event <type> [options]`

Thin CLI shim. Sends a JSON event to the daemon socket.

```
buddy cc-event tool_start --tool Edit --input "src/foo.ts" --session abc123
buddy cc-event tool_end --tool Bash --exit 0 --session abc123
buddy cc-event session_end --session abc123
```

**Logic:**
1. Build `CCHookPayload` from CLI args
2. Check if socket `/tmp/everybuddy/cc-{sessionId}.sock` exists
3. If not → spawn `buddy cc-daemon --session abc123` (detached)
4. Connect to socket, send `JSON.stringify(payload) + "\n"`, disconnect
5. Exit 0 immediately (fire-and-forget)

### `buddy cc-daemon --session <id>`

Long-running daemon. Reuses existing architecture from `sidecar.ts`:

**Shared with sidecar.ts:**
- Unix socket server (`net.createServer`)
- `CompanionObserver` creation and usage
- `handleShellEvent` core logic (observe → apply plan → maybe LLM → update state)
- State management (commandWindows, memory, recentReaction, cooldown)
- Event versioning for stale LLM response prevention

**Different from sidecar.ts:**
- No tmux dependency
- No direct rendering — writes `cc-state.json` instead
- No frame timer for rendering — but still advances `frameTick` for sprite state
- Idle timeout (5 min no events → exit + cleanup)
- No health timer (no panes to monitor)

**Estimated size:** ~150 lines (vs sidecar.ts's 985 lines). Most logic is imported from existing modules.

### `buddy cc-statusline`

StatusLine renderer. Called by Claude Code on each assistant message.

**Input:** Claude Code session JSON on stdin
**Output:** Multi-line ANSI text to stdout

**Logic:**
1. Read stdin → parse session JSON
2. Read `~/.terminal-buddy/cc-state.json` → companion state
3. Detect terminal width (parent TTY approach)
4. If companion state exists and fresh:
   - Render sprite (from pre-computed frame index)
   - Render reaction bubble (if present and not expired)
   - Render info bar (from session JSON)
5. If no companion or stale state:
   - Render info bar only with a hint: "Run `buddy` to hatch a companion"

**Estimated size:** ~120 lines

### `buddy install claude-code`

Setup command. Adds hooks + statusLine to `settings.json`.

**Logic:**
1. Locate `~/.claude/settings.json`
2. Read existing content
3. Merge hooks (append to existing arrays, don't overwrite)
4. Set statusLine (warn if already configured)
5. Write back
6. Print success message with instructions to restart Claude Code

**Estimated size:** ~80 lines

## 8. Reuse Map

| Existing module | Reuse in CC plugin | Changes needed |
|---|---|---|
| `src/bones/*` | 100% | None |
| `src/soul/*` | 100% | None |
| `src/storage/*` | 100% | None |
| `src/types/companion.ts` | 100% | None |
| `src/render/sprites.ts` | 100% | None |
| `src/render/compose.ts` | 100% | None |
| `src/render/color.ts` | 100% | None |
| `src/runtime/socket.ts` | 100% | None |
| `src/runtime/types.ts` | 95% | Add `CCHookPayload` type |
| `src/runtime/observer.ts` | 95% | Extract `handleShellEvent` core into shared helper |
| `src/runtime/sidecar.ts` | 60% | Extract rendering utils (`wrapText`, `visibleLength`, `centerLine`, `charDisplayWidth`, speech bubble, sprite frame resolution) into `src/render/layout.ts` |

### New files

| File | Purpose | Est. lines |
|---|---|---|
| `src/runtime/cc-adapter.ts` | `CCHookPayload` → `ShellEvent` mapping | ~40 |
| `src/runtime/cc-daemon.ts` | Daemon process (socket server + observer + state writer) | ~150 |
| `src/runtime/cc-state.ts` | State file read/write with atomic operations | ~60 |
| `src/cli/cc-statusline.ts` | StatusLine renderer (sprite + bubble + info bar) | ~120 |
| `src/cli/cc-event.ts` | `buddy cc-event` CLI command (fire-and-forget) | ~50 |
| `src/cli/cc-install.ts` | `buddy install claude-code` setup command | ~80 |
| `src/render/layout.ts` | Extracted layout utils from sidecar.ts (shared) | ~200 (moved, not new) |

### Refactoring: extract layout utilities

`sidecar.ts` contains ~200 lines of pure rendering utilities that are not tmux-specific:

- `wrapText()`, `splitWrapTokens()`, `splitTokenByDisplayWidth()`, `truncateDisplayWidth()`
- `visibleLength()`, `charDisplayWidth()`, `padDisplayWidth()`
- `centerLine()`, `centerBlock()`
- `renderSpeechBubble()`, `styleBubbleBorder()`, `styleBubbleText()`
- `resolveSpriteFrameState()`, `resolveReactionBubble()`
- `buildIdleSoulSummary()`, locale helpers

These move to `src/render/layout.ts`. Both `sidecar.ts` and `cc-statusline.ts` import from there. Sidecar.ts's behavior is unchanged — just import paths change.

## 9. Installation Flow

```
$ buddy install claude-code

  EveryBuddy × Claude Code Setup
  ───────────────────────────────

  ✓ Found ~/.claude/settings.json
  ✓ Added PreToolUse hook
  ✓ Added PostToolUse hook
  ✓ Added Stop hook
  ✓ Set statusLine command

  Done! Restart Claude Code to activate your companion.

  Your companion will appear in the status bar at the bottom.
  If you haven't hatched one yet, run `buddy` first.
```

### Uninstall

```
$ buddy uninstall claude-code

  ✓ Removed EveryBuddy hooks from settings.json
  ✓ Removed statusLine entry
  ✓ Cleaned up daemon state

  Restart Claude Code to complete removal.
```

## 10. Edge Cases

### No companion hatched yet

If `~/.terminal-buddy/companion.json` doesn't exist, the daemon still runs but the statusline shows:

```
🥚 No companion hatched yet — run `buddy` to get started
[Opus] 📁 EveryBuddy | 🌿 main | ████░░░░░░ 42%
```

### No API key configured

Observer runs in silent mode (no LLM calls). Companion still animates and shows status changes (thinking/idle/finished) but never speaks. Same behavior as tmux mode when API key is missing.

### Stale state file

If `cc-state.json` is older than 30 seconds, the statusline assumes the daemon has exited and renders without companion state (info bar only).

### Multiple Claude Code sessions

Each session gets its own socket (`cc-{sessionId}.sock`) and the daemon tracks state per session. However, there's only one `cc-state.json`. For v1, last-writer-wins is acceptable since users typically focus on one session at a time. Future versions could use per-session state files.

### statusLine already configured

If the user already has a statusLine, `buddy install claude-code` warns and asks for confirmation before overwriting.

### Existing hooks

Hook arrays are merged, not replaced. EveryBuddy's hooks are appended to any existing hooks in each category.

## 11. Phase Plan

### Phase 1: Foundation (extract + wire)

- Extract layout utilities from `sidecar.ts` into `src/render/layout.ts`
- Implement `cc-adapter.ts` (event mapping)
- Implement `cc-state.ts` (state file read/write)
- Verify existing Observer works with mapped CC events (unit test)

### Phase 2: Daemon

- Implement `cc-daemon.ts` (socket server + observer + state writer)
- Implement `cc-event.ts` CLI command (auto-start daemon + send event)
- Test: send mock events via socket, verify state file updates

### Phase 3: StatusLine renderer

- Implement `cc-statusline.ts` (read state + stdin, output ANSI)
- Terminal width detection (parent TTY approach)
- Compact and full layout modes
- Test: pipe mock session JSON + mock state, verify output

### Phase 4: Installation & polish

- Implement `buddy install claude-code` (merge into settings.json)
- Implement `buddy uninstall claude-code`
- End-to-end test in a real Claude Code session
- Handle edge cases (no companion, stale state, multiple sessions)

## 12. Open Questions

1. **Hook environment variables**: What exactly does Claude Code pass to hook commands? Need to verify the available variables (`$TOOL_NAME`, `$SESSION_ID`, etc.) or whether hooks receive JSON on stdin. This determines the `cc-event` argument parsing.

2. **StatusLine update frequency**: Documentation says "after each assistant message, debounced at 300ms". Is this frequent enough for responsive animations? If the daemon changes state mid-turn, the statusline won't update until the next message completes. This may be fine for a mascot but worth noting.

3. **Claude Code plugin distribution**: Should this be distributed as a Claude Code plugin (via marketplace) in addition to the npm package? The mascot-statusline uses `/plugin marketplace add`. This would make installation simpler but adds a distribution channel to maintain.

4. **Sprite width budget**: The statusline shares horizontal space with system notifications on wide terminals (≥80 cols, status gets ~half). Need to confirm exactly how many columns are available for the sprite to avoid truncation.
