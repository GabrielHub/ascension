import { addComponent, addEntity, removeEntity } from "bitecs";

import { getBuildingFloors, getBuildingLayout } from "content/building-layouts";
import { evaluateRequirement, type RequirementEvaluationContext } from "content/requirements";
import type { UpgradeTemplate } from "content/templates";
import {
  getNextPendingRoomUpgradeIds,
  getRoomActiveFootprint,
  getRoomStateId,
  getSlotKey,
} from "lib/hq-room-state";
import { stableStringHash } from "lib/stable-hash";
import { selectOperatorAppearanceRecipeId } from "save/appearance";

import type { SimCommand } from "../commands";
import { buyItem, sellItem, getMarketPriceForItem } from "./market";
import { autoSelectAccessory, unequipItem } from "./inventory";
import {
  AssignmentState,
  BuildingAuthority,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  PreferenceState,
  RaidParticipationState,
  Renderable,
  RoomInstance,
  ScheduleState,
  StaffState,
  VisitorState,
  WorldTimeState,
} from "../components";
import { ensureOperatorDispositionEntity, ensureRoomCultureEntity } from "./social";
import type { RuntimeEvent, SimSystemContext } from "./types";

// Late-bound encounter/interruption/incident command handler.
// Registered at system init time by encounter-commands.ts to break circular imports.
let encounterCommandHandler:
  | ((context: SimSystemContext, type: string, payload: Record<string, unknown>) => boolean)
  | null = null;

export function registerEncounterCommandHandler(
  handler: (context: SimSystemContext, type: string, payload: Record<string, unknown>) => boolean,
): void {
  encounterCommandHandler = handler;
}

const ROLE_TAG_PREFIX = "role:";
const STAFF_TAG_PREFIX = "staff:";
const CANONICAL_STAFF_ROLE_TAGS = [
  "staff:reception",
  "staff:logistics",
  "staff:maintenance",
  "staff:medical",
  "staff:admin",
] as const;
type CanonicalStaffRoleTag = (typeof CANONICAL_STAFF_ROLE_TAGS)[number];
const canonicalStaffRoleTagSet = new Set<string>(CANONICAL_STAFF_ROLE_TAGS);
const STAFF_ROLE_TAG_ALIASES: Record<string, CanonicalStaffRoleTag> = {
  reception: "staff:reception",
  "role:reception": "staff:reception",
  "staff:reception": "staff:reception",
  logistics: "staff:logistics",
  "staff:logistics": "staff:logistics",
  maintenance: "staff:maintenance",
  "staff:maintenance": "staff:maintenance",
  medical: "staff:medical",
  "role:medic": "staff:medical",
  "staff:medical": "staff:medical",
  admin: "staff:admin",
  administrative: "staff:admin",
  general: "staff:admin",
  recruitment: "staff:admin",
  "role:recruitment": "staff:admin",
  "staff:admin": "staff:admin",
};
const DEFAULT_SHIFT_START = 480;
const DEFAULT_SHIFT_END = 1080;
const DEFAULT_HISTORY_TAG_LIMIT = 6;
const PREFERRED_MISSION_TAGS = [
  ["mission:combat", "objective:clear"],
  ["mission:stability", "objective:hold"],
  ["mission:retrieval", "objective:escort"],
] as const;

export const scoreString = stableStringHash;

export interface VisitorSeed {
  id?: string;
  name: string;
  desiredRoleTag: string;
  patience: number;
  quality: number;
  expectedLoyalty: number;
}

export interface PreferenceProfileRecord {
  riskTolerance: number;
  rewardFocus: number;
  recoveryBias: number;
  socialBias: number;
  trainingBias: number;
  comfortBias: number;
  preferredMissionTags: string[];
  preferredPartnerIds: string[];
}

