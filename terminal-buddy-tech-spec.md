# terminal-buddy — 技术方案

> 一个独立的、不绑定任何 AI 编码工具的终端 AI 宠物伴侣。
> 开源、可配置多模型、确定性生成、ASCII 渲染、shell 感知。

---

## 1. 产品定位

### 核心理念

Claude Code Buddy 证明了终端宠物的产品价值，但它是封闭的、绑定单一工具的。
terminal-buddy 要做的是：**一个开源的、活在任何终端里的 AI 伴侣**。

### 差异化

| | Claude Code Buddy | terminal-buddy |
|---|---|---|
| 绑定工具 | Claude Code only | 独立运行，任何终端 |
| 模型 | Claude only | 可配置（Claude/OpenAI/Ollama/...） |
| 运行方式 | session 内嵌 | 常驻进程（tmux pane / 独立窗口） |
| 开源 | 否（泄露） | MIT，第一天开源 |
| 宠物性格 | 通用 watcher | **模型感知** — 不同模型 = 不同性格底色 |

### MVP 目标

快速出一个能跑的版本，核心体验：

1. 输入 user ID → 确定性 hatch 一只宠物
2. 宠物有 ASCII 外观 + 颜色 + 属性 + AI 生成的名字和性格
3. 宠物能在终端里显示、有 idle 动画
4. 可以跟宠物对话（接 AI 模型）
5. 宠物能感知 shell 活动并做出反应

---

## 2. 架构设计

### 双层架构：Bones + Soul（沿用 Buddy 的核心 pattern）

```
┌─────────────────────────────────────────────┐
│              terminal-buddy                  │
├──────────────┬──────────────────────────────┤
│   Bones      │   Soul                       │
│  (确定性)     │  (AI 生成，一次性)             │
│              │                              │
│  · species   │  · name                      │
│  · rarity    │  · personality description   │
│  · eyes      │  · model affinity            │
│  · hat       │    (哪个模型生成 = 性格底色)    │
│  · stats     │                              │
│  · color     │                              │
├──────────────┴──────────────────────────────┤
│              Runtime                         │
│  · ASCII renderer (tick-based animation)    │
│  · Shell watcher (activity sensing)         │
│  · Speech bubble (reaction system)          │
│  · AI conversation (multi-model)            │
└─────────────────────────────────────────────┘
```

### 模块划分

```
terminal-buddy/
├── src/
│   ├── bones/              # 确定性生成
│   │   ├── roll.ts         # Mulberry32 PRNG + hash
│   │   ├── species.ts      # 物种定义
│   │   ├── rarity.ts       # 稀有度系统
│   │   └── stats.ts        # 属性生成
│   │
│   ├── soul/               # AI 人格生成
│   │   ├── hatch.ts        # 首次孵化（调 LLM 生成名字+性格）
│   │   ├── providers/      # 多模型适配
│   │   │   ├── types.ts    # Provider interface
│   │   │   ├── claude.ts
│   │   │   ├── openai.ts
│   │   │   ├── ollama.ts
│   │   │   └── index.ts    # provider registry
│   │   └── personality.ts  # 性格模板 + model affinity
│   │
│   ├── render/             # 终端渲染
│   │   ├── sprites.ts      # ASCII 精灵图数据
│   │   ├── compose.ts      # body + eyes + hat 组合
│   │   ├── animate.ts      # tick 动画循环
│   │   ├── bubble.ts       # 语音气泡
│   │   ├── color.ts        # ANSI 颜色系统
│   │   └── layout.ts       # 布局计算（pane 尺寸适配）
│   │
│   ├── watcher/            # 环境感知
│   │   ├── shell.ts        # shell 活动监听
│   │   ├── git.ts          # git 操作感知
│   │   ├── process.ts      # 进程监控（编译、测试等）
│   │   └── triggers.ts     # 事件 → 反应映射
│   │
│   ├── chat/               # 对话系统
│   │   ├── conversation.ts # 对话管理
│   │   ├── context.ts      # 宠物 system prompt 构建
│   │   └── commands.ts     # 用户命令解析
│   │
│   ├── storage/            # 持久化
│   │   ├── config.ts       # ~/.terminal-buddy/config.json
│   │   ├── companion.ts    # ~/.terminal-buddy/companion.json
│   │   └── history.ts      # 对话历史
│   │
│   ├── cli/                # CLI 入口
│   │   ├── index.ts        # 主命令
│   │   ├── hatch.ts        # buddy hatch
│   │   ├── card.ts         # buddy card
│   │   ├── chat.ts         # buddy chat
│   │   ├── pet.ts          # buddy pet（互动）
│   │   └── config.ts       # buddy config
│   │
│   └── index.ts            # 主入口
│
├── sprites/                # sprite gallery（设计稿资产）
│   └── gallery.jsx         # React 预览（即附带的 sprites-lab）
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE                 # MIT
```

