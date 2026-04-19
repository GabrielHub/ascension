import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  getAutonomyThresholdsForPolicies,
  getContractPostureConfig,
  getObjectiveBiasConfig,
  getPolicyOptionLabel,
  getRecoveryTriageConfig,
  getRosterFlowConfig,
} from "lib/policies";
import {
  AssignmentState,
  BuildingAuthority,
  type ActiveRaidPacketRecord,
  type ActiveRaidResolutionPacket,
  type ContractBoardIntelState,
  type ContractBriefingState,
  type ContractBossWeaknessIntel,
  type ContractLifecyclePhase,
  type ContractResultSummary,
  type ContractSiteState,
  type PostedContract,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  NotableTie,
  OperatorDisposition,
  OperatorIdentity,
  PreferenceState,
  RaidOpportunityState,
  RaidParticipationState,
  RecurringTeam,
  RoomInstance,
  RoomCulture,
  ScheduleState,
  WorldTimeState,
} from "../components";
import {
  BODEGA_ALLEY_STAGING_TEMPLATE_ID,
  BODEGA_BACK_OFFICE_TEMPLATE_ID,
  clamp,
  formatIdentityRuntimeText,
  formatWorldTimestamp,
  getBuildingPolicies,
  getCurrentAbsoluteMinute,
  getGuildIdentity,
  hasOperationalRoomTemplate,
  hasOperationalRoomWithTag,
  hasStaffedOperationalRoomTemplate,
  hasStaffedOperationalRoomWithTag,
  pushRuntimeEvent,
  removeTrackedEntity,
} from "./commands";
import { reconcileAssignmentsSystem } from "./assignment";
import { addToInventory, autoSelectAccessory, unequipItem } from "./inventory";
import { applyLootAutomationSweep, describeLootAutomationSweep } from "./loot-automation";
import type { BossEncounterInstance } from "./encounter-types";
import { createBossCommitmentPayload } from "./incidents";
import { enqueueInterruption, hasBlockingInterruption } from "./interruptions";
import { computeAutonomyFlags } from "./morale";
import {
  applyRaidSocialOutcome,
  applyRetentionPressureFromPatterns,
  applySocialFalloutAfterContractLoss,
  applySocialFalloutAfterDeath,
  applySocialRecoveryAfterDistrictWin,
  computeSocialCohesion,
  findRecurringTeamForMembers,
  findDispositionEntity,
  getRecurringTeamCohesionBonus,
} from "./social";
import { computeDerivedStats, type OperatorBaseStats } from "./derived-stats";
import type { TemplateRegistry } from "content/templates";
import type { BossTag, BossWeakness } from "content/templates/shared";
import { siteConceptTemplates, siteConceptById } from "content/templates/site-concepts";
import { SeededRng, weightedChoice, boundedRoll } from "../uncertainty";
import type { RaidTeamGoal } from "lib/raid-team-goal";
import {
  simulateRaidRun,
  resolveRaidRunAfterBoss,
  markRaidRunBossCommitment,
  type SimOperator,
} from "./raid-simulation";
import {
  POSTED_CONTRACT_VARIANCE,
  RAID_OPPORTUNITY_VARIANCE,
  computeBossCompletionCashBonus,
  computeBossCompletionReputationBonus,
  computeMissionCompletionCashBonus,
  computeMissionCompletionReputationBonus,
  computePostedContractEconomyBudget,
  computeRaidCashDelta,
  computeRaidOpportunityEconomyBudget,
  computeRaidReputationDelta,
  getAvailableContractRanksForReputation,
  getMinimumReputationForContractRank,
} from "./contract-economy";
import type {
  RaidEncounterThreat,
  RaidFeatureKind,
  RaidOperatorReadiness,
  RaidPresentationEnemy,
  RaidPresentationEvent,
  RaidPresentationFeature,
  RaidPresentationTeam,
  RuntimeCueId,
  SimSystem,
  SimSystemContext,
} from "./types";
import { seedFromSimulationKey } from "./seed-utils";
import {
  selectDistrictForConcept,
  selectSponsorFaction,
  computeCityContractModifiers,
  applyCityPressureOutcome,
  emitCityPressureEvents,
  SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
  SKYSCRAPER_WAR_ROOM_TEMPLATE_ID,
  type CityPressureOutcome,
} from "./city-pressure";
import { FIRST_RAID_RETURN_BEAT_ID } from "./guidance-beats";
import {
  applyPostRaidTrainingWear,
  getOperatorTrainingReadinessContribution,
  getTeamTrainingFactor,
} from "./training";

export type { RaidTeamGoal } from "lib/raid-team-goal";

// ── Simulation bridge helpers ──────────────────────────────────────────

function getPolicyState(context: SimSystemContext) {
  return getBuildingPolicies(context);
}

function buildSimOperators(context: SimSystemContext, operatorEntities: number[]): SimOperator[] {
  return operatorEntities.map((entity) => {
    const derived = computeDerivedStats(context, entity);
    const maxHp = derived.effective.endurance * 5 + derived.effective.resilience * 3 + 40;
    return {
      operatorId: OperatorIdentity.id[entity],
      name: OperatorIdentity.name[entity] ?? OperatorIdentity.id[entity],
      roleTag: OperatorIdentity.roleTag[entity] || "",
      stats: derived.effective,
      combatPower: derived.combatPower,
      currentHp: maxHp - Math.round(InjuryState.severity[entity] * 0.5),
      maxHp,
      injury: InjuryState.severity[entity],
      morale: MoraleState.current[entity],
      fatigue: NeedState.fatigue[entity],
      kitRegularAttackPower: Math.round(derived.effective.strength * 1.2),
      kitSkillPower: Math.round(derived.effective.strength * 1.8 + derived.effective.speed * 0.5),
      kitUltimatePower: Math.round(
        derived.effective.strength * 2.5 + derived.effective.perception * 0.8,
      ),
      passiveBonus: Math.round(derived.combatPower * 0.15),
      down: false,
    };
  });
}

const MAX_OPEN_OPPORTUNITIES = 1;
const FORMATION_DELAY_MINUTES = 60;
const DEFAULT_OPPORTUNITY_LIFETIME_MINUTES = 300;
const FOG_GRID_WIDTH = 16;
const FOG_GRID_HEIGHT = 16;
// Re-use the canonical constant from guidance-beats.ts
const FIRST_CONTRACT_SHIELD_END_BEAT_ID = FIRST_RAID_RETURN_BEAT_ID;
const FIRST_CONTRACT_SHIELDED_INJURY_TOTAL = 58;
const FIRST_CONTRACT_FATAL_INJURY_THRESHOLD = 95;
const INJURY_RECOVERY_HOURS_PER_POINT = 0.18;
const ORDINARY_CONTRACT_CLOSURE_THRESHOLD = 90;
const BOSS_CONTRACT_CLOSURE_THRESHOLD = 80;
const BOSS_ROUTE_UNLOCK_PROGRESS = 35;
const FIRST_BOSS_CONTRACT_ORDINAL = 7;
const RECURRING_BOSS_CONTRACT_INTERVAL = 4;
const ORDINARY_CONTRACT_PROGRESS_BY_RESULT = {
  success: 90,
  mixed: 60,
  failure: 10,
} as const;
const BOSS_CONTRACT_PROGRESS_BY_RESULT = {
  success: 75,
  mixed: 55,
  failure: 12,
} as const;
const RAID_TREATMENT_BASE_COST = 4;
const RAID_TREATMENT_COST_PER_INJURY = 0.45;
const FIRST_AID_STATION_UPGRADE_ID = "upgrade/room/dining_area:first_aid_station";
const FIRST_CONTRACT_INJURY_CAP_BY_RESULT = {
  success: 6,
  mixed: 10,
  failure: 14,
} as const;
const PORTERS_OFFICE_TEMPLATE_ID = "room/office:tier_1";
const PORTERS_BRIEFING_ROOM_TEMPLATE_ID = "room/briefing_room:tier_1";
const PORTERS_PREP_ROOM_TEMPLATE_ID = "room/prep_room:tier_1";
const PORTERS_INFIRMARY_TEMPLATE_ID = "room/infirmary:tier_1";
const PORTERS_BREAK_ROOM_TEMPLATE_ID = "room/break_room:tier_1";
const PORTERS_DOCK_TEMPLATE_ID = "room/dock:tier_1";
const PORTERS_DECK_TEMPLATE_ID = "room/deck:tier_1";
const WAR_ROOM_BRIEFING_MULTIPLIER = 1.5;

export interface RaidReadinessSignal {
  availabilityScore: number;
  willingnessScore: number;
  readinessScore: number;
  schedulePressure: number;
}

function pushRuntimeCue(context: SimSystemContext, cueId: RuntimeCueId): void {
  context.runtimeState.pendingCueIds.push(cueId);
}

function pushUniqueTag(tags: string[], tag: string): void {
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
}

function getCellCenter(x: number, y: number) {
  return {
    x: x * 32 + 16,
    y: y * 32 + 16,
  };
}

function hasContractConcluded(contractSite: ContractSiteState | null | undefined): boolean {
  return Boolean(
    contractSite &&
    (contractSite.bossDefeated || contractSite.missionCompleted || contractSite.contractLost),
  );
}

function getContractBoardIntelState(context: SimSystemContext): ContractBoardIntelState {
  if (hasOperationalRoomTemplate(context, PORTERS_OFFICE_TEMPLATE_ID)) {
    return {
      source: "office",
      quality: "dossier",
    };
  }

  if (hasOperationalRoomTemplate(context, BODEGA_BACK_OFFICE_TEMPLATE_ID)) {
    return {
      source: "back_office",
      quality: "reviewed",
    };
  }

  return {
    source: "street",
    quality: "rough",
  };
}

export function getContractBriefingState(
  context: SimSystemContext,
  contractSite: ContractSiteState | null | undefined,
): ContractBriefingState | null {
  if (!contractSite || hasContractConcluded(contractSite)) {
    return null;
  }

  if (!hasOperationalRoomTemplate(context, PORTERS_BRIEFING_ROOM_TEMPLATE_ID)) {
    return null;
  }

  const warRoomActive = hasOperationalRoomTemplate(context, SKYSCRAPER_WAR_ROOM_TEMPLATE_ID);
  const withWarRoom = (base: number): number =>
    warRoomActive ? Math.round(base * WAR_ROOM_BRIEFING_MULTIPLIER) : base;

  if (hasOperationalRoomTemplate(context, PORTERS_PREP_ROOM_TEMPLATE_ID)) {
    return {
      source: "briefing_room_and_prep",
      status: "drilled",
      opportunityIntelBonus: withWarRoom(16),
      bossIntelBonus: withWarRoom(30),
    };
  }

  return {
    source: "briefing_room",
    status: "briefed",
    opportunityIntelBonus: withWarRoom(8),
    bossIntelBonus: withWarRoom(15),
  };
}

function getBoardIntelFloor(boardIntel: ContractBoardIntelState): number {
  switch (boardIntel.quality) {
    case "dossier":
      return 45;
    case "reviewed":
      return 30;
    default:
      return 0;
  }
}

function getBoardIntelBonus(boardIntel: ContractBoardIntelState): number {
  switch (boardIntel.quality) {
    case "dossier":
      return 20;
    case "reviewed":
      return 15;
    default:
      return 0;
  }
}

function getBoardAdjustedContractIntel(
  contractIntel: number,
  boardIntel: ContractBoardIntelState,
): number {
  return clamp(
    Math.max(contractIntel, getBoardIntelFloor(boardIntel)) + getBoardIntelBonus(boardIntel),
    10,
    100,
  );
}

function getOpportunityIntelWithBriefing(
  contractIntel: number,
  briefing: ContractBriefingState | null = null,
): number {
  return clamp(contractIntel + (briefing?.opportunityIntelBonus ?? 0), 10, 100);
}

function buildBossWeaknessIntel(
  weaknesses: readonly BossWeakness[],
  maxCount: number,
): ContractBossWeaknessIntel[] {
  return weaknesses.slice(0, maxCount).map((weakness) => ({
    kind: weakness.kind,
    target: weakness.target,
  }));
}

function resolveContractBossProfile(
  registry: Pick<TemplateRegistry, "missionById" | "bossById">,
  missionId: string,
  siteConceptId: string,
) {
  const concept = siteConceptById.get(siteConceptId);
  const missionBoss = registry.missionById.get(missionId)?.combatProfile?.boss ?? null;
  const siteBossId = concept?.bossId ?? null;
  const siteBoss = siteBossId ? (registry.bossById.get(siteBossId) ?? null) : null;
  return missionBoss ?? siteBoss;
}

function buildBoardContractIntel(
  siteConceptId: string,
  contractIntel: number,
  boardIntel: ContractBoardIntelState,
): Pick<
  PostedContract,
  "knownTraits" | "hiddenTraitCount" | "enemyHints" | "lootFamilyHints" | "bossHint"
> {
  const concept = siteConceptById.get(siteConceptId);
  const allTraits = [...(concept?.threatProfileTags ?? []), ...(concept?.hazardTags ?? [])];
  const knownTraitCount = (() => {
    switch (boardIntel.quality) {
      case "dossier":
        return contractIntel >= 55 ? allTraits.length : Math.ceil(allTraits.length * 0.8);
      case "reviewed":
        return contractIntel >= 60 ? allTraits.length : Math.ceil(allTraits.length * 0.6);
      default:
        if (contractIntel >= 60) return allTraits.length;
        if (contractIntel >= 30) return Math.ceil(allTraits.length * 0.6);
        return Math.ceil(allTraits.length * 0.3);
    }
  })();

  return {
    knownTraits: allTraits.slice(0, knownTraitCount),
    hiddenTraitCount: Math.max(0, allTraits.length - knownTraitCount),
    enemyHints:
      boardIntel.quality === "dossier" || contractIntel >= 40
        ? [...(concept?.enemyFamilyIds ?? [])]
        : [],
    lootFamilyHints:
      boardIntel.quality === "dossier" || contractIntel >= 30
        ? [...(concept?.lootThemeLabels ?? [])]
        : [],
    bossHint:
      boardIntel.quality === "dossier" || contractIntel >= 50 ? (concept?.bossId ?? null) : null,
  };
}

export function buildActiveContractIntelSurface(input: {
  missionId: string;
  siteConceptId: string;
  contractIntel: number;
  boardIntel: ContractBoardIntelState;
  briefing: ContractBriefingState | null;
  requiresBossClear: boolean;
  registry: Pick<TemplateRegistry, "missionById" | "bossById">;
}): {
  siteSummary: string;
  neighborhoodLabel: string;
  knownTraits: readonly string[];
  enemyHints: readonly string[];
  lootFamilyHints: readonly string[];
  bossName: string | null;
  bossTags: readonly BossTag[];
  bossWeaknesses: readonly ContractBossWeaknessIntel[];
} {
  const concept = siteConceptById.get(input.siteConceptId);
  const boardRead = buildBoardContractIntel(
    input.siteConceptId,
    input.contractIntel,
    input.boardIntel,
  );
  const boss = resolveContractBossProfile(input.registry, input.missionId, input.siteConceptId);
  const knowsBossFromBoard = boardRead.bossHint !== null;
  const knowsBossFromBriefing = input.briefing !== null && input.requiresBossClear;

  return {
    siteSummary: concept?.conceptSummary ?? "Operational read pending.",
    neighborhoodLabel: concept?.worldSpaceLabel ?? "",
    knownTraits:
      input.briefing === null
        ? boardRead.knownTraits
        : [...(concept?.threatProfileTags ?? []), ...(concept?.hazardTags ?? [])],
    enemyHints:
      input.briefing === null ? boardRead.enemyHints : [...(concept?.enemyFamilyIds ?? [])],
    lootFamilyHints:
      input.briefing === null ? boardRead.lootFamilyHints : [...(concept?.lootThemeLabels ?? [])],
    bossName: knowsBossFromBriefing || knowsBossFromBoard ? (boss?.name ?? null) : null,
    bossTags:
      knowsBossFromBriefing && boss
        ? boss.tags.slice(0, input.briefing?.status === "drilled" ? boss.tags.length : 1)
        : [],
    bossWeaknesses:
      knowsBossFromBriefing && boss
        ? buildBossWeaknessIntel(
            boss.weaknesses,
            input.briefing?.status === "drilled" ? boss.weaknesses.length : 1,
          )
        : [],
  };
}

function getResolvedContractCount(
  context: SimSystemContext,
  options?: { excludeContractSiteId?: string },
): number {
  const buildingEntity = context.singletonEntities.building;
  const excludeContractSiteId = options?.excludeContractSiteId ?? null;
  const contractSiteIds = new Set<string>();

  (BuildingAuthority.raidSummaries[buildingEntity] ?? []).forEach((summary) => {
    if (!summary.contractSiteId || summary.contractSiteId === excludeContractSiteId) {
      return;
    }
    contractSiteIds.add(summary.contractSiteId);
  });

  const activeResult = BuildingAuthority.contractResult[buildingEntity];
  if (
    activeResult?.contractSiteId &&
    activeResult.contractSiteId !== excludeContractSiteId &&
    !contractSiteIds.has(activeResult.contractSiteId)
  ) {
    contractSiteIds.add(activeResult.contractSiteId);
  }

  return contractSiteIds.size;
}

function shouldRequireBossClear(contractOrdinal: number): boolean {
  if (contractOrdinal < FIRST_BOSS_CONTRACT_ORDINAL) {
    return false;
  }
  return (contractOrdinal - FIRST_BOSS_CONTRACT_ORDINAL) % RECURRING_BOSS_CONTRACT_INTERVAL === 0;
}

function getContractClosureThreshold(contractOrdinal: number): number {
  return shouldRequireBossClear(contractOrdinal)
    ? BOSS_CONTRACT_CLOSURE_THRESHOLD
    : ORDINARY_CONTRACT_CLOSURE_THRESHOLD;
}

function getContractProgressDelta(
  result: ActiveRaidResolutionPacket["result"],
  requiresBossClear: boolean,
  objectiveBias: ReturnType<typeof getObjectiveBiasConfig>,
): number {
  const base = requiresBossClear
    ? BOSS_CONTRACT_PROGRESS_BY_RESULT[result]
    : ORDINARY_CONTRACT_PROGRESS_BY_RESULT[result];
  const biasBonus =
    (objectiveBias.goalWeightModifiers.exploring ?? 0) +
    (requiresBossClear ? (objectiveBias.goalWeightModifiers.boss ?? 0) : 0);
  return Math.max(0, Math.round(base + biasBonus * 0.25));
}

