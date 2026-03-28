import { addComponent, addEntity, createWorld } from "bitecs";

import { type ActiveRaidSnapshot, type RaidSummarySnapshot, type WorldSnapshot } from "save";
import { isOperatorAppearanceRecipeId, selectOperatorAppearanceRecipeId } from "save/appearance";
import type { TemplateRegistry } from "content/templates";
import { siteConceptById, type ContractRank } from "content/templates/site-concepts";
import { getBuildingFloors } from "content/building-layouts";
import {
  getApplicableRoomUpgradeIds,
  getNextPendingRoomUpgradeIds,
  getRoomActiveFootprint,
  getRoomStateId,
  resolveKnownRoomSlotPlacement,
} from "lib/hq-room-state";
import { normalizeOperatorCombatSnapshot } from "lib/operator-combat";
import {
  DEFAULT_POLICY_STATE,
  getContractPostureConfig,
  getRecoveryTriageConfig,
  normalizePolicyState,
  type PolicyState,
} from "lib/policies";
import {
  buildKitTemplateRegistry,
  REGULAR_ATTACKS,
  SKILLS,
  ULTIMATES,
  PASSIVES,
} from "content/templates/kits";
import { OPENING_BEAT_COUNT } from "./systems/guidance-beats";
import { syncOpeningContractTracking } from "./systems/guidance";
// Type-only re-declarations to avoid importing from systems/ modules.
// Those modules have init-time circular dependencies through the systems barrel.
type InterruptionQueueState = { active: unknown; queue: unknown[]; nextInstanceId: number };
type IncidentState = {
  pendingIncident: unknown;
  history: unknown[];
  cooldowns: Record<string, number>;
  nextInstanceId: number;
  lastEvaluationMinute: number;
};
type GuidanceState = {
  seenBeatIds: string[];
  completedBeatIds: string[];
  dismissedBeatIds: string[];
  activeBeatId: string | null;
  activeBeatView: unknown;
  queuedBeatIds: string[];
  lastEvaluationMinute: number;
  openingPathState: string;
  anchorResolutionFailures: unknown[];
  activeBeatProgressBaseline: number | null;
  interactionCounts: {
    staffingActions: number;
    upgradesPurchased: number;
  };
  openingTiming?: {
    firstRaidReturnCompletedAtMinute: number | null;
    firstIncidentSeededAtMinute: number | null;
    securedContractCount?: number;
    lastTrackedContractSiteId?: string | null;
  };
};
// Safe to import: encounter-types is a leaf module with no circular deps.
import {
  getBossEncounterDefinition,
  type BossEncounterInstance,
  type BossEncounterSnapshot,
  type EncounterView,
} from "./systems/encounter-types";
import { projectVisitorRecruitLoyalty, projectVisitorRecruitMorale } from "./recruitment";

function lazyCreateInterruptionQueueState(): InterruptionQueueState {
  return { active: null, queue: [], nextInstanceId: 1 };
}

function lazyCreateIncidentState(): IncidentState {
  return {
    pendingIncident: null,
    history: [],
    cooldowns: {},
    nextInstanceId: 1,
    lastEvaluationMinute: 0,
  };
}

function lazyCreateGuidanceState(openingPathState = "completed"): GuidanceState {
  return {
    seenBeatIds: [],
    completedBeatIds: [],
    dismissedBeatIds: [],
    activeBeatId: null,
    activeBeatView: null,
    queuedBeatIds: [],
    lastEvaluationMinute: 0,
    openingPathState,
    anchorResolutionFailures: [],
    activeBeatProgressBaseline: null,
    interactionCounts: {
      staffingActions: 0,
      upgradesPurchased: 0,
    },
    openingTiming: {
      firstRaidReturnCompletedAtMinute: null,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 0,
      lastTrackedContractSiteId: null,
    },
  };
}

function lazyBuildEncounterView(
  encounter: BossEncounterInstance,
  registry: TemplateRegistry,
): EncounterView {
  const bossActor = Object.values(encounter.actors).find((a) => a.kind === "boss");
  const bossDef = bossActor?.bossDefinitionId
    ? getBossEncounterDefinition(registry, encounter.missionId, bossActor.bossDefinitionId)
    : undefined;
  return {
    encounterId: encounter.encounterId,
    status: encounter.status,
    currentRound: encounter.currentRound,
    currentPhaseIndex: encounter.currentPhaseIndex,
    phaseCount: bossDef?.phases.length ?? 2,
    phaseThresholdFractions: bossDef?.phases.map((phase) => phase.hpThresholdFraction) ?? [1],
    bossName: bossActor?.label ?? "Unknown",
    bossHpFraction: bossActor ? bossActor.currentHp / bossActor.maxHp : 0,
    bossDefinitionId: encounter.bossDefinitionId,
    bossRank: bossDef?.rank ?? "?",
    bossTags: bossDef?.tags ?? [],
    bossWeaknesses: bossDef?.weaknesses.map((w) => ({ kind: w.kind, target: w.target })) ?? [],
    actors: Object.values(encounter.actors).map((a) => ({
      actorId: a.actorId,
      label: a.label,
      side: a.side,
      kind: a.kind,
      currentHp: a.currentHp,
      maxHp: a.maxHp,
      shield: a.shield,
      condition: a.condition,
      activeStatuses: a.activeStatuses,
      initiative: a.initiative,
      operatorId: a.operatorId,
      roleTag: a.roleTag,
      attunementTag: a.attunementTag,
      presetId: a.presetId,
      bossDefinitionId: a.bossDefinitionId,
    })),
    initiativeQueue: encounter.initiativeQueue,
    interventions: encounter.interventions,
    recentLog: encounter.encounterLog.slice(-20),
    autoplayEnabled: encounter.autoplayEnabled,
    elapsedMinutes: encounter.elapsedMinutes,
  };
}

function lazyRestoreEncounter(snapshot: BossEncounterSnapshot): BossEncounterInstance {
  return {
    ...snapshot,
    participatingOperatorIds: [...snapshot.participatingOperatorIds],
    initiativeQueue: [...snapshot.initiativeQueue],
    pendingRoundStart: snapshot.pendingRoundStart ?? snapshot.initiativeQueue.length === 0,
    actors: JSON.parse(JSON.stringify(snapshot.actors)),
    interventions: snapshot.interventions.map((i) => ({ ...i })),
    encounterLog: [...snapshot.encounterLog],
    debugTraceEnabled: false,
    autoplayEnabled: snapshot.status === "active",
    autoplayIntervalMs: 800,
  };
}

import {
  AssignmentState,
  BuildingAuthority,
  type ActiveRaidPacketRecord,
  type RaidSummaryRecord,
  EquipmentAssignment,
  EventState,
  GuildState,
  InjuryState,
  InventoryStack,
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
  Renderable,
  RoomCulture,
  RoomInstance,
  ScheduleState,
  StaffState,
  VisitorState,
  WorldTimeState,
} from "./components";
import { STABLE_SIM_COMMAND_TYPES, type SimCommand } from "./commands";
import {
  BODEGA_DEFERRED_VISITOR_CAPACITY,
  buildDefaultPreferenceProfile,
  getAdjustedMarketItems,
  buildInitialRelationshipRecord,
  buildRequirementContext,
  getAdjustedUpgradeCosts,
  getCurrentAbsoluteMinute,
  getVisitorQueueState,
  getStaffRoleTag,
  isCanonicalStaffRoleTag,
  meetsRequirements,
  normalizeStaffRoleTag,
  type PreferenceProfileRecord,
} from "./systems/commands";
import type { RaidTeamGoal } from "lib/raid-team-goal";
import {
  describeAccessoryAssignment,
  describeAccessorySelectionReason,
  type RaidEncounterThreat,
  type RaidEventKind,
  type RaidFeatureKind,
  type RaidOperatorReadiness,
  type RuntimeCueId,
  computeOperatorRaidReadiness,
  computeRelationshipCohesion,
  computeSchedulePressure,
  deriveCompatibilityRelationships,
  ensurePhase2StateEntities,
  ensureDispositionDefaults,
  getRecommendedOperatorCountForMission,
  importLegacyRelationshipsIntoSocialState,
  selectTeamGoal,
  runSimCommand,
  runSimSystemSchedule,
  simSystemSchedule,
  type SimRuntimeState,
  type SimSingletonEntities,
  type VisitorQueueState,
} from "./systems";
import type { MarketItemView } from "./systems/market";
import { computeAutonomyFlags } from "./systems/morale";
import { computeNeedReadinessFlags } from "./systems/needs";
import { getRecruitmentGateState } from "./systems/opening-envelope";

export type Phase1OperatorPreferenceSnapshot = PreferenceProfileRecord;

export interface Phase1OperatorScheduleSnapshot {
  currentBlock: string;
  workStartMinute: number;
  workEndMinute: number;
}

export interface Phase1OperatorVisibleGearSnapshot {
  weaponPartId?: string;
  outfitOverlayPartId?: string;
  accessoryPartId?: string;
}

export interface Phase1OperatorSnapshot {
  id: string;
  identity: {
    name: string;
    roleTag: string;
    specialtyTag: string;
  };
  preferences: Phase1OperatorPreferenceSnapshot;
  schedule: Phase1OperatorScheduleSnapshot;
  needs: {
    hunger: number;
    fatigue: number;
    stress: number;
  };
  morale: {
    current: number;
    baseline: number;
  };
  loyalty: {
    current: number;
    baseline: number;
  };
  injury: {
    severity: number;
    recoveryHoursRemaining: number;
    treated: boolean;
  };
  assignment: {
    kind: string;
    targetId: string;
  };
  appearance: {
    presetId: string;
    visibleGear?: Phase1OperatorVisibleGearSnapshot;
  };
  lifecycle: {
    status: "active" | "dead" | "departed";
    deathTick?: number;
    deathRaidSummaryId?: string;
    departureTick?: number;
    departureReason?: string;
  };
  combat?: {
    rank: string;
    attunementTag: string;
    traits: string[];
    kit: {
      regularAttackId: string;
      skillId: string;
      ultimateId: string;
      passiveIds: string[];
    };
    baseStats: {
      strength: number;
      speed: number;
      endurance: number;
      resilience: number;
      perception: number;
      intelligence: number;
    };
  };
}

export interface Phase1RelationshipSnapshot {
  operatorAId: string;
  operatorBId: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  historyTags: string[];
}

export interface Phase1StaffSnapshot {
  id: string;
  name: string;
  roleTag: string;
  status: string;
  wage: number;
  schedule: {
    currentBlock: string;
    workStartMinute: number;
    workEndMinute: number;
  };
  needs: {
    hunger: number;
    fatigue: number;
    stress: number;
  };
  morale: {
    current: number;
    baseline: number;
  };
  loyalty: {
    current: number;
    baseline: number;
  };
  injury: {
    severity: number;
    recoveryHoursRemaining: number;
    treated: boolean;
  };
  assignment: {
    kind: string;
    targetId: string;
  };
}

export interface Phase1VisitorSnapshot {
  id: string;
  name: string;
  desiredRoleTag: string;
  patience: number;
  quality: number;
  expectedLoyalty: number;
  queueState: VisitorQueueState;
  projectedMorale?: number;
  projectedLoyalty?: number;
  canAccept?: boolean;
  lockedReason?: string | null;
  canDefer?: boolean;
  deferLockedReason?: string | null;
  canReplace?: boolean;
  replaceLockedReason?: string | null;
}

export interface Phase1RaidOpportunitySnapshot {
  id: string;
  missionId: string;
  location: string;
  threat: number;
  intel: number;
  reward: number;
  risk: number;
  status: string;
  interestedOperatorIds: string[];
  claimedOperatorIds: string[];
  createdTick: number;
  expiresAtTick: number;
}

export interface Phase1ActiveEventSnapshot {
  id: string;
  templateId: string;
  severity: number;
  remainingHours: number;
  pressureContribution: number;
}

export interface Phase1ActiveRaidSnapshot extends ActiveRaidSnapshot {
  opportunityId: string;
  operatorIds: string[];
  startedTick: number;
  returnTick: number;
  durationHours: number;
  location: string;
  threat: number;
  intel: number;
  reward: number;
  cohesion: number;
  resolutionPacket: ActiveRaidPacketRecord["resolutionPacket"];
}

export interface Phase1RaidSummarySnapshot extends RaidSummarySnapshot {
  opportunityId: string;
  location: string;
  threat: number;
  intel: number;
  reward: number;
  cohesion: number;
  operatorOutcomes: RaidSummaryRecord["operatorOutcomes"];
  narrativeTags: string[];
  intelMismatchTags: string[];
}

export interface Phase1RaidOperatorStatusView {
  operatorId: string;
  readiness: RaidOperatorReadiness;
  healthFraction: number | null;
  roleTag: string | null;
}

export interface Phase1RaidEncounterView {
  enemyLabel: string;
  threat: RaidEncounterThreat;
  healthFraction: number;
}

export interface Phase1RaidEventView {
  id: string;
  kind: RaidEventKind;
  message: string;
  tick: number;
}

export interface Phase1RaidEnemyMarkerView {
  id: string;
  x: number;
  y: number;
  threat: RaidEncounterThreat;
  discovered: boolean;
}

export interface Phase1RaidFeatureMarkerView {
  id: string;
  x: number;
  y: number;
  kind: RaidFeatureKind;
  discovered: boolean;
}

export interface Phase1RuntimeWorldSnapshot extends WorldSnapshot {
  operators?: Phase1OperatorSnapshot[];
  operatorRelationships?: Phase1RelationshipSnapshot[];
  staff?: Phase1StaffSnapshot[];
  visitors?: Phase1VisitorSnapshot[];
  raidOpportunities?: Phase1RaidOpportunitySnapshot[];
  activeEvents?: Phase1ActiveEventSnapshot[];
  activeRaidPackets: Phase1ActiveRaidSnapshot[];
  raidSummaries: Phase1RaidSummarySnapshot[];
}

export interface Phase1OperatorIntentReadinessView {
  operatorId: string;
  name: string;
  intent: string;
  currentBlock: string;
  dominantNeed: string;
  availableForRaid: boolean;
  preferredOpportunityId?: string;
  availabilityScore: number;
  willingnessScore: number;
  readinessScore: number;
  schedulePressure: number;
}

export interface Phase1RelationshipSignalView extends Phase1RelationshipSnapshot {
  cohesion: number;
}

export interface Phase1RaidOpportunityView extends Phase1RaidOpportunitySnapshot {
  recommendedOperatorCount: number;
  interestedCount: number;
  claimedCount: number;
}

export interface Phase1RosterPressureView {
  operatorCapacity: number;
  livingOperatorCount: number;
  vacancyCount: number;
  deferredVisitorCapacity: number;
  unavailableOperatorIds: string[];
  recentDeathOperatorIds: string[];
  replacementPressureLevel: "stable" | "strained" | "critical";
}

