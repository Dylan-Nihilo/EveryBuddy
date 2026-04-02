import { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════
// SPECIES DEFINITIONS — 15 candidates
// 5 confirmed + 10 new candidates to pick from
// ═══════════════════════════════════════

const SPECIES = {
  // ── CONFIRMED KEEPERS ──
  tanuki: {
    name: "Tanuki",
    color: "#C4A882",
    accent: "#8B7355",
    frames: [
      [
        "            ",
        "  /\\    /\\  ",
        " ( {E}  {E} )",
        " (  w   )  ",
        "  \\____/   ",
      ],
      [
        "            ",
        "  /\\    /\\  ",
        " ( {E}  {E} )",
        " (  w   )  ",
        "   \\__/    ",
      ],
      [
        "            ",
        "  /\\    /\\  ",
        " ( {E}  {E} )",
        " (  ω   )  ",
        "  \\____/   ",
      ],
    ],
  },
  fox: {
    name: "Fox",
    color: "#F97316",
    accent: "#FDBA74",
    frames: [
      [
        "            ",
        "  ∧___∧    ",
        " ( {E} . {E} )  ",
        " (  ∇   )  ",
        "  UU   UU   ",
      ],
      [
        "            ",
        "  ∧___∧    ",
        " ( {E} . {E} )  ",
        " (  ∇   )  ",
        "   UU UU    ",
      ],
      [
        "            ",
        "  ∧___∧    ",
        " ( {E} . {E} )  ",
        " (  △   )  ",
        "  UU   UU   ",
      ],
    ],
  },
  frog: {
    name: "Frog",
    color: "#4ADE80",
    accent: "#166534",
    frames: [
      [
        "            ",
        "  @__  __@  ",
        "  ({E}  {E})  ",
        " (  ____  ) ",
        "  ~~    ~~  ",
      ],
      [
        "            ",
        "  @__  __@  ",
        "  ({E}  {E})  ",
        " (  ____  ) ",
        " ~~      ~~ ",
      ],
      [
        "            ",
        "  @__  __@  ",
        "  ({E}  {E})  ",
        " (  ‿‿‿‿  ) ",
        "  ~~    ~~  ",
      ],
    ],
  },
  crystal: {
    name: "Crystal",
    color: "#A78BFA",
    accent: "#7C3AED",
    frames: [
      [
        "    /\\      ",
        "   /  \\     ",
        "  / {E}{E} \\   ",
        "  \\    /    ",
        "   \\  /     ",
      ],
      [
        "    /\\      ",
        "   /  \\     ",
        "  / {E}{E} \\   ",
        "  \\    /    ",
        "   \\/       ",
      ],
      [
        "    /\\      ",
        "   /* \\     ",
        "  / {E}{E} \\   ",
        "  \\  * /    ",
        "   \\  /     ",
      ],
    ],
  },
  jellyfish: {
    name: "Jellyfish",
    color: "#F0ABFC",
    accent: "#D946EF",
    frames: [
      [
        "            ",
        "   /~~~~\\   ",
        "  ( {E}{E} )  ",
        "   \\~~~~/   ",
        "   ||||||   ",
      ],
      [
        "            ",
        "   /~~~~\\   ",
        "  ( {E}{E} )  ",
        "   \\~~~~/   ",
        "   \\|\\|\\|  ",
      ],
      [
        "            ",
        "   /~~~~\\   ",
        "  ( {E}{E} )  ",
        "   \\~~~~/   ",
        "   |/|/|/   ",
      ],
    ],
  },

  // ── NEW CANDIDATES (pick 5 from these 10) ──
  penguin: {
    name: "Penguin",
    color: "#94A3B8",
    accent: "#F8FAFC",
    frames: [
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  |>  <|   ",
        "   `---´    ",
      ],
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  |>  <|   ",
        "    `-´     ",
      ],
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  />  <\\   ",
        "   `---´    ",
      ],
    ],
  },
  bunny: {
    name: "Bunny",
    color: "#FECDD3",
    accent: "#FB7185",
    frames: [
      [
        "  ()  ()    ",
        "  (\\__/)   ",
        " ( {E}  {E} )  ",
        " (  >< )   ",
        "  (\" )(\" )  ",
      ],
      [
        "  ()  ()    ",
        "  (\\__/)   ",
        " ( {E}  {E} )  ",
        " (  >< )   ",
        " (\" ) (\" ) ",
      ],
      [
        "  ()  ()    ",
        "  (\\__/)   ",
        " ( {E}  {E} )  ",
        " (  ω  )   ",
        "  (\" )(\" )  ",
      ],
    ],
  },
  owl: {
    name: "Owl",
    color: "#D97706",
    accent: "#FDE68A",
    frames: [
      [
        "            ",
        "   {{{{}}}  ",
        "  ( {E}{E} )  ",
        "  (  <>  )  ",
        "   ⊥  ⊥    ",
      ],
      [
        "            ",
        "   {{{{}}}  ",
        "  ( {E}{E} )  ",
        "  (  <>  )  ",
        "    ⊥⊥     ",
      ],
      [
        "            ",
        "   {{{{}}}  ",
        "  ( {E}{E} )  ",
        "  (  ◇  )  ",
        "   ⊥  ⊥    ",
      ],
    ],
  },
  dragon: {
    name: "Dragon",
    color: "#EF4444",
    accent: "#FCA5A5",
    frames: [
      [
        "   /\\/\\     ",
        "  ( {E}{E} )~  ",
        "  /|  |\\   ",
        " / |  | \\  ",
        "  d´  `b   ",
      ],
      [
        "   /\\/\\     ",
        "  ( {E}{E} )~  ",
        "  /|  |\\   ",
        " / |  | \\  ",
        "  d´  `b   ",
      ],
      [
        "   /\\/\\     ",
        "  ( {E}{E})~~  ",
        "  /|  |\\   ",
        "  /|  |\\   ",
        "  d´  `b   ",
      ],
    ],
  },
  cat: {
    name: "Cat",
    color: "#FCD34D",
    accent: "#A16207",
    frames: [
      [
        "            ",
        "  /\\_/\\     ",
        " ( {E}  {E} )  ",
        " (  =∇= )  ",
        " (\")__(\")  ",
      ],
      [
        "            ",
        "  /\\_/\\     ",
        " ( {E}  {E} )  ",
        " (  =∇= )  ",
        "  (\")(\")   ",
      ],
      [
        "            ",
        "  /\\_/\\     ",
        " ( {E}  {E} )  ",
        " (  =ω= )  ",
        " (\")__(\")  ",
      ],
    ],
  },
  ghost: {
    name: "Ghost",
    color: "#E2E8F0",
    accent: "#CBD5E1",
    frames: [
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  |  o  |   ",
        "  ~\\/\\/\\~  ",
      ],
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  |  o  |   ",
        "  ~/\\/\\/~  ",
      ],
      [
        "            ",
        "   .---.    ",
        "  / {E}{E} \\   ",
        "  |  O  |   ",
        "  ~\\/\\/\\~  ",
      ],
    ],
  },
  mushroom: {
    name: "Mushroom",
    color: "#F87171",
    accent: "#FECACA",
    frames: [
      [
        "            ",
        " .-*~~*-.   ",
        " (________)  ",
        "   | {E}{E}|   ",
        "   |____|   ",
      ],
      [
        "            ",
        " .-*~~*-.   ",
        " (________)  ",
        "   | {E}{E}|   ",
        "   `----´   ",
      ],
      [
        "            ",
        " .~*~~*~.   ",
        " (________)  ",
        "   | {E}{E}|   ",
        "   |____|   ",
      ],
    ],
  },
  octopus: {
    name: "Octopus",
    color: "#C084FC",
    accent: "#A855F7",
    frames: [
      [
        "            ",
        "   .----.   ",
        "  ( {E}{E} )  ",
        "  (______)  ",
        "  /\\/\\/\\/\\ ",
      ],
      [
        "            ",
        "   .----.   ",
        "  ( {E}{E} )  ",
        "  (______)  ",
        " \\/\\/\\/\\/  ",
      ],
      [
        "            ",
        "   .----.   ",
        "  ( {E}{E} )  ",
        "  (______)  ",
        "  \\/\\/\\/\\/ ",
      ],
    ],
  },
  robot: {
    name: "Robot",
    color: "#67E8F9",
    accent: "#22D3EE",
    frames: [
      [
        "   [===]    ",
        "  .[___].   ",
        "  | {E}{E} |   ",
        "  |[===]|   ",
        "  d|   |b   ",
      ],
      [
        "   [===]    ",
        "  .[___].   ",
        "  | {E}{E} |   ",
        "  |[===]|   ",
        "  d|   |b   ",
      ],
      [
        "   [=*=]    ",
        "  .[___].   ",
        "  | {E}{E} |   ",
        "  |[===]|   ",
        "  d|   |b   ",
      ],
    ],
  },
  turtle: {
    name: "Turtle",
    color: "#6EE7B7",
    accent: "#059669",
    frames: [
      [
        "            ",
        "   _____    ",
        "  / {E}{E} \\___",
        " |_/===\\_| ",
        "   ^^  ^^   ",
      ],
      [
        "            ",
        "   _____    ",
        "  / {E}{E} \\___",
        " |_/===\\_| ",
        "    ^^ ^^   ",
      ],
      [
        "            ",
        "   _____    ",
        "  / {E}{E} \\___",
        " |_/=*=\\_| ",
        "   ^^  ^^   ",
      ],
    ],
  },
};

