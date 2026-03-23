import { soa } from "bitecs";

export const RecurringTeam = soa({
  id: [] as string[],
  memberIds: [] as string[][],
  cohesion: [] as number[],
  raidCount: [] as number[],
  lastRaidTick: [] as number[],
  damaged: [] as number[],
  damageReason: [] as string[],
});
