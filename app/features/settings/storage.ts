export type AiRuntimeKind = "ollama" | "lm-studio" | "llama-cpp";

export interface AiSettings {
  enabled: boolean;
  runtimeKind: AiRuntimeKind;
  baseUrl: string;
  modelId: string;
}

export interface GameSettings {
  audio: {
    sfxVolumeDb: number;
    musicVolumeDb: number;
  };
  wakeLockEnabled: boolean;
  tutorialEventsEnabled: boolean;
  ai: AiSettings;
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

const VALID_AI_RUNTIME_KINDS: ReadonlySet<string> = new Set<AiRuntimeKind>([
  "ollama",
  "lm-studio",
  "llama-cpp",
]);
export const RUNTIME_DEFAULT_URLS: Record<AiRuntimeKind, string> = {
  ollama: "http://127.0.0.1:11434/v1",
  "lm-studio": "http://127.0.0.1:1234/v1",
  "llama-cpp": "http://127.0.0.1:8080/v1",
};

export const DEFAULT_AI_BASE_URL = RUNTIME_DEFAULT_URLS.ollama;
export const DEFAULT_AI_MODEL_ID = "gemma4:26b";

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  runtimeKind: "ollama",
  baseUrl: DEFAULT_AI_BASE_URL,
  modelId: DEFAULT_AI_MODEL_ID,
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  audio: {
    sfxVolumeDb: DEFAULT_SFX_VOLUME_DB,
    musicVolumeDb: DEFAULT_MUSIC_VOLUME_DB,
  },
  wakeLockEnabled: true,
  tutorialEventsEnabled: true,
  ai: DEFAULT_AI_SETTINGS,
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

function normalizeAiSettings(input: unknown): AiSettings {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    enabled: typeof record.enabled === "boolean" ? record.enabled : DEFAULT_AI_SETTINGS.enabled,
    runtimeKind:
      typeof record.runtimeKind === "string" && VALID_AI_RUNTIME_KINDS.has(record.runtimeKind)
        ? (record.runtimeKind as AiRuntimeKind)
        : DEFAULT_AI_SETTINGS.runtimeKind,
    baseUrl:
      typeof record.baseUrl === "string" && record.baseUrl.trim().length > 0
        ? record.baseUrl.trim()
        : DEFAULT_AI_SETTINGS.baseUrl,
    modelId:
      typeof record.modelId === "string" && record.modelId.trim().length > 0
        ? record.modelId.trim()
        : DEFAULT_AI_SETTINGS.modelId,
  };
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
    tutorialEventsEnabled:
      typeof record.tutorialEventsEnabled === "boolean"
        ? record.tutorialEventsEnabled
        : DEFAULT_GAME_SETTINGS.tutorialEventsEnabled,
    ai: normalizeAiSettings(record.ai),
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
