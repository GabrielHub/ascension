import {
  SAVE_SLOT_IDS,
  saveStorage,
  type SaveSlotId,
  type SaveSlotMetadata,
  type SaveSlotRecord,
} from "save";

export interface StartScreenSaveSlot {
  slotId: SaveSlotId;
  slotNumber: number;
  state: SaveSlotRecord["state"];
  metadata?: SaveSlotMetadata;
  schemaVersion?: number;
  compatibilityVersion?: string;
}

export function getSaveSlotNumber(slotId: SaveSlotId): number {
  return SAVE_SLOT_IDS.indexOf(slotId) + 1;
}

export function getDefaultStartScreenSlots(): StartScreenSaveSlot[] {
  return SAVE_SLOT_IDS.map((slotId) => ({
    slotId,
    slotNumber: getSaveSlotNumber(slotId),
    state: "empty",
  }));
}

export async function listStartScreenSaveSlots(): Promise<StartScreenSaveSlot[]> {
  const records = await saveStorage.listSaveSlots();

  return records.map((record) => {
    if (record.state === "empty") {
      return {
        slotId: record.slotId,
        slotNumber: getSaveSlotNumber(record.slotId),
        state: "empty",
      };
    }

    return {
      slotId: record.slotId,
      slotNumber: getSaveSlotNumber(record.slotId),
      state: "occupied",
      metadata: record.metadata,
      schemaVersion: record.schemaVersion,
      compatibilityVersion: record.compatibilityVersion,
    };
  });
}

export async function deleteStartScreenSaveSlot(slotId: SaveSlotId): Promise<void> {
  await saveStorage.deleteSaveSlot(slotId);
}

export function formatSaveSlotTimestamp(value: string | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}