function getRaidTreatmentCost(
  context: SimSystemContext,
  packet: ActiveRaidPacketRecord,
  operatorEntityById: ReadonlyMap<string, number>,
): number {
  const roomEntities = context.runtimeState.roomEntities;
  const hasFirstAidStation = roomEntities.some((entity) => {
    return (RoomInstance.appliedUpgradeIds[entity] ?? []).includes(FIRST_AID_STATION_UPGRADE_ID);
  });
  const treatmentMultiplier = hasFirstAidStation ? 0.7 : 1;
  const firstContractDiscount = isFirstContractDeathShieldActive(context) ? 0.5 : 1;

  const totalCost = packet.resolutionPacket.operatorOutcomes.reduce((sum, outcome) => {
    if (outcome.died || outcome.injuryDelta <= 0 || !operatorEntityById.has(outcome.operatorId)) {
      return sum;
    }
    return (
      sum +
      RAID_TREATMENT_BASE_COST +
      Math.round(outcome.injuryDelta * RAID_TREATMENT_COST_PER_INJURY)
    );
  }, 0);

  return Math.max(0, Math.round(totalCost * treatmentMultiplier * firstContractDiscount));
}

function getRaidPlaybackStepIndex(packet: ActiveRaidPacketRecord): number {
  const run = packet.raidRun;
  if (!run || run.steps.length === 0) {
    return -1;
  }

  return Math.min(
    run.steps.length - 1,
    Math.floor((clamp(packet.revealProgress, 0, 100) / 100) * run.steps.length),
  );
}

function getRaidPlaybackSteps(packet: ActiveRaidPacketRecord) {
  const stepIndex = getRaidPlaybackStepIndex(packet);
  const run = packet.raidRun;
  if (!run || stepIndex < 0) {
    return [];
  }

  return run.steps.slice(0, stepIndex + 1);
}

function hasRaidPlaybackReachedStep(
  packet: ActiveRaidPacketRecord,
  stepKind: import("save/types").RaidStepKind,
): boolean {
  return getRaidPlaybackSteps(packet).some((step) => step.kind === stepKind);
}

function getPlaybackNodeId(
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
): string {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const siteNodeId = steps[index]?.siteNodeId;
    if (siteNodeId) {
      return siteNodeId;
    }
  }

  return run.siteGraph[0]?.nodeId ?? "node/entry";
}

function getPlaybackNodeMap(
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
): Set<string> {
  const discovered = new Set<string>();
  const entryNodeId = run.siteGraph[0]?.nodeId;
  if (entryNodeId) {
    discovered.add(entryNodeId);
  }

  for (const node of run.siteGraph) {
    if (node.discovered) {
      discovered.add(node.nodeId);
    }
  }

  for (const step of steps) {
    if (step.siteNodeId) {
      discovered.add(step.siteNodeId);
    }
  }

  return discovered;
}

function getPlaybackNode(
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
) {
  const currentNodeId = getPlaybackNodeId(run, steps);
  return run.siteGraph.find((node) => node.nodeId === currentNodeId) ?? run.siteGraph[0];
}

function getPlaybackGoal(
  packet: ActiveRaidPacketRecord,
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
): RaidTeamGoal {
  const latestStep = steps[steps.length - 1];
  const currentNode = getPlaybackNode(run, steps);

  if (latestStep?.goalCheckKind) {
    return latestStep.goalCheckKind;
  }

  switch (latestStep?.kind) {
    case "discover_enemy":
    case "skirmish_start":
    case "skirmish_round":
    case "skirmish_end":
    case "operator_down":
      return "hunting";
    case "loot_gain":
      return "looting";
    case "intel_gain":
      return "intel";
    case "retreat_begin":
    case "boss_retreat":
    case "return":
      return "retreating";
    case "boss_threshold":
    case "boss_commit":
    case "boss_result":
      return "boss";
  }

  switch (currentNode?.kind) {
    case "cache":
      return "looting";
    case "intel_point":
      return "intel";
    case "boss_approach":
    case "boss_chamber":
      return "boss";
    case "hazard":
    case "chamber":
    case "corridor":
    default:
      return hasRaidPlaybackReachedStep(packet, "retreat_begin") ? "retreating" : "exploring";
  }
}

function getPlaybackState(
  packet: ActiveRaidPacketRecord,
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
): RaidPresentationTeam["state"] {
  const latestStep = steps[steps.length - 1];
  const hasLivingOperators = run.teamOperatorIds.some((operatorId) => {
    return (run.derivedState.operatorHp[operatorId] ?? 1) > 0;
  });

  switch (latestStep?.kind) {
    case "retreat_begin":
    case "boss_retreat":
    case "return":
      return hasLivingOperators ? "returning" : "defeated";
    case "resolve":
      return hasLivingOperators ? "returning" : "defeated";
    default:
      return hasLivingOperators ? "active" : "defeated";
  }
}

function getPlaybackFeatureKind(
  nodeKind: NonNullable<ActiveRaidPacketRecord["raidRun"]>["siteGraph"][number]["kind"],
): RaidFeatureKind | null {
  switch (nodeKind) {
    case "cache":
      return "loot-cache";
    case "intel_point":
      return "intel-node";
    case "hazard":
      return "hazard-zone";
    default:
      return null;
  }
}

function getEncounterLabelFromStep(
  step: NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"][number],
): string {
  if (
    step.kind === "boss_threshold" ||
    step.kind === "boss_commit" ||
    step.kind === "boss_result"
  ) {
    return "Boss Contact";
  }

  if (step.message) {
    const match = /^Engaged (.+?)(?: \(|\.)/.exec(step.message);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "Hostile Contact";
}

function getTranscriptEncounter(
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
): RaidPresentationTeam["encounter"] {
  let openEncounter: RaidPresentationTeam["encounter"] = null;

  for (const step of steps) {
    switch (step.kind) {
      case "discover_enemy":
      case "skirmish_start":
        openEncounter = {
          enemyLabel: getEncounterLabelFromStep(step),
          threat: "generic",
          healthFraction: 1,
        };
        break;
      case "skirmish_round": {
        const enemyHpFraction = step.deltas?.["enemyHpFraction"];
        if (
          openEncounter &&
          typeof enemyHpFraction === "number" &&
          Number.isFinite(enemyHpFraction)
        ) {
          openEncounter = {
            ...openEncounter,
            healthFraction: clamp(enemyHpFraction, 0, 1),
          };
        }
        break;
      }
      case "boss_threshold":
      case "boss_commit":
        openEncounter = {
          enemyLabel: "Boss Contact",
          threat: "boss",
          healthFraction: 1,
        };
        break;
      case "boss_result":
      case "boss_retreat":
      case "skirmish_end":
        openEncounter = null;
        break;
    }
  }

  return openEncounter;
}

function buildTranscriptWorldMarkers(
  packet: ActiveRaidPacketRecord,
  run: NonNullable<ActiveRaidPacketRecord["raidRun"]>,
  steps: Readonly<NonNullable<ActiveRaidPacketRecord["raidRun"]>["steps"]>,
  enemyFamilyLookup?: ReadonlyMap<string, string>,
): {
  enemies: RaidPresentationEnemy[];
  features: RaidPresentationFeature[];
} {
  const discoveredNodeIds = getPlaybackNodeMap(run, steps);
  const features = run.siteGraph
    .map((node) => {
      const kind = getPlaybackFeatureKind(node.kind);
      if (!kind) {
        return null;
      }

      return {
        id: node.nodeId,
        kind,
        discovered: discoveredNodeIds.has(node.nodeId),
        ...getCellCenter(node.x, node.y),
      } satisfies RaidPresentationFeature;
    })
    .filter((feature): feature is RaidPresentationFeature => feature !== null);

  const enemyMarkers = new Map<string, RaidPresentationEnemy>();
  for (const step of steps) {
    if (step.kind !== "discover_enemy" || !step.siteNodeId) {
      continue;
    }

    const node = run.siteGraph.find((candidate) => candidate.nodeId === step.siteNodeId);
    if (!node) {
      continue;
    }

    enemyMarkers.set(`${packet.id}:${step.siteNodeId}:${step.enemyTemplateId ?? "generic"}`, {
      id: `${packet.id}:${step.siteNodeId}:${step.enemyTemplateId ?? "generic"}`,
      threat: "generic",
      discovered: true,
      familyId: step.enemyTemplateId ? enemyFamilyLookup?.get(step.enemyTemplateId) : undefined,
      ...getCellCenter(node.x, node.y),
    });
  }

  if (hasRaidPlaybackReachedStep(packet, "boss_threshold")) {
    const bossNode = run.siteGraph.find((node) => node.kind === "boss_chamber");
    if (bossNode) {
      enemyMarkers.set(`${packet.id}:${bossNode.nodeId}:boss`, {
        id: `${packet.id}:${bossNode.nodeId}:boss`,
        threat: "boss",
        discovered: true,
        ...getCellCenter(bossNode.x, bossNode.y),
      });
    }
  }

  return {
    enemies: [...enemyMarkers.values()],
    features,
  };
}

function upsertRaidEvent(
  events: RaidPresentationEvent[],
  event: RaidPresentationEvent,
  maxEvents = 10,
): void {
  if (events.some((existing) => existing.id === event.id)) {
    return;
  }

  events.push(event);
  events.sort((left, right) => right.tick - left.tick || left.id.localeCompare(right.id));
  if (events.length > maxEvents) {
    events.length = maxEvents;
  }
}

function resolveRaidOperatorReadiness(entity: number): RaidOperatorReadiness {
  if (OperatorIdentity.lifecycleStatus[entity] !== "active") {
    return "critical";
  }
  if (InjuryState.severity[entity] >= 65) {
    return "critical";
  }
  if (InjuryState.severity[entity] >= 25) {
    return "injured";
  }
  if (NeedState.fatigue[entity] >= 55 || NeedState.stress[entity] >= 55) {
    return "fatigued";
  }
  return "ready";
}

function ensureRaidPresentationSeed(context: SimSystemContext, contractSiteId: string): void {
  if (context.runtimeState.raidPresentation.contractSiteId === contractSiteId) {
    return;
  }

  const rng = new SeededRng(seedFromSimulationKey(context, `raid-presentation:${contractSiteId}`));
  const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  const siteConceptId = contractSite?.siteConceptId;
  const siteConcept = siteConceptId ? siteConceptById.get(siteConceptId) : undefined;
  const seedFamilyId = siteConcept?.enemyFamilyIds?.[0];
  const features: RaidPresentationFeature[] = [
    {
      id: `${contractSiteId}:feature:intel-0`,
      kind: "intel-node",
      discovered: false,
      ...getCellCenter(3, 3),
    },
    {
      id: `${contractSiteId}:feature:loot-0`,
      kind: "loot-cache",
      discovered: false,
      ...getCellCenter(8, 4),
    },
    {
      id: `${contractSiteId}:feature:hazard-0`,
      kind: "hazard-zone",
      discovered: false,
      ...getCellCenter(11, 8),
    },
    {
      id: `${contractSiteId}:feature:debris-0`,
      kind: "debris-pile",
      discovered: false,
      ...getCellCenter(6, 11),
    },
  ];
  const enemies: RaidPresentationEnemy[] = [
    {
      id: `${contractSiteId}:enemy:generic-0`,
      threat: "generic",
      discovered: false,
      familyId: seedFamilyId,
      ...getCellCenter(4 + rng.int(0, 1), 6),
    },
    {
      id: `${contractSiteId}:enemy:elite-0`,
      threat: "elite",
      discovered: false,
      familyId: seedFamilyId,
      ...getCellCenter(9, 9 + rng.int(0, 1)),
    },
    {
      id: `${contractSiteId}:enemy:boss-0`,
      threat: "boss",
      discovered: false,
      ...getCellCenter(13, 13),
    },
  ];

  context.runtimeState.raidPresentation = {
    contractSiteId,
    teams: [],
    enemies,
    features,
  };
}

function revealRaidPresentationFromFog(context: SimSystemContext): void {
  const fog = BuildingAuthority.fogOfWar[context.singletonEntities.building];
  if (!fog) {
    return;
  }

  const isRevealed = (x: number, y: number) => {
    const cellX = Math.max(0, Math.min(fog.gridWidth - 1, Math.floor(x / 32)));
    const cellY = Math.max(0, Math.min(fog.gridHeight - 1, Math.floor(y / 32)));
    return fog.revealed[cellY * fog.gridWidth + cellX] === true;
  };

  context.runtimeState.raidPresentation.features.forEach((feature) => {
    feature.discovered = feature.discovered || isRevealed(feature.x, feature.y);
  });
  context.runtimeState.raidPresentation.enemies.forEach((enemy) => {
    enemy.discovered = enemy.discovered || isRevealed(enemy.x, enemy.y);
    enemy.engagedRaidId = undefined;
  });
}

function buildRaidWaypointPath(index: number) {
  const paths = [
    // Path 0: NW entry, east sweep, south hook, west return
    [
      getCellCenter(2, 2),
      getCellCenter(5, 1),
      getCellCenter(8, 3),
      getCellCenter(8, 6),
      getCellCenter(5, 7),
      getCellCenter(3, 10),
      getCellCenter(6, 12),
      getCellCenter(10, 13),
    ],
    // Path 1: SW entry, north corridor, east turn, SE descent
    [
      getCellCenter(2, 13),
      getCellCenter(2, 10),
      getCellCenter(4, 7),
      getCellCenter(7, 5),
      getCellCenter(10, 4),
      getCellCenter(12, 6),
      getCellCenter(13, 9),
      getCellCenter(11, 12),
    ],
    // Path 2: NE entry, west sweep, south hook, east finish
    [
      getCellCenter(13, 2),
      getCellCenter(11, 4),
      getCellCenter(8, 5),
      getCellCenter(5, 4),
      getCellCenter(3, 6),
      getCellCenter(4, 9),
      getCellCenter(7, 11),
      getCellCenter(10, 13),
    ],
    // Path 3: Center spiral outward
    [
      getCellCenter(8, 8),
      getCellCenter(10, 6),
      getCellCenter(12, 8),
      getCellCenter(10, 11),
      getCellCenter(6, 10),
      getCellCenter(4, 7),
      getCellCenter(6, 4),
      getCellCenter(9, 3),
    ],
    // Path 4: Zigzag through middle
    [
      getCellCenter(1, 5),
      getCellCenter(4, 3),
      getCellCenter(7, 6),
      getCellCenter(10, 3),
      getCellCenter(12, 6),
      getCellCenter(9, 9),
      getCellCenter(6, 12),
      getCellCenter(3, 14),
    ],
  ];
  return paths[index % paths.length];
}

// Equidistant segment interpolation (each segment gets equal progress share),
// unlike navigation.ts interpolatePolylinePosition which is distance-weighted.
function interpolatePath(path: readonly { x: number; y: number }[], progress: number) {
  if (path.length === 0) {
    return { x: 48, y: 48 };
  }
  if (path.length === 1) {
    return path[0];
  }

  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (path.length - 1);
  const index = Math.min(path.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  const from = path[index];
  const to = path[index + 1];

  return {
    x: from.x + (to.x - from.x) * localProgress,
    y: from.y + (to.y - from.y) * localProgress,
  };
}

function getEncounterLabel(threat: RaidEncounterThreat): string {
  switch (threat) {
    case "boss":
      return "Boss Contact";
    case "elite":
      return "Elite Threat";
    default:
      return "Hostile Contact";
  }
}

function formatNeighborhoodLabel(location: string): string {
  const slug = location.replace("district/", "");
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFeatureEventKind(kind: RaidFeatureKind): RaidPresentationEvent["kind"] {
  switch (kind) {
    case "loot-cache":
      return "loot";
    case "intel-node":
      return "intel";
    case "hazard-zone":
      return "hazard";
    default:
      return "discovery";
  }
}

function getFeatureEventMessage(kind: RaidFeatureKind): string {
  switch (kind) {
    case "loot-cache":
      return "Team found a cache worth extracting.";
    case "intel-node":
      return "Team recovered actionable site intel.";
    case "hazard-zone":
      return "Team is navigating a hazardous zone.";
    default:
      return "Team picked through collapsed debris.";
  }
}

function getRaidGoalLabel(goal: RaidTeamGoal): string {
  switch (goal) {
    case "exploring":
      return "the interior";
    case "looting":
      return "recovering loot";
    case "intel":
      return "gathering intel";
    case "hunting":
      return "hostile patrols";
    case "boss":
      return "the boss chamber";
    case "retreating":
      return "the exit";
    case "regrouping":
      return "a regroup point";
  }
}

function getRaidResultSummaryLabel(result: "success" | "failure" | "mixed"): string {
  switch (result) {
    case "success":
      return "succeeded";
    case "mixed":
      return "ended with losses";
    case "failure":
      return "failed";
  }
}

function humanizeRuntimeReason(reason: string): string {
  return reason
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isFirstContractDeathShieldActive(context: SimSystemContext): boolean {
  const guidanceState = context.runtimeState.guidanceState;

  return (
    guidanceState.openingPathState === "active" &&
    !guidanceState.completedBeatIds.includes(FIRST_CONTRACT_SHIELD_END_BEAT_ID)
  );
}

function isFirstOpeningContractActive(context: SimSystemContext): boolean {
  const guidanceState = context.runtimeState.guidanceState;
  const openingTiming = guidanceState.openingTiming;
  const buildingEntity = context.singletonEntities.building;

  return (
    guidanceState.openingPathState === "active" &&
    (openingTiming?.securedContractCount ?? 0) <= 3 &&
    BuildingAuthority.contractLifecycle[buildingEntity] === "active"
  );
}

function applyFirstContractDeathShield(
  context: SimSystemContext,
  resolutionPacket: ActiveRaidResolutionPacket,
  operatorEntityById?: ReadonlyMap<string, number>,
): void {
  if (!isFirstContractDeathShieldActive(context)) {
    return;
  }

  let shieldApplied = false;
  resolutionPacket.operatorOutcomes = resolutionPacket.operatorOutcomes.map((outcome) => {
    const operatorEntity =
      operatorEntityById?.get(outcome.operatorId) ??
      context.runtimeState.operatorEntities.find(
        (entity) => OperatorIdentity.id[entity] === outcome.operatorId,
      );
    const currentSeverity = operatorEntity === undefined ? 0 : InjuryState.severity[operatorEntity];

    if (!outcome.died) {
      if (!isFirstOpeningContractActive(context)) {
        return outcome;
      }

      const injuryCap = FIRST_CONTRACT_INJURY_CAP_BY_RESULT[resolutionPacket.result];
      const cappedTotalInjury = Math.min(currentSeverity + outcome.injuryDelta, injuryCap);
      const cappedInjuryDelta = Math.max(0, cappedTotalInjury - currentSeverity);

      if (cappedInjuryDelta === outcome.injuryDelta) {
        return outcome;
      }

      shieldApplied = true;
      return {
        ...outcome,
        injuryDelta: cappedInjuryDelta,
      };
    }

    const shieldedTotalInjury = clamp(
      Math.max(currentSeverity + outcome.injuryDelta, FIRST_CONTRACT_SHIELDED_INJURY_TOTAL),
      0,
      FIRST_CONTRACT_FATAL_INJURY_THRESHOLD - 1,
    );

    shieldApplied = true;
    return {
      operatorId: outcome.operatorId,
      injuryDelta: Math.max(0, shieldedTotalInjury - currentSeverity),
      moraleDelta: outcome.moraleDelta,
      loyaltyDelta: outcome.loyaltyDelta,
      status: "hurt" as const,
    };
  });

  if (shieldApplied && !resolutionPacket.narrativeTags.includes("opening:first-contract-shield")) {
    resolutionPacket.narrativeTags = [
      ...resolutionPacket.narrativeTags,
      "opening:first-contract-shield",
    ];
  }
}

function getTeamDamageReasonLabel(reason: string): string {
  switch (reason) {
    case "retention_break":
      return "a retention break";
    case "morale_collapse":
      return "a morale collapse";
    case "losses":
      return "losses";
    case "recent damage":
      return "recent damage";
    default:
      return humanizeRuntimeReason(reason).toLowerCase();
  }
}

function getMissionTemplate(context: SimSystemContext, missionId: string) {
  const mission = context.registry.missionById.get(missionId);
  if (!mission) {
    throw new Error(`Raid system references unknown mission "${missionId}".`);
  }

  return mission;
}

export function getRecommendedOperatorCountForMission(baseDurationHours: number): number {
  return clamp(Math.ceil(baseDurationHours / 3), 2, 3);
}

export function computeSchedulePressure(currentBlock: string): number {
  switch (currentBlock) {
    case "raid":
      return 100;
    case "recovery":
      return 88;
    case "training":
      return 54;
    case "social":
      return 38;
    case "work":
      return 44;
    case "rest":
      return 30;
    default:
      return 18;
  }
}

function getMissionPreferenceScore(entity: number, missionTags: readonly string[]): number {
  const preferredTags = PreferenceState.preferredMissionTags[entity] ?? [];
  return preferredTags.reduce((total, tag) => {
    return total + (missionTags.includes(tag) ? 9 : 0);
  }, 0);
}

function getPreferredPartnerBonus(entity: number, partnerIds: readonly string[]): number {
  const preferredPartnerIds = PreferenceState.preferredPartnerIds[entity] ?? [];
  return partnerIds.reduce((total, partnerId) => {
    return total + (preferredPartnerIds.includes(partnerId) ? 8 : 0);
  }, 0);
}

export function computeRelationshipCohesion(
  context: SimSystemContext,
  leftId: string,
  rightId: string,
): number {
  return computeSocialCohesion(context, leftId, rightId);
}

function computeTeamCohesion(context: SimSystemContext, operatorIds: readonly string[]): number {
  if (operatorIds.length < 2) {
    return 50;
  }

  const recurringTeamEntity = findRecurringTeamForMembers(context, operatorIds);
  if (recurringTeamEntity !== undefined && RecurringTeam.damaged[recurringTeamEntity] !== 1) {
    // RecurringTeam members get +15 cohesion bonus when raiding together
    return clamp(RecurringTeam.cohesion[recurringTeamEntity] + 15, 0, 100);
  }

  // Fallback to pairwise for non-team groups
  const pairScores: number[] = [];
  for (let index = 0; index < operatorIds.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < operatorIds.length; otherIndex += 1) {
      pairScores.push(
        computeRelationshipCohesion(context, operatorIds[index], operatorIds[otherIndex]),
      );
    }
  }

  if (pairScores.length === 0) {
    return 50;
  }

  return pairScores.reduce((total, value) => total + value, 0) / pairScores.length;
}

function computeRiskRewardFit(
  context: SimSystemContext,
  entity: number,
  opportunityEntity: number,
): number {
  const contractPosture = getContractPostureConfig(getPolicyState(context));
  const riskGap = Math.abs(
    PreferenceState.riskTolerance[entity] - RaidOpportunityState.risk[opportunityEntity],
  );
  const rewardPull =
    (RaidOpportunityState.reward[opportunityEntity] / 2) *
    (PreferenceState.rewardFocus[entity] / 100);
  const intelConfidence = RaidOpportunityState.intel[opportunityEntity] * 0.12;
  const missionFit = getMissionPreferenceScore(
    entity,
    getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]).tags,
  );

  return clamp(
    22 +
      rewardPull +
      intelConfidence +
      missionFit -
      riskGap * 0.4 * contractPosture.riskGapPenaltyMultiplier,
    0,
    100,
  );
}

export function computeOperatorRaidReadiness(
  context: SimSystemContext,
  entity: number,
  opportunityEntity: number,
): RaidReadinessSignal {
  const recoveryTriage = getRecoveryTriageConfig(getPolicyState(context));
  const schedulePressure = computeSchedulePressure(ScheduleState.currentBlock[entity] || "idle");
  const assignmentPenalty = AssignmentState.kind[entity] === "raid" ? 40 : 0;
  const fatiguePenalty =
    NeedState.fatigue[entity] > recoveryTriage.fatigueRaidPenaltyThreshold
      ? (NeedState.fatigue[entity] - recoveryTriage.fatigueRaidPenaltyThreshold) * 0.9
      : 0;
  const trainingContribution = getOperatorTrainingReadinessContribution(entity);
  const availabilityScore = clamp(
    100 -
      InjuryState.severity[entity] * 0.85 -
      NeedState.fatigue[entity] * 0.55 -
      NeedState.stress[entity] * 0.35 -
      NeedState.hunger[entity] * 0.18 -
      fatiguePenalty -
      schedulePressure * 0.45 -
      assignmentPenalty +
      LoyaltyState.current[entity] * 0.08 +
      trainingContribution * 0.7,
    0,
    100,
  );
  const willingnessScore = clamp(
    availabilityScore * 0.6 +
      MoraleState.current[entity] * 0.26 +
      LoyaltyState.current[entity] * 0.18 +
      computeRiskRewardFit(context, entity, opportunityEntity) +
      Math.max(0, trainingContribution) * 0.35 +
      (ScheduleState.currentBlock[entity] === "rest"
        ? -PreferenceState.recoveryBias[entity] * 0.12
        : 0),
    0,
    100,
  );

  return {
    availabilityScore,
    willingnessScore,
    readinessScore: clamp(
      (availabilityScore + willingnessScore) / 2 +
        (100 - InjuryState.severity[entity]) * 0.08 +
        trainingContribution,
      0,
      100,
    ),
    schedulePressure,
  };
}

function removeRaidOpportunityEntity(context: SimSystemContext, entity: number): void {
  removeEntity(context.world, entity);
  removeTrackedEntity(context.runtimeState.raidOpportunityEntities, entity);
}

function updateOpportunityLifecycle(context: SimSystemContext): void {
  const currentMinute = getCurrentAbsoluteMinute(context);

  context.runtimeState.raidOpportunityEntities.slice().forEach((entity) => {
    if (currentMinute < RaidOpportunityState.expiresAtTick[entity]) {
      return;
    }

    removeRaidOpportunityEntity(context, entity);
  });
}

function spawnRaidOpportunity(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const guildEntity = context.singletonEntities.guild;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const currentMinute = getCurrentAbsoluteMinute(context);

  if (!contractSite || hasContractConcluded(contractSite)) {
    return;
  }

  const livingOperatorCount = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  ).length;
  if (livingOperatorCount < 2) {
    return;
  }

  if (context.runtimeState.raidOpportunityEntities.length >= MAX_OPEN_OPPORTUNITIES) {
    return;
  }

  const spawnInterval = clamp(
    210 -
      GuildState.reputation[guildEntity] * 8 -
      (BuildingAuthority.pressure[buildingEntity] ?? 0) * 6,
    120,
    240,
  );
  const lastRaidOpportunityTick = BuildingAuthority.lastRaidOpportunityTick[buildingEntity] ?? 0;
  if (currentMinute - lastRaidOpportunityTick < spawnInterval) {
    return;
  }

  const sequence = context.runtimeState.nextOpportunitySequence;
  const mission = getMissionTemplate(context, contractSite.missionId);
  const briefing = getContractBriefingState(context, contractSite);
  const entity = addEntity(context.world);
  const rng = new SeededRng(
    seedFromSimulationKey(
      context,
      `contract-opportunity:${contractSite.contractSiteId}:${sequence}`,
    ),
  );
  const threatVariance = rng.int(
    RAID_OPPORTUNITY_VARIANCE.threat.min,
    RAID_OPPORTUNITY_VARIANCE.threat.max,
  );
  const intelVariance = rng.int(
    RAID_OPPORTUNITY_VARIANCE.intel.min,
    RAID_OPPORTUNITY_VARIANCE.intel.max,
  );
  const rewardVariance = rng.int(
    RAID_OPPORTUNITY_VARIANCE.reward.min,
    RAID_OPPORTUNITY_VARIANCE.reward.max,
  );
  const opportunityBudget = computeRaidOpportunityEconomyBudget({
    contractThreat: contractSite.threat,
    contractIntel: getOpportunityIntelWithBriefing(contractSite.intel, briefing),
    contractReward: contractSite.reward,
    missionExpectedThreatTagCount: mission.expectedThreatTags.length,
    threatVariance,
    intelVariance,
    rewardVariance,
  });

  addComponent(context.world, entity, RaidOpportunityState);
  RaidOpportunityState.id[entity] = `opportunity/${sequence}`;
  RaidOpportunityState.missionId[entity] = mission.id;
  RaidOpportunityState.location[entity] = contractSite.location;
  RaidOpportunityState.threat[entity] = opportunityBudget.threat;
  RaidOpportunityState.intel[entity] = opportunityBudget.intel;
  RaidOpportunityState.reward[entity] = opportunityBudget.reward;
  RaidOpportunityState.risk[entity] = opportunityBudget.risk;
  RaidOpportunityState.status[entity] = "open";
  RaidOpportunityState.interestedOperatorIds[entity] = [];
  RaidOpportunityState.claimedOperatorIds[entity] = [];
  RaidOpportunityState.createdTick[entity] = currentMinute;
  RaidOpportunityState.expiresAtTick[entity] =
    currentMinute + DEFAULT_OPPORTUNITY_LIFETIME_MINUTES - mission.baseDurationHours * 10;

  context.runtimeState.raidOpportunityEntities.push(entity);
  context.runtimeState.nextOpportunitySequence += 1;
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = currentMinute;
  pushRuntimeCue(context, "raid.opportunity");
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `New raid opportunity: ${mission.name}`,
    accent: "gold",
  });
}