export interface Phase1RuntimeView {
  stableCommandTypes: readonly string[];
  clock: {
    tick: number;
    day: number;
    minuteOfDay: number;
    absoluteMinute: number;
  };
  resources: {
    cash: number;
    reputation: number;
    intel: number;
    pressure: number;
  };
  policies: PolicyState;
  building: {
    activeBuildingId: string;
    activeBuildingName: string;
    tier: number;
    activeFloorIndex: number;
    floorCount: number;
    roomSlotCount: number;
    roomsUsed: number;
    operatorSlotCount: number;
    operatorCount: number;
    appliedUpgradeIds: string[];
    unlockedRoomTemplateIds: string[];
    availableBuildingUpgradeIds: string[];
  };
  rooms: Array<{
    id: string;
    templateId: string;
    name: string;
    tier: number;
    floorIndex: number;
    slotId: string;
    roomStateId: string;
    isRequestedActive: boolean;
    isOperational: boolean;
    capacity: number;
    occupancy: number;
    requiredStaffTag: string;
    assignedStaffCount: number;
    appliedUpgradeIds: string[];
    availableUpgradeIds: string[];
    reservedFootprint: {
      col: number;
      row: number;
      cols: number;
      rows: number;
    };
    activeFootprint: {
      col: number;
      row: number;
      cols: number;
      rows: number;
    };
  }>;
  visitors: Phase1VisitorSnapshot[];
  operators: Array<
    Phase1OperatorSnapshot & {
      availableForRaid: boolean;
      intent: string;
      dominantNeed: string;
      readinessScore: number;
      availabilityScore: number;
      willingnessScore: number;
      schedulePressure: number;
      preferredOpportunityId?: string;
      canBeReplaced: boolean;
      replaceLockedReason: string | null;
    }
  >;
  operatorIntentReadiness: Phase1OperatorIntentReadinessView[];
  relationshipSignals: Phase1RelationshipSignalView[];
  staff: Phase1StaffSnapshot[];
  missions: Array<{
    id: string;
    name: string;
    objectiveType: string;
    baseDurationHours: number;
    recommendedOperatorCount: number;
    available: boolean;
  }>;
  raidOpportunities: Phase1RaidOpportunityView[];
  activeRaids: Array<
    Phase1ActiveRaidSnapshot & {
      teamGoal: RaidTeamGoal;
      teamState: "active" | "returning" | "defeated";
      x: number;
      y: number;
      operatorStatuses: Phase1RaidOperatorStatusView[];
      encounter: Phase1RaidEncounterView | null;
      recentEvents: Phase1RaidEventView[];
    }
  >;
  raidSummaries: Phase1RaidSummarySnapshot[];
  activeEvents: Phase1ActiveEventSnapshot[];
  rosterPressure: Phase1RosterPressureView;
  contractLifecycle: "idle" | "bidding" | "active" | "resolved";
  contractSite: {
    contractSiteId: string;
    missionId: string;
    siteConceptId: string;
    siteConceptName: string;
    location: string;
    rank: string;
    bossDefeated: boolean;
    contractLost: boolean;
    threat: number;
    intel: number;
    reward: number;
    explorationProgress: number;
    bossAvailable: boolean;
  } | null;
  contractResult: {
    contractSiteId: string;
    missionId: string;
    siteConceptId: string;
    siteConceptName: string;
    location: string;
    rank: string;
    outcome: "boss_defeated" | "contract_lost";
    totalRaids: number;
    totalCashEarned: number;
    totalReputationEarned: number;
    operatorDeaths: number;
  } | null;
  postedContracts: Array<{
    postingId: string;
    missionId: string;
    siteConceptId: string;
    siteConceptName: string;
    location: string;
    rank: string;
    threat: number;
    intel: number;
    reward: number;
    risk: number;
    bidCost: number;
    canBid: boolean;
    knownTraits: string[];
    hiddenTraitCount: number;
    enemyHints: string[];
    lootFamilyHints: string[];
    bossHint: string | null;
    neighborhoodLabel: string;
  }>;
  fogOfWar: {
    gridWidth: number;
    gridHeight: number;
    revealed: readonly boolean[];
  } | null;
  raidWorld: {
    enemyMarkers: Phase1RaidEnemyMarkerView[];
    featureMarkers: Phase1RaidFeatureMarkerView[];
  } | null;
  encounter: EncounterView | null;
  activeInterruption: import("./systems/interruptions").InterruptionInstance | null;
  worldTimeFrozen: boolean;
  guidance: {
    activeBeat: {
      beatId: string;
      track: string;
      deliveryMode: string;
      target: string | null;
      fallbackIntent: string | null;
      copy: {
        title: string;
        body: string;
        subtitle?: string;
        ctaLabel: string;
        ctaDismissLabel?: string;
        fallbackBody?: string;
      };
      milestoneOrder: number;
      totalMilestones: number;
      completionKind: string;
      pauseWorld: boolean;
      allowSkip: boolean;
    } | null;
    openingPathState: string;
    completedOpeningBeats: number;
    totalOpeningBeats: number;
  };
}

// ── Phase 2 View Types ────────────────────────────────────────────────────

export interface Phase2TeamView {
  id: string;
  members: string[];
  cohesion: number;
  raidCount: number;
  damaged: boolean;
  damageReason: string;
  statusSummary: string;
  explanationReasons: Phase2AutonomyFactor[];
}

export interface Phase2RoomCultureView {
  roomId: string;
  tone: string;
  summary: string;
  signals: string[];
}

export interface Phase2InventoryView {
  itemId: string;
  quantity: number;
}

export interface Phase2EquipmentView {
  operatorId: string;
  weaponId: string;
  outfitOverlayId: string;
  accessoryId: string;
  accessoryReason: string;
  accessorySummary: string;
}

export interface Phase2AutonomyFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface Phase2OperatorAutonomyView {
  operatorId: string;
  refusalRisk: boolean;
  quitRisk: boolean;
  retentionRisk: boolean;
  explanationReasons: Phase2AutonomyFactor[];
}

export interface Phase2DispositionView {
  operatorId: string;
  sociability: number;
  temperament: number;
  grievanceLevel: number;
  satisfactionLevel: number;
}

export interface Phase2NotableTieView {
  operatorAId: string;
  operatorBId: string;
  stance: string;
  strength: number;
}

export interface Phase2View {
  teams: Phase2TeamView[];
  roomCultures: Phase2RoomCultureView[];
  inventory: Phase2InventoryView[];
  equipment: Phase2EquipmentView[];
  operatorAutonomy: Phase2OperatorAutonomyView[];
  marketItems: MarketItemView[];
  dispositions: Phase2DispositionView[];
  notableTies: Phase2NotableTieView[];
}

export interface AscensionSimulation {
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
  runtimeState: SimRuntimeState;
  roomEntities: readonly number[];
  schedule: typeof simSystemSchedule;
  stableCommandTypes: readonly string[];
  dispatch(command: SimCommand): void;
  getWorldSnapshot(): Phase1RuntimeWorldSnapshot;
  getPhase1View(cachedSnapshot?: Phase1RuntimeWorldSnapshot): Phase1RuntimeView;
  getPhase2View(): Phase2View;
  drainRuntimeCues(): readonly RuntimeCueId[];
  drainRuntimeEvents(): readonly import("./systems/types").RuntimeEvent[];
  tick(deltaMs: number): void;
}

function getDefaultScheduleSnapshot(assignment?: {
  kind?: string;
  targetId?: string;
}): Phase1OperatorScheduleSnapshot {
  return {
    currentBlock: assignment?.kind === "recovery" ? "recovery" : "idle",
    workStartMinute: 480,
    workEndMinute: 1080,
  };
}

function normalizePreferenceSnapshot(
  operator: Partial<Phase1OperatorSnapshot> & {
    identity: Phase1OperatorSnapshot["identity"];
  },
): Phase1OperatorPreferenceSnapshot {
  const defaults = buildDefaultPreferenceProfile(operator.identity);

  return {
    ...defaults,
    ...operator.preferences,
    preferredMissionTags: [
      ...(operator.preferences?.preferredMissionTags ?? defaults.preferredMissionTags),
    ],
    preferredPartnerIds: [...(operator.preferences?.preferredPartnerIds ?? [])],
  };
}

function normalizeOperatorSnapshot(
  operator: Partial<Phase1OperatorSnapshot> & {
    id: string;
    identity: Phase1OperatorSnapshot["identity"];
  },
): Phase1OperatorSnapshot {
  const preferences = normalizePreferenceSnapshot(operator);
  const appearanceRecord = operator.appearance as Record<string, unknown> | undefined;
  const presetId = isOperatorAppearanceRecipeId(appearanceRecord?.presetId)
    ? appearanceRecord!.presetId
    : selectOperatorAppearanceRecipeId({
        // Legacy seed migration is save-owned. Runtime reconstructs only the locked preset-id contract.
        stableKey: [
          operator.id,
          operator.identity.name,
          operator.identity.roleTag,
          operator.identity.specialtyTag,
        ].join(":"),
      });
  const visibleGear = buildVisibleGearSnapshot(appearanceRecord?.visibleGear);
  const combat = normalizeOperatorCombatSnapshot(operator.combat, operator.identity.roleTag);

  return {
    id: operator.id,
    identity: operator.identity,
    preferences,
    schedule: {
      ...getDefaultScheduleSnapshot(operator.assignment),
      ...operator.schedule,
    },
    needs: {
      hunger: operator.needs?.hunger ?? 0,
      fatigue: operator.needs?.fatigue ?? 0,
      stress: operator.needs?.stress ?? 0,
    },
    morale: {
      current: operator.morale?.current ?? 50,
      baseline: operator.morale?.baseline ?? operator.morale?.current ?? 50,
    },
    loyalty: {
      current: operator.loyalty?.current ?? 50,
      baseline: operator.loyalty?.baseline ?? operator.loyalty?.current ?? 50,
    },
    injury: {
      severity: operator.injury?.severity ?? 0,
      recoveryHoursRemaining: operator.injury?.recoveryHoursRemaining ?? 0,
      treated: operator.injury?.treated ?? false,
    },
    assignment: {
      kind: operator.assignment?.kind ?? "idle",
      targetId: operator.assignment?.targetId ?? "",
    },
    appearance: {
      presetId,
      ...(visibleGear ? { visibleGear } : {}),
    },
    lifecycle: normalizeLifecycleSnapshot(operator.lifecycle),
    combat,
  };
}

function normalizeStaffSnapshot(
  staff: Partial<Phase1StaffSnapshot> & {
    id: string;
  },
): Phase1StaffSnapshot {
  return {
    id: staff.id,
    name: staff.name ?? "Unknown Staff",
    roleTag: normalizeStaffRoleTag(staff.roleTag ?? "staff:admin") ?? "staff:admin",
    status: staff.status ?? "available",
    wage: staff.wage ?? 0,
    schedule: {
      currentBlock: staff.schedule?.currentBlock ?? "idle",
      workStartMinute: staff.schedule?.workStartMinute ?? 480,
      workEndMinute: staff.schedule?.workEndMinute ?? 1080,
    },
    needs: {
      hunger: staff.needs?.hunger ?? 18,
      fatigue: staff.needs?.fatigue ?? 24,
      stress: staff.needs?.stress ?? 14,
    },
    morale: {
      current: staff.morale?.current ?? 56,
      baseline: staff.morale?.baseline ?? staff.morale?.current ?? 56,
    },
    loyalty: {
      current: staff.loyalty?.current ?? 52,
      baseline: staff.loyalty?.baseline ?? staff.loyalty?.current ?? 52,
    },
    injury: {
      severity: staff.injury?.severity ?? 0,
      recoveryHoursRemaining: staff.injury?.recoveryHoursRemaining ?? 0,
      treated: staff.injury?.treated ?? false,
    },
    assignment: {
      kind: staff.assignment?.kind ?? "idle",
      targetId: staff.assignment?.targetId ?? "",
    },
  };
}

function normalizeLifecycleSnapshot(
  lifecycle: Phase1OperatorSnapshot["lifecycle"] | undefined,
): Phase1OperatorSnapshot["lifecycle"] {
  if (!lifecycle) {
    return { status: "active" };
  }

  if (lifecycle.status === "departed") {
    return {
      status: "departed",
      departureTick: lifecycle.departureTick,
      departureReason: lifecycle.departureReason,
    };
  }

  if (lifecycle.status !== "dead") {
    return { status: "active" };
  }

  return {
    status: "dead",
    deathTick: lifecycle.deathTick,
    deathRaidSummaryId: lifecycle.deathRaidSummaryId,
  };
}

function buildVisibleGearSnapshot(input: unknown): Phase1OperatorVisibleGearSnapshot | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const record = input as Record<string, unknown>;
  const visibleGear: Phase1OperatorVisibleGearSnapshot = {};

  if (typeof record.weaponPartId === "string" && record.weaponPartId.length > 0) {
    visibleGear.weaponPartId = record.weaponPartId;
  }

  if (typeof record.outfitOverlayPartId === "string" && record.outfitOverlayPartId.length > 0) {
    visibleGear.outfitOverlayPartId = record.outfitOverlayPartId;
  }

  if (typeof record.accessoryPartId === "string" && record.accessoryPartId.length > 0) {
    visibleGear.accessoryPartId = record.accessoryPartId;
  }

  return Object.keys(visibleGear).length > 0 ? visibleGear : undefined;
}

function buildOperatorAppearanceSnapshot(input: {
  presetId: string;
  weaponPartId?: string;
  outfitOverlayPartId?: string;
  accessoryPartId?: string;
}): Phase1OperatorSnapshot["appearance"] {
  const visibleGear = buildVisibleGearSnapshot({
    weaponPartId: input.weaponPartId,
    outfitOverlayPartId: input.outfitOverlayPartId,
    accessoryPartId: input.accessoryPartId,
  });

  return {
    presetId: input.presetId,
    ...(visibleGear ? { visibleGear } : {}),
  };
}

function buildLifecycleSnapshot(entity: number): Phase1OperatorSnapshot["lifecycle"] {
  if (OperatorIdentity.lifecycleStatus[entity] === "dead") {
    return {
      status: "dead",
      deathTick: OperatorIdentity.deathTick[entity],
      deathRaidSummaryId: OperatorIdentity.deathRaidSummaryId[entity],
    };
  }

  if (OperatorIdentity.lifecycleStatus[entity] === "departed") {
    return {
      status: "departed",
      departureTick: OperatorIdentity.departureTick[entity],
      departureReason: OperatorIdentity.departureReason[entity],
    };
  }

  return { status: "active" };
}

function normalizeVisitorQueueState(value: unknown): VisitorQueueState {
  return value === "deferred" ? "deferred" : "active";
}

function getVisitorAcceptLockReason(input: {
  recruitmentUnlocked: boolean;
  recruitmentLockReason: string | null;
  livingOperatorCount: number;
  operatorCapacity: number;
}): string | null {
  if (!input.recruitmentUnlocked) {
    return input.recruitmentLockReason;
  }

  if (input.livingOperatorCount >= input.operatorCapacity) {
    return "Operator roster is full.";
  }

  return null;
}

