import { z } from "zod";

import { createNewGameWorldSnapshot, createAscensionSimulation } from "../index";
import { deferredSimulationGuidanceReady, deferredSimulationSystemsReady } from "../systems";
import { INCIDENT_TEMPLATES, OPENING_SAFE_INCIDENT_CATEGORIES } from "../systems/incidents";
import {
  DAILY_ACTIVE_OPERATOR_PAYROLL,
  DAILY_ACTIVE_RECEPTION_STOREFRONT_INCOME,
} from "../systems/economy-constants";
import { templateRegistry } from "content/templates";
import { normalizePolicyState, type PolicyState } from "lib/policies";

const EARLY_CAMPAIGN_SIMULATION_SCHEMA_VERSION = "early-campaign-simulation.v1";
const DEFAULT_SEED_COUNT = 24;
const DEFAULT_START_SEED = 1;
const DEFAULT_CONTRACT_LIMIT = 8;
const DEFAULT_TICK_MINUTES = 60;
const DEFAULT_SCENARIO_PROFILES = ["skilled", "average", "struggling"] as const;
const OPENING_STABILITY_PROFILE_SEED_COUNT = 8;
const MINIMUM_BID_COST = 7;
const CRITICAL_TREASURY_FLOOR = 50;
const MAX_RECRUIT_PAYROLL_INCREASE_PCT = 20;

const INCOME_UPGRADE_IDS = [
  "upgrade/room/register:records_wall",
  "upgrade/room/counter:hot_coffee",
  "upgrade/building/bodega:frontage",
] as const;
const GUIDED_FIRST_UPGRADE_ID = INCOME_UPGRADE_IDS[0];
const FIRST_CONTRACT_CHOICE_BEAT_ID = "guidance/opening/first-contract-choice";

const SCENARIO_TARGETS = {
  skilled: { success: 6, mixed: 1, failure: 1 },
  average: { success: 4, mixed: 2, failure: 2 },
  struggling: { success: 2, mixed: 3, failure: 3 },
} as const;

type ThresholdStatus = "pass" | "out_of_band" | "fail" | "not_measurable";
type CycleOutcome = "success" | "mixed" | "failure";
type ScenarioLabel = keyof typeof SCENARIO_TARGETS;
type ScenarioProfile = (typeof DEFAULT_SCENARIO_PROFILES)[number];
type InjuryBand = "minor" | "moderate" | "severe";

type Phase1View = ReturnType<ReturnType<typeof createAscensionSimulation>["getPhase1View"]>;
type Phase2View = ReturnType<ReturnType<typeof createAscensionSimulation>["getPhase2View"]>;

const thresholdStatusSchema = z.enum(["pass", "out_of_band", "fail", "not_measurable"]);

const contractCycleSchema = z.object({
  index: z.number().int().positive(),
  postingId: z.string(),
  contractSiteId: z.string(),
  missionId: z.string(),
  missionName: z.string(),
  siteConceptId: z.string(),
  outcome: z.enum(["success", "mixed", "failure"]),
  startMinute: z.number().int().nonnegative(),
  endMinute: z.number().int().nonnegative(),
  durationHours: z.number().nonnegative(),
  startTreasury: z.number(),
  endTreasury: z.number(),
  minTreasury: z.number(),
  maxTreasury: z.number(),
  rawNetTreasury: z.number(),
  operatingNetTreasury: z.number(),
  upgradeSpend: z.number().nonnegative(),
  lootSoldCash: z.number().nonnegative(),
  incidentCashDelta: z.number(),
  recruitAcceptances: z.number().int().nonnegative(),
  recruitRejections: z.number().int().nonnegative(),
  startReputation: z.number(),
  endReputation: z.number(),
  raidOutcomes: z.array(z.enum(["success", "mixed", "failure"])),
  raidCount: z.number().int().nonnegative(),
  bossContacted: z.boolean(),
  bossCleared: z.boolean(),
  operatorDeaths: z.number().int().nonnegative(),
  minDeployableOperators: z.number().int().nonnegative(),
  maxInjurySeverity: z.number().nonnegative(),
  dailyPayrollAtStart: z.number().nonnegative(),
  dailyGrossIncomeAtStart: z.number().nonnegative(),
  payrollBurdenAtStartPct: z.number().nonnegative(),
});

const incidentLogSchema = z.object({
  contractIndex: z.number().int().nonnegative(),
  minute: z.number().int().nonnegative(),
  templateId: z.string(),
  templateName: z.string(),
  category: z.string(),
  choiceId: z.string(),
  choiceLabel: z.string(),
  treasuryDelta: z.number(),
  openingSafeCategory: z.boolean(),
});

const recruitLogSchema = z.object({
  contractIndex: z.number().int().nonnegative(),
  minute: z.number().int().nonnegative(),
  visitorId: z.string(),
  visitorName: z.string(),
  desiredRoleTag: z.string(),
  accepted: z.boolean(),
  projectedTwoCycleTreasuryFloor: z.number(),
  payrollIncreasePctOfGross: z.number(),
});

const upgradeLogSchema = z.object({
  contractIndex: z.number().int().nonnegative(),
  minute: z.number().int().nonnegative(),
  upgradeId: z.string(),
  upgradeName: z.string(),
  cost: z.number().nonnegative(),
});

const injuryEpisodeSchema = z.object({
  operatorId: z.string(),
  operatorName: z.string(),
  contractIndex: z.number().int().nonnegative(),
  startedAtMinute: z.number().int().nonnegative(),
  endedAtMinute: z.number().int().nonnegative(),
  durationHours: z.number().nonnegative(),
  peakSeverity: z.number().nonnegative(),
  band: z.enum(["minor", "moderate", "severe"]),
  deploymentImpact: z.enum(["none", "reduced", "blocked"]),
  minDeployableOperatorsDuringEpisode: z.number().int().nonnegative(),
  maxDeployableOperatorsDuringEpisode: z.number().int().nonnegative(),
});

const thresholdCheckSchema = z.object({
  status: thresholdStatusSchema,
  measured: z.number().nullable(),
  target: z.string(),
  detail: z.string(),
});

const runMetricSchema = z.object({
  overall: thresholdStatusSchema,
  checks: z.record(z.string(), thresholdCheckSchema),
});

const runEvaluationSchema = z.object({
  m1TreasuryFlow: runMetricSchema,
  m2PayrollBurden: runMetricSchema,
  m3UpgradeTiming: runMetricSchema,
  m4RecruitAcceptance: runMetricSchema,
  m5CasualtyPressure: runMetricSchema,
  m6DeadlockRate: runMetricSchema,
  m7OpeningStability: runMetricSchema,
  m8RelocationPacing: runMetricSchema,
});

const watchItemSchema = z.object({
  status: thresholdStatusSchema,
  detail: z.string(),
  measured: z.number().nullable().optional(),
});

const earlyCampaignSimulationRunSchema = z.object({
  seed: z.number().int().nonnegative(),
  scenarioProfile: z.enum(DEFAULT_SCENARIO_PROFILES),
  inferredScenario: z.enum(["skilled", "average", "struggling"]),
  completedContracts: z.number().int().nonnegative(),
  contractCycles: z.array(contractCycleSchema),
  incidents: z.array(incidentLogSchema),
  recruits: z.array(recruitLogSchema),
  upgrades: z.array(upgradeLogSchema),
  injuries: z.array(injuryEpisodeSchema),
  outcomeCounts: z.object({
    success: z.number().int().nonnegative(),
    mixed: z.number().int().nonnegative(),
    failure: z.number().int().nonnegative(),
  }),
  firstIncomeUpgradeAffordableContract: z.number().int().nonnegative().nullable(),
  firstIncomeUpgradePurchasedContract: z.number().int().nonnegative().nullable(),
  allIncomeUpgradesAffordableContract: z.number().int().nonnegative().nullable(),
  firstRecruitViableContract: z.number().int().nonnegative().nullable(),
  firstRecruitProjectedTwoCycleTreasuryFloor: z.number().nullable(),
  firstRecruitPayrollIncreasePctOfGross: z.number().nullable(),
  firstRecruitAcceptedContract: z.number().int().nonnegative().nullable(),
  firstBossContactContract: z.number().int().nonnegative().nullable(),
  firstBossClearContract: z.number().int().nonnegative().nullable(),
  relocationReadyContract: z.number().int().nonnegative().nullable(),
  finalTreasury: z.number(),
  finalReputation: z.number(),
  totalLootSoldCash: z.number().nonnegative(),
  totalUpgradeSpend: z.number().nonnegative(),
  totalIncidentCashDelta: z.number(),
  totalTreatmentSpend: z.number().nonnegative(),
  treasuryAfterThreeContracts: z.number().nullable(),
  deployableOperatorsAfterThreeContracts: z.number().nullable(),
  unsafeIncidentsInFirstThreeContracts: z.number().int().nonnegative(),
  deadlocked: z.boolean(),
  collapsed: z.boolean(),
  stalled: z.boolean(),
  collapseReason: z.string().nullable(),
  evaluation: runEvaluationSchema,
});

const aggregateMetricSchema = z.object({
  passRate: z.number().nonnegative(),
  outOfBandRate: z.number().nonnegative(),
  failRate: z.number().nonnegative(),
  notMeasurableRate: z.number().nonnegative(),
});

const aggregateScenarioRateSchema = z.object({
  skilled: z.number().nonnegative(),
  average: z.number().nonnegative(),
  struggling: z.number().nonnegative(),
});

export const earlyCampaignSimulationSchema = z.object({
  schemaVersion: z.literal(EARLY_CAMPAIGN_SIMULATION_SCHEMA_VERSION),
  meta: z.object({
    scenarioId: z.literal("canonical-opening-path"),
    canonicalScenarioPath: z.literal("content/bootstrap.ts#canonicalNewGameScenario"),
    planPath: z.literal("docs/plans/bodega-early-game-balance-followup.md"),
    targetEnvelopePath: z.literal("docs/research/shipped-plans/economy-target-envelope.md"),
    seedCount: z.number().int().positive(),
    startSeed: z.number().int().nonnegative(),
    contractLimit: z.number().int().positive(),
    tickMinutes: z.number().int().positive(),
    scenarioProfiles: z.array(z.enum(DEFAULT_SCENARIO_PROFILES)).min(1),
  }),
  aggregate: z.object({
    runCount: z.number().int().positive(),
    completedRunCount: z.number().int().nonnegative(),
    deadlockRate: z.number().nonnegative(),
    collapseRate: z.number().nonnegative(),
    stallRate: z.number().nonnegative(),
    outcomeDistribution: z.object({
      success: z.number().nonnegative(),
      mixed: z.number().nonnegative(),
      failure: z.number().nonnegative(),
    }),
    inferredScenarioDistribution: aggregateScenarioRateSchema,
    meanFinalTreasury: z.number(),
    treasuryVariance: z.number().nonnegative(),
    lootVarianceShare: z.number().nonnegative(),
    firstIncomeUpgradeAffordable: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    firstIncomeUpgradePurchased: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    firstRecruitViable: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    firstRecruitAccepted: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    firstBossContact: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    firstBossClear: z.object({
      meanContract: z.number().nullable(),
      status: thresholdStatusSchema,
    }),
    metrics: z.object({
      m1TreasuryFlow: aggregateMetricSchema,
      m2PayrollBurden: aggregateMetricSchema,
      m3UpgradeTiming: aggregateMetricSchema,
      m4RecruitAcceptance: aggregateMetricSchema,
      m5CasualtyPressure: aggregateMetricSchema,
      m6DeadlockRate: aggregateMetricSchema,
      m7OpeningStability: aggregateMetricSchema,
      m8RelocationPacing: aggregateMetricSchema,
    }),
    scenarioDeadlockRates: aggregateScenarioRateSchema,
    scenarioOpeningTreasuryRates: aggregateScenarioRateSchema,
    scenarioOpeningDeployableRates: aggregateScenarioRateSchema,
    watchItems: z.object({
      payrollBurdenStress: watchItemSchema,
      lootSellVariance: watchItemSchema,
      incidentMercyWindow: watchItemSchema,
      injuryPressureNoTreatmentCost: watchItemSchema,
      relocationReadiness: watchItemSchema,
    }),
    notableFindings: z.array(z.string()),
  }),
  runs: z.array(earlyCampaignSimulationRunSchema),
});

export type EarlyCampaignSimulationSuite = z.infer<typeof earlyCampaignSimulationSchema>;
export type EarlyCampaignSimulationRun = z.infer<typeof earlyCampaignSimulationRunSchema>;

interface SimulationOptions {
  seedCount?: number;
  startSeed?: number;
  contractLimit?: number;
  tickMinutes?: number;
  policyState?: Partial<PolicyState>;
  scenarioProfiles?: readonly ScenarioProfile[];
}

interface PendingCycleStart {
  index: number;
  postingId: string;
  missionId: string;
  missionName: string;
  siteConceptId: string;
  startMinute: number;
  startTreasury: number;
  startReputation: number;
  dailyPayrollAtStart: number;
  dailyGrossIncomeAtStart: number;
  payrollBurdenAtStartPct: number;
}

