import type { TemplateRegistry } from "content/templates";
import type {
  ActiveRaidSnapshot,
  GoalCheckGrade,
  GoalCheckKind,
  RaidRunSnapshot,
  RaidStepKind,
  RaidSummarySnapshot,
  WorldSnapshot,
} from "save";
import { selectOperatorAppearanceRecipeId } from "save/appearance";
import {
  projectVisitorRecruitLoyalty,
  projectVisitorRecruitMorale,
  type Phase1RuntimeView,
  type Phase2View,
} from "sim";
import { getBuildingFloors } from "content/building-layouts";
import { formatSlotLabel, getSlotKey } from "lib/hq-room-state";
import { visitorQualityToRank } from "lib/visitor-rank";

import type { VisibleGear } from "./operator-parts";
import { resolveVisibleGear, getLoadedParts } from "./operator-parts";
import {
  getEffectLabel,
  getIdentifierLabel,
  getLocationLabel,
  getRequirementLabel,
} from "./_glossary";

// ── Callbacks ────────────────────────────────────────────────────────────

export interface GameCallbacks {
  tick: (deltaMs: number) => void;
  setRoomActive: (roomId: string, isActive: boolean) => void;
  purchaseBuildingUpgrade: (upgradeId: string) => void;
  purchaseRoomUpgrade: (roomId: string, upgradeId: string) => void;
  acceptRecruit: (visitorId: string) => void;
  rejectRecruit: (visitorId: string) => void;
  hireStaff: (roleTag: string) => void;
  assignStaff: (staffId: string, roomId?: string) => void;
  placeRoom: (templateId: string, floorIndex: number, slotId: string) => void;
  setActiveFloor: (floorIndex: number) => void;
  buyItem: (itemId: string) => void;
  sellItem: (itemId: string, quantity: number) => void;
  autoAssignAccessory: (operatorId: string) => void;
  unequipItem: (operatorId: string, slot: "weapon" | "outfitOverlay" | "accessory") => void;
  bidContract: (postingId: string) => void;
  advanceContract: () => void;
}

// ── View model types ─────────────────────────────────────────────────────

export interface GuildViewModel {
  treasury: number;
  reputation: number;
  intel: number;
  pressure: number;
}

export interface TimeViewModel {
  day: number;
  minuteOfDay: number;
  formatted: string;
}

export interface BuildingViewModel {
  id: string;
  name: string;
  description: string;
  tier: number;
  activeFloorIndex: number;
  floorCount: number;
  usedRoomSlots: number;
  totalRoomSlots: number;
  operatorSlots: number;
  unlockedRoomTemplateIds: readonly string[];
  availableBuildingUpgradeIds: readonly string[];
}