function getSortedOpportunityEntities(context: SimSystemContext): number[] {
  return [...context.runtimeState.raidOpportunityEntities].sort((left, right) => {
    const createdTickDelta =
      RaidOpportunityState.createdTick[left] - RaidOpportunityState.createdTick[right];
    if (createdTickDelta !== 0) {
      return createdTickDelta;
    }

    return RaidOpportunityState.id[left].localeCompare(RaidOpportunityState.id[right]);
  });
}

function planOpportunityTeam(
  context: SimSystemContext,
  opportunityEntity: number,
  reservedOperatorIds: Set<string>,
) {
  const policies = getPolicyState(context);
  const contractPosture = getContractPostureConfig(policies);
  const recoveryTriage = getRecoveryTriageConfig(policies);
  const autonomyThresholds = getAutonomyThresholdsForPolicies(policies);
  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const minimumRaidSize = getRecommendedOperatorCountForMission(mission.baseDurationHours);

  const candidates = context.runtimeState.operatorEntities
    .filter((entity) => {
      if (OperatorIdentity.lifecycleStatus[entity] !== "active") return false;
      if (reservedOperatorIds.has(OperatorIdentity.id[entity])) return false;
      if (RaidParticipationState.activeRaidId[entity].length > 0) return false;

      if (InjuryState.severity[entity] > recoveryTriage.injuryRaidThreshold) return false;
      if (NeedState.fatigue[entity] > recoveryTriage.fatigueRaidPenaltyThreshold) return false;

      const autonomyFlags = computeAutonomyFlags(entity, autonomyThresholds);
      if (autonomyFlags.refusalRisk) {
        const refusalRng = new SeededRng(
          seedFromSimulationKey(
            context,
            `refusal:${OperatorIdentity.id[entity]}:${getCurrentAbsoluteMinute(context)}`,
          ),
        );
        if (refusalRng.chance(0.4)) return false;
      }
      return true;
    })
    .map((entity) => {
      const readiness = computeOperatorRaidReadiness(context, entity, opportunityEntity);
      const priorTeamBonus = context.runtimeState.recurringTeamEntities.reduce(
        (best, teamEntity) => {
          const members = RecurringTeam.memberIds[teamEntity] ?? [];
          if (!members.includes(OperatorIdentity.id[entity])) {
            return best;
          }
          if (RecurringTeam.damaged[teamEntity] === 1) {
            return Math.max(best, 2);
          }
          return Math.max(best, (RecurringTeam.cohesion[teamEntity] - 50) * 0.12);
        },
        0,
      );
      return {
        entity,
        readiness: {
          ...readiness,
          readinessScore: readiness.readinessScore + priorTeamBonus,
        },
      };
    })
    .filter(({ readiness }) => {
      return readiness.willingnessScore >= contractPosture.minimumWillingnessThreshold;
    })
    .sort((left, right) => {
      const readinessDelta = right.readiness.willingnessScore - left.readiness.willingnessScore;
      if (readinessDelta !== 0) {
        return readinessDelta;
      }

      return OperatorIdentity.id[left.entity].localeCompare(OperatorIdentity.id[right.entity]);
    });

  const interestedOperatorIds = candidates.map(({ entity }) => OperatorIdentity.id[entity]);
  const desiredRaidSize = Math.min(
    minimumRaidSize + 1,
    Math.max(minimumRaidSize, candidates.length),
  );
  const team: typeof candidates = [];

  if (candidates.length > 0) {
    team.push(candidates[0]);
  }

  const chosenIdSet = new Set(team.map(({ entity }) => OperatorIdentity.id[entity]));

  while (team.length < desiredRaidSize) {
    const remaining = candidates.filter(
      ({ entity }) => !chosenIdSet.has(OperatorIdentity.id[entity]),
    );
    if (remaining.length === 0) {
      break;
    }

    const nextCandidate = remaining
      .map((candidate) => {
        const candidateId = OperatorIdentity.id[candidate.entity];
        const cohesionScore =
          team.length === 0
            ? 50
            : team.reduce((total, teammate) => {
                return (
                  total +
                  computeRelationshipCohesion(
                    context,
                    OperatorIdentity.id[teammate.entity],
                    candidateId,
                  )
                );
              }, 0) / team.length;
        const recurringTeamBonus =
          team.length === 0
            ? 0
            : getRecurringTeamCohesionBonus(context, [
                ...team.map(({ entity }) => OperatorIdentity.id[entity]),
                candidateId,
              ]);
        const partnerBonus = getPreferredPartnerBonus(candidate.entity, [...chosenIdSet]);
        const selectionScore =
          candidate.readiness.willingnessScore +
          cohesionScore * 0.35 +
          recurringTeamBonus * 0.5 +
          partnerBonus;

        return {
          candidate,
          selectionScore,
        };
      })
      .sort((left, right) => {
        const scoreDelta = right.selectionScore - left.selectionScore;
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return OperatorIdentity.id[left.candidate.entity].localeCompare(
          OperatorIdentity.id[right.candidate.entity],
        );
      })[0];

    if (!nextCandidate) {
      break;
    }

    if (team.length >= minimumRaidSize && nextCandidate.selectionScore < 62) {
      break;
    }

    team.push(nextCandidate.candidate);
    chosenIdSet.add(OperatorIdentity.id[nextCandidate.candidate.entity]);
  }

  const teamIds = team.map(({ entity }) => OperatorIdentity.id[entity]);
  const teamCohesion = computeTeamCohesion(context, teamIds);
  const averageReadiness =
    team.reduce((total, member) => total + member.readiness.readinessScore, 0) /
    Math.max(1, team.length);

  return {
    minimumRaidSize,
    interestedOperatorIds,
    claimedOperatorIds:
      team.length >= minimumRaidSize && averageReadiness + teamCohesion * 0.2 >= 82 ? teamIds : [],
    averageReadiness,
    teamCohesion,
  };
}

function refreshOpportunityClaims(context: SimSystemContext): void {
  const currentMinute = getCurrentAbsoluteMinute(context);
  const reservedOperatorIds = new Set<string>();

  getSortedOpportunityEntities(context).forEach((opportunityEntity) => {
    const plan = planOpportunityTeam(context, opportunityEntity, reservedOperatorIds);
    const age = currentMinute - RaidOpportunityState.createdTick[opportunityEntity];

    RaidOpportunityState.interestedOperatorIds[opportunityEntity] = [...plan.interestedOperatorIds];

    if (age >= FORMATION_DELAY_MINUTES && plan.claimedOperatorIds.length > 0) {
      RaidOpportunityState.status[opportunityEntity] = "forming";
      RaidOpportunityState.claimedOperatorIds[opportunityEntity] = [...plan.claimedOperatorIds];
      plan.claimedOperatorIds.forEach((operatorId) => reservedOperatorIds.add(operatorId));
      return;
    }

    RaidOpportunityState.status[opportunityEntity] = "open";
    RaidOpportunityState.claimedOperatorIds[opportunityEntity] = [];
  });
}

/** Compute the challenge score penalty from boss tags. */
export function computeBossTagPenalty(tags: readonly BossTag[]): number {
  let penalty = 0;
  for (const tag of tags) {
    switch (tag) {
      case "boss:resilience-pierce":
        penalty += 8;
        break;
      case "boss:recovery-suppress":
        penalty += 6;
        break;
      case "boss:speed-drain":
        penalty += 5;
        break;
      case "boss:summon-pressure":
        penalty += 7;
        break;
      case "boss:intel-resist":
        penalty += 4;
        break;
      case "boss:area-damage":
        penalty += 9;
        break;
    }
  }
  return penalty;
}

/** Compute team score bonus from exploiting boss weaknesses. */
const VALID_STAT_KEYS = new Set([
  "strength",
  "speed",
  "endurance",
  "resilience",
  "perception",
  "intelligence",
]);

