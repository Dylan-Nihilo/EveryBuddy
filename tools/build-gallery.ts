import fs from "node:fs";

// Force color output — our render functions skip ANSI when isTTY is false
Object.defineProperty(process.stdout, "isTTY", { value: true });

import { BUNDLED_COMPANION_TEMPLATES, buildBundledCompanionRecord } from "../src/atlas/bundled.js";
import { renderCompanionCard } from "../src/render/card.js";
import { composeFrame } from "../src/render/compose.js";
import { SPECIES, EYES } from "../src/render/sprites.js";

// Note: This is a build-time tool that converts our own ANSI output to HTML.
// The content is fully trusted (generated from our own codebase), not user input.

function ansiToHtml(str: string): string {
  let h = "";
  let open = 0;
  for (const p of str.split(/(\x1b\[[0-9;]*m)/)) {
    const m = p.match(/^\x1b\[([0-9;]*)m$/);
    if (!m) {
      h += p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      continue;
    }
    const c = m[1];
    if (c === "0") {
      while (open > 0) { h += "</span>"; open--; }
      continue;
    }
    if (c === "1") { h += '<span class="b">'; open++; continue; }
    if (c === "2") { h += '<span class="d">'; open++; continue; }
    if (c === "3") { h += '<span class="i">'; open++; continue; }
    const rgb = c?.match(/^38;2;(\d+);(\d+);(\d+)$/);
    if (rgb) { h += `<span style="color:rgb(${rgb[1]},${rgb[2]},${rgb[3]});">`; open++; }
  }
  while (open > 0) { h += "</span>"; open--; }
  return h;
}

interface CompanionData {
  id: string;
  name: string;
  species: string;
  rarity: string;
  tier: number;
  rc: string;
  sc: string;
  ac: string;
  spriteFrames: string[];
  zhCardFrames: string[];
  enCardFrames: string[];
}

const companions: CompanionData[] = BUNDLED_COMPANION_TEMPLATES.map((t) => {
  const r = buildBundledCompanionRecord("gallery", t);
  const sp = SPECIES[r.bones.species]!;
  const eye = EYES[r.bones.eye]!;
  const spriteFrames = sp.frames.map((f) =>
    ansiToHtml(composeFrame(f, eye.char, r.bones.hat, r.bones.color).join("\n")),
  );
  const zhCardFrames = sp.frames.map((_, i) =>
    ansiToHtml(renderCompanionCard(r, { language: "zh", spriteFrameIndex: i })),
  );
  const enCardFrames = sp.frames.map((_, i) =>
    ansiToHtml(renderCompanionCard(r, { language: "en", spriteFrameIndex: i })),
  );
  return {
    id: t.id, name: t.soul.name, species: r.bones.species,
    rarity: r.bones.rarity.name, tier: r.bones.rarity.tier,
    rc: r.bones.rarity.color, sc: r.bones.color.primary, ac: r.bones.color.accent,
    spriteFrames, zhCardFrames, enCardFrames,
  };
});

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const rzh: Record<string, string> = {
  Common: "普通 ·", Uncommon: "非凡 · ·", Rare: "稀有 ✦ ✦ ✦",
  Epic: "史诗 ✦ ✦ ✦ ✦", Legendary: "传说 ★ ★ ★ ★ ★",
};
const grouped: Record<string, CompanionData[]> = {};
for (const c of companions) (grouped[c.rarity] ??= []).push(c);

const framesJson: Record<string, string[]> = {};
for (const c of companions) {
  framesJson[c.id] = c.spriteFrames;
  framesJson[`${c.id}-zh`] = c.zhCardFrames;
  framesJson[`${c.id}-en`] = c.enCardFrames;
}

let sections = "";
for (const r of rarityOrder) {
  const items = grouped[r];
  if (!items) continue;
  let pets = "";
  for (const c of items) {
    pets += `
    <div class="pet">
      <div class="pet-head">
        <span class="pet-name" style="color:${c.rc}">${c.name}</span>
        <span class="pet-species">${c.species}</span>
        <span class="colors">
          <span class="cdot" style="background:${c.sc}"></span><span class="clabel">species</span>
          <span class="cdot" style="background:${c.ac}"></span><span class="clabel">accent</span>
          <span class="cdot" style="background:${c.rc}"></span><span class="clabel">rarity</span>
        </span>
      </div>
      <div class="pet-row">
        <div class="sprite-box">
          <div class="sprite-label">Sprite</div>
          <pre class="sprite-frame" data-anim="${c.id}">${c.spriteFrames[0]}</pre>
        </div>
        <div class="card-box">
          <div class="clbl">中文</div>
          <pre class="term" data-anim="${c.id}-zh">${c.zhCardFrames[0]}</pre>
        </div>
        <div class="card-box">
          <div class="clbl">English</div>
          <pre class="term" data-anim="${c.id}-en">${c.enCardFrames[0]}</pre>
        </div>
      </div>
    </div>`;
  }
  sections += `
  <div class="rg">
    <div class="rt" style="color:${items[0]!.rc}">${rzh[r]} ${r} (${items.length})</div>
    ${pets}
  </div>`;
}

const escapedFrames = JSON.stringify(framesJson);

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>EveryBuddy Gallery</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d1117;color:#c9d1d9;font-family:"SF Mono","Cascadia Code","Fira Code",monospace;padding:24px}
h1{text-align:center;color:#fff;font-size:22px;margin-bottom:6px}
.sub{text-align:center;color:#8b949e;font-size:13px;margin-bottom:32px}
.rg{margin-bottom:48px}
.rt{font-size:16px;font-weight:700;margin-bottom:20px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.1)}
.pet{margin-bottom:32px;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)}
.pet-head{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}
.pet-name{font-size:15px;font-weight:700}
.pet-species{font-size:12px;color:#8b949e}
.pet-row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.sprite-box{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px 16px;text-align:center;min-width:160px}
.sprite-label,.clbl{font-size:10px;color:#8b949e;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px}
.sprite-frame{white-space:pre;font-size:14px;line-height:1.35;min-height:70px;margin:0;font-family:inherit}
.term{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:8px 12px;white-space:pre;font-size:11px;line-height:1.4;font-family:inherit;overflow-x:auto;margin:0}
.card-box{display:flex;flex-direction:column;gap:4px}
.b{font-weight:bold}.d{opacity:0.5}.i{font-style:italic}
.colors{display:flex;gap:8px;margin-left:auto}
.cdot{width:10px;height:10px;border-radius:50%;border:1px solid rgba(255,255,255,0.15);display:inline-block}
.clabel{font-size:10px;color:#6e7681}
</style>
</head>
<body>
<h1>EveryBuddy Companion Gallery</h1>
<p class="sub">24 companions · 5 rarity tiers · animated sprites · terminal-accurate rendering</p>
${sections}
<script id="frame-data" type="application/json">${escapedFrames}</script>
<script>
const allFrames = JSON.parse(document.getElementById("frame-data").textContent);
const els = document.querySelectorAll("[data-anim]");
const counters = {};
setInterval(function() {
  els.forEach(function(el) {
    const key = el.dataset.anim;
    const frames = allFrames[key];
    if (!frames || frames.length < 2) return;
    counters[key] = ((counters[key] || 0) + 1) % frames.length;
    el.innerHTML = frames[counters[key]];
  });
}, 500);
</script>
</body>
</html>`;

const outDir = ".superpowers/brainstorm/84538-1775271973/content";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/full-gallery-v3.html`, html);
console.log(`Gallery: ${(html.length / 1024).toFixed(0)}KB, ${companions.length} companions`);
