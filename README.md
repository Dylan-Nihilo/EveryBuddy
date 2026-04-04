# EveryBuddy

EveryBuddy 是一个终端宠物。第一次运行 `buddy` 时，它会直接进入抽卡式初始化：先揭晓骨架和稀有度，再从内置 atlas 里绑定一只固定宠物，最后把它保存到 `~/.terminal-buddy/companion.json`。

抽卡现在完全本地执行，不需要 API key，也不会因为上游模型波动把同一只宠物抽成不同名字。模型只留给后续 sidecar runtime 说话时使用。

## Quick Start

全局安装：

```bash
npm install -g everybuddy
```

第一次运行：

```bash
buddy
```

查看当前宠物：

```bash
buddy pet
```

把宠物接到 tmux：

```bash
buddy install tmux
```

## First-Run Flow

第一次运行 `buddy` 时，行为固定为三段：

1. `bones reveal`
2. `soul imprint`
3. `final reveal`

这三段现在都不依赖网络。

`bones reveal` 会揭晓：

- species
- rarity
- eyes
- hat
- stats
- sprite

`soul imprint` 不再请求 provider，而是从内置 companion atlas 绑定固定的：

- name
- tagline
- personality
- observer profile

首次抽卡会按 `userId` 稳定选择模板。`buddy rehatch` 会避开当前模板，换成另一只。

## Commands

主入口命令：

```bash
buddy
buddy setup
buddy rehatch
buddy pet
buddy install tmux
```

行为说明：

- `buddy`
  第一次运行进入抽卡初始化；已有宠物时显示当前宠物卡和 runtime 提示。
- `buddy setup`
  显式重跑首次初始化流程。
- `buddy rehatch`
  确认后覆盖当前宠物，重新抽一只。
- `buddy pet`
  显示当前宠物卡。
- `buddy install tmux`
  检测 tmux 和 zsh，并在确认后把 hook 写入 `~/.zshrc`。

兼容保留的高级命令：

```bash
buddy hatch
buddy card
buddy init zsh
buddy attach
buddy detach
```

其中 `buddy hatch` 现在同样走本地 atlas，不再需要模型配置。

## tmux Follow Mode

当前 sidecar runtime 形态：

- 每个 tmux window 一个 sidecar
- 当前只支持 `zsh`
- shell hook 通过 `buddy install tmux` 写入 `~/.zshrc`
- 打开新的 tmux window 后会自动 attach
- sidecar 会感知输入、命令开始、命令结束和直接叫名字

安装完成后，当前 shell 里执行：

```bash
source ~/.zshrc
```

然后新开一个 tmux session 或 tmux window。EveryBuddy 会自动出现在 sidecar 里。

## Storage

存储目录固定为：

```text
~/.terminal-buddy/
```

文件说明：

- `companion.json`
  当前已绑定宠物
- `config.json`
  可选的 runtime observer 模型配置

## Optional Observer Model Config

抽卡不需要配置任何模型。

如果你后面想让 tmux sidecar 的捧哏反应走模型，可以再手动提供：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_OBSERVER_MODEL`
- `DASHSCOPE_API_KEY`
- `EVERYBUDDY_USER_ID`

配置优先级：

```text
CLI flags > env vars > ~/.terminal-buddy/config.json > defaults
```

当前默认值：

- `OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1`
- `OPENAI_MODEL=qwen3.5-plus`
- `OPENAI_OBSERVER_MODEL=qwen3-coder-next`

这些默认值只影响 runtime observer，不影响抽卡结果。

## Third-Party OpenAI-Compatible Providers

EveryBuddy 当前只在 runtime observer 上支持非流式 OpenAI-compatible `chat/completions`。

例如：

```bash
OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1 \
OPENAI_MODEL=qwen3.5-plus \
OPENAI_OBSERVER_MODEL=qwen3-coder-next \
OPENAI_API_KEY=your-key \
buddy
```

当前限制：

- 只支持非流式 `chat/completions`
- 只支持 OpenAI-compatible JSON 响应
- 不支持 Anthropic-compatible endpoint
- 不支持 stream-only / SSE provider

## Local Development

本地开发：

```bash
pnpm install
pnpm build
pnpm test
node dist/index.js
```

如果你还没全局安装包，也可以直接用构建产物体验：

```bash
node dist/index.js
node dist/index.js install tmux
node dist/index.js pet
```

## Architecture

```text
src/
├── atlas/     bundled companion templates
├── bones/     deterministic generation
├── cli/       product entry points and advanced commands
├── render/    card, sprite, and terminal composition
├── runtime/   tmux sidecar, socket bridge, observer
├── soul/      observer prompt, parser, provider
├── storage/   config + persisted companion files
└── types/     shared domain/runtime types
```

## Status

当前已经完成：

- deterministic bones generation
- bundled companion atlas
- persisted companion records
- 抽卡式首次运行 onboarding
- `buddy install tmux`
- tmux window-level sidecar follow mode
- 命令筛选、语义 reaction、短期记忆、名字触发

后续阶段：

1. Ghostty / Warp 等非 tmux 终端宿主
2. 更完整的 sidecar 动画和视觉精修
3. runtime observer 模型接入继续打磨
