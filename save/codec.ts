import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  SAVE_SLOT_IDS,
  type OperatorAppearanceSnapshot,
  type ActiveEventSnapshot,
  type ActiveRaidSnapshot,
  type BuildingSnapshot,
  type GuildSnapshot,
  type OperatorSnapshot,
  type OperatorRelationshipSnapshot,
  type PersistedSaveGame,
  type RaidOpportunitySnapshot,
  type RaidOperatorOutcomeSnapshot,
  type RaidSummarySnapshot,
  type RoomSnapshot,
  type SaveCompactValue,
  type SaveSlotId,
  type SaveSlotMetadata,
  type SaveStructuredRecord,
  type StaffSnapshot,
  type VisitorSnapshot,
  type WorldSnapshot,
  type WorldTimeSnapshot,
} from "./types";
import { isOperatorAppearancePresetId, normalizeOperatorAppearance } from "./appearance";

export class SaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveValidationError";
  }
}

export interface SaveHydrationResult {
  save: PersistedSaveGame;
  changed: boolean;
}

type ParsedActiveRaidSnapshot = ActiveRaidSnapshot & { _changed: boolean };
type ParsedOperatorSnapshot = OperatorSnapshot & { _changed: boolean };
type ParsedOperatorRelationshipSnapshot = OperatorRelationshipSnapshot & { _changed: boolean };
type ParsedRaidOperatorOutcomeSnapshot = RaidOperatorOutcomeSnapshot & { _changed: boolean };
type ParsedRaidOpportunitySnapshot = RaidOpportunitySnapshot & { _changed: boolean };
type ParsedRaidSummarySnapshot = RaidSummarySnapshot & { _changed: boolean };

