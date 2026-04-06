# EveryBuddy — Claude Code Plugin

Your gacha-hatched terminal companion lives in the Claude Code status bar.

## Prerequisites

Install EveryBuddy and hatch a companion first:

```bash
npm install -g everybuddy
buddy          # hatch your companion
```

## Install Plugin

```
/plugin install everybuddy
```

Or add the marketplace first:

```
/plugin marketplace add Dylan-Nihilo/EveryBuddy
/plugin install everybuddy@Dylan-Nihilo/EveryBuddy
```

## What It Does

- Renders your companion's ASCII sprite in the Claude Code status bar
- Shows session info: model, context usage %, git branch, cost
- Frame changes on each assistant message (timestamp-based)

## Manual Setup (Alternative)

If you prefer not to use the plugin, add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "buddy-cc-statusline"
  }
}
```
