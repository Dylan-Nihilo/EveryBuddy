import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runAttachCommand } from "../src/cli/attach.js";
import { runDetachCommand } from "../src/cli/detach.js";
import {
  SIDECAR_WIDTH_MEDIUM,
  SIDECAR_WIDTH_NARROW,
  SIDECAR_WIDTH_WIDE,
  SIDECAR_OPTION,
  TARGET_OPTION,
  buildSidecarCommand,
  choosePrimarySidecarPane,
  resolveSidecarWidth,
} from "../src/runtime/tmux.js";
import { resolveTargetPane } from "../src/runtime/sidecar.js";

test("buildSidecarCommand starts the internal sidecar with env guard", () => {
  const command = buildSidecarCommand("@1", "%1");

  assert.match(command, /EVERYBUDDY_SIDECAR=1/);
  assert.match(command, /sidecar/);
  assert.match(command, /--window-id/);
  assert.match(command, /--target-pane/);
});

test("choosePrimarySidecarPane prefers the newest pane id", () => {
  assert.equal(choosePrimarySidecarPane(["%7", "%8", "%3"]), "%8");
});

test("resolveSidecarWidth chooses wide, medium, and narrow widths from window size", () => {
  assert.equal(resolveSidecarWidth(140), SIDECAR_WIDTH_WIDE);
  assert.equal(resolveSidecarWidth(100), SIDECAR_WIDTH_MEDIUM);
  assert.equal(resolveSidecarWidth(80), SIDECAR_WIDTH_NARROW);
});

test("resolveTargetPane keeps the current target when it is still alive", () => {
  assert.equal(resolveTargetPane(["%1", "%2", "%99"], "%99", "%2"), "%2");
});

test("resolveTargetPane falls back to another work pane when the target is gone", () => {
  assert.equal(resolveTargetPane(["%1", "%99"], "%99", "%2"), "%1");
  assert.equal(resolveTargetPane(["%99"], "%99", "%1"), undefined);
});

test("attach writes sidecar and target window options, then reuses a live sidecar", async () => {
  const fixture = await createFakeTmuxFixture({
    currentPaneId: "%1",
    currentWindowId: "@1",
    panesByWindow: { "@1": ["%1"] },
    options: { "@1": {} },
    nextPaneSequence: 90,
  });

  const previousEnv = snapshotEnv();
  applyFakeTmuxEnv(fixture);

  try {
    const firstAttach = await runAttachCommand({ quiet: true });
    assert.equal(firstAttach?.created, true);

    let state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], "%90");
    assert.equal(state.options["@1"][TARGET_OPTION], "%1");
    assert.match(state.lastSplitCommand ?? "", /sidecar/);
    assert.equal(state.lastSplitDetached, true);
    assert.equal(state.lastSplitWidth, SIDECAR_WIDTH_WIDE);

    state.currentPaneId = "%2";
    state.panesByWindow["@1"].push("%2");
    await fixture.writeState(state);
    process.env.TMUX_PANE = "%2";

    const secondAttach = await runAttachCommand({ quiet: true });
    assert.equal(secondAttach?.created, false);

    state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], "%90");
    assert.equal(state.options["@1"][TARGET_OPTION], "%2");
  } finally {
    restoreEnv(previousEnv);
    await fixture.cleanup();
  }
});

test("attach replaces a stale sidecar pane id with a fresh split", async () => {
  const fixture = await createFakeTmuxFixture({
    currentPaneId: "%1",
    currentWindowId: "@1",
    panesByWindow: { "@1": ["%1"] },
    options: { "@1": { [SIDECAR_OPTION]: "%66" } },
    nextPaneSequence: 90,
  });

  const previousEnv = snapshotEnv();
  applyFakeTmuxEnv(fixture);

  try {
    const context = await runAttachCommand({ quiet: true });
    assert.equal(context?.created, true);

    const state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], "%90");
    assert.equal(state.options["@1"][TARGET_OPTION], "%1");
    assert.equal(state.lastSplitWidth, SIDECAR_WIDTH_WIDE);
  } finally {
    restoreEnv(previousEnv);
    await fixture.cleanup();
  }
});

test("attach chooses the split width from the current tmux window width", async () => {
  const cases = [
    { windowWidth: 100, expectedWidth: SIDECAR_WIDTH_MEDIUM },
    { windowWidth: 80, expectedWidth: SIDECAR_WIDTH_NARROW },
  ];

  for (const testCase of cases) {
    const fixture = await createFakeTmuxFixture({
      currentPaneId: "%1",
      currentWindowId: "@1",
      windowWidth: testCase.windowWidth,
      panesByWindow: { "@1": ["%1"] },
      options: { "@1": {} },
      nextPaneSequence: 90,
    });

    const previousEnv = snapshotEnv();
    applyFakeTmuxEnv(fixture);

    try {
      await runAttachCommand({ quiet: true });
      const state = await fixture.readState();
      assert.equal(state.lastSplitWidth, testCase.expectedWidth);
    } finally {
      restoreEnv(previousEnv);
      await fixture.cleanup();
    }
  }
});

