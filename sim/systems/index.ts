import { applySimCommand } from "./commands";
import { refreshBuildingAuthoritySystem } from "./building-progression";
import { reconcileAssignmentsSystem } from "./assignment";
import { advanceEconomySystem } from "./economy";
import { advanceEventPressureSystem } from "./events";
import { advanceMoraleSystem } from "./morale";
import { advanceNeedsSystem } from "./needs";
import { resolveRaidSystem } from "./raids";
import { updateRoomOperationsSystem } from "./room-operations";
import { advanceWorldTimeSystem } from "./time";
import { advanceVisitorPoolSystem } from "./visitors";
import type { SimSystem, SimSystemContext, SimSystemGroup } from "./types";

const noopSystem: SimSystem = () => {};

export const simSystemSchedule: readonly SimSystemGroup[] = [
  { id: "time", systems: [advanceWorldTimeSystem] },
  { id: "spawning", systems: [advanceVisitorPoolSystem] },
  { id: "requirements", systems: [refreshBuildingAuthoritySystem] },
  { id: "rooms", systems: [updateRoomOperationsSystem] },
  { id: "planning", systems: [reconcileAssignmentsSystem] },
  { id: "needs", systems: [advanceNeedsSystem] },
  { id: "pathfinding", systems: [noopSystem] },
  { id: "movement", systems: [noopSystem] },
  { id: "raids", systems: [resolveRaidSystem] },
  { id: "economy", systems: [advanceEconomySystem] },
  { id: "events", systems: [advanceEventPressureSystem] },
  { id: "morale", systems: [advanceMoraleSystem] },
  { id: "animation", systems: [noopSystem] },
  { id: "rendering", systems: [noopSystem] },
] as const;

export function runSimCommand(
  context: SimSystemContext,
  command: import("../commands").SimCommand,
) {
  applySimCommand(context, command);
}

export function runSimSystemSchedule(context: SimSystemContext, deltaMs: number): void {
  simSystemSchedule.forEach((group) => {
    group.systems.forEach((system) => system(context, deltaMs));
  });
}

export * from "./raids";
export * from "./types";
