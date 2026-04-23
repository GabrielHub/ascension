import { addComponent, addEntity, removeEntity } from "bitecs";

import { getBuildingFloors, getBuildingLayout } from "content/building-layouts";
import { evaluateRequirement, type RequirementEvaluationContext } from "content/requirements";
import type { UpgradeTemplate } from "content/templates";
import { districtTemplates } from "content/templates/districts";
import {
  canChangePolicy,
  DEFAULT_POLICY_STATE,
  getPolicyLabel,
  getPolicyOptionLabel,
  getRosterFlowConfig,
  isValidPolicyValue,
  normalizePolicyState,
  type PolicyContractLifecycle,
  type PolicyId,
  type PolicyValue,
} from "lib/policies";
import {
  getNextPendingRoomUpgradeIds,
  getRoomActiveFootprint,
  getRoomStateId,
  getSlotKey,
} from "lib/hq-room-state";
import { deriveOperatorCombatDefaults } from "lib/operator-combat";
import type { CombatRank } from "content/templates/combat-packages";
import { deriveRecruitRank } from "lib/visitor-rank";
import { formatIdentityText, type GameIdentity } from "lib/game-identity";
import { stableStringHash } from "lib/stable-hash";
import { selectOperatorAppearanceProfile } from "save/appearance";

import type { SimCommand } from "../commands";
import { projectVisitorRecruitLoyalty, projectVisitorRecruitMorale } from "../recruitment";
import { buyItem, sellItem, getMarketPriceForItem, type MarketItemView } from "./market";
import {
  addToInventory,
  autoSelectAccessory,
  equipItem,
  getInventoryCount,
  removeFromInventory,
  unequipItem,
} from "./inventory";
import {
  applyLootAutomationSweep,
  describeLootAutomationSweep,
  isLootAutomationEnabled,
  setLootAutomationEnabled,
} from "./loot-automation";
import { refreshBuildingAuthoritySystem } from "./building-progression";
import { recordGuidanceInteraction } from "./guidance";
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
  TrainingState,
  VisitorState,
  WorldTimeState,
} from "../components";
import { ensureOperatorDispositionEntity, ensureRoomCultureEntity } from "./social";
import { getRecruitmentGateState } from "./opening-envelope";
import { unlockPresenterForRoomTemplate } from "./presenter-unlocks";
import type { RuntimeEvent, SimSystemContext, VisitorQueueState } from "./types";

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

// Late-bound contract command handler (registered by systems/index.ts).
let contractCommandHandler:
  | ((context: SimSystemContext, type: string, payload: Record<string, unknown>) => boolean)
  | null = null;

export function registerContractCommandHandler(
  handler: (context: SimSystemContext, type: string, payload: Record<string, unknown>) => boolean,
): void {
  contractCommandHandler = handler;
}

const ROLE_TAG_PREFIX = "role:";
const DEFAULT_SHIFT_START = 480;
const DEFAULT_SHIFT_END = 1080;
const DEFAULT_HISTORY_TAG_LIMIT = 6;
export const BODEGA_BACK_OFFICE_TEMPLATE_ID = "room/back_office:tier_1";
export const BODEGA_BACKSTOCK_TEMPLATE_ID = "room/backstock:tier_1";
export const BODEGA_ALLEY_STAGING_TEMPLATE_ID = "room/alley_staging:tier_1";
export const BODEGA_DEFERRED_VISITOR_CAPACITY = 1;
export const PREFERRED_MISSION_TAGS = [
  ["mission:combat", "objective:clear"],
  ["mission:stability", "objective:hold"],
  ["mission:retrieval", "objective:escort"],
] as const;
export const ROLE_SPECIALTY_OPTIONS: Record<string, readonly string[]> = {
  "role:field_lead": ["focus:field_lead", "focus:frontline", "focus:containment"],
  "role:scout": ["focus:scout", "focus:extraction", "focus:containment"],
  "role:medic": ["focus:medic", "focus:containment", "focus:extraction"],
};

export function getSpecialtyOptionsForRole(roleTag: string): readonly string[] {
  return ROLE_SPECIALTY_OPTIONS[roleTag] ?? [`focus:${roleTag.replace(ROLE_TAG_PREFIX, "")}`];
}

export function getAllowedPreferredMissionTags(): readonly string[] {
  return [...new Set(PREFERRED_MISSION_TAGS.flat())];
}

export const scoreString = stableStringHash;

