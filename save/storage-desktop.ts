import { desktopSave } from "app/features/desktop";

import type { SaveStorage } from "./storage";

export function createDesktopSaveStorage(): SaveStorage {
  return {
    listSaveSlots() {
      return desktopSave.listSlots();
    },

    readSaveMetadata(slotId) {
      return desktopSave.readSlotMetadata(slotId);
    },

    readSaveGame(slotId) {
      return desktopSave.readSlot(slotId);
    },

    writeSaveGame(save) {
      return desktopSave.writeSlot(save);
    },

    deleteSaveSlot(slotId) {
      return desktopSave.deleteSlot(slotId);
    },
  };
}
