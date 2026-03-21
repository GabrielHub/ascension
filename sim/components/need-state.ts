import { soa } from "bitecs";

export const NeedState = soa({
  hunger: [] as number[],
  fatigue: [] as number[],
  stress: [] as number[],
});
