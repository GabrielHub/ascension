import type { SimSystemContext } from "./types";
import { seedFromKey } from "../uncertainty";

export function getSimulationSeed(context: SimSystemContext): number {
  return context.runtimeState.simulationSeed ?? 0;
}

export function seedFromSimulationKey(context: SimSystemContext, key: string): number {
  return seedFromKey(`${getSimulationSeed(context)}:${key}`);
}