---

## 3. 核心实现

### 3.1 Bones — 确定性生成

```typescript
// src/bones/roll.ts

const SALT = "terminal-buddy-2026";  // 我们自己的 salt

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export interface CompanionBones {
  species: string;
  rarity: Rarity;
  eye: string;
  hat: string;
  stats: Record<string, number>;
  color: { primary: string; accent: string };
  shiny: boolean;
}

export function roll(userId: string): CompanionBones {
  const seed = hashString(userId + SALT);
  const rng = mulberry32(seed);

  const species = pickWeighted(rng, SPECIES_POOL);
  const rarity = pickWeighted(rng, RARITY_WEIGHTS);
  const eye = pickRandom(rng, EYES);
  const hat = rarity.tier > 0 ? pickRandom(rng, HATS) : "none";
  const stats = generateStats(rng, rarity.floor);
  const shiny = rng() < 0.01;
  const color = SPECIES_COLORS[species];

  return { species, rarity, eye, hat, stats, color, shiny };
}
```

### 3.2 Soul — AI 人格生成

```typescript
// src/soul/hatch.ts

export interface CompanionSoul {
  name: string;
  personality: string;
  modelUsed: string;  // 哪个模型生成的 → 性格底色
}

export async function hatchSoul(
  bones: CompanionBones,
  provider: AIProvider
): Promise<CompanionSoul> {
  const prompt = buildHatchPrompt(bones);
  const response = await provider.complete(prompt);
  const parsed = parseHatchResponse(response);

  return {
    name: parsed.name,
    personality: parsed.personality,
    modelUsed: provider.modelId,
  };
}

function buildHatchPrompt(bones: CompanionBones): string {
  return `You are naming and writing a personality for a terminal companion pet.

Species: ${bones.species}
Rarity: ${bones.rarity.name}
Stats: ${JSON.stringify(bones.stats)}
Shiny: ${bones.shiny}

Rules:
- Name: 1-2 words, memorable, fits the species
- Personality: 2-3 sentences, distinctive voice, references the stats
- Peak stat (${getPeakStat(bones.stats)}) should be a defining trait
- Dump stat (${getDumpStat(bones.stats)}) should be a charming flaw

Respond in JSON: { "name": "...", "personality": "..." }`;
}
```

### 3.3 多模型 Provider 系统

```typescript
// src/soul/providers/types.ts

export interface AIProvider {
  modelId: string;
  modelFamily: string;  // "claude" | "openai" | "ollama" | ...
  complete(prompt: string): Promise<string>;
  chat(messages: Message[], systemPrompt: string): Promise<string>;
}

// src/soul/providers/claude.ts
export class ClaudeProvider implements AIProvider {
  modelId = "claude-sonnet-4-20250514";
  modelFamily = "claude";

  async complete(prompt: string) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    return data.content[0].text;
  }
}

// src/soul/providers/openai.ts
export class OpenAIProvider implements AIProvider { /* ... */ }

// src/soul/providers/ollama.ts
export class OllamaProvider implements AIProvider { /* ... */ }
```

**Model Affinity 概念**：用 Claude 孵化的宠物会有一种性格底色，用 GPT 孵化的会有另一种。同一个 bones 配不同模型 = 不同的灵魂。这是差异化卖点。

### 3.4 渲染系统

