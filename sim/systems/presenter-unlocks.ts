import type { TemplateRegistry } from "content/templates";

import { WorldTimeState } from "../components";
import type { PresenterUnlockState, SimSystemContext } from "./types";

export const MARA_PRESENTER_ID = "presenter/assistant";

export function getPresenterIdUnlockedByRoom(
  registry: TemplateRegistry,
  roomTemplateId: string,
): string | null {
  for (const presenter of registry.presenters) {
    if (presenter.unlockFromRoomTemplateId === roomTemplateId) {
      return presenter.id;
    }
  }
  return null;
}

export function isPresenterUnlocked(
  unlocks: readonly PresenterUnlockState[],
  presenterId: string,
): boolean {
  return unlocks.some((entry) => entry.presenterId === presenterId);
}

export function getVisiblePresenterIds(
  registry: TemplateRegistry,
  unlocks: readonly PresenterUnlockState[],
  placedRoomTemplateIds: ReadonlySet<string>,
): readonly string[] {
  const visible: string[] = [];
  for (const unlock of unlocks) {
    const presenter = registry.presenterById.get(unlock.presenterId);
    if (!presenter) {
      continue;
    }
    const hasAllowedRoom = presenter.allowedRoomTemplateIds.some((id) =>
      placedRoomTemplateIds.has(id),
    );
    if (hasAllowedRoom) {
      visible.push(presenter.id);
    }
  }
  return visible;
}

export function unlockPresenterForRoomTemplate(
  context: SimSystemContext,
  roomTemplateId: string,
): string | null {
  const presenterId = getPresenterIdUnlockedByRoom(context.registry, roomTemplateId);
  if (!presenterId) {
    return null;
  }
  if (isPresenterUnlocked(context.runtimeState.presenterUnlocks, presenterId)) {
    return null;
  }
  const timeEntity = context.singletonEntities.time;
  const tick = WorldTimeState.tick[timeEntity] ?? 0;
  const day = WorldTimeState.day[timeEntity] ?? 1;
  context.runtimeState.presenterUnlocks.push({
    presenterId,
    unlockedAtTick: tick,
    unlockedAtDay: day,
  });
  return presenterId;
}

export function seedStartingPresenterUnlocks(): PresenterUnlockState[] {
  return [
    {
      presenterId: MARA_PRESENTER_ID,
      unlockedAtTick: 0,
      unlockedAtDay: 1,
    },
  ];
}
