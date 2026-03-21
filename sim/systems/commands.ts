import { addComponent, addEntity, removeEntity } from "bitecs";

import { evaluateRequirement, type RequirementEvaluationContext } from "content/requirements";
import type { UpgradeTemplate } from "content/templates";
import { stableStringHash } from "lib/stable-hash";
import { selectOperatorAppearancePresetId } from "save";

import type { SimCommand } from "../commands";
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
  RelationshipState,
  RoomInstance,
  ScheduleState,
  StaffState,
  VisitorState,
  WorldTimeState,
} from "../components";
import type { SimSystemContext } from "./types";

const ROLE_TAG_PREFIX = "role:";
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

export function getRoleTag(tags: readonly string[]): string {
  return tags.find((tag) => tag.startsWith(ROLE_TAG_PREFIX)) ?? "role:general";
}

function getBuildingEntity(context: SimSystemContext): number {
  return context.singletonEntities.building;
}

function getActiveBuildingTemplate(context: SimSystemContext) {
  return (
    context.registry.buildings[
      BuildingAuthority.activeBuildingTemplateIndex[getBuildingEntity(context)]
    ] ?? context.registry.buildings[0]
  );
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
    const template =
      context.registry.rooms[RoomInstance.templateIndex[entity]] ?? context.registry.rooms[0];
    counts.set(template.id, (counts.get(template.id) ?? 0) + 1);
  });

  return counts;
}

