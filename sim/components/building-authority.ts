import { soa } from "bitecs";

import type { ContractRank } from "content/templates/site-concepts";
import type { BossWeaknessKind } from "content/templates/shared";
import type { PolicyState } from "lib/policies";
import type { RaidRunSnapshot } from "save/types";

// ── Contract lifecycle ──────────────────────────────────────────────────

export type ContractLifecyclePhase = "idle" | "bidding" | "active" | "resolved";

export type ContractBoardIntelSource = "street" | "back_office" | "office";
export type ContractBoardIntelQuality = "rough" | "reviewed" | "dossier";

export interface ContractBoardIntelState {
  /**
   * Which operations room produced the current board read.
   * This belongs to posted contracts only and should not be inferred in UI.
   */
  source: ContractBoardIntelSource;
  /** How complete and trustworthy the posted-contract read is. */
  quality: ContractBoardIntelQuality;
}

export type ContractBriefingSource = "briefing_room" | "briefing_room_and_prep";
export type ContractBriefingStatus = "briefed" | "drilled";

export interface ContractBriefingState {
  /**
   * Which Porter's prep layer is currently feeding the secured contract.
   * This belongs to the active contract only and must remain runtime-owned.
   */
  source: ContractBriefingSource;
  /** Whether the team only has the room briefing or a full drilled send-off. */
  status: ContractBriefingStatus;
  /** Added to each raid opportunity's effective intel while this prep state is active. */
  opportunityIntelBonus: number;
  /** Added to boss-read progress checks when a team launches under this prep state. */
  bossIntelBonus: number;
}

export interface ContractBossWeaknessIntel {
  kind: BossWeaknessKind;
  target: string;
}

export interface PostedContract {
  postingId: string;
  missionId: string;
  siteConceptId: string;
  location: string;
  rank: ContractRank;
  threat: number;
  intel: number;
  reward: number;
  risk: number;
  bidCost: number;
  minReputation: number;
  generatedAtTick: number;
  /** Known traits visible at current intel level. */
  knownTraits: readonly string[];
  /** Hidden traits only revealed at higher intel. */
  hiddenTraitCount: number;
  /** Enemy family hints based on site concept. */
  enemyHints: readonly string[];
  /** Expected loot family based on site concept. */
  lootFamilyHints: readonly string[];
  /** Boss name hint (hidden if intel too low). */
  bossHint: string | null;
  /** Neighborhood label for display. */
  neighborhoodLabel: string;
  /** Runtime-owned board intel provenance for the current posting. */
  boardIntel: ContractBoardIntelState;
  /** Owning district for this contract. */
  districtId?: string;
  /** Sponsoring faction for this contract. */
  sponsorFactionId?: string;
  /** City-pressure tags affecting this contract. */
  pressureTags?: readonly string[];
}

export interface ContractResultSummary {
  contractSiteId: string;
  missionId: string;
  siteConceptId: string;
  location: string;
  rank: ContractRank;
  outcome: "mission_complete" | "boss_defeated" | "contract_lost";
  totalRaids: number;
  totalCashEarned: number;
  totalReputationEarned: number;
  operatorDeaths: number;
  resolvedAtTick: number;
  /** District this contract was in. */
  districtId?: string;
  /** Faction that sponsored this contract. */
  sponsorFactionId?: string;
}

export interface ActiveRaidResolutionPacket {
  [key: string]: unknown;
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
  briefingSource: ContractBriefingSource | null;
  briefingStatus: ContractBriefingStatus | null;
  resolutionPacket: ActiveRaidResolutionPacket;
  raidRun?: RaidRunSnapshot;
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
  treatmentCost?: number;
  operatorOutcomes: ActiveRaidResolutionPacket["operatorOutcomes"];
  narrativeTags: string[];
  intelMismatchTags: string[];
  bossDefeated?: boolean;
  contributingFactors?: string[];
}

// ── Contract site state ───────────────────────────────────────────────────

export interface ContractSiteState {
  /** The secured contract site id, or empty string if none secured. */
  contractSiteId: string;
  /** Mission template id for this contract. */
  missionId: string;
  /** Site concept id for dungeon identity. */
  siteConceptId: string;
  /** Location string for the dungeon. */
  location: string;
  /** Contract rank (F-U). */
  rank: ContractRank;
  /** Owning district for this contract. */
  districtId?: string;
  /** Sponsoring faction for this contract. */
  sponsorFactionId?: string;
  /** Whether the dungeon boss has been defeated. */
  bossDefeated: boolean;
  /** Whether the ordinary contract objective has been completed. */
  missionCompleted: boolean;
  /** Whether the contract has been lost. */
  contractLost: boolean;
  /** Threat level for this site. */
  threat: number;
  /** Intel gathered on this site. */
  intel: number;
  /** Reward baseline for runs into this site. */
  reward: number;
  /** Runtime-owned board read copied from the secured posting. */
  boardIntel: ContractBoardIntelState;
  /** Runtime-owned secured-contract prep state. Null until the Briefing Room comes online. */
  briefing: ContractBriefingState | null;
  /** Tick when the contract was secured. */
  securedAtTick: number;
  /** Site progress: exploration completion 0-100. */
  explorationProgress: number;
  /** Site progress toward ordinary contract closure 0-threshold. */
  closureProgress: number;
  /** Progress threshold required to resolve the current contract. */
  closureThreshold: number;
  /** Site progress: boss intel gathered 0-100. */
  bossIntelProgress: number;
  /** Site progress: boss pressure from successful raids 0-100. */
  bossPressureProgress: number;
  /** Whether this contract requires a boss clear instead of ordinary closure. */
  requiresBossClear: boolean;
  /** Whether the boss encounter is available for commitment. */
  bossAvailable: boolean;
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
  /** Cells revealed by completed raids. Active raids add on top. */
  completedRaidRevealBase?: number;
}

export const BuildingAuthority = soa({
  activeBuildingTemplateIndex: [] as number[],
  activeBuildingTier: [] as number[],
  activeFloorIndex: [] as number[],
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
  /** Current contract lifecycle phase. */
  contractLifecycle: [] as ContractLifecyclePhase[],
  /** Posted contracts available for bidding. */
  postedContracts: [] as PostedContract[][],
  /** Summary of the most recently completed contract (cleared on next bid). */
  contractResult: [] as (ContractResultSummary | null)[],
  /** Active HQ management policies. */
  policies: [] as PolicyState[],
  /** Whether automatic loot filtering is enabled for new and swept inventory. */
  lootAutomationEnabled: [] as number[],
});
