import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInfoBar,
  composeSideBySide,
  parseSessionJSON,
  renderCompanionStatusLine,
  renderEmptyStatusLine,
} from "../src/cli/cc-statusline.js";
import type { CCSessionJSON } from "../src/runtime/cc-types.js";
import type { CompanionRecord } from "../src/types/companion.js";

// Force isTTY so ANSI codes render in test output checks.
Object.defineProperty(process.stdout, "isTTY", { value: true });

const MOCK_SESSION: CCSessionJSON = {
  session_id: "test-session",
  cwd: "/tmp",
  model: { id: "claude-opus-4-6", display_name: "Opus" },
  workspace: { current_dir: "/tmp", project_dir: "/tmp" },
  cost: { total_cost_usd: 0.42 },
  context_window: { used_percentage: 37 },
};

const MOCK_COMPANION: CompanionRecord = {
  userId: "test-user",
  createdAt: "2026-04-06T00:00:00.000Z",
  bones: {
    userId: "test-user",
    species: "octopus",
    eye: "dot",
    hat: "none",
    shiny: false,
    color: { primary: "#E879F9", accent: "#A855F7" },
    rarity: { tier: 3, name: "Rare", stars: "***", color: "#60A5FA", weight: 4, floor: 0 },
    stats: { GRIT: 15, FOCUS: 20, CHAOS: 30, WIT: 25, SASS: 10 },
  },
  soul: {
    name: "Inky",
    tagline: "Watches from the deep.",
    personality: "A curious octopus that observes everything.",
    observerProfile: { voice: "quiet", chattiness: 2, sharpness: 3, patience: 4 },
    modelUsed: "test-model",
  },
};

test("composeSideBySide merges sprite and info lines side by side", () => {
  const sprite = ["line1", "line2", "line3", "line4", "line5"];
  const right = ["info1", "info2"];
  const result = composeSideBySide(sprite, right);
  const lines = result.split("\n");

  assert.equal(lines.length, 5);
  assert.ok(lines[0]!.includes("info1"));
  assert.ok(lines[1]!.includes("info2"));
  // Lines 3-5 should have empty right side but still have sprite padding.
  assert.ok(lines[4]!.includes("line5"));
});

test("buildInfoBar includes model name, percentage, and cost", () => {
  const bar = buildInfoBar(MOCK_SESSION, "en");
  assert.ok(bar.includes("Opus"), "should contain model name");
  assert.ok(bar.includes("37%"), "should contain context percentage");
  assert.ok(bar.includes("$0.42"), "should contain cost");
});

test("buildInfoBar returns empty string for null session", () => {
  assert.equal(buildInfoBar(null, "en"), "");
});

test("parseSessionJSON handles valid JSON", () => {
  const result = parseSessionJSON(JSON.stringify(MOCK_SESSION));
  assert.ok(result);
  assert.equal(result.session_id, "test-session");
});

test("parseSessionJSON handles empty string", () => {
  assert.equal(parseSessionJSON(""), null);
  assert.equal(parseSessionJSON("   "), null);
});

test("parseSessionJSON handles malformed JSON", () => {
  assert.equal(parseSessionJSON("not json at all"), null);
});

test("renderCompanionStatusLine contains ASCII art and companion name", () => {
  const output = renderCompanionStatusLine(MOCK_COMPANION, MOCK_SESSION, "en");
  const lines = output.split("\n");

  // Octopus sprite has recognizable characters.
  const raw = output.replace(/\u001B\[[0-9;]*m/g, "");
  assert.ok(raw.includes("Inky"), "should contain companion name");
  assert.ok(raw.includes("Octopus") || raw.includes("octopus"), "should contain species name");
  assert.ok(lines.length >= 3, "should be multi-line (sprite height)");
});

test("renderEmptyStatusLine contains hatch hint", () => {
  const output = renderEmptyStatusLine(MOCK_SESSION);
  const raw = output.replace(/\u001B\[[0-9;]*m/g, "");
  assert.ok(raw.includes("buddy"), "should mention buddy command");
  assert.ok(raw.includes("hatch"), "should mention hatching");
});