export interface RelationshipRecordData {
  operatorAId: string;
  operatorBId: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  historyTags: string[];
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getPairOrder(leftId: string, rightId: string) {
  return leftId.localeCompare(rightId) <= 0 ? [leftId, rightId] : [rightId, leftId];
}

export function appendHistoryTags(
  existing: readonly string[],
  additions: readonly string[],
): string[] {
  const next = [...existing];

  additions.forEach((tag) => {
    if (!next.includes(tag)) {
      next.push(tag);
    }
  });

  return next.slice(-DEFAULT_HISTORY_TAG_LIMIT);
}

export function buildDefaultPreferenceProfile(source: {
  name: string;
  roleTag: string;
  specialtyTag: string;
}): PreferenceProfileRecord {
  const identityScore = scoreString(`${source.name}:${source.roleTag}:${source.specialtyTag}`);
  const missionPreference = PREFERRED_MISSION_TAGS[identityScore % PREFERRED_MISSION_TAGS.length];

  return {
    riskTolerance: clamp(32 + (identityScore % 45), 20, 88),
    rewardFocus: clamp(40 + ((identityScore >> 1) % 42), 28, 92),
    recoveryBias: clamp(24 + ((identityScore >> 2) % 48), 15, 88),
    socialBias: clamp(22 + ((identityScore >> 3) % 52), 12, 90),
    trainingBias: clamp(26 + ((identityScore >> 4) % 46), 15, 90),
    comfortBias: clamp(20 + ((identityScore >> 5) % 50), 10, 88),
    preferredMissionTags: [...missionPreference],
    preferredPartnerIds: [],
  };
}

export function buildInitialRelationshipRecord(
  left: {
    id: string;
    roleTag: string;
    specialtyTag: string;
    preferences: PreferenceProfileRecord;
  },
  right: {
    id: string;
    roleTag: string;
    specialtyTag: string;
    preferences: PreferenceProfileRecord;
  },
): RelationshipRecordData {
  const [operatorAId, operatorBId] = getPairOrder(left.id, right.id);
  const roleAlignment = left.roleTag === right.roleTag ? 7 : 0;
  const specialtyAlignment = left.specialtyTag === right.specialtyTag ? 8 : 0;
  const riskGap = Math.abs(left.preferences.riskTolerance - right.preferences.riskTolerance);
  const rewardGap = Math.abs(left.preferences.rewardFocus - right.preferences.rewardFocus);
  const socialBlend = (left.preferences.socialBias + right.preferences.socialBias) / 2;
  const trust = clamp(
    40 + roleAlignment + specialtyAlignment + socialBlend * 0.08 - riskGap * 0.12,
    8,
    92,
  );
  const friction = clamp(
    16 + riskGap * 0.18 + rewardGap * 0.08 - roleAlignment - specialtyAlignment * 0.5,
    0,
    86,
  );
  const familiarity = clamp(24 + roleAlignment + specialtyAlignment, 4, 82);
  const historyTags = appendHistoryTags(
    [],
    [
      "history:starting_roster",
      specialtyAlignment > 0 ? "bond:shared_focus" : "history:fresh_contact",
      riskGap >= 28 ? "tension:style_gap" : "bond:workable",
    ],
  );

  return {
    operatorAId,
    operatorBId,
    trust,
    friction,
    familiarity,
    recentSharedOutcome: 0,
    historyTags,
  };
}

export function removeTrackedEntity(entities: number[], entity: number): void {
  const entityIndex = entities.indexOf(entity);
  if (entityIndex >= 0) {
    entities.splice(entityIndex, 1);
  }
}

export function getCurrentAbsoluteMinute(context: SimSystemContext): number {
  const timeEntity = context.singletonEntities.time;
  return (WorldTimeState.day[timeEntity] - 1) * 1440 + WorldTimeState.minuteOfDay[timeEntity];
}

export function formatWorldTimestamp(context: SimSystemContext): string {
  const timeEntity = context.singletonEntities.time;
  const hour = Math.floor(WorldTimeState.minuteOfDay[timeEntity] / 60)
    .toString()
    .padStart(2, "0");
  const minute = (WorldTimeState.minuteOfDay[timeEntity] % 60).toString().padStart(2, "0");
  return `day-${WorldTimeState.day[timeEntity]} ${hour}:${minute}`;
}

export function pushRuntimeEvent(
  context: SimSystemContext,
  event: Omit<RuntimeEvent, "timestamp">,
): void {
  context.runtimeState.pendingEvents.push({
    ...event,
    timestamp: formatWorldTimestamp(context),
  });
}

export function getRoleTag(tags: readonly string[]): string {
  return tags.find((tag) => tag.startsWith(ROLE_TAG_PREFIX)) ?? "role:general";
}

export function getStaffRoleTag(tags: readonly string[]): CanonicalStaffRoleTag | "" {
  const tag = tags.find((candidate) => candidate.startsWith(STAFF_TAG_PREFIX)) ?? "";
  return isCanonicalStaffRoleTag(tag) ? tag : "";
}

export function isCanonicalStaffRoleTag(value: string): value is CanonicalStaffRoleTag {
  return canonicalStaffRoleTagSet.has(value);
}

export function normalizeStaffRoleTag(value: string): CanonicalStaffRoleTag | null {
  const normalized = STAFF_ROLE_TAG_ALIASES[value.trim()];
  return normalized ?? null;
}

function getBuildingEntity(context: SimSystemContext): number {
  return context.singletonEntities.building;
}

export function getActiveBuildingTemplate(context: SimSystemContext) {
  const template =
    context.registry.buildings[
      BuildingAuthority.activeBuildingTemplateIndex[getBuildingEntity(context)]
    ];
  if (!template) {
    throw new Error("Simulation references an unknown active building template index.");
  }

  return template;
}

export function getRoomTemplateForEntity(context: SimSystemContext, entity: number) {
  const template = context.registry.rooms[RoomInstance.templateIndex[entity]];
  if (!template) {
    throw new Error(
      `Simulation references an unknown room template index for room "${RoomInstance.id[entity]}".`,
    );
  }

  return template;
}

function readResourceBalance(context: SimSystemContext, resourceId: string): number {
  const guildEntity = context.singletonEntities.guild;

  switch (resourceId) {
    case "resource/cash":
      return GuildState.treasury[guildEntity];
    case "resource/reputation":
      return GuildState.reputation[guildEntity];
    case "resource/intel":
      return GuildState.intel[guildEntity];
    default:
      return 0;
  }
}

function spendResourceBalance(context: SimSystemContext, resourceId: string, amount: number): void {
  const guildEntity = context.singletonEntities.guild;

  switch (resourceId) {
    case "resource/cash":
      GuildState.treasury[guildEntity] -= amount;
      return;
    case "resource/reputation":
      GuildState.reputation[guildEntity] -= amount;
      return;
    case "resource/intel":
      GuildState.intel[guildEntity] -= amount;
      return;
  }
}

function getRoomCounts(context: SimSystemContext): Map<string, number> {
  const counts = new Map<string, number>();

  context.runtimeState.roomEntities.forEach((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    counts.set(template.id, (counts.get(template.id) ?? 0) + 1);
  });

  return counts;
}

function getRoomTiers(context: SimSystemContext): Map<string, number> {
  const tiers = new Map<string, number>();

  context.runtimeState.roomEntities.forEach((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    tiers.set(template.id, Math.max(tiers.get(template.id) ?? 0, RoomInstance.tier[entity]));
  });

  return tiers;
}

function getStaffRoleCounts(context: SimSystemContext): Map<string, number> {
  const counts = new Map<string, number>();

  context.runtimeState.staffEntities.forEach((entity) => {
    const roleTag = StaffState.roleTag[entity];
    counts.set(roleTag, (counts.get(roleTag) ?? 0) + 1);
  });

  return counts;
}

export function buildRequirementContext(context: SimSystemContext): RequirementEvaluationContext {
  const buildingEntity = getBuildingEntity(context);
  const activeBuildingTemplate = getActiveBuildingTemplate(context);
  const unlockedTemplateTags = new Set<string>(activeBuildingTemplate.tags);

  (BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] ?? []).forEach((roomId) => {
    const roomTemplate = context.registry.roomById.get(roomId);
    roomTemplate?.tags.forEach((tag) => unlockedTemplateTags.add(tag));
  });