export interface RoomFootprintViewModel {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

export interface RoomViewModel {
  id: string;
  templateId: string;
  name: string;
  description: string;
  tier: number;
  floorIndex: number;
  slotId: string;
  roomStateId: string;
  capacity: number;
  occupancy: number;
  isActive: boolean;
  isOperational: boolean;
  requiredStaffTag: string;
  assignedStaffCount: number;
  appliedUpgradeIds: readonly string[];
  availableUpgradeIds: readonly string[];
  tags: readonly string[];
  reservedFootprint: RoomFootprintViewModel;
  activeFootprint: RoomFootprintViewModel;
}

export interface ExpansionSlotViewModel {
  id: string;
  label: string;
  kind: "available" | "locked";
  floorIndex: number;
  slotId: string;
  footprint: RoomFootprintViewModel;
}

export interface UpgradeViewModel {
  id: string;
  name: string;
  description: string;
  target: "building" | "room";
  targetId: string;
  isApplied: boolean;
  isAffordable: boolean;
  requirements: readonly RequirementDisplayItem[];
  effects: readonly EffectDisplayItem[];
}

export interface RequirementDisplayItem {
  label: string;
  type: string;
}

export interface EffectDisplayItem {
  label: string;
  type: string;
}

export interface RaidOpportunityViewModel {
  id: string;
  missionName: string;
  missionId: string;
  location: string;
  threatRank: string;
  intelConfidence: string;
  status: "available" | "claimed" | "expired";
  interestedCount: number;
  claimedCount: number;
  reward: number;
  risk: number;
  recommendedOperatorCount: number;
}

export interface RaidEventViewModel {
  id: string;
  kind: string;
  message: string;
  tick: number;
}

export interface RaidTranscriptEvent {
  kind: RaidStepKind;
  message: string;
  tickOffset: number;
  goalCheckKind?: GoalCheckKind;
  goalCheckGrade?: GoalCheckGrade;
  enemyTemplateId?: string;
}

export interface RaidFocusedTeamDetail {
  raidId: string;
  operatorIds: string[];
  events: RaidTranscriptEvent[];
  siteNodes: { nodeId: string; kind: string; discovered: boolean }[];
  currentNodeId: string;
  enemiesEncountered: string[];
  goalChecks: { kind: GoalCheckKind; grade: GoalCheckGrade }[];
}

export interface ActiveRaidViewModel {
  id: string;
  missionName: string;
  missionId: string;
  startedAt: string;
  revealProgress: number;
  operatorIds: readonly string[];
  location: string;
  threat: number;
  cohesion: number;
  durationHours: number;
  teamGoal?: string;
  teamState?: "active" | "returning" | "defeated";
  x?: number;
  y?: number;
  recentEvents: readonly RaidEventViewModel[];
  transcriptEvents?: RaidTranscriptEvent[];
  focusedDetail?: RaidFocusedTeamDetail;
}

export interface RaidOperatorOutcomeViewModel {
  operatorId: string;
  operatorName: string;
  died: boolean;
}

export interface RaidSummaryViewModel {
  id: string;
  missionName: string;
  missionId: string;
  startedAt: string;
  endedAt: string;
  result: "success" | "failure" | "mixed";
  reputationDelta: number;
  cashDelta: number;
  location: string;
  narrativeTags: readonly string[];
  operatorOutcomes: readonly RaidOperatorOutcomeViewModel[];
}

export interface OperatorLifecycleViewModel {
  status: "active" | "dead" | "departed";
  deathTick?: number;
  deathRaidSummaryId?: string;
  departureTick?: number;
  departureReason?: string;
}

export interface RosterPressureViewModel {
  operatorCapacity: number;
  livingOperatorCount: number;
  vacancyCount: number;
  unavailableOperatorIds: readonly string[];
  recentDeathOperatorIds: readonly string[];
  replacementPressureLevel: "stable" | "strained" | "critical";
}

export interface OperatorViewModel {
  id: string;
  name: string;
  roleTag: string;
  specialtyTag: string;
  moraleCurrent: number;
  moraleBaseline: number;
  loyaltyCurrent: number;
  loyaltyBaseline: number;
  assignmentKind: string;
  assignmentTargetId: string;
  injurySeverity: number;
  injuryRecoveryHours: number;
  needHunger: number;
  needFatigue: number;
  needStress: number;
  scheduleBlock: string;
  riskTolerance: number;
  intent: string;
  dominantNeed: string;
  availableForRaid: boolean;
  readinessScore: number;
  appearancePresetId: string;
  visibleGear: VisibleGear;
  lifecycle: OperatorLifecycleViewModel;
  /** Phase 2: operator may refuse raid assignments due to low morale. */
  refusalRisk: boolean;
  /** Phase 2: operator may quit due to critically low morale. */
  quitRisk: boolean;
  /** Phase 2: operator may leave due to low loyalty. */
  retentionRisk: boolean;
  autonomyReasons: readonly string[];
}

export interface StaffViewModel {
  id: string;
  name: string;
  roleTag: string;
  status: string;
  wage: number;
  assignmentKind: string;
  assignmentTargetId: string;
}

export interface VisitorViewModel {
  id: string;
  name: string;
  desiredRoleTag: string;
  patience: number;
  quality: number;
  expectedLoyalty: number;
  projectedMorale: number;
  projectedLoyalty: number;
  presetId: string;
  rank: string;
}

export interface RelationshipViewModel {
  operatorAId: string;
  operatorBId: string;
  operatorAName: string;
  operatorBName: string;
  trust: number;
  friction: number;
  familiarity: number;
  recentSharedOutcome: number;
  cohesion: number;
  historyTags: readonly string[];
}

export interface ActiveEventViewModel {
  id: string;
  templateId: string;
  name: string;
  severity: number;
  remainingHours: number;
}

// ── Phase 2 view model types ────────────────────────────────────────────

export interface TeamViewModel {
  id: string;
  memberIds: readonly string[];
  memberNames: readonly string[];
  cohesion: number;
  raidCount: number;
  damaged: boolean;
  damageReason: string;
  statusSummary: string;
  explanationReasons: readonly string[];
}

export interface RoomCultureViewModel {
  roomId: string;
  roomName: string;
  tone: string;
  summary: string;
  signals: readonly string[];
}

export interface InventoryItemViewModel {
  itemId: string;
  name: string;
  quantity: number;
  category: string;
}

export interface EquipmentViewModel {
  operatorId: string;
  operatorName: string;
  weaponId: string;
  weaponName: string;
  outfitOverlayId: string;
  outfitOverlayName: string;
  accessoryId: string;
  accessoryName: string;
  accessoryReason: string;
  accessorySummary: string;
}

export interface MarketItemViewModel {
  itemId: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  available: boolean;
}

export type EventLogKind =
  | "team_departure"
  | "team_return"
  | "injury"
  | "death"
  | "morale_threshold"
  | "loyalty_threshold"
  | "staffing_change"
  | "resource_swing"
  | "event_change"
  | "raid_result"
  | "team_status"
  | "room_culture";

export interface EventLogEntry {
  id: string;
  timestamp: string;
  kind: EventLogKind;
  message: string;
  targetKind?: "operator" | "room" | "team" | "staff";
  targetId?: string;
  accent: string;
}

export interface PlaceableRoomTemplate {
  id: string;
  name: string;
  description: string;
  tier: number;
  baseCapacity: number;
  tags: readonly string[];
}

export interface HqViewModel {
  guild: GuildViewModel;
  time: TimeViewModel;
  building: BuildingViewModel;
  rooms: readonly RoomViewModel[];
  expansionSlots: readonly ExpansionSlotViewModel[];
  upgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  operators: readonly OperatorViewModel[];
  staff: readonly StaffViewModel[];
  visitors: readonly VisitorViewModel[];
  relationships: readonly RelationshipViewModel[];
  activeEvents: readonly ActiveEventViewModel[];
  placeableRoomTemplates: readonly PlaceableRoomTemplate[];
  rosterPressure: RosterPressureViewModel;
}

export interface ContractSiteViewModel {
  contractSiteId: string;
  missionName: string;
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
}

export interface PostedContractViewModel {
  postingId: string;
  missionName: string;
  siteConceptName: string;
  location: string;
  rank: string;
  threat: number;
  intel: number;
  reward: number;
  risk: number;
  bidCost: number;
  canBid: boolean;
  knownTraits: readonly string[];
  hiddenTraitCount: number;
  enemyHints: readonly string[];
  lootFamilyHints: readonly string[];
  bossHint: string | null;
  neighborhoodLabel: string;
}

export interface ContractResultViewModel {
  contractSiteId: string;
  missionName: string;
  siteConceptName: string;
  location: string;
  rank: string;
  outcome: "boss_defeated" | "contract_lost";
  totalRaids: number;
  totalCashEarned: number;
  totalReputationEarned: number;
  operatorDeaths: number;
}

export interface RaidEnemyViewModel {
  id: string;
  x: number;
  y: number;
  threat: string;
  discovered: boolean;
}

export interface RaidFeatureViewModel {
  id: string;
  x: number;
  y: number;
  kind: string;
  discovered: boolean;
}

export interface RaidWorldViewModel {
  enemyMarkers: readonly RaidEnemyViewModel[];
  featureMarkers: readonly RaidFeatureViewModel[];
}

export interface OperationsViewModel {
  contractLifecycle: "idle" | "bidding" | "active" | "resolved";
  contractSite: ContractSiteViewModel | null;
  contractResult: ContractResultViewModel | null;
  postedContracts: readonly PostedContractViewModel[];
  opportunities: readonly RaidOpportunityViewModel[];
  activeRaids: readonly ActiveRaidViewModel[];
  raidHistory: readonly RaidSummaryViewModel[];
  raidWorld: RaidWorldViewModel | null;
  minuteOfDay: number;
}

/** Map a contract rank letter to a badge CSS class. */
export function rankBadgeClass(rank: string): string {
  switch (rank.toUpperCase()) {
    case "S":
    case "A":
      return "badge-gold";
    case "B":
    case "C":
      return "badge-ember";
    default:
      return "badge-slate";
  }
}

// ── Formatting helpers ───────────────────────────────────────────────────

function formatTimeOfDay(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function resolveMissionName(missionId: string, registry: TemplateRegistry): string {
  return registry.missionById.get(missionId)?.name ?? getIdentifierLabel(missionId);
}

function normalizeOpportunityStatus(status: unknown): RaidOpportunityViewModel["status"] {
  if (status === "claimed" || status === "forming") {
    return "claimed";
  }

  return status === "expired" ? "expired" : "available";
}

function toFootprintViewModel(
  footprint: Readonly<{ col: number; row: number; cols: number; rows: number }>,
): RoomFootprintViewModel {
  return {
    col: footprint.col,
    row: footprint.row,
    cols: footprint.cols,
    rows: footprint.rows,
  };
}

function getOrderedBuildingSlots(
  buildingId: string,
  buildingTier: number,
): readonly {
  floorIndex: number;
  slotId: string;
  footprint: RoomFootprintViewModel;
  floorSlotIndex: number;
}[] {
  return getBuildingFloors(buildingId, buildingTier).flatMap((floor) =>
    floor.slots.map((slot, floorSlotIndex) => ({
      floorIndex: floor.floorIndex,
      slotId: slot.slotId,
      footprint: toFootprintViewModel(slot),
      floorSlotIndex,
    })),
  );
}

function buildExpansionSlots(
  buildingId: string,
  buildingTier: number,
  activeFloorIndex: number,
  roomSlotCount: number,
  occupiedSlotKeys: ReadonlySet<string>,
): ExpansionSlotViewModel[] {
  const orderedSlots = getOrderedBuildingSlots(buildingId, buildingTier);
  const unlockedSlotKeys = new Set(
    orderedSlots
      .slice(0, Math.max(roomSlotCount, occupiedSlotKeys.size))
      .map((slot) => getSlotKey(slot.floorIndex, slot.slotId)),
  );

  return orderedSlots
    .filter(
      (slot) =>
        slot.floorIndex === activeFloorIndex &&
        !occupiedSlotKeys.has(getSlotKey(slot.floorIndex, slot.slotId)),
    )
    .map((slot) => {
      const kind: ExpansionSlotViewModel["kind"] = unlockedSlotKeys.has(
        getSlotKey(slot.floorIndex, slot.slotId),
      )
        ? "available"
        : "locked";

      return {
        id: `room-slot/${slot.floorIndex}/${slot.slotId}`,
        label: `${kind === "available" ? "Open" : "Locked"} ${formatSlotLabel(slot.slotId)}`,
        kind,
        floorIndex: slot.floorIndex,
        slotId: slot.slotId,
        footprint: slot.footprint,
      };
    });
}

// ── Phase1RuntimeView builders ───────────────────────────────────────────

function mapUpgradeTemplate(
  template: {
    id: string;
    name: string;
    description?: string;
    target: "building" | "room";
    targetId: string;
    requirements: Array<{ type: string; [k: string]: unknown }>;
    effects: Array<{ type: string; [k: string]: unknown }>;
  },
  appliedIds: readonly string[],
  affordableIds: readonly string[],
): UpgradeViewModel {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    target: template.target,
    targetId: template.targetId,
    isApplied: appliedIds.includes(template.id),
    isAffordable: affordableIds.includes(template.id),
    requirements: template.requirements.map((req) => ({
      label: getRequirementLabel(req),
      type: req.type,
    })),
    effects: template.effects.map((eff) => ({
      label: getEffectLabel(eff),
      type: eff.type,
    })),
  };
}

export function buildHqViewFromPhase1(
  view: Phase1RuntimeView,
  registry: TemplateRegistry,
): HqViewModel {
  const buildingTemplate =
    registry.buildingById.get(view.building.activeBuildingId) ?? registry.buildings[0];
  const activeFloorIndex = view.building.activeFloorIndex;
  const floorCount = Math.max(
    view.building.floorCount,
    getBuildingFloors(buildingTemplate.id, view.building.tier).length || 1,
  );

  const rooms: RoomViewModel[] = view.rooms.map((room) => {
    const template = registry.roomById.get(room.templateId) ?? registry.rooms[0];
    const reservedFootprint = toFootprintViewModel(room.reservedFootprint ?? room.footprint);
    const activeFootprint = toFootprintViewModel(room.activeFootprint ?? room.footprint);
    return {
      id: room.id,
      templateId: room.templateId,
      name: room.name,
      description: template.description ?? "",
      tier: room.tier,
      floorIndex: room.floorIndex,
      slotId: room.slotId,
      roomStateId: room.roomStateId,
      capacity: room.capacity,
      occupancy: room.occupancy,
      isActive: room.isRequestedActive,
      isOperational: room.isOperational,
      requiredStaffTag: room.requiredStaffTag,
      assignedStaffCount: room.assignedStaffCount,
      appliedUpgradeIds: room.appliedUpgradeIds,
      availableUpgradeIds: room.availableUpgradeIds,
      tags: template.tags,
      reservedFootprint,
      activeFootprint,
    };
  });

  const occupiedSlotKeys = new Set(
    view.rooms.map((room) => getSlotKey(room.floorIndex, room.slotId)),
  );
  const expansionSlots = buildExpansionSlots(
    buildingTemplate.id,
    view.building.tier,
    activeFloorIndex,
    view.building.roomSlotCount,
    occupiedSlotKeys,
  );

  const buildingUpgrades: UpgradeViewModel[] = buildingTemplate.upgradeIds
    .map((id) => registry.upgradeById.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map((template) =>
      mapUpgradeTemplate(
        template,
        view.building.appliedUpgradeIds,
        view.building.availableBuildingUpgradeIds,
      ),
    );

  const roomUpgrades: UpgradeViewModel[] = view.rooms.flatMap((room) =>
    registry.upgrades
      .filter((template) => template.target === "room" && template.targetId === room.templateId)
      .map((template) =>
        mapUpgradeTemplate(template, room.appliedUpgradeIds, room.availableUpgradeIds),
      ),
  );

  const operators: OperatorViewModel[] = view.operators.map((op) => ({
    id: op.id,
    name: op.identity.name,
    roleTag: op.identity.roleTag,
    specialtyTag: op.identity.specialtyTag,
    moraleCurrent: Math.round(op.morale.current),
    moraleBaseline: Math.round(op.morale.baseline),
    loyaltyCurrent: Math.round(op.loyalty.current),
    loyaltyBaseline: Math.round(op.loyalty.baseline),
    assignmentKind: op.assignment.kind,
    assignmentTargetId: op.assignment.targetId,
    injurySeverity: Math.round(op.injury.severity),
    injuryRecoveryHours: Math.round(op.injury.recoveryHoursRemaining),
    needHunger: Math.round(op.needs.hunger),
    needFatigue: Math.round(op.needs.fatigue),
    needStress: Math.round(op.needs.stress),
    scheduleBlock: op.schedule.currentBlock,
    riskTolerance: Math.round(op.preferences.riskTolerance),
    intent: op.intent,
    dominantNeed: op.dominantNeed,
    availableForRaid: op.availableForRaid,
    readinessScore: Math.round(op.readinessScore),
    appearancePresetId: op.appearance.presetId,
    visibleGear: resolveVisibleGear(op.appearance.visibleGear, getLoadedParts()),
    lifecycle: extractLifecycle(op.lifecycle),
    // Phase 2: defaults until enriched via enrichOperatorsWithAutonomy
    refusalRisk: false,
    quitRisk: false,
    retentionRisk: false,
    autonomyReasons: [],
  }));

  const operatorNameById = new Map(operators.map((op) => [op.id, op.name]));

  const staff: StaffViewModel[] = view.staff.map((s) => ({
    id: s.id,
    name: s.name,
    roleTag: s.roleTag,
    status: s.status,
    wage: s.wage,
    assignmentKind: s.assignment.kind,
    assignmentTargetId: s.assignment.targetId,
  }));

  const visitors: VisitorViewModel[] = view.visitors.map((v) => ({
    id: v.id,
    name: v.name,
    desiredRoleTag: v.desiredRoleTag,
    patience: v.patience,
    quality: v.quality,
    expectedLoyalty: v.expectedLoyalty,
    projectedMorale: Math.round(v.projectedMorale ?? projectVisitorRecruitMorale(v.quality)),
    projectedLoyalty: Math.round(
      v.projectedLoyalty ?? projectVisitorRecruitLoyalty(v.expectedLoyalty),
    ),
    presetId: selectOperatorAppearanceRecipeId({ stableKey: v.id }),
    rank: visitorQualityToRank(v.quality),
  }));

  const relationships: RelationshipViewModel[] = view.relationshipSignals.map((rel) => ({
    operatorAId: rel.operatorAId,
    operatorBId: rel.operatorBId,
    operatorAName: operatorNameById.get(rel.operatorAId) ?? getIdentifierLabel(rel.operatorAId),
    operatorBName: operatorNameById.get(rel.operatorBId) ?? getIdentifierLabel(rel.operatorBId),
    trust: rel.trust,
    friction: rel.friction,
    familiarity: rel.familiarity,
    recentSharedOutcome: rel.recentSharedOutcome,
    cohesion: rel.cohesion,
    historyTags: rel.historyTags ?? [],
  }));

  const activeEvents: ActiveEventViewModel[] = view.activeEvents.map((evt) => ({
    id: evt.id,
    templateId: evt.templateId,
    name:
      registry.events.find((e) => e.id === evt.templateId)?.name ??
      getIdentifierLabel(evt.templateId),
    severity: evt.severity,
    remainingHours: evt.remainingHours,
  }));

  const placedTemplateIds = new Set(view.rooms.map((r) => r.templateId));
  const placeableRoomTemplates: PlaceableRoomTemplate[] = view.building.unlockedRoomTemplateIds
    .map((id) => registry.roomById.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .filter((t) => !placedTemplateIds.has(t.id))
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      tier: t.tier,
      baseCapacity: t.baseCapacity,
      tags: t.tags,
    }));

