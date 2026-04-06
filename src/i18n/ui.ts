import type { BuddyLanguage, ObserverVoice, StatName } from "../types/companion.js";

export interface UiText {
  noCompanionFound: string;
  companionTitle: string;
  personalityTitle: string;
  traitsTitle: string;
  statsTitle: string;
  seedLabel: string;
  speciesLabel: string;
  rarityLabel: string;
  eyesLabel: string;
  hatLabel: string;
  bornLabel: string;
  shinyLabel: string;
  peakMarker: string;
  dumpMarker: string;
  thinking: string;
  commandFailed: string;
  noCompanionSidecar: string;
  runBuddyHint: string;
  inProject(projectName: string): string;
  alreadyHatched: string;
  installTmuxHint: string;
  tmuxInstalledHint: string;
  petAgainHint: string;
  rehatchHint: string;
  needReplaceConfirmation: string;
  replaceCompanionConfirm: string;
  rehatchCancelled: string;
  companionExistsTitle: string;
  stillBound(name: string): string;
  drawNewCompanionNow: string;
  companionExistsError: string;
  wakingUp: string;
  rebinding: string;
  bonesReveal: string;
  soulImprint: string;
  finalReveal: string;
  seedLocked(userId: string): string;
  soulImprintLead: string;
  savedTo(pathname: string): string;
  installTmuxNext: string;
  providerTestFailed: string;
  tmuxMissing: string;
  tmuxMissingHint: string;
  macInstallTmux: string;
  zshOnly: string;
  zshOnlyHint: string;
  alreadyInstalled(pathname: string): string;
  sourceHint(pathname: string): string;
  openTmuxHint: string;
  interactiveRequired: string;
  installConfirm: string;
  skippedInstall: string;
  installLaterHint: string;
  installedInto(pathname: string): string;
  openTmuxSessionHint: string;
  autoAppearHint: string;
  hatchSuccess(name: string, userId: string): string;
  attachRequiresTmux: string;
  attachRequiresTmuxHint: string;
  detachRequiresTmux: string;
}

const EN_TEXT: UiText = {
  noCompanionFound: "No companion found. Run `buddy` to hatch one.",
  companionTitle: "EveryBuddy Companion",
  personalityTitle: "Personality",
  traitsTitle: "Traits",
  statsTitle: "Stats",
  seedLabel: "seed",
  speciesLabel: "Species",
  rarityLabel: "Rarity",
  eyesLabel: "Eyes",
  hatLabel: "Hat",
  bornLabel: "Born",
  shinyLabel: "SHINY",
  peakMarker: "peak",
  dumpMarker: "dump",
  thinking: "thinking",
  commandFailed: "command failed",
  noCompanionSidecar: "No companion hatched yet.",
  runBuddyHint: "Run `buddy`",
  inProject(projectName: string): string {
    return `in ${projectName}`;
  },
  alreadyHatched: "EveryBuddy is already hatched.",
  installTmuxHint: "Run `buddy install tmux` to add the sidecar to tmux.",
  tmuxInstalledHint: "tmux follow mode is installed. Open a new tmux window to see it.",
  petAgainHint: "Run `buddy pet` to view this card again.",
  rehatchHint: "Run `buddy rehatch` to draw a new companion.",
  needReplaceConfirmation: "EveryBuddy needs confirmation before replacing the current companion.",
  replaceCompanionConfirm: "Replace your current companion with a new draw?",
  rehatchCancelled: "Rehatch cancelled.",
  companionExistsTitle: "A companion is already hatched.",
  stillBound(name: string): string {
    return `${name} is still bound to this terminal.`;
  },
  drawNewCompanionNow: "Draw a new companion now?",
  companionExistsError: "A companion already exists. Run `buddy rehatch` to replace it.",
  wakingUp: "EveryBuddy is waking up...",
  rebinding: "Rebinding EveryBuddy...",
  bonesReveal: "Bones Reveal",
  soulImprint: "Soul Imprint",
  finalReveal: "Final Reveal",
  seedLocked(userId: string): string {
    return `seed locked to ${userId}`;
  },
  soulImprintLead: "The draw is fixed. The soul steps out of the atlas.",
  savedTo(pathname: string): string {
    return `Saved to ${pathname}`;
  },
  installTmuxNext: "Next: install tmux follow mode so this companion can live beside your shell.",
  providerTestFailed: "Connection test failed — your buddy may not react. Re-run `buddy setup` to reconfigure.",
  tmuxMissing: "tmux is not installed yet.",
  tmuxMissingHint: "Install it first, then run `buddy install tmux` again.",
  macInstallTmux: "macOS: `brew install tmux`",
  zshOnly: "Only zsh is supported for terminal follow mode right now.",
  zshOnlyHint: "Switch to zsh, then run `buddy install tmux` again.",
  alreadyInstalled(pathname: string): string {
    return `EveryBuddy is already installed in ${pathname}.`;
  },
  sourceHint(pathname: string): string {
    return `Run \`source ${pathname}\` in this shell.`;
  },
  openTmuxHint: "Then open a new tmux window and EveryBuddy will auto-attach there.",
  interactiveRequired: "EveryBuddy needs an interactive terminal to modify ~/.zshrc.",
  installConfirm: "Install EveryBuddy tmux follow mode into ~/.zshrc now?",
  skippedInstall: "Skipped tmux installation.",
  installLaterHint: "Run `buddy install tmux` when you want EveryBuddy to auto-follow in tmux.",
  installedInto(pathname: string): string {
    return `Installed EveryBuddy into ${pathname}.`;
  },
  openTmuxSessionHint: "Then open a new tmux session or tmux window.",
  autoAppearHint: "EveryBuddy will appear on the right side automatically.",
  hatchSuccess(name: string, userId: string): string {
    return `Hatched ${name} for ${userId} from the bundled atlas.`;
  },
  attachRequiresTmux: "EveryBuddy attach requires a tmux session.",
  attachRequiresTmuxHint: "Start a tmux session first, then run `buddy attach` inside it.",
  detachRequiresTmux: "Not inside a tmux session — nothing to detach.",
};

