import { soa } from "bitecs";

export const RaidParticipationState = soa({
  activeRaidId: [] as string[],
  missionId: [] as string[],
  returnTick: [] as number[],
});
