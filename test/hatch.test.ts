import assert from "node:assert/strict";
import test from "node:test";

import { parseHatchResponse } from "../src/soul/hatch.js";

test("parseHatchResponse accepts raw JSON", () => {
  const parsed = parseHatchResponse('{"name":"Mochi","personality":"Quick-witted and mildly chaotic.","observerProfile":{"voice":"playful","chattiness":4,"sharpness":4,"patience":2}}');

  assert.equal(parsed.name, "Mochi");
  assert.equal(parsed.personality, "Quick-witted and mildly chaotic.");
  assert.equal(parsed.observerProfile.voice, "playful");
});

test("parseHatchResponse accepts fenced JSON", () => {
  const parsed = parseHatchResponse(
    '```json\n{"name":"Nova","personality":"沉稳、机敏，而且会盯着你的 peak stat 不放。","observerProfile":{"voice":"quiet","chattiness":1,"sharpness":2,"patience":5}}\n```',
  );

  assert.equal(parsed.name, "Nova");
  assert.equal(parsed.personality, "沉稳、机敏，而且会盯着你的 peak stat 不放。");
  assert.equal(parsed.observerProfile.voice, "quiet");
});

test("parseHatchResponse rejects invalid JSON", () => {
  assert.throws(() => parseHatchResponse("not json"), /Unexpected token|JSON/i);
});

test("parseHatchResponse rejects missing fields and oversized values", () => {
  assert.throws(
    () =>
      parseHatchResponse(
        '{"name":"","personality":"ok","observerProfile":{"voice":"dry","chattiness":3,"sharpness":3,"patience":3}}',
      ),
    /name/,
  );
  assert.throws(
    () =>
      parseHatchResponse(
        `{"name":"Valid","personality":"${"x".repeat(301)}","observerProfile":{"voice":"dry","chattiness":3,"sharpness":3,"patience":3}}`,
      ),
    /personality/,
  );
  assert.throws(
    () =>
      parseHatchResponse(
        '{"name":"Valid","personality":"ok","observerProfile":{"voice":"loud","chattiness":3,"sharpness":3,"patience":3}}',
      ),
    /voice/,
  );
});