const EYES = {
  dot:     { char: "·", label: "Dot" },
  sparkle: { char: "✦", label: "Sparkle" },
  star:    { char: "★", label: "Star" },
  ring:    { char: "◎", label: "Ring" },
  heart:   { char: "♥", label: "Heart" },
  diamond: { char: "◆", label: "Diamond" },
};

const HATS = {
  none:     { art: "            ", label: "None" },
  crown:    { art: "    \\^^^/    ", label: "Crown" },
  wizard:   { art: "     /^\\     ", label: "Wizard" },
  halo:     { art: "    (   )    ", label: "Halo" },
  antenna:  { art: "     -o-     ", label: "Antenna" },
  leaf:     { art: "     🍃      ", label: "Leaf" },
  flame:    { art: "     🔥      ", label: "Flame" },
};

const RARITIES = [
  { name: "Common",    color: "#8B8B8B", stars: "★",     weight: 60, floor: 5 },
  { name: "Uncommon",  color: "#4ADE80", stars: "★★",    weight: 25, floor: 15 },
  { name: "Rare",      color: "#60A5FA", stars: "★★★",   weight: 10, floor: 25 },
  { name: "Epic",      color: "#C084FC", stars: "★★★★",  weight: 4,  floor: 35 },
  { name: "Legendary", color: "#FBBF24", stars: "★★★★★", weight: 1,  floor: 50 },
];