const ZH_TEXT: UiText = {
  noCompanionFound: "未找到宠物。先运行 `buddy` 来抽取一只。",
  companionTitle: "EveryBuddy 宠物卡",
  personalityTitle: "性格",
  traitsTitle: "特征",
  statsTitle: "属性",
  seedLabel: "种子",
  speciesLabel: "物种",
  rarityLabel: "稀有度",
  eyesLabel: "眼睛",
  hatLabel: "帽子",
  bornLabel: "诞生于",
  shinyLabel: "闪光",
  peakMarker: "峰值",
  dumpMarker: "短板",
  thinking: "思考中",
  commandFailed: "命令失败",
  noCompanionSidecar: "还没有孵化任何宠物。",
  runBuddyHint: "运行 `buddy`",
  inProject(projectName: string): string {
    return `项目 ${projectName}`;
  },
  alreadyHatched: "EveryBuddy 已经完成绑定。",
  installTmuxHint: "运行 `buddy install tmux` 把 sidecar 接进 tmux。",
  tmuxInstalledHint: "tmux 跟随模式已安装。新开一个 tmux window 就能看到它。",
  petAgainHint: "运行 `buddy pet` 再看一次这张卡。",
  rehatchHint: "运行 `buddy rehatch` 重抽一只新宠物。",
  needReplaceConfirmation: "EveryBuddy 需要先确认，才能替换当前宠物。",
  replaceCompanionConfirm: "要用新的抽卡结果替换当前宠物吗？",
  rehatchCancelled: "已取消重抽。",
  companionExistsTitle: "已经有一只宠物了。",
  stillBound(name: string): string {
    return `${name} 还绑定在这个终端上。`;
  },
  drawNewCompanionNow: "现在要重抽一只新宠物吗？",
  companionExistsError: "已经存在宠物。运行 `buddy rehatch` 来替换。",
  wakingUp: "EveryBuddy 正在苏醒...",
  rebinding: "EveryBuddy 正在重绑定...",
  bonesReveal: "骨架揭晓",
  soulImprint: "灵魂铭刻",
  finalReveal: "最终揭晓",
  seedLocked(userId: string): string {
    return `seed 已锁定到 ${userId}`;
  },
  soulImprintLead: "抽卡结果已经固定，灵魂正从图鉴里走出。",
  savedTo(pathname: string): string {
    return `已保存到 ${pathname}`;
  },
  installTmuxNext: "下一步：安装 tmux 跟随模式，让这只宠物住到你的终端旁边。",
  providerTestFailed: "连接测试失败，宠物可能不会做出反应。你可以稍后用 `buddy setup` 重新配置。",
  tmuxMissing: "当前还没有安装 tmux。",
  tmuxMissingHint: "先装好 tmux，再重新运行 `buddy install tmux`。",
  macInstallTmux: "macOS：`brew install tmux`",
  zshOnly: "终端跟随模式当前只支持 zsh。",
  zshOnlyHint: "切到 zsh 后，再运行 `buddy install tmux`。",
  alreadyInstalled(pathname: string): string {
    return `EveryBuddy 已经写入 ${pathname}。`;
  },
  sourceHint(pathname: string): string {
    return `在当前 shell 里运行 \`source ${pathname}\`。`;
  },
  openTmuxHint: "然后新开一个 tmux window，EveryBuddy 就会自动挂上去。",
  interactiveRequired: "EveryBuddy 需要交互式终端，才能修改 ~/.zshrc。",
  installConfirm: "现在把 EveryBuddy 的 tmux 跟随模式写进 ~/.zshrc 吗？",
  skippedInstall: "已跳过 tmux 安装。",
  installLaterHint: "等你想让 EveryBuddy 在 tmux 里自动跟随时，再运行 `buddy install tmux`。",
  installedInto(pathname: string): string {
    return `已把 EveryBuddy 安装到 ${pathname}。`;
  },
  openTmuxSessionHint: "然后新开一个 tmux session 或 tmux window。",
  autoAppearHint: "EveryBuddy 会自动出现在右侧。",
  hatchSuccess(name: string, userId: string): string {
    return `已从内置图鉴中为 ${userId} 绑定 ${name}。`;
  },
  attachRequiresTmux: "buddy attach 需要在 tmux 会话内运行。",
  attachRequiresTmuxHint: "先启动一个 tmux 会话，再在里面运行 `buddy attach`。",
  detachRequiresTmux: "当前不在 tmux 会话中，没有可分离的 sidecar。",
};