interface WorkingCycle extends z.infer<typeof contractCycleSchema> {
  resolved: boolean;
  resolvedAtMinute: number | null;
}

interface OpenInjuryEpisode {
  operatorId: string;
  operatorName: string;
  contractIndex: number;
  startedAtMinute: number;
  peakSeverity: number;
  becameUnavailable: boolean;
  minDeployableOperatorsDuringEpisode: number;
  maxDeployableOperatorsDuringEpisode: number;
  observedTicks: number;
}

interface RunWorkingState {
  pendingCycleStart: PendingCycleStart | null;
  currentCycle: WorkingCycle | null;
  injuryEpisodes: z.infer<typeof injuryEpisodeSchema>[];
  openInjuryEpisodes: Map<string, OpenInjuryEpisode>;
  previousOperators: Map<
    string,
    {
      severity: number;
      lifecycleStatus: string;
    }
  >;
  unsafeIncidentsInFirstThreeContracts: number;
  firstIncomeUpgradeAffordableContract: number | null;
  firstIncomeUpgradePurchasedContract: number | null;
  allIncomeUpgradesAffordableContract: number | null;
  firstRecruitViableContract: number | null;
  firstRecruitProjectedTwoCycleTreasuryFloor: number | null;
  firstRecruitPayrollIncreasePctOfGross: number | null;
  firstRecruitAcceptedContract: number | null;
  firstBossContactContract: number | null;
  firstBossClearContract: number | null;
  relocationReadyContract: number | null;
  treasuryAfterThreeContracts: number | null;
  deployableOperatorsAfterThreeContracts: number | null;
  deadlocked: boolean;
  collapsed: boolean;
  stalled: boolean;
  collapseReason: string | null;
  lastProgressSignature: string | null;
  stagnantIterations: number;
  countedRaidSummaryIds: Set<string>;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function variance(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return round2(
    values.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / values.length,
  );
}

function statusWeight(status: ThresholdStatus): number {
  switch (status) {
    case "fail":
      return 3;
    case "out_of_band":
      return 2;
    case "pass":
      return 1;
    case "not_measurable":
      return 0;
  }
}

function combineStatuses(statuses: ThresholdStatus[]): ThresholdStatus {
  if (statuses.length === 0) {
    return "not_measurable";
  }
  return [...statuses].sort((left, right) => statusWeight(right) - statusWeight(left))[0];
}

function getBossTimingAggregateStatus(values: number[]): ThresholdStatus {
  if (values.length === 0) {
    return "not_measurable";
  }
  if (values.some((value) => value < 6 || value > 9)) {
    return "fail";
  }
  if (values.some((value) => value < 7 || value > 8)) {
    return "out_of_band";
  }
  return "pass";
}

function getCheckStatus(
  checks: Record<string, z.infer<typeof thresholdCheckSchema>>,
  key: string,
): ThresholdStatus {
  return checks[key]?.status ?? "not_measurable";
}

function rateForStatuses(
  statuses: readonly ThresholdStatus[],
): z.infer<typeof aggregateMetricSchema> {
  if (statuses.length === 0) {
    return {
      passRate: 0,
      outOfBandRate: 0,
      failRate: 0,
      notMeasurableRate: 0,
    };
  }

  const counts = {
    pass: 0,
    out_of_band: 0,
    fail: 0,
    not_measurable: 0,
  };

  statuses.forEach((status) => {
    counts[status] += 1;
  });

  return {
    passRate: round2((counts.pass / statuses.length) * 100),
    outOfBandRate: round2((counts.out_of_band / statuses.length) * 100),
    failRate: round2((counts.fail / statuses.length) * 100),
    notMeasurableRate: round2((counts.not_measurable / statuses.length) * 100),
  };
}

function rateForStatus(
  runs: EarlyCampaignSimulationRun[],
  selector: (run: EarlyCampaignSimulationRun) => ThresholdStatus,
): z.infer<typeof aggregateMetricSchema> {
  return rateForStatuses(runs.map(selector));
}

function classifyCycleOutcome(
  contractResult: Phase1View["contractResult"],
  raidOutcomes: readonly CycleOutcome[],
): CycleOutcome {
  if (contractResult?.outcome === "contract_lost") {
    return "failure";
  }
  if (!contractResult || contractResult.operatorDeaths > 0) {
    return "failure";
  }
  const hadFailureRaid = raidOutcomes.includes("failure");
  const hadMixedRaid = raidOutcomes.includes("mixed");
  if (!hadFailureRaid && !hadMixedRaid) {
    return "success";
  }
  if (!hadFailureRaid && contractResult.totalRaids <= 2) {
    return "success";
  }
  return "mixed";
}

function classifyScenario(
  outcomeCounts: z.infer<typeof earlyCampaignSimulationRunSchema>["outcomeCounts"],
): ScenarioLabel {
  const distances = Object.entries(SCENARIO_TARGETS).map(([label, target]) => ({
    label: label as ScenarioLabel,
    distance:
      Math.abs(outcomeCounts.success - target.success) +
      Math.abs(outcomeCounts.mixed - target.mixed) +
      Math.abs(outcomeCounts.failure - target.failure),
  }));
  distances.sort(
    (left, right) => left.distance - right.distance || left.label.localeCompare(right.label),
  );
  return distances[0].label;
}

const SCENARIO_PROFILE_CONFIG: Record<
  ScenarioProfile,
  {
    contractPick: "best" | "middle" | "worst";
    incidentChoice: "best" | "first" | "worst";
    earliestUpgradeContract: number;
    earliestRecruitContract: number;
    recoveryWaitMaxHours: number;
  }
> = {
  skilled: {
    contractPick: "best",
    incidentChoice: "best",
    earliestUpgradeContract: 2,
    earliestRecruitContract: 1,
    recoveryWaitMaxHours: 8,
  },
  average: {
    contractPick: "middle",
    incidentChoice: "first",
    earliestUpgradeContract: 3,
    earliestRecruitContract: 2,
    recoveryWaitMaxHours: 12,
  },
  struggling: {
    contractPick: "worst",
    incidentChoice: "worst",
    earliestUpgradeContract: 3,
    earliestRecruitContract: 3,
    recoveryWaitMaxHours: 12,
  },
};

function getIncomeUpgradeIdsFromView(phase1: Phase1View): string[] {
  return [
    ...phase1.building.availableBuildingUpgradeIds,
    ...phase1.rooms.flatMap((room) => room.availableUpgradeIds),
  ].filter((upgradeId) =>
    INCOME_UPGRADE_IDS.includes(upgradeId as (typeof INCOME_UPGRADE_IDS)[number]),
  );
}

function getAppliedIncomeUpgradeCount(phase1: Phase1View): number {
  return [
    ...phase1.building.appliedUpgradeIds,
    ...phase1.rooms.flatMap((room) => room.appliedUpgradeIds),
  ].filter((upgradeId, index, ids) => {
    return (
      INCOME_UPGRADE_IDS.includes(upgradeId as (typeof INCOME_UPGRADE_IDS)[number]) &&
      ids.indexOf(upgradeId) === index
    );
  }).length;
}

function getUpgradeCost(upgradeId: string): number {
  const upgrade = templateRegistry.upgradeById.get(upgradeId);
  if (!upgrade) {
    return 0;
  }
  return upgrade.requirements.reduce((total, requirement) => {
    return requirement.type === "resource_min" && requirement.resourceId === "resource/cash"
      ? total + requirement.minimum
      : total;
  }, 0);
}

function getDailyPayroll(phase1: Phase1View): number {
  return (
    phase1.staff.reduce((total, staff) => total + staff.wage, 0) +
    phase1.operators.filter((operator) => operator.lifecycle.status === "active").length *
      DAILY_ACTIVE_OPERATOR_PAYROLL
  );
}

function getDailyGrossIncome(phase1: Phase1View): number {
  const activeReceptionRooms = phase1.rooms.filter(
    (room) => room.isOperational && room.requiredStaffTag === "staff:reception",
  ).length;
  const incomeFromUpgrades = [
    ...phase1.building.appliedUpgradeIds,
    ...phase1.rooms.flatMap((room) => room.appliedUpgradeIds),
  ].reduce((total, upgradeId) => {
    const upgrade = templateRegistry.upgradeById.get(upgradeId);
    if (!upgrade) {
      return total;
    }
    return (
      total +
      upgrade.effects.reduce((effectTotal, effect) => {
        return effect.type === "modify_resource_income" && effect.resourceId === "resource/cash"
          ? effectTotal + effect.amount
          : effectTotal;
      }, 0)
    );
  }, 0);

  return activeReceptionRooms * DAILY_ACTIVE_RECEPTION_STOREFRONT_INCOME + incomeFromUpgrades;
}

function getPayrollBurdenPct(phase1: Phase1View): number {
  const dailyGrossIncome = getDailyGrossIncome(phase1);
  if (dailyGrossIncome <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return round2((getDailyPayroll(phase1) / dailyGrossIncome) * 100);
}

function getRaidingOperatorIds(phase1: Phase1View): Set<string> {
  return new Set(phase1.activeRaids.flatMap((raid) => raid.operatorIds));
}

function getRosterCapableOperatorCount(phase1: Phase1View, raidingIds?: Set<string>): number {
  const raidingOperatorIds = raidingIds ?? getRaidingOperatorIds(phase1);
  return phase1.operators.filter((operator) => {
    return (
      operator.lifecycle.status === "active" &&
      (raidingOperatorIds.has(operator.id) || operator.availableForRaid)
    );
  }).length;
}

function getCycleOrRunIndex(run: EarlyCampaignSimulationRun, working: RunWorkingState): number {
  return working.currentCycle?.index ?? run.completedContracts;
}

function getInjuryBand(severity: number): InjuryBand {
  if (severity <= 25) {
    return "minor";
  }
  if (severity <= 50) {
    return "moderate";
  }
  return "severe";
}

function choosePostedContract(
  phase1: Phase1View,
  options: { preferBoardOrder: boolean; scenarioProfile: ScenarioProfile },
): Phase1View["postedContracts"][number] | null {
  const bidable = [...phase1.postedContracts].filter((posting) => posting.canBid);
  if (bidable.length === 0) {
    return null;
  }
  if (options.preferBoardOrder) {
    return bidable[0] ?? null;
  }
  const ranked = bidable.sort((left, right) => {
    const leftScore = left.risk - left.reward * 0.08;
    const rightScore = right.risk - right.reward * 0.08;
    return (
      leftScore - rightScore ||
      left.risk - right.risk ||
      right.reward - left.reward ||
      left.postingId.localeCompare(right.postingId)
    );
  });

  switch (SCENARIO_PROFILE_CONFIG[options.scenarioProfile].contractPick) {
    case "worst":
      return ranked[ranked.length - 1] ?? null;
    case "middle":
      return ranked[Math.floor((ranked.length - 1) / 2)] ?? null;
    case "best":
    default:
      return ranked[0] ?? null;
  }
}

function evaluateIncidentChoice(templateId: string, choiceId: string): number {
  const template = INCIDENT_TEMPLATES.find((entry) => entry.id === templateId);
  const choice = template?.choices.find((entry) => entry.choiceId === choiceId);
  if (!choice) {
    return Number.NEGATIVE_INFINITY;
  }

  return choice.effects.reduce((score, effect) => {
    switch (effect.kind) {
      case "treasury_delta":
        return score + effect.value;
      case "reputation_delta":
        return score + effect.value * 15;
      case "intel_delta":
        return score + effect.value * 4;
      case "loyalty_delta":
        return score + effect.value * 3;
      case "morale_delta":
        return score + effect.value * 2;
      case "contract_pressure_delta":
        return score - effect.value * 4;
      default:
        return score;
    }
  }, 0);
}

function buildIncidentChoiceResult(
  payload: NonNullable<Phase1View["activeInterruption"]>["payload"] & {
    kind: "incident";
    choices?: ReadonlyArray<{ choiceId: string; label: string }>;
  },
  choiceId: string,
  fallbackLabel: string,
): {
  choiceId: string;
  choiceLabel: string;
  treasuryDelta: number;
  templateName: string;
  category: string;
} | null {
  const template = INCIDENT_TEMPLATES.find((entry) => entry.id === payload.templateId);
  if (!template) {
    return null;
  }

  const authoredChoice = template.choices.find((entry) => entry.choiceId === choiceId);
  const treasuryDelta =
    authoredChoice?.effects.reduce((sum, effect) => {
      return effect.kind === "treasury_delta" ? sum + effect.value : sum;
    }, 0) ?? 0;

  return {
    choiceId,
    choiceLabel: authoredChoice?.label ?? fallbackLabel,
    treasuryDelta,
    templateName: template.name,
    category: template.category,
  };
}

function chooseIncidentChoice(
  payload: NonNullable<Phase1View["activeInterruption"]>["payload"] & {
    kind: "incident";
    choices?: ReadonlyArray<{ choiceId: string; label: string }>;
  },
  options: { preferFirstChoice: boolean; scenarioProfile: ScenarioProfile },
): {
  choiceId: string;
  choiceLabel: string;
  treasuryDelta: number;
  templateName: string;
  category: string;
} | null {
  if (!payload.choices || payload.choices.length === 0) {
    return null;
  }

  if (options.preferFirstChoice) {
    const firstChoice = payload.choices[0];
    return buildIncidentChoiceResult(payload, firstChoice.choiceId, firstChoice.label);
  }

  const ranked = [...payload.choices].sort((left, right) => {
    return (
      evaluateIncidentChoice(payload.templateId, right.choiceId) -
        evaluateIncidentChoice(payload.templateId, left.choiceId) ||
      left.choiceId.localeCompare(right.choiceId)
    );
  });

  switch (SCENARIO_PROFILE_CONFIG[options.scenarioProfile].incidentChoice) {
    case "worst": {
      const choice = ranked[ranked.length - 1] ?? ranked[0];
      return buildIncidentChoiceResult(payload, choice.choiceId, choice.label);
    }
    case "first": {
      const choice = payload.choices[0] ?? ranked[0];
      return buildIncidentChoiceResult(payload, choice.choiceId, choice.label);
    }
    case "best":
    default: {
      const choice = ranked[0];
      return buildIncidentChoiceResult(payload, choice.choiceId, choice.label);
    }
  }
}

function selectUpgradeActionById(
  phase1: Phase1View,
  upgradeId: string,
):
  | { type: "sim/purchase-building-upgrade"; upgradeId: string }
  | { type: "sim/purchase-room-upgrade"; roomId: string; upgradeId: string }
  | null {
  if (phase1.building.availableBuildingUpgradeIds.includes(upgradeId)) {
    return { type: "sim/purchase-building-upgrade", upgradeId };
  }

  const room = phase1.rooms.find((entry) => entry.availableUpgradeIds.includes(upgradeId));
  if (!room) {
    return null;
  }
  return {
    type: "sim/purchase-room-upgrade",
    roomId: room.id,
    upgradeId,
  };
}

function chooseUpgradeAction(
  phase1: Phase1View,
  options: {
    guidedOnly: boolean;
    preferredUpgradeId?: string;
    scenarioProfile: ScenarioProfile;
    completedContracts: number;
  },
):
  | { type: "sim/purchase-building-upgrade"; upgradeId: string }
  | { type: "sim/purchase-room-upgrade"; roomId: string; upgradeId: string }
  | null {
  const candidateUpgrades = INCOME_UPGRADE_IDS.filter((upgradeId) => {
    if (phase1.building.availableBuildingUpgradeIds.includes(upgradeId)) {
      return true;
    }
    return phase1.rooms.some((room) => room.availableUpgradeIds.includes(upgradeId));
  }).sort((left, right) => getUpgradeCost(left) - getUpgradeCost(right));

  const chosen = candidateUpgrades[0];
  if (!chosen) {
    return null;
  }

  const preferredUpgradeId =
    options.scenarioProfile === "skilled" ? options.preferredUpgradeId : undefined;
  const selectedUpgradeId =
    preferredUpgradeId && candidateUpgrades.includes(preferredUpgradeId)
      ? preferredUpgradeId
      : chosen;

  if (options.guidedOnly) {
    return null;
  }
  if (
    options.completedContracts + 1 <
    SCENARIO_PROFILE_CONFIG[options.scenarioProfile].earliestUpgradeContract
  ) {
    return null;
  }
  if (phase1.resources.cash - getUpgradeCost(selectedUpgradeId) <= CRITICAL_TREASURY_FLOOR) {
    return null;
  }
  return selectUpgradeActionById(phase1, selectedUpgradeId);
}

function projectRecruitViability(phase1: Phase1View): {
  visitorId: string;
  projectedTwoCycleTreasuryFloor: number;
  payrollIncreasePctOfGross: number;
} | null {
  const visitor = phase1.visitors.find((entry) => entry.canAccept !== false);
  if (!visitor || visitor.canAccept === false) {
    return null;
  }

  const activeOperators = phase1.operators.filter(
    (operator) => operator.lifecycle.status === "active",
  ).length;
  if (activeOperators >= phase1.building.operatorSlotCount) {
    return null;
  }

  const grossIncome = getDailyGrossIncome(phase1);
  const projectedPayroll = getDailyPayroll(phase1) + DAILY_ACTIVE_OPERATOR_PAYROLL;
  const projectedDailyNet = grossIncome - projectedPayroll;

  return {
    visitorId: visitor.id,
    projectedTwoCycleTreasuryFloor: phase1.resources.cash + projectedDailyNet * 2,
    payrollIncreasePctOfGross:
      grossIncome <= 0
        ? Number.POSITIVE_INFINITY
        : round2((DAILY_ACTIVE_OPERATOR_PAYROLL / grossIncome) * 100),
  };
}

function chooseRecruitDecision(
  phase1: Phase1View,
  run: EarlyCampaignSimulationRun,
  options: {
    hasAcceptedRecruit: boolean;
    majorRosterPressure: boolean;
    scenarioProfile: ScenarioProfile;
  },
): {
  visitorId: string;
  accepted: boolean;
  projectedTwoCycleTreasuryFloor: number;
  payrollIncreasePctOfGross: number;
} | null {
  const viability = projectRecruitViability(phase1);
  if (!viability || run.completedContracts < 1) {
    return null;
  }

  const evaluatingInitialRecruit = !options.hasAcceptedRecruit;
  if (!evaluatingInitialRecruit && !options.majorRosterPressure) {
    return null;
  }

  const accept =
    viability.projectedTwoCycleTreasuryFloor > CRITICAL_TREASURY_FLOOR &&
    viability.payrollIncreasePctOfGross <= MAX_RECRUIT_PAYROLL_INCREASE_PCT &&
    run.completedContracts >=
      SCENARIO_PROFILE_CONFIG[options.scenarioProfile].earliestRecruitContract;

  return {
    visitorId: viability.visitorId,
    accepted: accept,
    projectedTwoCycleTreasuryFloor: viability.projectedTwoCycleTreasuryFloor,
    payrollIncreasePctOfGross: viability.payrollIncreasePctOfGross,
  };
}

function getSellableLoot(
  phase2: Phase2View,
): Array<{ itemId: string; quantity: number; sellPrice: number }> {
  return phase2.inventory
    .map((stack) => {
      const item = templateRegistry.itemById.get(stack.itemId);
      if (!item || item.category !== "loot" || item.sellPrice <= 0 || stack.quantity <= 0) {
        return null;
      }
      return {
        itemId: stack.itemId,
        quantity: stack.quantity,
        sellPrice: item.sellPrice,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
}

function getEmergencySellableInventory(
  phase2: Phase2View,
): Array<{ itemId: string; quantity: number; sellPrice: number }> {
  return phase2.inventory
    .map((stack) => {
      const item = templateRegistry.itemById.get(stack.itemId);
      if (!item || item.sellPrice <= 0 || stack.quantity <= 0 || item.category === "loot") {
        return null;
      }
      return {
        itemId: stack.itemId,
        quantity: stack.quantity,
        sellPrice: item.sellPrice,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((left, right) => {
      const quantityDelta = right.quantity - left.quantity;
      if (quantityDelta !== 0) {
        return quantityDelta;
      }
      return left.sellPrice - right.sellPrice || left.itemId.localeCompare(right.itemId);
    });
}

function getDeploymentImpact(episode: {
  becameUnavailable: boolean;
  minDeployableOperatorsDuringEpisode: number;
}): "none" | "reduced" | "blocked" {
  if (!episode.becameUnavailable) {
    return "none";
  }
  return episode.minDeployableOperatorsDuringEpisode < 2 ? "blocked" : "reduced";
}

function detectDeadlock(phase1: Phase1View, phase2: Phase2View): boolean {
  const hasSellableInventory = phase2.inventory.some((stack) => {
    const item = templateRegistry.itemById.get(stack.itemId);
    return Boolean(item && item.sellPrice > 0 && stack.quantity > 0);
  });
  return (
    phase1.resources.cash < MINIMUM_BID_COST &&
    !hasSellableInventory &&
    getDailyGrossIncome(phase1) - getDailyPayroll(phase1) < 0
  );
}

function detectCollapse(phase1: Phase1View): string | null {
  const activeOperators = phase1.operators.filter(
    (operator) => operator.lifecycle.status === "active",
  );
  if (activeOperators.length < 2) {
    return "fewer than two active operators remain";
  }
  return null;
}

function shouldWaitForRecoveryWindow(
  phase1: Phase1View,
  cycle: WorkingCycle | null,
  scenarioProfile: ScenarioProfile,
): boolean {
  if (
    !cycle?.resolved ||
    cycle.index > 3 ||
    cycle.resolvedAtMinute === null ||
    phase1.contractLifecycle !== "resolved"
  ) {
    return false;
  }

  if (getRosterCapableOperatorCount(phase1) >= 2) {
    return false;
  }

  const elapsedRecoveryHours = (phase1.clock.absoluteMinute - cycle.resolvedAtMinute) / 60;
  return elapsedRecoveryHours < SCENARIO_PROFILE_CONFIG[scenarioProfile].recoveryWaitMaxHours;
}

function maybeRecordUpgradeAffordability(
  run: EarlyCampaignSimulationRun,
  working: RunWorkingState,
  phase1: Phase1View,
): void {
  if (working.firstIncomeUpgradeAffordableContract === null) {
    const firstIncomeUpgradeId = INCOME_UPGRADE_IDS.find((upgradeId) =>
      getIncomeUpgradeIdsFromView(phase1).includes(upgradeId),
    );
    if (firstIncomeUpgradeId && phase1.resources.cash >= getUpgradeCost(firstIncomeUpgradeId)) {
      working.firstIncomeUpgradeAffordableContract = getCycleOrRunIndex(run, working);
    }
  }

  if (working.allIncomeUpgradesAffordableContract === null) {
    const availableIncomeUpgrades = INCOME_UPGRADE_IDS.filter((upgradeId) =>
      getIncomeUpgradeIdsFromView(phase1).includes(upgradeId),
    );
    if (
      availableIncomeUpgrades.length === INCOME_UPGRADE_IDS.length &&
      INCOME_UPGRADE_IDS.every((upgradeId) => phase1.resources.cash >= getUpgradeCost(upgradeId))
    ) {
      working.allIncomeUpgradesAffordableContract = getCycleOrRunIndex(run, working);
    }
  }
}

function maybeRecordRecruitViability(
  run: EarlyCampaignSimulationRun,
  working: RunWorkingState,
  phase1: Phase1View,
): void {
  const cycleIndex = Math.max(1, getCycleOrRunIndex(run, working));
  if (working.firstRecruitViableContract !== null) {
    return;
  }

  const viability = projectRecruitViability(phase1);
  if (
    !viability ||
    viability.projectedTwoCycleTreasuryFloor <= CRITICAL_TREASURY_FLOOR ||
    viability.payrollIncreasePctOfGross > MAX_RECRUIT_PAYROLL_INCREASE_PCT
  ) {
    return;
  }

  working.firstRecruitViableContract = cycleIndex;
  working.firstRecruitProjectedTwoCycleTreasuryFloor = viability.projectedTwoCycleTreasuryFloor;
  working.firstRecruitPayrollIncreasePctOfGross = viability.payrollIncreasePctOfGross;
}

function maybeRecordRelocationReadiness(
  run: EarlyCampaignSimulationRun,
  working: RunWorkingState,
  phase1: Phase1View,
): void {
  if (working.relocationReadyContract !== null) {
    return;
  }
  const activeOperators = phase1.operators.filter(
    (operator) => operator.lifecycle.status === "active",
  ).length;
  if (
    phase1.resources.reputation >= 40 &&
    getAppliedIncomeUpgradeCount(phase1) >= 3 &&
    activeOperators >= 6 &&
    phase1.resources.cash >= 300
  ) {
    working.relocationReadyContract = getCycleOrRunIndex(run, working);
  }
}

function getCurrentCycleRaidSummaries(
  phase1: Phase1View,
  cycle: Pick<WorkingCycle, "contractSiteId">,
): Phase1View["raidSummaries"] {
  return phase1.raidSummaries.filter((summary) => summary.contractSiteId === cycle.contractSiteId);
}

function observeState(
  simulation: ReturnType<typeof createAscensionSimulation>,
  run: EarlyCampaignSimulationRun,
  working: RunWorkingState,
): { phase1: Phase1View; phase2: Phase2View } {
  const phase1 = simulation.getPhase1View();
  const phase2 = simulation.getPhase2View();
  const currentMinute = phase1.clock.absoluteMinute;
  const raidingOperatorIds = getRaidingOperatorIds(phase1);
  const deployableOperators = getRosterCapableOperatorCount(phase1, raidingOperatorIds);

  maybeRecordUpgradeAffordability(run, working, phase1);
  maybeRecordRecruitViability(run, working, phase1);
  maybeRecordRelocationReadiness(run, working, phase1);

  phase1.operators.forEach((operator) => {
    const operatorRosterCapable = operator.availableForRaid || raidingOperatorIds.has(operator.id);
    const previous = working.previousOperators.get(operator.id);
    if ((!previous || previous.severity === 0) && operator.injury.severity > 0) {
      working.openInjuryEpisodes.set(operator.id, {
        operatorId: operator.id,
        operatorName: operator.identity.name,
        contractIndex: getCycleOrRunIndex(run, working),
        startedAtMinute: currentMinute,
        peakSeverity: operator.injury.severity,
        becameUnavailable: !operatorRosterCapable,
        minDeployableOperatorsDuringEpisode: deployableOperators,
        maxDeployableOperatorsDuringEpisode: deployableOperators,
        observedTicks: 0,
      });
    }

    const episode = working.openInjuryEpisodes.get(operator.id);
    if (episode) {
      episode.observedTicks += 1;
      episode.peakSeverity = Math.max(episode.peakSeverity, operator.injury.severity);
      if (episode.observedTicks >= 2) {
        episode.becameUnavailable = episode.becameUnavailable || !operatorRosterCapable;
        episode.minDeployableOperatorsDuringEpisode = Math.min(
          episode.minDeployableOperatorsDuringEpisode,
          deployableOperators,
        );
        episode.maxDeployableOperatorsDuringEpisode = Math.max(
          episode.maxDeployableOperatorsDuringEpisode,
          deployableOperators,
        );
      }
      if (operator.injury.severity <= 0 || operator.lifecycle.status !== "active") {
        const stabilizedDeployableOperators =
          episode.observedTicks >= 2
            ? episode.minDeployableOperatorsDuringEpisode
            : deployableOperators;
        const stabilizedMaxDeployableOperators =
          episode.observedTicks >= 2
            ? episode.maxDeployableOperatorsDuringEpisode
            : deployableOperators;
        working.injuryEpisodes.push({
          operatorId: episode.operatorId,
          operatorName: episode.operatorName,
          contractIndex: episode.contractIndex,
          startedAtMinute: episode.startedAtMinute,
          endedAtMinute: currentMinute,
          durationHours: round2((currentMinute - episode.startedAtMinute) / 60),
          peakSeverity: episode.peakSeverity,
          band: getInjuryBand(episode.peakSeverity),
          deploymentImpact: getDeploymentImpact({
            becameUnavailable: episode.becameUnavailable,
            minDeployableOperatorsDuringEpisode: stabilizedDeployableOperators,
          }),
          minDeployableOperatorsDuringEpisode: stabilizedDeployableOperators,
          maxDeployableOperatorsDuringEpisode: stabilizedMaxDeployableOperators,
        });
        working.openInjuryEpisodes.delete(operator.id);
      }
    }

    working.previousOperators.set(operator.id, {
      severity: operator.injury.severity,
      lifecycleStatus: operator.lifecycle.status,
    });
  });

  if (working.currentCycle) {
    working.currentCycle.minTreasury = Math.min(
      working.currentCycle.minTreasury,
      phase1.resources.cash,
    );
    working.currentCycle.maxTreasury = Math.max(
      working.currentCycle.maxTreasury,
      phase1.resources.cash,
    );
    working.currentCycle.minDeployableOperators = Math.min(
      working.currentCycle.minDeployableOperators,
      deployableOperators,
    );
    working.currentCycle.maxInjurySeverity = Math.max(
      working.currentCycle.maxInjurySeverity,
      ...phase1.operators.map((operator) => operator.injury.severity),
    );
  }

  if (
    working.currentCycle &&
    !working.currentCycle.bossContacted &&
    (phase1.activeInterruption?.type === "raid_boss_commitment" ||
      simulation.runtimeState.activeEncounter !== null)
  ) {
    working.currentCycle.bossContacted = true;
    if (working.firstBossContactContract === null) {
      working.firstBossContactContract = working.currentCycle.index;
    }
  }

  if (
    working.currentCycle &&
    !working.currentCycle.resolved &&
    phase1.contractLifecycle === "resolved" &&
    phase1.contractResult
  ) {
    const raidOutcomes = getCurrentCycleRaidSummaries(phase1, working.currentCycle).map(
      (summary) => summary.result as CycleOutcome,
    );
    working.currentCycle.outcome = classifyCycleOutcome(phase1.contractResult, raidOutcomes);
    working.currentCycle.raidOutcomes = [...raidOutcomes];
    working.currentCycle.raidCount = phase1.contractResult.totalRaids;
    working.currentCycle.operatorDeaths = phase1.contractResult.operatorDeaths;
    working.currentCycle.bossCleared = phase1.contractResult.outcome === "boss_defeated";
    if (working.currentCycle.bossCleared) {
      working.currentCycle.bossContacted = true;
      if (working.firstBossContactContract === null) {
        working.firstBossContactContract = working.currentCycle.index;
      }
    }
    working.currentCycle.resolved = true;
    working.currentCycle.resolvedAtMinute = currentMinute;
    if (working.currentCycle.bossCleared && working.firstBossClearContract === null) {
      working.firstBossClearContract = working.currentCycle.index;
    }
  }

  if (detectDeadlock(phase1, phase2)) {
    working.deadlocked = true;
  }

  phase1.raidSummaries.forEach((summary) => {
    if (working.countedRaidSummaryIds.has(summary.id)) {
      return;
    }
    working.countedRaidSummaryIds.add(summary.id);
    run.totalTreatmentSpend += Math.max(0, summary.treatmentCost ?? 0);
  });

  const collapseReason = detectCollapse(phase1);
  if (collapseReason) {
    working.collapsed = true;
    working.collapseReason = collapseReason;
  }

  const progressSignature = [
    run.completedContracts,
    working.currentCycle?.index ?? 0,
    phase1.contractLifecycle,
    phase1.clock.absoluteMinute,
    phase1.resources.cash,
    phase1.resources.reputation,
    phase1.activeRaids.length,
    phase1.raidSummaries.length,
    phase1.visitors.length,
    phase1.activeInterruption?.instanceId ?? "",
    simulation.runtimeState.guidanceState.activeBeatId ?? "",
    simulation.runtimeState.activeEncounter?.status ?? "",
  ].join("|");

  if (progressSignature === working.lastProgressSignature) {
    working.stagnantIterations += 1;
  } else {
    working.lastProgressSignature = progressSignature;
    working.stagnantIterations = 0;
  }

  if (working.stagnantIterations >= 200) {
    working.stalled = true;
    if (!working.collapseReason) {
      working.collapseReason = "simulation stopped making progress";
    }
  }

  return { phase1, phase2 };
}

function flushSimulation(simulation: ReturnType<typeof createAscensionSimulation>): void {
  simulation.tick(0);
}

function finalizeCurrentCycle(
  run: EarlyCampaignSimulationRun,
  working: RunWorkingState,
  phase1: Phase1View,
): void {
  if (!working.currentCycle || !working.currentCycle.resolved) {
    return;
  }

  const cycle = working.currentCycle;
  cycle.endMinute = phase1.clock.absoluteMinute;
  cycle.durationHours = round2((cycle.endMinute - cycle.startMinute) / 60);
  cycle.endTreasury = phase1.resources.cash;
  cycle.endReputation = phase1.resources.reputation;
  cycle.rawNetTreasury = round2(cycle.endTreasury - cycle.startTreasury);
  cycle.operatingNetTreasury = round2(cycle.rawNetTreasury + cycle.upgradeSpend);

  run.contractCycles.push({
    index: cycle.index,
    postingId: cycle.postingId,
    contractSiteId: cycle.contractSiteId,
    missionId: cycle.missionId,
    missionName: cycle.missionName,
    siteConceptId: cycle.siteConceptId,
    outcome: cycle.outcome,
    startMinute: cycle.startMinute,
    endMinute: cycle.endMinute,
    durationHours: cycle.durationHours,
    startTreasury: cycle.startTreasury,
    endTreasury: cycle.endTreasury,
    minTreasury: cycle.minTreasury,
    maxTreasury: cycle.maxTreasury,
    rawNetTreasury: cycle.rawNetTreasury,
    operatingNetTreasury: cycle.operatingNetTreasury,
    upgradeSpend: cycle.upgradeSpend,
    lootSoldCash: cycle.lootSoldCash,
    incidentCashDelta: cycle.incidentCashDelta,
    recruitAcceptances: cycle.recruitAcceptances,
    recruitRejections: cycle.recruitRejections,
    startReputation: cycle.startReputation,
    endReputation: cycle.endReputation,
    raidOutcomes: [...cycle.raidOutcomes],
    raidCount: cycle.raidCount,
    bossContacted: cycle.bossContacted,
    bossCleared: cycle.bossCleared,
    operatorDeaths: cycle.operatorDeaths,
    minDeployableOperators: cycle.minDeployableOperators,
    maxInjurySeverity: cycle.maxInjurySeverity,
    dailyPayrollAtStart: cycle.dailyPayrollAtStart,
    dailyGrossIncomeAtStart: cycle.dailyGrossIncomeAtStart,
    payrollBurdenAtStartPct: cycle.payrollBurdenAtStartPct,
  });
  run.completedContracts = run.contractCycles.length;
  if (cycle.index === 3 && working.treasuryAfterThreeContracts === null) {
    working.treasuryAfterThreeContracts = cycle.endTreasury;
    working.deployableOperatorsAfterThreeContracts = getRosterCapableOperatorCount(phase1);
  }
  working.currentCycle = null;
}

function createThresholdCheck(
  status: ThresholdStatus,
  measured: number | null,
  target: string,
  detail: string,
): z.infer<typeof thresholdCheckSchema> {
  return { status, measured, target, detail };
}

function evaluateBoundedMetric(
  value: number | null,
  options: {
    passMin?: number;
    passMax?: number;
    failMin?: number;
    failMax?: number;
    target: string;
    detail: string;
  },
): z.infer<typeof thresholdCheckSchema> {
  if (value === null || Number.isNaN(value)) {
    return createThresholdCheck("not_measurable", null, options.target, options.detail);
  }

  if (options.failMin !== undefined && value < options.failMin) {
    return createThresholdCheck("fail", round2(value), options.target, options.detail);
  }
  if (options.failMax !== undefined && value > options.failMax) {
    return createThresholdCheck("fail", round2(value), options.target, options.detail);
  }
  if (
    (options.passMin === undefined || value >= options.passMin) &&
    (options.passMax === undefined || value <= options.passMax)
  ) {
    return createThresholdCheck("pass", round2(value), options.target, options.detail);
  }
  return createThresholdCheck("out_of_band", round2(value), options.target, options.detail);
}

function evaluateRun(run: EarlyCampaignSimulationRun): z.infer<typeof runEvaluationSchema> {
  const successNets = run.contractCycles
    .filter((cycle) => cycle.outcome === "success")
    .map((cycle) => cycle.operatingNetTreasury);
  const mixedNets = run.contractCycles
    .filter((cycle) => cycle.outcome === "mixed")
    .map((cycle) => cycle.operatingNetTreasury);
  const failureNets = run.contractCycles
    .filter((cycle) => cycle.outcome === "failure")
    .map((cycle) => cycle.operatingNetTreasury);

  const openingBurdens = run.contractCycles
    .filter((cycle) => cycle.index >= 1 && cycle.index <= 3)
    .map((cycle) => cycle.payrollBurdenAtStartPct);
  const midBurdens = run.contractCycles
    .filter((cycle) => cycle.index >= 4 && cycle.index <= 6)
    .map((cycle) => cycle.payrollBurdenAtStartPct);
  const lateBurdens = run.contractCycles
    .filter((cycle) => cycle.index >= 7 && cycle.index <= 8)
    .map((cycle) => cycle.payrollBurdenAtStartPct);

  const openingInjuries = run.injuries.filter((episode) => episode.contractIndex <= 3);

  const minorInjuryDurations = openingInjuries
    .filter((episode) => episode.band === "minor")
    .map((episode) => episode.durationHours);
  const moderateOrSevereEpisodes = openingInjuries.filter(
    (episode) => episode.band === "moderate" || episode.band === "severe",
  );

  const m1Checks = {
    success_cycle_net: evaluateBoundedMetric(average(successNets), {
      passMin: 100,
      failMin: 70,
      target: ">= +100 operating net for success cycles",
      detail: "Average successful contract-cycle operating net.",
    }),
    mixed_cycle_net: evaluateBoundedMetric(average(mixedNets), {
      passMin: 20,
      failMin: -10,
      target: ">= +20 operating net for mixed cycles",
      detail: "Average mixed contract-cycle operating net.",
    }),
    failure_cycle_net: evaluateBoundedMetric(average(failureNets), {
      passMin: -90,
      failMin: -120,
      target: ">= -90 operating net for failure cycles",
      detail: "Average failed contract-cycle operating net.",
    }),
    mean_cycle_net: evaluateBoundedMetric(
      average(run.contractCycles.map((cycle) => cycle.operatingNetTreasury)),
      {
        passMin: 40,
        failMin: 0,
        target: ">= +40 mean operating net across the opening arc",
        detail: "Average operating net per resolved cycle.",
      },
    ),
  };

  const m2Checks = {
    opening_payroll_burden: evaluateBoundedMetric(average(openingBurdens), {
      passMin: 130,
      passMax: 180,
      failMin: 100,
      failMax: 200,
      target: "130%-180% opening payroll burden",
      detail: "Daily payroll divided by daily gross income over contracts 1-3.",
    }),
    mid_payroll_burden: evaluateBoundedMetric(average(midBurdens), {
      passMin: 110,
      passMax: 165,
      failMax: 185,
      target: "110%-165% mid-arc payroll burden",
      detail: "Daily payroll divided by daily gross income over contracts 4-6.",
    }),
    late_payroll_burden: evaluateBoundedMetric(average(lateBurdens), {
      passMin: 100,
      passMax: 155,
      failMax: 175,
      target: "100%-155% late-arc payroll burden",
      detail: "Daily payroll divided by daily gross income over contracts 7-8.",
    }),
  };

  const m3Checks = {
    first_affordable: evaluateBoundedMetric(run.firstIncomeUpgradeAffordableContract, {
      passMin: 2,
      passMax: 4,
      failMax: 5,
      target: "first income upgrade affordable in contracts 2-4",
      detail: "Earliest point treasury can cover the cheapest income upgrade.",
    }),
    first_purchased: evaluateBoundedMetric(run.firstIncomeUpgradePurchasedContract, {
      passMin: 3,
      passMax: 5,
      failMax: 6,
      target: "first income upgrade purchased in contracts 3-5",
      detail: "Measured from the deterministic purchase log.",
    }),
    all_income_upgrades_affordable:
      run.allIncomeUpgradesAffordableContract === null
        ? createThresholdCheck(
            "not_measurable",
            null,
            "all 3 income upgrades affordable in contracts 8-15",
            "The 8-cycle harness window ended before all 3 income upgrades were jointly affordable.",
          )
        : run.allIncomeUpgradesAffordableContract < 6
          ? createThresholdCheck(
              "out_of_band",
              run.allIncomeUpgradesAffordableContract,
              "all 3 income upgrades affordable in contracts 8-15",
              "All three income upgrades became affordable materially earlier than the target skilled window.",
            )
          : evaluateBoundedMetric(run.allIncomeUpgradesAffordableContract, {
              passMin: 8,
              passMax: 15,
              failMax: 20,
              target: "all 3 income upgrades affordable in contracts 8-15",
              detail: "Compared against the skilled-scenario pacing target.",
            }),
  };

  const m4Checks = {
    first_recruit_affordable: evaluateBoundedMetric(run.firstRecruitViableContract, {
      passMax: 3,
      failMax: 4,
      target: "first recruit economically viable by contract 3",
      detail: "Uses the first viable recruit timing under the canonical-path harness policy.",
    }),
    payroll_increase_pct: evaluateBoundedMetric(run.firstRecruitPayrollIncreasePctOfGross, {
      passMax: 20,
      target: "<= 20% gross-income payroll increase per recruit",
      detail:
        "Daily payroll increase from one operator divided by gross income at first viable timing.",
    }),
    post_recruit_treasury_floor: (() => {
      if (
        run.firstRecruitProjectedTwoCycleTreasuryFloor === null ||
        run.firstRecruitViableContract === null
      ) {
        return createThresholdCheck(
          "not_measurable",
          null,
          "> $50 treasury floor over two cycles after first recruit",
          "No recruit became economically viable during this run.",
        );
      }
      return evaluateBoundedMetric(run.firstRecruitProjectedTwoCycleTreasuryFloor, {
        passMin: 50.01,
        failMin: 50,
        target: "> $50 treasury floor over two cycles after first recruit",
        detail: "Uses the projected two-cycle treasury floor at the first recruit-viable moment.",
      });
    })(),
  };

  const m5Checks = {
    minor_recovery:
      minorInjuryDurations.length === 0
        ? createThresholdCheck(
            "not_measurable",
            null,
            "minor injuries recover in under one full cycle",
            "No opening-window minor injury episodes were observed in this run.",
          )
        : evaluateBoundedMetric(Math.max(...minorInjuryDurations), {
            passMax: 24,
            failMax: 24.01,
            target: "< 24 hours recovery for minor injuries",
            detail:
              "Uses opening-window elapsed in-sim hours as the closest measurable proxy for one contract cycle.",
          }),
    moderate_deployability:
      moderateOrSevereEpisodes.length === 0
        ? createThresholdCheck(
            "not_measurable",
            null,
            "one moderate injury still leaves a deployable team",
            "No opening-window moderate or severe injury episodes were observed in this run.",
          )
        : evaluateBoundedMetric(
            Math.min(
              ...moderateOrSevereEpisodes.map(
                (episode) => episode.maxDeployableOperatorsDuringEpisode,
              ),
            ),
            {
              passMin: 2,
              failMin: 2,
              target: ">= 2 deployable operators during moderate-or-worse injury pressure",
              detail:
                "Checks whether the runtime's deployable roster can still field a viable team while opening-window moderate/severe injuries are active.",
            },
          ),
    concurrent_moderate_lock: (() => {
      const blockedEpisode = run.injuries.find(
        (episode) =>
          episode.contractIndex <= 3 &&
          episode.band === "moderate" &&
          episode.maxDeployableOperatorsDuringEpisode < 2,
      );
      return blockedEpisode
        ? createThresholdCheck(
            "fail",
            blockedEpisode.maxDeployableOperatorsDuringEpisode,
            "no complete deployment lock from concurrent moderate injuries",
            "An opening-window moderate injury episode drove deployable operators below the minimum viable team size.",
          )
        : createThresholdCheck(
            "pass",
            0,
            "no complete deployment lock from concurrent moderate injuries",
            "No opening-window moderate injury episode produced a deployment-blocked state.",
          );
    })(),
  };

  const m6Checks = {
    deadlock: createThresholdCheck(
      run.deadlocked ? "fail" : "pass",
      run.deadlocked ? 1 : 0,
      "no deadlock state during the opening arc",
      "Deadlock is treasury < $7, no sellable inventory, and daily net cash below zero.",
    ),
    collapse: createThresholdCheck(
      run.collapsed ? "fail" : "pass",
      run.collapsed ? 1 : 0,
      "no collapse state during the opening arc",
      run.collapseReason ?? "No collapse state was observed.",
    ),
  };

  const m7Checks = {
    treasury_after_three_contracts: evaluateBoundedMetric(run.treasuryAfterThreeContracts, {
      passMin: 50.01,
      failMin: 50,
      target: "> $50 treasury after three contracts",
      detail: "Opening viability treasury floor after the third resolved contract cycle.",
    }),
    deployable_after_three_contracts: evaluateBoundedMetric(
      run.deployableOperatorsAfterThreeContracts,
      {
        passMin: 2,
        failMin: 2,
        target: ">= 2 deployable operators after three contracts",
        detail: "Opening viability roster floor after the third resolved contract cycle.",
      },
    ),
  };

  const m8Checks = {
    relocation_readiness:
      run.relocationReadyContract === null
        ? createThresholdCheck(
            "not_measurable",
            null,
            "relocation readiness in the 15-20 skilled window",
            "The 8-contract Phase 3 harness window does not extend far enough to validate relocation pacing.",
          )
        : run.relocationReadyContract < 12
          ? createThresholdCheck(
              "out_of_band",
              run.relocationReadyContract,
              "relocation readiness in the 15-20 skilled window",
              "Relocation readiness arrived earlier than the design gate expects.",
            )
          : createThresholdCheck(
              "pass",
              run.relocationReadyContract,
              "relocation readiness in the 15-20 skilled window",
              "Relocation readiness landed within or beyond the earliest target gate.",
            ),
  };

  return {
    m1TreasuryFlow: {
      overall: combineStatuses(Object.values(m1Checks).map((check) => check.status)),
      checks: m1Checks,
    },
    m2PayrollBurden: {
      overall: combineStatuses(Object.values(m2Checks).map((check) => check.status)),
      checks: m2Checks,
    },
    m3UpgradeTiming: {
      overall: combineStatuses(Object.values(m3Checks).map((check) => check.status)),
      checks: m3Checks,
    },
    m4RecruitAcceptance: {
      overall: combineStatuses(Object.values(m4Checks).map((check) => check.status)),
      checks: m4Checks,
    },
    m5CasualtyPressure: {
      overall: combineStatuses(Object.values(m5Checks).map((check) => check.status)),
      checks: m5Checks,
    },
    m6DeadlockRate: {
      overall: combineStatuses(Object.values(m6Checks).map((check) => check.status)),
      checks: m6Checks,
    },
    m7OpeningStability: {
      overall: combineStatuses(Object.values(m7Checks).map((check) => check.status)),
      checks: m7Checks,
    },
    m8RelocationPacing: {
      overall: combineStatuses(Object.values(m8Checks).map((check) => check.status)),
      checks: m8Checks,
    },
  };
}

async function simulateSingleRun(
  seed: number,
  scenarioProfile: ScenarioProfile,
  options: Required<SimulationOptions>,
): Promise<EarlyCampaignSimulationRun> {
  const snapshot = createNewGameWorldSnapshot(templateRegistry, undefined, { seed });
  snapshot.policies = normalizePolicyState(options.policyState);
  const simulation = createAscensionSimulation(snapshot, templateRegistry, {
    simulationSeed: seed,
  });

  const run: EarlyCampaignSimulationRun = {
    seed,
    scenarioProfile,
    inferredScenario: "average",
    completedContracts: 0,
    contractCycles: [],
    incidents: [],
    recruits: [],
    upgrades: [],
    injuries: [],
    outcomeCounts: { success: 0, mixed: 0, failure: 0 },
    firstIncomeUpgradeAffordableContract: null,
    firstIncomeUpgradePurchasedContract: null,
    allIncomeUpgradesAffordableContract: null,
    firstRecruitViableContract: null,
    firstRecruitProjectedTwoCycleTreasuryFloor: null,
    firstRecruitPayrollIncreasePctOfGross: null,
    firstRecruitAcceptedContract: null,
    firstBossContactContract: null,
    firstBossClearContract: null,
    relocationReadyContract: null,
    finalTreasury: 0,
    finalReputation: 0,
    totalLootSoldCash: 0,
    totalUpgradeSpend: 0,
    totalIncidentCashDelta: 0,
    totalTreatmentSpend: 0,
    treasuryAfterThreeContracts: null,
    deployableOperatorsAfterThreeContracts: null,
    unsafeIncidentsInFirstThreeContracts: 0,
    deadlocked: false,
    collapsed: false,
    stalled: false,
    collapseReason: null,
    evaluation: {
      m1TreasuryFlow: { overall: "not_measurable", checks: {} },
      m2PayrollBurden: { overall: "not_measurable", checks: {} },
      m3UpgradeTiming: { overall: "not_measurable", checks: {} },
      m4RecruitAcceptance: { overall: "not_measurable", checks: {} },
      m5CasualtyPressure: { overall: "not_measurable", checks: {} },
      m6DeadlockRate: { overall: "not_measurable", checks: {} },
      m7OpeningStability: { overall: "not_measurable", checks: {} },
      m8RelocationPacing: { overall: "not_measurable", checks: {} },
    },
  };

  const working: RunWorkingState = {
    pendingCycleStart: null,
    currentCycle: null,
    injuryEpisodes: [],
    openInjuryEpisodes: new Map(),
    previousOperators: new Map(),
    unsafeIncidentsInFirstThreeContracts: 0,
    firstIncomeUpgradeAffordableContract: null,
    firstIncomeUpgradePurchasedContract: null,
    allIncomeUpgradesAffordableContract: null,
    firstRecruitViableContract: null,
    firstRecruitProjectedTwoCycleTreasuryFloor: null,
    firstRecruitPayrollIncreasePctOfGross: null,
    firstRecruitAcceptedContract: null,
    firstBossContactContract: null,
    firstBossClearContract: null,
    relocationReadyContract: null,
    treasuryAfterThreeContracts: null,
    deployableOperatorsAfterThreeContracts: null,
    deadlocked: false,
    collapsed: false,
    stalled: false,
    collapseReason: null,
    lastProgressSignature: null,
    stagnantIterations: 0,
    countedRaidSummaryIds: new Set(),
  };

  simulation.tick(60_000);
  observeState(simulation, run, working);

  for (let iteration = 0; iteration < 10_000; iteration += 1) {
    const { phase1, phase2 } = observeState(simulation, run, working);
    const guidanceState = simulation.runtimeState.guidanceState;
    const preferFirstIncidentChoice =
      guidanceState.activeBeatId === "guidance/opening/first-incident";
    const activeOperators = phase1.operators.filter(
      (operator) => operator.lifecycle.status === "active",
    );
    const majorRosterPressure =
      activeOperators.length < 4 ||
      activeOperators.some((operator) => operator.injury.severity >= 40);
    if (
      run.completedContracts >= options.contractLimit ||
      working.deadlocked ||
      working.collapsed ||
      working.stalled
    ) {
      break;
    }

    if (simulation.runtimeState.activeEncounter) {
      const encounter = simulation.runtimeState.activeEncounter;
      if (["victory", "wipe", "retreat", "forced_abort"].includes(encounter.status)) {
        simulation.dispatch({ type: "sim/encounter-dismiss" });
      } else {
        simulation.dispatch({ type: "sim/encounter-step" });
      }
      continue;
    }

    if (phase1.activeInterruption) {
      if (phase1.activeInterruption.type === "guidance") {
        simulation.dispatch({
          type: "sim/interruption-resolve",
          instanceId: phase1.activeInterruption.instanceId,
        });
        continue;
      }

      if (
        phase1.activeInterruption.type === "incident" &&
        phase1.activeInterruption.payload.kind === "incident"
      ) {
        const decision = chooseIncidentChoice(phase1.activeInterruption.payload, {
          preferFirstChoice: preferFirstIncidentChoice,
          scenarioProfile,
        });
        if (decision) {
          run.incidents.push({
            contractIndex: getCycleOrRunIndex(run, working),
            minute: phase1.clock.absoluteMinute,
            templateId: phase1.activeInterruption.payload.templateId,
            templateName: decision.templateName,
            category: decision.category,
            choiceId: decision.choiceId,
            choiceLabel: decision.choiceLabel,
            treasuryDelta: decision.treasuryDelta,
            openingSafeCategory: OPENING_SAFE_INCIDENT_CATEGORIES.includes(
              decision.category as (typeof OPENING_SAFE_INCIDENT_CATEGORIES)[number],
            ),
          });
          if (
            getCycleOrRunIndex(run, working) <= 3 &&
            !OPENING_SAFE_INCIDENT_CATEGORIES.includes(
              decision.category as (typeof OPENING_SAFE_INCIDENT_CATEGORIES)[number],
            )
          ) {
            working.unsafeIncidentsInFirstThreeContracts += 1;
          }
          if (working.currentCycle) {
            working.currentCycle.incidentCashDelta += decision.treasuryDelta;
          }
          run.totalIncidentCashDelta += decision.treasuryDelta;
          simulation.dispatch({
            type: "sim/interruption-resolve",
            instanceId: phase1.activeInterruption.instanceId,
            choiceId: decision.choiceId,
          });
          continue;
        }
      }

      if (phase1.activeInterruption.type === "raid_boss_commitment") {
        if (working.currentCycle && !working.currentCycle.bossContacted) {
          working.currentCycle.bossContacted = true;
        }
        if (working.firstBossContactContract === null && working.currentCycle) {
          working.firstBossContactContract = working.currentCycle.index;
        }
        simulation.dispatch({
          type: "sim/interruption-resolve",
          instanceId: phase1.activeInterruption.instanceId,
          choiceId: "commit",
        });
        continue;
      }
    }

    const activeBeatId = guidanceState.activeBeatId;
    const activeBeatView = guidanceState.activeBeatView;
    if (activeBeatId && activeBeatView?.completionKind === "acknowledged") {
      simulation.dispatch({
        type: "sim/guidance-complete",
        beatId: activeBeatId,
        signal: "acknowledged",
      });
      continue;
    }
    if (activeBeatId === "guidance/opening/bodega-overview") {
      simulation.dispatch({
        type: "sim/guidance-complete",
        beatId: activeBeatId,
        signal: "room_inspected",
      });
      continue;
    }
    if (activeBeatId === "guidance/opening/roster-and-equip") {
      simulation.dispatch({
        type: "sim/guidance-complete",
        beatId: activeBeatId,
        signal: "operator_inspected",
      });
      continue;
    }
    if (activeBeatId === "guidance/opening/first-team-departure" && phase1.activeRaids.length > 0) {
      simulation.dispatch({
        type: "sim/guidance-complete",
        beatId: activeBeatId,
        signal: "team_departed",
      });
      continue;
    }
    if (activeBeatId === "guidance/opening/loot-and-market") {
      simulation.dispatch({
        type: "sim/guidance-complete",
        beatId: activeBeatId,
        signal: "market_opened",
      });
      continue;
    }

    const sellableLoot = getSellableLoot(phase2);
    if (sellableLoot.length > 0 && phase1.contractLifecycle !== "active") {
      const stack = sellableLoot[0];
      const saleValue = stack.quantity * stack.sellPrice;
      if (working.currentCycle) {
        working.currentCycle.lootSoldCash += saleValue;
      }
      run.totalLootSoldCash += saleValue;
      simulation.dispatch({
        type: "sim/sell-item",
        itemId: stack.itemId,
        quantity: stack.quantity,
      });
      continue;
    }

    if (
      phase1.contractLifecycle === "bidding" &&
      !phase1.postedContracts.some((posting) => posting.canBid)
    ) {
      const liquidationStack = getEmergencySellableInventory(phase2)[0];
      if (liquidationStack) {
        const quantityToSell = liquidationStack.quantity > 1 ? liquidationStack.quantity - 1 : 1;
        simulation.dispatch({
          type: "sim/sell-item",
          itemId: liquidationStack.itemId,
          quantity: quantityToSell,
        });
        continue;
      }
    }

    if (
      (activeBeatId === "guidance/opening/staffing-and-rooms" ||
        guidanceState.completedBeatIds.includes("guidance/opening/loot-and-market")) &&
      phase1.rooms.some(
        (room) => room.id === "room-instance/supply_closet" && !room.isRequestedActive,
      )
    ) {
      simulation.dispatch({
        type: "sim/set-room-active",
        roomId: "room-instance/supply_closet",
        isActive: true,
      });
      flushSimulation(simulation);
      continue;
    }

    const boris = phase1.staff.find((staff) => staff.id === "staff/boris");
    if (
      (activeBeatId === "guidance/opening/staffing-and-rooms" ||
        guidanceState.completedBeatIds.includes("guidance/opening/loot-and-market")) &&
      boris &&
      (boris.assignment.kind !== "room" ||
        boris.assignment.targetId !== "room-instance/supply_closet")
    ) {
      simulation.dispatch({
        type: "sim/assign-staff",
        staffId: "staff/boris",
        roomId: "room-instance/supply_closet",
      });
      flushSimulation(simulation);
      continue;
    }

    if (
      activeBeatId === "guidance/opening/first-upgrade" &&
      working.firstIncomeUpgradePurchasedContract === null
    ) {
      const upgradeAction = chooseUpgradeAction(phase1, {
        guidedOnly: false,
        preferredUpgradeId: GUIDED_FIRST_UPGRADE_ID,
        scenarioProfile,
        completedContracts: run.completedContracts,
      });
      if (upgradeAction) {
        const cost = getUpgradeCost(upgradeAction.upgradeId);
        const upgradeName =
          templateRegistry.upgradeById.get(upgradeAction.upgradeId)?.name ??
          upgradeAction.upgradeId;
        run.upgrades.push({
          contractIndex: getCycleOrRunIndex(run, working),
          minute: phase1.clock.absoluteMinute,
          upgradeId: upgradeAction.upgradeId,
          upgradeName,
          cost,
        });
        if (working.currentCycle) {
          working.currentCycle.upgradeSpend += cost;
        }
        run.totalUpgradeSpend += cost;
        if (working.firstIncomeUpgradePurchasedContract === null) {
          working.firstIncomeUpgradePurchasedContract = getCycleOrRunIndex(run, working);
        }
        simulation.dispatch(upgradeAction);
        flushSimulation(simulation);
        continue;
      }
    }

    if (phase1.contractLifecycle !== "active") {
      const recruitDecision = chooseRecruitDecision(phase1, run, {
        hasAcceptedRecruit: working.firstRecruitAcceptedContract !== null,
        majorRosterPressure,
        scenarioProfile,
      });
      const visitor =
        phase1.visitors.find((entry) => entry.id === recruitDecision?.visitorId) ?? null;
      if (recruitDecision && visitor) {
        run.recruits.push({
          contractIndex: getCycleOrRunIndex(run, working),
          minute: phase1.clock.absoluteMinute,
          visitorId: visitor.id,
          visitorName: visitor.name,
          desiredRoleTag: visitor.desiredRoleTag,
          accepted: recruitDecision.accepted,
          projectedTwoCycleTreasuryFloor: recruitDecision.projectedTwoCycleTreasuryFloor,
          payrollIncreasePctOfGross: recruitDecision.payrollIncreasePctOfGross,
        });
        if (recruitDecision.accepted) {
          if (working.currentCycle) {
            working.currentCycle.recruitAcceptances += 1;
          }
          if (working.firstRecruitAcceptedContract === null) {
            working.firstRecruitAcceptedContract = getCycleOrRunIndex(run, working);
          }
          simulation.dispatch({
            type: "sim/accept-recruit",
            visitorId: recruitDecision.visitorId,
          });
        } else {
          if (working.currentCycle) {
            working.currentCycle.recruitRejections += 1;
          }
          simulation.dispatch({
            type: "sim/reject-recruit",
            visitorId: recruitDecision.visitorId,
          });
        }
        continue;
      }
    }

    if (phase1.contractLifecycle === "resolved") {
      if (shouldWaitForRecoveryWindow(phase1, working.currentCycle, scenarioProfile)) {
        simulation.tick(options.tickMinutes * 60 * 1000);
        continue;
      }
      simulation.dispatch({ type: "sim/advance-contract" });
      continue;
    }

    if (phase1.contractLifecycle === "bidding") {
      finalizeCurrentCycle(run, working, phase1);
      if (run.completedContracts >= options.contractLimit) {
        break;
      }

      const posting = choosePostedContract(phase1, {
        preferBoardOrder: activeBeatId === FIRST_CONTRACT_CHOICE_BEAT_ID,
        scenarioProfile,
      });
      if (posting) {
        working.pendingCycleStart = {
          index: run.completedContracts + 1,
          postingId: posting.postingId,
          missionId: posting.missionId,
          missionName:
            templateRegistry.missionById.get(posting.missionId)?.name ?? posting.missionId,
          siteConceptId: posting.siteConceptId,
          startMinute: phase1.clock.absoluteMinute,
          startTreasury: phase1.resources.cash,
          startReputation: phase1.resources.reputation,
          dailyPayrollAtStart: getDailyPayroll(phase1),
          dailyGrossIncomeAtStart: getDailyGrossIncome(phase1),
          payrollBurdenAtStartPct: getPayrollBurdenPct(phase1),
        };
        simulation.dispatch({
          type: "sim/bid-contract",
          postingId: posting.postingId,
        });
        const afterBid = simulation.getPhase1View();
        if (
          afterBid.contractLifecycle === "active" &&
          afterBid.contractSite &&
          working.pendingCycleStart
        ) {
          const start = working.pendingCycleStart;
          working.currentCycle = {
            index: start.index,
            postingId: start.postingId,
            contractSiteId: afterBid.contractSite.contractSiteId,
            missionId: start.missionId,
            missionName: start.missionName,
            siteConceptId: start.siteConceptId,
            outcome: "mixed",
            startMinute: start.startMinute,
            endMinute: start.startMinute,
            durationHours: 0,
            startTreasury: start.startTreasury,
            endTreasury: start.startTreasury,
            minTreasury: start.startTreasury,
            maxTreasury: start.startTreasury,
            rawNetTreasury: 0,
            operatingNetTreasury: 0,
            upgradeSpend: 0,
            lootSoldCash: 0,
            incidentCashDelta: 0,
            recruitAcceptances: 0,
            recruitRejections: 0,
            startReputation: start.startReputation,
            endReputation: start.startReputation,
            raidOutcomes: [],
            raidCount: 0,
            bossContacted: false,
            bossCleared: false,
            operatorDeaths: 0,
            minDeployableOperators: getRosterCapableOperatorCount(afterBid),
            maxInjurySeverity: Math.max(
              ...afterBid.operators.map((operator) => operator.injury.severity),
            ),
            dailyPayrollAtStart: start.dailyPayrollAtStart,
            dailyGrossIncomeAtStart: start.dailyGrossIncomeAtStart,
            payrollBurdenAtStartPct: start.payrollBurdenAtStartPct,
            resolved: false,
            resolvedAtMinute: null,
          };
        }
        working.pendingCycleStart = null;
        continue;
      }
    }

    simulation.tick(options.tickMinutes * 60 * 1000);
  }

  if (
    run.completedContracts < options.contractLimit &&
    !working.deadlocked &&
    !working.collapsed &&
    !working.stalled
  ) {
    working.stalled = true;
    working.collapseReason =
      working.collapseReason ?? "iteration budget exhausted before completion";
  }

  const finalPhase1 = simulation.getPhase1View();
  finalizeCurrentCycle(run, working, finalPhase1);

  for (const episode of working.openInjuryEpisodes.values()) {
    const stabilizedDeployableOperators =
      episode.observedTicks >= 2
        ? episode.minDeployableOperatorsDuringEpisode
        : getRosterCapableOperatorCount(finalPhase1);
    const stabilizedMaxDeployableOperators =
      episode.observedTicks >= 2
        ? episode.maxDeployableOperatorsDuringEpisode
        : getRosterCapableOperatorCount(finalPhase1);
    run.injuries.push({
      operatorId: episode.operatorId,
      operatorName: episode.operatorName,
      contractIndex: episode.contractIndex,
      startedAtMinute: episode.startedAtMinute,
      endedAtMinute: finalPhase1.clock.absoluteMinute,
      durationHours: round2((finalPhase1.clock.absoluteMinute - episode.startedAtMinute) / 60),
      peakSeverity: episode.peakSeverity,
      band: getInjuryBand(episode.peakSeverity),
      deploymentImpact: getDeploymentImpact({
        becameUnavailable: episode.becameUnavailable,
        minDeployableOperatorsDuringEpisode: stabilizedDeployableOperators,
      }),
      minDeployableOperatorsDuringEpisode: stabilizedDeployableOperators,
      maxDeployableOperatorsDuringEpisode: stabilizedMaxDeployableOperators,
    });
  }

  run.injuries.push(...working.injuryEpisodes);
  run.firstIncomeUpgradeAffordableContract = working.firstIncomeUpgradeAffordableContract;
  run.firstIncomeUpgradePurchasedContract = working.firstIncomeUpgradePurchasedContract;
  run.allIncomeUpgradesAffordableContract = working.allIncomeUpgradesAffordableContract;
  run.firstRecruitViableContract = working.firstRecruitViableContract;
  run.firstRecruitProjectedTwoCycleTreasuryFloor =
    working.firstRecruitProjectedTwoCycleTreasuryFloor;
  run.firstRecruitPayrollIncreasePctOfGross = working.firstRecruitPayrollIncreasePctOfGross;
  run.firstRecruitAcceptedContract = working.firstRecruitAcceptedContract;
  run.firstBossContactContract = working.firstBossContactContract;
  run.firstBossClearContract = working.firstBossClearContract;
  run.relocationReadyContract = working.relocationReadyContract;
  run.treasuryAfterThreeContracts = working.treasuryAfterThreeContracts;
  run.deployableOperatorsAfterThreeContracts = working.deployableOperatorsAfterThreeContracts;
  run.unsafeIncidentsInFirstThreeContracts = working.unsafeIncidentsInFirstThreeContracts;
  run.deadlocked = working.deadlocked;
  run.collapsed = working.collapsed;
  run.stalled = working.stalled;
  run.collapseReason = working.collapseReason;
  run.finalTreasury = finalPhase1.resources.cash;
  run.finalReputation = finalPhase1.resources.reputation;

  run.contractCycles.forEach((cycle) => {
    run.outcomeCounts[cycle.outcome] += 1;
  });

  run.inferredScenario = classifyScenario(run.outcomeCounts);
  run.evaluation = evaluateRun(run);
  return earlyCampaignSimulationRunSchema.parse(run);
}

function summarizeProfileRate(
  runs: EarlyCampaignSimulationRun[],
  predicate: (run: EarlyCampaignSimulationRun) => boolean,
): z.infer<typeof aggregateScenarioRateSchema> {
  const byProfile: Record<ScenarioProfile, EarlyCampaignSimulationRun[]> = {
    skilled: [],
    average: [],
    struggling: [],
  };
  runs.forEach((run) => {
    byProfile[run.scenarioProfile].push(run);
  });

  return {
    skilled:
      byProfile.skilled.length === 0
        ? 0
        : round2((byProfile.skilled.filter(predicate).length / byProfile.skilled.length) * 100),
    average:
      byProfile.average.length === 0
        ? 0
        : round2((byProfile.average.filter(predicate).length / byProfile.average.length) * 100),
    struggling:
      byProfile.struggling.length === 0
        ? 0
        : round2(
            (byProfile.struggling.filter(predicate).length / byProfile.struggling.length) * 100,
          ),
  };
}

function formatMetricAggregate(
  label: string,
  aggregate: z.infer<typeof aggregateMetricSchema>,
): string {
  return `- ${label}: ${aggregate.passRate}% pass, ${aggregate.outOfBandRate}% out-of-band, ${aggregate.failRate}% fail, ${aggregate.notMeasurableRate}% n/a`;
}

export async function buildEarlyCampaignSimulationSuite(
  options: SimulationOptions = {},
): Promise<EarlyCampaignSimulationSuite> {
  const resolvedOptions: Required<SimulationOptions> = {
    seedCount: options.seedCount ?? DEFAULT_SEED_COUNT,
    startSeed: options.startSeed ?? DEFAULT_START_SEED,
    contractLimit: options.contractLimit ?? DEFAULT_CONTRACT_LIMIT,
    tickMinutes: options.tickMinutes ?? DEFAULT_TICK_MINUTES,
    policyState: normalizePolicyState(options.policyState),
    scenarioProfiles: [...(options.scenarioProfiles ?? ["skilled"])],
  };

  await deferredSimulationSystemsReady;
  await deferredSimulationGuidanceReady;

  const runs: EarlyCampaignSimulationRun[] = [];
  for (let runIndex = 0; runIndex < resolvedOptions.seedCount; runIndex += 1) {
    const scenarioProfile =
      resolvedOptions.scenarioProfiles[runIndex % resolvedOptions.scenarioProfiles.length];
    const seed =
      resolvedOptions.startSeed + Math.floor(runIndex / resolvedOptions.scenarioProfiles.length);
    runs.push(await simulateSingleRun(seed, scenarioProfile, resolvedOptions));
  }

  const finalTreasuries = runs.map((run) => run.finalTreasury);
  const totalLootSold = runs.map((run) => run.totalLootSoldCash);
  const totalOutcomeCounts = runs.reduce(
    (counts, run) => {
      counts.success += run.outcomeCounts.success;
      counts.mixed += run.outcomeCounts.mixed;
      counts.failure += run.outcomeCounts.failure;
      return counts;
    },
    { success: 0, mixed: 0, failure: 0 },
  );
  const totalCycles = Math.max(
    1,
    totalOutcomeCounts.success + totalOutcomeCounts.mixed + totalOutcomeCounts.failure,
  );
  const firstIncomeAffordableValues = runs
    .map((run) => run.firstIncomeUpgradeAffordableContract)
    .filter((value): value is number => value !== null);
  const firstIncomePurchasedValues = runs
    .map((run) => run.firstIncomeUpgradePurchasedContract)
    .filter((value): value is number => value !== null);
  const firstRecruitViableValues = runs
    .map((run) => run.firstRecruitViableContract)
    .filter((value): value is number => value !== null);
  const firstRecruitAcceptedValues = runs
    .map((run) => run.firstRecruitAcceptedContract)
    .filter((value): value is number => value !== null);
  const firstBossContactValues = runs
    .map((run) => run.firstBossContactContract)
    .filter((value): value is number => value !== null);
  const firstBossClearValues = runs
    .map((run) => run.firstBossClearContract)
    .filter((value): value is number => value !== null);
  const openingPayrollBurdenMean = average(
    runs.flatMap((run) =>
      run.contractCycles
        .filter((cycle) => cycle.index >= 1 && cycle.index <= 3)
        .map((cycle) => cycle.payrollBurdenAtStartPct),
    ),
  );
  const casualtyPressureAggregate = rateForStatus(
    runs,
    (run) => run.evaluation.m5CasualtyPressure.overall,
  );
  const meanRaidCountPerContract = average(
    runs.flatMap((run) => run.contractCycles.map((cycle) => cycle.raidCount)),
  );
  const openingProfileRuns: EarlyCampaignSimulationRun[] = [];
  for (const scenarioProfile of DEFAULT_SCENARIO_PROFILES) {
    for (
      let seed = resolvedOptions.startSeed;
      seed < resolvedOptions.startSeed + OPENING_STABILITY_PROFILE_SEED_COUNT;
      seed += 1
    ) {
      openingProfileRuns.push(
        await simulateSingleRun(seed, scenarioProfile, {
          ...resolvedOptions,
          contractLimit: 3,
        }),
      );
    }
  }

  const profileOpeningTreasuryRates = summarizeProfileRate(
    openingProfileRuns,
    (run) => (run.treasuryAfterThreeContracts ?? 0) > CRITICAL_TREASURY_FLOOR,
  );
  const profileOpeningDeployableRates = summarizeProfileRate(
    openingProfileRuns,
    (run) => (run.deployableOperatorsAfterThreeContracts ?? 0) >= 2,
  );
  const m7AggregateStatuses = [
    evaluateBoundedMetric(profileOpeningTreasuryRates.average, {
      passMin: 95.01,
      failMin: 90,
      target: "> 95% average-profile runs above $50 after three contracts",
      detail: "Average-profile opening treasury stability target.",
    }).status,
    evaluateBoundedMetric(profileOpeningTreasuryRates.struggling, {
      passMin: 80.01,
      failMin: 70,
      target: "> 80% struggling-profile runs above $50 after three contracts",
      detail: "Struggling-profile opening treasury stability target.",
    }).status,
    evaluateBoundedMetric(profileOpeningDeployableRates.skilled, {
      passMin: 99.01,
      failMin: 95,
      target: "> 99% skilled-profile runs keep 2 deployable operators after three contracts",
      detail: "Skilled-profile roster stability target.",
    }).status,
    evaluateBoundedMetric(profileOpeningDeployableRates.average, {
      passMin: 99.01,
      failMin: 95,
      target: "> 99% average-profile runs keep 2 deployable operators after three contracts",
      detail: "Average-profile roster stability target.",
    }).status,
    evaluateBoundedMetric(profileOpeningDeployableRates.struggling, {
      passMin: 99.01,
      failMin: 95,
      target: "> 99% struggling-profile runs keep 2 deployable operators after three contracts",
      detail: "Struggling-profile roster stability target.",
    }).status,
  ];
  const lootVarianceShare =
    variance(finalTreasuries) <= 0
      ? 0
      : round2((variance(totalLootSold) / variance(finalTreasuries)) * 100);

  const notableFindings: string[] = [];
  if (firstIncomeAffordableValues.some((value) => value < 2)) {
    notableFindings.push(
      "The cheapest income upgrade is affordable before the contract-2 target window. Starting treasury currently overshoots the Phase 2 pacing assumption.",
    );
  }
  if (firstIncomePurchasedValues.some((value) => value < 3)) {
    notableFindings.push(
      "The first income upgrade is being purchased earlier than the contract-3 target. Guidance gating delays purchase, but not enough to keep it inside the envelope.",
    );
  }
  if (runs.some((run) => run.unsafeIncidentsInFirstThreeContracts > 0)) {
    notableFindings.push(
      "Unsafe incident categories appeared inside the first three contracts, which violates the mercy-window assumption.",
    );
  }
  if (lootVarianceShare > 20) {
    notableFindings.push(
      "Loot sell variance is contributing more than 20% of observed final-treasury variance across seeds.",
    );
  }
  if (meanRaidCountPerContract !== null && meanRaidCountPerContract > 2) {
    notableFindings.push(
      `Contracts averaged ${meanRaidCountPerContract} raids each. That now matches the browser-path contract model more closely, but it also means the Phase 2 per-contract envelope needs recalibration before its cycle-mix targets can be treated as authoritative.`,
    );
  }

  const suite: EarlyCampaignSimulationSuite = {
    schemaVersion: EARLY_CAMPAIGN_SIMULATION_SCHEMA_VERSION,
    meta: {
      scenarioId: "canonical-opening-path",
      canonicalScenarioPath: "content/bootstrap.ts#canonicalNewGameScenario",
      planPath: "docs/plans/bodega-early-game-balance-followup.md",
      targetEnvelopePath: "docs/research/shipped-plans/economy-target-envelope.md",
      seedCount: resolvedOptions.seedCount,
      startSeed: resolvedOptions.startSeed,
      contractLimit: resolvedOptions.contractLimit,
      tickMinutes: resolvedOptions.tickMinutes,
      scenarioProfiles: resolvedOptions.scenarioProfiles,
    },
    aggregate: {
      runCount: runs.length,
      completedRunCount: runs.filter(
        (run) => run.completedContracts >= resolvedOptions.contractLimit,
      ).length,
      deadlockRate: round2((runs.filter((run) => run.deadlocked).length / runs.length) * 100),
      collapseRate: round2((runs.filter((run) => run.collapsed).length / runs.length) * 100),
      stallRate: round2((runs.filter((run) => run.stalled).length / runs.length) * 100),
      outcomeDistribution: {
        success: round2((totalOutcomeCounts.success / totalCycles) * 100),
        mixed: round2((totalOutcomeCounts.mixed / totalCycles) * 100),
        failure: round2((totalOutcomeCounts.failure / totalCycles) * 100),
      },
      inferredScenarioDistribution: {
        skilled: round2(
          (runs.filter((run) => run.inferredScenario === "skilled").length / runs.length) * 100,
        ),
        average: round2(
          (runs.filter((run) => run.inferredScenario === "average").length / runs.length) * 100,
        ),
        struggling: round2(
          (runs.filter((run) => run.inferredScenario === "struggling").length / runs.length) * 100,
        ),
      },
      meanFinalTreasury: average(finalTreasuries) ?? 0,
      treasuryVariance: variance(finalTreasuries),
      lootVarianceShare,
      firstIncomeUpgradeAffordable: {
        meanContract: average(firstIncomeAffordableValues),
        status: combineStatuses(
          runs.map((run) =>
            getCheckStatus(run.evaluation.m3UpgradeTiming.checks, "first_affordable"),
          ),
        ),
      },
      firstIncomeUpgradePurchased: {
        meanContract: average(firstIncomePurchasedValues),
        status: combineStatuses(
          runs.map((run) =>
            getCheckStatus(run.evaluation.m3UpgradeTiming.checks, "first_purchased"),
          ),
        ),
      },
      firstRecruitViable: {
        meanContract: average(firstRecruitViableValues),
        status: combineStatuses(
          runs.map((run) =>
            getCheckStatus(run.evaluation.m4RecruitAcceptance.checks, "first_recruit_affordable"),
          ),
        ),
      },
      firstRecruitAccepted: {
        meanContract: average(firstRecruitAcceptedValues),
        status: firstRecruitAcceptedValues.length > 0 ? "pass" : "not_measurable",
      },
      firstBossContact: {
        meanContract: average(firstBossContactValues),
        status: getBossTimingAggregateStatus(firstBossContactValues),
      },
      firstBossClear: {
        meanContract: average(firstBossClearValues),
        status: getBossTimingAggregateStatus(firstBossClearValues),
      },
      metrics: {
        m1TreasuryFlow: rateForStatus(runs, (run) => run.evaluation.m1TreasuryFlow.overall),
        m2PayrollBurden: rateForStatus(runs, (run) => run.evaluation.m2PayrollBurden.overall),
        m3UpgradeTiming: rateForStatus(runs, (run) => run.evaluation.m3UpgradeTiming.overall),
        m4RecruitAcceptance: rateForStatus(
          runs,
          (run) => run.evaluation.m4RecruitAcceptance.overall,
        ),
        m5CasualtyPressure: rateForStatus(runs, (run) => run.evaluation.m5CasualtyPressure.overall),
        m6DeadlockRate: rateForStatus(runs, (run) => run.evaluation.m6DeadlockRate.overall),
        m7OpeningStability: rateForStatuses(m7AggregateStatuses),
        m8RelocationPacing: rateForStatus(runs, (run) => run.evaluation.m8RelocationPacing.overall),
      },
      scenarioDeadlockRates: summarizeProfileRate(openingProfileRuns, (run) => !run.deadlocked),
      scenarioOpeningTreasuryRates: profileOpeningTreasuryRates,
      scenarioOpeningDeployableRates: profileOpeningDeployableRates,
      watchItems: {
        payrollBurdenStress: {
          status:
            openingPayrollBurdenMean === null
              ? "not_measurable"
              : openingPayrollBurdenMean > 180
                ? "out_of_band"
                : openingPayrollBurdenMean >= 130
                  ? "pass"
                  : "out_of_band",
          detail:
            openingPayrollBurdenMean === null
              ? "No opening payroll samples were recorded."
              : `Mean opening payroll burden is ${round2(openingPayrollBurdenMean)}% against a 130%-180% target band.`,
          measured: openingPayrollBurdenMean,
        },
        lootSellVariance: {
          status: lootVarianceShare > 20 ? "fail" : "pass",
          detail: `Loot variance share proxy is ${lootVarianceShare}% of final treasury variance. The watch threshold is 20%.`,
          measured: lootVarianceShare,
        },
        incidentMercyWindow: {
          status: runs.some((run) => run.unsafeIncidentsInFirstThreeContracts > 0)
            ? "fail"
            : "pass",
          detail: runs.some((run) => run.unsafeIncidentsInFirstThreeContracts > 0)
            ? "At least one seeded run surfaced a non-opening-safe incident category inside the first three contracts."
            : "No seeded run surfaced a non-opening-safe incident category inside the first three contracts.",
          measured: runs.filter((run) => run.unsafeIncidentsInFirstThreeContracts > 0).length,
        },
        injuryPressureNoTreatmentCost: {
          status:
            runs.some((run) => run.totalTreatmentSpend > 0) &&
            casualtyPressureAggregate.failRate <= 5
              ? "pass"
              : runs.some((run) => run.totalTreatmentSpend > 0)
                ? "out_of_band"
                : "fail",
          detail: runs.some((run) => run.totalTreatmentSpend > 0)
            ? `Direct treatment spend is now active. Mean treatment/restock spend is $${average(runs.map((run) => run.totalTreatmentSpend)) ?? 0} per run.`
            : "No direct treatment spend was recorded in the sampled runs.",
          measured: average(runs.map((run) => run.totalTreatmentSpend)) ?? 0,
        },
        relocationReadiness: {
          status: runs.some((run) => run.relocationReadyContract !== null)
            ? "out_of_band"
            : "not_measurable",
          detail: runs.some((run) => run.relocationReadyContract !== null)
            ? "Relocation readiness was reached inside the Phase 3 window, which is earlier than the Phase 2 pacing table expects."
            : "No seeded run reached relocation readiness inside the 8-contract Phase 3 window.",
          measured:
            average(
              runs
                .map((run) => run.relocationReadyContract)
                .filter((value): value is number => value !== null),
            ) ?? null,
        },
      },
      notableFindings,
    },
    runs,
  };

  return earlyCampaignSimulationSchema.parse(suite);
}

export function renderEarlyCampaignSimulationJson(suite: EarlyCampaignSimulationSuite): string {
  return `${JSON.stringify(suite, null, 2)}\n`;
}

export function renderEarlyCampaignSimulationReport(suite: EarlyCampaignSimulationSuite): string {
  const lines: string[] = [];

  lines.push("# Early Campaign Deterministic Simulation Report");
  lines.push("");
  lines.push(
    `Canonical opening-path headless simulation across ${suite.meta.seedCount} canonical runs, plus a seeded opening-stability profile sample, using ECS runtime commands and browser-aligned opening policy choices with no browser dependency.`,
  );
  lines.push("");
  lines.push("## Run Envelope");
  lines.push("");
  lines.push(
    `- Canonical seeds: ${suite.meta.startSeed} to ${suite.meta.startSeed + suite.meta.seedCount - 1}`,
  );
  lines.push(`- Contract limit per run: ${suite.meta.contractLimit}`);
  lines.push(`- Tick size: ${suite.meta.tickMinutes} in-game minutes`);
  lines.push(`- Canonical policy profile: ${suite.meta.scenarioProfiles.join(", ")}`);
  lines.push(`- Completed runs: ${suite.aggregate.completedRunCount}/${suite.aggregate.runCount}`);
  lines.push(`- Deadlock rate: ${suite.aggregate.deadlockRate}%`);
  lines.push(`- Collapse rate: ${suite.aggregate.collapseRate}%`);
  lines.push(`- Stall rate: ${suite.aggregate.stallRate}%`);
  lines.push(`- Mean final treasury: $${suite.aggregate.meanFinalTreasury}`);
  lines.push(
    `- Mean raids per contract: ${average(suite.runs.flatMap((run) => run.contractCycles.map((cycle) => cycle.raidCount))) ?? "n/a"}`,
  );
  lines.push("");
  lines.push("## Outcome Distribution");
  lines.push("");
  lines.push(
    `- Realized contract mix: ${suite.aggregate.outcomeDistribution.success}% success, ${suite.aggregate.outcomeDistribution.mixed}% mixed, ${suite.aggregate.outcomeDistribution.failure}% failure`,
  );
  lines.push(
    `- Inferred scenario buckets: ${suite.aggregate.inferredScenarioDistribution.skilled}% skilled, ${suite.aggregate.inferredScenarioDistribution.average}% average, ${suite.aggregate.inferredScenarioDistribution.struggling}% struggling`,
  );
  lines.push("");
  lines.push("## Threshold Summary");
  lines.push("");
  lines.push(formatMetricAggregate("M1 Treasury Flow", suite.aggregate.metrics.m1TreasuryFlow));
  lines.push(formatMetricAggregate("M2 Payroll Burden", suite.aggregate.metrics.m2PayrollBurden));
  lines.push(formatMetricAggregate("M3 Upgrade Timing", suite.aggregate.metrics.m3UpgradeTiming));
  lines.push(
    formatMetricAggregate("M4 Recruit Acceptance", suite.aggregate.metrics.m4RecruitAcceptance),
  );
  lines.push(
    formatMetricAggregate("M5 Casualty Pressure", suite.aggregate.metrics.m5CasualtyPressure),
  );
  lines.push(formatMetricAggregate("M6 Deadlock Rate", suite.aggregate.metrics.m6DeadlockRate));
  lines.push(
    formatMetricAggregate("M7 Opening Stability", suite.aggregate.metrics.m7OpeningStability),
  );
  lines.push(
    formatMetricAggregate("M8 Relocation Pacing", suite.aggregate.metrics.m8RelocationPacing),
  );
  lines.push("");
  lines.push("## Watch Items");
  lines.push("");
  lines.push(
    `- Payroll burden stress: ${suite.aggregate.watchItems.payrollBurdenStress.status} (${suite.aggregate.watchItems.payrollBurdenStress.detail})`,
  );
  lines.push(
    `- Loot sell variance: ${suite.aggregate.watchItems.lootSellVariance.status} (${suite.aggregate.watchItems.lootSellVariance.detail})`,
  );
  lines.push(
    `- Incident mercy window: ${suite.aggregate.watchItems.incidentMercyWindow.status} (${suite.aggregate.watchItems.incidentMercyWindow.detail})`,
  );
  lines.push(
    `- Injury pressure with no treatment cost: ${suite.aggregate.watchItems.injuryPressureNoTreatmentCost.status} (${suite.aggregate.watchItems.injuryPressureNoTreatmentCost.detail})`,
  );
  lines.push(
    `- Relocation readiness: ${suite.aggregate.watchItems.relocationReadiness.status} (${suite.aggregate.watchItems.relocationReadiness.detail})`,
  );
  lines.push("");
  lines.push("## Timing Milestones");
  lines.push("");
  lines.push(
    `- First income upgrade affordable: ${suite.aggregate.firstIncomeUpgradeAffordable.meanContract ?? "n/a"} (${suite.aggregate.firstIncomeUpgradeAffordable.status})`,
  );
  lines.push(
    `- First income upgrade purchased: ${suite.aggregate.firstIncomeUpgradePurchased.meanContract ?? "n/a"} (${suite.aggregate.firstIncomeUpgradePurchased.status})`,
  );
  lines.push(
    `- First recruit viable: ${suite.aggregate.firstRecruitViable.meanContract ?? "n/a"} (${suite.aggregate.firstRecruitViable.status})`,
  );
  lines.push(
    `- First recruit accepted: ${suite.aggregate.firstRecruitAccepted.meanContract ?? "n/a"} (${suite.aggregate.firstRecruitAccepted.status})`,
  );
  lines.push(
    `- First boss contact: ${suite.aggregate.firstBossContact.meanContract ?? "n/a"} (${suite.aggregate.firstBossContact.status})`,
  );
  lines.push(
    `- First boss clear: ${suite.aggregate.firstBossClear.meanContract ?? "n/a"} (${suite.aggregate.firstBossClear.status})`,
  );
  lines.push("");
  lines.push("## Scenario Rates");
  lines.push("");
  lines.push(
    "| Scenario Profile | No Deadlock | Treasury > $50 After 3 Contracts | Deployable >= 2 After 3 Contracts |",
  );
  lines.push("| --- | ---: | ---: | ---: |");
  lines.push(
    `| Skilled | ${suite.aggregate.scenarioDeadlockRates.skilled}% | ${suite.aggregate.scenarioOpeningTreasuryRates.skilled}% | ${suite.aggregate.scenarioOpeningDeployableRates.skilled}% |`,
  );
  lines.push(
    `| Average | ${suite.aggregate.scenarioDeadlockRates.average}% | ${suite.aggregate.scenarioOpeningTreasuryRates.average}% | ${suite.aggregate.scenarioOpeningDeployableRates.average}% |`,
  );
  lines.push(
    `| Struggling | ${suite.aggregate.scenarioDeadlockRates.struggling}% | ${suite.aggregate.scenarioOpeningTreasuryRates.struggling}% | ${suite.aggregate.scenarioOpeningDeployableRates.struggling}% |`,
  );
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (suite.aggregate.notableFindings.length === 0) {
    lines.push("- No additional out-of-band findings beyond the threshold table.");
  } else {
    suite.aggregate.notableFindings.forEach((finding) => {
      lines.push(`- ${finding}`);
    });
  }
  lines.push("");

  return lines.join("\n");
}

export async function buildEarlyCampaignSimulationArtifacts(
  options: SimulationOptions = {},
): Promise<{
  suite: EarlyCampaignSimulationSuite;
  json: string;
  report: string;
}> {
  const suite = await buildEarlyCampaignSimulationSuite(options);
  return {
    suite,
    json: renderEarlyCampaignSimulationJson(suite),
    report: renderEarlyCampaignSimulationReport(suite),
  };
}

export { EARLY_CAMPAIGN_SIMULATION_SCHEMA_VERSION };