  const rosterPressure = mapRuntimeRosterPressure(view.rosterPressure);

  return {
    guild: {
      treasury: view.resources.cash,
      reputation: view.resources.reputation,
      intel: view.resources.intel,
      pressure: view.resources.pressure,
    },
    time: {
      day: view.clock.day,
      minuteOfDay: view.clock.minuteOfDay,
      formatted: formatTimeOfDay(view.clock.minuteOfDay),
    },
    building: {
      id: buildingTemplate.id,
      name: buildingTemplate.name,
      description: buildingTemplate.description ?? "",
      tier: view.building.tier,
      activeFloorIndex,
      floorCount,
      usedRoomSlots: view.building.roomsUsed,
      totalRoomSlots: view.building.roomSlotCount,
      operatorSlots: view.building.operatorSlotCount,
      unlockedRoomTemplateIds: view.building.unlockedRoomTemplateIds,
      availableBuildingUpgradeIds: view.building.availableBuildingUpgradeIds,
    },
    rooms,
    expansionSlots,
    upgrades: buildingUpgrades,
    roomUpgrades,
    operators,
    staff,
    visitors,
    relationships,
    activeEvents,
    placeableRoomTemplates,
    rosterPressure,
  };
}

export function buildOpsViewFromPhase1(
  view: Phase1RuntimeView,
  registry: TemplateRegistry,
): OperationsViewModel {
  const opportunities: RaidOpportunityViewModel[] = view.raidOpportunities.map((opp) => {
    return {
      id: opp.id,
      missionName: resolveMissionName(opp.missionId, registry),
      missionId: opp.missionId,
      location: getLocationLabel(opp.location),
      threatRank:
        opp.threat <= 30
          ? "E"
          : opp.threat <= 50
            ? "D"
            : opp.threat <= 70
              ? "C"
              : opp.threat <= 85
                ? "B"
                : "A",
      intelConfidence: opp.intel <= 30 ? "Low" : opp.intel <= 60 ? "Moderate" : "High",
      status: normalizeOpportunityStatus(opp.status),
      interestedCount: opp.interestedCount,
      claimedCount: opp.claimedCount,
      reward: opp.reward,
      risk: opp.risk,
      recommendedOperatorCount: opp.recommendedOperatorCount,
    };
  });

  const activeRaids: ActiveRaidViewModel[] = view.activeRaids.map((raid) => {
    const run: RaidRunSnapshot | undefined = raid.raidRun;
    const transcriptEvents: RaidTranscriptEvent[] | undefined = run
      ? run.steps
          .filter((s) => s.message != null)
          .map((s) => ({
            kind: s.kind,
            message: s.message ?? "",
            tickOffset: s.tickOffset,
            goalCheckKind: s.goalCheckKind,
            goalCheckGrade: s.goalCheckGrade,
            enemyTemplateId: s.enemyTemplateId,
          }))
      : undefined;

    const focusedDetail: RaidFocusedTeamDetail | undefined = run
      ? {
          raidId: run.raidId,
          operatorIds: run.teamOperatorIds,
          events: transcriptEvents ?? [],
          siteNodes: run.siteGraph.map((n) => ({
            nodeId: n.nodeId,
            kind: n.kind,
            discovered: n.discovered ?? false,
          })),
          currentNodeId: run.derivedState.currentNodeId,
          enemiesEncountered: run.derivedState.discoveredEnemyIds,
          goalChecks: run.steps
            .filter((s) => s.kind === "goal_check" && s.goalCheckKind && s.goalCheckGrade)
            .map((s) => ({
              kind: s.goalCheckKind as GoalCheckKind,
              grade: s.goalCheckGrade as GoalCheckGrade,
            })),
        }
      : undefined;

    return {
      id: raid.id,
      missionName: resolveMissionName(raid.missionId, registry),
      missionId: raid.missionId,
      startedAt: raid.startedAt,
      revealProgress: raid.revealProgress,
      operatorIds: raid.operatorIds,
      location: getLocationLabel(raid.location),
      threat: raid.threat,
      cohesion: raid.cohesion,
      durationHours: raid.durationHours,
      teamGoal: raid.teamGoal,
      teamState: raid.teamState,
      x: raid.x,
      y: raid.y,
      recentEvents: (raid.recentEvents ?? []).map((evt) => ({
        id: evt.id,
        kind: evt.kind,
        message: evt.message,
        tick: evt.tick,
      })),
      transcriptEvents,
      focusedDetail,
    };
  });

  const operatorNameById = new Map(view.operators.map((op) => [op.id, op.identity.name]));

  const raidHistory: RaidSummaryViewModel[] = view.raidSummaries.map((summary) => ({
    id: summary.id,
    missionName: resolveMissionName(summary.missionId, registry),
    missionId: summary.missionId,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    result: summary.result,
    reputationDelta: summary.reputationDelta,
    cashDelta: summary.cashDelta,
    location: getLocationLabel(summary.location),
    narrativeTags: summary.narrativeTags,
    operatorOutcomes: (summary.operatorOutcomes ?? []).map((outcome) => ({
      operatorId: outcome.operatorId,
      operatorName:
        operatorNameById.get(outcome.operatorId) ?? getIdentifierLabel(outcome.operatorId),
      died: outcome.died === true,
    })),
  }));

  const contractSite: ContractSiteViewModel | null = view.contractSite
    ? {
        contractSiteId: view.contractSite.contractSiteId,
        missionName: resolveMissionName(view.contractSite.missionId, registry),
        siteConceptName: view.contractSite.siteConceptName ?? "Unknown Site",
        location: getLocationLabel(view.contractSite.location),
        rank: (view.contractSite.rank ?? "f").toUpperCase(),
        bossDefeated: view.contractSite.bossDefeated,
        contractLost: view.contractSite.contractLost,
        threat: view.contractSite.threat,
        intel: view.contractSite.intel,
        reward: view.contractSite.reward,
        explorationProgress: view.contractSite.explorationProgress ?? 0,
        bossAvailable: view.contractSite.bossAvailable ?? false,
      }
    : null;

  const contractResult: ContractResultViewModel | null = view.contractResult
    ? {
        contractSiteId: view.contractResult.contractSiteId,
        missionName: resolveMissionName(view.contractResult.missionId, registry),
        siteConceptName: view.contractResult.siteConceptName ?? "Unknown Site",
        location: getLocationLabel(view.contractResult.location),
        rank: (view.contractResult.rank ?? "f").toUpperCase(),
        outcome: view.contractResult.outcome,
        totalRaids: view.contractResult.totalRaids,
        totalCashEarned: view.contractResult.totalCashEarned,
        totalReputationEarned: view.contractResult.totalReputationEarned,
        operatorDeaths: view.contractResult.operatorDeaths,
      }
    : null;

  const postedContracts: PostedContractViewModel[] = (view.postedContracts ?? []).map((p) => ({
    postingId: p.postingId,
    missionName: resolveMissionName(p.missionId, registry),
    siteConceptName: p.siteConceptName ?? "Unknown Site",
    location: getLocationLabel(p.location),
    rank: (p.rank ?? "f").toUpperCase(),
    threat: p.threat,
    intel: p.intel,
    reward: p.reward,
    risk: p.risk,
    bidCost: p.bidCost,
    canBid: p.canBid,
    knownTraits: p.knownTraits ?? [],
    hiddenTraitCount: p.hiddenTraitCount ?? 0,
    enemyHints: p.enemyHints ?? [],
    lootFamilyHints: p.lootFamilyHints ?? [],
    bossHint: p.bossHint ?? null,
    neighborhoodLabel: p.neighborhoodLabel ?? "",
  }));

  const raidWorld: RaidWorldViewModel | null = view.raidWorld
    ? {
        enemyMarkers: view.raidWorld.enemyMarkers.map((enemy) => ({
          id: enemy.id,
          x: enemy.x,
          y: enemy.y,
          threat: enemy.threat,
          discovered: enemy.discovered,
        })),
        featureMarkers: view.raidWorld.featureMarkers.map((feature) => ({
          id: feature.id,
          x: feature.x,
          y: feature.y,
          kind: feature.kind,
          discovered: feature.discovered,
        })),
      }
    : null;

  return {
    contractLifecycle: view.contractLifecycle ?? "bidding",
    contractSite,
    contractResult,
    postedContracts,
    opportunities,
    activeRaids,
    raidHistory,
    raidWorld,
    minuteOfDay: view.clock.minuteOfDay,
  };
}

