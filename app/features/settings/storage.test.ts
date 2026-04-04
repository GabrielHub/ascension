import { describe, expect, it } from "vitest";

import {
  DEFAULT_AI_SETTINGS,
  DEFAULT_GAME_SETTINGS,
  GAME_SETTINGS_STORAGE_KEY,
  normalizeGameSettings,
  readGameSettings,
  writeGameSettings,
} from "./storage";

function createStorage() {
  const records = new Map<string, string>();

  return {
    getItem(key: string) {
      return records.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      records.set(key, value);
    },
  };
}

describe("game settings storage", () => {
  it("normalizes invalid settings payloads back to defaults", () => {
    expect(
      normalizeGameSettings({
        audio: {
          sfxVolumeDb: "loud",
          musicVolumeDb: 999,
        },
        wakeLockEnabled: "yes",
        tutorialEventsEnabled: "no",
      }),
    ).toEqual({
      audio: {
        sfxVolumeDb: DEFAULT_GAME_SETTINGS.audio.sfxVolumeDb,
        musicVolumeDb: 0,
      },
      wakeLockEnabled: DEFAULT_GAME_SETTINGS.wakeLockEnabled,
      tutorialEventsEnabled: DEFAULT_GAME_SETTINGS.tutorialEventsEnabled,
      ai: DEFAULT_AI_SETTINGS,
    });
  });

  it("round-trips persisted settings through storage", () => {
    const storage = createStorage();

    writeGameSettings(
      {
        audio: {
          sfxVolumeDb: -14,
          musicVolumeDb: -20,
        },
        wakeLockEnabled: false,
        tutorialEventsEnabled: false,
        ai: {
          enabled: true,
          runtimeKind: "lm-studio",
          baseUrl: "http://localhost:1234/v1",
          modelId: "qwen3",
        },
      },
      storage,
    );

    expect(storage.getItem(GAME_SETTINGS_STORAGE_KEY)).toBeTruthy();
    expect(readGameSettings(storage)).toEqual({
      audio: {
        sfxVolumeDb: -14,
        musicVolumeDb: -20,
      },
      wakeLockEnabled: false,
      tutorialEventsEnabled: false,
      ai: {
        enabled: true,
        runtimeKind: "lm-studio",
        baseUrl: "http://localhost:1234/v1",
        modelId: "qwen3",
      },
    });
  });

  it("normalizes missing AI block to safe defaults", () => {
    const result = normalizeGameSettings({ audio: {} });
    expect(result.ai).toEqual(DEFAULT_AI_SETTINGS);
    expect(result.ai.enabled).toBe(false);
  });

  it("normalizes invalid AI runtime kind to ollama", () => {
    const result = normalizeGameSettings({
      ai: { runtimeKind: "invalid-runtime", enabled: true },
    });
    expect(result.ai.runtimeKind).toBe("ollama");
    expect(result.ai.enabled).toBe(true);
  });

  it("normalizes invalid AI base URL to default", () => {
    const result = normalizeGameSettings({ ai: { baseUrl: "" } });
    expect(result.ai.baseUrl).toBe(DEFAULT_AI_SETTINGS.baseUrl);
  });

  it("normalizes invalid AI model ID to default", () => {
    const result = normalizeGameSettings({ ai: { modelId: 42 } });
    expect(result.ai.modelId).toBe(DEFAULT_AI_SETTINGS.modelId);
  });

  it("defaults the local Ollama profile to the Gemma 4 26b model", () => {
    expect(DEFAULT_AI_SETTINGS.modelId).toBe("gemma4:26b");
  });

  it("preserves valid AI settings through normalization", () => {
    const ai = {
      enabled: true,
      runtimeKind: "llama-cpp" as const,
      baseUrl: "http://127.0.0.1:8080/v1",
      modelId: "mistral-7b",
    };
    const result = normalizeGameSettings({ ai });
    expect(result.ai).toEqual(ai);
  });
});