  return {
    resourceBalances: new Map<string, number>([
      ["resource/cash", readResourceBalance(context, "resource/cash")],
      ["resource/reputation", readResourceBalance(context, "resource/reputation")],
      ["resource/intel", readResourceBalance(context, "resource/intel")],
    ]),
    buildingTiers: new Map<string, number>([
      [activeBuildingTemplate.id, BuildingAuthority.activeBuildingTier[buildingEntity]],
    ]),
    roomCounts: getRoomCounts(context),
    roomTiers: getRoomTiers(context),
    staffRoleCounts: getStaffRoleCounts(context),
    operatorCount: context.runtimeState.operatorEntities.filter(
      (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
    ).length,
    unlockedTemplateTags,
  };
}

export function getAdjustedUpgradeCosts(
  context: SimSystemContext,
  requirements: UpgradeTemplate["requirements"],
): Map<string, number> {
  const buildingEntity = getBuildingEntity(context);
  const costMultipliers = BuildingAuthority.resourceCostMultipliers[buildingEntity] ?? {};
  const costs = new Map<string, number>();

  requirements.forEach((requirement) => {
    if (requirement.type !== "resource_min") {
      return;
    }

    costs.set(
      requirement.resourceId,
      Math.ceil(requirement.minimum * (costMultipliers[requirement.resourceId] ?? 1)),
    );
  });

  return costs;
}

export function meetsRequirements(
  context: SimSystemContext,
  requirements: UpgradeTemplate["requirements"],
  prebuiltRequirementContext?: RequirementEvaluationContext,
): boolean {
  const requirementContext = prebuiltRequirementContext ?? buildRequirementContext(context);
  return requirements.every((requirement) => evaluateRequirement(requirement, requirementContext));
}

function canAfford(context: SimSystemContext, costs: Map<string, number>): boolean {
  return Array.from(costs.entries()).every(([resourceId, amount]) => {
    return readResourceBalance(context, resourceId) >= amount;
  });
}

function applyCosts(context: SimSystemContext, costs: Map<string, number>): void {
  costs.forEach((amount, resourceId) => {
    spendResourceBalance(context, resourceId, amount);
  });
}

function getFallbackRoomPlacement(slotIndex: number, floorIndex = 0, slotId?: string) {
  const column = slotIndex % 2;
  const row = Math.floor(slotIndex / 2);
  return {
    floorIndex,
    slotId: slotId ?? `slot/${slotIndex}`,
    reservedFootprint: { col: column * 4, row: row * 3, cols: 4, rows: 3 },
  };
}

function resolveAvailableRoomPlacement(
  context: SimSystemContext,
  placement?: {
    slotId?: string;
    floorIndex?: number;
  },
) {
  const slotIndex = context.runtimeState.roomEntities.length;
  const buildingEntity = context.singletonEntities.building;
  const buildingTemplate =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];
  const requestedFloorIndex =
    placement?.floorIndex ?? BuildingAuthority.activeFloorIndex[buildingEntity] ?? 0;

