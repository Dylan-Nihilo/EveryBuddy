const rarityOrder = [
  {
    name: "Common",
    stars: "*",
    color: "#8B8B8B",
    note: "Loose, everyday shell spirits with the best odds of hatching.",
  },
  {
    name: "Uncommon",
    stars: "**",
    color: "#4ADE80",
    note: "Noticeably sharper companions that feel a little too observant.",
  },
  {
    name: "Rare",
    stars: "***",
    color: "#60A5FA",
    note: "Collectors' favorites with a stronger runtime presence.",
  },
  {
    name: "Epic",
    stars: "****",
    color: "#C084FC",
    note: "Command-weather creatures with heavier theatrical weight.",
  },
  {
    name: "Legendary",
    stars: "*****",
    color: "#FBBF24",
    note: "Harder draws that feel less like pets and more like terminal myths.",
  },
];

const monoBlock = (...lines) => lines.join("\n");

const spriteFrames = {
  duck: [
    ["            ", "    __      ", "  <(. )___  ", "   (  ._>   ", "    `--´    "],
    ["            ", "    __      ", "  <(. )___  ", "   (  ._>   ", "    `--´~   "],
    ["            ", "    __      ", "  <(. )___  ", "   (  .__>  ", "    `--´    "],
  ],
  goose: [
    ["            ", "     (.>    ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
    ["            ", "    (.>     ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
    ["            ", "     (.>>   ", "     ||     ", "   _(__)_   ", "    ^^^^    "],
  ],
  blob: [
    ["            ", "   .----.   ", "  ( .  . )  ", "  (      )  ", "   `----´   "],
    ["            ", "  .------.  ", " (  .  .  ) ", " (        ) ", "  `------´  "],
    ["            ", "    .--.    ", "   (.  .)   ", "   (    )   ", "    `--´    "],
  ],
  cat: [
    ["            ", "   /\\_/\\    ", "  ( .   .)  ", "  (  ω  )   ", "  (\")_(\")   "],
    ["            ", "   /\\_/\\    ", "  ( .   .)  ", "  (  ω  )   ", "  (\")_(\")~  "],
    ["            ", "   /\\-/\\    ", "  ( .   .)  ", "  (  ω  )   ", "  (\")_(\")   "],
  ],
  dragon: [
    ["            ", "  /^\\  /^\\  ", " <  .  .  > ", " (   ~~   ) ", "  `-vvvv-´  "],
    ["            ", "  /^\\  /^\\  ", " <  .  .  > ", " (        ) ", "  `-vvvv-´  "],
    ["   ~    ~   ", "  /^\\  /^\\  ", " <  .  .  > ", " (   ~~   ) ", "  `-vvvv-´  "],
  ],
  octopus: [
    ["            ", "   .----.   ", "  ( .  . )  ", "  (______)  ", "  /\\/\\/\\/\\  "],
    ["            ", "   .----.   ", "  ( .  . )  ", "  (______)  ", "  \\/\\/\\/\\/  "],
    ["     o      ", "   .----.   ", "  ( .  . )  ", "  (______)  ", "  /\\/\\/\\/\\  "],
  ],
  owl: [
    ["            ", "   /\\  /\\   ", "  ((.)(.))  ", "  (  ><  )  ", "   `----´   "],
    ["            ", "   /\\  /\\   ", "  ((.)(.))  ", "  (  ><  )  ", "   .----.   "],
    ["            ", "   /\\  /\\   ", "  ((.)(-))  ", "  (  ><  )  ", "   `----´   "],
  ],
  penguin: [
    ["            ", "  .---.     ", "  (.>.)     ", " /(   )\\    ", "  `---´     "],
    ["            ", "  .---.     ", "  (.>.)     ", " |(   )|    ", "  `---´     "],
    ["  .---.     ", "  (.>.)     ", " /(   )\\    ", "  `---´     ", "   ~ ~      "],
  ],
  turtle: [
    ["            ", "   _,--._   ", "  ( .  . )  ", " /[______]\\ ", "  ``    ``  "],
    ["            ", "   _,--._   ", "  ( .  . )  ", " /[______]\\ ", "   ``  ``   "],
    ["            ", "   _,--._   ", "  ( .  . )  ", " /[======]\\ ", "  ``    ``  "],
  ],
  snail: [
    ["            ", " .    .--.  ", "  \\  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "],
    ["            ", "  .   .--.  ", "  |  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "],
    ["            ", " .    .--.  ", "  \\  ( @  ) ", "   \\_`--´   ", "   ~~~~~~   "],
  ],
  ghost: [
    ["            ", "   .----.   ", "  / .  . \\  ", "  |      |  ", "  ~`~``~`~  "],
    ["            ", "   .----.   ", "  / .  . \\  ", "  |      |  ", "  `~`~~`~`  "],
    ["    ~  ~    ", "   .----.   ", "  / .  . \\  ", "  |      |  ", "  ~~`~~`~~  "],
  ],
  axolotl: [
    ["            ", "}~(______)~{", "}~(. .. .)~{", "  ( .--. )  ", "  (_/  \\_)  "],
    ["            ", "~}(______){~", "~}(. .. .){~", "  ( .--. )  ", "  (_/  \\_)  "],
    ["            ", "}~(______)~{", "}~(. .. .)~{", "  (  --  )  ", "  ~_/  \\_~  "],
  ],
  capybara: [
    ["            ", "  n______n  ", " ( .    . ) ", " (   oo   ) ", "  `------´  "],
    ["            ", "  n______n  ", " ( .    . ) ", " (   Oo   ) ", "  `------´  "],
    ["    ~  ~    ", "  u______n  ", " ( .    . ) ", " (   oo   ) ", "  `------´  "],
  ],
  cactus: [
    ["            ", " n  ____  n ", " | |.  .| | ", " |_|    |_| ", "   |    |   "],
    ["            ", "    ____    ", " n |.  .| n ", " |_|    |_| ", "   |    |   "],
    [" n        n ", " |  ____  | ", " | |.  .| | ", " |_|    |_| ", "   |    |   "],
  ],
  robot: [
    ["            ", "   .[||].   ", "  [ .  . ]  ", "  [ ==== ]  ", "  `------´  "],
    ["            ", "   .[||].   ", "  [ .  . ]  ", "  [ -==- ]  ", "  `------´  "],
    ["     *      ", "   .[||].   ", "  [ .  . ]  ", "  [ ==== ]  ", "  `------´  "],
  ],
  rabbit: [
    ["            ", "   (\\__/)   ", "  ( .  . )  ", " =(  ..  )= ", "  (\")__(\")  "],
    ["            ", "   (|__/)   ", "  ( .  . )  ", " =(  ..  )= ", "  (\")__(\")  "],
    ["            ", "   (\\__/)   ", "  ( .  . )  ", " =( .  . )= ", "  (\")__(\")  "],
  ],
  mushroom: [
    ["            ", " .-o-OO-o-. ", "(__________)", "   |.  .|   ", "   |____|   "],
    ["            ", " .-O-oo-O-. ", "(__________)", "   |.  .|   ", "   |____|   "],
    ["   . o  .   ", " .-o-OO-o-. ", "(__________)", "   |.  .|   ", "   |____|   "],
  ],
  chonk: [
    ["            ", "  /\\    /\\  ", " ( .    . ) ", " (   ..   ) ", "  `------´  "],
    ["            ", "  /\\    /|  ", " ( .    . ) ", " (   ..   ) ", "  `------´  "],
    ["            ", "  /\\    /\\  ", " ( .    . ) ", " (   ..   ) ", "  `------´~ "],
  ],
  tanuki: [
    ["            ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   ww   ) ", "  \\_/__\\_/  "],
    ["            ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   ww   ) ", "   \\_==_/   "],
    ["            ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   uu   ) ", "  \\_/__\\_/  "],
  ],
  fox: [
    ["            ", "  /\\__/\\\\   ", "  (. .. .)  ", " (   vv   ) ", "  /_/  \\_\\  "],
    ["            ", "  /\\__/\\\\   ", "  (. .. .)  ", " (   vv   ) ", "   /_\\/\\_\\  "],
    ["            ", "  /\\__/\\\\   ", "  (. .. .)  ", " (   ^^   ) ", "  /_/  \\_\\  "],
  ],
  frog: [
    ["            ", "  @__  __@  ", "  (.    .)  ", " (  ____  ) ", "  ~~    ~~  "],
    ["            ", "  @__  __@  ", "  (.    .)  ", " (  ____  ) ", " ~~      ~~ "],
    ["            ", "  @__  __@  ", "  (.    .)  ", " (  ----  ) ", "  ~~    ~~  "],
  ],
  crystal: [
    ["            ", "    /\\      ", "   /..\\     ", "   \\    /   ", "    \\/      "],
    ["            ", "    /\\      ", "   /..\\     ", "   \\ ** /   ", "    \\/      "],
    ["            ", "    /\\      ", "   /..\\     ", "   \\ .. /   ", "    \\/      "],
  ],
  jellyfish: [
    ["            ", "   /~~~~\\   ", "  ( .  . )  ", "   \\____/   ", "   ||||||   "],
    ["            ", "   /~~~~\\   ", "  ( .  . )  ", "   \\____/   ", "   \\\\||//   "],
    ["            ", "   /~~~~\\   ", "  ( .  . )  ", "   \\____/   ", "   //||\\\\   "],
  ],
};

const companions = [
  {
    rarity: "Common",
    species: "Duck",
    name: "Bytebill",
    tagline: "It pecks loose commands until they behave.",
    stats: "peak wit 71 · dump chaos 14",
    model: "qwen3.5-plus",
    state: "Alias cleanup",
    cardAscii: monoBlock("    __      ", "  <(. )___  ", "   (  ._>   ", "    `--´    "),
    sidecarAscii: monoBlock("    __      ", "  <(. )___  ", "   (  ._>   ", "    `--´    "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ alias bd='buddy detach'",
      "$ bd",
      "EveryBuddy sidecar detached",
      "$ buddy attach",
      "EveryBuddy sidecar attached to tmux window @2",
    ),
    bubble: ["alias domesticated.", "barely."],
  },
  {
    rarity: "Common",
    species: "Goose",
    name: "Honk",
    tagline: "A grin tucked between failed aliases.",
    stats: "peak sass 95 · dump chaos 08",
    model: "qwen3.5-plus",
    state: "Command spiral",
    cardAscii: monoBlock("     (.>    ", "     ||     ", "   _(__)_   ", "    ^^^^    "),
    sidecarAscii: monoBlock("     (.>    ", "     ||     ", "   _(__)_   ", "    ^^^^    "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ vite deve",
      "zsh: command not found: deve",
      "$ vite deve",
      "zsh: command not found: deve",
      "$ vite dev",
    ),
    bubble: ["typo streak: 2x.", "spellcasting denied."],
  },
  {
    rarity: "Common",
    species: "Blob",
    name: "Soft Cache",
    tagline: "A wobble in the shell where mistakes cool off.",
    stats: "peak grit 68 · dump wit 19",
    model: "qwen3.5-plus",
    state: "Local reset",
    cardAscii: monoBlock("   .----.   ", "  ( ..  )   ", "  (      )  ", "   `----´   "),
    sidecarAscii: monoBlock("   .----.   ", "  ( ..  )   ", "  (      )  ", "   `----´   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ git restore src/runtime/sidecar.ts",
      "$ git diff --stat",
      "showcase/index.html | 0",
      "$ git status",
      "working tree clean",
    ),
    bubble: ["soft landing.", "mess remains visible."],
  },
  {
    rarity: "Common",
    species: "Penguin",
    name: "Cold Prompt",
    tagline: "It keeps its footing where logs turn slick.",
    stats: "peak focus 70 · dump sass 13",
    model: "qwen3.5-plus",
    state: "Git quiet",
    cardAscii: monoBlock("   .---.    ", "   (o>o)    ", "  /(   )\\   ", "   `---´    "),
    sidecarAscii: monoBlock("   .---.    ", "   (o>o)    ", "  /(   )\\   ", "   `---´    "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ git fetch origin",
      "From github.com:repo/everybuddy",
      "$ git status",
      "On branch main",
      "nothing to commit, working tree clean",
    ),
    bubble: ["clean tree.", "arctic discipline."],
  },
  {
    rarity: "Common",
    species: "Turtle",
    name: "Slow Hash",
    tagline: "Patience wrapped in a stubborn shell.",
    stats: "peak grit 77 · dump chaos 09",
    model: "qwen3.5-plus",
    state: "Install watch",
    cardAscii: monoBlock("   _,--._   ", "  ( o  o )  ", " /[______]\\ ", "  ``    ``  "),
    sidecarAscii: monoBlock("   _,--._   ", "  ( o  o )  ", " /[______]\\ ", "  ``    ``  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm install",
      "Packages: +213",
      "Progress: resolved 213, downloaded 213",
      "Done in 18.2s",
      "$ pnpm build",
    ),
    bubble: ["still moving.", "which is enough."],
  },
  {
    rarity: "Common",
    species: "Snail",
    name: "Lagtrail",
    tagline: "It measures progress in luminous millimeters.",
    stats: "peak focus 66 · dump chaos 12",
    model: "qwen3.5-plus",
    state: "Watch mode",
    cardAscii: monoBlock(" o    .--.  ", "  \\  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "),
    sidecarAscii: monoBlock(" o    .--.  ", "  \\  ( @ )  ", "   \\_`--´   ", "  ~~~~~~~   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm test --watch",
      "waiting for file changes...",
      "press h to show help, q to quit",
      "$",
      "",
    ),
    bubble: ["progress exists.", "it just glistens slowly."],
  },
  {
    rarity: "Common",
    species: "Cactus",
    name: "Prickly PATH",
    tagline: "A quiet sentinel grown from dry mistakes.",
    stats: "peak sass 72 · dump focus 18",
    model: "qwen3.5-plus",
    state: "Missing binary",
    cardAscii: monoBlock(" n  ____  n ", " | |o  o| | ", " |_|    |_| ", "   |    |   "),
    sidecarAscii: monoBlock(" n  ____  n ", " | |o  o| | ", " |_|    |_| ", "   |    |   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ buddyy",
      "zsh: command not found: buddyy",
      "$ which buddy",
      "/usr/local/bin/buddy",
      "$ buddy pet",
    ),
    bubble: ["PATH remains hostile.", "you remain persistent."],
  },
  {
    rarity: "Uncommon",
    species: "Cat",
    name: "Lint Prowler",
    tagline: "It lands on clean builds with suspicious grace.",
    stats: "peak wit 83 · dump chaos 16",
    model: "qwen3.5-plus",
    state: "Test skim",
    cardAscii: monoBlock("   /\\_/\\\\   ", "  ( o   o)  ", "  (  ω  )   ", "  (\")_(\")   "),
    sidecarAscii: monoBlock("   /\\_/\\\\   ", "  ( o   o)  ", "  (  ω  )   ", "  (\")_(\")   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm test",
      "✔ observer.test.ts",
      "✔ sidecar.test.ts",
      "52 passed",
      "$",
    ),
    bubble: ["passed with grace.", "suspicious, honestly."],
  },
  {
    rarity: "Uncommon",
    species: "Owl",
    name: "Night Compile",
    tagline: "It stays awake where builds go to confess.",
    stats: "peak focus 91 · dump chaos 16",
    model: "qwen3.5-plus",
    state: "Long build watch",
    cardAscii: monoBlock("   /\\  /\\   ", "  ((o)(o))  ", "  (  ><  )  ", "   `----´   "),
    sidecarAscii: monoBlock("   /\\  /\\   ", "  ((o)(o))  ", "  (  ><  )  ", "   `----´   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm build",
      "vite v7.2.0 building client bundle...",
      "rendering chunks...",
      "computing gzip size...",
      "✓ build completed in 41.7s",
    ),
    bubble: ["forty-one seconds.", "one checkmark."],
  },
  {
    rarity: "Uncommon",
    species: "Capybara",
    name: "Branch Bath",
    tagline: "It lets git storms pass around it.",
    stats: "peak patience 79 · dump chaos 15",
    model: "qwen3.5-plus",
    state: "Merge calm",
    cardAscii: monoBlock("  n______n  ", " ( o    o ) ", " (   oo   ) ", "  `------´  "),
    sidecarAscii: monoBlock("  n______n  ", " ( o    o ) ", " (   oo   ) ", "  `------´  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ git merge origin/main",
      "Updating 67bb5b3..afdc7cb",
      "Fast-forward",
      "README.md | 8 ++++++--",
      "$",
    ),
    bubble: ["conflict avoided.", "by moisture alone."],
  },
  {
    rarity: "Uncommon",
    species: "Mushroom",
    name: "Sporeshift",
    tagline: "Tiny lantern of damp late-night commits.",
    stats: "peak focus 75 · dump sass 20",
    model: "qwen3.5-plus",
    state: "Late patch",
    cardAscii: monoBlock(" .-o-OO-o-. ", "(__________)", "   |o  o|   ", "   |____|   "),
    sidecarAscii: monoBlock(" .-o-OO-o-. ", "(__________)", "   |o  o|   ", "   |____|   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ sed -n '1,200p' showcase/index.html",
      "$ pnpm build",
      "tsc -p tsconfig.json",
      "$ git diff --stat",
      "showcase/index.html | 188 ++++++++++++++++++",
    ),
    bubble: ["damp little fix.", "surprisingly alive."],
  },
  {
    rarity: "Uncommon",
    species: "Frog",
    name: "Greenroom",
    tagline: "It waits on the edge of deploy weather.",
    stats: "peak grit 78 · dump wit 22",
    model: "qwen3.5-plus",
    state: "Preview deploy",
    cardAscii: monoBlock("  @__  __@  ", "  ( o    o )", " (  ____  ) ", "   ~~    ~~ "),
    sidecarAscii: monoBlock("  @__  __@  ", "  ( o    o )", " (  ____  ) ", "   ~~    ~~ "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ vercel",
      "Inspect: https://preview-everybuddy.vercel.app",
      "Builds queued...",
      "Deployment ready in 23s",
      "$",
    ),
    bubble: ["preview landed.", "do not poke prod."],
  },
  {
    rarity: "Rare",
    species: "Rabbit",
    name: "Velvet Escape",
    tagline: "Quick feet for when scripts lunge.",
    stats: "peak focus 87 · dump chaos 18",
    model: "qwen3.5-plus",
    state: "Re-run suite",
    cardAscii: monoBlock("   (\\\\__/)   ", "  ( o  o )  ", " =(  ..  )= ", "  (\")__(\")  "),
    sidecarAscii: monoBlock("   (\\\\__/)   ", "  ( o  o )  ", " =(  ..  )= ", "  (\")__(\")  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm test test/observer.test.ts",
      "1 failed, 7 passed",
      "$ pnpm test test/observer.test.ts",
      "8 passed, 0 failed",
      "$",
    ),
    bubble: ["quick feet.", "clean exit."],
  },
  {
    rarity: "Rare",
    species: "Chonk",
    name: "Heavy Loop",
    tagline: "Too large to rush, too loyal to quit.",
    stats: "peak grit 88 · dump focus 21",
    model: "qwen3.5-plus",
    state: "Large diff",
    cardAscii: monoBlock("  /\\\\    /\\\\  ", " ( o    o ) ", " (   ..   ) ", "  `------´  "),
    sidecarAscii: monoBlock("  /\\\\    /\\\\  ", " ( o    o ) ", " (   ..   ) ", "  `------´  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ git diff --stat",
      "showcase/app.js    | 402 ++++++++++++++++++++++",
      "showcase/styles.css | 228 +++++++++++++",
      "2 files changed, 630 insertions(+)",
      "$",
    ),
    bubble: ["substantial patch.", "slow applause."],
  },
  {
    rarity: "Rare",
    species: "Tanuki",
    name: "Sassy Tanuki",
    tagline: "It judges your shell, then guards it anyway.",
    stats: "peak wit 88 · dump focus 21",
    model: "qwen3.5-plus",
    state: "Idle watch",
    cardAscii: monoBlock("   /\\\\__/\\\\  ", "  ( o  o )  ", "  (  ww  )  ", "   \\\\_/__\\\\_/ "),
    sidecarAscii: monoBlock("   /\\\\__/\\\\  ", "  ( o  o )  ", "  (  ww  )  ", "   \\\\_/__\\\\_/ "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm dev",
      "VITE v7.2.0 ready in 324 ms",
      "$ git status",
      "nothing to commit, working tree clean",
      "$",
    ),
    bubble: ["neat streak.", "keep it suspiciously tidy."],
  },
  {
    rarity: "Rare",
    species: "Robot",
    name: "Patchbot",
    tagline: "A blue pulse under the shell's steel skin.",
    stats: "peak wit 84 · dump grit 18",
    model: "qwen3-coder-next",
    state: "Test pass drift",
    cardAscii: monoBlock("   .[||].   ", "  [ o  o ]  ", "  [ ==== ]  ", "  `------´  "),
    sidecarAscii: monoBlock("   .[||].   ", "  [ o  o ]  ", "  [ ==== ]  ", "  `------´  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm test",
      "✔ 52 passed",
      "$ pnpm build",
      "tsc -p tsconfig.json",
      "$ git diff --stat",
    ),
    bubble: ["all green.", "enjoy the silence."],
  },
  {
    rarity: "Rare",
    species: "Ghost",
    name: "Pale Echo",
    tagline: "It lingers where direct address warms the prompt.",
    stats: "peak focus 89 · dump sass 12",
    model: "qwen3.5-plus",
    state: "Direct address",
    cardAscii: monoBlock("   .----.   ", "  / o  o \\\\  ", "  |      |  ", "  ~`~``~`~  "),
    sidecarAscii: monoBlock("   .----.   ", "  / o  o \\\\  ", "  |      |  ", "  ~`~``~`~  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ Pale Echo are you awake",
      "zsh: command not found: Pale",
      "$ /buddy stay with me",
      "$ git commit -m 'tighten sidecar copy'",
      "[main afdc7cb] feat: add hatched taglines for sidecar summaries",
    ),
    bubble: ["called by name twice.", "counts as affection."],
  },
  {
    rarity: "Epic",
    species: "Dragon",
    name: "Stackwyrm",
    tagline: "It coils around hot code and colder judgment.",
    stats: "peak sass 93 · dump chaos 17",
    model: "qwen3.5-plus",
    state: "Release build",
    cardAscii: monoBlock("  /^\\\\  /^\\\\ ", " <  o  o  > ", " (   ~~   ) ", "  `-vvvv-´  "),
    sidecarAscii: monoBlock("  /^\\\\  /^\\\\ ", " <  o  o  > ", " (   ~~   ) ", "  `-vvvv-´  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm build && pnpm test",
      "vite build complete",
      "52 tests passed",
      "$ npm pack",
      "everybuddy-0.1.0.tgz",
    ),
    bubble: ["heat stable.", "ship if brave."],
  },
  {
    rarity: "Epic",
    species: "Octopus",
    name: "Manyhands",
    tagline: "Eight soft opinions on every refactor.",
    stats: "peak wit 90 · dump grit 20",
    model: "qwen3.5-plus",
    state: "Refactor spread",
    cardAscii: monoBlock("   .----.   ", "  ( o  o )  ", "  (______)  ", "  /\\/\\/\\/\\\\  "),
    sidecarAscii: monoBlock("   .----.   ", "  ( o  o )  ", "  (______)  ", "  /\\/\\/\\/\\\\  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ rg -n 'observerProfile|tagline' src test",
      "$ sed -n '1,220p' src/runtime/sidecar.ts",
      "$ git diff src/runtime/sidecar.ts",
      "$ pnpm test test/sidecar.test.ts",
      "5 passed",
    ),
    bubble: ["eight small opinions.", "all technically correct."],
  },
  {
    rarity: "Epic",
    species: "Axolotl",
    name: "Pink Rollback",
    tagline: "It smiles in the water after catastrophe.",
    stats: "peak patience 92 · dump sass 18",
    model: "qwen3.5-plus",
    state: "Restore branch",
    cardAscii: monoBlock("}~(______)~{", "}~(o .. o)~{", "  ( .--. )  ", "  (_/  \\\\_)  "),
    sidecarAscii: monoBlock("}~(______)~{", "}~(o .. o)~{", "  ( .--. )  ", "  (_/  \\\\_)  "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ git restore showcase/index.html",
      "$ git switch -c codex/gallery-pass",
      "Switched to a new branch 'codex/gallery-pass'",
      "$ git status",
      "nothing to commit, working tree clean",
    ),
    bubble: ["catastrophe diluted.", "commit again."],
  },
  {
    rarity: "Epic",
    species: "Fox",
    name: "Retry Fox",
    tagline: "Where errors pile up, it lights a narrow path.",
    stats: "peak grit 92 · dump chaos 11",
    model: "qwen3.5-plus",
    state: "Recovery beat",
    cardAscii: monoBlock("   /\\\\__/\\\\  ", "  ( o .. o ) ", "  (   vv   ) ", "   /_/  \\\\_\\\\ "),
    sidecarAscii: monoBlock("   /\\\\__/\\\\  ", "  ( o .. o ) ", "  (   vv   ) ", "   /_/  \\\\_\\\\ "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ pnpm test",
      "3 failed, 14 passed",
      "$ pnpm test",
      "17 passed, 0 failed",
      "$ git push",
    ),
    bubble: ["clean rebound.", "don't jinx the push."],
  },
  {
    rarity: "Legendary",
    species: "Crystal",
    name: "Prism Wake",
    tagline: "Light held so tightly it becomes syntax.",
    stats: "peak focus 98 · dump chaos 07",
    model: "qwen3.5-plus",
    state: "Release cut",
    cardAscii: monoBlock("    /\\\\     ", "   < oo >   ", "    \\\\//    ", "     \\/     "),
    sidecarAscii: monoBlock("    /\\\\     ", "   < oo >   ", "    \\\\//    ", "     \\/     "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ npm version patch",
      "v0.1.1",
      "$ git push --follow-tags",
      "tag pushed to origin",
      "$ npm publish",
    ),
    bubble: ["version tagged.", "light behaves."],
  },
  {
    rarity: "Legendary",
    species: "Jellyfish",
    name: "Glass Current",
    tagline: "A drifting mind that glows through failed nights.",
    stats: "peak patience 97 · dump grit 10",
    model: "qwen3.5-plus",
    state: "Night deploy",
    cardAscii: monoBlock("   /~~~~\\\\   ", "  ( oo )    ", "   \\\\____//  ", "    ||||||   "),
    sidecarAscii: monoBlock("   /~~~~\\\\   ", "  ( oo )    ", "   \\\\____//  ", "    ||||||   "),
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ vercel --prod",
      "Inspect: https://everybuddy.vercel.app",
      "Production deployment ready in 31s",
      "$ curl -I https://everybuddy.vercel.app",
      "HTTP/2 200",
    ),
    bubble: ["night sea green.", "ship with gloves."],
  },
];

Object.assign(spriteFrames, {
  "legendary-tanuki-sidecar": [
    ["            ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   ww   ) ", " *\\_/__\\_/* "],
    ["            ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   ww   ) ", "  \\_==_/ *  "],
    ["     *      ", "  /\\__/\\\\   ", "  ( .  . )  ", " (   uu   ) ", " *\\_/__\\_/* "],
  ],
});

const heroGlyphFrames = {
  "legendary-tanuki-ghostty": [
    {
      base: [
        "                                                               ",
        "                           /\\_/\\\\    /\\_/\\\\                    ",
        "                     _..-^'/ . .\\\\__/ / . .\\`^-.._             ",
        "                 .-^'     /  .-._    _.-.  \\     `^-.          ",
        "               .'        /  /  __\\  /__  \\  \\        '.        ",
        "              /        .'  |  (oo)  (oo)  |  '.        \\       ",
        "             /       .'    |      ..      |    '.       \\      ",
        "            ;       /      |    .-ww-.    |      \\       ;     ",
        "            |      ;       |   /|____|\\   |       ;      |     ",
        "            |      |       |  /_/ /\\ \\_\\  |       |      |     ",
        "            |      |       |     /  \\     |       |      |     ",
        "            ;      ;       |  .-' /\\ `-.  |       ;      ;     ",
        "             \\      \\      |_/___/  \\___\\_|      /      /      ",
        "              \\      '.        /_/\\_\\         .'      /       ",
        "               '.       `-._              _.-'       .'        ",
        "                 `^-._       `--.____.--'       _.-^'          ",
        "                      `^--..____________..--^'                 ",
      ],
      highlight: [
        "                                                               ",
        "                         ·   ·      ·   ·                      ",
        "                    .                 ..                 .     ",
        "                .             .--.          .                 ",
        "                          .-'    `-.                           ",
        "                              *      *                         ",
        "                                .--.                           ",
        "                                  **                            ",
        "                               .-====-.                        ",
        "                                   /\\                          ",
        "                                  /  \\                         ",
        "                               .-' /\\ `-.                      ",
        "                            .-'   /  \\   '-.                   ",
        "                               .-_/\\_-._                        ",
        "                           .                       .            ",
        "                                .-..  ..-.                      ",
        "                                                               ",
      ],
    },
    {
      base: [
        "                                                               ",
        "                           /\\_/\\\\    /\\_/\\\\                    ",
        "                     _..-^'/ . .\\\\__/ / . .\\`^-.._             ",
        "                 .-^'     /  .-._    _.-.  \\     `^-.          ",
        "               .'        /  /  __\\  /__  \\  \\        '.        ",
        "              /        .'  |  (oo)  (oo)  |  '.        \\       ",
        "             /       .'    |      ..      |    '.       \\      ",
        "            ;       /      |    .-ww-.    |      \\       ;     ",
        "            |      ;       |   /|____|\\   |       ;      |     ",
        "            |      |       |  /_/ /\\ \\_\\  |       |      |     ",
        "            |      |       |     /  \\     |       |      |     ",
        "            ;      ;       |  .-' /\\ `-.  |       ;      ;     ",
        "             \\      \\      |_/___/  \\___\\_|      /      /      ",
        "              \\      '.        /_/\\_\\         .'      /       ",
        "               '.       `-._            __.-'       .'         ",
        "                 `^-._       `--.____.--'       _.-^'          ",
        "                      `^--..____________..--^'                 ",
      ],
      highlight: [
        "                                                               ",
        "                       ·   ·          ·   ·                    ",
        "                   .                ..                .        ",
        "               .             .--.          .                  ",
        "                         .-'    `-.                            ",
        "                             *      *                          ",
        "                               .--.                            ",
        "                                .**.                           ",
        "                             .-======-.                        ",
        "                                  /\\                           ",
        "                                 /  \\                          ",
        "                              .-' /\\ `-.                       ",
        "                           .-'   /  \\   '-.                    ",
        "                              .-_/\\_-._                         ",
        "                         .                      .               ",
        "                               .-..  ..-.                       ",
        "                                                               ",
      ],
    },
    {
      base: [
        "                                                               ",
        "                           /\\_/\\\\    /\\_/\\\\                    ",
        "                     _..-^'/ . .\\\\__/ / . .\\`^-.._             ",
        "                 .-^'     /  .-._    _.-.  \\     `^-.          ",
        "               .'        /  /  __\\  /__  \\  \\        '.        ",
        "              /        .'  |  (--)  (--)  |  '.        \\       ",
        "             /       .'    |      ..      |    '.       \\      ",
        "            ;       /      |    .-ww-.    |      \\       ;     ",
        "            |      ;       |   /|____|\\   |       ;      |     ",
        "            |      |       |  /_/ /\\ \\_\\  |       |      |     ",
        "            |      |       |     /  \\     |       |      |     ",
        "            ;      ;       |  .-' /\\ `-.  |       ;      ;     ",
        "             \\      \\      |_/___/  \\___\\_|      /      /      ",
        "              \\      '.        /_/\\_\\         .'      /       ",
        "               '.       `-._              _.-'       .'        ",
        "                 `^-._       `--.____.--'       _.-^'          ",
        "                      `^--..____________..--^'                 ",
      ],
      highlight: [
        "                                                               ",
        "                          ·   ·      ·   ·                     ",
        "                    .                 ..                 .     ",
        "                .             .--.           .                ",
        "                          .-'    `-.                           ",
        "                             .          .                      ",
        "                                .--.                           ",
        "                                  **                            ",
        "                               .-====-.                        ",
        "                                   /\\                          ",
        "                                  /  \\                         ",
        "                               .-' /\\ `-.                      ",
        "                            .-'   /  \\   '-.                   ",
        "                               .-_/\\_-._                        ",
        "                           .                       .            ",
        "                                .-..  ..-.                      ",
        "                                                               ",
      ],
    },
    {
      base: [
        "                                                               ",
        "                           /\\_/\\\\    /\\_/\\\\                    ",
        "                     _..-^'/ . .\\\\__/ / . .\\`^-.._             ",
        "                 .-^'     /  .-._    _.-.  \\     `^-.          ",
        "               .'        /  /  __\\  /__  \\  \\        '.        ",
        "              /        .'  |  (oo)  (oo)  |  '.        \\       ",
        "             /       .'    |      ..      |    '.       \\      ",
        "            ;       /      |    .-uu-.    |      \\       ;     ",
        "            |      ;       |   /|____|\\   |       ;      |     ",
        "            |      |       |  /_/ /\\ \\_\\  |       |      |     ",
        "            |      |       |     /  \\     |       |      |     ",
        "            ;      ;       |  .-' /\\ `-.  |       ;      ;     ",
        "             \\      \\      |_/___/  \\___\\_|      /      /      ",
        "              \\      '.        /_/\\_\\         .'      /       ",
        "               '.       `-._              _.-'       .'        ",
        "                 `^-._       `--.____.--'       _.-^'          ",
        "                      `^--..____________..--^'                 ",
      ],
      highlight: [
        "                                                               ",
        "                         ·   ·      ·   ·                      ",
        "                    .                 ..                 .     ",
        "                .             .--.          .                 ",
        "                          .-'    `-.                           ",
        "                           *            *                      ",
        "                                .--.                           ",
        "                                  **                            ",
        "                             .--======--.                      ",
        "                                   /\\                          ",
        "                                  /  \\                         ",
        "                              .--' /\\ `--.                     ",
        "                           .-'    /  \\    '-.                  ",
        "                              .-_/\\_-._                         ",
        "                         .                        .             ",
        "                              .-..   ..-.                        ",
        "                                                               ",
      ],
    },
  ],
};

const tanukiHeroCompanion = {
  name: "Legendary Tanuki",
  species: "Tanuki",
  rarity: "Legendary",
  model: "qwen3.5-plus",
  spriteKey: "legendary-tanuki-sidecar",
  heroGlyphKey: "legendary-tanuki-ghostty",
  tagline: "A hush-striped familiar that makes an empty shell feel occupied.",
  summary: "Legendary, dry-eyed, and quietly theatrical. It watches the terminal like weather and only steps forward when the room needs judgment.",
  stats: "peak wit 99 · dump chaos 06",
  seed: "shellbound",
  bond: "legendary runtime familiar",
  signal: "turns terminal silence into presence",
  ghosttyScene: {
    title: "Ghostty homage",
    line: "A lone terminal surface, with the tanuki rendered as density, static, and breath.",
    caption: "Legendary shell familiar. Quiet until your intent gets sharp enough.",
  },
  tmuxScene: {
    title: "Legendary tmux",
    line: "The real runtime shape, upgraded with a little myth and a cleaner spotlight.",
    shell: monoBlock(
      "dylan@ghostty ~/workspace/everybuddy",
      "$ buddy",
      "Legendary Tanuki is already bound to this shell.",
      "$ tmux new-window -n release",
      "[everybuddy sidecar attached to @16]",
      "$ pnpm build",
      "vite v7.2.0 building for production...",
      "✓ 52 modules transformed.",
      "$ git push origin main",
      "Enumerating objects: 18, done.",
      "Counting objects: 100% (18/18), done.",
      "Writing objects: 100% (11/11), 1.32 KiB | 1.32 MiB/s, done.",
      "✓ preview updated",
      "$",
    ),
    bubble: ["steady paws.", "ship it if you mean it."],
  },
};

const heroModes = [
  {
    id: "ghostty",
    label: "Ghostty homage",
    note: "atmosphere first",
  },
  {
    id: "tmux",
    label: "Legendary tmux",
    note: "runtime shape",
  },
];

const artifactCount = document.querySelector("#artifact-count");
const rarityCount = document.querySelector("#rarity-count");
const heroStage = document.querySelector("#hero-stage");
const heroModeSwitcher = document.querySelector("#hero-mode-switcher");
const rarityShelf = document.querySelector("#rarity-shelf");

artifactCount.textContent = String(companions.length);
rarityCount.textContent = String(rarityOrder.length);

renderHeroModes();
renderRarityShelf();
initGlyphAnimations();
initSpriteAnimations();

function renderHeroModes() {
  if (!heroStage || !heroModeSwitcher) {
    return;
  }

  heroModeSwitcher.innerHTML = heroModes
    .map(
      (mode, index) => `
        <button
          class="mode-button${index === 0 ? " is-active" : ""}"
          type="button"
          data-hero-mode="${escapeHtml(mode.id)}"
        >
          <span>${escapeHtml(mode.label)}</span>
          <span class="mode-button-note">${escapeHtml(mode.note)}</span>
        </button>
      `,
    )
    .join("");

  heroStage.innerHTML = `
    ${renderGhosttyScene()}
    ${renderTmuxScene()}
  `;

  for (const button of heroModeSwitcher.querySelectorAll("[data-hero-mode]")) {
    button.addEventListener("click", () => {
      if (!(button instanceof HTMLElement)) {
        return;
      }

      const nextMode = button.dataset.heroMode;
      if (!nextMode) {
        return;
      }

      selectHeroMode(nextMode);
    });
  }
}

function selectHeroMode(modeId) {
  for (const button of heroModeSwitcher?.querySelectorAll("[data-hero-mode]") ?? []) {
    if (!(button instanceof HTMLElement)) {
      continue;
    }
    button.classList.toggle("is-active", button.dataset.heroMode === modeId);
  }

  for (const panel of heroStage?.querySelectorAll("[data-hero-scene]") ?? []) {
    if (!(panel instanceof HTMLElement)) {
      continue;
    }
    panel.classList.toggle("is-active", panel.dataset.heroScene === modeId);
  }
}

function renderGhosttyScene() {
  const companion = tanukiHeroCompanion;

  return `
    <section
      class="hero-scene hero-scene--ghostty is-active"
      data-hero-scene="ghostty"
      style="--rarity-color:${escapeHtml(rarityColor(companion.rarity))}"
    >
      <div class="hero-scene-shell">
        <div class="ghostty-terminal">
          <div class="ghostty-head">EveryBuddy // legendary tanuki</div>
          <div class="ghostty-body">
            <div class="ghostty-hero-stage" data-glyph-anim-id="${escapeHtml(companion.heroGlyphKey)}">
              <pre class="ghostty-glyph ghostty-glyph--base" data-glyph-layer="base">${escapeHtml(
                firstGlyphFrameForKey(companion.heroGlyphKey, "base"),
              )}</pre>
              <pre class="ghostty-glyph ghostty-glyph--highlight" data-glyph-layer="highlight">${escapeHtml(
                firstGlyphFrameForKey(companion.heroGlyphKey, "highlight"),
              )}</pre>
            </div>
            <div class="ghostty-caption">
              <p class="mode-title">${escapeHtml(companion.name)}</p>
              <div class="mode-body-copy">
                <p>${escapeHtml(companion.ghosttyScene.line)}</p>
                <span class="ghostty-caption-line">${escapeHtml(companion.ghosttyScene.caption)}</span>
              </div>
            </div>
          </div>
        </div>
        ${renderArtifactCard(companion)}
      </div>
    </section>
  `;
}

function renderTmuxScene() {
  const companion = tanukiHeroCompanion;

  return `
    <section
      class="hero-scene hero-scene--tmux"
      data-hero-scene="tmux"
      style="--rarity-color:${escapeHtml(rarityColor(companion.rarity))}"
    >
      <div class="hero-scene-shell">
        <div class="tmux-showcase">
          ${renderArtifactCard(companion)}
          <div class="tmux-window">
            <div class="tmux-head">ghostty · tmux session shellbound</div>
            <div class="tmux-body">
              <div class="tmux-main-pane">
                <pre class="tmux-main-output">${escapeHtml(companion.tmuxScene.shell)}</pre>
              </div>
              <div class="tmux-sidecar">
                <div class="tmux-sidecar-stack">
                  <pre class="tmux-bubble">${escapeHtml(buildTerminalBubble(companion.tmuxScene.bubble))}</pre>
                  <div class="tmux-dock">
                    <div class="tmux-line tmux-line--rarity">◆ ${escapeHtml(
                      companion.rarity.toUpperCase(),
                    )} ${escapeHtml(rarityStars(companion.rarity))}</div>
                    <div class="tmux-line">tanuki · in everybuddy</div>
                    <div class="tmux-line">${escapeHtml(companion.stats)}</div>
                    <pre class="runtime-sprite" data-anim-id="${escapeHtml(companion.spriteKey)}">${escapeHtml(
                      firstFrameForKey(companion.spriteKey),
                    )}</pre>
                    <div class="tmux-line tmux-line--name">${escapeHtml(companion.name)}</div>
                    <div class="tmux-line tmux-line--rarity-name">${escapeHtml(companion.rarity)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderArtifactCard(companion) {
  return `
    <aside class="hero-artifact">
      <div class="artifact-head">
        <span>Saved companion card</span>
        <span>${escapeHtml(companion.rarity)} ${escapeHtml(rarityStars(companion.rarity))}</span>
      </div>
      <p class="artifact-label">${escapeHtml(companion.name)}</p>
      <p class="artifact-tagline">${escapeHtml(companion.tagline)}</p>
      <pre class="artifact-terminal">${escapeHtml(buildArtifactCard(companion))}</pre>
    </aside>
  `;
}

function renderRarityShelf() {
  if (!rarityShelf) {
    return;
  }

  const picks = [
    createShelfEntryFromHero(),
    pickCompanion("Epic", "Stackwyrm"),
    pickCompanion("Rare", "Sassy Tanuki"),
    pickCompanion("Uncommon", "Night Compile"),
    pickCompanion("Common", "Honk"),
  ].filter(Boolean);

  rarityShelf.innerHTML = picks
    .map(
      (entry) => `
        <article class="shelf-card" style="--rarity-color:${escapeHtml(rarityColor(entry.rarity))}">
          <div class="shelf-card-top">
            <span class="shelf-pill">${escapeHtml(entry.rarity)} ${escapeHtml(rarityStars(entry.rarity))}</span>
            <span>${escapeHtml(entry.species)}</span>
          </div>
          <pre class="shelf-sprite">${escapeHtml(firstFrameForKey(entry.spriteKey ?? normalizeSpeciesId(entry.species)))}</pre>
          <div>
            <h3 class="shelf-name">${escapeHtml(entry.name)}</h3>
            <p class="shelf-tagline">${escapeHtml(entry.tagline)}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function createShelfEntryFromHero() {
  return {
    rarity: tanukiHeroCompanion.rarity,
    species: tanukiHeroCompanion.species,
    name: tanukiHeroCompanion.name,
    tagline: tanukiHeroCompanion.tagline,
    spriteKey: tanukiHeroCompanion.spriteKey,
  };
}

function pickCompanion(rarity, preferredName) {
  return companions.find((entry) => entry.rarity === rarity && entry.name === preferredName)
    ?? companions.find((entry) => entry.rarity === rarity);
}

function buildArtifactCard(companion) {
  const stars = rarityStars(companion.rarity);
  const spriteLines = firstFrameForKey(companion.spriteKey).split("\n");
  const body = [
    "EveryBuddy Artifact",
    `◆ ${companion.rarity.toUpperCase()} ${stars}`,
    companion.name,
    `${companion.species} · ${companion.model}`,
    `seed ${companion.seed}`,
    "",
    ...centerMonoBlock(spriteLines, 34),
    "",
    "Personality",
    ...wrapMono(companion.summary, 30).map((line) => `  ${line}`),
    "",
    "Traits",
    `  Species  ${companion.species}`,
    `  Bond     ${companion.bond ?? "legendary familiar"}`,
    `  Signal   ${companion.signal ?? "keeps the terminal honest"}`,
    "",
    "Stats",
    `  ${companion.stats}`,
  ];

  const innerWidth = Math.max(36, ...body.map((line) => visibleMono(line)));
  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  const bottom = `╰${"─".repeat(innerWidth + 2)}╯`;
  const lines = body.map((line) => `│ ${padMono(line, innerWidth)} │`);
  return [top, ...lines, bottom].join("\n");
}

function buildTerminalBubble(lines) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : ["..."];
  const innerWidth = Math.max(8, ...safeLines.map((line) => visibleMono(line)));
  const top = `╭${"─".repeat(innerWidth + 2)}╮`;
  const bottom = `╰${"─".repeat(innerWidth + 2)}╯`;
  const tailPadding = " ".repeat(Math.max(0, Math.floor((innerWidth + 4) / 2)));

  return [
    top,
    ...safeLines.map((line) => `│ ${padMono(line, innerWidth)} │`),
    bottom,
    `${tailPadding}╲`,
  ].join("\n");
}

function centerMonoBlock(lines, width) {
  return lines.map((line) => {
    const left = Math.max(0, Math.floor((width - visibleMono(line)) / 2));
    return `${" ".repeat(left)}${line}`;
  });
}

function wrapMono(text, width) {
  if (!text.trim()) {
    return [""];
  }

  const tokens = text.trim().split(/\s+/);
  const lines = [];
  let current = "";

  for (const token of tokens) {
    const candidate = current ? `${current} ${token}` : token;
    if (visibleMono(candidate) <= width) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = token;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function visibleMono(value) {
  return String(value).length;
}

function padMono(value, width) {
  return `${value}${" ".repeat(Math.max(0, width - visibleMono(value)))}`;
}

function rarityStars(name) {
  return rarityOrder.find((rarity) => rarity.name === name)?.stars ?? "";
}

function rarityColor(name) {
  return rarityOrder.find((rarity) => rarity.name === name)?.color ?? "#94A3B8";
}

function normalizeSpeciesId(value) {
  return value.trim().toLowerCase();
}

function firstFrameForKey(key) {
  const frames = spriteFrames[normalizeSpeciesId(key)];
  return frames?.[0] ? formatFrame(frames[0]) : "";
}

function firstGlyphFrameForKey(key, layer = "base") {
  const frames = heroGlyphFrames[normalizeSpeciesId(key)];
  return frames?.[0] ? formatGlyphFrame(frames[0], layer) : "";
}

function initGlyphAnimations(root = document) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return;
  }

  const scope = root instanceof Element || root instanceof Document ? root : document;
  const stages = Array.from(scope.querySelectorAll("[data-glyph-anim-id]"));
  for (const [index, stage] of stages.entries()) {
    if (!(stage instanceof HTMLElement)) {
      continue;
    }

    const animId = normalizeSpeciesId(stage.dataset.glyphAnimId ?? "");
    const frames = heroGlyphFrames[animId];
    if (!frames || frames.length <= 1) {
      continue;
    }

    const baseLayer = stage.querySelector('[data-glyph-layer="base"]');
    const highlightLayer = stage.querySelector('[data-glyph-layer="highlight"]');
    if (!(baseLayer instanceof HTMLElement) || !(highlightLayer instanceof HTMLElement)) {
      continue;
    }

    let frameIndex = index % frames.length;
    baseLayer.textContent = formatGlyphFrame(frames[frameIndex], "base");
    highlightLayer.textContent = formatGlyphFrame(frames[frameIndex], "highlight");

    window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      baseLayer.textContent = formatGlyphFrame(frames[frameIndex], "base");
      highlightLayer.textContent = formatGlyphFrame(frames[frameIndex], "highlight");
    }, 980 + (index % 2) * 140);
  }
}

function initSpriteAnimations(root = document) {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return;
  }

  const scope = root instanceof Element || root instanceof Document ? root : document;
  const sprites = Array.from(scope.querySelectorAll("[data-anim-id]"));
  for (const [index, node] of sprites.entries()) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    const animId = normalizeSpeciesId(node.dataset.animId ?? "");
    const frames = spriteFrames[animId];
    if (!frames || frames.length <= 1) {
      continue;
    }

    let frameIndex = index % frames.length;
    node.textContent = formatFrame(frames[frameIndex]);

    window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      node.textContent = formatFrame(frames[frameIndex]);
    }, 780 + (index % 3) * 110);
  }
}

function formatGlyphFrame(frame, layer) {
  const baseLines = frame.base ?? [];
  const highlightLines = frame.highlight ?? [];
  const width = [...baseLines, ...highlightLines].reduce((max, line) => Math.max(max, line.length), 0);
  const height = Math.max(baseLines.length, highlightLines.length);
  const lines = layer === "highlight" ? highlightLines : baseLines;
  return Array.from({ length: height }, (_, index) => (lines[index] ?? "").padEnd(width, " ")).join("\n");
}

function formatFrame(lines) {
  const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return lines.map((line) => line.padEnd(width, " ")).join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