export function computeBossWeaknessBonus(
  weaknesses: readonly BossWeakness[],
  operatorEntities: number[],
  context?: SimSystemContext,
): { bonus: number; exploitedWeaknesses: string[] } {
  let bonus = 0;
  const exploitedWeaknesses: string[] = [];

  for (const weakness of weaknesses) {
    switch (weakness.kind) {
      case "role": {
        const hasRole = operatorEntities.some(
          (e) => OperatorIdentity.roleTag[e] === weakness.target,
        );
        if (hasRole) {
          bonus += 8 * weakness.multiplier;
          exploitedWeaknesses.push(`role:${weakness.target}`);
        }
        break;
      }
      case "stat": {
        if (context && VALID_STAT_KEYS.has(weakness.target)) {
          const statKey = weakness.target as keyof OperatorBaseStats;
          const avgStat =
            operatorEntities.reduce((sum, e) => {
              const stats = computeDerivedStats(context, e).effective;
              return sum + stats[statKey];
            }, 0) / Math.max(1, operatorEntities.length);
          if (avgStat >= 12) {
            bonus += 6 * weakness.multiplier;
            exploitedWeaknesses.push(`stat:${weakness.target}`);
          }
        } else if (operatorEntities.length >= 2) {
          bonus += 4 * weakness.multiplier;
          exploitedWeaknesses.push(`stat:${weakness.target}`);
        }
        break;
      }
      case "tag": {
        // Future: check if team has preparation tags. Skipped for now.
        break;
      }
    }
  }

  return { bonus, exploitedWeaknesses };
}

function createResolutionPacket(
  context: SimSystemContext,
  opportunityEntity: number,
  operatorEntities: number[],
  averageReadiness: number,
  teamCohesion: number,
): ActiveRaidResolutionPacket {
  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const combatProfile = mission.combatProfile ?? null;
  // Resolve site-specific boss from boss registry, falling back to mission template
  const resContractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  const resSiteConcept = resContractSite?.siteConceptId
    ? siteConceptById.get(resContractSite.siteConceptId)
    : undefined;
  const effectiveBoss =
    (resSiteConcept?.bossId ? context.registry.bossById.get(resSiteConcept.bossId) : undefined) ??
    combatProfile?.boss ??
    null;
  const opportunityRisk = RaidOpportunityState.risk[opportunityEntity];
  const opportunityThreat = RaidOpportunityState.threat[opportunityEntity];
  const opportunityReward = RaidOpportunityState.reward[opportunityEntity];
  // ── Base challenge score ─────────────────────────────────────────
  let challengeScore =
    opportunityRisk +
    opportunityThreat * 0.45 +
    mission.baseDurationHours * 4 -
    RaidOpportunityState.intel[opportunityEntity] * 0.16;

  // ── Base team score (includes derived stats combat power) ───────
  const teamCombatPower =
    operatorEntities.reduce((total, entity) => {
      return total + computeDerivedStats(context, entity).combatPower;
    }, 0) / Math.max(1, operatorEntities.length);
  let teamScore =
    averageReadiness +
    teamCohesion * 0.4 +
    teamCombatPower * 0.6 +
    GuildState.intel[context.singletonEntities.guild] * 6 +
    mission.expectedThreatTags.length * 2;

  // ── Boss tag penalties raise the challenge ──────────────────────
  if (effectiveBoss) {
    challengeScore += computeBossTagPenalty(effectiveBoss.tags);
    challengeScore += effectiveBoss.threat * 0.25;
  }

  // ── Boss weakness bonuses reward team composition ───────────────
  let exploitedWeaknesses: string[] = [];
  if (effectiveBoss) {
    const weaknessResult = computeBossWeaknessBonus(
      effectiveBoss.weaknesses,
      operatorEntities,
      context,
    );
    teamScore += weaknessResult.bonus;
    exploitedWeaknesses = weaknessResult.exploitedWeaknesses;
  }

  const result: "success" | "failure" | "mixed" =
    teamScore >= challengeScore + 12
      ? "success"
      : teamScore >= challengeScore - 6
        ? "mixed"
        : "failure";

  return {
    result,
    reputationDelta: computeRaidReputationDelta(result),
    cashDelta: computeRaidCashDelta(result, opportunityReward, opportunityRisk),
    operatorOutcomes: operatorEntities.map((entity, index) => {
      const injuryDelta =
        result === "failure"
          ? Math.round(opportunityRisk * 0.22) + 10 + index * 2
          : result === "mixed"
            ? Math.round(opportunityRisk * 0.12) + 4 + index
            : Math.round(opportunityRisk * 0.05) + index;
      const totalInjury = InjuryState.severity[entity] + injuryDelta;
      const died = result === "failure" && totalInjury >= 95 && opportunityRisk >= 70;

      return {
        operatorId: OperatorIdentity.id[entity],
        injuryDelta,
        moraleDelta:
          result === "failure"
            ? -10
            : result === "mixed"
              ? -3
              : 6 + Math.round(teamCohesion * 0.04),
        loyaltyDelta: result === "failure" ? -7 : result === "mixed" ? -2 : 3,
        status: (injuryDelta >= 16 ? "hurt" : result === "failure" ? "shaken" : "steady") as
          | "steady"
          | "shaken"
          | "hurt",
        ...(died ? { died: true } : {}),
      };
    }),
    narrativeTags: (() => {
      const tags: string[] = [
        `mission:${mission.objectiveType}`,
        `location:${RaidOpportunityState.location[opportunityEntity]}`,
        `result:${result}`,
      ];
      if (effectiveBoss) {
        tags.push(`boss:${effectiveBoss.bossId}`);
        for (const tag of effectiveBoss.tags) {
          tags.push(tag);
        }
        if (result === "success") {
          tags.push("boss:defeated");
        }
        if (exploitedWeaknesses.length > 0) {
          tags.push("boss:weakness-exploited");
        }
      }
      return tags;
    })(),
    intelMismatchTags:
      RaidOpportunityState.intel[opportunityEntity] >= 60
        ? []
        : [`intel:${mission.intelConfidenceFloor}`],
  };
}

/**
 * Derive a legacy-compatible resolution packet from a simulation-owned RaidRun.
 * This is the transition bridge: the RaidRun is the authority, and this function
 * projects into the format downstream consumers still expect.
 */
function deriveResolutionFromRun(
  run: import("save/types").RaidRunSnapshot,
  _operatorEntities: number[],
): ActiveRaidResolutionPacket {
  const summary = run.summaryDraft;
  const result = summary?.result ?? "mixed";
  const teamWiped = run.teamOperatorIds.every(
    (operatorId) => (run.derivedState.operatorHp[operatorId] ?? 1) <= 0,
  );

  return {
    result,
    reputationDelta: summary?.reputationDelta ?? 0,
    cashDelta: summary?.cashDelta ?? 0,
    operatorOutcomes: run.teamOperatorIds.map((operatorId) => {
      const injuryDelta = run.derivedState.operatorInjury[operatorId] ?? 0;
      const hp = run.derivedState.operatorHp[operatorId] ?? 1;
      const down = hp <= 0;
      const died = down && result === "failure" && teamWiped && injuryDelta >= 45;

      return {
        operatorId,
        injuryDelta,
        moraleDelta: result === "failure" ? -10 : result === "mixed" ? -3 : 6,
        loyaltyDelta: result === "failure" ? -7 : result === "mixed" ? -2 : 3,
        status: (down ? "hurt" : result === "failure" ? "shaken" : "steady") as
          | "steady"
          | "shaken"
          | "hurt",
        ...(died ? { died: true } : {}),
      };
    }),
    narrativeTags: [`result:${result}`, ...(summary?.contributingFactors ?? [])],
    intelMismatchTags: [],
  };
}

function scaleObjectiveBiasLootDrops(lootDrops: readonly string[], multiplier: number): string[] {
  if (lootDrops.length === 0 || multiplier === 1) {
    return [...lootDrops];
  }

  if (multiplier > 1) {
    const targetCount = Math.max(lootDrops.length, Math.round(lootDrops.length * multiplier));
    const extrasNeeded = targetCount - lootDrops.length;
    return [...lootDrops, ...lootDrops.slice(0, extrasNeeded)];
  }

  const targetCount = Math.round(lootDrops.length * multiplier);
  if (targetCount <= 0) {
    return [];
  }

  return lootDrops.slice(0, targetCount);
}

function stripBossDefeatTags(tags: readonly string[]): string[] {
  return tags.filter((tag) => tag !== "boss:defeated");
}

function buildBossRetreatResolutionPacket(
  packet: ActiveRaidPacketRecord,
): ActiveRaidResolutionPacket {
  return {
    ...packet.resolutionPacket,
    result: "failure",
    reputationDelta: Math.min(packet.resolutionPacket.reputationDelta, -4),
    cashDelta: Math.min(packet.resolutionPacket.cashDelta, -Math.round(packet.threat * 0.35)),
    operatorOutcomes: packet.operatorIds.map((operatorId) => ({
      operatorId,
      injuryDelta: 8,
      moraleDelta: -6,
      loyaltyDelta: -3,
      status: "shaken" as const,
    })),
    narrativeTags: stripBossDefeatTags(packet.resolutionPacket.narrativeTags),
  };
}

export function buildBossEncounterResolutionPacket(
  packet: ActiveRaidPacketRecord,
  encounter: BossEncounterInstance,
): ActiveRaidResolutionPacket {
  const isVictory = encounter.status === "victory";
  const actorByOperatorId = new Map(
    Object.values(encounter.actors)
      .filter((actor) => actor.kind === "operator" && actor.operatorId)
      .map((actor) => [actor.operatorId!, actor]),
  );

  return {
    ...packet.resolutionPacket,
    result: isVictory ? "success" : "failure",
    reputationDelta: isVictory
      ? Math.max(packet.resolutionPacket.reputationDelta, Math.round(packet.reward * 0.08))
      : Math.min(
          packet.resolutionPacket.reputationDelta,
          -Math.max(4, Math.round(packet.threat * 0.08)),
        ),
    cashDelta: isVictory
      ? Math.max(packet.resolutionPacket.cashDelta, Math.round(packet.reward))
      : Math.min(packet.resolutionPacket.cashDelta, -Math.round(packet.threat * 0.4)),
    operatorOutcomes: packet.operatorIds.map((operatorId) => {
      const actor = actorByOperatorId.get(operatorId);
      const missingHp = actor ? Math.max(0, actor.maxHp - actor.currentHp) : 0;
      const injuryDelta = Math.max(
        actor?.condition === "incapacitated" ? 30 : 0,
        Math.round(missingHp / 4),
      );
      return {
        operatorId,
        injuryDelta,
        moraleDelta: isVictory ? 7 : -10,
        loyaltyDelta: isVictory ? 4 : -6,
        status:
          actor?.condition === "incapacitated"
            ? ("hurt" as const)
            : injuryDelta >= 12
              ? ("hurt" as const)
              : isVictory
                ? ("steady" as const)
                : ("shaken" as const),
        ...(actor?.condition === "incapacitated" && encounter.status === "wipe"
          ? { died: true }
          : {}),
      };
    }),
    narrativeTags: [
      ...stripBossDefeatTags(packet.resolutionPacket.narrativeTags),
      ...(isVictory ? ["boss:defeated"] : []),
    ],
  };
}

function launchOpportunityRaid(context: SimSystemContext, opportunityEntity: number): void {
  // Treasury gate: do not launch raids when the guild is in debt
  if (GuildState.treasury[context.singletonEntities.guild] < 0) {
    pushRuntimeEvent(context, {
      kind: "resource_swing",
      message: "Raid cancelled — treasury is negative",
      accent: "ember",
    });
    removeRaidOpportunityEntity(context, opportunityEntity);
    return;
  }

  const mission = getMissionTemplate(context, RaidOpportunityState.missionId[opportunityEntity]);
  const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  const objectiveBiasState = getPolicyState(context);
  const objectiveBias = getObjectiveBiasConfig(objectiveBiasState);
  const claimedOperatorIds = [
    ...(RaidOpportunityState.claimedOperatorIds[opportunityEntity] ?? []),
  ];
  const operatorEntities = claimedOperatorIds
    .map((operatorId) => {
      return context.runtimeState.operatorEntities.find(
        (entity) => OperatorIdentity.id[entity] === operatorId,
      );
    })
    .filter((entity): entity is number => entity !== undefined);

  if (operatorEntities.length < getRecommendedOperatorCountForMission(mission.baseDurationHours)) {
    return;
  }

  const startedTick = getCurrentAbsoluteMinute(context);
  const raidId = `raid/${context.runtimeState.nextRaidSequence}`;
  const dockOperational = hasOperationalRoomTemplate(context, PORTERS_DOCK_TEMPLATE_ID);
  let durationHours = Math.max(1, mission.baseDurationHours * objectiveBias.durationMultiplier);
  if (dockOperational) {
    durationHours = Math.max(1, durationHours - 1);
  }
  const returnTick = startedTick + Math.max(60, Math.round(durationHours * 60));
  const averageReadiness =
    operatorEntities.reduce((total, entity) => {
      return (
        total + computeOperatorRaidReadiness(context, entity, opportunityEntity).readinessScore
      );
    }, 0) / Math.max(1, operatorEntities.length);

  claimedOperatorIds.forEach((operatorId, index) => {
    const operatorEntity = operatorEntities[index];
    if (operatorEntity === undefined) {
      return;
    }

    autoSelectAccessory(context, operatorId, OperatorIdentity.roleTag[operatorEntity]);
  });

  let teamCohesion = computeTeamCohesion(context, claimedOperatorIds);

  // Staging bonus: operational staging rooms improve departure coordination
  const stagingOperational =
    hasOperationalRoomTemplate(context, BODEGA_ALLEY_STAGING_TEMPLATE_ID) ||
    hasOperationalRoomWithTag(context, "ops:staging");
  const stagingStaffed =
    hasStaffedOperationalRoomTemplate(context, BODEGA_ALLEY_STAGING_TEMPLATE_ID) ||
    hasStaffedOperationalRoomWithTag(context, "ops:staging");
  if (stagingOperational) {
    teamCohesion = clamp(teamCohesion + (stagingStaffed ? 8 : 4), 0, 100);
  }
  if (dockOperational) {
    teamCohesion = clamp(teamCohesion + 6, 0, 100);
  }
  const contractBriefing = getContractBriefingState(context, contractSite);

  // ── Run deterministic raid simulation ──
  const siteSeed = seedFromSimulationKey(
    context,
    `raid-sim:${raidId}:${contractSite?.contractSiteId ?? "none"}`,
  );
  const siteConceptId = contractSite?.siteConceptId;
  const siteConcept = siteConceptId ? siteConceptById.get(siteConceptId) : undefined;
  const simOperators = buildSimOperators(context, operatorEntities);

  const raidRun = simulateRaidRun({
    raidId,
    contractSiteId: contractSite?.contractSiteId ?? "",
    missionId: mission.id,
    siteSeed,
    missionDurationHours: durationHours,
    contractReward: RaidOpportunityState.reward[opportunityEntity],
    contractRisk: RaidOpportunityState.threat[opportunityEntity],
    operators: simOperators,
    enemyFamilies: context.registry.enemyFamilies,
    enemyFamilyIds: siteConcept?.enemyFamilyIds ?? [],
    hazardTags: siteConcept?.hazardTags ?? [],
    hasBoss:
      contractSite?.requiresBossClear === true &&
      (siteConcept?.bossId
        ? context.registry.bossById.has(siteConcept.bossId)
        : (mission.combatProfile?.boss ?? null) !== null),
    bossId: siteConcept?.bossId ?? mission.combatProfile?.boss?.bossId,
    intelLevel: RaidOpportunityState.intel[opportunityEntity],
    teamCohesion,
    contractExplorationProgress: contractSite?.explorationProgress ?? 0,
    contractBossIntelProgress: clamp(
      (contractSite?.bossIntelProgress ?? 0) + (contractBriefing?.bossIntelBonus ?? 0),
      0,
      100,
    ),
    contractBossAvailable: contractSite?.bossAvailable ?? false,
    contractPosture: objectiveBiasState.contractPosture,
    objectiveBias: objectiveBiasState.objectiveBias,
    recoveryTriage: objectiveBiasState.recoveryTriage,
    staffingPriority: objectiveBiasState.staffingPriority,
    rosterFlow: objectiveBiasState.rosterFlow,
  });

  // Derive resolution packet from simulation transcript for compatibility
  const resolutionPacket = raidRun.summaryDraft
    ? deriveResolutionFromRun(raidRun, operatorEntities)
    : createResolutionPacket(
        context,
        opportunityEntity,
        operatorEntities,
        averageReadiness,
        teamCohesion,
      );
  applyFirstContractDeathShield(context, resolutionPacket);
  if (dockOperational) {
    pushUniqueTag(resolutionPacket.narrativeTags, "dock:staged");
  }

  BuildingAuthority.activeRaidPackets[context.singletonEntities.building] = [
    ...(BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? []),
    {
      id: raidId,
      contractSiteId: contractSite?.contractSiteId ?? "",
      opportunityId: RaidOpportunityState.id[opportunityEntity],
      missionId: mission.id,
      location: RaidOpportunityState.location[opportunityEntity],
      startedAt: formatWorldTimestamp(context),
      startedTick,
      revealProgress: 0,
      operatorIds: claimedOperatorIds,
      returnTick,
      durationHours,
      threat: RaidOpportunityState.threat[opportunityEntity],
      intel: RaidOpportunityState.intel[opportunityEntity],
      reward: RaidOpportunityState.reward[opportunityEntity],
      cohesion: teamCohesion,
      briefingSource: contractBriefing?.source ?? null,
      briefingStatus: contractBriefing?.status ?? null,
      resolutionPacket,
      raidRun,
    },
  ];

  operatorEntities.forEach((entity) => {
    RaidParticipationState.activeRaidId[entity] = raidId;
    RaidParticipationState.missionId[entity] = mission.id;
    RaidParticipationState.returnTick[entity] = returnTick;
    AssignmentState.kind[entity] = "raid";
    AssignmentState.targetId[entity] = raidId;
    ScheduleState.currentBlock[entity] = "raid";
  });

  GuildState.intel[context.singletonEntities.guild] = Math.max(
    0,
    GuildState.intel[context.singletonEntities.guild] - 1,
  );
  context.runtimeState.nextRaidSequence += 1;
  pushRuntimeCue(context, "raid.launch");
  const operatorNames = claimedOperatorIds.map((id) => {
    const opEntity = operatorEntities.find((e) => OperatorIdentity.id[e] === id);
    return opEntity !== undefined ? (OperatorIdentity.name[opEntity] ?? id) : id;
  });
  pushRuntimeEvent(context, {
    kind: "team_departure",
    message: `${operatorNames.join(", ")} departed on ${mission.name} under ${getPolicyOptionLabel("contractPosture", objectiveBiasState.contractPosture)} posture`,
    accent: "gold",
    targetKind: "team",
    targetId: raidId,
  });
  removeRaidOpportunityEntity(context, opportunityEntity);
}

