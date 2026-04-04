import assert from "node:assert/strict";
import test from "node:test";

import {
  BUNDLED_MODEL_SOURCE,
  BUNDLED_COMPANION_TEMPLATES,
  buildBundledCompanionRecord,
  resolveBundledTemplateId,
  selectBundledCompanionTemplate,
  selectReplacementBundledCompanionTemplate,
} from "../src/atlas/bundled.js";
import { SPECIES } from "../src/render/sprites.js";

test("selectBundledCompanionTemplate is deterministic for a user id", () => {
  const first = selectBundledCompanionTemplate("atlas-user");
  const second = selectBundledCompanionTemplate("atlas-user");

  assert.equal(first.id, second.id);
});

test("selectReplacementBundledCompanionTemplate avoids the current bundled species", () => {
  const current = buildBundledCompanionRecord(
    "atlas-rehatch-user",
    selectBundledCompanionTemplate("atlas-rehatch-user"),
  );

  const next = selectReplacementBundledCompanionTemplate("atlas-rehatch-user", current);

  assert.notEqual(next.id, current.templateId);
  assert.notEqual(next.bones.species, current.bones.species);
});

test("resolveBundledTemplateId can recover legacy records by species", () => {
  const current = buildBundledCompanionRecord(
    "atlas-legacy-user",
    selectBundledCompanionTemplate("atlas-legacy-user"),
  );

  const { templateId: _removed, ...legacy } = current;

  assert.equal(resolveBundledTemplateId(legacy), current.templateId);
});

test("buildBundledCompanionRecord marks bundled model source", () => {
  const template = selectBundledCompanionTemplate("atlas-build-user");
  const record = buildBundledCompanionRecord("atlas-build-user", template);

  assert.equal(record.templateId, template.id);
  assert.equal(record.soul.modelUsed, BUNDLED_MODEL_SOURCE);
});

test("bundled atlas stays aligned with the species roster and includes Maltese", () => {
  assert.equal(BUNDLED_COMPANION_TEMPLATES.length, Object.keys(SPECIES).length);
  assert.ok(BUNDLED_COMPANION_TEMPLATES.some((template) => template.bones.species === "maltese"));
});