function fail(path: string, message: string): never {
  throw new SaveValidationError(`${path} ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "must be an object.");
  }

  return value as Record<string, unknown>;
}

function expectCompactValue(value: unknown, path: string): SaveCompactValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return expectRecord(value, path);
  }

  fail(path, "must be a compact primitive or object.");
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(path, "must be a non-empty string.");
  }

  return value;
}

function expectNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "must be a finite number.");
  }

  return value;
}

function expectInteger(value: unknown, path: string): number {
  const number = expectNumber(value, path);

  if (!Number.isInteger(number)) {
    fail(path, "must be an integer.");
  }

  return number;
}

function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail(path, "must be a boolean.");
  }

  return value;
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(path, "must be an array.");
  }

  return value;
}

function expectStringArray(value: unknown, path: string): string[] {
  return expectArray(value, path).map((entry, index) => expectString(entry, `${path}[${index}]`));
}

function parseOptionalStructuredRecord(
  value: unknown,
  path: string,
): SaveStructuredRecord | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectRecord(value, path);
}

function parseOptionalCompactValue(value: unknown, path: string): SaveCompactValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectCompactValue(value, path);
}

function parseSaveSlotId(value: unknown, path: string): SaveSlotId {
  const slotId = expectString(value, path);

  if (!SAVE_SLOT_IDS.some((candidate) => candidate === slotId)) {
    fail(path, `must be one of ${SAVE_SLOT_IDS.join(", ")}.`);
  }

  return slotId;
}

function parseCompatibilityVersion(value: unknown, path: string): string {
  const compatibilityVersion = expectString(value, path);

  if (compatibilityVersion !== CURRENT_CONTENT_COMPATIBILITY) {
    fail(path, `must match current compatibility version "${CURRENT_CONTENT_COMPATIBILITY}".`);
  }

  return compatibilityVersion;
}

function parseSaveMetadata(value: unknown, path: string): SaveSlotMetadata {
  const record = expectRecord(value, path);

  return {
    guildName: expectString(record.guildName, `${path}.guildName`),
    createdAt: expectString(record.createdAt, `${path}.createdAt`),
    lastPlayedAt: expectString(record.lastPlayedAt, `${path}.lastPlayedAt`),
  };
}

function parseGuildSnapshot(value: unknown, path: string): GuildSnapshot {
  const record = expectRecord(value, path);

  return {
    reputation: expectNumber(record.reputation, `${path}.reputation`),
    treasury: expectNumber(record.treasury, `${path}.treasury`),
    intel: expectNumber(record.intel, `${path}.intel`),
  };
}

function parseWorldTimeSnapshot(value: unknown, path: string): WorldTimeSnapshot {
  const record = expectRecord(value, path);

  return {
    tick: expectNumber(record.tick, `${path}.tick`),
    day: expectNumber(record.day, `${path}.day`),
    minuteOfDay: expectNumber(record.minuteOfDay, `${path}.minuteOfDay`),
  };
}

function parseBuildingSnapshot(value: unknown, path: string): BuildingSnapshot {
  const record = expectRecord(value, path);

  return {
    activeBuildingId: expectString(record.activeBuildingId, `${path}.activeBuildingId`),
    activeBuildingTier: expectNumber(record.activeBuildingTier, `${path}.activeBuildingTier`),
    roomSlotCount: expectNumber(record.roomSlotCount, `${path}.roomSlotCount`),
    operatorSlotCount: expectNumber(record.operatorSlotCount, `${path}.operatorSlotCount`),
  };
}

function parseRoomSnapshot(value: unknown, path: string): RoomSnapshot {
  const record = expectRecord(value, path);
  const position = expectRecord(record.position, `${path}.position`);
  const isActive = record.isActive;

  return {
    id: expectString(record.id, `${path}.id`),
    templateId: expectString(record.templateId, `${path}.templateId`),
    tier: expectNumber(record.tier, `${path}.tier`),
    capacity: expectNumber(record.capacity, `${path}.capacity`),
    occupancy: expectNumber(record.occupancy, `${path}.occupancy`),
    position: {
      x: expectNumber(position.x, `${path}.position.x`),
      y: expectNumber(position.y, `${path}.position.y`),
      width: expectNumber(position.width, `${path}.position.width`),
      height: expectNumber(position.height, `${path}.position.height`),
    },
    ...(isActive === undefined ? {} : { isActive: expectBoolean(isActive, `${path}.isActive`) }),
  };
}

function getRecordString(
  record: SaveStructuredRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];

  return typeof value === "string" ? value : undefined;
}

function parseOperatorAppearanceSnapshot(
  value: unknown,
  path: string,
  fallback: {
    operatorId: string;
    identity?: SaveStructuredRecord;
  },
): { appearance: OperatorAppearanceSnapshot; changed: boolean } {
  const record = value === undefined ? undefined : expectRecord(value, path);
  const normalized = normalizeOperatorAppearance({
    presetId: record?.presetId,
    legacySeed: record?.seed,
    stableKey: [
      fallback.operatorId,
      getRecordString(fallback.identity, "name") ??
        getRecordString(fallback.identity, "displayName"),
      getRecordString(fallback.identity, "roleTag"),
      getRecordString(fallback.identity, "specialtyTag"),
    ]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(":"),
  });

  if (record === undefined) {
    return {
      appearance: normalized.appearance,
      changed: true,
    };
  }

  return {
    appearance: normalized.appearance,
    changed:
      normalized.changed ||
      !isOperatorAppearancePresetId(record.presetId) ||
      Object.keys(record).some((key) => key !== "presetId"),
  };
}

function parseOperatorSnapshot(value: unknown, path: string): ParsedOperatorSnapshot {
  const record = expectRecord(value, path);
  const identity = parseOptionalStructuredRecord(record.identity, `${path}.identity`);
  const appearance = parseOperatorAppearanceSnapshot(record.appearance, `${path}.appearance`, {
    operatorId: expectString(record.id, `${path}.id`),
    identity,
  });

  return {
    id: expectString(record.id, `${path}.id`),
    identity,
    preferences: parseOptionalStructuredRecord(record.preferences, `${path}.preferences`),
    schedule: parseOptionalStructuredRecord(record.schedule, `${path}.schedule`),
    needs: parseOptionalStructuredRecord(record.needs, `${path}.needs`),
    morale: parseOptionalStructuredRecord(record.morale, `${path}.morale`),
    loyalty: parseOptionalStructuredRecord(record.loyalty, `${path}.loyalty`),
    injury: parseOptionalStructuredRecord(record.injury, `${path}.injury`),
    assignment: parseOptionalStructuredRecord(record.assignment, `${path}.assignment`),
    appearance: appearance.appearance,
    _changed: appearance.changed,
  };
}

function parseOperatorRelationshipSnapshot(
  value: unknown,
  path: string,
): ParsedOperatorRelationshipSnapshot {
  const record = expectRecord(value, path);
  const familiarity = record.familiarity;
  const recentSharedOutcome = record.recentSharedOutcome;
  const historyTags = record.historyTags;
  const changed =
    familiarity === undefined || recentSharedOutcome === undefined || historyTags === undefined;

  return {
    operatorAId: expectString(record.operatorAId, `${path}.operatorAId`),
    operatorBId: expectString(record.operatorBId, `${path}.operatorBId`),
    trust: expectNumber(record.trust, `${path}.trust`),
    friction: expectNumber(record.friction, `${path}.friction`),
    familiarity: familiarity === undefined ? 0 : expectNumber(familiarity, `${path}.familiarity`),
    recentSharedOutcome:
      recentSharedOutcome === undefined
        ? 0
        : expectNumber(recentSharedOutcome, `${path}.recentSharedOutcome`),
    historyTags:
      historyTags === undefined ? [] : expectStringArray(historyTags, `${path}.historyTags`),
    _changed: changed,
  };
}

function parseStaffSnapshot(value: unknown, path: string): StaffSnapshot {
  const record = expectRecord(value, path);

  return {
    id: expectString(record.id, `${path}.id`),
    name: typeof record.name === "string" ? record.name : undefined,
    roleTag: typeof record.roleTag === "string" ? record.roleTag : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    wage: typeof record.wage === "number" ? record.wage : undefined,
    assignment: parseOptionalStructuredRecord(record.assignment, `${path}.assignment`),
  };
}

function parseVisitorSnapshot(value: unknown, path: string): VisitorSnapshot {
  const record = expectRecord(value, path);

  return {
    id: expectString(record.id, `${path}.id`),
  };
}

function parseActiveEventSnapshot(value: unknown, path: string): ActiveEventSnapshot {
  const record = expectRecord(value, path);

  return {
    id: expectString(record.id, `${path}.id`),
  };
}

function parseRaidOpportunitySnapshot(value: unknown, path: string): ParsedRaidOpportunitySnapshot {
  const record = expectRecord(value, path);
  const interestedOperatorIds = record.interestedOperatorIds;
  const claimedOperatorIds = record.claimedOperatorIds;
  const changed = interestedOperatorIds === undefined || claimedOperatorIds === undefined;

  return {
    missionId: expectString(record.missionId, `${path}.missionId`),
    location: parseOptionalCompactValue(record.location, `${path}.location`),
    threat: parseOptionalCompactValue(record.threat, `${path}.threat`),
    intel: parseOptionalCompactValue(record.intel, `${path}.intel`),
    status: parseOptionalCompactValue(record.status, `${path}.status`),
    interestedOperatorIds:
      interestedOperatorIds === undefined
        ? []
        : expectStringArray(interestedOperatorIds, `${path}.interestedOperatorIds`),
    claimedOperatorIds:
      claimedOperatorIds === undefined
        ? []
        : expectStringArray(claimedOperatorIds, `${path}.claimedOperatorIds`),
    _changed: changed,
  };
}

function getAssignedRaidId(operator: OperatorSnapshot): string | undefined {
  const assignment = operator.assignment;

  if (!assignment) {
    return undefined;
  }

  if (typeof assignment.raidId === "string" && assignment.raidId.length > 0) {
    return assignment.raidId;
  }

  if (
    assignment.kind === "raid" &&
    typeof assignment.targetId === "string" &&
    assignment.targetId.length > 0
  ) {
    return assignment.targetId;
  }

  return undefined;
}

function collectAssignedRaidOperatorIds(operators: OperatorSnapshot[]): Map<string, string[]> {
  const operatorIdsByRaidId = new Map<string, string[]>();

  operators.forEach((operator) => {
    const raidId = getAssignedRaidId(operator);

    if (!raidId) {
      return;
    }

    const operatorIds = operatorIdsByRaidId.get(raidId);

    if (operatorIds) {
      operatorIds.push(operator.id);
      return;
    }

    operatorIdsByRaidId.set(raidId, [operator.id]);
  });

  return operatorIdsByRaidId;
}

function parseActiveRaidSnapshotWithFallback(
  value: unknown,
  path: string,
  assignedRaidOperatorIds: Map<string, string[]>,
): ParsedActiveRaidSnapshot {
  const record = expectRecord(value, path);
  const packetId = expectString(record.id, `${path}.id`);
  const operatorIds = record.operatorIds;
  const startedTick = record.startedTick;
  const returnTick = record.returnTick;
  const durationHours = record.durationHours;
  const resolutionPacket = record.resolutionPacket;
  const derivedOperatorIds = assignedRaidOperatorIds.get(packetId);

  let changed = false;

  if (operatorIds === undefined && derivedOperatorIds !== undefined) {
    changed = true;
  }

  if (operatorIds === undefined && derivedOperatorIds === undefined) {
    fail(`${path}.operatorIds`, "must be present or derivable from operator assignments.");
  }

  if (startedTick === undefined) {
    fail(`${path}.startedTick`, "must be present for active raid durability.");
  }

  if (returnTick === undefined) {
    fail(`${path}.returnTick`, "must be present for active raid durability.");
  }

  if (durationHours === undefined) {
    fail(`${path}.durationHours`, "must be present for active raid durability.");
  }

  if (resolutionPacket === undefined) {
    fail(`${path}.resolutionPacket`, "must be present for active raid durability.");
  }

  return {
    id: packetId,
    missionId: expectString(record.missionId, `${path}.missionId`),
    startedAt: expectString(record.startedAt, `${path}.startedAt`),
    startedTick: expectInteger(startedTick, `${path}.startedTick`),
    revealProgress: expectNumber(record.revealProgress, `${path}.revealProgress`),
    operatorIds:
      operatorIds === undefined
        ? [...derivedOperatorIds!]
        : expectStringArray(operatorIds, `${path}.operatorIds`),
    returnTick: expectInteger(returnTick, `${path}.returnTick`),
    durationHours: expectNumber(durationHours, `${path}.durationHours`),
    resolutionPacket: expectRecord(resolutionPacket, `${path}.resolutionPacket`),
    _changed: changed,
  };
}

function parseRaidOperatorOutcomeSnapshot(
  value: unknown,
  path: string,
): ParsedRaidOperatorOutcomeSnapshot {
  const record = expectRecord(value, path);
  const { outcome, ...rest } = record;
  const normalizedOutcome =
    outcome === undefined ? undefined : expectRecord(outcome, `${path}.outcome`);

  return {
    ...normalizedOutcome,
    ...rest,
    operatorId: expectString(record.operatorId, `${path}.operatorId`),
    _changed: normalizedOutcome !== undefined,
  };
}

function parseRaidSummarySnapshot(value: unknown, path: string): ParsedRaidSummarySnapshot {
  const record = expectRecord(value, path);

  let changed = false;
  const operatorOutcomes = record.operatorOutcomes;
  const narrativeTags = record.narrativeTags;
  const intelMismatchTags = record.intelMismatchTags;
  const parsedOperatorOutcomes =
    operatorOutcomes === undefined
      ? []
      : expectArray(operatorOutcomes, `${path}.operatorOutcomes`).map((entry, index) =>
          parseRaidOperatorOutcomeSnapshot(entry, `${path}.operatorOutcomes[${index}]`),
        );

  if (
    operatorOutcomes === undefined ||
    narrativeTags === undefined ||
    intelMismatchTags === undefined ||
    parsedOperatorOutcomes.some((outcome) => outcome._changed)
  ) {
    changed = true;
  }

  return {
    id: expectString(record.id, `${path}.id`),
    missionId: expectString(record.missionId, `${path}.missionId`),
    startedAt: expectString(record.startedAt, `${path}.startedAt`),
    endedAt: expectString(record.endedAt, `${path}.endedAt`),
    result: parseRaidResult(record.result, `${path}.result`),
    reputationDelta: expectNumber(record.reputationDelta, `${path}.reputationDelta`),
    cashDelta: expectNumber(record.cashDelta, `${path}.cashDelta`),
    operatorOutcomes: parsedOperatorOutcomes.map(({ _changed: _ignored, ...outcome }) => outcome),
    narrativeTags:
      narrativeTags === undefined ? [] : expectStringArray(narrativeTags, `${path}.narrativeTags`),
    intelMismatchTags:
      intelMismatchTags === undefined
        ? []
        : expectStringArray(intelMismatchTags, `${path}.intelMismatchTags`),
    _changed: changed,
  };
}

function parseRaidResult(value: unknown, path: string): RaidSummarySnapshot["result"] {
  const result = expectString(value, path);

  if (result !== "success" && result !== "failure" && result !== "mixed") {
    fail(path, 'must be "success", "failure", or "mixed".');
  }

  return result;
}

function parseCollection<T>(
  value: unknown,
  path: string,
  parser: (entry: unknown, path: string) => T,
): T[] {
  return expectArray(value, path).map((entry, index) => parser(entry, `${path}[${index}]`));
}

function parseOptionalCollection<T>(
  value: unknown,
  path: string,
  parser: (entry: unknown, path: string) => T,
): { items: T[]; changed: boolean } {
  if (value === undefined) {
    return { items: [], changed: true };
  }

  return {
    items: parseCollection(value, path, parser),
    changed: false,
  };
}

function parseWorldSnapshot(
  value: unknown,
  path: string,
): { world: WorldSnapshot; changed: boolean } {
  const record = expectRecord(value, path);
  const operators = parseOptionalCollection(
    record.operators,
    `${path}.operators`,
    parseOperatorSnapshot,
  );
  const assignedRaidOperatorIds = collectAssignedRaidOperatorIds(operators.items);
  const operatorRelationships = parseOptionalCollection(
    record.operatorRelationships,
    `${path}.operatorRelationships`,
    parseOperatorRelationshipSnapshot,
  );
  const staff = parseOptionalCollection(record.staff, `${path}.staff`, parseStaffSnapshot);
  const visitors = parseOptionalCollection(
    record.visitors,
    `${path}.visitors`,
    parseVisitorSnapshot,
  );
  const activeRaidPackets = parseCollection(
    record.activeRaidPackets,
    `${path}.activeRaidPackets`,
    (entry, entryPath) =>
      parseActiveRaidSnapshotWithFallback(entry, entryPath, assignedRaidOperatorIds),
  );
  const raidSummaries = parseCollection(
    record.raidSummaries,
    `${path}.raidSummaries`,
    parseRaidSummarySnapshot,
  );
  const raidOpportunities = parseOptionalCollection(
    record.raidOpportunities,
    `${path}.raidOpportunities`,
    parseRaidOpportunitySnapshot,
  );
  const activeEvents = parseOptionalCollection(
    record.activeEvents,
    `${path}.activeEvents`,
    parseActiveEventSnapshot,
  );

  const activeRaidPacketChanged = activeRaidPackets.some((packet) => packet._changed);
  const operatorChanged = operators.items.some((operator) => operator._changed);
  const operatorRelationshipChanged = operatorRelationships.items.some(
    (relationship) => relationship._changed,
  );
  const raidSummaryChanged = raidSummaries.some((summary) => summary._changed);
  const raidOpportunityChanged = raidOpportunities.items.some(
    (opportunity) => opportunity._changed,
  );

  return {
    world: {
      guild: parseGuildSnapshot(record.guild, `${path}.guild`),
      time: parseWorldTimeSnapshot(record.time, `${path}.time`),
      building: parseBuildingSnapshot(record.building, `${path}.building`),
      rooms: parseCollection(record.rooms, `${path}.rooms`, parseRoomSnapshot),
      activeRaidPackets: activeRaidPackets.map(({ _changed: _ignored, ...packet }) => packet),
      raidSummaries: raidSummaries.map(({ _changed: _ignored, ...summary }) => summary),
      appliedUpgradeIds: expectStringArray(record.appliedUpgradeIds, `${path}.appliedUpgradeIds`),
      operators: operators.items.map(({ _changed: _ignored, ...operator }) => operator),
      operatorRelationships: operatorRelationships.items.map(
        ({ _changed: _ignored, ...relationship }) => relationship,
      ),
      staff: staff.items,
      visitors: visitors.items,
      raidOpportunities: raidOpportunities.items.map(
        ({ _changed: _ignored, ...opportunity }) => opportunity,
      ),
      activeEvents: activeEvents.items,
    },
    changed:
      operators.changed ||
      operatorChanged ||
      operatorRelationships.changed ||
      staff.changed ||
      visitors.changed ||
      raidOpportunities.changed ||
      activeEvents.changed ||
      activeRaidPacketChanged ||
      operatorRelationshipChanged ||
      raidOpportunityChanged ||
      raidSummaryChanged,
  };
}

export function hydratePersistedSaveGame(value: unknown): SaveHydrationResult {
  const record = expectRecord(value, "save");
  const schemaVersion = expectInteger(record.schemaVersion, "save.schemaVersion");

  if (schemaVersion < 1) {
    fail("save.schemaVersion", "must be a supported schema version.");
  }

  if (schemaVersion > CURRENT_SAVE_SCHEMA_VERSION) {
    fail("save.schemaVersion", `is newer than supported schema ${CURRENT_SAVE_SCHEMA_VERSION}.`);
  }

  const world = parseWorldSnapshot(record.world, "save.world");

  return {
    save: {
      slotId: parseSaveSlotId(record.slotId, "save.slotId"),
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      compatibilityVersion: parseCompatibilityVersion(
        record.compatibilityVersion,
        "save.compatibilityVersion",
      ),
      metadata: parseSaveMetadata(record.metadata, "save.metadata"),
      world: world.world,
    },
    changed: schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION || world.changed,
  };
}

export function preparePersistedSaveGameForStorage(save: PersistedSaveGame): PersistedSaveGame {
  return hydratePersistedSaveGame(save).save;
}
