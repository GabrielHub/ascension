import { useCallback, useState } from "react";

import {
  DEFAULT_GAME_SETTINGS,
  normalizeGameSettings,
  readGameSettings,
  writeGameSettings,
  type GameSettings,
} from "./storage";

export interface GameSettingsState {
  settings: GameSettings;
  updateSettings(
    nextSettings: GameSettings | ((currentSettings: GameSettings) => GameSettings),
  ): void;
  resetSettings(): void;
}

export function useGameSettings(): GameSettingsState {
  const [settings, setSettings] = useState<GameSettings>(() => readGameSettings());

  const updateSettings = useCallback(
    (nextSettings: GameSettings | ((currentSettings: GameSettings) => GameSettings)) => {
      setSettings((currentSettings) => {
        const resolvedSettings =
          typeof nextSettings === "function" ? nextSettings(currentSettings) : nextSettings;
        const normalizedSettings = normalizeGameSettings(resolvedSettings);
        writeGameSettings(normalizedSettings);
        return normalizedSettings;
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_GAME_SETTINGS);
    writeGameSettings(DEFAULT_GAME_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
