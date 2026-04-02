# EveryBuddy

EveryBuddy is an open terminal companion project.

Current product codename: `terminal-buddy`

## Vision

Build a terminal-native AI pet inspired by Claude Code Buddy, but not locked to any single editor, model, or proprietary runtime.

Core ideas:

- `Bones`: deterministic generation from a stable user id
- `Soul`: one-time AI hatch for name and personality
- `Runtime`: terminal rendering, shell sensing, reactions, and chat

## Current Status

Phase 3 is now wired:

- TypeScript CLI scaffold
- deterministic `bones` generation
- persisted `companion.json` records
- `OpenAI-compatible` soul hatch flow
- colored ASCII card rendering with `name`, `personality`, and `modelUsed`
- `buddy hatch` and `buddy card`
- tmux window-level sidecar follow mode
- `buddy init zsh`, `buddy attach`, and `buddy detach`
- observer pipeline with local event filtering, semantic reactions, and short-term memory
- direct-address reactions via companion name or `/buddy`
- adaptive sidecar width with `full` / `narrow` render modes

Implemented entry points:

```bash
pnpm install
pnpm build
node dist/index.js
node dist/index.js hatch --model gpt-4o-mini
OPENAI_BASE_URL=https://your-provider.example/v1 node dist/index.js hatch --model gpt-4o-mini
node dist/index.js card
eval "$(node dist/index.js init zsh)"
```

## Architecture

```text
src/
├── bones/     deterministic generation
├── cli/       command entry points
├── render/    sprites, composition, card rendering
├── runtime/   tmux adapter, socket bus, sidecar runtime
├── soul/      hatch prompt, response parsing, provider adapters
├── storage/   config + persisted companion files
└── types/     shared companion types
```

## Configuration

Storage is fixed to `~/.terminal-buddy/`.

Files:

- `config.json` for runtime config
- `companion.json` for the current hatched companion

Supported config fields:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1",
  "language": "zh"
}
```

Precedence is:

```text
CLI flags > env vars > ~/.terminal-buddy/config.json > defaults
```

Supported env vars:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `EVERYBUDDY_USER_ID`
- `DASHSCOPE_API_KEY`

## Third-party OpenAI-Compatible Providers

EveryBuddy currently expects a non-streaming OpenAI-compatible `chat/completions` response.
For fast local testing, `buddy hatch` now defaults to:

- `OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1`
- `OPENAI_MODEL=qwen3.5-plus`

If no API key is configured and you run `buddy hatch` in an interactive terminal, it will prompt for one instead of failing immediately.

DashScope Coding Plan can be wired as a plain OpenAI-compatible provider:

```bash
DASHSCOPE_API_KEY=your-rotated-key node dist/index.js hatch --force
```

Suggested hatch model examples:

- `qwen3.5-plus`
- `kimi-k2.5`
- `glm-5`
- `MiniMax-M2.5`

Current limitations:

- only non-streaming `chat/completions` is supported
- only OpenAI-compatible JSON responses are supported
- Anthropic-compatible endpoints are not supported
- stream-only / SSE providers are not supported

## Commands

Hatch a persisted companion:

```bash
node dist/index.js hatch
node dist/index.js hatch --model gpt-4o-mini
node dist/index.js hatch --model gpt-4o-mini --force
node dist/index.js hatch --user dylan-dev --model gpt-4o-mini
OPENAI_BASE_URL=https://your-provider.example/v1 node dist/index.js hatch --model gpt-4o-mini
OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1 OPENAI_MODEL=qwen3.5-plus node dist/index.js hatch --force
```

Read the persisted card:

```bash
node dist/index.js
node dist/index.js card
```

If no companion exists yet, `buddy card` prints:

```text
No companion found. Run `buddy hatch` first.
```

tmux sidecar follow mode:

```bash
eval "$(node dist/index.js init zsh)"
node dist/index.js attach
node dist/index.js detach
```

Internal runtime commands exist but are not meant to be called directly:

```bash
node dist/index.js event ...
node dist/index.js sidecar ...
```

## Tmux Sidecar Follow Mode

Requirements:

- `tmux`
- `zsh`
- a built CLI: `pnpm build`

Install `tmux` on macOS with Homebrew:

```bash
brew install tmux
```

Load the shell hook in your current shell:

```bash
eval "$(node dist/index.js init zsh)"
```

Then open a tmux session or tmux window. EveryBuddy will auto-attach a single right-side sidecar pane for that window.

Current behavior:

- one sidecar per tmux window
- adaptive right-side width of `30 / 26 / 22` based on window size
- only `zsh` is supported in this phase
- follow mode tracks the most recent pane that emitted `pane_active`, `command_start`, or `command_end`
- low-signal commands stay quiet; high-signal commands, failures, and direct-address events can trigger reactions
- typing state stays local and immediate; `command_end` can use the configured OpenAI-compatible model for a short semantic buddy reaction
- saying the buddy's name or typing `/buddy` triggers a direct-address reaction without hijacking normal shell behavior
- the sidecar keeps a short in-memory window of recent notable events so reactions can stay context-aware
- the UI uses a Claude-style bubble-first layout in `full` mode and a compact face + line layout in `narrow` mode
- idle motion stays sparse; speech bubbles last about 10 seconds and fade near expiry
- if no runtime API key is available, sidecar reactions fall back to local static text
- no tmux global hooks and no daemon yet
- closing all work panes closes the sidecar

Manual controls:

- `node dist/index.js attach` ensures the current tmux window has a sidecar
- `node dist/index.js detach` removes the current tmux window sidecar

If you install the package as `buddy`, the same commands work as:

```bash
eval "$(buddy init zsh)"
buddy attach
buddy detach
```

## Next Phases

The next planned phases are:

1. `Follow+`: shell coverage beyond `zsh`, better focus tracking, terminal-native polish
2. `Chat`: natural conversation and command-aware context
3. `Ship`: packaging, docs, CI, and open-source release

## Docs

- Product and technical spec: [terminal-buddy-tech-spec.md](./terminal-buddy-tech-spec.md)
- Sprite exploration lab: [sprites-lab.jsx](./sprites-lab.jsx)
