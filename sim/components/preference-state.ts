import { soa } from "bitecs";

export const PreferenceState = soa({
  riskTolerance: [] as number[],
  rewardFocus: [] as number[],
  recoveryBias: [] as number[],
  socialBias: [] as number[],
  trainingBias: [] as number[],
  comfortBias: [] as number[],
  preferredMissionTags: [] as string[][],
  preferredPartnerIds: [] as string[][],
});
