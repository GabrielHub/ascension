import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { hydratePersistedSaveGame, preparePersistedSaveGameForStorage } from "./codec";
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
    value: unknown;
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

function isSameMetadataRecord(
  left: OccupiedSaveSlot | undefined,
  right: OccupiedSaveSlot,
): boolean {
  if (!left) {
    return false;
  }

  return (
    left.slotId === right.slotId &&
    left.schemaVersion === right.schemaVersion &&
    left.compatibilityVersion === right.compatibilityVersion &&
    left.metadata.guildName === right.metadata.guildName &&
    left.metadata.createdAt === right.metadata.createdAt &&
    left.metadata.lastPlayedAt === right.metadata.lastPlayedAt
  );
}

async function writeSaveGameRecords(
  database: IDBPDatabase<AscensionSaveDatabase>,
  save: PersistedSaveGame,
): Promise<void> {
  const transaction = database.transaction(["metadata", "saves"], "readwrite");

  await transaction.objectStore("metadata").put(toOccupiedSaveSlot(save), save.slotId);
  await transaction.objectStore("saves").put(save, save.slotId);
  await transaction.done;
}

async function deleteDanglingMetadata(
  database: IDBPDatabase<AscensionSaveDatabase>,
  slotId: SaveSlotId,
): Promise<void> {
  const transaction = database.transaction("metadata", "readwrite");
  await transaction.objectStore("metadata").delete(slotId);
  await transaction.done;
}

async function readNormalizedSaveGame(
  database: IDBPDatabase<AscensionSaveDatabase>,
  slotId: SaveSlotId,
): Promise<PersistedSaveGame | undefined> {
  const storedSave = await database.get("saves", slotId);

  if (storedSave === undefined) {
    const metadata = await database.get("metadata", slotId);

    if (metadata) {
      await deleteDanglingMetadata(database, slotId);
    }

    return undefined;
  }

  const hydrated = hydratePersistedSaveGame(storedSave);
  const normalizedMetadata = toOccupiedSaveSlot(hydrated.save);
  const storedMetadata = await database.get("metadata", slotId);

  if (hydrated.changed || !isSameMetadataRecord(storedMetadata, normalizedMetadata)) {
    await writeSaveGameRecords(database, hydrated.save);
  }

  return hydrated.save;
}

export function createSaveStorage(): SaveStorage {
  return {
    async listSaveSlots() {
      const database = await openSaveDatabase();
      const saves = await Promise.all(
        SAVE_SLOT_IDS.map((slotId) => readNormalizedSaveGame(database, slotId)),
      );

      return SAVE_SLOT_IDS.map((slotId, index) => {
        const save = saves[index];
        return save ? toOccupiedSaveSlot(save) : createEmptySaveSlot(slotId);
      });
    },

    async readSaveMetadata(slotId) {
      const save = await this.readSaveGame(slotId);
      return save ? toOccupiedSaveSlot(save) : createEmptySaveSlot(slotId);
    },

    async readSaveGame(slotId) {
      const database = await openSaveDatabase();
      return readNormalizedSaveGame(database, slotId);
    },

    async writeSaveGame(save) {
      const database = await openSaveDatabase();
      await writeSaveGameRecords(database, preparePersistedSaveGameForStorage(save));
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
