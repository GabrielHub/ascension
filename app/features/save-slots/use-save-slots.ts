import { startTransition, useCallback, useEffect, useState } from "react";

import type { SaveSlotId } from "save";

import {
  canImportStartScreenSaveSlot,
  deleteStartScreenSaveSlot,
  exportStartScreenSaveSlot,
  getDefaultStartScreenSlots,
  importStartScreenSaveSlot,
  listStartScreenSaveSlots,
  type StartScreenSaveSlot,
} from "./index";

export interface SaveSlotCollectionState {
  slots: readonly StartScreenSaveSlot[];
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  busySlotId?: SaveSlotId;
  busyAction?: "delete" | "export" | "import";
  canImport: boolean;
  reload(): Promise<void>;
  deleteSlot(slotId: SaveSlotId): Promise<void>;
  exportSlot(slotId: SaveSlotId): Promise<void>;
  importSlot(slotId: SaveSlotId): Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to access local save slots.";
}

export function useSaveSlots(): SaveSlotCollectionState {
  const [slots, setSlots] = useState<readonly StartScreenSaveSlot[]>(getDefaultStartScreenSlots());
  const [status, setStatus] = useState<SaveSlotCollectionState["status"]>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busySlotId, setBusySlotId] = useState<SaveSlotId>();
  const [busyAction, setBusyAction] = useState<SaveSlotCollectionState["busyAction"]>();
  const [canImport] = useState(canImportStartScreenSaveSlot);

  const reload = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(undefined);

    try {
      const nextSlots = await listStartScreenSaveSlots();

      startTransition(() => {
        setSlots(nextSlots);
        setStatus("ready");
      });
    } catch (error) {
      startTransition(() => {
        setSlots(getDefaultStartScreenSlots());
        setStatus("error");
        setErrorMessage(getErrorMessage(error));
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const deleteSlot = useCallback(
    async (slotId: SaveSlotId) => {
      setBusySlotId(slotId);
      setBusyAction("delete");
      setErrorMessage(undefined);

      try {
        await deleteStartScreenSaveSlot(slotId);
        await reload();
      } catch (error) {
        startTransition(() => {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        });
      } finally {
        setBusySlotId(undefined);
        setBusyAction(undefined);
      }
    },
    [reload],
  );

  const exportSlot = useCallback(async (slotId: SaveSlotId) => {
    setBusySlotId(slotId);
    setBusyAction("export");
    setErrorMessage(undefined);

    try {
      await exportStartScreenSaveSlot(slotId);
    } catch (error) {
      startTransition(() => {
        setStatus("error");
        setErrorMessage(getErrorMessage(error));
      });
    } finally {
      setBusySlotId(undefined);
      setBusyAction(undefined);
    }
  }, []);

  const importSlot = useCallback(
    async (slotId: SaveSlotId) => {
      setBusySlotId(slotId);
      setBusyAction("import");
      setErrorMessage(undefined);

      try {
        await importStartScreenSaveSlot(slotId);
        await reload();
      } catch (error) {
        startTransition(() => {
          setStatus("error");
          setErrorMessage(getErrorMessage(error));
        });
      } finally {
        setBusySlotId(undefined);
        setBusyAction(undefined);
      }
    },
    [reload],
  );

  return {
    slots,
    status,
    errorMessage,
    busySlotId,
    busyAction,
    canImport,
    reload,
    deleteSlot,
    exportSlot,
    importSlot,
  };
}
