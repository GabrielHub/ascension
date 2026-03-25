import { isDesktopHostEnvironment } from "app/features/desktop";

import type { PersistedSaveGame, SaveSlotId, SaveSlotRecord } from "./types";
import { createDesktopSaveStorage } from "./storage-desktop";
import { createWebSaveStorage } from "./storage-web";

export interface SaveStorage {
  listSaveSlots(): Promise<SaveSlotRecord[]>;
  readSaveMetadata(slotId: SaveSlotId): Promise<SaveSlotRecord>;
  readSaveGame(slotId: SaveSlotId): Promise<PersistedSaveGame | undefined>;
  writeSaveGame(save: PersistedSaveGame): Promise<void>;
  deleteSaveSlot(slotId: SaveSlotId): Promise<void>;
}

export function createSaveStorage(): SaveStorage {
  return isDesktopHostEnvironment() ? createDesktopSaveStorage() : createWebSaveStorage();
}

export const saveStorage = createSaveStorage();