// ── Legacy WorldSnapshot builders (retained for render-layer compat) ─────

export function buildHqViewModel(snapshot: WorldSnapshot, registry: TemplateRegistry): HqViewModel {
  const buildingTemplate =
    registry.buildingById.get(snapshot.building.activeBuildingId) ?? registry.buildings[0];
  const activeFloorIndex = snapshot.building.activeFloorIndex ?? 0;
  const floorCount = Math.max(
    getBuildingFloors(buildingTemplate.id, snapshot.building.activeBuildingTier).length || 1,
    1,
  );

  const rooms: RoomViewModel[] = snapshot.rooms.map((room) => {
    const template = registry.roomById.get(room.templateId) ?? registry.rooms[0];
    const reservedFootprint = toFootprintViewModel(room.reservedFootprint ?? room.footprint);
    const activeFootprint = toFootprintViewModel(room.activeFootprint ?? room.footprint);
    return {
      id: room.id,
      templateId: room.templateId,
      name: template.name,
      description: template.description ?? "",
      tier: room.tier,
      floorIndex: room.floorIndex,
      slotId: room.slotId,
      roomStateId: room.roomStateId,
      capacity: room.capacity,
      occupancy: room.occupancy,
      isActive: room.isActive ?? true,
      isOperational: room.isActive ?? true,
      requiredStaffTag: "",
      assignedStaffCount: 0,
      appliedUpgradeIds: [],
      availableUpgradeIds: [],
      tags: template.tags,
      reservedFootprint,
      activeFootprint,
    };
  });

  const occupiedSlotKeys = new Set(
    snapshot.rooms.map((room) => getSlotKey(room.floorIndex, room.slotId)),
  );
  const expansionSlots = buildExpansionSlots(
    buildingTemplate.id,
    snapshot.building.activeBuildingTier,
    activeFloorIndex,
    snapshot.building.roomSlotCount,
    occupiedSlotKeys,
  );

  const upgrades: UpgradeViewModel[] = buildingTemplate.upgradeIds
    .map((id) => registry.upgradeById.get(id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined)
    .map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description ?? "",
      target: template.target,
      targetId: template.targetId,
      isApplied: snapshot.appliedUpgradeIds.includes(template.id),
      isAffordable: false,
      requirements: template.requirements.map((req) => ({
        label: getRequirementLabel(req),
        type: req.type,
      })),
      effects: template.effects.map((eff) => ({
        label: getEffectLabel(eff),
        type: eff.type,
      })),
    }));

  const operators: OperatorViewModel[] = (snapshot.operators ?? []).map((op) => {
    const identity = op.identity;
    const morale = rec(op as Record<string, unknown>, "morale");
    const loyalty = rec(op as Record<string, unknown>, "loyalty");
    const injury = rec(op as Record<string, unknown>, "injury");
    const needs = rec(op as Record<string, unknown>, "needs");
    const schedule = rec(op as Record<string, unknown>, "schedule");
    const prefs = rec(op as Record<string, unknown>, "preferences");
    const assignment = op.assignment;
    const appearance = rec(op as Record<string, unknown>, "appearance");

    return {
      id: op.id,
      name: str(identity, "name", getIdentifierLabel(op.id)),
      roleTag: str(identity, "roleTag", "unassigned"),
      specialtyTag: str(identity, "specialtyTag", ""),
      moraleCurrent: num(morale, "current", 50),
      moraleBaseline: num(morale, "baseline", 50),
      loyaltyCurrent: num(loyalty, "current", 50),
      loyaltyBaseline: num(loyalty, "baseline", 50),
      assignmentKind: str(assignment, "kind", "idle"),
      assignmentTargetId: str(assignment, "targetId", ""),
      injurySeverity: num(injury, "severity", 0),
      injuryRecoveryHours: num(injury, "recoveryHoursRemaining", 0),
      needHunger: num(needs, "hunger", 0),
      needFatigue: num(needs, "fatigue", 0),
      needStress: num(needs, "stress", 0),
      scheduleBlock: str(schedule, "currentBlock", "idle"),
      riskTolerance: num(prefs, "riskTolerance", 50),
      intent: "idle",
      dominantNeed: "idle",
      availableForRaid: false,
      readinessScore: 0,
      appearancePresetId: str(appearance, "presetId", "kael-001"),
      visibleGear: resolveVisibleGear(
        appearance ? extractVisibleGear(appearance) : undefined,
        getLoadedParts(),
      ),
      lifecycle: extractLifecycle(rec(op as Record<string, unknown>, "lifecycle")),
      refusalRisk: false,
      quitRisk: false,
      retentionRisk: false,
      autonomyReasons: [],
    };
  });

  const operatorNameById = new Map(operators.map((op) => [op.id, op.name]));

  const staff: StaffViewModel[] = (snapshot.staff ?? []).map((s) => {
    const raw = s as Record<string, unknown>;
    const assignment = rec(raw, "assignment");
    return {
      id: s.id,
      name: str(raw, "name", getIdentifierLabel(s.id)),
      roleTag: str(raw, "roleTag", "general"),
      status: str(raw, "status", "unassigned"),
      wage: num(raw, "wage", 0),
      assignmentKind: str(assignment, "kind", "idle"),
      assignmentTargetId: str(assignment, "targetId", ""),
    };
  });

  const visitors: VisitorViewModel[] = (snapshot.visitors ?? []).map((v) => {
    const raw = v as Record<string, unknown>;
    const quality = num(raw, "quality", 50);
    return {
      id: v.id,
      name: str(raw, "name", getIdentifierLabel(v.id)),
      desiredRoleTag: str(raw, "desiredRoleTag", "unknown"),
      patience: num(raw, "patience", 10),
      quality,
      expectedLoyalty: num(raw, "expectedLoyalty", 50),
      projectedMorale: Math.round(
        num(raw, "projectedMorale", projectVisitorRecruitMorale(quality)),
      ),
      projectedLoyalty: Math.round(
        num(raw, "projectedLoyalty", projectVisitorRecruitLoyalty(num(raw, "expectedLoyalty", 50))),
      ),
      presetId: selectOperatorAppearanceRecipeId({ stableKey: v.id }),
      rank: visitorQualityToRank(quality),
    };
  });

  const relationships: RelationshipViewModel[] = (snapshot.operatorRelationships ?? []).map(
    (rel) => ({
      operatorAId: rel.operatorAId,
      operatorBId: rel.operatorBId,
      operatorAName: operatorNameById.get(rel.operatorAId) ?? getIdentifierLabel(rel.operatorAId),
      operatorBName: operatorNameById.get(rel.operatorBId) ?? getIdentifierLabel(rel.operatorBId),
      trust: rel.trust,
      friction: rel.friction,
      familiarity: rel.familiarity ?? 0,
      recentSharedOutcome: rel.recentSharedOutcome ?? 0,
      cohesion: Math.max(0, rel.trust - rel.friction),
      historyTags: rel.historyTags ?? [],
    }),
  );

  return {
    guild: {
      treasury: snapshot.guild.treasury,
      reputation: snapshot.guild.reputation,
      intel: snapshot.guild.intel,
      pressure: 0,
    },
    time: {
      day: snapshot.time.day,
      minuteOfDay: snapshot.time.minuteOfDay,
      formatted: formatTimeOfDay(snapshot.time.minuteOfDay),
    },
    building: {
      id: buildingTemplate.id,
      name: buildingTemplate.name,
      description: buildingTemplate.description ?? "",
      tier: snapshot.building.activeBuildingTier,
      activeFloorIndex,
      floorCount,
      usedRoomSlots: snapshot.rooms.filter((room) => room.floorIndex === activeFloorIndex).length,
      totalRoomSlots: snapshot.building.roomSlotCount,
      operatorSlots: snapshot.building.operatorSlotCount,
      unlockedRoomTemplateIds: [],
      availableBuildingUpgradeIds: [],
    },
    rooms,
    expansionSlots,
    upgrades,
    roomUpgrades: [],
    operators,
    staff,
    visitors,
    relationships,
    activeEvents: [],
    placeableRoomTemplates: [],
    rosterPressure: buildSafeRosterPressure(
      snapshot.building.operatorSlotCount,
      operators.filter((op) => op.lifecycle.status === "active").length,
    ),
  };
}

