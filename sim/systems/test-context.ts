import { addComponent, addEntity, createWorld } from "bitecs";

import { templateRegistry } from "content/templates";
import type { TemplateRegistry } from "content/templates";
import { DEFAULT_POLICY_STATE, type PolicyState } from "lib/policies";
import {
  AssignmentState,
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RaidParticipationState,
  WorldTimeState,
} from "../components";
import type {
  ActiveRaidPacketRecord,
  ContractLifecyclePhase,
  ContractResultSummary,
  ContractSiteState,
  FogOfWarState,
  PostedContract,
  RaidSummaryRecord,
} from "../components/building-authority";
import type { SimRuntimeState, SimSystemContext } from "./types";

interface CreateSimTestContextOptions {
  registry?: TemplateRegistry;
  guild?: {
    reputation?: number;
    treasury?: number;
    intel?: number;
  };
  time?: {
    tick?: number;
    day?: number;
    minuteOfDay?: number;
  };
  building?: InitializeBuildingAuthorityOptions;
}

interface InitializeBuildingAuthorityOptions {
  activeBuildingTemplateIndex?: number;
  activeBuildingTier?: number;
  activeFloorIndex?: number;
  roomSlotCount?: number;
  operatorSlotCount?: number;
  appliedUpgradeIds?: string[];
  unlockedRoomTemplateIds?: string[];
  unlockedRoomTierByTemplateId?: Record<string, number>;
  roomCapacityModifiers?: Record<string, number>;
  needRateMultipliers?: Record<string, number>;
  attractionWeightByTag?: Record<string, number>;
  recoveryRateModifier?: number;
  trainingRateModifier?: number;
  moraleModifier?: number;
  loyaltyModifier?: number;
  resourceIncomeModifiers?: Record<string, number>;
  resourceCostMultipliers?: Record<string, number>;
  activeRaidPackets?: ActiveRaidPacketRecord[];
  raidSummaries?: RaidSummaryRecord[];
  pressure?: number;
  lastPayrollDay?: number;
  lastVisitorSpawnTick?: number;
  lastEventTick?: number;
  lastRaidOpportunityTick?: number;
  contractSite?: ContractSiteState | null;
  fogOfWar?: FogOfWarState | null;
  contractLifecycle?: ContractLifecyclePhase;
  postedContracts?: PostedContract[];
  contractResult?: ContractResultSummary | null;
  policies?: Partial<PolicyState>;
}

function createBaseRuntimeState(): SimRuntimeState {
  return {
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
    nextRoomSequence: 1,
    nextOperatorSequence: 1,
    nextOpportunitySequence: 1,
    nextStaffSequence: 1,
    nextVisitorSequence: 1,
    nextRaidSequence: 1,
    nextEventSequence: 1,
    nextTeamSequence: 1,
    pendingCueIds: [],
    pendingEvents: [],
    raidPresentation: {
      contractSiteId: null,
      teams: [],
      enemies: [],
      features: [],
    },
    activeEncounter: null,
    interruptionQueue: { active: null, queue: [], nextInstanceId: 1 },
    incidentState: {
      pendingIncident: null,
      history: [],
      cooldowns: {},
      nextInstanceId: 1,
      lastEvaluationMinute: 0,
    },
    guidanceState: {
      seenBeatIds: [],
      completedBeatIds: [],
      dismissedBeatIds: [],
      activeBeatId: null,
      activeBeatView: null,
      queuedBeatIds: [],
      lastEvaluationMinute: 0,
      openingPathState: "completed",
      anchorResolutionFailures: [],
      activeBeatProgressBaseline: null,
      interactionCounts: {
        staffingActions: 0,
        upgradesPurchased: 0,
      },
    },
    kitRegistry: {
      regularAttacks: [],
      skills: [],
      ultimates: [],
      passives: [],
      regularAttackById: new Map(),
      skillById: new Map(),
      ultimateById: new Map(),
      passiveById: new Map(),
    },
    worldTimeFrozen: false,
  };
}

export function createSimTestContext(options: CreateSimTestContextOptions = {}): SimSystemContext {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.reputation[guildEntity] = options.guild?.reputation ?? 0;
  GuildState.treasury[guildEntity] = options.guild?.treasury ?? 0;
  GuildState.intel[guildEntity] = options.guild?.intel ?? 0;

  WorldTimeState.tick[timeEntity] = options.time?.tick ?? 0;
  WorldTimeState.day[timeEntity] = options.time?.day ?? 1;
  WorldTimeState.minuteOfDay[timeEntity] = options.time?.minuteOfDay ?? 0;

  const context: SimSystemContext = {
    world,
    registry: options.registry ?? templateRegistry,
    singletonEntities: {
      guild: guildEntity,
      time: timeEntity,
      building: buildingEntity,
    },
    runtimeState: createBaseRuntimeState(),
  };

  initializeBuildingAuthority(context, options.building);
  return context;
}

