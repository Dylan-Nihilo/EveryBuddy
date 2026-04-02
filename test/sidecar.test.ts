import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveReactionBubble,
  resolveRenderMode,
  resolveSpriteFrameState,
} from "../src/runtime/sidecar.js";

test("resolveReactionBubble hides expired reactions and fades near expiry", () => {
  assert.deepEqual(
    resolveReactionBubble({ reactionText: undefined, reactionExpiresAt: undefined }, 1_000),
    { text: undefined, fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: undefined }, 1_000),
    { text: "Build finished cleanly.", fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 5_000),
    { text: "Build finished cleanly.", fading: false },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 7_500),
    { text: "Build finished cleanly.", fading: true },
  );

  assert.deepEqual(
    resolveReactionBubble({ reactionText: "Build finished cleanly.", reactionExpiresAt: 10_000 }, 10_000),
    { text: undefined, fading: false },
  );
});

test("resolveSpriteFrameState uses a sparse idle sequence with occasional blink", () => {
  assert.deepEqual(resolveSpriteFrameState(0, false, 3), { frameIndex: 0, blink: false });
  assert.deepEqual(resolveSpriteFrameState(4, false, 3), { frameIndex: 1, blink: false });
  assert.deepEqual(resolveSpriteFrameState(8, false, 3), { frameIndex: 0, blink: true });
  assert.deepEqual(resolveSpriteFrameState(11, false, 3), { frameIndex: 2, blink: false });
});

test("resolveSpriteFrameState cycles all frames while animated", () => {
  assert.deepEqual(resolveSpriteFrameState(0, true, 3), { frameIndex: 0, blink: false });
  assert.deepEqual(resolveSpriteFrameState(4, true, 3), { frameIndex: 1, blink: false });
  assert.deepEqual(resolveSpriteFrameState(5, true, 3), { frameIndex: 2, blink: false });
});

test("resolveSpriteFrameState uses the excited cycle during a perk-up pulse", () => {
  assert.deepEqual(resolveSpriteFrameState(2, false, 3, true), { frameIndex: 2, blink: false });
});

test("resolveRenderMode switches between full and narrow layouts by pane width", () => {
  assert.equal(resolveRenderMode(30), "full");
  assert.equal(resolveRenderMode(26), "full");
  assert.equal(resolveRenderMode(22), "narrow");
});