function getVisitorReplaceLockReason(input: {
  recruitmentUnlocked: boolean;
  recruitmentLockReason: string | null;
  livingOperatorCount: number;
  operatorCapacity: number;
  replaceableOperatorCount: number;
}): string | null {
  if (!input.recruitmentUnlocked) {
    return input.recruitmentLockReason;
  }

  if (input.livingOperatorCount < input.operatorCapacity) {
    return "Open operator slots are still available.";
  }

  if (input.replaceableOperatorCount <= 0) {
    return "Everyone active is already out on contract.";
  }

  return null;
}

function getVisitorDeferLockReason(
  queueState: VisitorQueueState,
  deferredVisitorCount: number,
): string | null {
  if (queueState === "deferred") {
    return "Already deferred.";
  }

  if (deferredVisitorCount >= BODEGA_DEFERRED_VISITOR_CAPACITY) {
    return "Deferred reserve is full.";
  }

  return null;
}

function getOperatorReplaceLockReason(
  operator: Pick<Phase1OperatorSnapshot, "assignment" | "lifecycle">,
): string | null {
  if (operator.lifecycle.status !== "active") {
    return "Only active operators can be replaced.";
  }

  if (operator.assignment.kind === "raid") {
    return "Cannot replace someone who is already on a contract.";
  }

  return null;
}

function buildCombatSnapshot(entity: number): Phase1OperatorSnapshot["combat"] {
  return {
    rank: OperatorIdentity.rank[entity],
    attunementTag: OperatorIdentity.attunementTag[entity],
    traits: [...(OperatorIdentity.traits[entity] ?? [])],
    kit: {
      regularAttackId: OperatorIdentity.regularAttackId[entity],
      skillId: OperatorIdentity.skillId[entity],
      ultimateId: OperatorIdentity.ultimateId[entity],
      passiveIds: [...(OperatorIdentity.passiveIds[entity] ?? [])],
    },
    baseStats: {
      strength: OperatorIdentity.baseStrength[entity],
      speed: OperatorIdentity.baseSpeed[entity],
      endurance: OperatorIdentity.baseEndurance[entity],
      resilience: OperatorIdentity.baseResilience[entity],
      perception: OperatorIdentity.basePerception[entity],
      intelligence: OperatorIdentity.baseIntelligence[entity],
    },
  };
}

function toRuntimeSnapshot(snapshot: WorldSnapshot): Phase1RuntimeWorldSnapshot {
  const extendedSnapshot = snapshot as Phase1RuntimeWorldSnapshot;
  const operators = (extendedSnapshot.operators ?? []).map((operator) => {
    return normalizeOperatorSnapshot(
      operator as Partial<Phase1OperatorSnapshot> & {
        id: string;
        identity: Phase1OperatorSnapshot["identity"];
      },
    );
  });
  const operatorRelationships: Phase1RelationshipSnapshot[] = [];
  if (extendedSnapshot.operatorRelationships !== undefined) {
    for (const relationship of extendedSnapshot.operatorRelationships) {
      operatorRelationships.push({
        operatorAId: relationship.operatorAId,
        operatorBId: relationship.operatorBId,
        trust: relationship.trust ?? 50,
        friction: relationship.friction ?? 0,
        familiarity: relationship.familiarity ?? 0,
        recentSharedOutcome: relationship.recentSharedOutcome ?? 0,
        historyTags: [...(relationship.historyTags ?? [])],
      });
    }
  } else {
    for (let i = 0; i < operators.length; i += 1) {
      for (let j = i + 1; j < operators.length; j += 1) {
        operatorRelationships.push(
          buildInitialRelationshipRecord(
            {
              id: operators[i].id,
              roleTag: operators[i].identity.roleTag,
              specialtyTag: operators[i].identity.specialtyTag,
              preferences: operators[i].preferences,
            },
            {
              id: operators[j].id,
              roleTag: operators[j].identity.roleTag,
              specialtyTag: operators[j].identity.specialtyTag,
              preferences: operators[j].preferences,
            },
          ),
        );
      }
    }
  }
  const staff =
    extendedSnapshot.staff?.map((entry) =>
      normalizeStaffSnapshot(entry as Partial<Phase1StaffSnapshot> & { id: string }),
    ) ?? [];
  const rooms = snapshot.rooms.map((room) => {
    const appliedUpgradeIds = getApplicableRoomUpgradeIds(room.templateId, room.appliedUpgradeIds);
    const reservedFootprint = room.reservedFootprint ?? room.footprint;
    const resolvedSlot = reservedFootprint
      ? resolveKnownRoomSlotPlacement({
          buildingId: snapshot.building.activeBuildingId,
          buildingTier: snapshot.building.activeBuildingTier,
          floorIndex: room.floorIndex ?? 0,
          slotId: room.slotId,
          templateId: room.templateId,
          reservedFootprint,
        })
      : undefined;
    const activeFootprint = reservedFootprint
      ? getRoomActiveFootprint(room.templateId, reservedFootprint, appliedUpgradeIds)
      : undefined;

    if (!reservedFootprint || !activeFootprint) {
      throw new Error(`Runtime snapshot room "${room.id}" is missing a valid footprint.`);
    }

    return {
      ...room,
      floorIndex: resolvedSlot?.floorIndex ?? room.floorIndex ?? 0,
      slotId: resolvedSlot?.slotId ?? room.slotId ?? `slot/${room.id}`,
      roomStateId: getRoomStateId(room.templateId, appliedUpgradeIds),
      appliedUpgradeIds: [...appliedUpgradeIds],
      reservedFootprint,
      activeFootprint,
      isActive: room.isActive ?? room.occupancy > 0,
    };
  });

  return {
    ...snapshot,
    building: {
      ...snapshot.building,
      activeFloorIndex: snapshot.building.activeFloorIndex ?? 0,
    },
    rooms,
    activeRaidPackets: (extendedSnapshot.activeRaidPackets ?? []).map((packet) => ({
      ...packet,
      contractSiteId: packet.contractSiteId ?? extendedSnapshot.contractSite?.contractSiteId ?? "",
      opportunityId: packet.opportunityId ?? "",
      operatorIds: packet.operatorIds ?? [],
      startedTick: packet.startedTick ?? 0,
      returnTick: packet.returnTick ?? packet.startedTick ?? 0,
      durationHours: packet.durationHours ?? 1,
      location: packet.location ?? "district/unknown",
      threat: packet.threat ?? 40,
      intel: packet.intel ?? 40,
      reward: packet.reward ?? 60,
      cohesion: packet.cohesion ?? 50,
      resolutionPacket: packet.resolutionPacket ?? {
        result: "mixed",
        reputationDelta: 0,
        cashDelta: 0,
        operatorOutcomes: [],
        narrativeTags: [],
        intelMismatchTags: [],
      },
    })),
    raidSummaries: (extendedSnapshot.raidSummaries ?? []).map((summary) => ({
      ...summary,
      contractSiteId: summary.contractSiteId ?? "",
      opportunityId: summary.opportunityId ?? "",
      location: summary.location ?? "district/unknown",
      threat: summary.threat ?? 40,
      intel: summary.intel ?? 40,
      reward: summary.reward ?? 60,
      cohesion: summary.cohesion ?? 50,
      operatorOutcomes: summary.operatorOutcomes ?? [],
      narrativeTags: summary.narrativeTags ?? [],
      intelMismatchTags: summary.intelMismatchTags ?? [],
    })),
    operators,
    operatorRelationships,
    staff,
    raidOpportunities: (extendedSnapshot.raidOpportunities ?? []).map((opportunity) => ({
      id: opportunity.id,
      missionId: opportunity.missionId,
      location: opportunity.location ?? "district/unknown",
      threat: opportunity.threat ?? 40,
      intel: opportunity.intel ?? 40,
      reward: opportunity.reward ?? 60,
      risk: opportunity.risk ?? 40,
      status: opportunity.status ?? "open",
      interestedOperatorIds: [...(opportunity.interestedOperatorIds ?? [])],
      claimedOperatorIds: [...(opportunity.claimedOperatorIds ?? [])],
      createdTick: opportunity.createdTick ?? 0,
      expiresAtTick: opportunity.expiresAtTick ?? 0,
    })),
    visitors: (extendedSnapshot.visitors ?? []).map((visitor) => ({
      ...visitor,
      queueState: normalizeVisitorQueueState(visitor.queueState),
      projectedMorale:
        visitor.projectedMorale ?? projectVisitorRecruitMorale(visitor.quality ?? 50),
      projectedLoyalty:
        visitor.projectedLoyalty ?? projectVisitorRecruitLoyalty(visitor.expectedLoyalty ?? 50),
    })),
    activeEvents: extendedSnapshot.activeEvents ?? [],
    contractSite: extendedSnapshot.contractSite ?? null,
    fogOfWar: extendedSnapshot.fogOfWar ?? null,
    scheduler: extendedSnapshot.scheduler,
    policies: normalizePolicyState(extendedSnapshot.policies),
    operatorDispositions: extendedSnapshot.operatorDispositions ?? [],
    notableTies: extendedSnapshot.notableTies ?? [],
    recurringTeams: extendedSnapshot.recurringTeams ?? [],
    roomCultures: extendedSnapshot.roomCultures ?? [],
    inventoryStacks: extendedSnapshot.inventoryStacks ?? [],
    equipmentAssignments: extendedSnapshot.equipmentAssignments ?? [],
  };
}

function parseSequenceNumber(id: string): number {
  const parts = id.split("/");
  const last = parts[parts.length - 1];
  const parsed = Number(last);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nextSequenceFromIds(ids: string[]): number {
  const maxParsed = ids.reduce((max, id) => Math.max(max, parseSequenceNumber(id)), 0);
  return Math.max(maxParsed, ids.length) + 1;
}

function createRuntimeState(
  snapshot: Phase1RuntimeWorldSnapshot,
  options?: { simulationSeed?: number },
): SimRuntimeState {
  const roomIds = snapshot.rooms.map((r) => r.id);
  const operatorIds = (snapshot.operators ?? []).map((o) => o.id);
  const staffIds = (snapshot.staff ?? []).map((s) => s.id);
  const visitorIds = (snapshot.visitors ?? []).map((v) => v.id);
  const eventIds = (snapshot.activeEvents ?? []).map((e) => e.id);
  const opportunityIds = (snapshot.raidOpportunities ?? []).map((o) => o.id);
  const raidIds = [
    ...snapshot.activeRaidPackets.map((p) => p.id),
    ...snapshot.raidSummaries.map((s) => s.id),
  ];

  const teamIds = (snapshot.recurringTeams ?? []).map((t) => t.id);

  return {
    simulationSeed: options?.simulationSeed ?? 0,
    roomEntities: [],
    operatorEntities: [],
    raidOpportunityEntities: [],
    staffEntities: [],
    visitorEntities: [],
    eventEntities: [],
    dispositionEntities: [],
    notableTieEntities: [],
    recurringTeamEntities: [],
    roomCultureEntities: [],
    inventoryEntities: [],
    equipmentEntities: [],
    nextRoomSequence: nextSequenceFromIds(roomIds),
    nextOperatorSequence: nextSequenceFromIds(operatorIds),
    nextOpportunitySequence: nextSequenceFromIds(opportunityIds),
    nextStaffSequence: nextSequenceFromIds(staffIds),
    nextVisitorSequence: nextSequenceFromIds(visitorIds),
    nextRaidSequence: nextSequenceFromIds(raidIds),
    nextEventSequence: nextSequenceFromIds(eventIds),
    nextTeamSequence: nextSequenceFromIds(teamIds),
    pendingCueIds: [],
    pendingEvents: [],
    raidPresentation: {
      contractSiteId: null,
      teams: [],
      enemies: [],
      features: [],
    },
    activeEncounter: restoreEncounterFromSnapshot(snapshot),
    interruptionQueue: restoreInterruptionQueueFromSnapshot(
      snapshot,
    ) as SimRuntimeState["interruptionQueue"],
    incidentState: restoreIncidentStateFromSnapshot(snapshot) as SimRuntimeState["incidentState"],
    guidanceState: restoreGuidanceStateFromSnapshot(snapshot) as SimRuntimeState["guidanceState"],
    kitRegistry: buildKitTemplateRegistry(REGULAR_ATTACKS, SKILLS, ULTIMATES, PASSIVES),
    worldTimeFrozen: false,
  };
}

function restoreEncounterFromSnapshot(
  snapshot: Phase1RuntimeWorldSnapshot,
): BossEncounterInstance | null {
  const raw = (snapshot as Record<string, unknown>).activeEncounter;
  if (!raw || typeof raw !== "object") return null;
  try {
    return lazyRestoreEncounter(raw as BossEncounterSnapshot);
  } catch {
    return null;
  }
}

function restoreInterruptionQueueFromSnapshot(
  snapshot: Phase1RuntimeWorldSnapshot,
): InterruptionQueueState {
  const raw = (snapshot as Record<string, unknown>).interruptionQueue;
  if (!raw || typeof raw !== "object") return lazyCreateInterruptionQueueState();
  try {
    const data = raw as Record<string, unknown>;
    return {
      active: (data.active as InterruptionQueueState["active"]) ?? null,
      queue: Array.isArray(data.queue) ? data.queue : [],
      nextInstanceId: typeof data.nextInstanceId === "number" ? data.nextInstanceId : 1,
    };
  } catch {
    return lazyCreateInterruptionQueueState();
  }
}

function restoreIncidentStateFromSnapshot(snapshot: Phase1RuntimeWorldSnapshot): IncidentState {
  const raw = (snapshot as Record<string, unknown>).incidentState;
  if (!raw || typeof raw !== "object") return lazyCreateIncidentState();
  try {
    const data = raw as Record<string, unknown>;
    return {
      pendingIncident: (data.pendingIncident as IncidentState["pendingIncident"]) ?? null,
      history: Array.isArray(data.history) ? data.history : [],
      cooldowns:
        typeof data.cooldowns === "object" && data.cooldowns
          ? (data.cooldowns as Record<string, number>)
          : {},
      nextInstanceId: typeof data.nextInstanceId === "number" ? data.nextInstanceId : 1,
      lastEvaluationMinute:
        typeof data.lastEvaluationMinute === "number" ? data.lastEvaluationMinute : 0,
    };
  } catch {
    return lazyCreateIncidentState();
  }
}

function restoreGuidanceStateFromSnapshot(snapshot: Phase1RuntimeWorldSnapshot): GuidanceState {
  const raw = (snapshot as unknown as Record<string, unknown>).guidanceState;
  if (!raw || typeof raw !== "object") {
    return lazyCreateGuidanceState();
  }
  try {
    const data = raw as Record<string, unknown>;
    return {
      seenBeatIds: Array.isArray(data.seenBeatIds) ? data.seenBeatIds : [],
      completedBeatIds: Array.isArray(data.completedBeatIds) ? data.completedBeatIds : [],
      dismissedBeatIds: Array.isArray(data.dismissedBeatIds) ? data.dismissedBeatIds : [],
      activeBeatId: typeof data.activeBeatId === "string" ? data.activeBeatId : null,
      activeBeatView:
        data.activeBeatView && typeof data.activeBeatView === "object" ? data.activeBeatView : null,
      queuedBeatIds: Array.isArray(data.queuedBeatIds) ? data.queuedBeatIds : [],
      lastEvaluationMinute:
        typeof data.lastEvaluationMinute === "number" ? data.lastEvaluationMinute : 0,
      openingPathState:
        typeof data.openingPathState === "string" ? data.openingPathState : "completed",
      anchorResolutionFailures: Array.isArray(data.anchorResolutionFailures)
        ? data.anchorResolutionFailures
        : [],
      activeBeatProgressBaseline:
        typeof data.activeBeatProgressBaseline === "number"
          ? data.activeBeatProgressBaseline
          : null,
      interactionCounts:
        data.interactionCounts && typeof data.interactionCounts === "object"
          ? {
              staffingActions:
                typeof (data.interactionCounts as Record<string, unknown>).staffingActions ===
                "number"
                  ? ((data.interactionCounts as Record<string, unknown>).staffingActions as number)
                  : 0,
              upgradesPurchased:
                typeof (data.interactionCounts as Record<string, unknown>).upgradesPurchased ===
                "number"
                  ? ((data.interactionCounts as Record<string, unknown>)
                      .upgradesPurchased as number)
                  : 0,
            }
          : {
              staffingActions: 0,
              upgradesPurchased: 0,
            },
      openingTiming:
        data.openingTiming && typeof data.openingTiming === "object"
          ? {
              firstRaidReturnCompletedAtMinute:
                typeof (data.openingTiming as Record<string, unknown>)
                  .firstRaidReturnCompletedAtMinute === "number"
                  ? ((data.openingTiming as Record<string, unknown>)
                      .firstRaidReturnCompletedAtMinute as number)
                  : null,
              firstIncidentSeededAtMinute:
                typeof (data.openingTiming as Record<string, unknown>)
                  .firstIncidentSeededAtMinute === "number"
                  ? ((data.openingTiming as Record<string, unknown>)
                      .firstIncidentSeededAtMinute as number)
                  : null,
              securedContractCount:
                typeof (data.openingTiming as Record<string, unknown>).securedContractCount ===
                "number"
                  ? ((data.openingTiming as Record<string, unknown>).securedContractCount as number)
                  : 0,
              lastTrackedContractSiteId:
                typeof (data.openingTiming as Record<string, unknown>).lastTrackedContractSiteId ===
                "string"
                  ? ((data.openingTiming as Record<string, unknown>)
                      .lastTrackedContractSiteId as string)
                  : null,
            }
          : {
              firstRaidReturnCompletedAtMinute: null,
              firstIncidentSeededAtMinute: null,
              securedContractCount: 0,
              lastTrackedContractSiteId: null,
            },
    };
  } catch {
    return lazyCreateGuidanceState();
  }
}

function getActiveBuildingTemplate(context: {
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
}) {
  const template =
    context.registry.buildings[
      BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]
    ];
  if (!template) {
    throw new Error("Runtime references an unknown active building template index.");
  }

  return template;
}

