export interface GameSettings {
  audio: {
    sfxVolumeDb: number;
    musicVolumeDb: number;
  };
  wakeLockEnabled: boolean;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const GAME_SETTINGS_STORAGE_KEY = "ascension.game-settings.v1";
export const DEFAULT_SFX_VOLUME_DB = -6;
export const DEFAULT_MUSIC_VOLUME_DB = -12;
export const MIN_VOLUME_DB = -40;
export const MAX_VOLUME_DB = 0;

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  audio: {
    sfxVolumeDb: DEFAULT_SFX_VOLUME_DB,
    musicVolumeDb: DEFAULT_MUSIC_VOLUME_DB,
  },
  wakeLockEnabled: true,
};

function getStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function clampVolumeDb(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(MIN_VOLUME_DB, Math.min(MAX_VOLUME_DB, Math.round(value)));
}

export function normalizeGameSettings(input: unknown): GameSettings {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const audioRecord =
    record.audio && typeof record.audio === "object"
      ? (record.audio as Record<string, unknown>)
      : {};

  return {
    audio: {
      sfxVolumeDb: clampVolumeDb(audioRecord.sfxVolumeDb, DEFAULT_SFX_VOLUME_DB),
      musicVolumeDb: clampVolumeDb(audioRecord.musicVolumeDb, DEFAULT_MUSIC_VOLUME_DB),
    },
    wakeLockEnabled:
      typeof record.wakeLockEnabled === "boolean"
        ? record.wakeLockEnabled
        : DEFAULT_GAME_SETTINGS.wakeLockEnabled,
  };
}

export function readGameSettings(storage?: StorageLike): GameSettings {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return DEFAULT_GAME_SETTINGS;
  }

  try {
    const raw = resolvedStorage.getItem(GAME_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GAME_SETTINGS;
    }

    return normalizeGameSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

export function writeGameSettings(settings: GameSettings, storage?: StorageLike): void {
  const resolvedStorage = getStorage(storage);
  if (!resolvedStorage) {
    return;
  }

  try {
    resolvedStorage.setItem(
      GAME_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeGameSettings(settings)),
    );
  } catch {
    // Ignore local persistence failures and keep the in-memory settings usable.
  }
}