function mapActiveRaid(raid: ActiveRaidSnapshot, registry: TemplateRegistry): ActiveRaidViewModel {
  return {
    id: raid.id,
    missionName: resolveMissionName(raid.missionId, registry),
    missionId: raid.missionId,
    startedAt: raid.startedAt,
    revealProgress: raid.revealProgress,
    operatorIds: [],
    location: "",
    threat: 0,
    cohesion: 0,
    durationHours: 0,
    recentEvents: [],
  };
}

function mapRaidSummary(
  summary: RaidSummarySnapshot,
  registry: TemplateRegistry,
): RaidSummaryViewModel {
  return {
    id: summary.id,
    missionName: resolveMissionName(summary.missionId, registry),
    missionId: summary.missionId,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    result: summary.result,
    reputationDelta: summary.reputationDelta,
    cashDelta: summary.cashDelta,
    location: "",
    narrativeTags: [],
    operatorOutcomes: (summary.operatorOutcomes ?? []).map((outcome) => ({
      operatorId: outcome.operatorId,
      operatorName: getIdentifierLabel(outcome.operatorId),
      died: outcome.died === true,
    })),
  };
}

export function buildOperationsViewModel(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
): OperationsViewModel {
  const opportunities: RaidOpportunityViewModel[] = (snapshot.raidOpportunities ?? []).map(
    (opp, index) => {
      return {
        id: typeof opp["id"] === "string" ? opp["id"] : `opp-${index}`,
        missionName: resolveMissionName(opp.missionId, registry),
        missionId: opp.missionId,
        location:
          typeof opp.location === "string" ? getLocationLabel(opp.location) : "Unknown Sector",
        threatRank: typeof opp.threat === "string" ? opp.threat : "E",
        intelConfidence: typeof opp.intel === "string" ? opp.intel : "Low",
        status: normalizeOpportunityStatus(opp.status),
        interestedCount: opp.interestedOperatorIds?.length ?? 0,
        claimedCount: opp.claimedOperatorIds?.length ?? 0,
        reward: 0,
        risk: 0,
        recommendedOperatorCount: 0,
      };
    },
  );

  return {
    contractLifecycle: snapshot.contractLifecycle ?? "bidding",
    contractSite: null,
    contractResult: null,
    postedContracts: [],
    opportunities,
    activeRaids: snapshot.activeRaidPackets.map((r) => mapActiveRaid(r, registry)),
    raidHistory: snapshot.raidSummaries.map((s) => mapRaidSummary(s, registry)),
    raidWorld: null,
  };
}

