import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  resolveBuddyConfig,
} from "../src/storage/config.js";

test("resolveBuddyConfig applies CLI > env > file > defaults precedence", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-config-"));

  try {
    await writeFile(
      path.join(storageDir, "config.json"),
      JSON.stringify(
        {
          provider: "openai",
          model: "file-model",
          apiKey: "file-key",
          baseUrl: "https://file.example/v1",
          language: "en",
        },
        null,
        2,
      ),
      "utf8",
    );

    const previousEnv = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
    };

    process.env.OPENAI_API_KEY = "env-key";
    process.env.OPENAI_BASE_URL = "https://env.example/v1";
    process.env.OPENAI_MODEL = "env-model";

    const resolved = await resolveBuddyConfig({
      storageDir,
      apiKey: "cli-key",
      baseUrl: "https://cli.example/v1",
      model: "cli-model",
    });

    assert.equal(resolved.provider, "openai");
    assert.equal(resolved.model, "cli-model");
    assert.equal(resolved.apiKey, "cli-key");
    assert.equal(resolved.baseUrl, "https://cli.example/v1");
    assert.equal(resolved.language, "en");

    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("resolveBuddyConfig falls back to DashScope-friendly defaults", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-config-defaults-"));

  const previousEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  delete process.env.DASHSCOPE_API_KEY;

  try {
    const resolved = await resolveBuddyConfig({ storageDir });

    assert.equal(resolved.model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolved.baseUrl, DEFAULT_OPENAI_BASE_URL);
    assert.equal(resolved.apiKey, undefined);
  } finally {
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.DASHSCOPE_API_KEY = previousEnv.DASHSCOPE_API_KEY;
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("resolveBuddyConfig accepts DASHSCOPE_API_KEY as an API key source", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-config-dashscope-"));
  const previousEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  process.env.DASHSCOPE_API_KEY = "dashscope-key";

  try {
    const resolved = await resolveBuddyConfig({ storageDir });
    assert.equal(resolved.apiKey, "dashscope-key");
    assert.equal(resolved.model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolved.baseUrl, DEFAULT_OPENAI_BASE_URL);
  } finally {
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.DASHSCOPE_API_KEY = previousEnv.DASHSCOPE_API_KEY;
    await rm(storageDir, { recursive: true, force: true });
  }
});