  if (!buildingTemplate) {
    return getFallbackRoomPlacement(slotIndex, requestedFloorIndex, placement?.slotId);
  }

  const orderedSlots = getBuildingFloors(
    buildingTemplate.id,
    BuildingAuthority.activeBuildingTier[buildingEntity],
  ).flatMap((floor) =>
    floor.slots.map((slot) => ({
      floorIndex: floor.floorIndex,
      slotId: slot.slotId,
      reservedFootprint: { col: slot.col, row: slot.row, cols: slot.cols, rows: slot.rows },
    })),
  );
  if (orderedSlots.length === 0) {
    return getFallbackRoomPlacement(slotIndex, requestedFloorIndex, placement?.slotId);
  }

  const unlockedSlots = orderedSlots.slice(
    0,
    Math.max(0, BuildingAuthority.roomSlotCount[buildingEntity] ?? 0),
  );
  const occupiedSlotKeys = new Set(
    context.runtimeState.roomEntities.map((entity) =>
      getSlotKey(RoomInstance.floorIndex[entity] ?? 0, RoomInstance.slotId[entity]),
    ),
  );

  const requestedSlot = placement?.slotId
    ? unlockedSlots.find(
        (slot) =>
          slot.floorIndex === requestedFloorIndex &&
          slot.slotId === placement.slotId &&
          !occupiedSlotKeys.has(getSlotKey(slot.floorIndex, slot.slotId)),
      )
    : undefined;
  if (requestedSlot) {
    return requestedSlot;
  }

  if (placement?.slotId) {
    return null;
  }

  return (
    unlockedSlots.find(
      (slot) =>
        slot.floorIndex === requestedFloorIndex &&
        !occupiedSlotKeys.has(getSlotKey(slot.floorIndex, slot.slotId)),
    ) ?? null
  );
}

function createRoomInstanceEntity(
  context: SimSystemContext,
  templateId: string,
  placement: {
    slotId: string;
    floorIndex: number;
    reservedFootprint: {
      col: number;
      row: number;
      cols: number;
      rows: number;
    };
  },
  footprint?: {
    col?: number;
    row?: number;
    cols?: number;
    rows?: number;
  },
): void {
  const template = context.registry.roomById.get(templateId);
  if (!template) {
    return;
  }

  const entity = addEntity(context.world);
  const slotIndex = context.runtimeState.roomEntities.length;
  const reservedFootprint = {
    col: footprint?.col ?? placement.reservedFootprint.col,
    row: footprint?.row ?? placement.reservedFootprint.row,
    cols: footprint?.cols ?? placement.reservedFootprint.cols,
    rows: footprint?.rows ?? placement.reservedFootprint.rows,
  };
  const activeFootprint = getRoomActiveFootprint(template.id, reservedFootprint, []);

  addComponent(context.world, entity, RoomInstance);
  addComponent(context.world, entity, Renderable);

  RoomInstance.id[entity] =
    `room-instance/${template.id.slice("room/".length).replace(":tier_", "-tier-")}-${context.runtimeState.nextRoomSequence}`;
  const templateIndex = context.registry.roomIndexById.get(template.id);
  if (templateIndex === undefined) {
    throw new Error(`Simulation cannot place room with unknown template "${template.id}".`);
  }

  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.floorIndex[entity] = placement.floorIndex;
  RoomInstance.slotId[entity] = placement.slotId;
  RoomInstance.roomStateId[entity] = getRoomStateId(template.id, []);
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isRequestedActive[entity] = 0;
  RoomInstance.isOperational[entity] = 0;
  RoomInstance.assignedStaffCount[entity] = 0;
  RoomInstance.appliedUpgradeIds[entity] = [];
  RoomInstance.slotIndex[entity] = slotIndex;
  RoomInstance.reservedCol[entity] = reservedFootprint.col;
  RoomInstance.reservedRow[entity] = reservedFootprint.row;
  RoomInstance.reservedCols[entity] = reservedFootprint.cols;
  RoomInstance.reservedRows[entity] = reservedFootprint.rows;

  Renderable.col[entity] = activeFootprint.col;
  Renderable.row[entity] = activeFootprint.row;
  Renderable.cols[entity] = activeFootprint.cols;
  Renderable.rows[entity] = activeFootprint.rows;
  Renderable.layer[entity] = 1;

  context.runtimeState.roomEntities.push(entity);
  ensureRoomCultureEntity(context, RoomInstance.id[entity], template.tags);
  context.runtimeState.nextRoomSequence += 1;
}

