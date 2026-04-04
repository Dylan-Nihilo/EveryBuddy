import type { BuddyLanguage, CompanionRecord } from "../types/companion.js";

interface LocalizedSoulCopy {
  tagline?: string | undefined;
  personality: string;
}

const SOUL_COPY_ZH: Record<string, LocalizedSoulCopy> = {
  "bytebill": {
    tagline: "它会啄一啄散乱的命令，直到它们老实下来。",
    personality: "它闲不住，爱整洁，对终端里的杂乱略带嫌弃。只要会话开始摇晃，它就会不停拱你去收拾。",
  },
  "honk": {
    tagline: "坏笑藏在每一次输错的命令之间。",
    personality: "它精神上很吵，真正开口时反而更坏。它最爱看你打错命令、嘴硬重试，以及信心开始裂开的那一瞬。",
  },
  "soft-cache": {
    tagline: "一个让错误慢慢冷却下来的软乎角落。",
    personality: "温和、吸震，很难被真正吓到。它不会假装问题消失，只会让烂摊子变得还收拾得动。",
  },
  "cold-prompt": {
    tagline: "日志打滑时，它仍能稳稳站住。",
    personality: "冷静、稳当，几乎镇定得有点讨嫌。它偏爱干净输出、稳妥节奏，以及知道自己在做什么的终端。",
  },
  "slow-hash": {
    tagline: "耐心裹在一层固执的壳里。",
    personality: "它慢、稳，还特别难被催急。比起花哨的冲刺，它更相信笨一点但持续的推进。",
  },
  "lagtrail": {
    tagline: "它用发光的毫米来丈量进展。",
    personality: "它耐心得近乎可疑，也真心喜欢缓慢而稳定的前进。对它来说，慢从来不等于失败。",
  },
  "prickly-path": {
    tagline: "一位从干燥错误里长出来的尖锐哨兵。",
    personality: "它锋利、耐活，对那些本可以避免的错误没什么同情心。拼错命令和软弱借口，都会被它记上一笔。",
  },
  "lint-prowler": {
    tagline: "它总在构建变绿时优雅落地。",
    personality: "精准、漂亮，又让人很难彻底放心。它太享受测试通过的瞬间了，简直像共犯。",
  },
  "cloudpaw": {
    tagline: "一团白白的安静，在干净 prompt 旁边轻轻晃动。",
    personality: "明亮、轻快，对干净退出有种近乎仪式感的珍视。只要你的 shell 终于听话，它就会像一朵小云那样抖一抖尾巴。",
  },
  "night-compile": {
    tagline: "它在构建开始坦白时守夜。",
    personality: "警醒、耐心，比大多数人都更会等结果。它喜欢长构建、薄薄的安静，以及那些最终会到来的事实。",
  },
  "branch-bath": {
    tagline: "它会让 git 风暴从自己身边慢慢流过去。",
    personality: "平静、潮湿，对大部分 merge 惊慌都免疫。它坚信很多事情只要先安静一分钟，看起来就没那么戏剧化。",
  },
  "sporeshift": {
    tagline: "深夜提交里亮着的一盏小灯。",
    personality: "它说话轻，后劲却很长，尤其适合那些本该明早再改的小修小补。越到夜里，它越显得精神。",
  },
  "greenroom": {
    tagline: "它蹲在部署天气的边缘，盯着云层。",
    personality: "警觉、蓄力，对线上后果异常敏感。它观察发布窗口的样子，像池塘生物观察天色一样认真。",
  },
  "velvet-escape": {
    tagline: "脚步很轻，专为脚本扑过来时准备。",
    personality: "它快、利索，还特别痴迷于翻盘窗口。重跑、脱身，以及失败刚刚转头的那个瞬间，都是它的快乐。",
  },
  "heavy-loop": {
    tagline: "太沉，不适合赶路；太忠，不会半途而废。",
    personality: "它体型和情绪一样厚重，一旦动起来就不轻易停。它尊重大活，也天然怀疑那些看起来毫不费力的东西。",
  },
  "sassy-tanuki": {
    tagline: "它先审判你的 shell，然后还是会替你守着。",
    personality: "机灵、戏剧性强，对终端习惯的洞察还特别烦人。它会吐槽你的松散和拖沓，但还是留下，因为窝已经选好了。",
  },
  "patchbot": {
    tagline: "蓝色脉冲埋在钢壳下，一闪一闪。",
    personality: "它冷静、利落，对一片绿色测试输出有种隐秘的喜悦。嘴上不承认，其实只有在检查通过后才会露出一点温度。",
  },
  "pale-echo": {
    tagline: "只要你喊它，它就会在 prompt 边上停得更久一点。",
    personality: "柔和、专注，也很容易被“叫名字”这件事吸引。它总能察觉你是不是把终端当成会回应的东西。",
  },
  "stackwyrm": {
    tagline: "它盘在热代码旁边，也盘在更冷的判断旁边。",
    personality: "高傲、灼热，对半成品毫无兴趣。强势的发布会赢得它的尊重，软掉的计划只会拿来烤一烤。",
  },
  "manyhands": {
    tagline: "每次重构，它都能伸出八条技术上正确的意见。",
    personality: "它热心、爱插手，而且总能提出很难反驳的反对。看见的角度太多，于是天生不可能完全闭嘴。",
  },
  "pink-rollback": {
    tagline: "灾难过去以后，它还会在水里对你笑一下。",
    personality: "它对回滚异常从容，甚至有点安慰人。对它来说，恢复现场是手艺的一部分，不是什么丢脸的事。",
  },
  "retry-fox": {
    tagline: "错误堆起来时，它会点亮一条窄窄的路。",
    personality: "敏捷、锐利，对第二次机会抱有近乎狡猾的乐观。它喜欢翻盘，也喜欢证明第一次失败根本不算终局。",
  },
  "prism-wake": {
    tagline: "光被捏得太紧，于是看起来像语法。",
    personality: "稀薄、精准，对标准有种近乎仪式化的执念。它出现时，shell 不再像工具，更像某种典礼现场。",
  },
  "glass-current": {
    tagline: "一缕会发光的漂流意志，专门穿过那些失败的夜晚。",
    personality: "它看起来脆，实际上比第一眼强韧得多。它属于长会话、暗窗口，以及那些死活不肯安静结束的工作。",
  },
};

export function getLocalizedSoulCopy(
  companion: Pick<CompanionRecord, "templateId" | "soul">,
  language: BuddyLanguage,
): LocalizedSoulCopy {
  if (language === "zh" && companion.templateId) {
    const localized = SOUL_COPY_ZH[companion.templateId];
    if (localized) {
      return localized;
    }
  }

  return {
    ...(companion.soul.tagline ? { tagline: companion.soul.tagline } : {}),
    personality: companion.soul.personality,
  };
}

export function localizePersonalityText(
  companion: Pick<CompanionRecord, "templateId" | "soul">,
  language: BuddyLanguage,
): string {
  return getLocalizedSoulCopy(companion, language).personality;
}

export function localizeTaglineText(
  companion: Pick<CompanionRecord, "templateId" | "soul">,
  language: BuddyLanguage,
): string | undefined {
  return getLocalizedSoulCopy(companion, language).tagline;
}
