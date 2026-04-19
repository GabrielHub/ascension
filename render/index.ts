import type { RaidWorldSnapshot } from "./types";
import { createDefaultEffects } from "./world-effects";

export * from "./camera";
export * from "./actor-tokens";
export * from "./hq-world";
export * from "./navigation";
export * from "./operator-detail-svg";
export * from "./svg-parts";
export * from "./types";
export * from "./world-canvas";
export * from "./world-effects";

export function buildRaidWorldSnapshot(
  dungeonName: string,
  contractSiteId: string,
  dungeonWidth: number,
  dungeonHeight: number,
  teams: RaidWorldSnapshot["teams"],
  enemies: RaidWorldSnapshot["enemies"],
  features: RaidWorldSnapshot["features"],
  fogMask: RaidWorldSnapshot["fogMask"],
): RaidWorldSnapshot {
  return {
    dungeonName,
    contractSiteId,
    dungeonWidth,
    dungeonHeight,
    teams,
    enemies,
    features,
    fogMask,
    effects: createDefaultEffects(),
    focus: null,
  };
}
