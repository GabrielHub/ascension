import { soa } from "bitecs";

export const LoyaltyState = soa({
  current: [] as number[],
  baseline: [] as number[],
});