function getRoomTemplateForRuntimeEntity(
  registry: TemplateRegistry,
  entity: number,
): TemplateRegistry["rooms"][number] {
  const template = registry.rooms[RoomInstance.templateIndex[entity]];
  if (!template) {
    throw new Error(
      `Runtime references an unknown room template index for room "${RoomInstance.id[entity]}".`,
    );
  }

  return template;
}

function getCurrentAbsoluteMinuteFromSnapshot(snapshot: Phase1RuntimeWorldSnapshot): number {
  return (snapshot.time.day - 1) * 1440 + snapshot.time.minuteOfDay;
}

function getDominantNeed(snapshot: Phase1OperatorSnapshot): string {
  const ranked = [
    {
      id: "recovery",
      value: snapshot.injury.recoveryHoursRemaining * 2 + snapshot.injury.severity,
    },
    { id: "fatigue", value: snapshot.needs.fatigue },
    { id: "stress", value: snapshot.needs.stress },
    { id: "hunger", value: snapshot.needs.hunger },
  ].sort((left, right) => right.value - left.value || left.id.localeCompare(right.id));

  return ranked[0]?.id ?? "idle";
}

function getIntentLabel(currentBlock: string): string {
  switch (currentBlock) {
    case "raid":
      return "deployed";
    case "recovery":
      return "recovering";
    case "social":
      return "socializing";
    case "training":
      return "training";
    case "work":
      return "working";
    case "rest":
      return "resting";
    default:
      return "idle";
  }
}

function getAvailabilityWithoutOpportunity(snapshot: Phase1OperatorSnapshot) {
  const schedulePressure = computeSchedulePressure(snapshot.schedule.currentBlock || "idle");
  const clampValue = (value: number) => Math.max(0, Math.min(100, value));
  const availabilityScore = clampValue(
    100 -
      snapshot.injury.severity * 0.75 -
      snapshot.needs.fatigue * 0.32 -
      snapshot.needs.stress * 0.18 -
      snapshot.needs.hunger * 0.08 -
      schedulePressure * 0.1 +
      snapshot.loyalty.current * 0.08,
  );

  return {
    schedulePressure,
    availabilityScore,
    willingnessScore: clampValue(
      availabilityScore * 0.6 + snapshot.morale.current * 0.26 + snapshot.loyalty.current * 0.18,
    ),
  };
}

const RECENT_DEATH_WINDOW_MINUTES = 1440;

function computeRosterPressure(
  snapshot: Phase1RuntimeWorldSnapshot,
  operatorIntentReadiness: Phase1OperatorIntentReadinessView[],
  operatorCapacity: number,
  currentAbsoluteMinute: number,
): Phase1RosterPressureView {
  const allOperators = snapshot.operators ?? [];
  const activeOperators = allOperators.filter((op) => op.lifecycle.status === "active");
  const livingOperatorCount = activeOperators.length;
  const vacancyCount = Math.max(0, operatorCapacity - livingOperatorCount);

  const unavailableOperatorIds = operatorIntentReadiness
    .filter((entry) => !entry.availableForRaid)
    .map((entry) => entry.operatorId);

  const recentDeathOperatorIds = allOperators
    .filter(
      (op) =>
        op.lifecycle.status === "dead" &&
        op.lifecycle.deathTick !== undefined &&
        currentAbsoluteMinute - op.lifecycle.deathTick < RECENT_DEATH_WINDOW_MINUTES,
    )
    .map((op) => op.id);
  const recentDepartureCount = allOperators.filter(
    (op) =>
      op.lifecycle.status === "departed" &&
      op.lifecycle.departureTick !== undefined &&
      currentAbsoluteMinute - op.lifecycle.departureTick < RECENT_DEATH_WINDOW_MINUTES,
  ).length;

  const vacancyRatio = operatorCapacity > 0 ? vacancyCount / operatorCapacity : 0;
  const recentLossWeight = (recentDeathOperatorIds.length + recentDepartureCount) * 0.15;
  const unavailableWeight =
    livingOperatorCount > 0 ? (unavailableOperatorIds.length / livingOperatorCount) * 0.3 : 0;
  const pressureScore = vacancyRatio + recentLossWeight + unavailableWeight;

  const replacementPressureLevel: Phase1RosterPressureView["replacementPressureLevel"] =
    pressureScore >= 0.5 ? "critical" : pressureScore >= 0.25 ? "strained" : "stable";

  return {
    operatorCapacity,
    livingOperatorCount,
    vacancyCount,
    deferredVisitorCapacity: BODEGA_DEFERRED_VISITOR_CAPACITY,
    unavailableOperatorIds,
    recentDeathOperatorIds,
    replacementPressureLevel,
  };
}

