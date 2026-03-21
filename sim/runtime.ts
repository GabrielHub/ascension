import { addComponent, addEntity, createWorld } from "bitecs";

import {
  normalizeOperatorAppearance,
  type ActiveRaidSnapshot,
  type RaidSummarySnapshot,
  type WorldSnapshot,
} from "save";
import type { TemplateRegistry } from "content/templates";

import {
  AssignmentState,
  BuildingAuthority,
  type ActiveRaidPacketRecord,
  type RaidSummaryRecord,
  EventState,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  PreferenceState,
  RaidOpportunityState,
  RaidParticipationState,
  RelationshipState,
  Renderable,
  RoomInstance,
  ScheduleState,
  StaffState,
  VisitorState,
  WorldTimeState,
} from "./components";
import { STABLE_SIM_COMMAND_TYPES, type SimCommand } from "./commands";
import {
  buildDefaultPreferenceProfile,
  buildInitialRelationshipRecord,
  buildRequirementContext,
  getAdjustedUpgradeCosts,
  getCurrentAbsoluteMinute,
  getRoleTag,
  meetsRequirements,
  type PreferenceProfileRecord,
} from "./systems/commands";
import {
  computeOperatorRaidReadiness,
  computeRelationshipCohesion,
  computeSchedulePressure,
  getRecommendedOperatorCountForMission,
  runSimCommand,
  runSimSystemSchedule,
  simSystemSchedule,
  type SimRuntimeState,
  type SimSingletonEntities,
} from "./systems";

export interface Phase1OperatorPreferenceSnapshot extends PreferenceProfileRecord {}

export interface Phase1OperatorScheduleSnapshot {
  currentBlock: string;
  workStartMinute: number;
  workEndMinute: number;
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
  building: {
    activeBuildingId: string;
    activeBuildingName: string;
    tier: number;
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
    isRequestedActive: boolean;
    isOperational: boolean;
    capacity: number;
    occupancy: number;
    requiredRoleTag: string;
    assignedStaffCount: number;
    appliedUpgradeIds: string[];
    availableUpgradeIds: string[];
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
  activeRaids: Phase1ActiveRaidSnapshot[];
  raidSummaries: Phase1RaidSummarySnapshot[];
  activeEvents: Phase1ActiveEventSnapshot[];
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
  const normalizedAppearance = normalizeOperatorAppearance({
    presetId: operator.appearance?.presetId,
    legacySeed:
      typeof (operator.appearance as Record<string, unknown> | undefined)?.seed === "number"
        ? (operator.appearance as Record<string, unknown>).seed
        : undefined,
    stableKey: [
      operator.id,
      operator.identity.name,
      operator.identity.roleTag,
      operator.identity.specialtyTag,
    ].join(":"),
  });

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
    appearance: normalizedAppearance.appearance,
  };
}

