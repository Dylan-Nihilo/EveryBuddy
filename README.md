# EveryBuddy

EveryBuddy 是一个终端宠物。第一次运行 `buddy` 时，它会直接进入抽卡式初始化：先揭晓骨架和稀有度，再做一次 AI soul imprint，最后把这只宠物保存到 `~/.terminal-buddy/companion.json`。

当前产品形态先只打通 `tmux + zsh`。你抽到的宠物可以继续挂在 tmux sidecar 里，跟着你的 shell 命令做反应。

## Quick Start

全局安装：

```bash
npm install -g everybuddy
```

第一次运行：

```bash
buddy
```

如果本机还没有配置 API key，初始化流程会直接在终端里提示你输入，并写入：

```text
~/.terminal-buddy/config.json
```

抽卡完成后，查看当前宠物：

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

`bones reveal` 完全本地执行，不依赖网络。它会揭晓：

- species
- rarity
- eyes
- hat
- stats
- sprite

`soul imprint` 继续使用非流式 OpenAI-compatible `chat/completions`，生成：

- name
- personality

如果 soul imprint 失败：

- 不会写入 `companion.json`
- 会在当前流程里显示失败原因
- 可以当场重试
- 重试沿用同一套 bones，不会重新抽卡

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
  确认后覆盖当前宠物，重新抽卡。
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

后续文档主叙事只围绕 `buddy` / `buddy pet` / `buddy install tmux`。

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

## Configuration

存储目录固定为：

```text
~/.terminal-buddy/
```

文件说明：

- `config.json`
  provider 配置
- `companion.json`
  当前已绑定宠物

支持的环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `OPENAI_OBSERVER_MODEL`
- `EVERYBUDDY_USER_ID`
- `DASHSCOPE_API_KEY`

配置优先级：

```text
CLI flags > env vars > ~/.terminal-buddy/config.json > defaults
```

当前默认值：

- `OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1`
- `OPENAI_MODEL=qwen3.5-plus`

可选的 observer 小模型：

- `OPENAI_OBSERVER_MODEL=<fast-model>`

如果设置了 `OPENAI_OBSERVER_MODEL`，tmux sidecar 的观察者反应会优先使用这个模型。

当前默认行为：

- 当 `baseUrl` 是 `https://coding.dashscope.aliyuncs.com/v1` 时，observer 默认使用 `qwen3-coder-next`
- 其他 provider 未显式配置 `OPENAI_OBSERVER_MODEL` 时，observer 回退到 `OPENAI_MODEL`

## Third-Party OpenAI-Compatible Providers

EveryBuddy 当前只支持非流式 OpenAI-compatible `chat/completions`。

例如直接接第三方兼容上游：

```bash
OPENAI_BASE_URL=https://coding.dashscope.aliyuncs.com/v1 \
OPENAI_MODEL=qwen3.5-plus \
OPENAI_OBSERVER_MODEL=qwen3-coder-next \
OPENAI_API_KEY=your-key \
buddy
```

推荐先试：

- `qwen3.5-plus`
- `kimi-k2.5`
- `glm-5`
- `MiniMax-M2.5`

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
├── bones/     deterministic generation
├── cli/       product entry points and advanced commands
├── render/    card, sprite, and terminal composition
├── runtime/   tmux sidecar, socket bridge, observer
├── soul/      hatch prompt, parser, provider
├── storage/   config + persisted companion files
└── types/     shared domain/runtime types
```

## Status

当前已经完成：

- deterministic bones generation
- persisted companion records
- OpenAI-compatible soul hatch
- 抽卡式首次运行 onboarding
- `buddy install tmux`
- tmux window-level sidecar follow mode
- 命令筛选、语义 reaction、短期记忆、名字触发

后续阶段：

1. Ghostty / Warp 等非 tmux 终端宿主
2. 更完整的 sidecar 动画和视觉精修
3. chat / resident mode / 更强上下文感知