const SPECIES_NAMES_ZH: Record<string, string> = {
  duck: "鸭子",
  goose: "鹅",
  blob: "软团",
  cat: "猫",
  maltese: "马尔济斯",
  dragon: "龙",
  octopus: "章鱼",
  owl: "猫头鹰",
  penguin: "企鹅",
  turtle: "乌龟",
  snail: "蜗牛",
  ghost: "幽灵",
  axolotl: "六角恐龙",
  capybara: "水豚",
  cactus: "仙人掌",
  robot: "机器人",
  rabbit: "兔子",
  mushroom: "蘑菇",
  chonk: "胖团",
  tanuki: "狸猫",
  fox: "狐狸",
  frog: "青蛙",
  crystal: "水晶灵",
  jellyfish: "水母",
};

const EYE_LABELS_ZH: Record<string, string> = {
  dot: "点眼",
  sparkle: "闪眼",
  star: "星眼",
  ring: "环眼",
  heart: "爱心眼",
  diamond: "菱眼",
};

const HAT_LABELS_ZH: Record<string, string> = {
  none: "无",
  crown: "皇冠",
  tophat: "高礼帽",
  propeller: "螺旋桨帽",
  halo: "光环",
  wizard: "巫师帽",
  beanie: "毛线帽",
  tinyduck: "小黄鸭",
  antenna: "天线",
  leaf: "叶片",
  flame: "火焰冠",
};

export function uiText(language: BuddyLanguage): UiText {
  return language === "zh" ? ZH_TEXT : EN_TEXT;
}

export function localizeRarityName(name: string, language: BuddyLanguage): string {
  if (language !== "zh") {
    return name;
  }

  switch (name) {
    case "Common":
      return "普通";
    case "Uncommon":
      return "非凡";
    case "Rare":
      return "稀有";
    case "Epic":
      return "史诗";
    case "Legendary":
      return "传说";
    default:
      return name;
  }
}

export function localizeSpeciesName(speciesId: string, fallback: string, language: BuddyLanguage): string {
  return language === "zh" ? (SPECIES_NAMES_ZH[speciesId] ?? fallback) : fallback;
}

export function localizeEyeLabel(eyeId: string, fallback: string, language: BuddyLanguage): string {
  return language === "zh" ? (EYE_LABELS_ZH[eyeId] ?? fallback) : fallback;
}

export function localizeHatLabel(hatId: string, fallback: string, language: BuddyLanguage): string {
  return language === "zh" ? (HAT_LABELS_ZH[hatId] ?? fallback) : fallback;
}

export function localizeStatName(stat: StatName, language: BuddyLanguage): string {
  if (language !== "zh") {
    return stat;
  }

  switch (stat) {
    case "GRIT":
      return "抗压";
    case "FOCUS":
      return "专注";
    case "CHAOS":
      return "混沌";
    case "WIT":
      return "机灵";
    case "SASS":
      return "毒舌";
  }
}

export function localizeVoiceLabel(voice: ObserverVoice, language: BuddyLanguage): string {
  if (language === "zh") {
    switch (voice) {
      case "quiet":
        return "安静型";
      case "dry":
        return "冷面型";
      case "playful":
        return "俏皮型";
      case "deadpan":
        return "面瘫型";
    }
  }

  switch (voice) {
    case "quiet":
      return "quiet";
    case "dry":
      return "dry";
    case "playful":
      return "playful";
    case "deadpan":
      return "deadpan";
  }
}