// ── Lifecycle and pressure helpers ─────────────────────────────────────────

function extractLifecycle(
  raw:
    | {
        status?: string;
        deathTick?: number;
        deathRaidSummaryId?: string;
        departureTick?: number;
        departureReason?: string;
      }
    | undefined,
): OperatorLifecycleViewModel {
  if (raw && raw.status === "dead") {
    return {
      status: "dead",
      deathTick: typeof raw.deathTick === "number" ? raw.deathTick : undefined,
      deathRaidSummaryId:
        typeof raw.deathRaidSummaryId === "string" ? raw.deathRaidSummaryId : undefined,
    };
  }

  if (raw && raw.status === "departed") {
    return {
      status: "departed",
      departureTick: typeof raw.departureTick === "number" ? raw.departureTick : undefined,
      departureReason: typeof raw.departureReason === "string" ? raw.departureReason : undefined,
    };
  }
  return { status: "active" };
}

function mapRuntimeRosterPressure(
  rawPressure: Phase1RuntimeView["rosterPressure"],
): RosterPressureViewModel {
  return {
    operatorCapacity: rawPressure.operatorCapacity,
    livingOperatorCount: rawPressure.livingOperatorCount,
    vacancyCount: rawPressure.vacancyCount,
    unavailableOperatorIds: rawPressure.unavailableOperatorIds,
    recentDeathOperatorIds: rawPressure.recentDeathOperatorIds,
    replacementPressureLevel: rawPressure.replacementPressureLevel,
  };
}

