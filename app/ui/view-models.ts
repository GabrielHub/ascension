import type { TemplateRegistry } from "content/templates";
import type { ActiveRaidSnapshot, RaidSummarySnapshot, RoomSnapshot, WorldSnapshot } from "save";
import type { Phase1RuntimeView } from "sim";

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
  placeRoom: (templateId: string) => void;
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
  usedRoomSlots: number;
  totalRoomSlots: number;
  operatorSlots: number;
  unlockedRoomTemplateIds: readonly string[];
  availableBuildingUpgradeIds: readonly string[];
}

export interface RoomViewModel {
  id: string;
  templateId: string;
  name: string;
  description: string;
  tier: number;
  capacity: number;
  occupancy: number;
  isActive: boolean;
  isOperational: boolean;
  requiredRoleTag: string;
  assignedStaffCount: number;
  availableUpgradeIds: readonly string[];
  tags: readonly string[];
  position: RoomSnapshot["position"];
}

export interface EmptySlotViewModel {
  index: number;
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
  emptySlots: readonly EmptySlotViewModel[];
  upgrades: readonly UpgradeViewModel[];
  roomUpgrades: readonly UpgradeViewModel[];
  operators: readonly OperatorViewModel[];
  staff: readonly StaffViewModel[];
  visitors: readonly VisitorViewModel[];
  relationships: readonly RelationshipViewModel[];
  activeEvents: readonly ActiveEventViewModel[];
  placeableRoomTemplates: readonly PlaceableRoomTemplate[];
}

export interface OperationsViewModel {
  opportunities: readonly RaidOpportunityViewModel[];
  activeRaids: readonly ActiveRaidViewModel[];
  raidHistory: readonly RaidSummaryViewModel[];
}

// ── Formatting helpers ───────────────────────────────────────────────────

