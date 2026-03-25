import {
  SaveValidationError,
  hydratePersistedSaveGame,
  preparePersistedSaveGameForStorage,
} from "save/codec";
import {
  SAVE_SLOT_IDS,
  buildSaveExportFileName,
  createEmptySaveSlot,
  getSaveSlotNumber,
  toOccupiedSaveSlot,
  type PersistedSaveGame,
  type SaveSlotDiagnostic,
  type SaveSlotId,
  type SaveSlotRecord,
} from "save/types";

import { desktopBridge, type DesktopFileExportResult, type DesktopHostEnvironment } from "./bridge";

interface ResolvedDesktopSlot {
  record: SaveSlotRecord;
  save?: PersistedSaveGame;
}

function stringifyNormalizedSave(save: PersistedSaveGame): string {
  return JSON.stringify(preparePersistedSaveGameForStorage(save), null, 2);
}

function createDiagnostic(level: SaveSlotDiagnostic["level"], message: string): SaveSlotDiagnostic {
  return { level, message };
}

function getReadFailureMessage(
  slotId: SaveSlotId,
  source: "primary" | "backup",
  error: unknown,
): string {
  const reason = error instanceof Error ? error.message : "The save could not be validated.";
  return `Slot ${getSaveSlotNumber(slotId)} ${source} file is unreadable: ${reason}`;
}

function getImportFailureMessage(error: unknown): string {
  if (error instanceof SaveValidationError || error instanceof Error) {
    return error.message;
  }

  return "The selected save file is invalid.";
}

function parseCandidateJson(rawJson: string, slotId: SaveSlotId): PersistedSaveGame {
  const parsed = JSON.parse(rawJson) as unknown;
  const hydrated = hydratePersistedSaveGame(parsed);
  return {
    ...hydrated.save,
    slotId,
  };
}

async function writeNormalizedDesktopSave(save: PersistedSaveGame): Promise<void> {
  await desktopBridge.writeSlotFile(save.slotId, stringifyNormalizedSave(save));
}

async function resolveDesktopSlot(slotId: SaveSlotId): Promise<ResolvedDesktopSlot> {
  const files = await desktopBridge.readSlotFiles(slotId);

  if (!files.primaryJson && !files.backupJson) {
    return {
      record: createEmptySaveSlot(slotId),
    };
  }

  let primarySave: PersistedSaveGame | undefined;
  let primaryError: unknown;
  if (files.primaryJson) {
    try {
      primarySave = parseCandidateJson(files.primaryJson, slotId);
    } catch (error) {
      primaryError = error;
    }
  }

  if (primarySave) {
    const normalized = stringifyNormalizedSave(primarySave);
    if (normalized !== files.primaryJson) {
      await desktopBridge.writeSlotFile(primarySave.slotId, normalized);
    }
    return {
      record: toOccupiedSaveSlot(primarySave),
      save: primarySave,
    };
  }

  let backupSave: PersistedSaveGame | undefined;
  let backupError: unknown;
  if (files.backupJson) {
    try {
      backupSave = parseCandidateJson(files.backupJson, slotId);
    } catch (error) {
      backupError = error;
    }
  }

  if (backupSave) {
    const normalized = stringifyNormalizedSave(backupSave);
    if (normalized !== files.backupJson) {
      await desktopBridge.writeSlotFile(backupSave.slotId, normalized);
    }
    return {
      record: {
        ...toOccupiedSaveSlot(backupSave),
        diagnostic: createDiagnostic(
          "warning",
          primaryError
            ? `Recovered slot ${getSaveSlotNumber(slotId)} from its backup after the primary file failed validation.`
            : `Recovered slot ${getSaveSlotNumber(slotId)} from its backup because the primary file was missing.`,
        ),
      },
      save: backupSave,
    };
  }

  const primaryMessage =
    primaryError !== undefined
      ? getReadFailureMessage(slotId, "primary", primaryError)
      : `Slot ${getSaveSlotNumber(slotId)} is missing its primary save file.`;
  const backupMessage =
    files.backupJson && backupError !== undefined
      ? ` Backup read also failed: ${getImportFailureMessage(backupError)}`
      : "";

  return {
    record: {
      slotId,
      state: "error",
      diagnostic: createDiagnostic("error", `${primaryMessage}${backupMessage}`),
    },
  };
}

export const desktopSave = {
  isAvailable(): boolean {
    return desktopBridge.isAvailable();
  },

  async listSlots(): Promise<SaveSlotRecord[]> {
    return Promise.all(
      SAVE_SLOT_IDS.map((slotId) => resolveDesktopSlot(slotId).then(({ record }) => record)),
    );
  },

  async readSlot(slotId: SaveSlotId): Promise<PersistedSaveGame | undefined> {
    const resolved = await resolveDesktopSlot(slotId);
    if (resolved.record.state === "error") {
      throw new Error(resolved.record.diagnostic.message);
    }

    return resolved.save;
  },

  async readSlotMetadata(slotId: SaveSlotId): Promise<SaveSlotRecord> {
    return (await resolveDesktopSlot(slotId)).record;
  },

  async writeSlot(save: PersistedSaveGame): Promise<void> {
    await writeNormalizedDesktopSave(save);
  },

  async deleteSlot(slotId: SaveSlotId): Promise<void> {
    await desktopBridge.deleteSlotFiles(slotId);
  },

  async exportSlot(slotId: SaveSlotId, destinationPath?: string): Promise<DesktopFileExportResult> {
    const save = await this.readSlot(slotId);

    if (!save) {
      throw new Error(`Save slot ${getSaveSlotNumber(slotId)} is empty.`);
    }

    return desktopBridge.exportJson(
      stringifyNormalizedSave(save),
      buildSaveExportFileName(save),
      destinationPath,
    );
  },

  async importSlot(sourcePath: string | undefined, slotId: SaveSlotId): Promise<void> {
    const imported = await desktopBridge.importJson(sourcePath);
    if (imported.cancelled || !imported.json) {
      return;
    }

    let save: PersistedSaveGame;

    try {
      save = parseCandidateJson(imported.json, slotId);
    } catch (error) {
      throw new Error(getImportFailureMessage(error));
    }

    await writeNormalizedDesktopSave(save);
  },

  async getEnvironment(): Promise<DesktopHostEnvironment> {
    return desktopBridge.getEnvironment();
  },
};
