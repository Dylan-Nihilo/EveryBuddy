# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is EveryBuddy

A terminal companion pet CLI. On first run (`buddy`), it performs a gacha-style draw (deterministic bones from user seed) then an AI soul imprint (name + personality via OpenAI-compatible API). The hatched companion persists to `~/.terminal-buddy/companion.json` and lives in a tmux sidecar pane, reacting to shell commands with speech bubbles.

## Commands

```bash
pnpm install          # install deps
pnpm build            # tsc → dist/
pnpm test             # node --import tsx --test test/*.test.ts
pnpm run typecheck    # tsc --noEmit
pnpm dev              # tsx src/index.ts (run without building)

# run a single test file
node --import tsx --test test/observer.test.ts

# run built CLI locally
node dist/index.js
node dist/index.js pet
node dist/index.js install tmux
```

## Architecture

### Pipeline: bones → soul → runtime

1. **bones** (`src/bones/`) — Deterministic companion generation. `rollCompanion(userId)` uses a seeded Mulberry32 PRNG to pick species, rarity (weighted), eyes, hat, stats, and shiny flag. Entirely local, no network.

2. **soul** (`src/soul/`) — AI-powered personality. `hatchSoul(bones, provider, language)` sends a prompt to an OpenAI-compatible `chat/completions` endpoint (non-streaming) and parses the JSON response into name, tagline, personality, and observerProfile. Only provider implementation is `OpenAICompatibleProvider`.

3. **runtime** (`src/runtime/`) — tmux sidecar follow mode. A Unix domain socket server per tmux window (`/tmp/everybuddy/@window.sock`). Shell hooks (installed in `~/.zshrc` by `buddy install tmux`) send events via `buddy event <type>`. The `CompanionObserver` evaluates events against a command window + memory, decides whether to call the LLM for a reaction, and the sidecar renders sprites + speech bubbles.

### CLI layer (`src/cli/`)

Entry point: `src/index.ts` (commander). The `setup.ts` orchestrates the first-run onboarding flow (bones reveal → soul imprint → final reveal → install tmux). The `event.ts` is the shell hook bridge — it fires-and-forgets JSON over the Unix socket.

### Key data flow: shell event → observer → sidecar render

```
zsh hook → buddy event command_end → socket → sidecar.ts handleShellEvent()
  → observer.observe() returns ObserverReactionPlan (sync, no LLM)
  → observer.maybeGenerateDecision() (async LLM call if shouldGenerateModel)
  → sidecar renders sprite + bubble to stdout with ANSI escape codes
```

### Storage (`src/storage/`)

- `~/.terminal-buddy/config.json` — provider config (apiKey, model, baseUrl, language)
- `~/.terminal-buddy/companion.json` — hatched companion record
- Config priority: CLI flags > env vars > config file > defaults

### Render (`src/render/`)

- `sprites.ts` — SPECIES, EYES, HATS registries with ASCII art frames
- `compose.ts` — composeFrame merges species frame + eye char + hat art + color
- `card.ts` — renderCompanionCard for terminal display
- `color.ts` — ANSI color utilities

### Types (`src/types/`)

- `companion.ts` — CompanionBones, CompanionSoul, CompanionRecord, ObserverProfile, BuddyConfig
- `onboarding.ts` — HatchSceneState for the first-run flow

## Key Design Decisions

- **Deterministic bones**: Same userId always produces same species/rarity/stats. The PRNG seed is `hash(userId + salt)`.
- **Observer personality system**: ObserverProfile (voice, chattiness 1-5, sharpness 1-5, patience 1-5) controls LLM call frequency — higher chattiness = smaller minimum command window, shorter cooldown.
- **Event versioning in sidecar**: `observerEventVersion` counter prevents stale LLM responses from overwriting newer state.
- **Reaction deduplication**: Near-duplicate reactions within 18s are suppressed. Command echoes (LLM restating the command) are filtered.
- **Default provider**: Alibaba DashScope (`coding.dashscope.aliyuncs.com/v1`) with `qwen3.5-plus` model. Observer uses faster `qwen3-coder-next` by default on DashScope.

## Testing

Tests use Node's built-in `node:test` runner with `node:assert/strict`. No external test framework. Tests import directly from `src/` via tsx loader. Observer tests use mock providers with canned JSON responses and injectable `now()` clocks.

## Language

- Default UI language is Chinese (`zh`). Configurable to English (`en`).
- Code and comments are in English.

## Known Limitations

- **tmux required for follow mode**: The sidecar runtime (`buddy attach`, shell hooks, observer reactions) requires tmux. Without tmux, users can hatch and view companion cards, but cannot use follow mode. All tmux-dependent paths now provide friendly i18n error messages instead of stack traces (since v0.1.5).
- **zsh only**: Shell hook integration only supports zsh. Other shells get a clear "unsupported shell" message.

## Release History

- **v0.1.5** — Friendly error messages when tmux is missing (attach/detach/TmuxClient ENOENT)
- **v0.1.4** — (current npm)
- **v0.1.3** — Provider name clarification
- **v0.1.2** — Companion record integrity checks
- **v0.1.1** — Remove rehatch, one draw per user
- **v0.1.0** — Initial release: gacha bones, AI soul imprint, tmux sidecar follow mode