function createOperatorEntity(
  context: SimSystemContext,
  source: {
    name: string;
    roleTag: string;
    specialtyTag: string;
    appearancePresetId: string;
    visibleGear?: {
      weaponPartId?: string;
      outfitOverlayPartId?: string;
      accessoryPartId?: string;
    };
    preferences?: PreferenceProfileRecord;
    morale: number;
    loyalty: number;
    hunger: number;
    fatigue: number;
    stress: number;
    schedule?: {
      currentBlock: string;
      workStartMinute: number;
      workEndMinute: number;
    };
  },
): number {
  const entity = addEntity(context.world);
  const preferences =
    source.preferences ??
    buildDefaultPreferenceProfile({
      name: source.name,
      roleTag: source.roleTag,
      specialtyTag: source.specialtyTag,
    });

  addComponent(context.world, entity, OperatorIdentity);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, LoyaltyState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, PreferenceState);
  addComponent(context.world, entity, RaidParticipationState);
  addComponent(context.world, entity, InjuryState);

  OperatorIdentity.id[entity] = `operator/${context.runtimeState.nextOperatorSequence}`;
  OperatorIdentity.name[entity] = source.name;
  OperatorIdentity.roleTag[entity] = source.roleTag;
  OperatorIdentity.specialtyTag[entity] = source.specialtyTag;
  OperatorIdentity.appearancePresetId[entity] = source.appearancePresetId;
  OperatorIdentity.appearanceWeaponPartId[entity] = source.visibleGear?.weaponPartId ?? "";
  OperatorIdentity.appearanceOutfitOverlayPartId[entity] =
    source.visibleGear?.outfitOverlayPartId ?? "";
  OperatorIdentity.appearanceAccessoryPartId[entity] = source.visibleGear?.accessoryPartId ?? "";
  OperatorIdentity.lifecycleStatus[entity] = "active";
  OperatorIdentity.deathTick[entity] = 0;
  OperatorIdentity.deathRaidSummaryId[entity] = "";
  OperatorIdentity.departureTick[entity] = 0;
  OperatorIdentity.departureReason[entity] = "";
  NeedState.hunger[entity] = source.hunger;
  NeedState.fatigue[entity] = source.fatigue;
  NeedState.stress[entity] = source.stress;
  MoraleState.current[entity] = source.morale;
  MoraleState.baseline[entity] = source.morale;
  LoyaltyState.current[entity] = source.loyalty;
  LoyaltyState.baseline[entity] = source.loyalty;
  ScheduleState.currentBlock[entity] = source.schedule?.currentBlock ?? "idle";
  ScheduleState.workStartMinute[entity] = source.schedule?.workStartMinute ?? DEFAULT_SHIFT_START;
  ScheduleState.workEndMinute[entity] = source.schedule?.workEndMinute ?? DEFAULT_SHIFT_END;
  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  PreferenceState.riskTolerance[entity] = preferences.riskTolerance;
  PreferenceState.rewardFocus[entity] = preferences.rewardFocus;
  PreferenceState.recoveryBias[entity] = preferences.recoveryBias;
  PreferenceState.socialBias[entity] = preferences.socialBias;
  PreferenceState.trainingBias[entity] = preferences.trainingBias;
  PreferenceState.comfortBias[entity] = preferences.comfortBias;
  PreferenceState.preferredMissionTags[entity] = [...preferences.preferredMissionTags];
  PreferenceState.preferredPartnerIds[entity] = [...preferences.preferredPartnerIds];
  RaidParticipationState.activeRaidId[entity] = "";
  RaidParticipationState.missionId[entity] = "";
  RaidParticipationState.returnTick[entity] = 0;
  InjuryState.severity[entity] = 0;
  InjuryState.recoveryHoursRemaining[entity] = 0;
  InjuryState.treated[entity] = 0;

  context.runtimeState.operatorEntities.push(entity);
  ensureOperatorDispositionEntity(context, OperatorIdentity.id[entity]);
  context.runtimeState.nextOperatorSequence += 1;
  return entity;
}

// Name pool for dynamically hired staff (deterministic by sequence number).
const STAFF_NAMES: readonly string[] = [
  "Dana Wolfe",
  "Emile Nava",
  "Freya Cobb",
  "Gael Moran",
  "Hiro Vance",
  "Ida Kwan",
  "Jasper Doyle",
  "Kira Sato",
  "Leo Vidal",
  "Maren Cho",
  "Nico Stein",
  "Olive Ruiz",
  "Pax Lindahl",
  "Remy Serra",
  "Suki Roth",
  "Tomas Carr",
  "Uma Phan",
  "Victor Albright",
  "Wren Ito",
  "Zara Medina",
];