function launchFormedRaids(context: SimSystemContext): void {
  getSortedOpportunityEntities(context)
    .filter((entity) => RaidOpportunityState.status[entity] === "forming")
    .forEach((entity) => {
      launchOpportunityRaid(context, entity);
    });
}

function finalizeRaidPacket(
  context: SimSystemContext,
  packet: ActiveRaidPacketRecord,
  currentMinute: number,
  operatorEntityById: ReadonlyMap<string, number>,
): void {
  const buildingEntity = context.singletonEntities.building;
  applyFirstContractDeathShield(context, packet.resolutionPacket, operatorEntityById);

  GuildState.treasury[context.singletonEntities.guild] += packet.resolutionPacket.cashDelta;
  GuildState.reputation[context.singletonEntities.guild] += packet.resolutionPacket.reputationDelta;
  pushRuntimeCue(
    context,
    packet.resolutionPacket.result === "failure" ? "raid.return.failure" : "raid.return.success",
  );

  const missionTemplate = context.registry.missions.find((m) => m.id === packet.missionId);
  const missionLabel = missionTemplate?.name ?? packet.missionId;
  const res = packet.resolutionPacket;
  const infirmaryOperational = hasOperationalRoomTemplate(context, PORTERS_INFIRMARY_TEMPLATE_ID);
  const breakRoomOperational = hasOperationalRoomTemplate(context, PORTERS_BREAK_ROOM_TEMPLATE_ID);
  const deckOperational = hasOperationalRoomTemplate(context, PORTERS_DECK_TEMPLATE_ID);
  let usedInfirmary = false;
  let usedBreakRoom = false;
  let usedDeck = false;
  const trainingFactors = getTeamTrainingFactor(
    packet.operatorIds
      .map((operatorId) => operatorEntityById.get(operatorId))
      .filter((entity): entity is number => entity !== undefined),
  );
  const returningOperatorNames = packet.resolutionPacket.operatorOutcomes
    .filter((outcome) => !outcome.died)
    .map((outcome) => {
      const operatorEntity = operatorEntityById.get(outcome.operatorId);
      return operatorEntity === undefined
        ? outcome.operatorId
        : (OperatorIdentity.name[operatorEntity] ?? outcome.operatorId);
    });
  res.operatorOutcomes.forEach((outcome) => {
    if (outcome.died) {
      return;
    }

    if (deckOperational) {
      outcome.moraleDelta += 2;
      usedDeck = true;
    }

    if (breakRoomOperational && (outcome.injuryDelta > 0 || outcome.status !== "steady")) {
      outcome.moraleDelta += 2;
      outcome.loyaltyDelta += 2;
      usedBreakRoom = true;
    }

    if (infirmaryOperational && outcome.injuryDelta > 0) {
      outcome.moraleDelta += 1;
      usedInfirmary = true;
    }
  });
  if (returningOperatorNames.length > 0) {
    pushRuntimeEvent(context, {
      kind: "team_return",
      message: `${returningOperatorNames.join(", ")} returned from ${missionLabel}`,
      accent: "gold",
      targetKind: "team",
      targetId: packet.id,
    });
  }
  const activePolicies = getPolicyState(context);
  pushRuntimeEvent(context, {
    kind: "raid_result",
    message: `${missionLabel} ${getRaidResultSummaryLabel(res.result)} (${res.reputationDelta >= 0 ? "+" : ""}${res.reputationDelta} rep, ${res.cashDelta >= 0 ? "+" : ""}${res.cashDelta} cash, ${getPolicyOptionLabel("contractPosture", activePolicies.contractPosture)} posture)`,
    accent: res.result === "failure" ? "magma" : res.result === "mixed" ? "ember" : "gold",
    targetKind: "team",
    targetId: packet.id,
  });

  packet.resolutionPacket.operatorOutcomes.forEach((outcome) => {
    const operatorEntity = operatorEntityById.get(outcome.operatorId);
    if (operatorEntity === undefined) {
      return;
    }
    const injuryDelta =
      infirmaryOperational && outcome.injuryDelta > 0
        ? Math.max(0, outcome.injuryDelta - 2)
        : outcome.injuryDelta;

    MoraleState.current[operatorEntity] = clamp(
      MoraleState.current[operatorEntity] + outcome.moraleDelta,
      0,
      100,
    );
    LoyaltyState.current[operatorEntity] = clamp(
      LoyaltyState.current[operatorEntity] + outcome.loyaltyDelta,
      0,
      100,
    );
    InjuryState.severity[operatorEntity] = clamp(
      InjuryState.severity[operatorEntity] + injuryDelta,
      0,
      100,
    );
    InjuryState.recoveryHoursRemaining[operatorEntity] = Math.max(
      InjuryState.recoveryHoursRemaining[operatorEntity],
      injuryDelta *
        INJURY_RECOVERY_HOURS_PER_POINT *
        (infirmaryOperational && outcome.injuryDelta > 0 ? 0.72 : 1),
    );
    applyPostRaidTrainingWear(operatorEntity, outcome.injuryDelta, outcome.died === true);
    RaidParticipationState.activeRaidId[operatorEntity] = "";
    RaidParticipationState.missionId[operatorEntity] = "";
    RaidParticipationState.returnTick[operatorEntity] = 0;

    if (outcome.died) {
      const opName = OperatorIdentity.name[operatorEntity] ?? outcome.operatorId;
      unequipItem(context, outcome.operatorId, "weapon");
      unequipItem(context, outcome.operatorId, "outfitOverlay");
      unequipItem(context, outcome.operatorId, "accessory");
      OperatorIdentity.lifecycleStatus[operatorEntity] = "dead";
      OperatorIdentity.deathTick[operatorEntity] = getCurrentAbsoluteMinute(context);
      OperatorIdentity.deathRaidSummaryId[operatorEntity] = packet.id;
      OperatorIdentity.departureTick[operatorEntity] = 0;
      OperatorIdentity.departureReason[operatorEntity] = "";
      AssignmentState.kind[operatorEntity] = "idle";
      AssignmentState.targetId[operatorEntity] = "";
      ScheduleState.currentBlock[operatorEntity] = "idle";
      pushRuntimeCue(context, "raid.death");
      pushRuntimeEvent(context, {
        kind: "death",
        message: `${opName} killed in action`,
        accent: "magma",
        targetKind: "operator",
        targetId: outcome.operatorId,
      });
      return;
    }

    if (outcome.injuryDelta > 20) {
      const opName = OperatorIdentity.name[operatorEntity] ?? outcome.operatorId;
      pushRuntimeEvent(context, {
        kind: "injury",
        message: `${opName} injured during the raid`,
        accent: "ember",
        targetKind: "operator",
        targetId: outcome.operatorId,
      });
    }

    AssignmentState.kind[operatorEntity] =
      InjuryState.recoveryHoursRemaining[operatorEntity] > 0 ? "recovery" : "idle";
    AssignmentState.targetId[operatorEntity] = "";
    ScheduleState.currentBlock[operatorEntity] =
      InjuryState.recoveryHoursRemaining[operatorEntity] > 0 ? "recovery" : "idle";
  });

  const lootRng = new SeededRng(
    seedFromSimulationKey(context, `loot:${packet.id}:${currentMinute}`),
  );
  const objectiveBias = getObjectiveBiasConfig(getPolicyState(context));
  const lootDrops = scaleObjectiveBiasLootDrops(
    generateLootDrops(context, lootRng, packet.resolutionPacket.result, packet.missionId),
    objectiveBias.lootMultiplier,
  );
  applyLootToInventory(context, lootDrops);

  const treatmentCost = getRaidTreatmentCost(context, packet, operatorEntityById);
  if (treatmentCost > 0) {
    GuildState.treasury[context.singletonEntities.guild] = Math.max(
      0,
      GuildState.treasury[context.singletonEntities.guild] - treatmentCost,
    );
    pushRuntimeEvent(context, {
      kind: "resource_swing",
      message: `Post-raid treatment and restock cost -$${treatmentCost}`,
      accent: "ember",
    });
  }
  if (usedInfirmary) {
    pushUniqueTag(res.narrativeTags, "infirmary:stabilized");
  }
  if (usedBreakRoom) {
    pushUniqueTag(res.narrativeTags, "break_room:decompressed");
  }
  if (usedDeck) {
    pushUniqueTag(res.narrativeTags, "deck:aired_out");
  }

  const diedOperatorIds = packet.resolutionPacket.operatorOutcomes
    .filter((outcome) => outcome.died)
    .map((outcome) => outcome.operatorId);
  const survivingOperatorIds = packet.operatorIds.filter((id) => !diedOperatorIds.includes(id));

  updateRecurringTeamAfterRaid(
    context,
    packet.operatorIds,
    packet.resolutionPacket.result,
    currentMinute,
  );

  diedOperatorIds.forEach((deceasedId) => {
    applySocialFalloutAfterDeath(context, deceasedId, survivingOperatorIds);
    survivingOperatorIds.forEach((survivorId) => {
      applyRetentionPressureFromPatterns(context, survivorId, "repeated_death_exposure");
    });
  });

  applyRaidSocialOutcome(context, packet.operatorIds, packet.resolutionPacket.result);

  // Per-raid city-pressure feedback for mixed outcomes
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  if (
    context.runtimeState.cityState &&
    contractSite?.districtId &&
    contractSite?.sponsorFactionId
  ) {
    if (packet.resolutionPacket.result === "mixed") {
      const mixedEvents = applyCityPressureOutcome(
        context.runtimeState.cityState,
        contractSite.districtId,
        contractSite.sponsorFactionId,
        "mixed",
        currentMinute,
        {
          executiveOfficeBonus: hasOperationalRoomTemplate(
            context,
            SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
          ),
        },
      );
      emitCityPressureEvents(context, mixedEvents);
    }
  }

  const MAX_RAID_SUMMARIES = 50;
  const existingSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const trimmed =
    existingSummaries.length >= MAX_RAID_SUMMARIES
      ? existingSummaries.slice(-MAX_RAID_SUMMARIES + 1)
      : existingSummaries;
  BuildingAuthority.raidSummaries[buildingEntity] = [
    ...trimmed,
    {
      id: packet.id,
      contractSiteId: packet.contractSiteId,
      opportunityId: packet.opportunityId,
      missionId: packet.missionId,
      location: packet.location,
      startedAt: packet.startedAt,
      endedAt: formatWorldTimestamp(context),
      result: packet.resolutionPacket.result,
      reputationDelta: packet.resolutionPacket.reputationDelta,
      cashDelta: packet.resolutionPacket.cashDelta,
      treatmentCost,
      threat: packet.threat,
      intel: packet.intel,
      reward: packet.reward,
      cohesion: packet.cohesion,
      operatorOutcomes: packet.resolutionPacket.operatorOutcomes,
      narrativeTags: packet.resolutionPacket.narrativeTags,
      intelMismatchTags: packet.resolutionPacket.intelMismatchTags,
      bossDefeated: packet.resolutionPacket.narrativeTags.includes("boss:defeated"),
      contributingFactors: Array.from(
        new Set([
          ...(packet.raidRun?.summaryDraft?.contributingFactors ?? []),
          ...(packet.cohesion >= 70 ? ["cohesion:strong"] : []),
          ...(packet.cohesion < 40 ? ["cohesion:weak"] : []),
          ...(packet.intel >= 60 ? ["intel:high"] : []),
          ...(packet.intel < 30 ? ["intel:low"] : []),
          ...(packet.resolutionPacket.narrativeTags.includes("boss:weakness-exploited")
            ? ["boss:weakness-exploited"]
            : []),
          ...(packet.resolutionPacket.narrativeTags.includes("boss:defeated")
            ? ["boss:defeated"]
            : []),
          ...(packet.resolutionPacket.narrativeTags.includes("dock:staged") ? ["dock:staged"] : []),
          ...(packet.resolutionPacket.narrativeTags.includes("infirmary:stabilized")
            ? ["infirmary:stabilized"]
            : []),
          ...(packet.resolutionPacket.narrativeTags.includes("break_room:decompressed")
            ? ["break_room:decompressed"]
            : []),
          ...(packet.resolutionPacket.narrativeTags.includes("deck:aired_out")
            ? ["deck:aired_out"]
            : []),
          ...(packet.briefingStatus === "drilled"
            ? ["briefing:drilled"]
            : packet.briefingStatus === "briefed"
              ? ["briefing:briefed"]
              : []),
          ...trainingFactors,
        ]),
      ),
    },
  ];
}