function getRoomTiers(context: SimSystemContext): Map<string, number> {
  const tiers = new Map<string, number>();

  context.runtimeState.roomEntities.forEach((entity) => {
    const template =
      context.registry.rooms[RoomInstance.templateIndex[entity]] ?? context.registry.rooms[0];
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
    operatorCount: context.runtimeState.operatorEntities.length,
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

function getDefaultRoomPosition(slotIndex: number) {
  const column = slotIndex % 2;
  const row = Math.floor(slotIndex / 2);

  return {
    x: 80 + column * 212,
    y: 72 + row * 124,
    width: 196,
    height: 108,
  };
}

function createRoomInstanceEntity(
  context: SimSystemContext,
  templateId: string,
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  },
): void {
  const template = context.registry.roomById.get(templateId);
  if (!template) {
    return;
  }

  const entity = addEntity(context.world);
  const slotIndex = context.runtimeState.roomEntities.length;
  const fallbackPosition = getDefaultRoomPosition(slotIndex);

  addComponent(context.world, entity, RoomInstance);
  addComponent(context.world, entity, Renderable);

  RoomInstance.id[entity] =
    `room-instance/${template.id.slice("room/".length).replace(":tier_", "-tier-")}-${context.runtimeState.nextRoomSequence}`;
  RoomInstance.templateIndex[entity] = context.registry.roomIndexById.get(template.id) ?? 0;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isRequestedActive[entity] = 0;
  RoomInstance.isOperational[entity] = 0;
  RoomInstance.assignedStaffCount[entity] = 0;
  RoomInstance.appliedUpgradeIds[entity] = [];
  RoomInstance.slotIndex[entity] = slotIndex;

  Renderable.x[entity] = position?.x ?? fallbackPosition.x;
  Renderable.y[entity] = position?.y ?? fallbackPosition.y;
  Renderable.width[entity] = position?.width ?? fallbackPosition.width;
  Renderable.height[entity] = position?.height ?? fallbackPosition.height;
  Renderable.layer[entity] = 1;

  context.runtimeState.roomEntities.push(entity);
  context.runtimeState.nextRoomSequence += 1;
}

function createOperatorEntity(
  context: SimSystemContext,
  source: {
    name: string;
    roleTag: string;
    specialtyTag: string;
    appearancePresetId: string;
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
  context.runtimeState.nextOperatorSequence += 1;
  return entity;
}

function createStaffEntity(context: SimSystemContext, roleTag: string): void {
  const entity = addEntity(context.world);
  const normalizedRoleTag = roleTag.startsWith(ROLE_TAG_PREFIX)
    ? roleTag
    : `${ROLE_TAG_PREFIX}${roleTag}`;
  const roleName = normalizedRoleTag.slice(ROLE_TAG_PREFIX.length).replace(/_/g, " ");

  addComponent(context.world, entity, StaffState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, LoyaltyState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, InjuryState);

  StaffState.id[entity] = `staff/${context.runtimeState.nextStaffSequence}`;
  StaffState.name[entity] = `${roleName} staff ${context.runtimeState.nextStaffSequence}`;
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

function createRelationshipEntity(
  context: SimSystemContext,
  relationship: RelationshipRecordData,
): void {
  const entity = addEntity(context.world);

  addComponent(context.world, entity, RelationshipState);
  RelationshipState.operatorAId[entity] = relationship.operatorAId;
  RelationshipState.operatorBId[entity] = relationship.operatorBId;
  RelationshipState.trust[entity] = relationship.trust;
  RelationshipState.friction[entity] = relationship.friction;
  RelationshipState.familiarity[entity] = relationship.familiarity;
  RelationshipState.recentSharedOutcome[entity] = relationship.recentSharedOutcome;
  RelationshipState.historyTags[entity] = [...relationship.historyTags];

  context.runtimeState.relationshipEntities.push(entity);
}

export function hasOperationalRecruitmentRoom(context: SimSystemContext): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template =
      context.registry.rooms[RoomInstance.templateIndex[entity]] ?? context.registry.rooms[0];
    return (
      getRoleTag(template.tags) === "role:recruitment" && RoomInstance.isOperational[entity] === 1
    );
  });
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
        !unlockedRoomTemplateIds.includes(template.id)
      ) {
        return;
      }

      createRoomInstanceEntity(context, template.id, command.position);
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

      const template =
        context.registry.rooms[RoomInstance.templateIndex[roomEntity]] ?? context.registry.rooms[0];
      if (upgrade.targetId !== template.id) {
        return;
      }

      const appliedUpgradeIds = RoomInstance.appliedUpgradeIds[roomEntity] ?? [];
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
      RoomInstance.appliedUpgradeIds[roomEntity] = [...appliedUpgradeIds, upgrade.id];
      return;
    }
    case "sim/accept-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (
        visitorEntity === undefined ||
        context.runtimeState.operatorEntities.length >=
          BuildingAuthority.operatorSlotCount[buildingEntity] ||
        !hasOperationalRecruitmentRoom(context)
      ) {
        return;
      }

      const existingOperators = context.runtimeState.operatorEntities.slice();
      const preferences = buildDefaultPreferenceProfile({
        name: VisitorState.name[visitorEntity],
        roleTag: VisitorState.desiredRoleTag[visitorEntity],
        specialtyTag: `focus:${VisitorState.desiredRoleTag[visitorEntity].slice(ROLE_TAG_PREFIX.length)}`,
      });
      const recruitSpecialtyTag = `focus:${VisitorState.desiredRoleTag[visitorEntity].slice(ROLE_TAG_PREFIX.length)}`;
      const operatorEntity = createOperatorEntity(context, {
        name: VisitorState.name[visitorEntity],
        roleTag: VisitorState.desiredRoleTag[visitorEntity],
        specialtyTag: recruitSpecialtyTag,
        appearancePresetId: selectOperatorAppearancePresetId({
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

      existingOperators.forEach((existingEntity) => {
        createRelationshipEntity(
          context,
          buildInitialRelationshipRecord(
            {
              id: OperatorIdentity.id[operatorEntity],
              roleTag: OperatorIdentity.roleTag[operatorEntity],
              specialtyTag: OperatorIdentity.specialtyTag[operatorEntity],
              preferences,
            },
            {
              id: OperatorIdentity.id[existingEntity],
              roleTag: OperatorIdentity.roleTag[existingEntity],
              specialtyTag: OperatorIdentity.specialtyTag[existingEntity],
              preferences: {
                riskTolerance: PreferenceState.riskTolerance[existingEntity],
                rewardFocus: PreferenceState.rewardFocus[existingEntity],
                recoveryBias: PreferenceState.recoveryBias[existingEntity],
                socialBias: PreferenceState.socialBias[existingEntity],
                trainingBias: PreferenceState.trainingBias[existingEntity],
                comfortBias: PreferenceState.comfortBias[existingEntity],
                preferredMissionTags: [
                  ...(PreferenceState.preferredMissionTags[existingEntity] ?? []),
                ],
                preferredPartnerIds: [
                  ...(PreferenceState.preferredPartnerIds[existingEntity] ?? []),
                ],
              },
            },
          ),
        );
      });

      removeEntity(context.world, visitorEntity);
      removeTrackedEntity(context.runtimeState.visitorEntities, visitorEntity);
      return;
    }
    case "sim/reject-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (visitorEntity === undefined) {
        return;
      }

      removeEntity(context.world, visitorEntity);
      removeTrackedEntity(context.runtimeState.visitorEntities, visitorEntity);
      GuildState.reputation[context.singletonEntities.guild] -= 1;
      return;
    }
    case "sim/hire-staff": {
      const hiringCost = 28 + (scoreString(command.roleTag) % 9);
      if (readResourceBalance(context, "resource/cash") < hiringCost) {
        return;
      }

      spendResourceBalance(context, "resource/cash", hiringCost);
      createStaffEntity(context, command.roleTag);
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

      const template =
        context.registry.rooms[RoomInstance.templateIndex[roomEntity]] ?? context.registry.rooms[0];
      if (StaffState.roleTag[staffEntity] !== getRoleTag(template.tags)) {
        return;
      }

      AssignmentState.kind[staffEntity] = "room";
      AssignmentState.targetId[staffEntity] = command.roomId;
      return;
    }
  }
}