function titleCase(raw: string): string {
  return raw.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function selectOperatorSpecialtyTag(input: {
  stableKey: string;
  roleTag: string;
  specialtyTag?: string;
}): string {
  const provided = input.specialtyTag?.trim();
  if (provided) {
    return provided;
  }

  const options = getSpecialtyOptionsForRole(input.roleTag);
  return options[scoreString(`${input.stableKey}:specialty`) % options.length] ?? options[0]!;
}

function buildVisitorPersonaSummary(input: {
  roleTag: string;
  specialtyTag: string;
  quality: number;
}): string {
  const roleLabel = titleCase(input.roleTag.replace(ROLE_TAG_PREFIX, ""));
  const specialtyLabel = titleCase(input.specialtyTag.replace("focus:", ""));
  const qualityBand =
    input.quality >= 74
      ? "already reads like a high-upside hire"
      : input.quality >= 62
        ? "looks like a steady pickup"
        : "feels green but workable";
  return `${roleLabel} recruit with a ${specialtyLabel.toLowerCase()} lean who ${qualityBand}.`;
}

function buildVisitorPersonaHooks(input: {
  stableKey: string;
  roleTag: string;
  specialtyTag: string;
}): string[] {
  const roleLabel = input.roleTag.replace(ROLE_TAG_PREFIX, "").replaceAll("_", " ");
  const specialtyLabel = input.specialtyTag.replace("focus:", "").replaceAll("_", " ");
  const hookSets = [
    [
      `Keeps talking shop around ${roleLabel} work.`,
      `Frames problems through ${specialtyLabel} instincts.`,
    ],
    [
      "Dry about paperwork, serious about the floor.",
      "Treats avoidable chaos as a management failure.",
    ],
    [
      "Reads like someone who has already worked inside licensed dungeon labor.",
      "More comfortable with concrete tasks than grand speeches.",
    ],
  ] as const;

  return [...hookSets[scoreString(`${input.stableKey}:persona`) % hookSets.length]!];
}

export interface VisitorSeed {
  id?: string;
  name: string;
  desiredRoleTag: string;
  patience: number;
  quality: number;
  expectedLoyalty: number;
  specialtyTag?: string;
  appearance?: {
    presetId: string;
    visibleGear?: {
      weaponPartId?: string;
      outfitOverlayPartId?: string;
      accessoryPartId?: string;
    };
  };
  preferences?: PreferenceProfileRecord;
  personaSummary?: string;
  personaHooks?: string[];
  identitySource?: "deterministic" | "generated";
  /** Promoted recipe preset to pass through to appearance selection. */
  presetId?: string;
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

/** Build the seed data needed to create an operator from a visitor recruit. */
function buildOperatorSeedFromVisitor(
  context: SimSystemContext,
  visitorEntity: number,
): Parameters<typeof createOperatorEntity>[1] {
  const name = VisitorState.name[visitorEntity];
  const roleTag = VisitorState.desiredRoleTag[visitorEntity];
  const buildingTemplate = getActiveBuildingTemplate(context);
  const rank = deriveRecruitRank(
    VisitorState.quality[visitorEntity],
    buildingTemplate?.contractRankCeiling,
  );
  const specialtyTag =
    VisitorState.specialtyTag[visitorEntity] ||
    selectOperatorSpecialtyTag({
      stableKey: VisitorState.id[visitorEntity],
      roleTag,
    });
  const defaultPreferences = buildDefaultPreferenceProfile({ name, roleTag, specialtyTag });
  const hasGeneratedIdentity = VisitorState.identitySource[visitorEntity] === "generated";
  const appearanceProfile = selectOperatorAppearanceProfile({
    stableKey: [VisitorState.id[visitorEntity], name, roleTag, specialtyTag].join(":"),
    roleTag,
    quality: VisitorState.quality[visitorEntity],
    presetId: VisitorState.appearancePresetId[visitorEntity] || undefined,
  });
  const visibleGear = {
    weaponPartId:
      VisitorState.appearanceWeaponPartId[visitorEntity] ||
      appearanceProfile.visibleGear?.weaponPartId,
    outfitOverlayPartId:
      VisitorState.appearanceOutfitOverlayPartId[visitorEntity] ||
      appearanceProfile.visibleGear?.outfitOverlayPartId,
    accessoryPartId:
      VisitorState.appearanceAccessoryPartId[visitorEntity] ||
      appearanceProfile.visibleGear?.accessoryPartId,
  };
  const hasVisibleGear =
    Boolean(visibleGear.weaponPartId) ||
    Boolean(visibleGear.outfitOverlayPartId) ||
    Boolean(visibleGear.accessoryPartId);

  return {
    name,
    roleTag,
    specialtyTag,
    personaSummary:
      VisitorState.personaSummary[visitorEntity] ||
      buildVisitorPersonaSummary({
        roleTag,
        specialtyTag,
        quality: VisitorState.quality[visitorEntity],
      }),
    personaHooks:
      VisitorState.personaHooks[visitorEntity]?.length > 0
        ? [...VisitorState.personaHooks[visitorEntity]]
        : buildVisitorPersonaHooks({
            stableKey: VisitorState.id[visitorEntity],
            roleTag,
            specialtyTag,
          }),
    appearancePresetId:
      VisitorState.appearancePresetId[visitorEntity] || appearanceProfile.presetId,
    ...(hasVisibleGear ? { visibleGear } : {}),
    preferences: {
      riskTolerance: hasGeneratedIdentity
        ? VisitorState.preferenceRiskTolerance[visitorEntity]
        : VisitorState.preferenceRiskTolerance[visitorEntity] || defaultPreferences.riskTolerance,
      rewardFocus: hasGeneratedIdentity
        ? VisitorState.preferenceRewardFocus[visitorEntity]
        : VisitorState.preferenceRewardFocus[visitorEntity] || defaultPreferences.rewardFocus,
      recoveryBias: hasGeneratedIdentity
        ? VisitorState.preferenceRecoveryBias[visitorEntity]
        : VisitorState.preferenceRecoveryBias[visitorEntity] || defaultPreferences.recoveryBias,
      socialBias: hasGeneratedIdentity
        ? VisitorState.preferenceSocialBias[visitorEntity]
        : VisitorState.preferenceSocialBias[visitorEntity] || defaultPreferences.socialBias,
      trainingBias: hasGeneratedIdentity
        ? VisitorState.preferenceTrainingBias[visitorEntity]
        : VisitorState.preferenceTrainingBias[visitorEntity] || defaultPreferences.trainingBias,
      comfortBias: hasGeneratedIdentity
        ? VisitorState.preferenceComfortBias[visitorEntity]
        : VisitorState.preferenceComfortBias[visitorEntity] || defaultPreferences.comfortBias,
      preferredMissionTags:
        VisitorState.preferencePreferredMissionTags[visitorEntity]?.length > 0
          ? [...VisitorState.preferencePreferredMissionTags[visitorEntity]]
          : [...defaultPreferences.preferredMissionTags],
      preferredPartnerIds: [],
    },
    morale: projectVisitorRecruitMorale(VisitorState.quality[visitorEntity]),
    loyalty: projectVisitorRecruitLoyalty(VisitorState.expectedLoyalty[visitorEntity]),
    hunger: 10,
    fatigue: 12,
    stress: 18,
    rank,
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

export function getGuildIdentity(context: SimSystemContext): GameIdentity {
  const guildEntity = context.singletonEntities.guild;
  return {
    guildName: GuildState.guildName[guildEntity],
    playerName: GuildState.playerName[guildEntity],
  };
}

export function formatIdentityRuntimeText(context: SimSystemContext, text: string): string {
  return formatIdentityText(text, getGuildIdentity(context));
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

function getBuildingEntity(context: SimSystemContext): number {
  return context.singletonEntities.building;
}

export function getBuildingPolicies(context: SimSystemContext) {
  return normalizePolicyState(
    BuildingAuthority.policies[getBuildingEntity(context)] ?? DEFAULT_POLICY_STATE,
  );
}

function canSetPolicy(context: SimSystemContext, policyId: PolicyId, value: PolicyValue): boolean {
  if (!isValidPolicyValue(policyId, value)) {
    return false;
  }

  if (
    !canChangePolicy(
      policyId,
      (BuildingAuthority.contractLifecycle[getBuildingEntity(context)] ??
        "bidding") as PolicyContractLifecycle,
    )
  ) {
    return false;
  }

  return true;
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

export function readResourceBalance(context: SimSystemContext, resourceId: string): number {
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

    const multiplier = costMultipliers[requirement.resourceId] ?? 1;
    costs.set(requirement.resourceId, Math.ceil(requirement.minimum * multiplier));
  });

  return costs;
}

export function getAdjustedMarketPriceForItem(
  context: SimSystemContext,
  itemId: string,
): { buyPrice: number; sellPrice: number } | null {
  const price = getMarketPriceForItem(context.registry, itemId);
  if (!price) {
    return null;
  }

  if (!hasOperationalRoomTemplate(context, BODEGA_BACKSTOCK_TEMPLATE_ID) || price.buyPrice <= 0) {
    return price;
  }

  return {
    buyPrice: Math.ceil(price.buyPrice * 0.92),
    sellPrice: price.sellPrice,
  };
}

/** How many buyable items the market stocks each day. */
const DAILY_STOCK_SIZE = 10;

/**
 * Deterministic daily stock selection.
 * Uses the game-day as a seed so the same day always produces the same subset.
 */
let cachedDailyStockDay = -1;
let cachedDailyStockSet: ReadonlySet<string> = new Set();

function getDailyStockSet(context: SimSystemContext): ReadonlySet<string> {
  const timeEntity = context.singletonEntities.time;
  const day = WorldTimeState.day[timeEntity];

  if (day === cachedDailyStockDay) return cachedDailyStockSet;

  const buyableItems = context.registry.items.filter((i) => i.buyPrice > 0);
  let result: ReadonlySet<string>;
  if (buyableItems.length <= DAILY_STOCK_SIZE) {
    result = new Set(buyableItems.map((i) => i.id));
  } else {
    // Seeded shuffle via day-based hash
    const seed = stableStringHash(`market-stock-day-${day}`);
    const indexed = buyableItems.map((item, i) => ({
      id: item.id,
      score: stableStringHash(`${seed}-${i}-${item.id}`),
    }));
    indexed.sort((a, b) => a.score - b.score);
    result = new Set(indexed.slice(0, DAILY_STOCK_SIZE).map((e) => e.id));
  }

  cachedDailyStockDay = day;
  cachedDailyStockSet = result;
  return result;
}

export function getAdjustedMarketItems(context: SimSystemContext): MarketItemView[] {
  const dailyStock = getDailyStockSet(context);

  return context.registry.items.map((item) => {
    const price = getAdjustedMarketPriceForItem(context, item.id);

    return {
      itemId: item.id,
      buyPrice: price?.buyPrice ?? 0,
      sellPrice: price?.sellPrice ?? 0,
      available: item.buyPrice > 0 && dailyStock.has(item.id),
    };
  });
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

export function createRoomInstanceEntity(
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
): string | null {
  const template = context.registry.roomById.get(templateId);
  if (!template) {
    return null;
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
  const templateIndex = context.registry.roomIndexById.get(template.id);
  if (templateIndex === undefined) {
    throw new Error(`Simulation cannot place room with unknown template "${template.id}".`);
  }
  const roomId = `room-instance/${template.id.slice("room/".length).replace(":tier_", "-tier-")}-${context.runtimeState.nextRoomSequence}`;

  addComponent(context.world, entity, RoomInstance);
  addComponent(context.world, entity, Renderable);

  RoomInstance.id[entity] = roomId;
  RoomInstance.templateIndex[entity] = templateIndex;
  RoomInstance.tier[entity] = template.tier;
  RoomInstance.floorIndex[entity] = placement.floorIndex;
  RoomInstance.slotId[entity] = placement.slotId;
  RoomInstance.roomStateId[entity] = getRoomStateId(template.id, []);
  RoomInstance.capacity[entity] = template.baseCapacity;
  RoomInstance.occupancy[entity] = 0;
  RoomInstance.isOperational[entity] = 1;
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
  ensureRoomCultureEntity(context, roomId, template.tags);
  context.runtimeState.nextRoomSequence += 1;
  return roomId;
}

function createOperatorEntity(
  context: SimSystemContext,
  source: {
    name: string;
    roleTag: string;
    specialtyTag: string;
    personaSummary?: string;
    personaHooks?: string[];
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
    rank?: CombatRank;
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
  const combat = deriveOperatorCombatDefaults(
    source.roleTag,
    source.rank,
    context.runtimeState.combatPackageRegistry,
  );

  addComponent(context.world, entity, OperatorIdentity);
  addComponent(context.world, entity, NeedState);
  addComponent(context.world, entity, MoraleState);
  addComponent(context.world, entity, LoyaltyState);
  addComponent(context.world, entity, ScheduleState);
  addComponent(context.world, entity, AssignmentState);
  addComponent(context.world, entity, PreferenceState);
  addComponent(context.world, entity, RaidParticipationState);
  addComponent(context.world, entity, InjuryState);
  addComponent(context.world, entity, TrainingState);

  OperatorIdentity.id[entity] = `operator/${context.runtimeState.nextOperatorSequence}`;
  OperatorIdentity.name[entity] = source.name;
  OperatorIdentity.roleTag[entity] = source.roleTag;
  OperatorIdentity.specialtyTag[entity] = source.specialtyTag;
  OperatorIdentity.personaSummary[entity] = source.personaSummary ?? "";
  OperatorIdentity.personaHooks[entity] = [...(source.personaHooks ?? [])];
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
  OperatorIdentity.rank[entity] = combat.rank;
  OperatorIdentity.attunementTag[entity] = combat.attunementTag;
  OperatorIdentity.traits[entity] = [...combat.traits];
  OperatorIdentity.combatPackageId[entity] = combat.combatPackageId;
  OperatorIdentity.blocks[entity] = combat.blocks;
  OperatorIdentity.baseStrength[entity] = combat.baseStats.strength;
  OperatorIdentity.baseSpeed[entity] = combat.baseStats.speed;
  OperatorIdentity.baseEndurance[entity] = combat.baseStats.endurance;
  OperatorIdentity.baseResilience[entity] = combat.baseStats.resilience;
  OperatorIdentity.basePerception[entity] = combat.baseStats.perception;
  OperatorIdentity.baseIntelligence[entity] = combat.baseStats.intelligence;
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
  TrainingState.strength[entity] = 0;
  TrainingState.speed[entity] = 0;
  TrainingState.endurance[entity] = 0;
  TrainingState.resilience[entity] = 0;

  context.runtimeState.operatorEntities.push(entity);
  ensureOperatorDispositionEntity(context, OperatorIdentity.id[entity]);
  context.runtimeState.nextOperatorSequence += 1;
  return entity;
}

export function spawnVisitorEntity(context: SimSystemContext, seed: VisitorSeed): void {
  const entity = addEntity(context.world);
  const stableKey = seed.id ?? `visitor/${context.runtimeState.nextVisitorSequence}`;
  const specialtyTag = selectOperatorSpecialtyTag({
    stableKey,
    roleTag: seed.desiredRoleTag,
    specialtyTag: seed.specialtyTag,
  });
  const appearance =
    seed.appearance ??
    selectOperatorAppearanceProfile({
      stableKey: [stableKey, seed.name, seed.desiredRoleTag, specialtyTag].join(":"),
      roleTag: seed.desiredRoleTag,
      quality: seed.quality,
      presetId: seed.presetId,
    });
  const preferences =
    seed.preferences ??
    buildDefaultPreferenceProfile({
      name: seed.name,
      roleTag: seed.desiredRoleTag,
      specialtyTag,
    });

  addComponent(context.world, entity, VisitorState);

  VisitorState.id[entity] = stableKey;
  VisitorState.name[entity] = seed.name;
  VisitorState.desiredRoleTag[entity] = seed.desiredRoleTag;
  VisitorState.specialtyTag[entity] = specialtyTag;
  VisitorState.patience[entity] = seed.patience;
  VisitorState.quality[entity] = seed.quality;
  VisitorState.expectedLoyalty[entity] = seed.expectedLoyalty;
  VisitorState.appearancePresetId[entity] = appearance.presetId;
  VisitorState.appearanceWeaponPartId[entity] = appearance.visibleGear?.weaponPartId ?? "";
  VisitorState.appearanceOutfitOverlayPartId[entity] =
    appearance.visibleGear?.outfitOverlayPartId ?? "";
  VisitorState.appearanceAccessoryPartId[entity] = appearance.visibleGear?.accessoryPartId ?? "";
  VisitorState.personaSummary[entity] =
    seed.personaSummary ??
    buildVisitorPersonaSummary({
      roleTag: seed.desiredRoleTag,
      specialtyTag,
      quality: seed.quality,
    });
  VisitorState.personaHooks[entity] = seed.personaHooks?.length
    ? [...seed.personaHooks]
    : buildVisitorPersonaHooks({
        stableKey,
        roleTag: seed.desiredRoleTag,
        specialtyTag,
      });
  VisitorState.preferenceRiskTolerance[entity] = preferences.riskTolerance;
  VisitorState.preferenceRewardFocus[entity] = preferences.rewardFocus;
  VisitorState.preferenceRecoveryBias[entity] = preferences.recoveryBias;
  VisitorState.preferenceSocialBias[entity] = preferences.socialBias;
  VisitorState.preferenceTrainingBias[entity] = preferences.trainingBias;
  VisitorState.preferenceComfortBias[entity] = preferences.comfortBias;
  VisitorState.preferencePreferredMissionTags[entity] = [...preferences.preferredMissionTags];
  VisitorState.identitySource[entity] = seed.identitySource ?? "deterministic";
  VisitorState.queueState[entity] = "active";

  context.runtimeState.visitorEntities.push(entity);
  context.runtimeState.nextVisitorSequence += 1;
}

export function getVisitorQueueState(entity: number): VisitorQueueState {
  return VisitorState.queueState[entity] === "deferred" ? "deferred" : "active";
}

export function getActiveVisitorEntities(context: SimSystemContext): number[] {
  return context.runtimeState.visitorEntities.filter(
    (entity) => getVisitorQueueState(entity) === "active",
  );
}

export function getDeferredVisitorEntities(context: SimSystemContext): number[] {
  return context.runtimeState.visitorEntities.filter(
    (entity) => getVisitorQueueState(entity) === "deferred",
  );
}

function removeVisitorEntity(context: SimSystemContext, visitorEntity: number): void {
  removeEntity(context.world, visitorEntity);
  removeTrackedEntity(context.runtimeState.visitorEntities, visitorEntity);
}

function setVisitorQueueState(entity: number, queueState: VisitorQueueState): void {
  VisitorState.queueState[entity] = queueState;
}

function findRoomEntityById(context: SimSystemContext, roomId: string): number | undefined {
  return context.runtimeState.roomEntities.find((entity) => RoomInstance.id[entity] === roomId);
}

function findOperatorEntityById(context: SimSystemContext, operatorId: string): number | undefined {
  return context.runtimeState.operatorEntities.find(
    (entity) => OperatorIdentity.id[entity] === operatorId,
  );
}

function findVisitorEntityById(context: SimSystemContext, visitorId: string): number | undefined {
  return context.runtimeState.visitorEntities.find(
    (entity) => VisitorState.id[entity] === visitorId,
  );
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

function canReplaceOperatorFromRoster(entity: number): boolean {
  return (
    OperatorIdentity.lifecycleStatus[entity] === "active" && AssignmentState.kind[entity] !== "raid"
  );
}

function dismissOperatorForRoster(
  context: SimSystemContext,
  entity: number,
  reason: string,
  eventMessage: string,
): void {
  const operatorId = OperatorIdentity.id[entity];
  const currentMinute = getCurrentAbsoluteMinute(context);

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

  pushRuntimeEvent(context, {
    kind: "staffing_change",
    message: eventMessage,
    accent: "ember",
    targetKind: "operator",
    targetId: operatorId,
  });
}

export function hasOperationalRoomTemplate(context: SimSystemContext, templateId: string): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.id === templateId && RoomInstance.isOperational[entity] === 1;
  });
}

/** Check if any operational room has the given tag. Building-agnostic. */
export function hasOperationalRoomWithTag(context: SimSystemContext, tag: string): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.tags.includes(tag) && RoomInstance.isOperational[entity] === 1;
  });
}

function getBuildingUpgradeEventMessage(upgradeId: string): string | null {
  switch (upgradeId) {
    case "upgrade/building/bodega:frontage":
      return "Street-Facing Frontage finished. The storefront finally looks intentional.";
    case "upgrade/building/bodega:annex":
      return "The Annex is open. The bodega has room for real back-office work now.";
    case "upgrade/building/bodega:extension":
      return "Backyard Extension finished. The bodega finally has breathing room out back.";
    case "upgrade/building/porters:kitchen_overhaul":
      return "Kitchen Overhaul complete. The food is real now and the health inspector might survive a visit.";
    case "upgrade/building/porters:upstairs_conversion":
      return "Upstairs Conversion finished. The old apartments are operational rooms now.";
    case "upgrade/building/porters:remodel":
      return "The Remodel is done. New fixtures, better lighting, and the kind of space people want to stay in.";
    case "upgrade/building/porters:waterfront":
      return "The Waterfront is open. Harbor-side staging and downtime with a view.";
    case "upgrade/building/porters:machine_shop":
      return "Machine Shop online. The guild can fabricate durable gear from site materials now.";
    case "upgrade/building/skyscraper:nightlife_floor":
      return "Nightlife Floor open. The marquee out front has the guild's name on it now.";
    case "upgrade/building/skyscraper:specialist_training_floor":
      return "Specialist Training Floor online. Field leads, scouts, and medics finally have rooms built for them.";
    case "upgrade/building/skyscraper:executive_floor":
      return "Executive Floor open. The guild has its own corner office, compliance suite, and war room.";
    case "upgrade/building/skyscraper:penthouse":
      return "Penthouse open. The Sky Lounge takes recruitment to the top of the tower.";
    default:
      return null;
  }
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

      const roomId = createRoomInstanceEntity(context, template.id, placement, command.footprint);
      if (!roomId) {
        return;
      }
      recordGuidanceInteraction(context.runtimeState.guidanceState, "staffing_action");
      const unlockedPresenterId = unlockPresenterForRoomTemplate(context, template.id);
      if (unlockedPresenterId) {
        const presenter = context.registry.presenterById.get(unlockedPresenterId);
        if (presenter) {
          pushRuntimeEvent(context, {
            kind: "presenter_unlocked",
            message: `${presenter.name} has joined the guild.`,
            accent: "gold",
            targetKind: "presenter",
            targetId: unlockedPresenterId,
          });
        }
      }
      if (template.id === BODEGA_BACK_OFFICE_TEMPLATE_ID) {
        pushRuntimeEvent(context, {
          kind: "event_change",
          message: "The Back Office is ready for contract research and permit work.",
          accent: "gold",
          targetKind: "room",
          targetId: roomId,
        });
      } else if (template.id === BODEGA_BACKSTOCK_TEMPLATE_ID) {
        pushRuntimeEvent(context, {
          kind: "event_change",
          message: "The Backstock is open. Gear and supplies finally have a real staging area.",
          accent: "gold",
          targetKind: "room",
          targetId: roomId,
        });
      } else if (template.id === BODEGA_ALLEY_STAGING_TEMPLATE_ID) {
        pushRuntimeEvent(context, {
          kind: "event_change",
          message: "The Alley is ready. Teams can stage out back instead of filing past customers.",
          accent: "gold",
          targetKind: "room",
          targetId: roomId,
        });
      }
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
    case "sim/set-policy": {
      if (!canSetPolicy(context, command.policyId, command.value)) {
        return;
      }

      const policies = getBuildingPolicies(context);
      if (policies[command.policyId] === command.value) {
        return;
      }

      const nextPolicies = {
        ...policies,
        [command.policyId]: command.value,
      };
      BuildingAuthority.policies[buildingEntity] = nextPolicies;
      pushRuntimeEvent(context, {
        kind: "event_change",
        message: `${GuildState.playerName[context.singletonEntities.guild]} changed ${getPolicyLabel(command.policyId)} to ${getPolicyOptionLabel(command.policyId, command.value)}.`,
        accent: "gold",
      });
      return;
    }
    case "sim/set-loot-filter": {
      const wasEnabled = isLootAutomationEnabled(context);
      if (wasEnabled === command.enabled) {
        return;
      }

      setLootAutomationEnabled(context, command.enabled);
      pushRuntimeEvent(context, {
        kind: "event_change",
        message: command.enabled
          ? "Loot filter enabled. Junk parts and obsolete gear will sell automatically."
          : "Loot filter disabled. Loot will stay in inventory until reviewed manually.",
        accent: "gold",
      });

      if (!command.enabled) {
        return;
      }

      const sweep = applyLootAutomationSweep(context);
      if (sweep.totalQuantity <= 0) {
        return;
      }

      pushRuntimeEvent(context, {
        kind: "resource_swing",
        message: `Loot filter auto-sold ${describeLootAutomationSweep(context.registry, sweep)} for $${sweep.totalRevenue}`,
        accent: "gold",
      });
      return;
    }
    case "sim/purchase-building-upgrade": {
      const upgrade = context.registry.upgradeById.get(command.upgradeId);
      if (!upgrade || upgrade.target !== "building") {
        return;
      }

      const activeBuildingTemplate = getActiveBuildingTemplate(context);
      if (upgrade.targetId !== activeBuildingTemplate.id) {
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

      const previousFloorIndices = new Set(
        getBuildingFloors(
          activeBuildingTemplate.id,
          BuildingAuthority.activeBuildingTier[buildingEntity],
        ).map((floor) => floor.floorIndex),
      );

      applyCosts(context, costs);
      BuildingAuthority.appliedUpgradeIds[buildingEntity] = [...appliedUpgradeIds, upgrade.id];
      recordGuidanceInteraction(context.runtimeState.guidanceState, "upgrade_purchase", upgrade.id);

      // Recompute derived authority state immediately so the new tier,
      // unlocked templates, and slot count are visible to the placement
      // logic that seeds starter rooms below.
      refreshBuildingAuthoritySystem(context, 0);

      const newFloors = getBuildingFloors(
        activeBuildingTemplate.id,
        BuildingAuthority.activeBuildingTier[buildingEntity],
      );
      for (const floor of newFloors) {
        if (previousFloorIndices.has(floor.floorIndex)) continue;
        for (const slot of floor.slots) {
          if (!slot.startingTemplateId) continue;
          const template = context.registry.roomById.get(slot.startingTemplateId);
          if (!template) continue;
          createRoomInstanceEntity(context, template.id, {
            floorIndex: floor.floorIndex,
            slotId: slot.slotId,
            reservedFootprint: { col: slot.col, row: slot.row, cols: slot.cols, rows: slot.rows },
          });
          unlockPresenterForRoomTemplate(context, template.id);
        }
      }

      const eventMessage = getBuildingUpgradeEventMessage(upgrade.id);
      if (eventMessage) {
        pushRuntimeEvent(context, {
          kind: "event_change",
          message: eventMessage,
          accent: "gold",
        });
      }
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
      recordGuidanceInteraction(context.runtimeState.guidanceState, "upgrade_purchase", upgrade.id);
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
      const recruitmentGate = getRecruitmentGateState(context);
      if (
        visitorEntity === undefined ||
        livingOperatorCount >= BuildingAuthority.operatorSlotCount[buildingEntity] ||
        !hasOperationalRecruitmentRoom(context) ||
        !recruitmentGate.unlocked
      ) {
        return;
      }
      const visitorQueueState = getVisitorQueueState(visitorEntity);

      createOperatorEntity(context, buildOperatorSeedFromVisitor(context, visitorEntity));

      const recruitName = VisitorState.name[visitorEntity];
      removeVisitorEntity(context, visitorEntity);
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message:
          visitorQueueState === "deferred"
            ? `${recruitName} joined the roster from reserve`
            : `${recruitName} joined the roster`,
        accent: "gold",
        targetKind: "operator",
        targetId:
          OperatorIdentity.id[
            context.runtimeState.operatorEntities[context.runtimeState.operatorEntities.length - 1]
          ],
      });
      return;
    }
    case "sim/visitor-update-identity": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (visitorEntity === undefined) {
        return;
      }

      VisitorState.specialtyTag[visitorEntity] = command.specialtyTag;
      VisitorState.appearancePresetId[visitorEntity] = command.appearance.presetId;
      VisitorState.appearanceWeaponPartId[visitorEntity] =
        command.appearance.visibleGear?.weaponPartId ?? "";
      VisitorState.appearanceOutfitOverlayPartId[visitorEntity] =
        command.appearance.visibleGear?.outfitOverlayPartId ?? "";
      VisitorState.appearanceAccessoryPartId[visitorEntity] =
        command.appearance.visibleGear?.accessoryPartId ?? "";
      VisitorState.preferenceRiskTolerance[visitorEntity] = command.preferences.riskTolerance;
      VisitorState.preferenceRewardFocus[visitorEntity] = command.preferences.rewardFocus;
      VisitorState.preferenceRecoveryBias[visitorEntity] = command.preferences.recoveryBias;
      VisitorState.preferenceSocialBias[visitorEntity] = command.preferences.socialBias;
      VisitorState.preferenceTrainingBias[visitorEntity] = command.preferences.trainingBias;
      VisitorState.preferenceComfortBias[visitorEntity] = command.preferences.comfortBias;
      VisitorState.preferencePreferredMissionTags[visitorEntity] = [
        ...command.preferences.preferredMissionTags,
      ];
      VisitorState.personaSummary[visitorEntity] = command.personaSummary;
      VisitorState.personaHooks[visitorEntity] = [...command.personaHooks];
      VisitorState.identitySource[visitorEntity] = "generated";
      return;
    }
    case "sim/defer-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (
        visitorEntity === undefined ||
        getVisitorQueueState(visitorEntity) !== "active" ||
        getDeferredVisitorEntities(context).length >= BODEGA_DEFERRED_VISITOR_CAPACITY
      ) {
        return;
      }

      setVisitorQueueState(visitorEntity, "deferred");
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${VisitorState.name[visitorEntity]} was deferred to reserve while the roster stays capped.`,
        accent: "silver",
        targetKind: "visitor",
        targetId: VisitorState.id[visitorEntity],
      });
      return;
    }
    case "sim/reject-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (visitorEntity === undefined || getVisitorQueueState(visitorEntity) !== "active") {
        return;
      }

      const rejectName = VisitorState.name[visitorEntity];
      removeVisitorEntity(context, visitorEntity);
      const rejectPolicies = getBuildingPolicies(context);
      const reputationDelta = getRosterFlowConfig(rejectPolicies).rejectReputationDelta;
      const rosterFlow = rejectPolicies.rosterFlow;
      GuildState.reputation[context.singletonEntities.guild] += reputationDelta;
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${rejectName} was turned away (${reputationDelta} rep under ${getPolicyOptionLabel("rosterFlow", rosterFlow)})`,
        accent: "ember",
      });
      return;
    }
    case "sim/replace-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      const operatorEntity = findOperatorEntityById(context, command.operatorId);
      const livingOperatorCount = context.runtimeState.operatorEntities.filter(
        (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
      ).length;
      const recruitmentGate = getRecruitmentGateState(context);
      if (
        visitorEntity === undefined ||
        operatorEntity === undefined ||
        livingOperatorCount < BuildingAuthority.operatorSlotCount[buildingEntity] ||
        !hasOperationalRecruitmentRoom(context) ||
        !recruitmentGate.unlocked ||
        !canReplaceOperatorFromRoster(operatorEntity)
      ) {
        return;
      }

      const recruitName = VisitorState.name[visitorEntity];
      const visitorQueueState = getVisitorQueueState(visitorEntity);
      const replacedOperatorName = OperatorIdentity.name[operatorEntity] ?? command.operatorId;
      dismissOperatorForRoster(
        context,
        operatorEntity,
        `dismissed to make room for ${recruitName}`,
        `${replacedOperatorName} was dismissed to free a roster slot.`,
      );

      createOperatorEntity(context, buildOperatorSeedFromVisitor(context, visitorEntity));
      removeVisitorEntity(context, visitorEntity);
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message:
          visitorQueueState === "deferred"
            ? `${recruitName} joined from reserve, replacing ${replacedOperatorName}.`
            : `${recruitName} joined the roster, replacing ${replacedOperatorName}.`,
        accent: "gold",
        targetKind: "operator",
        targetId:
          OperatorIdentity.id[
            context.runtimeState.operatorEntities[context.runtimeState.operatorEntities.length - 1]
          ],
      });
      return;
    }
    case "sim/dismiss-recruit": {
      const visitorEntity = findVisitorEntityById(context, command.visitorId);
      if (visitorEntity === undefined || getVisitorQueueState(visitorEntity) !== "deferred") {
        return;
      }

      const visitorName = VisitorState.name[visitorEntity];
      removeVisitorEntity(context, visitorEntity);
      pushRuntimeEvent(context, {
        kind: "staffing_change",
        message: `${visitorName} was dismissed from reserve.`,
        accent: "silver",
      });
      return;
    }
    case "sim/buy-item": {
      const price = getAdjustedMarketPriceForItem(context, command.itemId);
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
    case "sim/equip-item": {
      if (!equipItem(context, command.operatorId, command.slot, command.itemId)) {
        return;
      }
      const itemName = context.registry.itemById.get(command.itemId)?.name ?? command.itemId;
      const operatorEntity = findOperatorEntityById(context, command.operatorId);
      const operatorName =
        operatorEntity !== undefined ? OperatorIdentity.name[operatorEntity] : command.operatorId;
      pushRuntimeEvent(context, {
        kind: "resource_swing",
        message: `${operatorName} equipped ${itemName}`,
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
    case "sim/dev-set-day": {
      const timeEntity = context.singletonEntities.time;
      WorldTimeState.day[timeEntity] = Math.max(1, command.day);
      return;
    }
    case "sim/bid-contract":
    case "sim/advance-contract":
    case "sim/dev-force-contract-end": {
      if (contractCommandHandler) {
        contractCommandHandler(context, command.type, { ...command });
      }
      return;
    }
    case "sim/dev-set-district": {
      const district = context.runtimeState.cityState.districts[command.districtId];
      if (!district) return;
      switch (command.field) {
        case "attention":
          district.attention = clamp(command.value, 0, 100);
          return;
        case "trust":
          district.trust = clamp(command.value, 0, 100);
          return;
        case "containmentDebt":
          district.containmentDebt = clamp(command.value, 0, 100);
          return;
      }
      return;
    }
    case "sim/dev-set-faction": {
      const faction = context.runtimeState.cityState.factions[command.factionId];
      if (!faction) return;
      switch (command.field) {
        case "standing":
          faction.standing = clamp(command.value, -100, 100);
          return;
        case "scrutiny":
          faction.scrutiny = clamp(command.value, 0, 100);
          return;
        case "leverage":
          faction.leverage = clamp(command.value, 0, 100);
          return;
      }
      return;
    }
    case "sim/prep-consumable": {
      const recipe = context.registry.prepRecipeById.get(command.recipeId);
      if (!recipe) return;

      // Check that the required room is operational
      if (!hasOperationalRoomWithTag(context, recipe.requiredRoomTag)) return;

      // Check that the player has all required inputs
      for (const input of recipe.inputs) {
        if (getInventoryCount(context, input.itemId) < input.quantity) return;
      }

      // Consume inputs
      for (const input of recipe.inputs) {
        removeFromInventory(context, input.itemId, input.quantity);
      }

      // Produce output
      addToInventory(context, recipe.outputItemId, recipe.outputQuantity);

      pushRuntimeEvent(context, {
        kind: "event_change",
        message: `Prep Room produced ${recipe.outputQuantity}x ${recipe.name}.`,
        accent: "gold",
      });
      return;
    }
    case "sim/craft-durable": {
      const craftRecipe = context.registry.craftRecipeById.get(command.recipeId);
      if (!craftRecipe) return;

      // Workshop room must be operational
      if (!hasOperationalRoomTemplate(context, craftRecipe.requiredRoomId)) return;

      // Building tier gate
      const buildingEntity = context.singletonEntities.building;
      if (BuildingAuthority.activeBuildingTier[buildingEntity] < craftRecipe.minimumBuildingTier)
        return;

      // District tag gate: pool tags from all trusted districts
      const accessibleTags = new Set<string>();
      for (const dt of districtTemplates) {
        const snapshot = context.runtimeState.cityState.districts[dt.id];
        if (snapshot && snapshot.trust > 0) {
          for (const tag of dt.tags) accessibleTags.add(tag);
        }
      }
      if (craftRecipe.requiredDistrictTags.some((tag) => !accessibleTags.has(tag))) return;

      // Faction standing gate
      for (const [factionId, required] of Object.entries(craftRecipe.requiredFactionStanding)) {
        const faction = context.runtimeState.cityState.factions[factionId];
        if (!faction || faction.standing < required) return;
      }

      // Inventory input gate
      for (const input of craftRecipe.inputItems) {
        if (getInventoryCount(context, input.itemId) < input.quantity) return;
      }

      // Craft-time cash sink gate
      if (readResourceBalance(context, "resource/cash") < craftRecipe.cashCost) return;

      // Consume inputs
      for (const input of craftRecipe.inputItems) {
        removeFromInventory(context, input.itemId, input.quantity);
      }

      spendResourceBalance(context, "resource/cash", craftRecipe.cashCost);

      // Produce output
      addToInventory(context, craftRecipe.outputItemId, craftRecipe.outputQuantity);

      const outputName =
        context.registry.itemById.get(craftRecipe.outputItemId)?.name ?? craftRecipe.name;
      pushRuntimeEvent(context, {
        kind: "event_change",
        message: `Workshop produced ${craftRecipe.outputQuantity}x ${outputName}.`,
        accent: "gold",
      });
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