const STATS = ["GRIT", "FOCUS", "CHAOS", "WIT", "SASS"];

const CONFIRMED = ["tanuki", "fox", "frog", "crystal", "jellyfish"];

function renderSprite(frame, eyeChar, hat) {
  let lines = [...frame];
  if (hat && hat !== "none") lines[0] = HATS[hat].art;
  return lines.map((l) => l.replace(/\{E\}/g, eyeChar));
}

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateStats(rng, floor) {
  const stats = {};
  const names = [...STATS];
  const peakIdx = Math.floor(rng() * names.length);
  let dumpIdx = (peakIdx + 1 + Math.floor(rng() * (names.length - 1))) % names.length;
  names.forEach((s, i) => {
    if (i === peakIdx) stats[s] = Math.floor(floor + rng() * (100 - floor));
    else if (i === dumpIdx) stats[s] = Math.floor(rng() * Math.max(floor, 20));
    else stats[s] = Math.floor(floor + rng() * (80 - floor));
  });
  return stats;
}

export default function TerminalBuddyDesigner() {
  const [species, setSpecies] = useState("tanuki");
  const [eye, setEye] = useState("dot");
  const [hat, setHat] = useState("none");
  const [rarity, setRarity] = useState(0);
  const [frame, setFrame] = useState(0);
  const [tab, setTab] = useState("gallery");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set(CONFIRMED));

  // generator state
  const [previewId, setPreviewId] = useState("dylan-dev-2026");
  const [generatedPet, setGeneratedPet] = useState(null);
  const [isHatching, setIsHatching] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 3), 500);
    return () => clearInterval(t);
  }, []);

  const sp = SPECIES[species];
  const rendered = renderSprite(sp.frames[frame], EYES[eye].char, hat);

  const toggleSelect = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleGenerate = useCallback(() => {
    setIsHatching(true);
    setTimeout(() => {
      let hash = 0;
      const str = previewId + "terminal-buddy-2026";
      for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
      const rng = mulberry32(hash);
      const pool = [...selected].filter(k => SPECIES[k]);
      const s = pool.length > 0 ? pool[Math.floor(rng() * pool.length)] : Object.keys(SPECIES)[Math.floor(rng() * Object.keys(SPECIES).length)];
      const eyeKeys = Object.keys(EYES);
      const e = eyeKeys[Math.floor(rng() * eyeKeys.length)];
      let roll = rng() * 100, r = 0, cum = 0;
      for (let i = 0; i < RARITIES.length; i++) { cum += RARITIES[i].weight; if (roll < cum) { r = i; break; } }
      const hatKeys = Object.keys(HATS).filter(k => k !== "none");
      const h = r > 0 ? hatKeys[Math.floor(rng() * hatKeys.length)] : "none";
      const isShiny = rng() < 0.01;
      const stats = generateStats(rng, RARITIES[r].floor);
      setGeneratedPet({ species: s, eye: e, hat: h, rarity: r, shiny: isShiny, stats });
      setIsHatching(false);
    }, 600);
  }, [previewId, selected]);

  const bg = "#0C0C0C";
  const fg = "#D4D4D4";
  const dim = "#555";
  const accent = "#E8B84B";
  const green = "#4ADE80";

  const filteredSpecies = Object.entries(SPECIES).filter(([key]) => {
    if (filter === "confirmed") return CONFIRMED.includes(key);
    if (filter === "candidates") return !CONFIRMED.includes(key);
    return true;
  });

  return (
    <div style={{ background: bg, color: fg, minHeight: "100vh", fontFamily: "'IBM Plex Mono','SF Mono','Cascadia Code',monospace", padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* HEADER */}
      <div style={{ borderBottom: `1px solid #222`, paddingBottom: 14, marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: accent, margin: 0, letterSpacing: "0.04em" }}>
          ▸ terminal-buddy <span style={{ color: dim, fontWeight: 400 }}>sprite lab</span>
        </h1>
        <p style={{ color: dim, fontSize: 11, margin: "4px 0 0" }}>
          15 species · color system · composable layers · pick your final 10
        </p>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[
          { id: "gallery", icon: "◫", label: "Gallery" },
          { id: "composer", icon: "◧", label: "Composer" },
          { id: "generator", icon: "⚄", label: "Generator" },
          { id: "lineup", icon: "☰", label: `Lineup (${selected.size})` },
        ].map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: tab === id ? "#1A1A1A" : "transparent",
            color: tab === id ? accent : dim,
            border: `1px solid ${tab === id ? "#333" : "transparent"}`,
            padding: "5px 14px", borderRadius: 4, cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, fontWeight: tab === id ? 600 : 400,
          }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ═══ GALLERY TAB ═══ */}
      {tab === "gallery" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["all", "confirmed", "candidates"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? "#1a1a1a" : "transparent",
                color: filter === f ? fg : dim,
                border: `1px solid ${filter === f ? "#333" : "transparent"}`,
                padding: "3px 10px", borderRadius: 3, cursor: "pointer",
                fontFamily: "inherit", fontSize: 11,
              }}>
                {f === "all" ? `All (${Object.keys(SPECIES).length})` : f === "confirmed" ? `Confirmed (${CONFIRMED.length})` : `Candidates (${Object.keys(SPECIES).length - CONFIRMED.length})`}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
            {filteredSpecies.map(([key, sp]) => {
              const isConfirmed = CONFIRMED.includes(key);
              const isSelected = selected.has(key);
              return (
                <div key={key} style={{
                  background: "#111", borderRadius: 6, padding: 14, cursor: "pointer",
                  border: `1.5px solid ${isSelected ? sp.color + "88" : "#222"}`,
                  position: "relative", transition: "all 0.15s",
                }} onClick={() => { setSpecies(key); setTab("composer"); }}>
                  {/* color accent bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "6px 6px 0 0", background: sp.color, opacity: isSelected ? 0.8 : 0.2 }} />

                  {isConfirmed && (
                    <div style={{ position: "absolute", top: 6, right: 6, fontSize: 9, color: green, background: green + "15", padding: "1px 6px", borderRadius: 8 }}>
                      ✓ keep
                    </div>
                  )}

                  <pre style={{
                    fontFamily: "inherit", fontSize: 13, lineHeight: 1.25, margin: 0,
                    color: sp.color, textAlign: "center", minHeight: 80,
                    display: "flex", flexDirection: "column", justifyContent: "center",
                    textShadow: `0 0 12px ${sp.color}20`,
                  }}>
                    {renderSprite(sp.frames[frame], "·", "none").join("\n")}
                  </pre>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: isSelected ? sp.color : dim, fontWeight: 500 }}>
                      {sp.name}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(key); }} style={{
                      background: isSelected ? sp.color + "20" : "transparent",
                      color: isSelected ? sp.color : "#444",
                      border: `1px solid ${isSelected ? sp.color + "44" : "#333"}`,
                      padding: "2px 8px", borderRadius: 3, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 10,
                    }}>
                      {isSelected ? "★ in" : "+ add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ COMPOSER TAB ═══ */}
      {tab === "composer" && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {/* Preview */}
          <div style={{ flex: "0 0 auto" }}>
            <div style={{
              background: "#111", border: `1px solid ${sp.color}33`, borderRadius: 8,
              padding: 24, minWidth: 220, position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${RARITIES[rarity].color}, transparent)` }} />
              <pre style={{
                fontFamily: "inherit", fontSize: 20, lineHeight: 1.35, margin: 0,
                color: sp.color, textAlign: "center",
                textShadow: rarity >= 3 ? `0 0 10px ${sp.color}50` : `0 0 4px ${sp.color}20`,
              }}>
                {rendered.join("\n")}
              </pre>
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <span style={{ color: RARITIES[rarity].color, fontSize: 14, letterSpacing: 2 }}>
                  {RARITIES[rarity].stars}
                </span>
                <div style={{ color: sp.color, fontSize: 13, marginTop: 4, fontWeight: 600 }}>
                  {sp.name}
                </div>
                <div style={{ color: dim, fontSize: 10, marginTop: 2 }}>
                  {EYES[eye].label} · {HATS[hat].label} · {RARITIES[rarity].name}
                </div>
              </div>
            </div>

            {/* Speech bubble */}
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 8, padding: 14, marginTop: 10 }}>
              <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "7px 11px", fontSize: 11, color: "#bbb", position: "relative" }}>
                <span style={{ color: sp.color }}>💬</span> That variable name is... creative.
                <div style={{ position: "absolute", bottom: -5, left: 18, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #333" }} />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* Species picker */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 6, letterSpacing: "0.1em" }}>SPECIES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(SPECIES).map(([key, s]) => (
                  <button key={key} onClick={() => setSpecies(key)} style={{
                    background: species === key ? s.color + "20" : "transparent",
                    color: species === key ? s.color : "#666",
                    border: `1px solid ${species === key ? s.color + "44" : "#2a2a2a"}`,
                    padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11,
                  }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Eyes */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 6, letterSpacing: "0.1em" }}>EYES</div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(EYES).map(([key, e]) => (
                  <button key={key} onClick={() => setEye(key)} style={{
                    background: eye === key ? sp.color + "20" : "transparent",
                    color: eye === key ? "#fff" : "#666",
                    border: `1px solid ${eye === key ? sp.color + "44" : "#2a2a2a"}`,
                    width: 36, height: 36, borderRadius: 3, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {e.char}
                  </button>
                ))}
              </div>
            </div>

            {/* Hats */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 6, letterSpacing: "0.1em" }}>HAT</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Object.entries(HATS).map(([key, h]) => (
                  <button key={key} onClick={() => setHat(key)} style={{
                    background: hat === key ? sp.color + "20" : "transparent",
                    color: hat === key ? sp.color : "#666",
                    border: `1px solid ${hat === key ? sp.color + "44" : "#2a2a2a"}`,
                    padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11,
                  }}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rarity */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 6, letterSpacing: "0.1em" }}>RARITY</div>
              <div style={{ display: "flex", gap: 4 }}>
                {RARITIES.map((r, i) => (
                  <button key={r.name} onClick={() => setRarity(i)} style={{
                    background: rarity === i ? r.color + "20" : "transparent",
                    color: rarity === i ? r.color : "#555",
                    border: `1px solid ${rarity === i ? r.color + "44" : "#2a2a2a"}`,
                    padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11,
                  }}>
                    {r.stars}
                  </button>
                ))}
              </div>
            </div>

            {/* Color info */}
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 10, color: dim, marginBottom: 6, letterSpacing: "0.1em" }}>COLOR PALETTE</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: sp.color, border: "1px solid #333" }} />
                  <div style={{ width: 28, height: 28, borderRadius: 4, background: sp.accent, border: "1px solid #333" }} />
                </div>
                <div style={{ fontSize: 11, color: "#888" }}>
                  <div>primary: <span style={{ color: sp.color }}>{sp.color}</span></div>
                  <div>accent: <span style={{ color: sp.accent }}>{sp.accent}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ GENERATOR TAB ═══ */}
      {tab === "generator" && (
        <div>
          <p style={{ color: dim, fontSize: 11, marginBottom: 14 }}>
            Deterministic hatch from your selected lineup ({selected.size} species). Same ID → same buddy.
          </p>
          <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
            <input value={previewId} onChange={(e) => setPreviewId(e.target.value)} placeholder="user ID..." style={{
              background: "#111", border: "1px solid #333", borderRadius: 4,
              padding: "7px 12px", color: fg, fontFamily: "inherit", fontSize: 12, flex: 1, outline: "none",
            }}
              onFocus={(e) => (e.target.style.borderColor = accent)}
              onBlur={(e) => (e.target.style.borderColor = "#333")}
            />
            <button onClick={handleGenerate} disabled={isHatching} style={{
              background: accent, color: "#000", border: "none", borderRadius: 4,
              padding: "7px 18px", cursor: isHatching ? "wait" : "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: 600,
              opacity: isHatching ? 0.6 : 1,
            }}>
              {isHatching ? "..." : "▸ Hatch"}
            </button>
          </div>

          {generatedPet && (() => {
            const gsp = SPECIES[generatedPet.species];
            return (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{
                  background: "#111", border: `1px solid ${gsp.color}33`, borderRadius: 8,
                  padding: 24, position: "relative", overflow: "hidden", minWidth: 200,
                }}>
                  {generatedPet.shiny && (
                    <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: "#FBBF24", background: "#FBBF2418", padding: "1px 7px", borderRadius: 8 }}>✨ SHINY</div>
                  )}
                  <pre style={{
                    fontFamily: "inherit", fontSize: 18, lineHeight: 1.3, margin: 0,
                    color: generatedPet.shiny ? "#FBBF24" : gsp.color,
                    textAlign: "center",
                    textShadow: generatedPet.shiny ? `0 0 12px #FBBF2440` : `0 0 8px ${gsp.color}30`,
                  }}>
                    {renderSprite(SPECIES[generatedPet.species].frames[frame], EYES[generatedPet.eye].char, generatedPet.hat).join("\n")}
                  </pre>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <span style={{ color: RARITIES[generatedPet.rarity].color, fontSize: 13, letterSpacing: 2 }}>
                      {RARITIES[generatedPet.rarity].stars}
                    </span>
                    <div style={{ color: gsp.color, fontSize: 13, marginTop: 3, fontWeight: 600 }}>{gsp.name}</div>
                    <div style={{ color: dim, fontSize: 10, marginTop: 2 }}>{EYES[generatedPet.eye].label} · {HATS[generatedPet.hat].label}</div>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 10, color: dim, marginBottom: 8, letterSpacing: "0.1em" }}>STATS</div>
                  {Object.entries(generatedPet.stats).map(([stat, val]) => {
                    const maxVal = Math.max(...Object.values(generatedPet.stats));
                    const minVal = Math.min(...Object.values(generatedPet.stats));
                    const isPeak = val === maxVal;
                    const isDump = val === minVal;
                    return (
                      <div key={stat} style={{ marginBottom: 7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                          <span style={{ color: isPeak ? gsp.color : isDump ? "#444" : "#999", fontWeight: isPeak ? 600 : 400 }}>
                            {stat} {isPeak ? "▲" : isDump ? "▽" : ""}
                          </span>
                          <span style={{ color: dim }}>{val}</span>
                        </div>
                        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 2, width: `${val}%`,
                            background: isPeak ? gsp.color : isDump ? "#333" : gsp.accent,
                            transition: "width 0.4s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop: 14, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 6, padding: 10, fontSize: 10, color: dim, lineHeight: 1.6 }}>
                    <span style={{ color: "#444" }}>seed:</span> <span style={{ color: green }}>{previewId}</span><br />
                    <span style={{ color: "#444" }}>pool:</span> <span style={{ color: green }}>{selected.size} species</span><br />
                    <span style={{ color: "#444" }}>algo:</span> <span style={{ color: green }}>mulberry32</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ LINEUP TAB ═══ */}
      {tab === "lineup" && (
        <div>
          <p style={{ color: dim, fontSize: 11, marginBottom: 14 }}>
            Your selected roster. Click to remove, go to Gallery to add more.
          </p>
          {selected.size === 0 ? (
            <div style={{ color: dim, fontSize: 12, padding: 40, textAlign: "center" }}>
              No species selected. Go to Gallery to add some.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {[...selected].filter(k => SPECIES[k]).map((key) => {
                const s = SPECIES[key];
                return (
                  <div key={key} style={{
                    background: "#111", border: `1.5px solid ${s.color}44`, borderRadius: 6,
                    padding: 14, position: "relative",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.color, opacity: 0.6, borderRadius: "6px 6px 0 0" }} />
                    <pre style={{ fontFamily: "inherit", fontSize: 12, lineHeight: 1.2, margin: 0, color: s.color, textAlign: "center" }}>
                      {renderSprite(s.frames[frame], "·", "none").join("\n")}
                    </pre>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: s.color, fontWeight: 500 }}>{s.name}</span>
                      <button onClick={() => toggleSelect(key)} style={{
                        background: "transparent", color: "#666", border: "1px solid #333",
                        padding: "1px 6px", borderRadius: 3, cursor: "pointer",
                        fontFamily: "inherit", fontSize: 9,
                      }}>✕</button>
                    </div>
                    <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, border: "1px solid #333" }} />
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: s.accent, border: "1px solid #333" }} />
                      <span style={{ fontSize: 9, color: dim, marginLeft: 4 }}>{s.color}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #1a1a1a", marginTop: 28, paddingTop: 14, fontSize: 10, color: "#333", display: "flex", justifyContent: "space-between" }}>
        <span>terminal-buddy · {Object.keys(SPECIES).length} species · {Object.keys(EYES).length} eyes · {Object.keys(HATS).length} hats</span>
        <span>bones + soul · color system</span>
      </div>
    </div>
  );
}
