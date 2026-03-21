import { soa } from "bitecs";

export const WorldTimeState = soa({
  tick: [] as number[],
  day: [] as number[],
  minuteOfDay: [] as number[],
});
