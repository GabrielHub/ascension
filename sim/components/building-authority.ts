import { soa } from "bitecs";

export interface ActiveRaidResolutionPacket {
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
  operatorOutcomes: Array<{
    operatorId: string;
    injuryDelta: number;
    moraleDelta: number;
    loyaltyDelta: number;
    status: "steady" | "shaken" | "hurt";
    died?: boolean;
  }>;
  narrativeTags: string[];
  intelMismatchTags: string[];
}

export interface ActiveRaidPacketRecord {
  id: string;
  opportunityId: string;
  missionId: string;
  location: string;
  startedAt: string;
  startedTick: number;
  revealProgress: number;
  operatorIds: string[];
  returnTick: number;
  durationHours: number;
  threat: number;
  intel: number;
  reward: number;
  cohesion: number;
  resolutionPacket: ActiveRaidResolutionPacket;
}

export interface RaidSummaryRecord {
  id: string;
  opportunityId: string;
  missionId: string;
  location: string;
  startedAt: string;
  endedAt: string;
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
  threat: number;
  intel: number;
  reward: number;
  cohesion: number;
  operatorOutcomes: ActiveRaidResolutionPacket["operatorOutcomes"];
  narrativeTags: string[];
  intelMismatchTags: string[];
}

export const BuildingAuthority = soa({
  activeBuildingTemplateIndex: [] as number[],
  activeBuildingTier: [] as number[],
  roomSlotCount: [] as number[],
  operatorSlotCount: [] as number[],
  appliedUpgradeIds: [] as string[][],
  unlockedRoomTemplateIds: [] as string[][],
  unlockedRoomTierByTemplateId: [] as Record<string, number>[],
  roomCapacityModifiers: [] as Record<string, number>[],
  needRateMultipliers: [] as Record<string, number>[],
  attractionWeightByTag: [] as Record<string, number>[],
  recoveryRateModifier: [] as number[],
  trainingRateModifier: [] as number[],
  moraleModifier: [] as number[],
  loyaltyModifier: [] as number[],
  resourceIncomeModifiers: [] as Record<string, number>[],
  resourceCostMultipliers: [] as Record<string, number>[],
  activeRaidPackets: [] as ActiveRaidPacketRecord[][],
  raidSummaries: [] as RaidSummaryRecord[][],
  pressure: [] as number[],
  lastPayrollDay: [] as number[],
  lastVisitorSpawnTick: [] as number[],
  lastEventTick: [] as number[],
  lastRaidOpportunityTick: [] as number[],
});