test("attach collapses duplicate sidecars to the newest pane", async () => {
  const sidecarStartCommand = buildSidecarCommand("@1", "%1");
  const fixture = await createFakeTmuxFixture({
    currentPaneId: "%1",
    currentWindowId: "@1",
    panesByWindow: { "@1": ["%1", "%7", "%8"] },
    options: { "@1": { [SIDECAR_OPTION]: "%7" } },
    nextPaneSequence: 90,
    startCommandByPane: {
      "%7": sidecarStartCommand,
      "%8": sidecarStartCommand,
    },
    widthByPane: {
      "%1": 80,
      "%7": 24,
      "%8": 24,
    },
  });

  const previousEnv = snapshotEnv();
  applyFakeTmuxEnv(fixture);

  try {
    const context = await runAttachCommand({ quiet: true });
    assert.equal(context?.created, false);

    const state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], "%8");
    assert.equal(state.options["@1"][TARGET_OPTION], "%1");
    assert.deepEqual(state.panesByWindow["@1"], ["%1", "%8"]);
  } finally {
    restoreEnv(previousEnv);
    await fixture.cleanup();
  }
});

test("detach kills the sidecar pane and clears window options", async () => {
  const fixture = await createFakeTmuxFixture({
    currentPaneId: "%1",
    currentWindowId: "@1",
    panesByWindow: { "@1": ["%1", "%90"] },
    options: { "@1": { [SIDECAR_OPTION]: "%90", [TARGET_OPTION]: "%1" } },
    nextPaneSequence: 91,
  });

  const previousEnv = snapshotEnv();
  applyFakeTmuxEnv(fixture);

  try {
    await runDetachCommand({ quiet: true });

    const state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], undefined);
    assert.equal(state.options["@1"][TARGET_OPTION], undefined);
    assert.deepEqual(state.panesByWindow["@1"], ["%1"]);
  } finally {
    restoreEnv(previousEnv);
    await fixture.cleanup();
  }
});

test("detach kills every duplicate sidecar pane in the window", async () => {
  const sidecarStartCommand = buildSidecarCommand("@1", "%1");
  const fixture = await createFakeTmuxFixture({
    currentPaneId: "%1",
    currentWindowId: "@1",
    panesByWindow: { "@1": ["%1", "%7", "%8"] },
    options: { "@1": { [SIDECAR_OPTION]: "%8", [TARGET_OPTION]: "%1" } },
    nextPaneSequence: 91,
    startCommandByPane: {
      "%7": sidecarStartCommand,
      "%8": sidecarStartCommand,
    },
    widthByPane: {
      "%1": 80,
      "%7": 24,
      "%8": 24,
    },
  });

  const previousEnv = snapshotEnv();
  applyFakeTmuxEnv(fixture);

  try {
    await runDetachCommand({ quiet: true });

    const state = await fixture.readState();
    assert.equal(state.options["@1"][SIDECAR_OPTION], undefined);
    assert.equal(state.options["@1"][TARGET_OPTION], undefined);
    assert.deepEqual(state.panesByWindow["@1"], ["%1"]);
  } finally {
    restoreEnv(previousEnv);
    await fixture.cleanup();
  }
});

interface FakeTmuxState {
  currentPaneId: string;
  currentWindowId: string;
  windowWidth?: number;
  panesByWindow: Record<string, string[]>;
  options: Record<string, Record<string, string>>;
  nextPaneSequence: number;
  lastSplitCommand?: string;
  lastSplitDetached?: boolean;
  lastSplitWidth?: number;
  startCommandByPane?: Record<string, string>;
  widthByPane?: Record<string, number>;
}

