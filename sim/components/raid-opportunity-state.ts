import { soa } from "bitecs";

export const RaidOpportunityState = soa({
  id: [] as string[],
  missionId: [] as string[],
  location: [] as string[],
  threat: [] as number[],
  intel: [] as number[],
  reward: [] as number[],
  risk: [] as number[],
  status: [] as string[],
  interestedOperatorIds: [] as string[][],
  claimedOperatorIds: [] as string[][],
  createdTick: [] as number[],
  expiresAtTick: [] as number[],
});