function buildSafeRosterPressure(
  operatorCapacity: number,
  livingOperatorCount: number,
): RosterPressureViewModel {
  return {
    operatorCapacity,
    livingOperatorCount,
    vacancyCount: Math.max(0, operatorCapacity - livingOperatorCount),
    unavailableOperatorIds: [],
    recentDeathOperatorIds: [],
    replacementPressureLevel: "stable",
  };
}

// ── Appearance helpers ────────────────────────────────────────────────────

/** Safely extract optional visibleGear from an appearance object.
 *  The runtime type may not yet include these fields, but when the runtime
 *  track adds them they will flow through here automatically. */
function extractVisibleGear(appearance: Record<string, unknown>): VisibleGear {
  const gear = appearance.visibleGear;
  if (typeof gear !== "object" || gear === null || Array.isArray(gear)) return {};
  const g = gear as Record<string, unknown>;
  return {
    weaponPartId: typeof g.weaponPartId === "string" && g.weaponPartId ? g.weaponPartId : undefined,
    outfitOverlayPartId:
      typeof g.outfitOverlayPartId === "string" && g.outfitOverlayPartId
        ? g.outfitOverlayPartId
        : undefined,
    accessoryPartId:
      typeof g.accessoryPartId === "string" && g.accessoryPartId ? g.accessoryPartId : undefined,
  };
}