```typescript
// src/render/compose.ts

const SPRITE_HEIGHT = 5;
const SPRITE_WIDTH = 12;

export function composeFrame(
  body: string[],        // 5 lines from species definition
  eyeChar: string,       // e.g. "·"
  hat: string | null,    // hat art string or null
  color: { primary: string; accent: string }
): string[] {
  let frame = [...body];

  // Layer 1: Hat on line 0
  if (hat && hat !== "none") {
    frame[0] = HATS[hat].art;
  }

  // Layer 2: Eyes injection
  frame = frame.map(line => line.replace(/\{E\}/g, eyeChar));

  // Layer 3: ANSI color wrapping
  frame = frame.map(line => colorize(line, color.primary));

  return frame;
}

// src/render/animate.ts
const TICK_MS = 500;

export function createAnimationLoop(
  frames: string[][],
  onFrame: (lines: string[]) => void
) {
  let idx = 0;
  return setInterval(() => {
    idx = (idx + 1) % frames.length;
    onFrame(frames[idx]);
  }, TICK_MS);
}
```

### 3.5 Shell Watcher

```typescript
// src/watcher/shell.ts

export interface ShellEvent {
  type: "command" | "output" | "error" | "git" | "idle";
  data: string;
  timestamp: number;
}

// 方案一：监听 shell history 文件变化
// 方案二：hook shell prompt（PROMPT_COMMAND / precmd）
// 方案三：读取 tmux pane 内容

export function createShellWatcher(method: "history" | "prompt" | "tmux") {
  // MVP 用 history 文件监听，最简单
  if (method === "history") {
    return watchFile(getHistoryPath(), (newLines) => {
      for (const line of newLines) {
        emit({ type: "command", data: line, timestamp: Date.now() });
      }
    });
  }
}

// src/watcher/triggers.ts
export const REACTION_MAP: Record<string, string[]> = {
  "git push":     ["Nice push!", "Ship it!", "To production we go~"],
  "git commit":   ["Another one for the history books", "Commit early, commit often"],
  "npm test":     ["*holds breath*", "Let's see...", "Tests are just suggestions, right?"],
  "rm -rf":       ["😱", "Brave.", "...you backed up first, right?"],
  "exit":         ["Wait, don't go!", "See you next time~", "*waves*"],
};
```

---

## 4. CLI 命令设计

```bash
# 安装
npm install -g terminal-buddy

# 首次使用 — 孵化
buddy hatch                      # 交互式，选择模型
buddy hatch --provider claude    # 指定模型
buddy hatch --provider ollama --model llama3

# 日常使用
buddy                            # 启动常驻模式（tmux pane 推荐）
buddy card                       # 查看宠物卡片
buddy chat                       # 跟宠物对话
buddy pet                        # 互动（摸头）
buddy mute / unmute              # 静音气泡
buddy stats                      # 查看属性

# 配置
buddy config                     # 编辑配置
buddy config set provider openai
buddy config set model gpt-4o

# 高级
buddy rehatch                    # 重新孵化（换模型 = 换灵魂）
buddy export                     # 导出宠物卡片（分享用）
buddy gallery                    # 预览所有物种
```

---

## 5. 显示方案

### MVP：tmux pane 模式

```
┌──────────────────────────────┬──────────────┐
│                              │              │
│    你的正常终端工作区          │   /\    /\   │
│    $ git status              │  ( ·  · )    │
│    $ npm run build           │  (  w   )    │
│    ...                       │   \____/     │
│                              │              │
│                              │  💬 Nice     │
│                              │  commit!     │
│                              │              │
└──────────────────────────────┴──────────────┘
```

启动方式：

```bash
# 自动创建 tmux split
buddy --tmux

# 或手动：在右侧 pane 运行
tmux split-window -h -l 20 "buddy"
```

### 后续扩展

- **iTerm2 status bar**：利用 iTerm2 的 status bar API
- **Warp block**：Warp 终端的自定义 block
- **Kitty overlay**：Kitty 终端的 overlay 窗口
- **纯 inline**：在 PS1 prompt 里嵌入状态

---

## 6. 数据存储

```
~/.terminal-buddy/
├── config.json          # 全局配置
├── companion.json       # 当前宠物数据（bones + soul）
└── history/             # 对话历史
    └── 2026-04-02.jsonl
```

```jsonc
// companion.json
{
  "bones": {
    "species": "tanuki",
    "rarity": { "tier": 2, "name": "Rare" },
    "eye": "·",
    "hat": "wizard",
    "stats": { "GRIT": 72, "FOCUS": 45, "CHAOS": 88, "WIT": 63, "SASS": 31 },
    "color": { "primary": "#C4A882", "accent": "#8B7355" },
    "shiny": false
  },
  "soul": {
    "name": "Mochi",
    "personality": "A chaotic tinkerer who gets distracted by shiny objects...",
    "modelUsed": "claude-sonnet-4-20250514"
  },
  "createdAt": "2026-04-02T...",
  "userId": "dylan-dev"
}
```

