import { desktopSave } from "app/features/desktop";
import {
  buildSaveExportFileName,
  getSaveSlotNumber,
  preparePersistedSaveGameForStorage,
  SAVE_SLOT_IDS,
  saveStorage,
  type SaveSlotDiagnostic,
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
  diagnostic?: SaveSlotDiagnostic;
}

export { getSaveSlotNumber } from "save";

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

    if (record.state === "error") {
      return {
        slotId: record.slotId,
        slotNumber: getSaveSlotNumber(record.slotId),
        state: "error",
        diagnostic: record.diagnostic,
      };
    }

    return {
      slotId: record.slotId,
      slotNumber: getSaveSlotNumber(record.slotId),
      state: "occupied",
      metadata: record.metadata,
      schemaVersion: record.schemaVersion,
      compatibilityVersion: record.compatibilityVersion,
      diagnostic: record.diagnostic,
    };
  });
}

export async function deleteStartScreenSaveSlot(slotId: SaveSlotId): Promise<void> {
  await saveStorage.deleteSaveSlot(slotId);
}

function triggerBrowserSaveDownload(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function canImportStartScreenSaveSlot(): boolean {
  return desktopSave.isAvailable();
}

export async function exportStartScreenSaveSlot(slotId: SaveSlotId): Promise<void> {
  if (desktopSave.isAvailable()) {
    await desktopSave.exportSlot(slotId);
    return;
  }

  const save = await saveStorage.readSaveGame(slotId);
  if (!save) {
    throw new Error(`Save slot ${getSaveSlotNumber(slotId)} is empty.`);
  }

  const prepared = preparePersistedSaveGameForStorage(save);
  triggerBrowserSaveDownload(buildSaveExportFileName(prepared), JSON.stringify(prepared, null, 2));
}

export async function importStartScreenSaveSlot(slotId: SaveSlotId): Promise<void> {
  if (!desktopSave.isAvailable()) {
    throw new Error("Save import is only available inside the Tauri desktop host.");
  }

  await desktopSave.importSlot(undefined, slotId);
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