// ── Legacy accessor helpers (used by WorldSnapshot-based builder) ────────

function str(rec: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const v = rec?.[key];
  return typeof v === "string" ? v : fallback;
}

function num(rec: Record<string, unknown> | undefined, key: string, fallback: number): number {
  const v = rec?.[key];
  return typeof v === "number" ? v : fallback;
}

function rec(
  parent: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const v = parent?.[key];
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

// ── Phase 2 view builders ────────────────────────────────────────────────

/** Resolve human-readable item name from the registry, falling back to a slug. */
function resolveItemName(itemId: string, registry: TemplateRegistry): string {
  const item = registry.itemById.get(itemId);
  if (item) return item.name;
  return getIdentifierLabel(itemId);
}

/** Classify an item id into a display category. */
function resolveItemCategory(itemId: string): string {
  if (itemId.startsWith("weapon/")) return "weapons";
  if (itemId.startsWith("outfit-overlay/")) return "outfits";
  if (itemId.startsWith("accessory/")) return "accessories";
  if (itemId.startsWith("loot/")) return "loot";
  return "misc";
}

/** Enrich existing operators with Phase 2 autonomy data. */
export function enrichOperatorsWithAutonomy(
  operators: readonly OperatorViewModel[],
  phase2: Phase2View,
): OperatorViewModel[] {
  const autonomyByOperatorId = new Map(phase2.operatorAutonomy.map((a) => [a.operatorId, a]));
  return operators.map((op) => {
    const autonomy = autonomyByOperatorId.get(op.id);
    if (!autonomy) return op;
    return {
      ...op,
      refusalRisk: autonomy.refusalRisk,
      quitRisk: autonomy.quitRisk,
      retentionRisk: autonomy.retentionRisk,
      autonomyReasons: autonomy.explanationReasons.map((reason) => reason.description),
    };
  });
}

/** Build team view models from Phase 2 data. */
export function buildTeamViewModels(
  phase2: Phase2View,
  operatorNameById: ReadonlyMap<string, string>,
): TeamViewModel[] {
  return phase2.teams.map((team) => ({
    id: team.id,
    memberIds: team.members,
    memberNames: team.members.map((id) => operatorNameById.get(id) ?? getIdentifierLabel(id)),
    cohesion: team.cohesion,
    raidCount: team.raidCount,
    damaged: team.damaged,
    damageReason: team.damageReason,
    statusSummary: team.statusSummary,
    explanationReasons: team.explanationReasons.map((reason) => reason.description),
  }));
}

/** Build room culture view models from Phase 2 data. */
export function buildRoomCultureViewModels(
  phase2: Phase2View,
  roomNameById: ReadonlyMap<string, string>,
): RoomCultureViewModel[] {
  return phase2.roomCultures.map((rc) => ({
    roomId: rc.roomId,
    roomName: roomNameById.get(rc.roomId) ?? getIdentifierLabel(rc.roomId),
    tone: rc.tone,
    summary: rc.summary,
    signals: rc.signals,
  }));
}

/** Build inventory view models from Phase 2 data. */
export function buildInventoryViewModels(
  phase2: Phase2View,
  registry: TemplateRegistry,
): InventoryItemViewModel[] {
  return phase2.inventory
    .filter((stack) => stack.quantity > 0)
    .map((stack) => ({
      itemId: stack.itemId,
      name: resolveItemName(stack.itemId, registry),
      quantity: stack.quantity,
      category: resolveItemCategory(stack.itemId),
    }));
}

/** Build market item view models from Phase 2 data. */
export function buildMarketItemViewModels(
  phase2: Phase2View,
  registry: TemplateRegistry,
): MarketItemViewModel[] {
  return phase2.marketItems.map((mi) => ({
    itemId: mi.itemId,
    name: resolveItemName(mi.itemId, registry),
    buyPrice: mi.buyPrice,
    sellPrice: mi.sellPrice,
    available: mi.available,
  }));
}

/** Build equipment view models from Phase 2 data. */
export function buildEquipmentViewModels(
  phase2: Phase2View,
  registry: TemplateRegistry,
  operatorNameById: ReadonlyMap<string, string>,
): EquipmentViewModel[] {
  return phase2.equipment.map((eq) => ({
    operatorId: eq.operatorId,
    operatorName: operatorNameById.get(eq.operatorId) ?? getIdentifierLabel(eq.operatorId),
    weaponId: eq.weaponId,
    weaponName: resolveItemName(eq.weaponId, registry),
    outfitOverlayId: eq.outfitOverlayId,
    outfitOverlayName: resolveItemName(eq.outfitOverlayId, registry),
    accessoryId: eq.accessoryId,
    accessoryName: resolveItemName(eq.accessoryId, registry),
    accessoryReason: eq.accessoryReason,
    accessorySummary: eq.accessorySummary,
  }));
}