function buildDefaultRelationshipSnapshots(
  operators: readonly Phase1OperatorSnapshot[],
): Phase1RelationshipSnapshot[] {
  const relationships: Phase1RelationshipSnapshot[] = [];

  for (let index = 0; index < operators.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < operators.length; otherIndex += 1) {
      relationships.push(
        buildInitialRelationshipRecord(
          {
            id: operators[index].id,
            roleTag: operators[index].identity.roleTag,
            specialtyTag: operators[index].identity.specialtyTag,
            preferences: operators[index].preferences,
          },
          {
            id: operators[otherIndex].id,
            roleTag: operators[otherIndex].identity.roleTag,
            specialtyTag: operators[otherIndex].identity.specialtyTag,
            preferences: operators[otherIndex].preferences,
          },
        ),
      );
    }
  }

  return relationships;
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
  const operatorRelationships =
    extendedSnapshot.operatorRelationships && extendedSnapshot.operatorRelationships.length > 0
      ? extendedSnapshot.operatorRelationships.map((relationship) => ({
          operatorAId: relationship.operatorAId,
          operatorBId: relationship.operatorBId,
          trust: relationship.trust ?? 50,
          friction: relationship.friction ?? 0,
          familiarity: relationship.familiarity ?? 0,
          recentSharedOutcome: relationship.recentSharedOutcome ?? 0,
          historyTags: [...(relationship.historyTags ?? [])],
        }))
      : buildDefaultRelationshipSnapshots(operators);

  return {
    ...snapshot,
    activeRaidPackets: (extendedSnapshot.activeRaidPackets ?? []).map((packet) => ({
      ...packet,
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
    raidOpportunities: (extendedSnapshot.raidOpportunities ?? []).map((opportunity) => ({
      id: opportunity.id,
      missionId: opportunity.missionId,
      location: opportunity.location,
      threat: opportunity.threat,
      intel: opportunity.intel,
      reward: opportunity.reward,
      risk: opportunity.risk,
      status: opportunity.status,
      interestedOperatorIds: [...(opportunity.interestedOperatorIds ?? [])],
      claimedOperatorIds: [...(opportunity.claimedOperatorIds ?? [])],
      createdTick: opportunity.createdTick,
      expiresAtTick: opportunity.expiresAtTick,
    })),
    staff: extendedSnapshot.staff ?? [],
    visitors: extendedSnapshot.visitors ?? [],
    activeEvents: extendedSnapshot.activeEvents ?? [],
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

function createRuntimeState(snapshot: Phase1RuntimeWorldSnapshot): SimRuntimeState {
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

  return {
    roomEntities: [],
    operatorEntities: [],
    relationshipEntities: [],
    raidOpportunityEntities: [],
    staffEntities: [],
    visitorEntities: [],
    eventEntities: [],
    nextRoomSequence: nextSequenceFromIds(roomIds),
    nextOperatorSequence: nextSequenceFromIds(operatorIds),
    nextOpportunitySequence: nextSequenceFromIds(opportunityIds),
    nextStaffSequence: nextSequenceFromIds(staffIds),
    nextVisitorSequence: nextSequenceFromIds(visitorIds),
    nextRaidSequence: nextSequenceFromIds(raidIds),
    nextEventSequence: nextSequenceFromIds(eventIds),
  };
}

function getActiveBuildingTemplate(context: {
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
}) {
  return (
    context.registry.buildings[
      BuildingAuthority.activeBuildingTemplateIndex[context.singletonEntities.building]
    ] ?? context.registry.buildings[0]
  );
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
      snapshot.injury.severity * 0.85 -
      snapshot.needs.fatigue * 0.55 -
      snapshot.needs.stress * 0.35 -
      snapshot.needs.hunger * 0.18 -
      schedulePressure * 0.45 +
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

function applyWorldSnapshot(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
): AscensionSimulation {
  const runtimeSnapshot = toRuntimeSnapshot(snapshot);
  const world = createWorld();
  const runtimeState = createRuntimeState(runtimeSnapshot);
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);
  const currentAbsoluteMinute = getCurrentAbsoluteMinuteFromSnapshot(runtimeSnapshot);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.reputation[guildEntity] = runtimeSnapshot.guild.reputation;
  GuildState.treasury[guildEntity] = runtimeSnapshot.guild.treasury;
  GuildState.intel[guildEntity] = runtimeSnapshot.guild.intel;

  WorldTimeState.tick[timeEntity] = runtimeSnapshot.time.tick;
  WorldTimeState.day[timeEntity] = runtimeSnapshot.time.day;
  WorldTimeState.minuteOfDay[timeEntity] = runtimeSnapshot.time.minuteOfDay;

  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] =
    registry.buildingIndexById.get(runtimeSnapshot.building.activeBuildingId) ?? 0;
  BuildingAuthority.activeBuildingTier[buildingEntity] =
    runtimeSnapshot.building.activeBuildingTier;
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
  BuildingAuthority.lastPayrollDay[buildingEntity] = runtimeSnapshot.time.day;
  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = currentAbsoluteMinute;
  BuildingAuthority.lastEventTick[buildingEntity] = 0;
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = Math.max(
    0,
    (runtimeSnapshot.raidOpportunities ?? []).reduce((latest, opportunity) => {
      return Math.max(latest, opportunity.createdTick);
    }, currentAbsoluteMinute - 150),
  );

  runtimeSnapshot.rooms.forEach((room, index) => {
    const entity = addEntity(world);

    addComponent(world, entity, RoomInstance);
    addComponent(world, entity, Renderable);

    RoomInstance.id[entity] = room.id;
    RoomInstance.templateIndex[entity] = registry.roomIndexById.get(room.templateId) ?? 0;
    RoomInstance.tier[entity] = room.tier;
    RoomInstance.capacity[entity] = room.capacity;
    RoomInstance.occupancy[entity] = room.occupancy;
    RoomInstance.isRequestedActive[entity] = (room.isActive ?? room.occupancy > 0) ? 1 : 0;
    RoomInstance.isOperational[entity] = (room.isActive ?? room.occupancy > 0) ? 1 : 0;
    RoomInstance.assignedStaffCount[entity] = room.occupancy;
    RoomInstance.appliedUpgradeIds[entity] = [];
    RoomInstance.slotIndex[entity] = index;

    Renderable.x[entity] = room.position.x;
    Renderable.y[entity] = room.position.y;
    Renderable.width[entity] = room.position.width;
    Renderable.height[entity] = room.position.height;
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
    RaidParticipationState.activeRaidId[entity] =
      operator.assignment.kind === "raid" ? operator.assignment.targetId : "";
    RaidParticipationState.missionId[entity] =
      runtimeSnapshot.activeRaidPackets.find((packet) => packet.id === operator.assignment.targetId)
        ?.missionId ?? "";
    RaidParticipationState.returnTick[entity] =
      runtimeSnapshot.activeRaidPackets.find((packet) => packet.id === operator.assignment.targetId)
        ?.returnTick ?? 0;
    InjuryState.severity[entity] = operator.injury.severity;
    InjuryState.recoveryHoursRemaining[entity] = operator.injury.recoveryHoursRemaining;
    InjuryState.treated[entity] = operator.injury.treated ? 1 : 0;

    runtimeState.operatorEntities.push(entity);
  });

  runtimeSnapshot.operatorRelationships?.forEach((relationship) => {
    const entity = addEntity(world);

    addComponent(world, entity, RelationshipState);
    RelationshipState.operatorAId[entity] = relationship.operatorAId;
    RelationshipState.operatorBId[entity] = relationship.operatorBId;
    RelationshipState.trust[entity] = relationship.trust;
    RelationshipState.friction[entity] = relationship.friction;
    RelationshipState.familiarity[entity] = relationship.familiarity;
    RelationshipState.recentSharedOutcome[entity] = relationship.recentSharedOutcome;
    RelationshipState.historyTags[entity] = [...relationship.historyTags];

    runtimeState.relationshipEntities.push(entity);
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
    StaffState.roleTag[entity] = staff.roleTag;
    StaffState.status[entity] = staff.status;
    StaffState.wage[entity] = staff.wage;
    MoraleState.current[entity] = 56;
    MoraleState.baseline[entity] = 56;
    LoyaltyState.current[entity] = 52;
    LoyaltyState.baseline[entity] = 52;
    ScheduleState.currentBlock[entity] = "idle";
    ScheduleState.workStartMinute[entity] = 480;
    ScheduleState.workEndMinute[entity] = 1080;
    AssignmentState.kind[entity] = staff.assignment.kind;
    AssignmentState.targetId[entity] = staff.assignment.targetId;
    NeedState.hunger[entity] = 18;
    NeedState.fatigue[entity] = 24;
    NeedState.stress[entity] = 14;
    InjuryState.severity[entity] = 0;
    InjuryState.recoveryHoursRemaining[entity] = 0;
    InjuryState.treated[entity] = 0;

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

    addComponent(world, entity, EventState);
    EventState.id[entity] = event.id;
    EventState.templateIndex[entity] = registry.events.findIndex(
      (template) => template.id === event.templateId,
    );
    EventState.severity[entity] = event.severity;
    EventState.remainingHours[entity] = event.remainingHours;
    EventState.pressureContribution[entity] = event.pressureContribution;

    runtimeState.eventEntities.push(entity);
  });

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

  runSimSystemSchedule(context, 0);

  const simulation: AscensionSimulation = {
    registry,
    singletonEntities,
    runtimeState,
    roomEntities: runtimeState.roomEntities,
    schedule: simSystemSchedule,
    stableCommandTypes: STABLE_SIM_COMMAND_TYPES,
    dispatch(command) {
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
          roomSlotCount: BuildingAuthority.roomSlotCount[buildingEntity],
          operatorSlotCount: BuildingAuthority.operatorSlotCount[buildingEntity],
        },
        rooms: runtimeState.roomEntities.map((entity) => {
          const template = registry.rooms[RoomInstance.templateIndex[entity]] ?? registry.rooms[0];

          return {
            id: RoomInstance.id[entity],
            templateId: template.id,
            tier: RoomInstance.tier[entity],
            capacity: RoomInstance.capacity[entity],
            occupancy: RoomInstance.occupancy[entity],
            isActive: RoomInstance.isRequestedActive[entity] === 1,
            position: {
              x: Renderable.x[entity],
              y: Renderable.y[entity],
              width: Renderable.width[entity],
              height: Renderable.height[entity],
            },
          };
        }),
        activeRaidPackets,
        raidSummaries,
        appliedUpgradeIds: [...(BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? [])],
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
          appearance: {
            presetId: OperatorIdentity.appearancePresetId[entity],
          },
        })),
        operatorRelationships: runtimeState.relationshipEntities.map((entity) => ({
          operatorAId: RelationshipState.operatorAId[entity],
          operatorBId: RelationshipState.operatorBId[entity],
          trust: RelationshipState.trust[entity],
          friction: RelationshipState.friction[entity],
          familiarity: RelationshipState.familiarity[entity],
          recentSharedOutcome: RelationshipState.recentSharedOutcome[entity],
          historyTags: [...(RelationshipState.historyTags[entity] ?? [])],
        })),
        staff: runtimeState.staffEntities.map((entity) => ({
          id: StaffState.id[entity],
          name: StaffState.name[entity],
          roleTag: StaffState.roleTag[entity],
          status: StaffState.status[entity],
          wage: StaffState.wage[entity],
          assignment: {
            kind: AssignmentState.kind[entity],
            targetId: AssignmentState.targetId[entity],
          },
        })),
        visitors: runtimeState.visitorEntities.map((entity) => ({
          id: VisitorState.id[entity],
          name: VisitorState.name[entity],
          desiredRoleTag: VisitorState.desiredRoleTag[entity],
          patience: VisitorState.patience[entity],
          quality: VisitorState.quality[entity],
          expectedLoyalty: VisitorState.expectedLoyalty[entity],
        })),
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
          const template = registry.events[EventState.templateIndex[entity]] ?? registry.events[0];

          return {
            id: EventState.id[entity],
            templateId: template.id,
            severity: EventState.severity[entity],
            remainingHours: EventState.remainingHours[entity],
            pressureContribution: EventState.pressureContribution[entity],
          };
        }),
      };
    },
    getPhase1View(cachedSnapshot?: Phase1RuntimeWorldSnapshot) {
      const snapshot = cachedSnapshot ?? simulation.getWorldSnapshot();
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
      const operatorIntentReadiness = runtimeState.operatorEntities.map((entity) => {
        const operatorSnapshot =
          snapshot.operators?.find((operator) => operator.id === OperatorIdentity.id[entity]) ??
          snapshot.operators?.[0];
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

        return {
          operatorId: OperatorIdentity.id[entity],
          name: OperatorIdentity.name[entity],
          intent: getIntentLabel(ScheduleState.currentBlock[entity]),
          currentBlock: ScheduleState.currentBlock[entity],
          dominantNeed: getDominantNeed(operatorSnapshot),
          availableForRaid:
            AssignmentState.kind[entity] !== "raid" &&
            InjuryState.severity[entity] < 70 &&
            availabilityScore >= 45 &&
            willingnessScore >= 55,
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
        building: {
          activeBuildingId: snapshot.building.activeBuildingId,
          activeBuildingName: buildingTemplate.name,
          tier: snapshot.building.activeBuildingTier,
          roomSlotCount: snapshot.building.roomSlotCount,
          roomsUsed: snapshot.rooms.length,
          operatorSlotCount: snapshot.building.operatorSlotCount,
          operatorCount: snapshot.operators?.length ?? 0,
          appliedUpgradeIds: snapshot.appliedUpgradeIds,
          unlockedRoomTemplateIds: [
            ...(BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] ?? []),
          ],
          availableBuildingUpgradeIds,
        },
        rooms: runtimeState.roomEntities.map((entity) => {
          const template = registry.rooms[RoomInstance.templateIndex[entity]] ?? registry.rooms[0];
          const availableUpgradeIds = registry.upgrades
            .filter((upgrade) => upgrade.target === "room" && upgrade.targetId === template.id)
            .filter(
              (upgrade) => !(RoomInstance.appliedUpgradeIds[entity] ?? []).includes(upgrade.id),
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
            isRequestedActive: RoomInstance.isRequestedActive[entity] === 1,
            isOperational: RoomInstance.isOperational[entity] === 1,
            capacity: RoomInstance.capacity[entity],
            occupancy: RoomInstance.occupancy[entity],
            requiredRoleTag: getRoleTag(template.tags),
            assignedStaffCount: RoomInstance.assignedStaffCount[entity],
            appliedUpgradeIds: [...(RoomInstance.appliedUpgradeIds[entity] ?? [])],
            availableUpgradeIds,
          };
        }),
        visitors: snapshot.visitors ?? [],
        operators:
          snapshot.operators?.map((operator) => {
            const readiness = operatorReadinessById.get(operator.id);

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
            };
          }) ?? [],
        operatorIntentReadiness,
        relationshipSignals:
          snapshot.operatorRelationships?.map((relationship) => ({
            ...relationship,
            cohesion: computeRelationshipCohesion(
              context,
              relationship.operatorAId,
              relationship.operatorBId,
            ),
          })) ?? [],
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
          snapshot.raidOpportunities?.map((opportunity) => ({
            ...opportunity,
            recommendedOperatorCount: getRecommendedOperatorCountForMission(
              registry.missionById.get(opportunity.missionId)?.baseDurationHours ?? 4,
            ),
            interestedCount: opportunity.interestedOperatorIds.length,
            claimedCount: opportunity.claimedOperatorIds.length,
          })) ?? [],
        activeRaids: snapshot.activeRaidPackets,
        raidSummaries: snapshot.raidSummaries,
        activeEvents: snapshot.activeEvents ?? [],
      };
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
): AscensionSimulation {
  return applyWorldSnapshot(snapshot, registry);
}
