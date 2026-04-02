import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { socketDirectory, socketPathForWindow } from "../src/runtime/socket.js";
import { runEventCommand } from "../src/cli/event.js";

test("socketPathForWindow uses a per-window socket inside the EveryBuddy tmp dir", () => {
  const env = { EVERYBUDDY_TMPDIR: "/tmp/everybuddy-tests" } as NodeJS.ProcessEnv;
  assert.equal(socketDirectory(env), "/tmp/everybuddy-tests/everybuddy");
  assert.equal(socketPathForWindow("@12", env), "/tmp/everybuddy-tests/everybuddy/_12.sock");
});

test("runEventCommand is silent when the sidecar socket does not exist", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-event-"));
  const previousEnv = {
    TMUX: process.env.TMUX,
    TMUX_PANE: process.env.TMUX_PANE,
    TMUX_BIN: process.env.TMUX_BIN,
    FAKE_TMUX_STATE_PATH: process.env.FAKE_TMUX_STATE_PATH,
    EVERYBUDDY_TMPDIR: process.env.EVERYBUDDY_TMPDIR,
  };

  process.env.TMUX = "fake";
  process.env.TMUX_PANE = "%1";
  process.env.TMUX_BIN = process.execPath;
  process.env.FAKE_TMUX_STATE_PATH = undefined;
  process.env.EVERYBUDDY_TMPDIR = tempDir;

  try {
    await runEventCommand("pane_active", { cwd: "/tmp" });
    assert.ok(true);
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});