function createStaffEntity(context: SimSystemContext, roleTag: string): boolean {
  const normalizedRoleTag = normalizeStaffRoleTag(roleTag);
  if (!normalizedRoleTag) {
    return false;
  }

  const entity = addEntity(context.world);

  addComponent(context.world, entity, StaffState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, LoyaltyState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, InjuryState);

  const seq = context.runtimeState.nextStaffSequence;
  StaffState.id[entity] = `staff/${seq}`;
  StaffState.name[entity] = STAFF_NAMES[seq % STAFF_NAMES.length];
  StaffState.roleTag[entity] = normalizedRoleTag;
  StaffState.status[entity] = "available";
  StaffState.wage[entity] = 16 + (scoreString(roleTag) % 7);
  MoraleState.current[entity] = 58;
  MoraleState.baseline[entity] = 58;
  LoyaltyState.current[entity] = 54;
  LoyaltyState.baseline[entity] = 54;
  ScheduleState.currentBlock[entity] = "idle";
  ScheduleState.workStartMinute[entity] = DEFAULT_SHIFT_START;
  ScheduleState.workEndMinute[entity] = DEFAULT_SHIFT_END;
  AssignmentState.kind[entity] = "idle";
  AssignmentState.targetId[entity] = "";
  NeedState.hunger[entity] = 18;
  NeedState.fatigue[entity] = 24;
  NeedState.stress[entity] = 14;
  InjuryState.severity[entity] = 0;
  InjuryState.recoveryHoursRemaining[entity] = 0;
  InjuryState.treated[entity] = 0;

  context.runtimeState.staffEntities.push(entity);
  context.runtimeState.nextStaffSequence += 1;
  return true;
}

export function spawnVisitorEntity(context: SimSystemContext, seed: VisitorSeed): void {
  const entity = addEntity(context.world);

  addComponent(context.world, entity, VisitorState);

  VisitorState.id[entity] = seed.id ?? `visitor/${context.runtimeState.nextVisitorSequence}`;
  VisitorState.name[entity] = seed.name;
  VisitorState.desiredRoleTag[entity] = seed.desiredRoleTag;
  VisitorState.patience[entity] = seed.patience;
  VisitorState.quality[entity] = seed.quality;
  VisitorState.expectedLoyalty[entity] = seed.expectedLoyalty;

  context.runtimeState.visitorEntities.push(entity);
  context.runtimeState.nextVisitorSequence += 1;
}

function findRoomEntityById(context: SimSystemContext, roomId: string): number | undefined {
  return context.runtimeState.roomEntities.find((entity) => RoomInstance.id[entity] === roomId);
}

function findVisitorEntityById(context: SimSystemContext, visitorId: string): number | undefined {
  return context.runtimeState.visitorEntities.find(
    (entity) => VisitorState.id[entity] === visitorId,
  );
}

function findStaffEntityById(context: SimSystemContext, staffId: string): number | undefined {
  return context.runtimeState.staffEntities.find((entity) => StaffState.id[entity] === staffId);
}

export function hasOperationalRecruitmentRoom(context: SimSystemContext): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.tags.includes("ops:recruitment") && RoomInstance.isOperational[entity] === 1;
  });
}

export function getRecruitmentRoomCapacity(context: SimSystemContext): number {
  let total = 0;
  for (const entity of context.runtimeState.roomEntities) {
    const template = getRoomTemplateForEntity(context, entity);
    if (template.tags.includes("ops:recruitment") && RoomInstance.isOperational[entity] === 1) {
      total += RoomInstance.capacity[entity] ?? template.baseCapacity;
    }
  }
  return total;
}

export function getRecruitmentRoomId(context: SimSystemContext): string | undefined {
  for (const entity of context.runtimeState.roomEntities) {
    const template = getRoomTemplateForEntity(context, entity);
    if (template.tags.includes("ops:recruitment") && RoomInstance.isOperational[entity] === 1) {
      return RoomInstance.id[entity];
    }
  }
  return undefined;
}