function applyWorldSnapshot(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
  options?: { simulationSeed?: number },
): AscensionSimulation {
  const runtimeSnapshot = toRuntimeSnapshot(snapshot);
  const world = createWorld();
  const runtimeState = createRuntimeState(runtimeSnapshot, options);
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);
  const currentAbsoluteMinute = getCurrentAbsoluteMinuteFromSnapshot(runtimeSnapshot);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  const assertKnownMissionId = (missionId: string, label: string) => {
    if (!registry.missionById.has(missionId)) {
      throw new Error(`Runtime snapshot references unknown mission "${missionId}" for ${label}.`);
    }
  };

  GuildState.reputation[guildEntity] = runtimeSnapshot.guild.reputation;
  GuildState.treasury[guildEntity] = runtimeSnapshot.guild.treasury;
  GuildState.intel[guildEntity] = runtimeSnapshot.guild.intel;

  WorldTimeState.tick[timeEntity] = runtimeSnapshot.time.tick;
  WorldTimeState.day[timeEntity] = runtimeSnapshot.time.day;
  WorldTimeState.minuteOfDay[timeEntity] = runtimeSnapshot.time.minuteOfDay;

  const buildingTemplateIndex = registry.buildingIndexById.get(
    runtimeSnapshot.building.activeBuildingId,
  );
  if (buildingTemplateIndex === undefined) {
    throw new Error(
      `Runtime snapshot references unknown building "${runtimeSnapshot.building.activeBuildingId}".`,
    );
  }
  runtimeSnapshot.activeRaidPackets.forEach((packet) => {
    assertKnownMissionId(packet.missionId, `active raid "${packet.id}"`);
  });
  runtimeSnapshot.raidSummaries.forEach((summary) => {
    assertKnownMissionId(summary.missionId, `raid summary "${summary.id}"`);
  });
  runtimeSnapshot.raidOpportunities?.forEach((opportunity) => {
    assertKnownMissionId(opportunity.missionId, `raid opportunity "${opportunity.id}"`);
  });
  if (runtimeSnapshot.contractSite) {
    assertKnownMissionId(
      runtimeSnapshot.contractSite.missionId,
      `contract site "${runtimeSnapshot.contractSite.contractSiteId}"`,
    );
  }
  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] = buildingTemplateIndex;
  BuildingAuthority.activeBuildingTier[buildingEntity] =
    runtimeSnapshot.building.activeBuildingTier;
  BuildingAuthority.activeFloorIndex[buildingEntity] = runtimeSnapshot.building.activeFloorIndex;
  BuildingAuthority.roomSlotCount[buildingEntity] = runtimeSnapshot.building.roomSlotCount;
  BuildingAuthority.operatorSlotCount[buildingEntity] = runtimeSnapshot.building.operatorSlotCount;
  BuildingAuthority.appliedUpgradeIds[buildingEntity] = [...runtimeSnapshot.appliedUpgradeIds];
  BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] = [];
  BuildingAuthority.unlockedRoomTierByTemplateId[buildingEntity] = {};
  BuildingAuthority.roomCapacityModifiers[buildingEntity] = {};
  BuildingAuthority.needRateMultipliers[buildingEntity] = {};
  BuildingAuthority.attractionWeightByTag[buildingEntity] = {};
  BuildingAuthority.recoveryRateModifier[buildingEntity] = 0;
  BuildingAuthority.trainingRateModifier[buildingEntity] = 0;
  BuildingAuthority.moraleModifier[buildingEntity] = 0;
  BuildingAuthority.loyaltyModifier[buildingEntity] = 0;
  BuildingAuthority.resourceIncomeModifiers[buildingEntity] = {};
  BuildingAuthority.resourceCostMultipliers[buildingEntity] = {};
  BuildingAuthority.activeRaidPackets[buildingEntity] = runtimeSnapshot.activeRaidPackets.map(
    (packet) => ({
      ...packet,
    }),
  );
  BuildingAuthority.raidSummaries[buildingEntity] = runtimeSnapshot.raidSummaries.map(
    (summary) => ({
      ...summary,
    }),
  );
  BuildingAuthority.pressure[buildingEntity] = 0;
  BuildingAuthority.lastPayrollDay[buildingEntity] =
    runtimeSnapshot.scheduler?.lastPayrollDay ?? runtimeSnapshot.time.day;
  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] =
    runtimeSnapshot.scheduler?.lastVisitorSpawnTick ?? currentAbsoluteMinute;
  BuildingAuthority.lastEventTick[buildingEntity] = runtimeSnapshot.scheduler?.lastEventTick ?? 0;
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] =
    runtimeSnapshot.scheduler?.lastRaidOpportunityTick ??
    Math.max(
      0,
      (runtimeSnapshot.raidOpportunities ?? []).reduce((latest, opportunity) => {
        return Math.max(latest, opportunity.createdTick ?? 0);
      }, currentAbsoluteMinute - 150),
    );
  BuildingAuthority.contractSite[buildingEntity] = runtimeSnapshot.contractSite
    ? {
        ...runtimeSnapshot.contractSite,
        siteConceptId: runtimeSnapshot.contractSite.siteConceptId ?? "",
        rank: (runtimeSnapshot.contractSite.rank as ContractRank) ?? "f",
        explorationProgress: runtimeSnapshot.contractSite.explorationProgress ?? 0,
        bossIntelProgress: runtimeSnapshot.contractSite.bossIntelProgress ?? 0,
        bossPressureProgress: runtimeSnapshot.contractSite.bossPressureProgress ?? 0,
        bossAvailable: runtimeSnapshot.contractSite.bossAvailable ?? false,
      }
    : null;

  // Hydrate contract lifecycle state
  BuildingAuthority.contractLifecycle[buildingEntity] =
    runtimeSnapshot.contractLifecycle ??
    (runtimeSnapshot.contractSite &&
    !runtimeSnapshot.contractSite.bossDefeated &&
    !runtimeSnapshot.contractSite.contractLost
      ? "active"
      : runtimeSnapshot.contractSite
        ? "resolved"
        : "bidding");
  BuildingAuthority.postedContracts[buildingEntity] = (runtimeSnapshot.postedContracts ?? []).map(
    (p) => ({
      ...p,
      rank: p.rank as ContractRank,
      knownTraits: p.knownTraits ?? [],
      hiddenTraitCount: p.hiddenTraitCount ?? 0,
      enemyHints: p.enemyHints ?? [],
      lootFamilyHints: p.lootFamilyHints ?? [],
      bossHint: p.bossHint ?? null,
      neighborhoodLabel: p.neighborhoodLabel ?? "",
    }),
  );
  BuildingAuthority.contractResult[buildingEntity] = runtimeSnapshot.contractResult
    ? {
        ...runtimeSnapshot.contractResult,
        rank: runtimeSnapshot.contractResult.rank as ContractRank,
        outcome: runtimeSnapshot.contractResult.outcome as "boss_defeated" | "contract_lost",
      }
    : null;

  BuildingAuthority.fogOfWar[buildingEntity] = runtimeSnapshot.fogOfWar
    ? {
        ...runtimeSnapshot.fogOfWar,
        revealed: [...runtimeSnapshot.fogOfWar.revealed],
      }
    : null;
  BuildingAuthority.policies[buildingEntity] = {
    ...normalizePolicyState(runtimeSnapshot.policies ?? DEFAULT_POLICY_STATE),
  };

  runtimeSnapshot.rooms.forEach((room, index) => {
    const entity = addEntity(world);
    const templateIndex = registry.roomIndexById.get(room.templateId);
    if (templateIndex === undefined) {
      throw new Error(`Runtime snapshot references unknown room "${room.templateId}".`);
    }
    const template = registry.rooms[templateIndex];
    if (!template) {
      throw new Error(`Runtime snapshot references unknown room template index for "${room.id}".`);
    }
    const requiredStaffTag = getStaffRoleTag(template.tags);
    const isRequestedActive = (room.isActive ?? room.occupancy > 0) ? 1 : 0;

    addComponent(world, entity, RoomInstance);
    addComponent(world, entity, Renderable);

    RoomInstance.id[entity] = room.id;
    RoomInstance.templateIndex[entity] = templateIndex;
    RoomInstance.tier[entity] = room.tier;
    RoomInstance.floorIndex[entity] = room.floorIndex;
    RoomInstance.slotId[entity] = room.slotId;
    RoomInstance.roomStateId[entity] = room.roomStateId;
    RoomInstance.capacity[entity] = room.capacity;
    RoomInstance.occupancy[entity] = room.occupancy;
    RoomInstance.isRequestedActive[entity] = isRequestedActive;
    RoomInstance.isOperational[entity] =
      isRequestedActive === 1 && (requiredStaffTag !== "" ? room.occupancy >= 1 : true) ? 1 : 0;
    RoomInstance.assignedStaffCount[entity] = room.occupancy;
    RoomInstance.appliedUpgradeIds[entity] = [...(room.appliedUpgradeIds ?? [])];
    RoomInstance.slotIndex[entity] = index;
    RoomInstance.reservedCol[entity] = room.reservedFootprint.col;
    RoomInstance.reservedRow[entity] = room.reservedFootprint.row;
    RoomInstance.reservedCols[entity] = room.reservedFootprint.cols;
    RoomInstance.reservedRows[entity] = room.reservedFootprint.rows;

    Renderable.col[entity] = room.activeFootprint.col;
    Renderable.row[entity] = room.activeFootprint.row;
    Renderable.cols[entity] = room.activeFootprint.cols;
    Renderable.rows[entity] = room.activeFootprint.rows;
    Renderable.layer[entity] = 1;

    runtimeState.roomEntities.push(entity);
  });

  runtimeSnapshot.operators?.forEach((operator) => {
    const entity = addEntity(world);

    addComponent(world, entity, OperatorIdentity);
    addComponent(world, entity, PreferenceState);
    addComponent(world, entity, NeedState);
    addComponent(world, entity, MoraleState);
    addComponent(world, entity, LoyaltyState);
    addComponent(world, entity, ScheduleState);
    addComponent(world, entity, AssignmentState);
    addComponent(world, entity, RaidParticipationState);
    addComponent(world, entity, InjuryState);

    OperatorIdentity.id[entity] = operator.id;
    OperatorIdentity.name[entity] = operator.identity.name;
    OperatorIdentity.roleTag[entity] = operator.identity.roleTag;
    OperatorIdentity.specialtyTag[entity] = operator.identity.specialtyTag;
    OperatorIdentity.appearancePresetId[entity] = operator.appearance.presetId;
    OperatorIdentity.appearanceWeaponPartId[entity] =
      operator.appearance.visibleGear?.weaponPartId ?? "";
    OperatorIdentity.appearanceOutfitOverlayPartId[entity] =
      operator.appearance.visibleGear?.outfitOverlayPartId ?? "";
    OperatorIdentity.appearanceAccessoryPartId[entity] =
      operator.appearance.visibleGear?.accessoryPartId ?? "";
    OperatorIdentity.lifecycleStatus[entity] = operator.lifecycle.status;
    OperatorIdentity.deathTick[entity] = operator.lifecycle.deathTick ?? 0;
    OperatorIdentity.deathRaidSummaryId[entity] = operator.lifecycle.deathRaidSummaryId ?? "";
    OperatorIdentity.departureTick[entity] = operator.lifecycle.departureTick ?? 0;
    OperatorIdentity.departureReason[entity] = operator.lifecycle.departureReason ?? "";
    OperatorIdentity.rank[entity] = operator.combat.rank;
    OperatorIdentity.attunementTag[entity] = operator.combat.attunementTag;
    OperatorIdentity.traits[entity] = [...operator.combat.traits];
    OperatorIdentity.regularAttackId[entity] = operator.combat.kit.regularAttackId;
    OperatorIdentity.skillId[entity] = operator.combat.kit.skillId;
    OperatorIdentity.ultimateId[entity] = operator.combat.kit.ultimateId;
    OperatorIdentity.passiveIds[entity] = [...operator.combat.kit.passiveIds];
    OperatorIdentity.baseStrength[entity] = operator.combat.baseStats.strength;
    OperatorIdentity.baseSpeed[entity] = operator.combat.baseStats.speed;
    OperatorIdentity.baseEndurance[entity] = operator.combat.baseStats.endurance;
    OperatorIdentity.baseResilience[entity] = operator.combat.baseStats.resilience;
    OperatorIdentity.basePerception[entity] = operator.combat.baseStats.perception;
    OperatorIdentity.baseIntelligence[entity] = operator.combat.baseStats.intelligence;
    PreferenceState.riskTolerance[entity] = operator.preferences.riskTolerance;
    PreferenceState.rewardFocus[entity] = operator.preferences.rewardFocus;
    PreferenceState.recoveryBias[entity] = operator.preferences.recoveryBias;
    PreferenceState.socialBias[entity] = operator.preferences.socialBias;
    PreferenceState.trainingBias[entity] = operator.preferences.trainingBias;
    PreferenceState.comfortBias[entity] = operator.preferences.comfortBias;
    PreferenceState.preferredMissionTags[entity] = [...operator.preferences.preferredMissionTags];
    PreferenceState.preferredPartnerIds[entity] = [...operator.preferences.preferredPartnerIds];
    NeedState.hunger[entity] = operator.needs.hunger;
    NeedState.fatigue[entity] = operator.needs.fatigue;
    NeedState.stress[entity] = operator.needs.stress;
    MoraleState.current[entity] = operator.morale.current;
    MoraleState.baseline[entity] = operator.morale.baseline;
    LoyaltyState.current[entity] = operator.loyalty.current;
    LoyaltyState.baseline[entity] = operator.loyalty.baseline;
    ScheduleState.currentBlock[entity] = operator.schedule.currentBlock;
    ScheduleState.workStartMinute[entity] = operator.schedule.workStartMinute;
    ScheduleState.workEndMinute[entity] = operator.schedule.workEndMinute;
    AssignmentState.kind[entity] = operator.assignment.kind;
    AssignmentState.targetId[entity] = operator.assignment.targetId;
    const assignedRaidPacket =
      operator.assignment.kind === "raid"
        ? runtimeSnapshot.activeRaidPackets.find(
            (packet) => packet.id === operator.assignment.targetId,
          )
        : undefined;
    if (operator.assignment.kind === "raid" && !assignedRaidPacket) {
      throw new Error(
        `Runtime snapshot operator "${operator.id}" is assigned to unknown raid "${operator.assignment.targetId}".`,
      );
    }
    RaidParticipationState.activeRaidId[entity] = assignedRaidPacket?.id ?? "";
    RaidParticipationState.missionId[entity] = assignedRaidPacket?.missionId ?? "";
    RaidParticipationState.returnTick[entity] = assignedRaidPacket?.returnTick ?? 0;
    InjuryState.severity[entity] = operator.injury.severity;
    InjuryState.recoveryHoursRemaining[entity] = operator.injury.recoveryHoursRemaining;
    InjuryState.treated[entity] = operator.injury.treated ? 1 : 0;

    runtimeState.operatorEntities.push(entity);
  });

  runtimeSnapshot.staff?.forEach((staff) => {
    const entity = addEntity(world);

    addComponent(world, entity, StaffState);
    addComponent(world, entity, MoraleState);
    addComponent(world, entity, LoyaltyState);
    addComponent(world, entity, ScheduleState);
    addComponent(world, entity, AssignmentState);
    addComponent(world, entity, NeedState);
    addComponent(world, entity, InjuryState);

    StaffState.id[entity] = staff.id;
    StaffState.name[entity] = staff.name;
    if (!isCanonicalStaffRoleTag(staff.roleTag)) {
      throw new Error(`Runtime snapshot staff "${staff.id}" has unknown role "${staff.roleTag}".`);
    }
    StaffState.roleTag[entity] = staff.roleTag;
    StaffState.status[entity] = staff.status;
    StaffState.wage[entity] = staff.wage;
    MoraleState.current[entity] = staff.morale.current;
    MoraleState.baseline[entity] = staff.morale.baseline;
    LoyaltyState.current[entity] = staff.loyalty.current;
    LoyaltyState.baseline[entity] = staff.loyalty.baseline;
    ScheduleState.currentBlock[entity] = staff.schedule.currentBlock;
    ScheduleState.workStartMinute[entity] = staff.schedule.workStartMinute;
    ScheduleState.workEndMinute[entity] = staff.schedule.workEndMinute;
    AssignmentState.kind[entity] = staff.assignment.kind;
    AssignmentState.targetId[entity] = staff.assignment.targetId;
    NeedState.hunger[entity] = staff.needs.hunger;
    NeedState.fatigue[entity] = staff.needs.fatigue;
    NeedState.stress[entity] = staff.needs.stress;
    InjuryState.severity[entity] = staff.injury.severity;
    InjuryState.recoveryHoursRemaining[entity] = staff.injury.recoveryHoursRemaining;
    InjuryState.treated[entity] = staff.injury.treated ? 1 : 0;

    runtimeState.staffEntities.push(entity);
  });

  runtimeSnapshot.visitors?.forEach((visitor) => {
    const entity = addEntity(world);

    addComponent(world, entity, VisitorState);
    VisitorState.id[entity] = visitor.id;
    VisitorState.name[entity] = visitor.name;
    VisitorState.desiredRoleTag[entity] = visitor.desiredRoleTag;
    VisitorState.patience[entity] = visitor.patience;
    VisitorState.quality[entity] = visitor.quality;
    VisitorState.expectedLoyalty[entity] = visitor.expectedLoyalty;
    VisitorState.queueState[entity] = visitor.queueState;

    runtimeState.visitorEntities.push(entity);
  });

  runtimeSnapshot.raidOpportunities?.forEach((opportunity) => {
    const entity = addEntity(world);

    addComponent(world, entity, RaidOpportunityState);
    RaidOpportunityState.id[entity] = opportunity.id;
    RaidOpportunityState.missionId[entity] = opportunity.missionId;
    RaidOpportunityState.location[entity] = opportunity.location;
    RaidOpportunityState.threat[entity] = opportunity.threat;
    RaidOpportunityState.intel[entity] = opportunity.intel;
    RaidOpportunityState.reward[entity] = opportunity.reward;
    RaidOpportunityState.risk[entity] = opportunity.risk;
    RaidOpportunityState.status[entity] = opportunity.status;
    RaidOpportunityState.interestedOperatorIds[entity] = [...opportunity.interestedOperatorIds];
    RaidOpportunityState.claimedOperatorIds[entity] = [...opportunity.claimedOperatorIds];
    RaidOpportunityState.createdTick[entity] = opportunity.createdTick;
    RaidOpportunityState.expiresAtTick[entity] = opportunity.expiresAtTick;

    runtimeState.raidOpportunityEntities.push(entity);
  });

  runtimeSnapshot.activeEvents?.forEach((event) => {
    const entity = addEntity(world);
    const templateIndex = registry.events.findIndex((template) => template.id === event.templateId);
    if (templateIndex < 0) {
      throw new Error(`Runtime snapshot references unknown event template "${event.templateId}".`);
    }

    addComponent(world, entity, EventState);
    EventState.id[entity] = event.id;
    EventState.templateIndex[entity] = templateIndex;
    EventState.severity[entity] = event.severity;
    EventState.remainingHours[entity] = event.remainingHours;
    EventState.pressureContribution[entity] = event.pressureContribution;

    runtimeState.eventEntities.push(entity);
  });

  (runtimeSnapshot.operatorDispositions ?? []).forEach((disposition) => {
    const entity = addEntity(world);
    addComponent(world, entity, OperatorDisposition);
    OperatorDisposition.operatorId[entity] = disposition.operatorId;
    OperatorDisposition.sociability[entity] = disposition.sociability;
    OperatorDisposition.temperament[entity] = disposition.temperament;
    OperatorDisposition.grievanceLevel[entity] = disposition.grievanceLevel;
    OperatorDisposition.satisfactionLevel[entity] = disposition.satisfactionLevel;
    runtimeState.dispositionEntities.push(entity);
  });

  (runtimeSnapshot.notableTies ?? []).forEach((tie) => {
    const entity = addEntity(world);
    addComponent(world, entity, NotableTie);
    NotableTie.operatorAId[entity] = tie.operatorAId;
    NotableTie.operatorBId[entity] = tie.operatorBId;
    NotableTie.stance[entity] = tie.stance;
    NotableTie.strength[entity] = tie.strength;
    runtimeState.notableTieEntities.push(entity);
  });

  (runtimeSnapshot.recurringTeams ?? []).forEach((team) => {
    const entity = addEntity(world);
    addComponent(world, entity, RecurringTeam);
    RecurringTeam.id[entity] = team.id;
    RecurringTeam.memberIds[entity] = [...team.memberIds];
    RecurringTeam.cohesion[entity] = team.cohesion;
    RecurringTeam.raidCount[entity] = team.raidCount;
    RecurringTeam.lastRaidTick[entity] = team.lastRaidTick;
    RecurringTeam.damaged[entity] = team.damaged ? 1 : 0;
    RecurringTeam.damageReason[entity] = team.damageReason;
    runtimeState.recurringTeamEntities.push(entity);
  });

  (runtimeSnapshot.roomCultures ?? []).forEach((culture) => {
    const entity = addEntity(world);
    addComponent(world, entity, RoomCulture);
    RoomCulture.roomInstanceId[entity] = culture.roomInstanceId;
    RoomCulture.comfort[entity] = culture.comfort;
    RoomCulture.tension[entity] = culture.tension;
    RoomCulture.camaraderie[entity] = culture.camaraderie;
    RoomCulture.tone[entity] = culture.tone;
    runtimeState.roomCultureEntities.push(entity);
  });

  (runtimeSnapshot.inventoryStacks ?? []).forEach((stack) => {
    const entity = addEntity(world);
    addComponent(world, entity, InventoryStack);
    InventoryStack.itemId[entity] = stack.itemId;
    InventoryStack.quantity[entity] = stack.quantity;
    runtimeState.inventoryEntities.push(entity);
  });

  (runtimeSnapshot.equipmentAssignments ?? []).forEach((assignment) => {
    const entity = addEntity(world);
    addComponent(world, entity, EquipmentAssignment);
    EquipmentAssignment.operatorId[entity] = assignment.operatorId;
    EquipmentAssignment.weaponId[entity] = assignment.weaponId;
    EquipmentAssignment.outfitOverlayId[entity] = assignment.outfitOverlayId;
    EquipmentAssignment.accessoryId[entity] = assignment.accessoryId;
    runtimeState.equipmentEntities.push(entity);
  });

  ensureDispositionDefaults({
    world,
    registry,
    singletonEntities: {
      guild: guildEntity,
      time: timeEntity,
      building: buildingEntity,
    },
    runtimeState,
  });
  ensurePhase2StateEntities({
    world,
    registry,
    singletonEntities: {
      guild: guildEntity,
      time: timeEntity,
      building: buildingEntity,
    },
    runtimeState,
  });
  importLegacyRelationshipsIntoSocialState(
    {
      world,
      registry,
      singletonEntities: {
        guild: guildEntity,
        time: timeEntity,
        building: buildingEntity,
      },
      runtimeState,
    },
    runtimeSnapshot.operatorRelationships ?? [],
  );

  const singletonEntities: SimSingletonEntities = {
    guild: guildEntity,
    time: timeEntity,
    building: buildingEntity,
  };
  const context = {
    world,
    registry,
    singletonEntities,
    runtimeState,
  };

  syncOpeningContractTracking(
    runtimeState.guidanceState,
    BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding",
    BuildingAuthority.contractSite[buildingEntity]?.contractSiteId,
  );

  runSimSystemSchedule(context, 0);

  function buildRoomCultureSignals(entity: number): string[] {
    const signals: string[] = [];
    if (RoomCulture.comfort[entity] >= 65) {
      signals.push("comfortable");
    } else if (RoomCulture.comfort[entity] <= 35) {
      signals.push("worn thin");
    }
    if (RoomCulture.tension[entity] >= 60) {
      signals.push("frayed");
    } else if (RoomCulture.tension[entity] <= 35) {
      signals.push("steady");
    }
    if (RoomCulture.camaraderie[entity] >= 60) {
      signals.push("tight-knit");
    } else if (RoomCulture.camaraderie[entity] <= 35) {
      signals.push("distant");
    }
    return signals;
  }

  function buildRoomCultureSummary(entity: number): string {
    const signals = buildRoomCultureSignals(entity);
    if (signals.length === 0) {
      return RoomCulture.tone[entity] || "neutral";
    }
    return signals.join(", ");
  }

  function buildTeamExplanation(entity: number): Phase2AutonomyFactor[] {
    const cohesion = RecurringTeam.cohesion[entity];
    const raidCount = RecurringTeam.raidCount[entity];
    const explanations: Phase2AutonomyFactor[] = [
      {
        factor: "cohesion",
        contribution: cohesion - 50,
        description: `Cohesion at ${Math.round(cohesion)} anchors this team`,
      },
      {
        factor: "history",
        contribution: Math.min(raidCount * 4, 20),
        description: `${raidCount} shared raids reinforce recurring-team memory`,
      },
    ];

    if (RecurringTeam.damaged[entity] === 1) {
      explanations.push({
        factor: "damage",
        contribution: -18,
        description: `Damaged state from ${RecurringTeam.damageReason[entity] || "recent losses"} is suppressing trust`,
      });
    }

    return explanations;
  }

  function buildTeamStatusSummary(entity: number): string {
    if (RecurringTeam.damaged[entity] === 1) {
      return `Shaken after ${RecurringTeam.damageReason[entity] || "recent losses"}`;
    }
    if (RecurringTeam.raidCount[entity] >= 4 && RecurringTeam.cohesion[entity] >= 65) {
      return "Battle-tested and stable";
    }
    if (RecurringTeam.raidCount[entity] >= 2) {
      return "Holding together through repeated raids";
    }
    return "Newly emerging raid unit";
  }

  let phase2ViewCache: Phase2View | null = null;

  const simulation: AscensionSimulation = {
    registry,
    singletonEntities,
    runtimeState,
    roomEntities: runtimeState.roomEntities,
    schedule: simSystemSchedule,
    stableCommandTypes: STABLE_SIM_COMMAND_TYPES,
    dispatch(command) {
      phase2ViewCache = null;
      if (command.type === "sim/tick") {
        runSimSystemSchedule(context, command.deltaMs);
        return;
      }

      runSimCommand(context, command);
      runSimSystemSchedule(context, 0);
    },
    getWorldSnapshot() {
      const buildingTemplate = getActiveBuildingTemplate(context);
      const activeRaidPackets = (BuildingAuthority.activeRaidPackets[buildingEntity] ?? []).map(
        (packet) => ({
          ...packet,
        }),
      );
      const raidSummaries = (BuildingAuthority.raidSummaries[buildingEntity] ?? []).map(
        (summary) => ({
          ...summary,
        }),
      );
      const recruitmentGate = getRecruitmentGateState(context);
      const operatorCapacity = BuildingAuthority.operatorSlotCount[buildingEntity];
      const livingOperatorCount = runtimeState.operatorEntities.filter(
        (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
      ).length;
      const replaceableOperatorCount = runtimeState.operatorEntities.filter((entity) => {
        return (
          OperatorIdentity.lifecycleStatus[entity] === "active" &&
          AssignmentState.kind[entity] !== "raid"
        );
      }).length;
      const deferredVisitorCount = runtimeState.visitorEntities.filter(
        (entity) => getVisitorQueueState(entity) === "deferred",
      ).length;

      return {
        guild: {
          reputation: GuildState.reputation[guildEntity],
          treasury: GuildState.treasury[guildEntity],
          intel: GuildState.intel[guildEntity],
        },
        time: {
          tick: WorldTimeState.tick[timeEntity],
          day: WorldTimeState.day[timeEntity],
          minuteOfDay: WorldTimeState.minuteOfDay[timeEntity],
        },
        building: {
          activeBuildingId: buildingTemplate.id,
          activeBuildingTier: BuildingAuthority.activeBuildingTier[buildingEntity],
          activeFloorIndex: BuildingAuthority.activeFloorIndex[buildingEntity] ?? 0,
          roomSlotCount: BuildingAuthority.roomSlotCount[buildingEntity],
          operatorSlotCount: BuildingAuthority.operatorSlotCount[buildingEntity],
        },
        rooms: runtimeState.roomEntities.map((entity) => {
          const template = getRoomTemplateForRuntimeEntity(registry, entity);

          return {
            id: RoomInstance.id[entity],
            templateId: template.id,
            tier: RoomInstance.tier[entity],
            floorIndex: RoomInstance.floorIndex[entity] ?? 0,
            slotId: RoomInstance.slotId[entity],
            roomStateId:
              RoomInstance.roomStateId[entity] ||
              getRoomStateId(template.id, RoomInstance.appliedUpgradeIds[entity] ?? []),
            capacity: RoomInstance.capacity[entity],
            occupancy: RoomInstance.occupancy[entity],
            isActive: RoomInstance.isRequestedActive[entity] === 1,
            appliedUpgradeIds: [...(RoomInstance.appliedUpgradeIds[entity] ?? [])],
            reservedFootprint: {
              col: RoomInstance.reservedCol[entity],
              row: RoomInstance.reservedRow[entity],
              cols: RoomInstance.reservedCols[entity],
              rows: RoomInstance.reservedRows[entity],
            },
            activeFootprint: {
              col: Renderable.col[entity],
              row: Renderable.row[entity],
              cols: Renderable.cols[entity],
              rows: Renderable.rows[entity],
            },
          };
        }),
        activeRaidPackets,
        raidSummaries,
        appliedUpgradeIds: [...(BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? [])],
        policies: {
          ...(BuildingAuthority.policies[buildingEntity] ?? DEFAULT_POLICY_STATE),
        },
        operators: runtimeState.operatorEntities.map((entity) => ({
          id: OperatorIdentity.id[entity],
          identity: {
            name: OperatorIdentity.name[entity],
            roleTag: OperatorIdentity.roleTag[entity],
            specialtyTag: OperatorIdentity.specialtyTag[entity],
          },
          preferences: {
            riskTolerance: PreferenceState.riskTolerance[entity],
            rewardFocus: PreferenceState.rewardFocus[entity],
            recoveryBias: PreferenceState.recoveryBias[entity],
            socialBias: PreferenceState.socialBias[entity],
            trainingBias: PreferenceState.trainingBias[entity],
            comfortBias: PreferenceState.comfortBias[entity],
            preferredMissionTags: [...(PreferenceState.preferredMissionTags[entity] ?? [])],
            preferredPartnerIds: [...(PreferenceState.preferredPartnerIds[entity] ?? [])],
          },
          schedule: {
            currentBlock: ScheduleState.currentBlock[entity],
            workStartMinute: ScheduleState.workStartMinute[entity],
            workEndMinute: ScheduleState.workEndMinute[entity],
          },
          needs: {
            hunger: NeedState.hunger[entity],
            fatigue: NeedState.fatigue[entity],
            stress: NeedState.stress[entity],
          },
          morale: {
            current: MoraleState.current[entity],
            baseline: MoraleState.baseline[entity],
          },
          loyalty: {
            current: LoyaltyState.current[entity],
            baseline: LoyaltyState.baseline[entity],
          },
          injury: {
            severity: InjuryState.severity[entity],
            recoveryHoursRemaining: InjuryState.recoveryHoursRemaining[entity],
            treated: InjuryState.treated[entity] === 1,
          },
          assignment: {
            kind: AssignmentState.kind[entity],
            targetId: AssignmentState.targetId[entity],
          },
          appearance: buildOperatorAppearanceSnapshot({
            presetId: OperatorIdentity.appearancePresetId[entity],
            weaponPartId: OperatorIdentity.appearanceWeaponPartId[entity],
            outfitOverlayPartId: OperatorIdentity.appearanceOutfitOverlayPartId[entity],
            accessoryPartId: OperatorIdentity.appearanceAccessoryPartId[entity],
          }),
          lifecycle: buildLifecycleSnapshot(entity),
          combat: buildCombatSnapshot(entity),
        })),
        operatorRelationships: deriveCompatibilityRelationships(context).map((relationship) => ({
          ...relationship,
        })),
        staff: runtimeState.staffEntities.map((entity) => ({
          id: StaffState.id[entity],
          name: StaffState.name[entity],
          roleTag: StaffState.roleTag[entity],
          status: StaffState.status[entity],
          wage: StaffState.wage[entity],
          schedule: {
            currentBlock: ScheduleState.currentBlock[entity],
            workStartMinute: ScheduleState.workStartMinute[entity],
            workEndMinute: ScheduleState.workEndMinute[entity],
          },
          needs: {
            hunger: NeedState.hunger[entity],
            fatigue: NeedState.fatigue[entity],
            stress: NeedState.stress[entity],
          },
          morale: {
            current: MoraleState.current[entity],
            baseline: MoraleState.baseline[entity],
          },
          loyalty: {
            current: LoyaltyState.current[entity],
            baseline: LoyaltyState.baseline[entity],
          },
          injury: {
            severity: InjuryState.severity[entity],
            recoveryHoursRemaining: InjuryState.recoveryHoursRemaining[entity],
            treated: InjuryState.treated[entity] === 1,
          },
          assignment: {
            kind: AssignmentState.kind[entity],
            targetId: AssignmentState.targetId[entity],
          },
        })),
        visitors: runtimeState.visitorEntities.map((entity) => {
          const queueState = getVisitorQueueState(entity);
          const acceptLockReason = getVisitorAcceptLockReason({
            recruitmentUnlocked: recruitmentGate.unlocked,
            recruitmentLockReason: recruitmentGate.reason,
            livingOperatorCount,
            operatorCapacity,
          });
          const deferLockReason = getVisitorDeferLockReason(queueState, deferredVisitorCount);
          const replaceLockReason = getVisitorReplaceLockReason({
            recruitmentUnlocked: recruitmentGate.unlocked,
            recruitmentLockReason: recruitmentGate.reason,
            livingOperatorCount,
            operatorCapacity,
            replaceableOperatorCount,
          });
          return {
            id: VisitorState.id[entity],
            name: VisitorState.name[entity],
            desiredRoleTag: VisitorState.desiredRoleTag[entity],
            patience: VisitorState.patience[entity],
            quality: VisitorState.quality[entity],
            expectedLoyalty: VisitorState.expectedLoyalty[entity],
            queueState,
            projectedMorale: projectVisitorRecruitMorale(VisitorState.quality[entity]),
            projectedLoyalty: projectVisitorRecruitLoyalty(VisitorState.expectedLoyalty[entity]),
            canAccept: acceptLockReason === null,
            lockedReason: acceptLockReason,
            canDefer: deferLockReason === null,
            deferLockedReason: deferLockReason,
            canReplace: replaceLockReason === null,
            replaceLockedReason: replaceLockReason,
          };
        }),
        raidOpportunities: runtimeState.raidOpportunityEntities.map((entity) => ({
          id: RaidOpportunityState.id[entity],
          missionId: RaidOpportunityState.missionId[entity],
          location: RaidOpportunityState.location[entity],
          threat: RaidOpportunityState.threat[entity],
          intel: RaidOpportunityState.intel[entity],
          reward: RaidOpportunityState.reward[entity],
          risk: RaidOpportunityState.risk[entity],
          status: RaidOpportunityState.status[entity],
          interestedOperatorIds: [...(RaidOpportunityState.interestedOperatorIds[entity] ?? [])],
          claimedOperatorIds: [...(RaidOpportunityState.claimedOperatorIds[entity] ?? [])],
          createdTick: RaidOpportunityState.createdTick[entity],
          expiresAtTick: RaidOpportunityState.expiresAtTick[entity],
        })),
        activeEvents: runtimeState.eventEntities.map((entity) => {
          const template = registry.events[EventState.templateIndex[entity]];
          if (!template) {
            throw new Error(
              `Runtime event "${EventState.id[entity]}" references an unknown template index.`,
            );
          }

          return {
            id: EventState.id[entity],
            templateId: template.id,
            severity: EventState.severity[entity],
            remainingHours: EventState.remainingHours[entity],
            pressureContribution: EventState.pressureContribution[entity],
          };
        }),
        contractSite: BuildingAuthority.contractSite[buildingEntity]
          ? { ...BuildingAuthority.contractSite[buildingEntity]! }
          : null,
        contractLifecycle: BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding",
        postedContracts: (BuildingAuthority.postedContracts[buildingEntity] ?? []).map((p) => ({
          ...p,
        })),
        contractResult: BuildingAuthority.contractResult[buildingEntity]
          ? { ...BuildingAuthority.contractResult[buildingEntity]! }
          : null,
        fogOfWar: BuildingAuthority.fogOfWar[buildingEntity]
          ? {
              ...BuildingAuthority.fogOfWar[buildingEntity]!,
              revealed: [...BuildingAuthority.fogOfWar[buildingEntity]!.revealed],
            }
          : null,
        scheduler: {
          lastPayrollDay: BuildingAuthority.lastPayrollDay[buildingEntity] ?? 0,
          lastVisitorSpawnTick: BuildingAuthority.lastVisitorSpawnTick[buildingEntity] ?? 0,
          lastEventTick: BuildingAuthority.lastEventTick[buildingEntity] ?? 0,
          lastRaidOpportunityTick: BuildingAuthority.lastRaidOpportunityTick[buildingEntity] ?? 0,
        },
        operatorDispositions: runtimeState.dispositionEntities.map((entity) => ({
          operatorId: OperatorDisposition.operatorId[entity],
          sociability: OperatorDisposition.sociability[entity],
          temperament: OperatorDisposition.temperament[entity],
          grievanceLevel: OperatorDisposition.grievanceLevel[entity],
          satisfactionLevel: OperatorDisposition.satisfactionLevel[entity],
        })),
        notableTies: runtimeState.notableTieEntities.map((entity) => ({
          operatorAId: NotableTie.operatorAId[entity],
          operatorBId: NotableTie.operatorBId[entity],
          stance: NotableTie.stance[entity],
          strength: NotableTie.strength[entity],
        })),
        recurringTeams: runtimeState.recurringTeamEntities.map((entity) => ({
          id: RecurringTeam.id[entity],
          memberIds: [...(RecurringTeam.memberIds[entity] ?? [])],
          cohesion: RecurringTeam.cohesion[entity],
          raidCount: RecurringTeam.raidCount[entity],
          lastRaidTick: RecurringTeam.lastRaidTick[entity],
          damaged: RecurringTeam.damaged[entity] === 1,
          damageReason: RecurringTeam.damageReason[entity],
        })),
        roomCultures: runtimeState.roomCultureEntities.map((entity) => ({
          roomInstanceId: RoomCulture.roomInstanceId[entity],
          comfort: RoomCulture.comfort[entity],
          tension: RoomCulture.tension[entity],
          camaraderie: RoomCulture.camaraderie[entity],
          tone: RoomCulture.tone[entity],
        })),
        inventoryStacks: runtimeState.inventoryEntities
          .filter((entity) => InventoryStack.quantity[entity] > 0)
          .map((entity) => ({
            itemId: InventoryStack.itemId[entity],
            quantity: InventoryStack.quantity[entity],
          })),
        equipmentAssignments: runtimeState.equipmentEntities.map((entity) => ({
          operatorId: EquipmentAssignment.operatorId[entity],
          weaponId: EquipmentAssignment.weaponId[entity],
          outfitOverlayId: EquipmentAssignment.outfitOverlayId[entity],
          accessoryId: EquipmentAssignment.accessoryId[entity],
        })),
        // Encounter, interruption, and incident persistence
        ...(runtimeState.activeEncounter
          ? {
              activeEncounter: {
                encounterId: runtimeState.activeEncounter.encounterId,
                contractSiteId: runtimeState.activeEncounter.contractSiteId,
                activeRaidId: runtimeState.activeEncounter.activeRaidId,
                missionId: runtimeState.activeEncounter.missionId,
                teamId: runtimeState.activeEncounter.teamId,
                participatingOperatorIds: [
                  ...runtimeState.activeEncounter.participatingOperatorIds,
                ],
                bossDefinitionId: runtimeState.activeEncounter.bossDefinitionId,
                currentRound: runtimeState.activeEncounter.currentRound,
                currentPhaseIndex: runtimeState.activeEncounter.currentPhaseIndex,
                status: runtimeState.activeEncounter.status,
                elapsedMinutes: runtimeState.activeEncounter.elapsedMinutes,
                rngSeed: runtimeState.activeEncounter.rngSeed,
                rngCursor: runtimeState.activeEncounter.rngCursor,
                initiativeQueue: [...runtimeState.activeEncounter.initiativeQueue],
                pendingRoundStart: runtimeState.activeEncounter.pendingRoundStart,
                actors: JSON.parse(JSON.stringify(runtimeState.activeEncounter.actors)),
                interventions: runtimeState.activeEncounter.interventions.map((i) => ({
                  ...i,
                })),
                encounterLog: runtimeState.activeEncounter.encounterLog.slice(-50),
              },
            }
          : {}),
        ...(runtimeState.interruptionQueue.active || runtimeState.interruptionQueue.queue.length > 0
          ? {
              interruptionQueue: {
                active:
                  runtimeState.interruptionQueue.active?.persistence === "persistent"
                    ? runtimeState.interruptionQueue.active
                    : null,
                queue: runtimeState.interruptionQueue.queue.filter(
                  (i) => i.persistence === "persistent",
                ),
                nextInstanceId: runtimeState.interruptionQueue.nextInstanceId,
              },
            }
          : {}),
        ...(runtimeState.incidentState.pendingIncident ||
        runtimeState.incidentState.history.length > 0
          ? {
              incidentState: {
                pendingIncident: runtimeState.incidentState.pendingIncident,
                history: runtimeState.incidentState.history.slice(-20),
                cooldowns: { ...runtimeState.incidentState.cooldowns },
                nextInstanceId: runtimeState.incidentState.nextInstanceId,
                lastEvaluationMinute: runtimeState.incidentState.lastEvaluationMinute,
              },
            }
          : {}),
        // Guidance state: always persist when opening path is active or any beats have been seen
        ...(runtimeState.guidanceState.openingPathState === "active" ||
        runtimeState.guidanceState.completedBeatIds.length > 0 ||
        runtimeState.guidanceState.activeBeatId
          ? {
              guidanceState: {
                seenBeatIds: [...runtimeState.guidanceState.seenBeatIds],
                completedBeatIds: [...runtimeState.guidanceState.completedBeatIds],
                dismissedBeatIds: [...runtimeState.guidanceState.dismissedBeatIds],
                activeBeatId: runtimeState.guidanceState.activeBeatId,
                activeBeatView: runtimeState.guidanceState.activeBeatView
                  ? { ...(runtimeState.guidanceState.activeBeatView as Record<string, unknown>) }
                  : null,
                queuedBeatIds: [...runtimeState.guidanceState.queuedBeatIds],
                lastEvaluationMinute: runtimeState.guidanceState.lastEvaluationMinute,
                openingPathState: runtimeState.guidanceState.openingPathState,
                activeBeatProgressBaseline: runtimeState.guidanceState.activeBeatProgressBaseline,
                interactionCounts: { ...runtimeState.guidanceState.interactionCounts },
                openingTiming: runtimeState.guidanceState.openingTiming
                  ? { ...runtimeState.guidanceState.openingTiming }
                  : {
                      firstRaidReturnCompletedAtMinute: null,
                      firstIncidentSeededAtMinute: null,
                      securedContractCount: 0,
                      lastTrackedContractSiteId: null,
                    },
                anchorResolutionFailures: (
                  runtimeState.guidanceState.anchorResolutionFailures as unknown[]
                ).map((f) => ({ ...(f as Record<string, unknown>) })),
              } as Record<string, unknown>,
            }
          : {}),
      };
    },
    getPhase1View(cachedSnapshot?: Phase1RuntimeWorldSnapshot) {
      const snapshot = cachedSnapshot ?? simulation.getWorldSnapshot();
      const operatorSnapshotById = new Map(
        (snapshot.operators ?? []).map((operator) => [operator.id, operator] as const),
      );
      const requirementContext = buildRequirementContext(context);
      const buildingTemplate = getActiveBuildingTemplate(context);
      const availableBuildingUpgradeIds = registry.upgrades
        .filter(
          (upgrade) =>
            upgrade.target === "building" &&
            upgrade.targetId === snapshot.building.activeBuildingId,
        )
        .filter((upgrade) => !snapshot.appliedUpgradeIds.includes(upgrade.id))
        .filter((upgrade) => meetsRequirements(context, upgrade.requirements, requirementContext))
        .filter((upgrade) => {
          const costs = getAdjustedUpgradeCosts(context, upgrade.requirements);
          return Array.from(costs.entries()).every(([resourceId, amount]) => {
            return (requirementContext.resourceBalances.get(resourceId) ?? 0) >= amount;
          });
        })
        .map((upgrade) => upgrade.id);
      const livingOperatorEntities = runtimeState.operatorEntities.filter(
        (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
      );
      const policies = BuildingAuthority.policies[buildingEntity] ?? DEFAULT_POLICY_STATE;
      const recoveryTriage = getRecoveryTriageConfig(policies);
      const contractPosture = getContractPostureConfig(policies);
      const operatorIntentReadiness = livingOperatorEntities.map((entity) => {
        const operatorSnapshot = operatorSnapshotById.get(OperatorIdentity.id[entity]);
        if (!operatorSnapshot) {
          throw new Error(`Missing runtime operator snapshot for ${OperatorIdentity.id[entity]}.`);
        }
        const opportunitySignals = runtimeState.raidOpportunityEntities
          .map((opportunityEntity) => ({
            opportunityEntity,
            readiness: computeOperatorRaidReadiness(context, entity, opportunityEntity),
          }))
          .sort((left, right) => {
            const readinessDelta =
              right.readiness.willingnessScore - left.readiness.willingnessScore;
            if (readinessDelta !== 0) {
              return readinessDelta;
            }

            return RaidOpportunityState.id[left.opportunityEntity].localeCompare(
              RaidOpportunityState.id[right.opportunityEntity],
            );
          });
        const fallbackReadiness = getAvailabilityWithoutOpportunity(operatorSnapshot);
        const selectedOpportunity = opportunitySignals[0];
        const availabilityScore =
          selectedOpportunity?.readiness.availabilityScore ?? fallbackReadiness.availabilityScore;
        const willingnessScore =
          selectedOpportunity?.readiness.willingnessScore ?? fallbackReadiness.willingnessScore;
        const readinessScore =
          selectedOpportunity?.readiness.readinessScore ??
          (availabilityScore + willingnessScore) / 2;
        const schedulePressure =
          selectedOpportunity?.readiness.schedulePressure ?? fallbackReadiness.schedulePressure;
        const readinessFlags = computeNeedReadinessFlags(entity, recoveryTriage);

        return {
          operatorId: OperatorIdentity.id[entity],
          name: OperatorIdentity.name[entity],
          intent: getIntentLabel(ScheduleState.currentBlock[entity]),
          currentBlock: ScheduleState.currentBlock[entity],
          dominantNeed: getDominantNeed(operatorSnapshot),
          availableForRaid:
            AssignmentState.kind[entity] !== "raid" &&
            !readinessFlags.injuryPreventsRaid &&
            !readinessFlags.exhaustionPenalty &&
            willingnessScore >= contractPosture.minimumWillingnessThreshold,
          preferredOpportunityId: selectedOpportunity
            ? RaidOpportunityState.id[selectedOpportunity.opportunityEntity]
            : undefined,
          availabilityScore,
          willingnessScore,
          readinessScore,
          schedulePressure,
        } satisfies Phase1OperatorIntentReadinessView;
      });
      const operatorReadinessById = new Map(
        operatorIntentReadiness.map((entry) => [entry.operatorId, entry]),
      );
      const raidPresentationById = new Map(
        runtimeState.raidPresentation.teams.map((team) => [team.raidId, team]),
      );
      return {
        stableCommandTypes: STABLE_SIM_COMMAND_TYPES,
        clock: {
          tick: snapshot.time.tick,
          day: snapshot.time.day,
          minuteOfDay: snapshot.time.minuteOfDay,
          absoluteMinute: getCurrentAbsoluteMinute(context),
        },
        resources: {
          cash: snapshot.guild.treasury,
          reputation: snapshot.guild.reputation,
          intel: snapshot.guild.intel,
          pressure: BuildingAuthority.pressure[buildingEntity] ?? 0,
        },
        policies: {
          ...(BuildingAuthority.policies[buildingEntity] ?? DEFAULT_POLICY_STATE),
        },
        building: {
          activeBuildingId: snapshot.building.activeBuildingId,
          activeBuildingName: buildingTemplate.name,
          tier: snapshot.building.activeBuildingTier,
          activeFloorIndex: snapshot.building.activeFloorIndex,
          floorCount: getBuildingFloors(
            snapshot.building.activeBuildingId,
            snapshot.building.activeBuildingTier,
          ).length,
          roomSlotCount: snapshot.building.roomSlotCount,
          roomsUsed: snapshot.rooms.length,
          operatorSlotCount: snapshot.building.operatorSlotCount,
          operatorCount: (snapshot.operators ?? []).filter((op) => op.lifecycle.status === "active")
            .length,
          appliedUpgradeIds: snapshot.appliedUpgradeIds,
          unlockedRoomTemplateIds: [
            ...(BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] ?? []),
          ],
          availableBuildingUpgradeIds,
        },
        rooms: runtimeState.roomEntities.map((entity) => {
          const template = getRoomTemplateForRuntimeEntity(registry, entity);
          const roomAppliedUpgradeIds = RoomInstance.appliedUpgradeIds[entity] ?? [];
          const nextPendingIds = new Set(
            getNextPendingRoomUpgradeIds(template.id, roomAppliedUpgradeIds),
          );
          const availableUpgradeIds = registry.upgrades
            .filter((upgrade) => upgrade.target === "room" && upgrade.targetId === template.id)
            .filter((upgrade) => !roomAppliedUpgradeIds.includes(upgrade.id))
            .filter((upgrade) =>
              nextPendingIds.size === 0 ? true : nextPendingIds.has(upgrade.id),
            )
            .filter((upgrade) =>
              meetsRequirements(context, upgrade.requirements, requirementContext),
            )
            .filter((upgrade) => {
              const costs = getAdjustedUpgradeCosts(context, upgrade.requirements);
              return Array.from(costs.entries()).every(([resourceId, amount]) => {
                return (requirementContext.resourceBalances.get(resourceId) ?? 0) >= amount;
              });
            })
            .map((upgrade) => upgrade.id);

          return {
            id: RoomInstance.id[entity],
            templateId: template.id,
            name: template.name,
            tier: RoomInstance.tier[entity],
            floorIndex: RoomInstance.floorIndex[entity] ?? 0,
            slotId: RoomInstance.slotId[entity],
            roomStateId:
              RoomInstance.roomStateId[entity] ||
              getRoomStateId(template.id, RoomInstance.appliedUpgradeIds[entity] ?? []),
            isRequestedActive: RoomInstance.isRequestedActive[entity] === 1,
            isOperational: RoomInstance.isOperational[entity] === 1,
            capacity: RoomInstance.capacity[entity],
            occupancy: RoomInstance.occupancy[entity],
            requiredStaffTag: getStaffRoleTag(template.tags),
            assignedStaffCount: RoomInstance.assignedStaffCount[entity],
            appliedUpgradeIds: [...(RoomInstance.appliedUpgradeIds[entity] ?? [])],
            availableUpgradeIds,
            reservedFootprint: {
              col: RoomInstance.reservedCol[entity],
              row: RoomInstance.reservedRow[entity],
              cols: RoomInstance.reservedCols[entity],
              rows: RoomInstance.reservedRows[entity],
            },
            activeFootprint: {
              col: Renderable.col[entity],
              row: Renderable.row[entity],
              cols: Renderable.cols[entity],
              rows: Renderable.rows[entity],
            },
          };
        }),
        visitors: snapshot.visitors ?? [],
        operators:
          snapshot.operators?.map((operator) => {
            const readiness = operatorReadinessById.get(operator.id);
            const replaceLockedReason = getOperatorReplaceLockReason(operator);

            return {
              ...operator,
              availableForRaid: readiness?.availableForRaid ?? false,
              intent: readiness?.intent ?? "idle",
              dominantNeed: readiness?.dominantNeed ?? "idle",
              readinessScore: readiness?.readinessScore ?? 0,
              availabilityScore: readiness?.availabilityScore ?? 0,
              willingnessScore: readiness?.willingnessScore ?? 0,
              schedulePressure: readiness?.schedulePressure ?? 0,
              preferredOpportunityId: readiness?.preferredOpportunityId,
              canBeReplaced: replaceLockedReason === null,
              replaceLockedReason,
            };
          }) ?? [],
        operatorIntentReadiness,
        relationshipSignals: deriveCompatibilityRelationships(context).map((relationship) => ({
          ...relationship,
          cohesion: computeRelationshipCohesion(
            context,
            relationship.operatorAId,
            relationship.operatorBId,
          ),
        })),
        staff: snapshot.staff ?? [],
        missions: registry.missions.map((mission) => ({
          id: mission.id,
          name: mission.name,
          objectiveType: mission.objectiveType,
          baseDurationHours: mission.baseDurationHours,
          recommendedOperatorCount: getRecommendedOperatorCountForMission(
            mission.baseDurationHours,
          ),
          available:
            operatorIntentReadiness.filter((operator) => operator.availableForRaid).length >=
            getRecommendedOperatorCountForMission(mission.baseDurationHours),
        })),
        raidOpportunities:
          snapshot.raidOpportunities?.map((opportunity) => {
            const mission = registry.missionById.get(opportunity.missionId);
            if (!mission) {
              throw new Error(
                `Runtime view references unknown mission "${opportunity.missionId}" for raid opportunity "${opportunity.id}".`,
              );
            }

            return {
              ...opportunity,
              recommendedOperatorCount: getRecommendedOperatorCountForMission(
                mission.baseDurationHours,
              ),
              interestedCount: opportunity.interestedOperatorIds.length,
              claimedCount: opportunity.claimedOperatorIds.length,
            };
          }) ?? [],
        activeRaids: snapshot.activeRaidPackets.map((packet) => {
          const opEntities = packet.operatorIds
            .map((id) => runtimeState.operatorEntities.find((e) => OperatorIdentity.id[e] === id))
            .filter((e): e is number => e !== undefined);
          const presentation = raidPresentationById.get(packet.id);
          const teamGoal =
            presentation?.goal ??
            (opEntities.length > 0
              ? selectTeamGoal(context, opEntities, packet)
              : ("exploring" as RaidTeamGoal));
          const teamState: "active" | "returning" | "defeated" =
            presentation?.state ??
            (packet.revealProgress > 90
              ? packet.resolutionPacket.result === "failure"
                ? "defeated"
                : "returning"
              : "active");
          return {
            ...packet,
            teamGoal,
            teamState,
            x: presentation?.x ?? 48,
            y: presentation?.y ?? 48,
            operatorStatuses: presentation?.operatorStatuses ?? [],
            encounter: presentation?.encounter ?? null,
            recentEvents: presentation?.recentEvents ?? [],
          };
        }),
        raidSummaries: snapshot.raidSummaries,
        activeEvents: snapshot.activeEvents ?? [],
        rosterPressure: computeRosterPressure(
          snapshot,
          operatorIntentReadiness,
          BuildingAuthority.operatorSlotCount[buildingEntity],
          getCurrentAbsoluteMinute(context),
        ),
        contractLifecycle: BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding",
        contractSite: (() => {
          const cs = BuildingAuthority.contractSite[buildingEntity];
          if (!cs) return null;
          const concept = siteConceptById.get(cs.siteConceptId ?? "");
          return {
            contractSiteId: cs.contractSiteId,
            missionId: cs.missionId,
            siteConceptId: cs.siteConceptId ?? "",
            siteConceptName: concept?.name ?? "Unknown Site",
            location: cs.location,
            rank: cs.rank ?? "f",
            bossDefeated: cs.bossDefeated,
            contractLost: cs.contractLost,
            threat: cs.threat,
            intel: cs.intel,
            reward: cs.reward,
            explorationProgress: cs.explorationProgress ?? 0,
            bossAvailable: cs.bossAvailable ?? false,
          };
        })(),
        contractResult: (() => {
          const cr = BuildingAuthority.contractResult[buildingEntity];
          if (!cr) return null;
          const concept = siteConceptById.get(cr.siteConceptId ?? "");
          return {
            contractSiteId: cr.contractSiteId,
            missionId: cr.missionId,
            siteConceptId: cr.siteConceptId,
            siteConceptName: concept?.name ?? "Unknown Site",
            location: cr.location,
            rank: cr.rank,
            outcome: cr.outcome,
            totalRaids: cr.totalRaids,
            totalCashEarned: cr.totalCashEarned,
            totalReputationEarned: cr.totalReputationEarned,
            operatorDeaths: cr.operatorDeaths,
          };
        })(),
        postedContracts: (() => {
          const postings = BuildingAuthority.postedContracts[buildingEntity] ?? [];
          const reputation = GuildState.reputation[context.singletonEntities.guild];
          return postings.map((p) => {
            const concept = siteConceptById.get(p.siteConceptId);
            return {
              postingId: p.postingId,
              missionId: p.missionId,
              siteConceptId: p.siteConceptId,
              siteConceptName: concept?.name ?? "Unknown Site",
              location: p.location,
              rank: p.rank,
              threat: p.threat,
              intel: p.intel,
              reward: p.reward,
              risk: p.risk,
              bidCost: p.bidCost,
              canBid:
                reputation >= p.minReputation &&
                GuildState.treasury[context.singletonEntities.guild] >= p.bidCost,
              knownTraits: [...p.knownTraits],
              hiddenTraitCount: p.hiddenTraitCount,
              enemyHints: [...p.enemyHints],
              lootFamilyHints: [...p.lootFamilyHints],
              bossHint: p.bossHint,
              neighborhoodLabel: p.neighborhoodLabel,
            };
          });
        })(),
        fogOfWar: (() => {
          const fog = BuildingAuthority.fogOfWar[buildingEntity];
          if (!fog) return null;
          return {
            gridWidth: fog.gridWidth,
            gridHeight: fog.gridHeight,
            revealed: [...fog.revealed],
          };
        })(),
        raidWorld:
          runtimeState.raidPresentation.contractSiteId != null
            ? {
                enemyMarkers: runtimeState.raidPresentation.enemies.map((enemy) => ({
                  id: enemy.id,
                  x: enemy.x,
                  y: enemy.y,
                  threat: enemy.threat,
                  discovered: enemy.discovered,
                })),
                featureMarkers: runtimeState.raidPresentation.features.map((feature) => ({
                  id: feature.id,
                  x: feature.x,
                  y: feature.y,
                  kind: feature.kind,
                  discovered: feature.discovered,
                })),
              }
            : null,
        encounter: runtimeState.activeEncounter
          ? lazyBuildEncounterView(runtimeState.activeEncounter, registry)
          : null,
        activeInterruption: runtimeState.interruptionQueue.active,
        worldTimeFrozen: runtimeState.worldTimeFrozen,
        guidance: {
          activeBeat: runtimeState.guidanceState.activeBeatView
            ? {
                ...(runtimeState.guidanceState.activeBeatView as {
                  beatId: string;
                  track: string;
                  deliveryMode: string;
                  target: string | null;
                  fallbackIntent: string | null;
                  copy: {
                    title: string;
                    body: string;
                    subtitle?: string;
                    ctaLabel: string;
                    ctaDismissLabel?: string;
                    fallbackBody?: string;
                  };
                  milestoneOrder: number;
                  totalMilestones: number;
                  completionKind: string;
                  pauseWorld: boolean;
                  allowSkip: boolean;
                }),
              }
            : null,
          openingPathState: runtimeState.guidanceState.openingPathState,
          completedOpeningBeats: runtimeState.guidanceState.completedBeatIds.filter((id) =>
            id.startsWith("guidance/opening/"),
          ).length,
          totalOpeningBeats: OPENING_BEAT_COUNT,
        },
      };
    },
    getPhase2View(): Phase2View {
      if (phase2ViewCache) return phase2ViewCache;

      const livingOperatorEntities = runtimeState.operatorEntities.filter(
        (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
      );

      phase2ViewCache = {
        teams: runtimeState.recurringTeamEntities.map((entity) => ({
          id: RecurringTeam.id[entity],
          members: [...(RecurringTeam.memberIds[entity] ?? [])],
          cohesion: RecurringTeam.cohesion[entity],
          raidCount: RecurringTeam.raidCount[entity],
          damaged: RecurringTeam.damaged[entity] === 1,
          damageReason: RecurringTeam.damageReason[entity],
          statusSummary: buildTeamStatusSummary(entity),
          explanationReasons: buildTeamExplanation(entity),
        })),
        roomCultures: runtimeState.roomCultureEntities.map((entity) => ({
          roomId: RoomCulture.roomInstanceId[entity],
          tone: RoomCulture.tone[entity],
          summary: buildRoomCultureSummary(entity),
          signals: buildRoomCultureSignals(entity),
        })),
        inventory: runtimeState.inventoryEntities.map((entity) => ({
          itemId: InventoryStack.itemId[entity],
          quantity: InventoryStack.quantity[entity],
        })),
        equipment: livingOperatorEntities.map((entity) => {
          const operatorId = OperatorIdentity.id[entity];
          const equipmentEntity = runtimeState.equipmentEntities.find(
            (candidate) => EquipmentAssignment.operatorId[candidate] === operatorId,
          );
          const accessoryId =
            equipmentEntity === undefined ? "" : EquipmentAssignment.accessoryId[equipmentEntity];
          const accessory = describeAccessoryAssignment(context, operatorId, accessoryId);
          return {
            operatorId,
            weaponId:
              equipmentEntity === undefined ? "" : EquipmentAssignment.weaponId[equipmentEntity],
            outfitOverlayId:
              equipmentEntity === undefined
                ? ""
                : EquipmentAssignment.outfitOverlayId[equipmentEntity],
            accessoryId,
            accessoryReason: accessory.reason,
            accessorySummary: describeAccessorySelectionReason(accessory.reason),
          };
        }),
        operatorAutonomy: livingOperatorEntities.map((entity) => {
          const flags = computeAutonomyFlags(entity);
          const morale = MoraleState.current[entity];
          const loyalty = LoyaltyState.current[entity];
          const explanationReasons: Phase2AutonomyFactor[] = [];

          if (flags.refusalRisk) {
            explanationReasons.push({
              factor: "low_morale",
              contribution: -morale,
              description: `Morale at ${Math.round(morale)} creates refusal risk`,
            });
          }
          if (flags.quitRisk) {
            explanationReasons.push({
              factor: "critical_morale",
              contribution: -morale,
              description: `Morale at ${Math.round(morale)} creates quit risk`,
            });
          }
          if (flags.retentionRisk) {
            explanationReasons.push({
              factor: "low_loyalty",
              contribution: -loyalty,
              description: `Loyalty at ${Math.round(loyalty)} creates retention risk`,
            });
          }
          if (InjuryState.severity[entity] >= 35) {
            explanationReasons.push({
              factor: "injury",
              contribution: -InjuryState.severity[entity] * 0.5,
              description: `Injury severity ${Math.round(InjuryState.severity[entity])} is reducing autonomy stability`,
            });
          }
          if (NeedState.fatigue[entity] >= 55) {
            explanationReasons.push({
              factor: "fatigue",
              contribution: -NeedState.fatigue[entity] * 0.35,
              description: `Fatigue at ${Math.round(NeedState.fatigue[entity])} is dragging readiness`,
            });
          }
          const damagedTeamEntity = runtimeState.recurringTeamEntities.find((teamEntity) => {
            return (
              RecurringTeam.damaged[teamEntity] === 1 &&
              (RecurringTeam.memberIds[teamEntity] ?? []).includes(OperatorIdentity.id[entity])
            );
          });
          if (damagedTeamEntity !== undefined) {
            explanationReasons.push({
              factor: "team_damage",
              contribution: -18,
              description: `Recurring team damage from ${RecurringTeam.damageReason[damagedTeamEntity] || "recent fallout"} is hurting confidence`,
            });
          }

          return {
            operatorId: OperatorIdentity.id[entity],
            refusalRisk: flags.refusalRisk,
            quitRisk: flags.quitRisk,
            retentionRisk: flags.retentionRisk,
            explanationReasons,
          };
        }),
        marketItems: getAdjustedMarketItems(context),
        dispositions: runtimeState.dispositionEntities.map((entity) => ({
          operatorId: OperatorDisposition.operatorId[entity],
          sociability: OperatorDisposition.sociability[entity],
          temperament: OperatorDisposition.temperament[entity],
          grievanceLevel: OperatorDisposition.grievanceLevel[entity],
          satisfactionLevel: OperatorDisposition.satisfactionLevel[entity],
        })),
        notableTies: runtimeState.notableTieEntities.map((entity) => ({
          operatorAId: NotableTie.operatorAId[entity],
          operatorBId: NotableTie.operatorBId[entity],
          stance: NotableTie.stance[entity],
          strength: NotableTie.strength[entity],
        })),
      };
      return phase2ViewCache;
    },
    drainRuntimeCues() {
      const drained = runtimeState.pendingCueIds.slice();
      runtimeState.pendingCueIds.length = 0;
      return drained;
    },
    drainRuntimeEvents() {
      const drained = runtimeState.pendingEvents.slice();
      runtimeState.pendingEvents.length = 0;
      return drained;
    },
    tick(deltaMs) {
      simulation.dispatch({ type: "sim/tick", deltaMs });
    },
  };

  return simulation;
}

export function createAscensionSimulation(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
  options?: { simulationSeed?: number },
): AscensionSimulation {
  return applyWorldSnapshot(snapshot, registry, options);
}