async function createFakeTmuxFixture(initialState: FakeTmuxState) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-fake-tmux-"));
  const statePath = path.join(dir, "state.json");
  const scriptPath = path.join(dir, "fake-tmux.js");

  await writeFile(statePath, JSON.stringify(initialState, null, 2), "utf8");
  await writeFile(
    scriptPath,
    `#!/usr/bin/env node
const fs = require("node:fs");
const statePath = process.env.FAKE_TMUX_STATE_PATH;
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
function saveAndExit(code, stdout = "", stderr = "") {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exit(code);
}
function readTarget() {
  const index = args.indexOf("-t");
  return index >= 0 ? args[index + 1] : undefined;
}
function paneCurrentCommand(paneId) {
  const startCommand = state.startCommandByPane?.[paneId] || "";
  return startCommand.includes(" sidecar ") ? "node" : "zsh";
}
function paneWidth(paneId) {
  return state.widthByPane?.[paneId] || (paneCurrentCommand(paneId) === "node" ? 24 : 80);
}
function renderPaneLine(paneId, format) {
  return format
    .replaceAll("#{pane_id}", paneId)
    .replaceAll("#{pane_current_command}", paneCurrentCommand(paneId))
    .replaceAll("#{pane_start_command}", state.startCommandByPane?.[paneId] || "")
    .replaceAll("#{pane_width}", String(paneWidth(paneId)));
}
if (args[0] === "display-message") {
  const target = readTarget();
  const format = args[args.length - 1];
  if (format === "#{pane_id}") {
    if (target) {
      const panes = Object.values(state.panesByWindow).flat();
      if (!panes.includes(target)) saveAndExit(1);
      saveAndExit(0, target);
    }
    saveAndExit(0, state.currentPaneId);
  }
  if (format === "#{window_id}") {
    saveAndExit(0, state.currentWindowId);
  }
  if (format === "#{window_width}") {
    saveAndExit(0, String(state.windowWidth || 140));
  }
}
if (args[0] === "show-options") {
  const target = readTarget();
  const optionName = args[args.length - 1];
  const value = state.options[target]?.[optionName];
  if (value === undefined) saveAndExit(1);
  saveAndExit(0, value);
}
if (args[0] === "set-option") {
  const target = readTarget();
  const optionName = args[args.length - (args.includes("-wu") ? 1 : 2)];
  state.options[target] ||= {};
  if (args.includes("-wu")) {
    delete state.options[target][optionName];
    saveAndExit(0);
  }
  const value = args[args.length - 1];
  state.options[target][optionName] = value;
  saveAndExit(0);
}
if (args[0] === "split-window") {
  const target = readTarget();
  const widthIndex = args.indexOf("-l");
  const paneId = "%" + state.nextPaneSequence++;
  state.panesByWindow[target] ||= [];
  state.panesByWindow[target].push(paneId);
  state.lastSplitCommand = args[args.length - 1];
  state.lastSplitDetached = args.includes("-d");
  state.lastSplitWidth = widthIndex >= 0 ? Number.parseInt(args[widthIndex + 1], 10) || 24 : 24;
  state.startCommandByPane ||= {};
  state.startCommandByPane[paneId] = args[args.length - 1];
  state.widthByPane ||= {};
  state.widthByPane[paneId] = state.lastSplitWidth;
  saveAndExit(0, paneId);
}
if (args[0] === "list-panes") {
  const target = readTarget();
  const panes = state.panesByWindow[target] || [];
  const format = args[args.length - 1];
  saveAndExit(0, panes.map((paneId) => renderPaneLine(paneId, format)).join("\\n"));
}
if (args[0] === "kill-pane") {
  const target = readTarget();
  for (const windowId of Object.keys(state.panesByWindow)) {
    state.panesByWindow[windowId] = state.panesByWindow[windowId].filter((paneId) => paneId !== target);
  }
  if (state.startCommandByPane) delete state.startCommandByPane[target];
  if (state.widthByPane) delete state.widthByPane[target];
  saveAndExit(0);
}
saveAndExit(1, "", "unsupported fake tmux command");
`,
    "utf8",
  );
  await chmod(scriptPath, 0o755);

  return {
    scriptPath,
    statePath,
    async readState(): Promise<FakeTmuxState> {
      return JSON.parse(await readFile(statePath, "utf8"));
    },
    async writeState(nextState: FakeTmuxState): Promise<void> {
      await writeFile(statePath, JSON.stringify(nextState, null, 2), "utf8");
    },
    async cleanup(): Promise<void> {
      await rm(dir, { recursive: true, force: true });
    },
  };
}

function applyFakeTmuxEnv(fixture: { scriptPath: string; statePath: string }): void {
  process.env.TMUX = "fake-session";
  process.env.TMUX_BIN = fixture.scriptPath;
  process.env.FAKE_TMUX_STATE_PATH = fixture.statePath;
}

function snapshotEnv(): Record<string, string | undefined> {
  return {
    TMUX: process.env.TMUX,
    TMUX_PANE: process.env.TMUX_PANE,
    TMUX_BIN: process.env.TMUX_BIN,
    FAKE_TMUX_STATE_PATH: process.env.FAKE_TMUX_STATE_PATH,
  };
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