export function initializeBuildingAuthority(
  context: SimSystemContext,
  options: InitializeBuildingAuthorityOptions = {},
): void {
  const buildingEntity = context.singletonEntities.building;

  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] =
    options.activeBuildingTemplateIndex ?? 0;
  BuildingAuthority.activeBuildingTier[buildingEntity] = options.activeBuildingTier ?? 1;
  BuildingAuthority.activeFloorIndex[buildingEntity] = options.activeFloorIndex ?? 0;
  BuildingAuthority.roomSlotCount[buildingEntity] = options.roomSlotCount ?? 0;
  BuildingAuthority.operatorSlotCount[buildingEntity] = options.operatorSlotCount ?? 0;
  BuildingAuthority.appliedUpgradeIds[buildingEntity] = [...(options.appliedUpgradeIds ?? [])];
  BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] = [
    ...(options.unlockedRoomTemplateIds ?? []),
  ];
  BuildingAuthority.unlockedRoomTierByTemplateId[buildingEntity] = {
    ...options.unlockedRoomTierByTemplateId,
  };
  BuildingAuthority.roomCapacityModifiers[buildingEntity] = {
    ...options.roomCapacityModifiers,
  };
  BuildingAuthority.needRateMultipliers[buildingEntity] = {
    ...options.needRateMultipliers,
  };
  BuildingAuthority.attractionWeightByTag[buildingEntity] = {
    ...options.attractionWeightByTag,
  };
  BuildingAuthority.recoveryRateModifier[buildingEntity] = options.recoveryRateModifier ?? 0;
  BuildingAuthority.trainingRateModifier[buildingEntity] = options.trainingRateModifier ?? 0;
  BuildingAuthority.moraleModifier[buildingEntity] = options.moraleModifier ?? 0;
  BuildingAuthority.loyaltyModifier[buildingEntity] = options.loyaltyModifier ?? 0;
  BuildingAuthority.resourceIncomeModifiers[buildingEntity] = {
    ...options.resourceIncomeModifiers,
  };
  BuildingAuthority.resourceCostMultipliers[buildingEntity] = {
    ...options.resourceCostMultipliers,
  };
  BuildingAuthority.activeRaidPackets[buildingEntity] = [...(options.activeRaidPackets ?? [])];
  BuildingAuthority.raidSummaries[buildingEntity] = [...(options.raidSummaries ?? [])];
  BuildingAuthority.pressure[buildingEntity] = options.pressure ?? 0;
  BuildingAuthority.lastPayrollDay[buildingEntity] = options.lastPayrollDay ?? 0;
  BuildingAuthority.lastVisitorSpawnTick[buildingEntity] = options.lastVisitorSpawnTick ?? 0;
  BuildingAuthority.lastEventTick[buildingEntity] = options.lastEventTick ?? 0;
  BuildingAuthority.lastRaidOpportunityTick[buildingEntity] = options.lastRaidOpportunityTick ?? 0;
  BuildingAuthority.contractSite[buildingEntity] = options.contractSite ?? null;
  BuildingAuthority.fogOfWar[buildingEntity] = options.fogOfWar ?? null;
  BuildingAuthority.contractLifecycle[buildingEntity] = options.contractLifecycle ?? "bidding";
  BuildingAuthority.postedContracts[buildingEntity] = [...(options.postedContracts ?? [])];
  BuildingAuthority.contractResult[buildingEntity] = options.contractResult ?? null;
  BuildingAuthority.policies[buildingEntity] = options.policies
    ? ({ ...options.policies } as PolicyState)
    : { ...DEFAULT_POLICY_STATE };
}

export function addActiveTestOperators(context: SimSystemContext, count: number): number[] {
  const entities: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const entity = addEntity(context.world);
    addComponent(context.world, entity, OperatorIdentity);
    addComponent(context.world, entity, RaidParticipationState);
    addComponent(context.world, entity, AssignmentState);

    OperatorIdentity.id[entity] = `operator-${index}`;
    OperatorIdentity.name[entity] = `Operator ${index}`;
    OperatorIdentity.roleTag[entity] = "role:field_lead";
    OperatorIdentity.lifecycleStatus[entity] = "active";
    RaidParticipationState.activeRaidId[entity] = "";
    AssignmentState.kind[entity] = "idle";
    AssignmentState.targetId[entity] = "";

    context.runtimeState.operatorEntities.push(entity);
    entities.push(entity);
  }

  context.runtimeState.nextOperatorSequence = context.runtimeState.operatorEntities.length + 1;
  return entities;
}