function resolveCompletedRaids(context: SimSystemContext, deltaMs: number): boolean {
  const buildingEntity = context.singletonEntities.building;
  if ((BuildingAuthority.activeRaidPackets[buildingEntity] ?? []).length === 0) {
    return false;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  let resolvedRaid = false;
  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  const nextPackets = (BuildingAuthority.activeRaidPackets[buildingEntity] ?? []).filter(
    (packet) => {
      const totalDurationMinutes = Math.max(60, packet.durationHours * 60);
      packet.revealProgress = clamp(
        ((currentMinute - packet.startedTick) / totalDurationMinutes) * 100,
        0,
        100,
      );

      const missionTemplate = context.registry.missionById.get(packet.missionId);
      const packetContractSite = BuildingAuthority.contractSite[buildingEntity];
      const packetSiteConcept =
        packetContractSite?.contractSiteId === packet.contractSiteId
          ? siteConceptById.get(packetContractSite.siteConceptId)
          : undefined;
      const bossProfile =
        (packetSiteConcept?.bossId
          ? context.registry.bossById.get(packetSiteConcept.bossId)
          : undefined) ?? missionTemplate?.combatProfile?.boss;
      // Boss commitment should only surface once playback actually reaches the
      // transcript breakpoint. Precomputing a paused run is not enough.
      const transcriptBossThresholdReached =
        packet.raidRun !== undefined ? hasRaidPlaybackReachedStep(packet, "boss_threshold") : false;
      const legacyBossThreshold = packet.raidRun === undefined && packet.revealProgress >= 88;
      const runCanSurfaceBossCommitment =
        packet.raidRun === undefined || packet.raidRun.status === "awaiting_boss_commitment";
      const shouldQueueBossCommitment =
        deltaMs > 0 &&
        currentMinute < packet.returnTick &&
        bossProfile !== null &&
        bossProfile !== undefined &&
        runCanSurfaceBossCommitment &&
        (transcriptBossThresholdReached || legacyBossThreshold) &&
        context.runtimeState.activeEncounter === null &&
        !hasBlockingInterruption(context.runtimeState.interruptionQueue);

      if (shouldQueueBossCommitment) {
        const interruptionQueue = context.runtimeState.interruptionQueue;
        const hasQueuedCommitment =
          interruptionQueue.active?.type === "raid_boss_commitment" &&
          interruptionQueue.active.payload.kind === "raid_boss_commitment" &&
          interruptionQueue.active.payload.activeRaidId === packet.id;

        if (!hasQueuedCommitment) {
          enqueueInterruption(
            interruptionQueue,
            "raid_boss_commitment",
            createBossCommitmentPayload(
              packet.id,
              packet.contractSiteId,
              packet.missionId,
              packet.id,
              packet.operatorIds,
              bossProfile.bossId,
              bossProfile.name,
              bossProfile.rank,
            ),
            "raid-system",
            currentMinute,
          );
          pushRuntimeCue(context, "raid.boss.approach");
        }
        return true;
      }

      // Do not finalize a raid while a live boss encounter is active for it
      if (
        context.runtimeState.activeEncounter !== null &&
        context.runtimeState.activeEncounter.activeRaidId === packet.id
      ) {
        return true;
      }

      if (deltaMs <= 0 || currentMinute < packet.returnTick) {
        return true;
      }

      resolvedRaid = true;
      finalizeRaidPacket(context, packet, currentMinute, operatorEntityById);
      return false;
    },
  );

  BuildingAuthority.activeRaidPackets[buildingEntity] = nextPackets;

  // Lock current fog level as the base for subsequent raids.
  if (resolvedRaid) {
    const fog = BuildingAuthority.fogOfWar[buildingEntity];
    if (fog) {
      fog.completedRaidRevealBase = fog.revealedCount;
    }
  }

  return resolvedRaid;
}

export function resolveRaidBossRetreat(context: SimSystemContext, activeRaidId: string): boolean {
  const buildingEntity = context.singletonEntities.building;
  const packets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  const packet = packets.find((candidate) => candidate.id === activeRaidId);
  if (!packet) {
    return false;
  }

  packet.resolutionPacket = buildBossRetreatResolutionPacket(packet);
  applyFirstContractDeathShield(context, packet.resolutionPacket);
  packet.returnTick = getCurrentAbsoluteMinute(context);

  // Update the RaidRun with boss retreat
  if (packet.raidRun) {
    packet.raidRun = resolveRaidRunAfterBoss(packet.raidRun, "retreat", {});
  }

  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  finalizeRaidPacket(context, packet, getCurrentAbsoluteMinute(context), operatorEntityById);
  BuildingAuthority.activeRaidPackets[buildingEntity] = packets.filter(
    (candidate) => candidate.id !== activeRaidId,
  );
  updateSummaryDerivedProgress(context);
  checkDungeonClosure(context);
  updateContractLifecycle(context);
  reconcileAssignmentsSystem(context, 0);
  return true;
}

export function markRaidBossCommitment(context: SimSystemContext, activeRaidId: string): boolean {
  const packets = BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? [];
  const packet = packets.find((candidate) => candidate.id === activeRaidId);
  if (!packet || !packet.raidRun) {
    return false;
  }

  packet.raidRun = markRaidRunBossCommitment(packet.raidRun);
  return true;
}

export function resolveRaidBossEncounter(
  context: SimSystemContext,
  encounter: BossEncounterInstance,
): boolean {
  const buildingEntity = context.singletonEntities.building;
  const packets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  const packet = packets.find((candidate) => candidate.id === encounter.activeRaidId);
  if (!packet) {
    return false;
  }

  packet.resolutionPacket = buildBossEncounterResolutionPacket(packet, encounter);
  applyFirstContractDeathShield(context, packet.resolutionPacket);
  packet.returnTick = getCurrentAbsoluteMinute(context);

  // Update the RaidRun with boss result
  if (packet.raidRun) {
    const bossResult =
      encounter.status === "victory"
        ? ("victory" as const)
        : encounter.status === "retreat"
          ? ("retreat" as const)
          : ("wipe" as const);
    const operatorHpAfter: Record<string, number> = {};
    for (const actor of Object.values(encounter.actors)) {
      if (actor.kind === "operator" && actor.operatorId) {
        operatorHpAfter[actor.operatorId] = Math.max(0, actor.currentHp);
      }
    }
    packet.raidRun = resolveRaidRunAfterBoss(packet.raidRun, bossResult, operatorHpAfter);
  }

  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  finalizeRaidPacket(context, packet, getCurrentAbsoluteMinute(context), operatorEntityById);
  BuildingAuthority.activeRaidPackets[buildingEntity] = packets.filter(
    (candidate) => candidate.id !== encounter.activeRaidId,
  );
  updateSummaryDerivedProgress(context);
  checkDungeonClosure(context);
  updateContractLifecycle(context);
  reconcileAssignmentsSystem(context, 0);
  return true;
}

/** Map transcript step kinds to presentation event kinds. */
function mapStepKindToEventKind(
  stepKind: import("save/types").RaidStepKind,
): import("./types").RaidEventKind | null {
  switch (stepKind) {
    case "deploy":
    case "move":
      return "goal-change";
    case "discover_enemy":
    case "skirmish_start":
    case "skirmish_round":
    case "skirmish_end":
      return "encounter";
    case "discover_feature":
      return "discovery";
    case "loot_gain":
      return "loot";
    case "intel_gain":
      return "intel";
    case "hazard":
      return "hazard";
    case "goal_check":
      return "status-change";
    case "retreat_begin":
    case "boss_retreat":
      return "retreat";
    case "boss_threshold":
    case "boss_commit":
    case "boss_result":
    case "return":
    case "resolve":
      return "status-change";
    case "injury":
    case "operator_down":
      return "encounter";
    default:
      return null;
  }
}

function updateRaidPresentation(context: SimSystemContext): void {
  const contractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  if (!contractSite || hasContractConcluded(contractSite)) {
    context.runtimeState.raidPresentation = {
      contractSiteId: null,
      teams: [],
      enemies: [],
      features: [],
    };
    context.runtimeState.raidPresentation.teams = [];
    return;
  }

  const activePackets =
    BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? [];
  const previousTeams = new Map(
    context.runtimeState.raidPresentation.teams.map((team) => [team.raidId, team]),
  );
  const nextTeams: RaidPresentationTeam[] = [];
  const transcriptEnemyMarkers = new Map<string, RaidPresentationEnemy>();
  const transcriptFeatureMarkers = new Map<string, RaidPresentationFeature>();
  const hasTranscriptPackets = activePackets.some((packet) => packet.raidRun !== undefined);
  const enemyFamilyLookup = new Map<string, string>();
  for (const family of context.registry.enemyFamilies) {
    for (const member of family.members) {
      enemyFamilyLookup.set(member.enemyTemplateId, family.familyId);
    }
  }
  const operatorEntityById = new Map(
    context.runtimeState.operatorEntities.map((entity) => [OperatorIdentity.id[entity], entity]),
  );
  const currentTick = getCurrentAbsoluteMinute(context);

  if (!hasTranscriptPackets) {
    ensureRaidPresentationSeed(context, contractSite.contractSiteId);
    revealRaidPresentationFromFog(context);
  }

  activePackets.forEach((packet, index) => {
    const previousTeam = previousTeams.get(packet.id);
    const operatorEntities = packet.operatorIds
      .map((operatorId) => operatorEntityById.get(operatorId))
      .filter((entity): entity is number => entity !== undefined);
    const run = packet.raidRun;

    if (run && run.steps.length > 0) {
      const playbackSteps = getRaidPlaybackSteps(packet);
      const playbackNode = getPlaybackNode(run, playbackSteps);
      const position = playbackNode
        ? getCellCenter(playbackNode.x, playbackNode.y)
        : getCellCenter(1, 1);
      const goal = getPlaybackGoal(packet, run, playbackSteps);
      const state = getPlaybackState(packet, run, playbackSteps);
      const operatorStatuses = operatorEntities.map((entity) => {
        const operatorId = OperatorIdentity.id[entity];
        const wasDown = playbackSteps.some(
          (step) => step.kind === "operator_down" && step.actorIds?.includes(operatorId),
        );
        const isPlaybackComplete = playbackSteps.length === run.steps.length;
        const maxHp = run.derivedState.operatorMaxHp[operatorId] ?? null;
        const currentHp = run.derivedState.operatorHp[operatorId] ?? null;

        return {
          operatorId,
          readiness: wasDown ? "critical" : resolveRaidOperatorReadiness(entity),
          healthFraction: wasDown
            ? 0
            : isPlaybackComplete && maxHp && currentHp !== null
              ? clamp(currentHp / maxHp, 0, 1)
              : null,
          roleTag: OperatorIdentity.roleTag[entity] || null,
        };
      });

      const encounter = getTranscriptEncounter(playbackSteps);
      const recentEvents = [...(previousTeam?.recentEvents ?? [])];
      const progressIndex = playbackSteps.length - 1;
      for (let si = 0; si <= progressIndex; si++) {
        const step = playbackSteps[si];
        const eventKind = mapStepKindToEventKind(step.kind);
        if (!eventKind) {
          continue;
        }

        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:transcript:${si}`,
          kind: eventKind,
          message: step.message ?? `${step.kind}`,
          tick: currentTick - (progressIndex - si),
        });
      }

      const transcriptMarkers = buildTranscriptWorldMarkers(
        packet,
        run,
        playbackSteps,
        enemyFamilyLookup,
      );
      transcriptMarkers.features.forEach((feature) => {
        transcriptFeatureMarkers.set(feature.id, feature);
      });
      transcriptMarkers.enemies.forEach((enemy) => {
        transcriptEnemyMarkers.set(enemy.id, {
          ...enemy,
          engagedRaidId:
            encounter &&
            Math.hypot(enemy.x - position.x, enemy.y - position.y) <= 72 &&
            enemy.discovered
              ? packet.id
              : undefined,
        });
      });

      nextTeams.push({
        raidId: packet.id,
        x: position.x,
        y: position.y,
        goal,
        state,
        operatorStatuses,
        encounter,
        recentEvents,
      });
      return;
    }

    const goal =
      operatorEntities.length > 0
        ? selectTeamGoal(context, operatorEntities, packet)
        : ("exploring" as RaidTeamGoal);
    const state: RaidPresentationTeam["state"] =
      packet.revealProgress > 90
        ? packet.resolutionPacket.result === "failure"
          ? "defeated"
          : "returning"
        : "active";
    const position = interpolatePath(buildRaidWaypointPath(index), packet.revealProgress / 100);
    const operatorStatuses = operatorEntities.map((entity) => ({
      operatorId: OperatorIdentity.id[entity],
      readiness: resolveRaidOperatorReadiness(entity),
      healthFraction:
        OperatorIdentity.lifecycleStatus[entity] === "dead"
          ? 0
          : clamp(1 - InjuryState.severity[entity] / 100, 0, 1),
      roleTag: OperatorIdentity.roleTag[entity] || null,
    }));

    const nearbyEnemy = context.runtimeState.raidPresentation.enemies
      .filter((enemy) => enemy.discovered)
      .sort((left, right) => {
        const leftDistance = Math.hypot(left.x - position.x, left.y - position.y);
        const rightDistance = Math.hypot(right.x - position.x, right.y - position.y);
        return leftDistance - rightDistance;
      })[0];
    const encounter =
      nearbyEnemy && Math.hypot(nearbyEnemy.x - position.x, nearbyEnemy.y - position.y) <= 72
        ? {
            enemyLabel: getEncounterLabel(nearbyEnemy.threat),
            threat: nearbyEnemy.threat,
            healthFraction:
              nearbyEnemy.threat === "boss"
                ? clamp(1 - packet.revealProgress / 120, 0.08, 1)
                : clamp(1 - packet.revealProgress / 140, 0.2, 1),
          }
        : null;

    if (nearbyEnemy && encounter) {
      nearbyEnemy.engagedRaidId = packet.id;
    }

    const recentEvents = [...(previousTeam?.recentEvents ?? [])];
    {
      // Legacy path: derive events from presentation state
      if (!previousTeam) {
        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:deploy`,
          kind: "goal-change",
          message: `Team deployed toward ${getRaidGoalLabel(goal)}.`,
          tick: currentTick,
        });
      }
      if (previousTeam?.goal !== goal) {
        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:goal:${goal}:${Math.floor(packet.revealProgress / 10)}`,
          kind: "goal-change",
          message: `Team shifted focus to ${getRaidGoalLabel(goal)}.`,
          tick: currentTick,
        });
      }
      if (previousTeam?.state !== state) {
        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:state:${state}:${Math.floor(packet.revealProgress / 10)}`,
          kind: state === "returning" ? "retreat" : "status-change",
          message:
            state === "returning"
              ? "Team is returning from the site."
              : state === "defeated"
                ? "Team has been overwhelmed."
                : "Team is active in the dungeon.",
          tick: currentTick,
        });
      }
      if (encounter) {
        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:encounter:${encounter.threat}:${Math.floor(packet.revealProgress / 15)}`,
          kind: "encounter",
          message: `Team engaged ${encounter.enemyLabel.toLowerCase()}.`,
          tick: currentTick,
        });
      }

      context.runtimeState.raidPresentation.features.forEach((feature) => {
        if (!feature.discovered) {
          return;
        }
        const isNearby = Math.hypot(feature.x - position.x, feature.y - position.y) <= 80;
        if (!isNearby) {
          return;
        }
        upsertRaidEvent(recentEvents, {
          id: `${packet.id}:feature:${feature.id}`,
          kind: getFeatureEventKind(feature.kind),
          message: getFeatureEventMessage(feature.kind),
          tick: currentTick,
        });
      });
    }

    nextTeams.push({
      raidId: packet.id,
      x: position.x,
      y: position.y,
      goal,
      state,
      operatorStatuses,
      encounter,
      recentEvents,
    });
  });

  context.runtimeState.raidPresentation = {
    contractSiteId: contractSite.contractSiteId,
    teams: nextTeams,
    enemies: hasTranscriptPackets
      ? [...transcriptEnemyMarkers.values()]
      : context.runtimeState.raidPresentation.enemies,
    features: hasTranscriptPackets
      ? [...transcriptFeatureMarkers.values()]
      : context.runtimeState.raidPresentation.features,
  };
}

// ── Loot generation ──────────────────────────────────────────────────────

function getDropTableEntries(context: SimSystemContext, tableId: string) {
  return context.registry.dropTableById.get(tableId)?.entries ?? [];
}

function rollDropTable(
  rng: SeededRng,
  entries: readonly {
    itemId: string;
    weight: number;
    minQuantity: number;
    maxQuantity: number;
  }[],
): string[] {
  if (entries.length === 0) {
    return [];
  }

  const rolledEntry = weightedChoice(
    rng,
    entries.map((entry) => ({
      item: entry,
      weight: entry.weight,
    })),
  ).outcome;
  const quantity = rng.int(rolledEntry.minQuantity, rolledEntry.maxQuantity);

  return Array.from({ length: quantity }, () => rolledEntry.itemId);
}

/**
 * Remap a generic drop table ID to a site-specific one when the active contract
 * site has an enemy family with dedicated tables. Falls back to the original ID
 * if no site-specific table exists in the registry.
 */
function resolveSiteDropTableId(
  context: SimSystemContext,
  siteConcept: { enemyFamilyIds: readonly string[] } | undefined,
  genericTableId: string,
): string {
  if (!siteConcept || siteConcept.enemyFamilyIds.length === 0) return genericTableId;

  // Derive the suffix from the generic table ID (e.g. "regular" or "elite")
  const suffix = genericTableId.endsWith("-regular")
    ? "-regular"
    : genericTableId.endsWith("-elite")
      ? "-elite"
      : null;
  if (!suffix) return genericTableId;

  // Use the first enemy family to derive the candidate table ID
  const familyId = siteConcept.enemyFamilyIds[0];
  const familySlug = familyId.replace("enemy-family/", "");
  const candidateId = `drop-table/${familySlug}${suffix}`;

  return context.registry.dropTableById.has(candidateId) ? candidateId : genericTableId;
}

export function generateLootDrops(
  context: SimSystemContext,
  rng: SeededRng,
  result: "success" | "failure" | "mixed",
  missionId?: string,
): string[] {
  const loot: string[] = [];

  // Resolve combat profile from mission if available
  const mission = missionId ? context.registry.missionById.get(missionId) : undefined;
  const combatProfile = mission?.combatProfile ?? null;

  // Resolve site concept for site-specific drop table remapping
  const lootContractSite = BuildingAuthority.contractSite[context.singletonEntities.building];
  const lootSiteConcept = lootContractSite?.siteConceptId
    ? siteConceptById.get(lootContractSite.siteConceptId)
    : undefined;

  // ── Enemy group loot (uses combat profile drop tables when available) ──
  if (combatProfile && combatProfile.enemyGroups.length > 0) {
    for (const group of combatProfile.enemyGroups) {
      const tableId = resolveSiteDropTableId(context, lootSiteConcept, group.dropTableId);
      const groupEntries = getDropTableEntries(context, tableId);
      if (groupEntries.length === 0) continue;
      const rolls =
        result === "success" ? group.count : result === "mixed" ? Math.ceil(group.count / 2) : 0;
      for (let i = 0; i < rolls; i += 1) {
        loot.push(...rollDropTable(rng, groupEntries));
      }
    }
  } else {
    // Fallback to legacy loot tables when no combat profile exists
    const regularTableId = resolveSiteDropTableId(
      context,
      lootSiteConcept,
      "drop-table/dungeon-f-regular",
    );
    const eliteTableId = resolveSiteDropTableId(
      context,
      lootSiteConcept,
      "drop-table/dungeon-f-elite",
    );
    const regularEntries = getDropTableEntries(context, regularTableId);
    const eliteEntries = getDropTableEntries(context, eliteTableId);
    const regularRolls =
      result === "success" ? 2 : result === "mixed" ? 1 : rng.chance(0.25) ? 1 : 0;

    for (let i = 0; i < regularRolls; i += 1) {
      loot.push(...rollDropTable(rng, regularEntries));
    }

    if (
      result !== "failure" &&
      eliteEntries.length > 0 &&
      rng.chance(result === "success" ? 0.5 : 0.25)
    ) {
      loot.push(...rollDropTable(rng, eliteEntries));
    }
  }

  // ── Boss loot (guaranteed roll on success when boss profile exists) ──
  const lootBoss =
    (lootSiteConcept?.bossId ? context.registry.bossById.get(lootSiteConcept.bossId) : undefined) ??
    combatProfile?.boss ??
    null;
  if (lootBoss) {
    const bossDropEntries = getDropTableEntries(context, lootBoss.dropTableId);
    if (result === "success" && bossDropEntries.length > 0) {
      loot.push(...rollDropTable(rng, bossDropEntries));
    }
  } else {
    const bossEntries = getDropTableEntries(context, "drop-table/dungeon-f-boss");
    if (result === "success" && bossEntries.length > 0 && rng.chance(0.2)) {
      loot.push(...rollDropTable(rng, bossEntries));
    }
  }

  return loot;
}

function applyLootToInventory(context: SimSystemContext, loot: string[]): void {
  const itemCounts = new Map<string, number>();
  loot.forEach((itemId) => {
    itemCounts.set(itemId, (itemCounts.get(itemId) ?? 0) + 1);
  });
  itemCounts.forEach((quantity, itemId) => {
    addToInventory(context, itemId, quantity);
  });

  const sweep = applyLootAutomationSweep(
    context,
    Array.from(itemCounts.entries()).map(([itemId, quantity]) => ({ itemId, quantity })),
  );
  if (sweep.totalQuantity <= 0) {
    return;
  }

  pushRuntimeEvent(context, {
    kind: "resource_swing",
    message: `Loot filter auto-sold ${describeLootAutomationSweep(context.registry, sweep)} for $${sweep.totalRevenue}`,
    accent: "gold",
  });
}

// ── Recurring team tracking ──────────────────────────────────────────────

function updateRecurringTeamAfterRaid(
  context: SimSystemContext,
  operatorIds: readonly string[],
  result: "success" | "failure" | "mixed",
  currentTick: number,
): void {
  let teamEntity = findRecurringTeamForMembers(context, operatorIds);

  if (teamEntity === undefined && operatorIds.length >= 2) {
    // Create a new recurring team if operators raided together
    teamEntity = addEntity(context.world);
    addComponent(context.world, teamEntity, RecurringTeam);
    RecurringTeam.id[teamEntity] = `team/${context.runtimeState.nextTeamSequence}`;
    RecurringTeam.memberIds[teamEntity] = [...operatorIds];
    RecurringTeam.cohesion[teamEntity] = 50;
    RecurringTeam.raidCount[teamEntity] = 0;
    RecurringTeam.lastRaidTick[teamEntity] = 0;
    RecurringTeam.damaged[teamEntity] = 0;
    RecurringTeam.damageReason[teamEntity] = "";
    context.runtimeState.recurringTeamEntities.push(teamEntity);
    context.runtimeState.nextTeamSequence += 1;
    const memberNames = operatorIds.map((id) => {
      const e = context.runtimeState.operatorEntities.find(
        (ent) => OperatorIdentity.id[ent] === id,
      );
      return e !== undefined ? (OperatorIdentity.name[e] ?? id) : id;
    });
    pushRuntimeEvent(context, {
      kind: "team_status",
      message: `${memberNames.join(", ")} formed a recurring team`,
      accent: "gold",
      targetKind: "team",
      targetId: RecurringTeam.id[teamEntity],
    });
  }

  if (teamEntity === undefined) return;

  RecurringTeam.raidCount[teamEntity] += 1;
  RecurringTeam.lastRaidTick[teamEntity] = currentTick;

  const cohesionDelta = result === "success" ? 8 : result === "mixed" ? 2 : -6;
  RecurringTeam.cohesion[teamEntity] = clamp(
    RecurringTeam.cohesion[teamEntity] + cohesionDelta,
    0,
    100,
  );
}

function markTeamDamaged(
  context: SimSystemContext,
  operatorIds: readonly string[],
  reason: string,
): void {
  // Find any team that contains the deceased operator
  context.runtimeState.recurringTeamEntities.forEach((entity) => {
    const members = RecurringTeam.memberIds[entity] ?? [];
    if (operatorIds.some((id) => members.includes(id))) {
      RecurringTeam.damaged[entity] = 1;
      RecurringTeam.damageReason[entity] = reason;
    }
  });
}

function disbandRecurringTeam(
  context: SimSystemContext,
  teamEntity: number,
  survivingMemberIds: readonly string[],
  reason: string,
): void {
  removeEntity(context.world, teamEntity);
  removeTrackedEntity(context.runtimeState.recurringTeamEntities, teamEntity);

  if (survivingMemberIds.length === 0) {
    return;
  }

  const survivingNames = survivingMemberIds.map((memberId) => {
    const operatorEntity = context.runtimeState.operatorEntities.find(
      (entity) => OperatorIdentity.id[entity] === memberId,
    );

    return operatorEntity === undefined
      ? memberId
      : (OperatorIdentity.name[operatorEntity] ?? memberId);
  });

  pushRuntimeEvent(context, {
    kind: "team_status",
    message: `${survivingNames.join(", ")} disbanded after ${getTeamDamageReasonLabel(reason)}`,
    accent: "ember",
  });
}

// ── Refusal and quit logic ───────────────────────────────────────────────

function getAverageRoomComfort(context: SimSystemContext): number {
  if (context.runtimeState.roomCultureEntities.length === 0) {
    return 50;
  }

  return (
    context.runtimeState.roomCultureEntities.reduce(
      (sum, entity) => sum + RoomCulture.comfort[entity],
      0,
    ) / context.runtimeState.roomCultureEntities.length
  );
}

function getGriefTieCountForOperator(context: SimSystemContext, operatorId: string): number {
  return context.runtimeState.notableTieEntities.filter((entity) => {
    return (
      NotableTie.stance[entity] === "grief" &&
      (NotableTie.operatorAId[entity] === operatorId ||
        NotableTie.operatorBId[entity] === operatorId)
    );
  }).length;
}

function getDamagedTeamPenalty(context: SimSystemContext, operatorId: string): number {
  return context.runtimeState.recurringTeamEntities.some((entity) => {
    return (
      RecurringTeam.damaged[entity] === 1 &&
      (RecurringTeam.memberIds[entity] ?? []).includes(operatorId)
    );
  })
    ? 12
    : 0;
}

export function getDepartureCheck(
  context: SimSystemContext,
  entity: number,
  rng: SeededRng,
): {
  shouldDepart: boolean;
  reason: string;
} {
  const operatorId = OperatorIdentity.id[entity];
  const flags = computeAutonomyFlags(
    entity,
    getAutonomyThresholdsForPolicies(getPolicyState(context)),
  );
  const dispositionEntity = findDispositionEntity(context, operatorId);
  const grievanceLevel =
    dispositionEntity === undefined ? 25 : OperatorDisposition.grievanceLevel[dispositionEntity];
  const morale = MoraleState.current[entity];
  const loyalty = LoyaltyState.current[entity];
  const avgComfort = getAverageRoomComfort(context);
  const griefTieCount = getGriefTieCountForOperator(context, operatorId);
  const damagedTeamPenalty = getDamagedTeamPenalty(context, operatorId);
  const rosterFlow = getRosterFlowConfig(getPolicyState(context));

  const retentionBreakReason = formatIdentityRuntimeText(context, "loss of faith in {guildName}");
  const reason = flags.quitRisk || morale <= loyalty ? "morale collapse" : retentionBreakReason;
  const roll = boundedRoll(
    rng,
    (flags.quitRisk ? 28 : 12) + rosterFlow.departurePressureModifier,
    [
      { label: "morale", value: Math.max(0, 22 - morale) * 1.5 },
      { label: "loyalty", value: Math.max(0, 30 - loyalty) * 1.1 },
      { label: "grievance", value: Math.max(0, grievanceLevel - 40) * 0.25 },
      { label: "injury", value: InjuryState.severity[entity] * 0.15 },
      { label: "grief", value: griefTieCount * 6 },
      { label: "team_damage", value: damagedTeamPenalty },
      { label: "room_comfort", value: Math.max(0, 48 - avgComfort) * 0.18 },
    ],
    55,
    10,
  );

  return {
    shouldDepart: roll.outcome,
    reason,
  };
}

function departOperator(context: SimSystemContext, entity: number, reason: string): void {
  const operatorId = OperatorIdentity.id[entity];
  const operatorName = OperatorIdentity.name[entity] ?? operatorId;
  const currentMinute = getCurrentAbsoluteMinute(context);
  const retentionBreakReason = formatIdentityRuntimeText(context, "loss of faith in {guildName}");

  unequipItem(context, operatorId, "weapon");
  unequipItem(context, operatorId, "outfitOverlay");
  unequipItem(context, operatorId, "accessory");

  OperatorIdentity.lifecycleStatus[entity] = "departed";
  OperatorIdentity.deathTick[entity] = 0;
  OperatorIdentity.deathRaidSummaryId[entity] = "";
  OperatorIdentity.departureTick[entity] = currentMinute;
  OperatorIdentity.departureReason[entity] = reason;
  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  ScheduleState.currentBlock[entity] = "idle";
  RaidParticipationState.activeRaidId[entity] = "";
  RaidParticipationState.missionId[entity] = "";
  RaidParticipationState.returnTick[entity] = 0;

  markTeamDamaged(
    context,
    [operatorId],
    reason === retentionBreakReason ? "retention_break" : "morale_collapse",
  );
  const { guildName } = getGuildIdentity(context);
  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: `${operatorName} left ${guildName} after ${reason}`,
    accent: "magma",
    targetKind: "operator",
    targetId: operatorId,
  });
}

function checkRefusalAndQuit(context: SimSystemContext, rng: SeededRng): void {
  if (WorldTimeState.minuteOfDay[context.singletonEntities.time] !== 0) {
    return;
  }

  const autonomyThresholds = getAutonomyThresholdsForPolicies(getPolicyState(context));

  const livingOperatorEntities = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );

  livingOperatorEntities.forEach((entity) => {
    const flags = computeAutonomyFlags(entity, autonomyThresholds);
    if (!flags.quitRisk && !flags.retentionRisk) {
      return;
    }
    if (RaidParticipationState.activeRaidId[entity].length > 0) {
      return;
    }

    const departureCheck = getDepartureCheck(context, entity, rng);
    if (!departureCheck.shouldDepart) {
      return;
    }

    departOperator(context, entity, departureCheck.reason);
  });
}

// ── Damaged team repair vs disband ───────────────────────────────────────

function isDailyRaidConsequenceTick(context: SimSystemContext): boolean {
  return WorldTimeState.minuteOfDay[context.singletonEntities.time] === 0;
}

function processDamagedTeams(context: SimSystemContext, rng: SeededRng): void {
  const operatorEntityById = new Map<string, number>();
  for (const entity of context.runtimeState.operatorEntities) {
    operatorEntityById.set(OperatorIdentity.id[entity], entity);
  }

  context.runtimeState.recurringTeamEntities.slice().forEach((entity) => {
    if (RecurringTeam.damaged[entity] !== 1) return;

    const members = RecurringTeam.memberIds[entity] ?? [];
    const livingMembers = members.filter((memberId) => {
      const opEntity = operatorEntityById.get(memberId);
      return opEntity !== undefined && OperatorIdentity.lifecycleStatus[opEntity] === "active";
    });

    if (livingMembers.length < 2) {
      disbandRecurringTeam(
        context,
        entity,
        livingMembers,
        RecurringTeam.damageReason[entity] || "losses",
      );
      return;
    }

    let totalMorale = 0;
    let totalLoyalty = 0;
    let hasFieldLead = false;
    for (const memberId of livingMembers) {
      const opEntity = operatorEntityById.get(memberId);
      if (opEntity === undefined) continue;
      totalMorale += MoraleState.current[opEntity];
      totalLoyalty += LoyaltyState.current[opEntity];
      if (OperatorIdentity.roleTag[opEntity] === "role:field_lead") hasFieldLead = true;
    }
    const avgMorale = totalMorale / livingMembers.length;
    const avgLoyalty = totalLoyalty / livingMembers.length;

    // Count grief ties among members
    const griefCount = context.runtimeState.notableTieEntities.filter((tieEntity) => {
      return (
        NotableTie.stance[tieEntity] === "grief" &&
        (livingMembers.includes(NotableTie.operatorAId[tieEntity]) ||
          livingMembers.includes(NotableTie.operatorBId[tieEntity]))
      );
    }).length;

    // Average room culture comfort
    const avgComfort =
      context.runtimeState.roomCultureEntities.length > 0
        ? context.runtimeState.roomCultureEntities.reduce(
            (sum, rcEntity) => sum + RoomCulture.comfort[rcEntity],
            0,
          ) / context.runtimeState.roomCultureEntities.length
        : 50;

    const repairResult = boundedRoll(
      rng,
      50,
      [
        { label: "morale", value: (avgMorale - 50) * 0.4 },
        { label: "loyalty", value: (avgLoyalty - 50) * 0.3 },
        { label: "grief", value: -griefCount * 8 },
        { label: "field_lead", value: hasFieldLead ? 12 : 0 },
        { label: "room_culture", value: (avgComfort - 50) * 0.2 },
      ],
      50,
      15,
    );

    const damageReason = RecurringTeam.damageReason[entity] || "recent damage";

    if (repairResult.outcome) {
      RecurringTeam.damaged[entity] = 0;
      RecurringTeam.damageReason[entity] = "";
      RecurringTeam.memberIds[entity] = [...livingMembers];
      pushRuntimeEvent(context, {
        kind: "team_status",
        message: `${livingMembers.length}-operator team recovered from ${getTeamDamageReasonLabel(damageReason)}`,
        accent: "gold",
        targetKind: "team",
        targetId: RecurringTeam.id[entity],
      });
    } else {
      RecurringTeam.cohesion[entity] = clamp(RecurringTeam.cohesion[entity] - 5, 0, 100);
      if (repairResult.total <= 30 || RecurringTeam.cohesion[entity] <= 20) {
        disbandRecurringTeam(context, entity, livingMembers, damageReason);
      }
    }
  });
}

export const resolveRaidSystem: SimSystem = (context, deltaMs) => {
  // Manage contract lifecycle (replaces old ensureContractSite auto-replacement)
  updateContractLifecycle(context);

  const wasActiveAtTickStart = getContractLifecycle(context) === "active";

  if (wasActiveAtTickStart) {
    updateOpportunityLifecycle(context);
    if (deltaMs > 0) {
      spawnRaidOpportunity(context);
    }
  }

  if (deltaMs > 0 && isDailyRaidConsequenceTick(context)) {
    const tickRng = new SeededRng(
      seedFromSimulationKey(context, `raid-tick:${getCurrentAbsoluteMinute(context)}`),
    );
    checkRefusalAndQuit(context, tickRng);
    processDamagedTeams(context, tickRng);
  }

  if (wasActiveAtTickStart) {
    refreshOpportunityClaims(context);
    if (deltaMs > 0) {
      launchFormedRaids(context);
    }
  }

  const resolvedRaid = resolveCompletedRaids(context, deltaMs);

  // Advance fog-of-war and exploration progress per tick
  if (deltaMs > 0 && wasActiveAtTickStart) {
    advanceFogOfWar(context);
    updateExplorationProgress(context);
  }

  // On raid completion: update summary-derived progress and check closure
  if (resolvedRaid) {
    updateSummaryDerivedProgress(context);
    checkDungeonClosure(context);
    updateContractLifecycle(context);
    reconcileAssignmentsSystem(context, 0);
  }

  if (getContractLifecycle(context) === "active") {
    updateRaidPresentation(context);
  }
};

// ── Contract lifecycle ─────────────────────────────────────────────────────

function getContractLifecycle(context: SimSystemContext): ContractLifecyclePhase {
  return BuildingAuthority.contractLifecycle[context.singletonEntities.building] ?? "bidding";
}

function setContractLifecycle(context: SimSystemContext, phase: ContractLifecyclePhase): void {
  BuildingAuthority.contractLifecycle[context.singletonEntities.building] = phase;
}

/**
 * Manage contract lifecycle instead of auto-replacing contracts.
 * Returns early if the guild is in bidding/resolved — raids are paused.
 */
function updateContractLifecycle(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const phase = getContractLifecycle(context);
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const contractResult = BuildingAuthority.contractResult[buildingEntity];
  const postedContracts = BuildingAuthority.postedContracts[buildingEntity] ?? [];

  switch (phase) {
    case "active": {
      if (!contractSite) {
        if (postedContracts.length > 0) {
          setContractLifecycle(context, "bidding");
          return;
        }
        enterBiddingPhase(context);
        return;
      }
      if (hasContractConcluded(contractSite)) {
        enterResolvedPhase(context, contractSite);
        return;
      }
      contractSite.briefing = getContractBriefingState(context, contractSite);
      ensureRaidPresentationSeed(context, contractSite.contractSiteId);
      return;
    }
    case "bidding": {
      if (contractSite && !hasContractConcluded(contractSite)) {
        setContractLifecycle(context, "active");
        ensureRaidPresentationSeed(context, contractSite.contractSiteId);
        return;
      }
      if (contractSite && hasContractConcluded(contractSite)) {
        BuildingAuthority.contractSite[buildingEntity] = null;
      }
      if (postedContracts.length === 0) {
        generateContractBoard(context);
      }
      return;
    }
    case "resolved": {
      if (contractSite && hasContractConcluded(contractSite) && !contractResult) {
        enterResolvedPhase(context, contractSite);
        return;
      }
      if (!contractResult) {
        enterBiddingPhase(context);
      }
      return;
    }
    case "idle":
      enterBiddingPhase(context);
      return;
  }
}

function enterResolvedPhase(context: SimSystemContext, contractSite: ContractSiteState): void {
  const buildingEntity = context.singletonEntities.building;
  const summaries = (BuildingAuthority.raidSummaries[buildingEntity] ?? []).filter(
    (s) => s.contractSiteId === contractSite.contractSiteId,
  );

  const outcome: "boss_defeated" | "mission_complete" | "contract_lost" = contractSite.bossDefeated
    ? "boss_defeated"
    : contractSite.missionCompleted
      ? "mission_complete"
      : "contract_lost";
  const operatorDeaths = summaries.reduce(
    (sum, s) => sum + (s.operatorOutcomes?.filter((o) => o.died).length ?? 0),
    0,
  );

  const result: ContractResultSummary = {
    contractSiteId: contractSite.contractSiteId,
    missionId: contractSite.missionId,
    siteConceptId: contractSite.siteConceptId ?? "",
    location: contractSite.location,
    rank: contractSite.rank ?? "f",
    outcome,
    totalRaids: summaries.length,
    totalCashEarned: summaries.reduce((sum, s) => sum + Math.max(0, s.cashDelta), 0),
    totalReputationEarned: summaries.reduce((sum, s) => sum + Math.max(0, s.reputationDelta), 0),
    operatorDeaths,
    resolvedAtTick: getCurrentAbsoluteMinute(context),
    districtId: contractSite.districtId,
    sponsorFactionId: contractSite.sponsorFactionId,
  };

  const { districtId, sponsorFactionId } = contractSite;
  if (districtId && sponsorFactionId && context.runtimeState.cityState) {
    const currentTick = getCurrentAbsoluteMinute(context);

    // Map contract outcome to city-pressure outcome
    let cityOutcome: CityPressureOutcome;
    if (outcome === "boss_defeated") {
      cityOutcome = "boss_defeated";
    } else if (outcome === "contract_lost") {
      cityOutcome = "contract_lost";
    } else {
      cityOutcome = "success";
    }

    const executiveOfficeBonus = hasOperationalRoomTemplate(
      context,
      SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
    );

    const cityEvents = applyCityPressureOutcome(
      context.runtimeState.cityState,
      districtId,
      sponsorFactionId,
      cityOutcome,
      currentTick,
      { executiveOfficeBonus },
    );

    // Apply operator death deltas separately (each death is its own event)
    for (let i = 0; i < operatorDeaths; i++) {
      const deathEvents = applyCityPressureOutcome(
        context.runtimeState.cityState,
        districtId,
        sponsorFactionId,
        "operator_death",
        currentTick,
        { executiveOfficeBonus },
      );
      cityEvents.push(...deathEvents);
    }

    emitCityPressureEvents(context, cityEvents);
  }

  if (outcome === "contract_lost") {
    applySocialFalloutAfterContractLoss(context);
  } else if (districtId) {
    applySocialRecoveryAfterDistrictWin(context);
  }

  BuildingAuthority.contractResult[buildingEntity] = result;
  BuildingAuthority.contractSite[buildingEntity] = null;
  BuildingAuthority.postedContracts[buildingEntity] = [];
  setContractLifecycle(context, "resolved");

  // Clear transient site state
  clearSiteTransientState(context);

  const outcomeLabel = contractSite.bossDefeated
    ? "Boss defeated"
    : contractSite.missionCompleted
      ? "Objective secured"
      : "Contract lost";
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `${outcomeLabel} — contract resolved`,
    accent: contractSite.contractLost ? "magma" : "gold",
  });
}

function clearSiteTransientState(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;

  // Clear fog of war
  BuildingAuthority.fogOfWar[buildingEntity] = null;

  // Clear raid presentation
  context.runtimeState.raidPresentation = {
    contractSiteId: null,
    teams: [],
    enemies: [],
    features: [],
  };

  // Expire all open raid opportunities
  context.runtimeState.raidOpportunityEntities.slice().forEach((entity) => {
    removeRaidOpportunityEntity(context, entity);
  });
}

function enterBiddingPhase(context: SimSystemContext): void {
  generateContractBoard(context);
  setContractLifecycle(context, "bidding");
}

/**
 * Generate 3 posted contracts for the bidding board.
 * Biases early boards toward F and E rank.
 */
function generateContractBoard(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const guildEntity = context.singletonEntities.guild;
  const currentMinute = getCurrentAbsoluteMinute(context);
  const reputation = GuildState.reputation[guildEntity];
  const rng = new SeededRng(seedFromSimulationKey(context, `board:${currentMinute}:${reputation}`));
  const boardIntel = getContractBoardIntelState(context);

  // Determine available ranks based on reputation, capped by building ceiling
  const buildingTemplateIndex = BuildingAuthority.activeBuildingTemplateIndex[buildingEntity];
  const buildingTemplate = context.registry.buildings[buildingTemplateIndex];
  const availableRanks = getAvailableContractRanksForReputation(
    reputation,
    buildingTemplate?.contractRankCeiling,
  );

  // Filter site concepts by available ranks
  const eligibleConcepts = siteConceptTemplates.filter((sc) =>
    sc.rankPool.some((r) => availableRanks.includes(r)),
  );

  // Pick 3 distinct site concepts (Fisher-Yates partial shuffle)
  const pool = [...eligibleConcepts];
  const pickCount = Math.min(3, pool.length);
  for (let i = pool.length - 1; i > pool.length - 1 - pickCount && i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selectedConcepts = pool.slice(pool.length - pickCount);

  const cityState = context.runtimeState.cityState ?? { districts: {}, factions: {} };

  const postings: PostedContract[] = selectedConcepts.map((concept, index) => {
    // Pick a rank from the intersection of concept ranks and available ranks
    const validRanks = concept.rankPool.filter((r) => availableRanks.includes(r));
    const rank = validRanks[rng.int(0, validRanks.length - 1)];

    // Pick a mission objective
    const missionIndex = rng.int(0, context.registry.missions.length - 1);
    const mission = context.registry.missions[missionIndex];

    // Select district and sponsor faction from city-pressure model
    const districtId = selectDistrictForConcept(concept, rng.int(0, 9999));
    const sponsorFactionId = selectSponsorFaction(districtId, rng.int(0, 9999));
    const location = districtId;

    // Compute city-pressure modifiers for this district/faction pair
    const cityMods = computeCityContractModifiers(cityState, districtId, sponsorFactionId);

    const budget = computePostedContractEconomyBudget({
      rank,
      missionBaseDurationHours: mission.baseDurationHours,
      missionExpectedThreatTagCount: mission.expectedThreatTags.length,
      guildIntel: GuildState.intel[guildEntity],
      threatVariance: rng.int(
        POSTED_CONTRACT_VARIANCE.threat.min,
        POSTED_CONTRACT_VARIANCE.threat.max,
      ),
      intelVariance: rng.int(
        POSTED_CONTRACT_VARIANCE.intel.min,
        POSTED_CONTRACT_VARIANCE.intel.max,
      ),
      rewardVariance: rng.int(
        POSTED_CONTRACT_VARIANCE.reward.min,
        POSTED_CONTRACT_VARIANCE.reward.max,
      ),
    });

    // Apply city-pressure modifiers to reward and risk
    const modifiedReward = clamp(Math.round(budget.reward * cityMods.rewardMultiplier), 40, 500);
    const modifiedRisk = clamp(Math.round(budget.risk * cityMods.riskMultiplier), 18, 96);
    const modifiedMinRep = Math.max(
      0,
      getMinimumReputationForContractRank(rank) + cityMods.minReputationOffset,
    );

    const contractIntel = getBoardAdjustedContractIntel(budget.intel, boardIntel);
    const boardRead = buildBoardContractIntel(concept.siteConceptId, contractIntel, boardIntel);

    return {
      postingId: `posting/${currentMinute}/${index}`,
      missionId: mission.id,
      siteConceptId: concept.siteConceptId,
      location,
      rank,
      threat: budget.threat,
      intel: contractIntel,
      reward: modifiedReward,
      risk: modifiedRisk,
      bidCost: Math.round(modifiedReward * 0.08),
      minReputation: modifiedMinRep,
      generatedAtTick: currentMinute,
      knownTraits: boardRead.knownTraits,
      hiddenTraitCount: boardRead.hiddenTraitCount,
      enemyHints: boardRead.enemyHints,
      lootFamilyHints: boardRead.lootFamilyHints,
      bossHint: boardRead.bossHint,
      neighborhoodLabel: formatNeighborhoodLabel(location),
      boardIntel,
      districtId,
      sponsorFactionId,
      pressureTags: cityMods.pressureTags,
    };
  });

  BuildingAuthority.postedContracts[buildingEntity] = postings;
}

/**
 * Player selects a posted contract to bid on.
 * Deterministic and forgiving: choosing a posting secures it if requirements are met.
 */
export function bidOnContract(context: SimSystemContext, postingId: string): boolean {
  const buildingEntity = context.singletonEntities.building;
  const guildEntity = context.singletonEntities.guild;
  const phase = getContractLifecycle(context);

  if (phase !== "bidding") {
    return false;
  }

  const postings = BuildingAuthority.postedContracts[buildingEntity] ?? [];
  const posting = postings.find((p) => p.postingId === postingId);
  if (!posting) {
    return false;
  }

  // Check requirements
  if (GuildState.reputation[guildEntity] < posting.minReputation) {
    return false;
  }
  if (GuildState.treasury[guildEntity] < posting.bidCost) {
    return false;
  }

  // Deduct bid cost
  GuildState.treasury[guildEntity] -= posting.bidCost;

  // Create the new contract site from the posting
  const currentMinute = getCurrentAbsoluteMinute(context);
  const contractOrdinal = getResolvedContractCount(context) + 1;
  const requiresBossClear = shouldRequireBossClear(contractOrdinal);
  const newContract: ContractSiteState = {
    contractSiteId: `contract/${currentMinute}`,
    missionId: posting.missionId,
    siteConceptId: posting.siteConceptId,
    location: posting.location,
    rank: posting.rank,
    districtId: posting.districtId,
    sponsorFactionId: posting.sponsorFactionId,
    bossDefeated: false,
    missionCompleted: false,
    contractLost: false,
    threat: posting.threat,
    intel: posting.intel,
    reward: posting.reward,
    boardIntel: { ...posting.boardIntel },
    briefing: null,
    securedAtTick: currentMinute,
    explorationProgress: 0,
    closureProgress: 0,
    closureThreshold: getContractClosureThreshold(contractOrdinal),
    bossIntelProgress: 0,
    bossPressureProgress: 0,
    requiresBossClear,
    bossAvailable: false,
  };

  // Increment district recent contract count
  const districtState = context.runtimeState.cityState?.districts[posting.districtId];
  if (districtState) {
    districtState.recentContractCount += 1;
    districtState.lastResolvedTick = currentMinute;
  }

  newContract.briefing = getContractBriefingState(context, newContract);
  BuildingAuthority.contractSite[buildingEntity] = newContract;
  initializeFogOfWar(context);

  // Clear board and result
  BuildingAuthority.postedContracts[buildingEntity] = [];
  BuildingAuthority.contractResult[buildingEntity] = null;

  // Enter active phase
  setContractLifecycle(context, "active");
  ensureRaidPresentationSeed(context, newContract.contractSiteId);

  const concept = siteConceptById.get(posting.siteConceptId);
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `Contract secured: ${concept?.name ?? "Unknown Site"} (Rank ${posting.rank.toUpperCase()})`,
    accent: "gold",
  });
  pushRuntimeCue(context, "raid.opportunity");

  return true;
}

/**
 * Advance from resolved to bidding (player action).
 */
export function advanceContractPhase(context: SimSystemContext): void {
  const phase = getContractLifecycle(context);
  if (phase === "resolved") {
    enterBiddingPhase(context);
  }
}

// ── Fog-of-war ────────────────────────────────────────────────────────────

function initializeFogOfWar(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const totalCells = FOG_GRID_WIDTH * FOG_GRID_HEIGHT;
  BuildingAuthority.fogOfWar[buildingEntity] = {
    gridWidth: FOG_GRID_WIDTH,
    gridHeight: FOG_GRID_HEIGHT,
    revealed: Array.from({ length: totalCells }, () => false),
    revealedCount: 0,
  };
}

/**
 * Advance fog-of-war based on active raid teams' reveal progress.
 * Each active raid reveals cells proportional to its reveal progress.
 */
function advanceFogOfWar(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  if (!fog) return;

  const activePackets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  if (activePackets.length === 0) return;

  const totalCells = fog.gridWidth * fog.gridHeight;
  const currentMinute = getCurrentAbsoluteMinute(context);
  const objectiveBias = getObjectiveBiasConfig(getPolicyState(context));

  // Completed raids lock their fog contribution into the base.
  // Active raids add their reveal progress on top.
  const base = fog.completedRaidRevealBase ?? 0;
  const activeContribution = activePackets.reduce((total, packet) => {
    return (
      total +
      Math.floor(
        (packet.revealProgress / 100) *
          totalCells *
          0.3 *
          objectiveBias.explorationCoverageMultiplier,
      )
    );
  }, 0);
  const targetRevealed = Math.min(totalCells, base + activeContribution);
  const revealBudget = Math.max(0, targetRevealed - fog.revealedCount);
  if (revealBudget === 0) {
    return;
  }

  const rng = new SeededRng(
    seedFromSimulationKey(
      context,
      `fog:${BuildingAuthority.contractSite[buildingEntity]?.contractSiteId ?? "site"}:${currentMinute}`,
    ),
  );

  // Compute current team grid positions for proximity-based reveal
  const teamGridPositions = activePackets.map((packet, packetIndex) => {
    const pos = interpolatePath(buildRaidWaypointPath(packetIndex), packet.revealProgress / 100);
    return {
      gx: Math.floor(pos.x / 32),
      gy: Math.floor(pos.y / 32),
    };
  });

  let revealed = 0;
  let attempts = 0;
  // Widen radius when nearby cells are saturated so that
  // exploration can reach the boss-threshold percentage.
  let localMisses = 0;
  while (revealed < revealBudget && attempts < revealBudget * 4) {
    // Pick a random team to reveal around
    const team = teamGridPositions[rng.int(0, teamGridPositions.length - 1)];
    // Start with proximity reveal, widen when local area is saturated
    const radius = localMisses > 12 ? Math.min(8, 3 + Math.floor(localMisses / 6)) : 3;
    const rx = team.gx + rng.int(-radius, radius);
    const ry = team.gy + rng.int(-radius, radius);
    const cx = Math.max(0, Math.min(fog.gridWidth - 1, rx));
    const cy = Math.max(0, Math.min(fog.gridHeight - 1, ry));
    const cellIndex = cy * fog.gridWidth + cx;
    if (!fog.revealed[cellIndex]) {
      fog.revealed[cellIndex] = true;
      fog.revealedCount += 1;
      revealed += 1;
      localMisses = 0;
    } else {
      localMisses += 1;
    }
    attempts += 1;
  }
}

// ── Site progress tracking ──────────────────────────────────────────────

/** Per-tick: update exploration progress from fog reveal. Cheap. */
function updateExplorationProgress(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  if (!contractSite || hasContractConcluded(contractSite)) return;

  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  const totalCells = fog ? fog.gridWidth * fog.gridHeight : 1;
  contractSite.explorationProgress = fog ? (fog.revealedCount / totalCells) * 100 : 0;
}

/** On raid completion: update summary-derived progress fields. */
function updateSummaryDerivedProgress(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  if (!contractSite || hasContractConcluded(contractSite)) return;
  const objectiveBias = getObjectiveBiasConfig(getPolicyState(context));

  const summaries = (BuildingAuthority.raidSummaries[buildingEntity] ?? []).filter(
    (s) => s.contractSiteId === contractSite.contractSiteId,
  );
  let intelContribution = 0;
  let pressureContribution = 0;
  let closureContribution = 0;
  for (const s of summaries) {
    closureContribution += getContractProgressDelta(
      s.result,
      contractSite.requiresBossClear,
      objectiveBias,
    );
    if (s.result === "success") {
      intelContribution += 15 * objectiveBias.intelMultiplier;
      pressureContribution += 32;
    } else if (s.result === "mixed") {
      intelContribution += 5 * objectiveBias.intelMultiplier;
      pressureContribution += 18;
    } else {
      pressureContribution += 8;
    }
  }
  contractSite.closureProgress = clamp(
    closureContribution + contractSite.explorationProgress * 0.2,
    0,
    contractSite.closureThreshold,
  );
  contractSite.bossIntelProgress = clamp(
    contractSite.requiresBossClear ? intelContribution : 0,
    0,
    100,
  );
  contractSite.bossPressureProgress = clamp(
    contractSite.requiresBossClear
      ? pressureContribution + contractSite.explorationProgress * 0.35
      : 0,
    0,
    100,
  );
  const routeUnlockExplorationFloor = Math.max(
    15,
    Math.round(objectiveBias.contractExplorationThreshold * 0.35),
  );
  contractSite.bossAvailable =
    contractSite.requiresBossClear &&
    contractSite.closureProgress >= BOSS_ROUTE_UNLOCK_PROGRESS &&
    contractSite.explorationProgress >= routeUnlockExplorationFloor &&
    summaries.some((summary) => summary.result !== "failure") &&
    !contractSite.bossDefeated;
}

/**
 * Get the current fog-of-war reveal percentage.
 */
export function getFogRevealPercentage(context: SimSystemContext): number {
  const buildingEntity = context.singletonEntities.building;
  const fog = BuildingAuthority.fogOfWar[buildingEntity];
  if (!fog) return 0;

  const totalCells = fog.gridWidth * fog.gridHeight;
  return totalCells > 0 ? (fog.revealedCount / totalCells) * 100 : 0;
}

// ── Team goal selection ───────────────────────────────────────────────────

/**
 * Select an autonomous goal for a raid team based on team state and dungeon conditions.
 * Uses the shared uncertainty utility for weighted selection.
 */
export function selectTeamGoal(
  context: SimSystemContext,
  operatorEntities: readonly number[],
  packet: {
    id?: string;
    startedTick?: number;
    threat: number;
    intel: number;
    revealProgress: number;
  },
): RaidTeamGoal {
  const objectiveBias = getObjectiveBiasConfig(getPolicyState(context));
  const currentMinute = getCurrentAbsoluteMinute(context);
  // Quantize to 15-minute epochs so goals persist for a meaningful period
  // instead of re-rolling every single tick.
  const goalEpoch = Math.floor(currentMinute / 15);
  const operatorKey = operatorEntities.map((entity) => OperatorIdentity.id[entity]).join("|");
  const rng = new SeededRng(
    seedFromSimulationKey(
      context,
      `goal:${packet.id ?? packet.startedTick ?? 0}:${goalEpoch}:${operatorKey}`,
    ),
  );

  // Compute team aggregate stats
  const avgMorale =
    operatorEntities.reduce((sum, e) => sum + MoraleState.current[e], 0) /
    Math.max(1, operatorEntities.length);
  const avgFatigue =
    operatorEntities.reduce((sum, e) => sum + NeedState.fatigue[e], 0) /
    Math.max(1, operatorEntities.length);
  const avgRiskTolerance =
    operatorEntities.reduce((sum, e) => sum + PreferenceState.riskTolerance[e], 0) /
    Math.max(1, operatorEntities.length);

  const fogReveal = packet.revealProgress;
  const highThreat = packet.threat > 70;
  const lowIntel = packet.intel < 40;

  // Build weighted goal choices
  const choices: Array<{ item: RaidTeamGoal; weight: number }> = [
    {
      item: "exploring",
      weight: Math.max(
        5,
        40 -
          fogReveal * 0.3 +
          (lowIntel ? 15 : 0) +
          (objectiveBias.goalWeightModifiers.exploring ?? 0),
      ),
    },
    {
      item: "looting",
      weight: Math.max(
        5,
        25 +
          fogReveal * 0.15 -
          (highThreat ? 10 : 0) +
          (objectiveBias.goalWeightModifiers.looting ?? 0),
      ),
    },
    {
      item: "intel",
      weight: Math.max(
        5,
        20 + (lowIntel ? 20 : 0) - fogReveal * 0.1 + (objectiveBias.goalWeightModifiers.intel ?? 0),
      ),
    },
    {
      item: "hunting",
      weight: Math.max(
        5,
        15 +
          avgRiskTolerance * 0.2 +
          avgMorale * 0.1 +
          (objectiveBias.goalWeightModifiers.hunting ?? 0),
      ),
    },
    {
      item: "boss",
      weight: Math.max(
        0,
        fogReveal > 60
          ? 10 +
              avgMorale * 0.15 +
              avgRiskTolerance * 0.1 -
              avgFatigue * 0.2 +
              (objectiveBias.goalWeightModifiers.boss ?? 0)
          : 0,
      ),
    },
    {
      item: "retreating",
      weight: Math.max(0, avgFatigue > 60 ? avgFatigue * 0.4 - avgMorale * 0.1 : 0),
    },
    {
      item: "regrouping",
      weight: Math.max(0, avgFatigue > 40 && avgMorale < 40 ? 15 : 0),
    },
  ];

  const result = weightedChoice(rng, choices);
  return result.outcome;
}

// ── Dungeon closure ───────────────────────────────────────────────────────

/**
 * Check if the active dungeon should close.
 * Closure happens on boss defeat or contract loss.
 * Fog-of-war reveal alone never closes the dungeon.
 * Ordinary enemies continue to respawn while the dungeon is open.
 */
function checkDungeonClosure(context: SimSystemContext): void {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  if (!contractSite || hasContractConcluded(contractSite)) return;

  const raidSummaries = (BuildingAuthority.raidSummaries[buildingEntity] ?? []).filter(
    (summary) => summary.contractSiteId === contractSite.contractSiteId,
  );

  // Boss defeat requires an actual boss encounter victory (bossDefeated flag on a summary)
  const bossVictorySummary = raidSummaries.find((s) => s.bossDefeated === true);
  if (bossVictorySummary) {
    BuildingAuthority.contractSite[buildingEntity] = {
      ...contractSite,
      bossDefeated: true,
    };
    GuildState.reputation[context.singletonEntities.guild] +=
      computeBossCompletionReputationBonus();
    GuildState.treasury[context.singletonEntities.guild] += computeBossCompletionCashBonus(
      contractSite.reward,
      contractSite.rank ?? "f",
    );
    pushRuntimeEvent(context, {
      kind: "event_change",
      message: `Boss defeated! Contract complete.`,
      accent: "gold",
    });
    return;
  }

  if (
    !contractSite.requiresBossClear &&
    contractSite.closureProgress >= contractSite.closureThreshold &&
    raidSummaries.some((summary) => summary.result !== "failure")
  ) {
    GuildState.reputation[context.singletonEntities.guild] +=
      computeMissionCompletionReputationBonus();
    GuildState.treasury[context.singletonEntities.guild] += computeMissionCompletionCashBonus(
      contractSite.reward,
      contractSite.rank ?? "f",
    );
    BuildingAuthority.contractSite[buildingEntity] = {
      ...contractSite,
      missionCompleted: true,
      bossAvailable: false,
      closureProgress: contractSite.closureThreshold,
    };
    pushRuntimeEvent(context, {
      kind: "event_change",
      message: "Objective secured. Contract ready to close out.",
      accent: "gold",
    });
    return;
  }

  // Check for contract loss: too many consecutive failures
  let failureStreak = 0;
  for (let index = raidSummaries.length - 1; index >= 0; index -= 1) {
    if (raidSummaries[index].result !== "failure") {
      break;
    }
    failureStreak += 1;
  }

  if (failureStreak >= 3) {
    const rng = new SeededRng(
      seedFromSimulationKey(context, `loss:${contractSite.contractSiteId}:${raidSummaries.length}`),
    );
    const lossCheck = boundedRoll(
      rng,
      failureStreak * 20,
      [{ label: "consecutive_failures", value: failureStreak * 15 }],
      60,
      10,
    );

    if (lossCheck.outcome) {
      BuildingAuthority.contractSite[buildingEntity] = {
        ...contractSite,
        contractLost: true,
      };
      GuildState.reputation[context.singletonEntities.guild] -= 8;
      pushRuntimeEvent(context, {
        kind: "event_change",
        message: `Contract lost after ${failureStreak} consecutive failures`,
        accent: "magma",
      });
    }
  }
}
