import { WorldTimeState } from "sim/components";

import type { SimSystem } from "./types";

export const advanceWorldTimeSystem: SimSystem = ({ singletonEntities }, deltaMs) => {
  const worldTimeEntity = singletonEntities.time;
  const elapsedMinutes = Math.max(1, Math.floor(deltaMs / 1000));

  WorldTimeState.tick[worldTimeEntity] += 1;
  WorldTimeState.minuteOfDay[worldTimeEntity] += elapsedMinutes;

  while (WorldTimeState.minuteOfDay[worldTimeEntity] >= 1440) {
    WorldTimeState.minuteOfDay[worldTimeEntity] -= 1440;
    WorldTimeState.day[worldTimeEntity] += 1;
  }
};
