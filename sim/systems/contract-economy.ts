import type { ContractRank } from "content/templates/site-concepts";
import { ITEM_RANK_ORDER } from "content/templates/shared";
import { clamp } from "./commands";

export interface ContractRankBudgetConfig {
  threatBase: number;
  rewardBase: number;
  paceMultiplier: number;
}

export interface EconomyVarianceRange {
  min: number;
  max: number;
}

export interface ContractEconomyBudget {
  threat: number;
  intel: number;
  reward: number;
  risk: number;
}

export interface PostedContractEconomyBudget extends ContractEconomyBudget {
  bidCost: number;
}

export type RaidEconomyResult = "success" | "failure" | "mixed";

export const CONTRACT_RANK_CONFIG: Record<ContractRank, ContractRankBudgetConfig> = {
  f: { threatBase: 34, rewardBase: 42, paceMultiplier: 1.0 },
  e: { threatBase: 48, rewardBase: 64, paceMultiplier: 1.1 },
  d: { threatBase: 60, rewardBase: 94, paceMultiplier: 1.25 },
  c: { threatBase: 72, rewardBase: 138, paceMultiplier: 1.4 },
  b: { threatBase: 82, rewardBase: 188, paceMultiplier: 1.6 },
  a: { threatBase: 90, rewardBase: 250, paceMultiplier: 1.85 },
  s: { threatBase: 95, rewardBase: 330, paceMultiplier: 2.2 },
};

export const POSTED_CONTRACT_VARIANCE = {
  threat: { min: -5, max: 8 },
  intel: { min: -8, max: 8 },
  reward: { min: -10, max: 15 },
} satisfies Record<"threat" | "intel" | "reward", EconomyVarianceRange>;

export const RAID_OPPORTUNITY_VARIANCE = {
  threat: { min: -4, max: 6 },
  intel: { min: -6, max: 4 },
  reward: { min: -8, max: 12 },
} satisfies Record<"threat" | "intel" | "reward", EconomyVarianceRange>;

const CONTRACT_RANK_ORDER = ITEM_RANK_ORDER as readonly ContractRank[];

export function getAvailableContractRanksForReputation(
  reputation: number,
  rankCeiling?: ContractRank,
): ContractRank[] {
  const availableRanks: ContractRank[] = ["f"];
  if (reputation >= 5) availableRanks.push("e");
  if (reputation >= 20) availableRanks.push("d");
  if (reputation >= 40) availableRanks.push("c");
  if (reputation >= 60) availableRanks.push("b");
  if (reputation >= 80) availableRanks.push("a");
  if (reputation >= 95) availableRanks.push("s");

  if (rankCeiling) {
    const ceilingIdx = CONTRACT_RANK_ORDER.indexOf(rankCeiling);
    if (ceilingIdx >= 0) {
      return availableRanks.filter((rank) => CONTRACT_RANK_ORDER.indexOf(rank) <= ceilingIdx);
    }
  }

  return availableRanks;
}

export function getMinimumReputationForContractRank(rank: ContractRank): number {
  switch (rank) {
    case "f":
      return 0;
    case "e":
      return 3;
    case "d":
      return 15;
    default:
      return 30;
  }
}

export interface PostedContractEconomyInput {
  rank: ContractRank;
  missionBaseDurationHours: number;
  missionExpectedThreatTagCount: number;
  guildIntel: number;
  threatVariance: number;
  intelVariance: number;
  rewardVariance: number;
}

export function computePostedContractEconomyBudget(
  input: PostedContractEconomyInput,
): PostedContractEconomyBudget {
  const rankCfg = CONTRACT_RANK_CONFIG[input.rank];
  const threat = clamp(
    rankCfg.threatBase + input.missionBaseDurationHours * 6 + input.threatVariance,
    20,
    95,
  );
  const intel = clamp(
    28 + input.guildIntel * 14 + input.missionExpectedThreatTagCount * 4 + input.intelVariance,
    10,
    92,
  );
  const reward = clamp(
    rankCfg.rewardBase + input.missionBaseDurationHours * 12 + input.rewardVariance,
    40,
    500,
  );
  const risk = clamp(threat + input.missionExpectedThreatTagCount * 4 - intel * 0.35, 18, 96);

  return {
    threat,
    intel,
    reward,
    risk,
    bidCost: Math.round(reward * 0.08),
  };
}

export interface RaidOpportunityEconomyInput {
  contractThreat: number;
  contractIntel: number;
  contractReward: number;
  missionExpectedThreatTagCount: number;
  threatVariance: number;
  intelVariance: number;
  rewardVariance: number;
}

export function computeRaidOpportunityEconomyBudget(
  input: RaidOpportunityEconomyInput,
): ContractEconomyBudget {
  const threat = clamp(input.contractThreat + input.threatVariance, 20, 95);
  const intel = clamp(input.contractIntel + input.intelVariance, 10, 92);
  const reward = clamp(input.contractReward + input.rewardVariance, 40, 180);
  const risk = clamp(threat + input.missionExpectedThreatTagCount * 4 - intel * 0.35, 18, 96);

  return {
    threat,
    intel,
    reward,
    risk,
  };
}

export function computeRaidReputationDelta(result: RaidEconomyResult): number {
  switch (result) {
    case "success":
      return 5;
    case "mixed":
      return 1;
    case "failure":
      return -6;
  }
}

export function computeRaidCashDelta(
  result: RaidEconomyResult,
  reward: number,
  risk: number,
): number {
  switch (result) {
    case "success":
      return Math.round(reward * 0.7);
    case "mixed":
      return Math.round(reward * 0.36);
    case "failure":
      return -Math.round(risk * 0.68);
  }
}

export function computeBossCompletionCashBonus(reward: number, rank: ContractRank): number {
  return Math.round(reward * 1.15 * CONTRACT_RANK_CONFIG[rank].paceMultiplier);
}

export function computeBossCompletionReputationBonus(): number {
  return 15;
}

export function computeMissionCompletionCashBonus(reward: number, rank: ContractRank): number {
  return Math.round(reward * 0.55 * CONTRACT_RANK_CONFIG[rank].paceMultiplier);
}

export function computeMissionCompletionReputationBonus(): number {
  return 4;
}