```jsonc
// config.json
{
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "apiKey": "sk-...",           // 或从环境变量读取
  "display": "tmux",
  "animationSpeed": 500,
  "bubbleEnabled": true,
  "watchShell": true,
  "language": "zh"              // 支持中英文
}
```

---

## 7. 技术栈

| 层 | 选择 | 理由 |
|---|---|---|
| 语言 | TypeScript | 你的核心栈，生态好 |
| 运行时 | Node.js（兼容 Bun） | 分发最广，npm 发包方便 |
| CLI 框架 | Commander.js | 轻量，够用 |
| 终端 UI | Ink（React for CLI） | 跟 Buddy 同技术，组件化渲染 |
| 颜色 | chalk | ANSI color 标准库 |
| 文件监听 | chokidar | shell history 监听 |
| HTTP | node-fetch / built-in | API 调用 |
| 包管理 | pnpm | 你的习惯 |

---

## 8. 实现路线

### Phase 1 — Skeleton（1-2天）

- [ ] 项目脚手架（TS + pnpm + ESLint）
- [ ] Bones 生成系统（roll + species + rarity + stats）
- [ ] Sprites 数据（从 gallery 迁移 10 个物种）
- [ ] ASCII 渲染（compose + animate）
- [ ] `buddy card` 命令 — 静态卡片输出

**里程碑**：`buddy card` 能显示一只带颜色的宠物

### Phase 2 — Soul（1-2天）

- [ ] Provider 接口定义
- [ ] Claude provider 实现
- [ ] OpenAI provider 实现
- [ ] Ollama provider 实现
- [ ] `buddy hatch` 命令 — 孵化流程
- [ ] companion.json 持久化

**里程碑**：`buddy hatch --provider claude` 能孵化出有名字有性格的宠物

### Phase 3 — Alive（2-3天）

- [ ] Ink 常驻 UI（tmux pane 模式）
- [ ] Tick 动画循环
- [ ] Speech bubble 组件
- [ ] Shell watcher（history 文件监听）
- [ ] 反应系统（command → reaction mapping）
- [ ] `buddy` 常驻启动命令

**里程碑**：宠物在终端里活着，能对 shell 命令做出反应

### Phase 4 — Chat（1-2天）

- [ ] 对话模式 `buddy chat`
- [ ] 宠物 system prompt（基于 personality + stats）
- [ ] 对话历史持久化
- [ ] 互动命令 `buddy pet`

**里程碑**：能跟宠物用自然语言对话

### Phase 5 — Polish & Ship（1-2天）

- [ ] README.md（中英双语）
- [ ] npm 发包
- [ ] GitHub repo 设置
- [ ] 小红书发布素材准备
- [ ] 社区群推广

**总计预估：6-10 天到开源发布**

---

## 9. 开源策略

### Day 1 开源清单

- MIT License
- 完整 README（English + 中文）
- Contributing guide
- GitHub Actions CI
- npm publish workflow

### 社区运营

- **小红书**：宠物图鉴 + 开发过程记录（你的内容渠道）
- **社区群**：作为 AI 社区的实战案例
- **GitHub**：issue 模板（新物种提案 / 新 provider / bug）
- **话题性**：物种投票、社区提交 sprites、shiny 晒卡

### 后续扩展方向

- 社区提交物种 PR
- 宠物进化系统（基于使用时长/活动）
- 多宠物收集
- 跨终端同步
- Web gallery（展示所有用户宠物）
- VS Code / Cursor 扩展

---

## 10. Sprite Gallery

附带的 `sprites-lab.jsx` 是完整的物种设计预览工具，包含：

- 15 个候选物种（待你选定最终 10 个）
- 交互式 Composer（species × eyes × hats × rarity）
- 确定性 Generator demo
- Lineup 选择器
- 每个物种独立的双色方案

**从 gallery 迁移到代码的步骤**：
1. 在 Lineup 里选定最终 10 个物种
2. 导出 species 定义（frames + colors）
3. 移植到 `src/render/sprites.ts`
4. 每个物种的 `{E}` 和 hat 组合规则保持一致

---

*Dylan — terminal-buddy technical spec v1.0 — 2026-04-02*