export function applySimCommand(context: SimSystemContext, command: SimCommand): void {
  const buildingEntity = getBuildingEntity(context);

  switch (command.type) {
    case "sim/tick":
      return;
    case "sim/place-room": {
      const template = context.registry.roomById.get(command.templateId);
      if (!template) {
        return;
      }

      const activeBuildingTemplate = getActiveBuildingTemplate(context);
      const unlockedRoomTemplateIds =
        BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] ?? [];
      if (
        context.runtimeState.roomEntities.length >=
          BuildingAuthority.roomSlotCount[buildingEntity] ||
        !template.availableInBuildings.includes(activeBuildingTemplate.id) ||
        !unlockedRoomTemplateIds.includes(template.id) ||
        context.runtimeState.roomEntities.some((entity) => {
          const existingTemplate = getRoomTemplateForEntity(context, entity);
          return existingTemplate.id === template.id;
        })
      ) {
        return;
      }

      const placement = resolveAvailableRoomPlacement(context, {
        slotId: command.slotId,
        floorIndex: command.floorIndex,
      });
      if (!placement) {
        return;
      }

      if (
        context.runtimeState.roomEntities.some(
          (entity) =>
            RoomInstance.slotId[entity] === placement.slotId &&
            RoomInstance.floorIndex[entity] === placement.floorIndex,
        )
      ) {
        return;
      }

      createRoomInstanceEntity(context, template.id, placement, command.footprint);
      return;
    }
    case "sim/set-active-floor": {
      const floors = getBuildingLayout(
        getActiveBuildingTemplate(context).id,
        command.floorIndex,
        BuildingAuthority.activeBuildingTier[buildingEntity],
      );
      if (!floors) {
        return;
      }

      BuildingAuthority.activeFloorIndex[buildingEntity] = command.floorIndex;
      return;
    }
    case "sim/set-room-active": {
      const roomEntity = findRoomEntityById(context, command.roomId);
      if (roomEntity === undefined) {
        return;
      }

      RoomInstance.isRequestedActive[roomEntity] = command.isActive ? 1 : 0;
      return;
    }
    case "sim/purchase-building-upgrade": {
      const upgrade = context.registry.upgradeById.get(command.upgradeId);
      if (!upgrade || upgrade.target !== "building") {
        return;
      }

      if (upgrade.targetId !== getActiveBuildingTemplate(context).id) {
        return;
      }

      const appliedUpgradeIds = BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? [];
      if (
        appliedUpgradeIds.includes(upgrade.id) ||
        !meetsRequirements(context, upgrade.requirements)
      ) {
        return;
      }

      const costs = getAdjustedUpgradeCosts(context, upgrade.requirements);
      if (!canAfford(context, costs)) {
        return;
      }

      applyCosts(context, costs);
      BuildingAuthority.appliedUpgradeIds[buildingEntity] = [...appliedUpgradeIds, upgrade.id];
      return;
    }
    case "sim/purchase-room-upgrade": {
      const roomEntity = findRoomEntityById(context, command.roomId);
      const upgrade = context.registry.upgradeById.get(command.upgradeId);
      if (roomEntity === undefined || !upgrade || upgrade.target !== "room") {
        return;
      }

      const template = getRoomTemplateForEntity(context, roomEntity);
      if (upgrade.targetId !== template.id) {
        return;
      }

      const appliedUpgradeIds = RoomInstance.appliedUpgradeIds[roomEntity] ?? [];
      const nextPendingIds = getNextPendingRoomUpgradeIds(template.id, appliedUpgradeIds);
      if (
        appliedUpgradeIds.includes(upgrade.id) ||
        (nextPendingIds.length > 0 && !nextPendingIds.includes(upgrade.id)) ||
        !meetsRequirements(context, upgrade.requirements)
      ) {
        return;
      }

      const costs = getAdjustedUpgradeCosts(context, upgrade.requirements);
      if (!canAfford(context, costs)) {
        return;
      }

      applyCosts(context, costs);
      const nextAppliedUpgradeIds = [...appliedUpgradeIds, upgrade.id];
      RoomInstance.appliedUpgradeIds[roomEntity] = nextAppliedUpgradeIds;
      RoomInstance.roomStateId[roomEntity] = getRoomStateId(template.id, nextAppliedUpgradeIds);
      const activeFootprint = getRoomActiveFootprint(
        template.id,
        {
          col: RoomInstance.reservedCol[roomEntity],
          row: RoomInstance.reservedRow[roomEntity],
          cols: RoomInstance.reservedCols[roomEntity],
          rows: RoomInstance.reservedRows[roomEntity],
        },
        nextAppliedUpgradeIds,
      );
      Renderable.col[roomEntity] = activeFootprint.col;
      Renderable.row[roomEntity] = activeFootprint.row;
      Renderable.cols[roomEntity] = activeFootprint.cols;
      Renderable.rows[roomEntity] = activeFootprint.rows;
      return;
    }
    case "sim/accept-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      const livingOperatorCount = context.runtimeState.operatorEntities.filter(
        (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
      ).length;
      if (
        visitorEntity === undefined ||
        livingOperatorCount >= BuildingAuthority.operatorSlotCount[buildingEntity] ||
        !hasOperationalRecruitmentRoom(context)
      ) {
        return;
      }

      const preferences = buildDefaultPreferenceProfile({
        name: VisitorState.name[visitorEntity],
        roleTag: VisitorState.desiredRoleTag[visitorEntity],
        specialtyTag: `focus:${VisitorState.desiredRoleTag[visitorEntity].slice(ROLE_TAG_PREFIX.length)}`,
      });
      const recruitSpecialtyTag = `focus:${VisitorState.desiredRoleTag[visitorEntity].slice(ROLE_TAG_PREFIX.length)}`;
      createOperatorEntity(context, {
        name: VisitorState.name[visitorEntity],
        roleTag: VisitorState.desiredRoleTag[visitorEntity],
        specialtyTag: recruitSpecialtyTag,
        appearancePresetId: selectOperatorAppearanceRecipeId({
          stableKey: [
            VisitorState.id[visitorEntity],
            VisitorState.name[visitorEntity],
            VisitorState.desiredRoleTag[visitorEntity],
            recruitSpecialtyTag,
          ].join(":"),
        }),
        preferences,
        morale: clamp(52 + VisitorState.quality[visitorEntity] * 0.2, 40, 80),
        loyalty: clamp(VisitorState.expectedLoyalty[visitorEntity], 35, 85),
        hunger: 10,
        fatigue: 12,
        stress: 18,
      });

      const recruitName = VisitorState.name[visitorEntity];
      removeEntity(context.world, visitorEntity);
      removeTrackedEntity(context.runtimeState.visitorEntities, visitorEntity);
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${recruitName} joined the roster`,
        accent: "gold",
        targetKind: "operator",
        targetId:
          OperatorIdentity.id[
            context.runtimeState.operatorEntities[context.runtimeState.operatorEntities.length - 1]
          ],
      });
      return;
    }
    case "sim/reject-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (visitorEntity === undefined) {
        return;
      }

      const rejectName = VisitorState.name[visitorEntity];
      removeEntity(context.world, visitorEntity);
      removeTrackedEntity(context.runtimeState.visitorEntities, visitorEntity);
      GuildState.reputation[context.singletonEntities.guild] -= 1;
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${rejectName} was turned away (-1 rep)`,
        accent: "ember",
      });
      return;
    }
    case "sim/hire-staff": {
      const normalizedRoleTag = normalizeStaffRoleTag(command.roleTag);
      if (!normalizedRoleTag) {
        return;
      }

      const hiringCost = 28 + (scoreString(command.roleTag) % 9);
      if (readResourceBalance(context, "resource/cash") < hiringCost) {
        return;
      }

      spendResourceBalance(context, "resource/cash", hiringCost);
      createStaffEntity(context, normalizedRoleTag);
      return;
    }
    case "sim/assign-staff": {
      const staffEntity = findStaffEntityById(context, command.staffId);
      if (staffEntity === undefined) {
        return;
      }

      if (!command.roomId) {
        AssignmentState.kind[staffEntity] = "idle";
        AssignmentState.targetId[staffEntity] = "";
        return;
      }

      const roomEntity = findRoomEntityById(context, command.roomId);
      if (roomEntity === undefined) {
        return;
      }

      const template = getRoomTemplateForEntity(context, roomEntity);
      const requiredStaffRoleTag = getStaffRoleTag(template.tags);
      if (!requiredStaffRoleTag || StaffState.roleTag[staffEntity] !== requiredStaffRoleTag) {
        return;
      }

      AssignmentState.kind[staffEntity] = "room";
      AssignmentState.targetId[staffEntity] = command.roomId;
      return;
    }

    case "sim/buy-item": {
      const price = getMarketPriceForItem(context.registry, command.itemId);
      if (!price || price.buyPrice <= 0) return;
      if (!buyItem(context, command.itemId, price.buyPrice)) {
        return;
      }
      const itemName = context.registry.itemById.get(command.itemId)?.name ?? command.itemId;
      pushRuntimeEvent(context, {
        kind: "resource_swing",
        message: `Bought ${itemName} for $${price.buyPrice}`,
        accent: "gold",
      });
      return;
    }
    case "sim/sell-item": {
      if (command.quantity <= 0) {
        return;
      }
      const pricing = getMarketPriceForItem(context.registry, command.itemId);
      if (!pricing || pricing.sellPrice <= 0) return;
      if (!sellItem(context, command.itemId, command.quantity, pricing.sellPrice)) {
        return;
      }
      const itemName = context.registry.itemById.get(command.itemId)?.name ?? command.itemId;
      pushRuntimeEvent(context, {
        kind: "resource_swing",
        message: `Sold ${command.quantity} ${itemName}${command.quantity === 1 ? "" : "s"} for $${pricing.sellPrice * command.quantity}`,
        accent: "gold",
      });
      return;
    }
    case "sim/auto-assign-accessory": {
      const operatorEntity = context.runtimeState.operatorEntities.find(
        (entity) => OperatorIdentity.id[entity] === command.operatorId,
      );
      if (operatorEntity === undefined) {
        return;
      }
      autoSelectAccessory(context, command.operatorId, OperatorIdentity.roleTag[operatorEntity]);
      return;
    }
    case "sim/unequip-item": {
      unequipItem(context, command.operatorId, command.slot);
      return;
    }
    case "sim/dev-set-resource": {
      const guildEntity = context.singletonEntities.guild;

      switch (command.resourceId) {
        case "resource/cash":
          GuildState.treasury[guildEntity] = command.amount;
          return;
        case "resource/reputation":
          GuildState.reputation[guildEntity] = command.amount;
          return;
        case "resource/intel":
          GuildState.intel[guildEntity] = command.amount;
          return;
      }

      return;
    }
    case "sim/dev-set-time": {
      const timeEntity = context.singletonEntities.time;
      WorldTimeState.minuteOfDay[timeEntity] = Math.max(0, Math.min(1439, command.minuteOfDay));
      return;
    }
    default: {
      // Delegate encounter, interruption, and incident commands to the
      // late-bound handler registered by encounter-commands.ts.
      // This breaks the circular import chain at module init time.
      if (encounterCommandHandler) {
        encounterCommandHandler(context, command.type, { ...command });
      }
      return;
    }
  }
}
