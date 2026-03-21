import { advanceWorldTimeSystem } from "./time";
import type { SimSystem, SimSystemContext, SimSystemGroup } from "./types";

const noopSystem: SimSystem = () => {};

export const simSystemSchedule: readonly SimSystemGroup[] = [
  { id: "time", systems: [advanceWorldTimeSystem] },
  { id: "spawning", systems: [noopSystem] },
  { id: "requirements", systems: [noopSystem] },
  { id: "rooms", systems: [noopSystem] },
  { id: "planning", systems: [noopSystem] },
  { id: "needs", systems: [noopSystem] },
  { id: "pathfinding", systems: [noopSystem] },
  { id: "movement", systems: [noopSystem] },
  { id: "raids", systems: [noopSystem] },
  { id: "economy", systems: [noopSystem] },
  { id: "events", systems: [noopSystem] },
  { id: "morale", systems: [noopSystem] },
  { id: "animation", systems: [noopSystem] },
  { id: "rendering", systems: [noopSystem] },
] as const;

export function runSimSystemSchedule(context: SimSystemContext, deltaMs: number): void {
  simSystemSchedule.forEach((group) => {
    group.systems.forEach((system) => system(context, deltaMs));
  });
}

export * from "./types";
