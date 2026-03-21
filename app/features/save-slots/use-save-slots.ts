import { startTransition, useCallback, useEffect, useState } from "react";

import type { SaveSlotId } from "save";

import {
  deleteStartScreenSaveSlot,
  getDefaultStartScreenSlots,
  listStartScreenSaveSlots,
  type StartScreenSaveSlot,
} from "./index";

export interface SaveSlotCollectionState {
  slots: readonly StartScreenSaveSlot[];
  status: "loading" | "ready" | "error";
  errorMessage?: string;
  busySlotId?: SaveSlotId;
  reload(): Promise<void>;
  deleteSlot(slotId: SaveSlotId): Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to access local save slots.";
}

export function useSaveSlots(): SaveSlotCollectionState {
  const [slots, setSlots] = useState<readonly StartScreenSaveSlot[]>(getDefaultStartScreenSlots());
  const [status, setStatus] = useState<SaveSlotCollectionState["status"]>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [busySlotId, setBusySlotId] = useState<SaveSlotId>();

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
      }
    },
    [reload],
  );

  return {
    slots,
    status,
    errorMessage,
    busySlotId,
    reload,
    deleteSlot,
  };
}