function formatTimeOfDay(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatRequirement(req: { type: string; [key: string]: unknown }): string {
  switch (req.type) {
    case "resource_min":
      return `${req.minimum} ${String(req.resourceId).split("/").pop()}`;
    case "building_tier_min":
      return `Building tier ${req.minimum}+`;
    case "room_count_min":
      return `${req.minimum}+ rooms`;
    case "room_tier_min":
      return `Room tier ${req.minimum}+`;
    case "staff_role_min":
      return `${req.minimum}+ staff (${req.roleTag})`;
    case "operator_count_min":
      return `${req.minimum}+ operators`;
    default:
      return req.type;
  }
}

function formatEffect(eff: { type: string; [key: string]: unknown }): string {
  switch (eff.type) {
    case "add_room_slot":
      return `+${eff.amount} room slot`;
    case "unlock_room_template":
      return `Unlock ${String(eff.roomId).split("/").pop()?.replace(":", " ")}`;
    case "unlock_room_tier":
      return `Unlock tier ${eff.tier}`;
    case "grant_operator_slot":
      return `+${eff.amount} operator slot`;
    case "modify_room_capacity":
      return `+${eff.amount} room capacity`;
    case "modify_morale":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} morale`;
    case "modify_loyalty":
      return `${Number(eff.amount) > 0 ? "+" : ""}${eff.amount} loyalty`;
    default:
      return eff.type.replace(/_/g, " ");
  }
}

function resolveMissionName(missionId: string, registry: TemplateRegistry): string {
  return registry.missionById.get(missionId)?.name ?? missionId.split("/").pop() ?? "Unknown";
}

function normalizeOpportunityStatus(status: unknown): RaidOpportunityViewModel["status"] {
  if (status === "claimed" || status === "forming") {
    return "claimed";
  }

  return status === "expired" ? "expired" : "available";
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
      label: formatRequirement(req),
      type: req.type,
    })),
    effects: template.effects.map((eff) => ({
      label: formatEffect(eff),
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

  const rooms: RoomViewModel[] = view.rooms.map((room) => {
    const template = registry.roomById.get(room.templateId) ?? registry.rooms[0];
    return {
      id: room.id,
      templateId: room.templateId,
      name: room.name,
      description: template.description ?? "",
      tier: room.tier,
      capacity: room.capacity,
      occupancy: room.occupancy,
      isActive: room.isRequestedActive,
      isOperational: room.isOperational,
      requiredRoleTag: room.requiredRoleTag,
      assignedStaffCount: room.assignedStaffCount,
      availableUpgradeIds: room.availableUpgradeIds,
      tags: template.tags,
      position: { x: 0, y: 0, width: 0, height: 0 },
    };
  });

  const emptySlotCount = view.building.roomSlotCount - view.building.roomsUsed;
  const emptySlots: EmptySlotViewModel[] = Array.from(
    { length: Math.max(0, emptySlotCount) },
    (_, i) => ({ index: view.building.roomsUsed + i }),
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
    moraleCurrent: op.morale.current,
    moraleBaseline: op.morale.baseline,
    loyaltyCurrent: op.loyalty.current,
    loyaltyBaseline: op.loyalty.baseline,
    assignmentKind: op.assignment.kind,
    assignmentTargetId: op.assignment.targetId,
    injurySeverity: op.injury.severity,
    injuryRecoveryHours: op.injury.recoveryHoursRemaining,
    needHunger: op.needs.hunger,
    needFatigue: op.needs.fatigue,
    needStress: op.needs.stress,
    scheduleBlock: op.schedule.currentBlock,
    riskTolerance: op.preferences.riskTolerance,
    intent: op.intent,
    dominantNeed: op.dominantNeed,
    availableForRaid: op.availableForRaid,
    readinessScore: op.readinessScore,
    appearancePresetId: op.appearance.presetId,
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
  }));

  const relationships: RelationshipViewModel[] = view.relationshipSignals.map((rel) => ({
    operatorAId: rel.operatorAId,
    operatorBId: rel.operatorBId,
    operatorAName: operatorNameById.get(rel.operatorAId) ?? rel.operatorAId.split("/").pop() ?? "?",
    operatorBName: operatorNameById.get(rel.operatorBId) ?? rel.operatorBId.split("/").pop() ?? "?",
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
    name: registry.events.find((e) => e.id === evt.templateId)?.name ?? evt.templateId,
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
      usedRoomSlots: view.building.roomsUsed,
      totalRoomSlots: view.building.roomSlotCount,
      operatorSlots: view.building.operatorSlotCount,
      unlockedRoomTemplateIds: view.building.unlockedRoomTemplateIds,
      availableBuildingUpgradeIds: view.building.availableBuildingUpgradeIds,
    },
    rooms,
    emptySlots,
    upgrades: buildingUpgrades,
    roomUpgrades,
    operators,
    staff,
    visitors,
    relationships,
    activeEvents,
    placeableRoomTemplates,
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
      location: opp.location,
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
      intelConfidence: opp.intel <= 30 ? "low" : opp.intel <= 60 ? "moderate" : "high",
      status: normalizeOpportunityStatus(opp.status),
      interestedCount: opp.interestedCount,
      claimedCount: opp.claimedCount,
      reward: opp.reward,
      risk: opp.risk,
      recommendedOperatorCount: opp.recommendedOperatorCount,
    };
  });

  const activeRaids: ActiveRaidViewModel[] = view.activeRaids.map((raid) => ({
    id: raid.id,
    missionName: resolveMissionName(raid.missionId, registry),
    missionId: raid.missionId,
    startedAt: raid.startedAt,
    revealProgress: raid.revealProgress,
    operatorIds: raid.operatorIds,
    location: raid.location,
    threat: raid.threat,
    cohesion: raid.cohesion,
    durationHours: raid.durationHours,
  }));

  const raidHistory: RaidSummaryViewModel[] = view.raidSummaries.map((summary) => ({
    id: summary.id,
    missionName: resolveMissionName(summary.missionId, registry),
    missionId: summary.missionId,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    result: summary.result,
    reputationDelta: summary.reputationDelta,
    cashDelta: summary.cashDelta,
    location: summary.location,
    narrativeTags: summary.narrativeTags,
  }));

  return { opportunities, activeRaids, raidHistory };
}

// ── Legacy WorldSnapshot builders (retained for render-layer compat) ─────

export function buildHqViewModel(snapshot: WorldSnapshot, registry: TemplateRegistry): HqViewModel {
  const buildingTemplate =
    registry.buildingById.get(snapshot.building.activeBuildingId) ?? registry.buildings[0];

  const rooms: RoomViewModel[] = snapshot.rooms.map((room) => {
    const template = registry.roomById.get(room.templateId) ?? registry.rooms[0];
    return {
      id: room.id,
      templateId: room.templateId,
      name: template.name,
      description: template.description ?? "",
      tier: room.tier,
      capacity: room.capacity,
      occupancy: room.occupancy,
      isActive: room.isActive ?? true,
      isOperational: room.isActive ?? true,
      requiredRoleTag: "",
      assignedStaffCount: 0,
      availableUpgradeIds: [],
      tags: template.tags,
      position: room.position,
    };
  });

  const emptySlotCount = snapshot.building.roomSlotCount - snapshot.rooms.length;
  const emptySlots: EmptySlotViewModel[] = Array.from(
    { length: Math.max(0, emptySlotCount) },
    (_, i) => ({ index: snapshot.rooms.length + i }),
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
        label: formatRequirement(req),
        type: req.type,
      })),
      effects: template.effects.map((eff) => ({
        label: formatEffect(eff),
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
      name: str(identity, "name", op.id.split("/").pop() ?? "Unknown"),
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
      appearancePresetId: str(appearance, "presetId", "male-swept"),
    };
  });

  const operatorNameById = new Map(operators.map((op) => [op.id, op.name]));

  const staff: StaffViewModel[] = (snapshot.staff ?? []).map((s) => {
    const raw = s as Record<string, unknown>;
    const assignment = rec(raw, "assignment");
    return {
      id: s.id,
      name: str(raw, "name", s.id.split("/").pop() ?? "Staff"),
      roleTag: str(raw, "roleTag", "general"),
      status: str(raw, "status", "unassigned"),
      wage: num(raw, "wage", 0),
      assignmentKind: str(assignment, "kind", "idle"),
      assignmentTargetId: str(assignment, "targetId", ""),
    };
  });

  const visitors: VisitorViewModel[] = (snapshot.visitors ?? []).map((v) => {
    const raw = v as Record<string, unknown>;
    return {
      id: v.id,
      name: str(raw, "name", v.id.split("/").pop() ?? "Visitor"),
      desiredRoleTag: str(raw, "desiredRoleTag", "unknown"),
      patience: num(raw, "patience", 10),
      quality: num(raw, "quality", 50),
      expectedLoyalty: num(raw, "expectedLoyalty", 50),
    };
  });

  const relationships: RelationshipViewModel[] = (snapshot.operatorRelationships ?? []).map(
    (rel) => ({
      operatorAId: rel.operatorAId,
      operatorBId: rel.operatorBId,
      operatorAName:
        operatorNameById.get(rel.operatorAId) ?? rel.operatorAId.split("/").pop() ?? "?",
      operatorBName:
        operatorNameById.get(rel.operatorBId) ?? rel.operatorBId.split("/").pop() ?? "?",
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
      usedRoomSlots: snapshot.rooms.length,
      totalRoomSlots: snapshot.building.roomSlotCount,
      operatorSlots: snapshot.building.operatorSlotCount,
      unlockedRoomTemplateIds: [],
      availableBuildingUpgradeIds: [],
    },
    rooms,
    emptySlots,
    upgrades,
    roomUpgrades: [],
    operators,
    staff,
    visitors,
    relationships,
    activeEvents: [],
    placeableRoomTemplates: [],
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
        location: typeof opp.location === "string" ? opp.location : "Unknown sector",
        threatRank: typeof opp.threat === "string" ? opp.threat : "E",
        intelConfidence: typeof opp.intel === "string" ? opp.intel : "low",
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
    opportunities,
    activeRaids: snapshot.activeRaidPackets.map((r) => mapActiveRaid(r, registry)),
    raidHistory: snapshot.raidSummaries.map((s) => mapRaidSummary(s, registry)),
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
