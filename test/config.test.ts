import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_OBSERVER_MODEL,
  PROVIDER_DEFAULTS,
  readBuddyConfigFile,
  resolveBuddyConfig,
  updateBuddyConfigFile,
  writeBuddyConfigFile,
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
      OPENAI_OBSERVER_MODEL: process.env.OPENAI_OBSERVER_MODEL,
    };

    process.env.OPENAI_API_KEY = "env-key";
    process.env.OPENAI_BASE_URL = "https://env.example/v1";
    process.env.OPENAI_MODEL = "env-model";
    process.env.OPENAI_OBSERVER_MODEL = "env-observer-model";

    const resolved = await resolveBuddyConfig({
      storageDir,
      apiKey: "cli-key",
      baseUrl: "https://cli.example/v1",
      model: "cli-model",
    });

    assert.equal(resolved.provider, "openai");
    assert.equal(resolved.model, "cli-model");
    assert.equal(resolved.observerModel, "env-observer-model");
    assert.equal(resolved.apiKey, "cli-key");
    assert.equal(resolved.baseUrl, "https://cli.example/v1");
    assert.equal(resolved.language, "en");

    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.OPENAI_OBSERVER_MODEL = previousEnv.OPENAI_OBSERVER_MODEL;
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
    OPENAI_OBSERVER_MODEL: process.env.OPENAI_OBSERVER_MODEL,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  delete process.env.OPENAI_OBSERVER_MODEL;
  delete process.env.DASHSCOPE_API_KEY;

  try {
    const resolved = await resolveBuddyConfig({ storageDir });

    assert.equal(resolved.model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolved.observerModel, DEFAULT_OPENAI_OBSERVER_MODEL);
    assert.equal(resolved.baseUrl, DEFAULT_OPENAI_BASE_URL);
    assert.equal(resolved.apiKey, undefined);
  } finally {
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.OPENAI_OBSERVER_MODEL = previousEnv.OPENAI_OBSERVER_MODEL;
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
    OPENAI_OBSERVER_MODEL: process.env.OPENAI_OBSERVER_MODEL,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
  };

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  delete process.env.OPENAI_OBSERVER_MODEL;
  process.env.DASHSCOPE_API_KEY = "dashscope-key";

  try {
    const resolved = await resolveBuddyConfig({ storageDir });
    assert.equal(resolved.apiKey, "dashscope-key");
    assert.equal(resolved.model, DEFAULT_OPENAI_MODEL);
    assert.equal(resolved.observerModel, DEFAULT_OPENAI_OBSERVER_MODEL);
    assert.equal(resolved.baseUrl, DEFAULT_OPENAI_BASE_URL);
  } finally {
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.OPENAI_OBSERVER_MODEL = previousEnv.OPENAI_OBSERVER_MODEL;
    process.env.DASHSCOPE_API_KEY = previousEnv.DASHSCOPE_API_KEY;
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("resolveBuddyConfig detects the anthropic provider from ANTHROPIC_API_KEY", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-config-anthropic-"));
  const previousEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_OBSERVER_MODEL: process.env.OPENAI_OBSERVER_MODEL,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    BUDDY_PROVIDER: process.env.BUDDY_PROVIDER,
  };

  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;
  delete process.env.OPENAI_OBSERVER_MODEL;
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.BUDDY_PROVIDER;
  process.env.ANTHROPIC_API_KEY = "anthropic-key";

  try {
    const resolved = await resolveBuddyConfig({ storageDir });
    assert.equal(resolved.provider, "anthropic");
    assert.equal(resolved.apiKey, "anthropic-key");
    assert.equal(resolved.model, PROVIDER_DEFAULTS.anthropic.model);
    assert.equal(resolved.observerModel, PROVIDER_DEFAULTS.anthropic.observerModel);
    assert.equal(resolved.baseUrl, PROVIDER_DEFAULTS.anthropic.baseUrl);
  } finally {
    process.env.OPENAI_API_KEY = previousEnv.OPENAI_API_KEY;
    process.env.OPENAI_BASE_URL = previousEnv.OPENAI_BASE_URL;
    process.env.OPENAI_MODEL = previousEnv.OPENAI_MODEL;
    process.env.OPENAI_OBSERVER_MODEL = previousEnv.OPENAI_OBSERVER_MODEL;
    process.env.DASHSCOPE_API_KEY = previousEnv.DASHSCOPE_API_KEY;
    process.env.ANTHROPIC_API_KEY = previousEnv.ANTHROPIC_API_KEY;
    process.env.BUDDY_PROVIDER = previousEnv.BUDDY_PROVIDER;
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("writeBuddyConfigFile and updateBuddyConfigFile persist config atomically", async () => {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "everybuddy-config-write-"));

  try {
    await writeBuddyConfigFile(
      {
        provider: "openai",
        model: "initial-model",
        observerModel: "observer-fast",
        apiKey: "initial-key",
        baseUrl: "https://initial.example/v1",
        language: "zh",
      },
      storageDir,
    );

    const initial = await readBuddyConfigFile(storageDir);
    assert.deepEqual(initial, {
      provider: "openai",
      model: "initial-model",
      observerModel: "observer-fast",
      apiKey: "initial-key",
      baseUrl: "https://initial.example/v1",
      language: "zh",
    });

    const updated = await updateBuddyConfigFile(
      {
        apiKey: "rotated-key",
        language: "en",
      },
      storageDir,
    );

    assert.deepEqual(updated, {
      provider: "openai",
      model: "initial-model",
      observerModel: "observer-fast",
      apiKey: "rotated-key",
      baseUrl: "https://initial.example/v1",
      language: "en",
    });
    assert.deepEqual(await readBuddyConfigFile(storageDir), updated);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});
