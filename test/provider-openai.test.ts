import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import type { AddressInfo } from "node:net";

import {
  OpenAICompatibleProvider,
  shouldDisableThinking,
} from "../src/soul/providers/openai.js";

test("OpenAICompatibleProvider uses a custom baseUrl and reads message content", async (t) => {
  let receivedAuthorization = "";
  let receivedPath = "";
  let receivedBody = "";

  const server = http.createServer((request, response) => {
    receivedAuthorization = request.headers.authorization ?? "";
    receivedPath = request.url ?? "";

    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      receivedBody = body;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '{"name":"Mocki","personality":"Calm and observant in the terminal."}',
              },
            },
          ],
        }),
      );
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const provider = new OpenAICompatibleProvider({
    apiKey: "test-key",
    model: "qwen3.5-plus",
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    systemPrompt: "Return only one short terminal reaction.",
  });

  const content = await provider.complete("Name this buddy.");

  assert.equal(content, '{"name":"Mocki","personality":"Calm and observant in the terminal."}');
  assert.equal(receivedAuthorization, "Bearer test-key");
  assert.equal(receivedPath, "/v1/chat/completions");

  const payload = JSON.parse(receivedBody) as Record<string, unknown>;
  assert.equal(payload.model, "qwen3.5-plus");
  assert.equal(
    (payload.messages as Array<{ content: string }>)[0]?.content,
    "Return only one short terminal reaction.",
  );
  assert.equal(payload.enable_thinking, undefined);
});

test("OpenAICompatibleProvider disables thinking for DashScope-compatible endpoints", async (t) => {
  let requestBody = "";
  const fetchMock = t.mock.method(globalThis, "fetch", async (_input, init) => {
    requestBody = typeof init?.body === "string" ? init.body : "";
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"shouldSpeak":true,"reaction":"Mock reply."}',
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  });
  const provider = new OpenAICompatibleProvider({
    apiKey: "test-key",
    model: "qwen3.5-plus",
    baseUrl: "https://coding.dashscope.aliyuncs.com/v1",
  });

  await provider.complete("Say something.");

  assert.equal(fetchMock.mock.callCount(), 1);
  const payload = JSON.parse(requestBody) as Record<string, unknown>;
  assert.equal(payload.enable_thinking, false);
});

test("shouldDisableThinking detects DashScope-compatible endpoints", () => {
  assert.equal(shouldDisableThinking("https://coding.dashscope.aliyuncs.com/v1"), true);
  assert.equal(shouldDisableThinking("https://api.openai.com/v1"), false);
});

test("OpenAICompatibleProvider surfaces non-2xx JSON error responses", async (t) => {
  const server = http.createServer((_request, response) => {
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        error: {
          message: "invalid provider key",
        },
      }),
    );
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const provider = new OpenAICompatibleProvider({
    apiKey: "bad-key",
    model: "qwen3.5-plus",
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
  });

  await assert.rejects(
    () => provider.complete("Name this buddy."),
    /invalid provider key/,
  );
});

test("OpenAICompatibleProvider times out stalled upstream requests", async (t) => {
  const server = http.createServer((_request, _response) => {
    // Intentionally never respond.
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  t.after(() => {
    server.close();
  });

  const address = server.address() as AddressInfo;
  const provider = new OpenAICompatibleProvider({
    apiKey: "test-key",
    model: "qwen3.5-plus",
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    requestTimeoutMs: 50,
  });

  await assert.rejects(
    () => provider.complete("Name this buddy."),
    /timed out/,
  );
});
