import { describe, expect, it } from "vitest";

import {
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
    });
  });
});
