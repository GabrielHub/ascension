import { buildGameShellHref } from "app/features/runtime";
import {
  deleteStartScreenSaveSlot,
  exportStartScreenSaveSlot,
  importStartScreenSaveSlot,
  listStartScreenSaveSlots,
} from "app/features/save-slots";
import type { SaveSlotId } from "save";

import { desktopSave } from "./save-client";
import { isDesktopHostEnvironment } from "./environment";

declare global {
  interface Window {
    __ASCENSION_DESKTOP_TEST__?: {
      deleteSlot(slotId: SaveSlotId): Promise<void>;
      enterSandbox(): Promise<void>;
      exportSlot(slotId: SaveSlotId, destinationPath?: string): Promise<void>;
      getEnvironment(): Promise<Awaited<ReturnType<typeof desktopSave.getEnvironment>>>;
      importSlot(slotId: SaveSlotId, sourcePath?: string): Promise<void>;
      listSlots(): Promise<Awaited<ReturnType<typeof listStartScreenSaveSlots>>>;
      loadGame(slotId: SaveSlotId): Promise<void>;
      newGame(slotId: SaveSlotId): Promise<void>;
    };
  }
}

function navigateTo(path: string): void {
  window.location.assign(path);
}

function installDesktopTestDriver(): boolean {
  if (
    typeof window === "undefined" ||
    !isDesktopHostEnvironment() ||
    window.__ASCENSION_DESKTOP_TEST__
  ) {
    return false;
  }

  window.__ASCENSION_DESKTOP_TEST__ = {
    async deleteSlot(slotId) {
      await deleteStartScreenSaveSlot(slotId);
    },
    async enterSandbox() {
      navigateTo(buildGameShellHref({ mode: "preview" }));
    },
    async exportSlot(slotId, destinationPath) {
      if (desktopSave.isAvailable()) {
        await desktopSave.exportSlot(slotId, destinationPath);
        return;
      }

      await exportStartScreenSaveSlot(slotId);
    },
    async getEnvironment() {
      return desktopSave.getEnvironment();
    },
    async importSlot(slotId, sourcePath) {
      if (desktopSave.isAvailable()) {
        await desktopSave.importSlot(sourcePath, slotId);
        return;
      }

      await importStartScreenSaveSlot(slotId);
    },
    async listSlots() {
      return listStartScreenSaveSlots();
    },
    async loadGame(slotId) {
      navigateTo(buildGameShellHref({ mode: "load", slotId }));
    },
    async newGame(slotId) {
      navigateTo(buildGameShellHref({ mode: "new", slotId }));
    },
  };

  return true;
}

export function registerDesktopTestDriver(): void {
  if (typeof window === "undefined" || installDesktopTestDriver()) {
    return;
  }

  const registrationWindow = 15_000;
  const startedAt = Date.now();
  const intervalId = window.setInterval(() => {
    if (installDesktopTestDriver() || Date.now() - startedAt >= registrationWindow) {
      window.clearInterval(intervalId);
    }
  }, 100);

  window.addEventListener(
    "pagehide",
    () => {
      window.clearInterval(intervalId);
    },
    { once: true },
  );
}
