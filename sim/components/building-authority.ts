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
  contractSiteId: string;
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
  contractSiteId: string;
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

// ── Contract site state ───────────────────────────────────────────────────

export interface ContractSiteState {
  /** The secured contract site id, or empty string if none secured. */
  contractSiteId: string;
  /** Mission template id for this contract. */
  missionId: string;
  /** Location string for the dungeon. */
  location: string;
  /** Whether the dungeon boss has been defeated. */
  bossDefeated: boolean;
  /** Whether the contract has been lost. */
  contractLost: boolean;
  /** Threat level for this site. */
  threat: number;
  /** Intel gathered on this site. */
  intel: number;
  /** Reward baseline for runs into this site. */
  reward: number;
  /** Tick when the contract was secured. */
  securedAtTick: number;
}

// ── Fog-of-war state ──────────────────────────────────────────────────────

export interface FogOfWarState {
  /** Grid width in cells. */
  gridWidth: number;
  /** Grid height in cells. */
  gridHeight: number;
  /** Flat array of booleans, row-major. true = revealed. */
  revealed: boolean[];
  /** Total cells revealed so far. */
  revealedCount: number;
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
  /** The one secured government contract site. */
  contractSite: [] as (ContractSiteState | null)[],
  /** Fog-of-war state for the current contract dungeon. */
  fogOfWar: [] as (FogOfWarState | null)[],
});
