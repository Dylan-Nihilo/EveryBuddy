# EveryBuddy

A terminal companion pet that hatches from a gacha draw, gets an AI-written personality, and lives in your tmux sidecar.

![Homepage](docs/screenshots/homepage.png)

## How it works

1. **Gacha draw** — Your system username seeds a deterministic PRNG. Species, rarity, stats, and appearance are locked to your identity.
2. **Soul imprint** — An LLM writes a unique name, personality, and observer profile for your companion.
3. **Sidecar runtime** — The companion lives in a tmux split pane, watches your shell commands via Unix socket, and occasionally reacts with speech bubbles.

## Quick start

```bash
npm install -g everybuddy
buddy                    # first-run: gacha draw + soul imprint
buddy install tmux       # hook into your shell
```

Open a new tmux window and your companion appears.

## Companion cards

Every companion gets a card with rarity-colored borders, animated sprites, and stat bars. Five rarity tiers from Common to Legendary.

![Companion Cards](docs/screenshots/companion-cards.png)

## Rarity tiers

| Tier | Color | Weight | Companions |
|------|-------|--------|------------|
| Common | Gray | 60% | Duck, Goose, Blob, Penguin, Turtle, Snail, Cactus |
| Uncommon | Green | 25% | Cat, Owl, Capybara, Mushroom, Frog |
| Rare | Blue | 10% | Robot, Ghost, Chonk, Heavy Loop |
| Epic | Purple | 4% | Dragon, Octopus, Axolotl, Fox, Crystal, Jellyfish |
| Legendary | Gold | 1% | Maltese, Velvet Escape, Sassy Tanuki |

![Rarity Shelf](docs/screenshots/rarity-shelf.png)

## Gacha animation

The hatching sequence plays a 5-phase terminal animation:

```
Phase 0  Charge spinner — "Summoning..." with building intensity
Phase 1  Particle convergence — dots/stars converge to center
Phase 2  Rarity flash — screen flashes in rarity color
Phase 3  Silhouette — dim outline of the companion appears
Phase 4  Reveal — color fills in, name types out letter by letter
Phase 5  Card — final card with animated sprite cycling
```

Legendary draws get rainbow particles, screen shake, and longer hold times. Common draws are fast and understated.

## Architecture

```
bones (deterministic)  →  soul (LLM)  →  runtime (tmux sidecar)
     PRNG seeded by         AI writes        Unix socket server
     username hash          name/personality  reacts to shell events
```

**CLI**: `src/index.ts` → `src/cli/setup.ts` (onboarding) → `src/cli/install.ts` (tmux hooks)

**Render**: `src/render/gacha.ts` (animation) → `src/render/card.ts` (card) → `src/render/sprites.ts` (ASCII art)

**Runtime**: Shell hook → `buddy event` → Unix socket → `src/runtime/observer.ts` → `src/runtime/sidecar.ts`

## Commands

```bash
buddy                # show your companion or start first-run setup
buddy setup          # reconfigure LLM provider
buddy hatch          # re-draw a new companion
buddy hatch --force  # force replace current companion
buddy install tmux   # install shell hooks in ~/.zshrc
buddy pet            # pet your companion
```

## Provider support

| Provider | Model | Notes |
|----------|-------|-------|
| Alibaba DashScope | qwen3.5-plus | Default, free tier available |
| OpenAI | gpt-4o-mini | `buddy setup` → choose OpenAI |
| Anthropic | claude-haiku-4-5 | `buddy setup` → choose Anthropic |
| Custom | any | OpenAI-compatible endpoint |

## Development

```bash
pnpm install
pnpm build            # tsc → dist/
pnpm test             # node --test
pnpm dev              # tsx src/index.ts
pnpm run typecheck    # tsc --noEmit
```

## License

MIT
