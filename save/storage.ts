import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import {
  SAVE_SLOT_IDS,
  createEmptySaveSlot,
  toOccupiedSaveSlot,
  type OccupiedSaveSlot,
  type PersistedSaveGame,
  type SaveSlotId,
  type SaveSlotRecord,
} from "./types";

const SAVE_DATABASE_NAME = "ascension-save-storage";
const SAVE_DATABASE_VERSION = 1;

interface SaveMetadataRecord extends OccupiedSaveSlot {}

interface AscensionSaveDatabase extends DBSchema {
  metadata: {
    key: SaveSlotId;
    value: SaveMetadataRecord;
  };
  saves: {
    key: SaveSlotId;
    value: PersistedSaveGame;
  };
}

async function openSaveDatabase(): Promise<IDBPDatabase<AscensionSaveDatabase>> {
  return openDB<AscensionSaveDatabase>(SAVE_DATABASE_NAME, SAVE_DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains("metadata")) {
        database.createObjectStore("metadata");
      }

      if (!database.objectStoreNames.contains("saves")) {
        database.createObjectStore("saves");
      }
    },
  });
}

export interface SaveStorage {
  listSaveSlots(): Promise<SaveSlotRecord[]>;
  readSaveMetadata(slotId: SaveSlotId): Promise<SaveSlotRecord>;
  readSaveGame(slotId: SaveSlotId): Promise<PersistedSaveGame | undefined>;
  writeSaveGame(save: PersistedSaveGame): Promise<void>;
  deleteSaveSlot(slotId: SaveSlotId): Promise<void>;
}

export function createSaveStorage(): SaveStorage {
  return {
    async listSaveSlots() {
      const database = await openSaveDatabase();
      const metadata = await database.getAll("metadata");
      const metadataBySlot = new Map(metadata.map((record) => [record.slotId, record]));

      return SAVE_SLOT_IDS.map(
        (slotId) => metadataBySlot.get(slotId) ?? createEmptySaveSlot(slotId),
      );
    },

    async readSaveMetadata(slotId) {
      const database = await openSaveDatabase();
      const record = await database.get("metadata", slotId);

      return record ?? createEmptySaveSlot(slotId);
    },

    async readSaveGame(slotId) {
      const database = await openSaveDatabase();
      return database.get("saves", slotId);
    },

    async writeSaveGame(save) {
      const database = await openSaveDatabase();
      const transaction = database.transaction(["metadata", "saves"], "readwrite");

      await transaction.objectStore("metadata").put(toOccupiedSaveSlot(save));
      await transaction.objectStore("saves").put(save);
      await transaction.done;
    },

    async deleteSaveSlot(slotId) {
      const database = await openSaveDatabase();
      const transaction = database.transaction(["metadata", "saves"], "readwrite");

      await transaction.objectStore("metadata").delete(slotId);
      await transaction.objectStore("saves").delete(slotId);
      await transaction.done;
    },
  };
}

export const saveStorage = createSaveStorage();
