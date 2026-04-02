import assert from "node:assert/strict";
import test from "node:test";

import { renderZshInitScript } from "../src/cli/init.js";

test("renderZshInitScript includes tmux guard, sidecar guard, attach, and hook registration", () => {
  const script = renderZshInitScript();

  assert.match(script, /EVERYBUDDY_SIDECAR/);
  assert.match(script, /attach --quiet/);
  assert.match(script, /add-zle-hook-widget/);
  assert.match(script, /line-pre-redraw/);
  assert.match(script, /preexec_functions/);
  assert.match(script, /precmd_functions/);
  assert.match(script, /event input_update/);
  assert.match(script, /event command_start/);
  assert.match(script, /event command_end/);
  assert.match(script, /event pane_active/);
  assert.match(script, /\$\{preexec_functions\[\(Ie\)_everybuddy_preexec\]\}/);
  assert.match(script, /\$\{precmd_functions\[\(Ie\)_everybuddy_precmd\]\}/);
});
