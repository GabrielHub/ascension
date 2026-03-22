import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  SAVE_SLOT_IDS,
  type OperatorAppearanceSnapshot,
  type ActiveEventSnapshot,
  type ActiveRaidSnapshot,
  type ContractSiteSnapshot,
  type FogOfWarSnapshot,
  type BuildingSnapshot,
  type GuildSnapshot,
  type OperatorLifecycleSnapshot,
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
  type WorldSchedulerSnapshot,
  type WorldTimeSnapshot,
} from "./types";
import {
  getDefaultOperatorAppearancePartsIndex,
  getOperatorVisibleGearPartCategory,
  isOperatorAppearanceRecipeId,
  normalizeOperatorAppearance,
  OPERATOR_VISIBLE_GEAR_SLOT_IDS,
  parseOperatorAppearancePartIndex,
  type OperatorAppearancePartIndexEntry,
} from "./appearance";

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

export interface SaveCodecOptions {
  operatorAppearancePartsIndex?: unknown;
}

type ParsedActiveRaidSnapshot = ActiveRaidSnapshot & { _changed: boolean };
type ParsedOperatorSnapshot = OperatorSnapshot & { _changed: boolean };
type ParsedOperatorRelationshipSnapshot = OperatorRelationshipSnapshot & { _changed: boolean };
type ParsedRaidOperatorOutcomeSnapshot = RaidOperatorOutcomeSnapshot & { _changed: boolean };
type ParsedRaidOpportunitySnapshot = RaidOpportunitySnapshot & { _changed: boolean };
type ParsedRaidSummarySnapshot = RaidSummarySnapshot & { _changed: boolean };

interface OperatorAppearanceParseContext {
  getPartsIndex: () => Map<string, OperatorAppearancePartIndexEntry>;
}

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

function expectPositiveInteger(value: unknown, path: string): number {
  const number = expectInteger(value, path);

  if (number <= 0) {
    fail(path, "must be greater than 0.");
  }

  return number;
}

function expectNonNegativeInteger(value: unknown, path: string): number {
  const number = expectInteger(value, path);

  if (number < 0) {
    fail(path, "must be greater than or equal to 0.");
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
  const tick = expectNonNegativeInteger(record.tick, `${path}.tick`);
  const day = expectPositiveInteger(record.day, `${path}.day`);
  const minuteOfDay = expectInteger(record.minuteOfDay, `${path}.minuteOfDay`);

  if (minuteOfDay < 0 || minuteOfDay >= 1440) {
    fail(`${path}.minuteOfDay`, "must be between 0 and 1439.");
  }

  return {
    tick,
    day,
    minuteOfDay,
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
  const footprint = expectRecord(record.footprint, `${path}.footprint`);
  const isActive = record.isActive;
  const appliedUpgradeIds = record.appliedUpgradeIds;

  return {
    id: expectString(record.id, `${path}.id`),
    templateId: expectString(record.templateId, `${path}.templateId`),
    tier: expectNumber(record.tier, `${path}.tier`),
    capacity: expectNumber(record.capacity, `${path}.capacity`),
    occupancy: expectNumber(record.occupancy, `${path}.occupancy`),
    footprint: {
      col: expectInteger(footprint.col, `${path}.footprint.col`),
      row: expectInteger(footprint.row, `${path}.footprint.row`),
      cols: expectPositiveInteger(footprint.cols, `${path}.footprint.cols`),
      rows: expectPositiveInteger(footprint.rows, `${path}.footprint.rows`),
    },
    ...(isActive === undefined ? {} : { isActive: expectBoolean(isActive, `${path}.isActive`) }),
    ...(appliedUpgradeIds === undefined
      ? {}
      : { appliedUpgradeIds: expectStringArray(appliedUpgradeIds, `${path}.appliedUpgradeIds`) }),
  };
}

function parseContractSiteSnapshot(
  value: unknown,
  path: string,
): { contractSite: ContractSiteSnapshot | null; changed: boolean } {
  if (value == null) {
    return { contractSite: null, changed: false };
  }

  const record = expectRecord(value, path);

  return {
    contractSite: {
      contractSiteId: expectString(record.contractSiteId, `${path}.contractSiteId`),
      missionId: expectString(record.missionId, `${path}.missionId`),
      location: expectString(record.location, `${path}.location`),
      bossDefeated: expectBoolean(record.bossDefeated, `${path}.bossDefeated`),
      contractLost: expectBoolean(record.contractLost, `${path}.contractLost`),
      threat: expectNumber(record.threat, `${path}.threat`),
      intel: expectNumber(record.intel, `${path}.intel`),
      reward: expectNumber(record.reward, `${path}.reward`),
      securedAtTick: expectInteger(record.securedAtTick, `${path}.securedAtTick`),
    },
    changed: false,
  };
}

function parseFogOfWarSnapshot(
  value: unknown,
  path: string,
): { fogOfWar: FogOfWarSnapshot | null; changed: boolean } {
  if (value == null) {
    return { fogOfWar: null, changed: false };
  }

  const record = expectRecord(value, path);
  const gridWidth = expectPositiveInteger(record.gridWidth, `${path}.gridWidth`);
  const gridHeight = expectPositiveInteger(record.gridHeight, `${path}.gridHeight`);
  const revealed = expectArray(record.revealed, `${path}.revealed`).map((entry, index) =>
    expectBoolean(entry, `${path}.revealed[${index}]`),
  );
  const expectedCellCount = gridWidth * gridHeight;
  if (revealed.length !== expectedCellCount) {
    fail(`${path}.revealed`, `must contain exactly ${expectedCellCount} cells.`);
  }
  const revealedCount = expectNonNegativeInteger(record.revealedCount, `${path}.revealedCount`);
  const actualRevealedCount = revealed.filter(Boolean).length;
  if (revealedCount !== actualRevealedCount) {
    fail(`${path}.revealedCount`, `must match the ${actualRevealedCount} revealed cells.`);
  }

  return {
    fogOfWar: {
      gridWidth,
      gridHeight,
      revealed,
      revealedCount,
    },
    changed: false,
  };
}

function parseSchedulerSnapshot(
  value: unknown,
  path: string,
): { scheduler: WorldSchedulerSnapshot | undefined; changed: boolean } {
  if (value === undefined) {
    return { scheduler: undefined, changed: false };
  }

  const record = expectRecord(value, path);

  return {
    scheduler: {
      lastPayrollDay: expectInteger(record.lastPayrollDay, `${path}.lastPayrollDay`),
      lastVisitorSpawnTick: expectInteger(
        record.lastVisitorSpawnTick,
        `${path}.lastVisitorSpawnTick`,
      ),
      lastEventTick: expectInteger(record.lastEventTick, `${path}.lastEventTick`),
      lastRaidOpportunityTick: expectInteger(
        record.lastRaidOpportunityTick,
        `${path}.lastRaidOpportunityTick`,
      ),
    },
    changed: false,
  };
}

function getRecordString(
  record: SaveStructuredRecord | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];

  return typeof value === "string" ? value : undefined;
}

function parseOperatorAppearancePartsIndex(
  options: SaveCodecOptions,
): Map<string, OperatorAppearancePartIndexEntry> {
  try {
    return parseOperatorAppearancePartIndex(
      options.operatorAppearancePartsIndex ?? getDefaultOperatorAppearancePartsIndex(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "must be a valid operator part index.";
    fail("save.appearancePartsIndex", message);
  }
}

function createOperatorAppearanceParseContext(
  options: SaveCodecOptions,
): OperatorAppearanceParseContext {
  let partsIndex: Map<string, OperatorAppearancePartIndexEntry> | undefined;

  return {
    getPartsIndex() {
      if (!partsIndex) {
        partsIndex = parseOperatorAppearancePartsIndex(options);
      }

      return partsIndex;
    },
  };
}

function parseOperatorVisibleGearSnapshot(
  value: unknown,
  path: string,
  appearanceContext: OperatorAppearanceParseContext,
): { visibleGear?: OperatorAppearanceSnapshot["visibleGear"]; changed: boolean } {
  if (value === undefined) {
    return {
      visibleGear: undefined,
      changed: false,
    };
  }

  const record = expectRecord(value, path);
  const visibleGear: NonNullable<OperatorAppearanceSnapshot["visibleGear"]> = {};
  const unknownKeys = Object.keys(record).filter(
    (key) => !OPERATOR_VISIBLE_GEAR_SLOT_IDS.some((candidate) => candidate === key),
  );

  if (unknownKeys[0]) {
    fail(path, `contains unknown field "${unknownKeys[0]}".`);
  }

  let changed = false;
  let hasVisibleGear = false;

  OPERATOR_VISIBLE_GEAR_SLOT_IDS.forEach((slot) => {
    const partId = record[slot];

    if (partId === undefined) {
      return;
    }

    const validatedPartId = expectString(partId, `${path}.${slot}`);
    const expectedCategory = getOperatorVisibleGearPartCategory(slot);
    const part = appearanceContext.getPartsIndex().get(validatedPartId);

    if (!part) {
      fail(`${path}.${slot}`, `must reference a known ${expectedCategory} part id.`);
    }

    if (part.category !== expectedCategory) {
      fail(
        `${path}.${slot}`,
        `must reference a ${expectedCategory} part id, but "${validatedPartId}" is "${part.category}".`,
      );
    }

    visibleGear[slot] = validatedPartId;
    hasVisibleGear = true;
  });

  if (!hasVisibleGear) {
    changed = Object.keys(record).length > 0;
  }

  return {
    visibleGear: hasVisibleGear ? visibleGear : undefined,
    changed,
  };
}

function parseOperatorAppearanceSnapshot(
  value: unknown,
  path: string,
  fallback: {
    operatorId: string;
    identity?: SaveStructuredRecord;
  },
  appearanceContext: OperatorAppearanceParseContext,
): { appearance: OperatorAppearanceSnapshot; changed: boolean } {
  const record = value === undefined ? undefined : expectRecord(value, path);

  if (record === undefined) {
    fail(path, "must be an object.");
  }

  const allowedKeys = new Set(["presetId", "visibleGear"]);

  const hadUnknownKeys = Object.keys(record).some((key) => !allowedKeys.has(key));

  const normalized = normalizeOperatorAppearance({
    presetId: record?.presetId,
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

  if (!isOperatorAppearanceRecipeId(normalized.appearance.presetId)) {
    fail(`${path}.presetId`, "must reference a known operator appearance recipe id.");
  }

  const visibleGear = parseOperatorVisibleGearSnapshot(
    record.visibleGear,
    `${path}.visibleGear`,
    appearanceContext,
  );

  return {
    appearance: {
      presetId: normalized.appearance.presetId,
      ...(visibleGear.visibleGear === undefined ? {} : { visibleGear: visibleGear.visibleGear }),
    },
    changed: normalized.changed || visibleGear.changed || hadUnknownKeys,
  };
}

function parseOperatorLifecycleSnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
): { lifecycle: OperatorLifecycleSnapshot; changed: boolean } {
  if (schemaVersion < 7) {
    return {
      lifecycle: { status: "active" },
      changed: true,
    };
  }

  if (value === undefined) {
    fail(path, "must be an object.");
  }

  const record = expectRecord(value, path);
  const status = expectString(record.status, `${path}.status`);

  if (status !== "active" && status !== "dead") {
    fail(`${path}.status`, 'must be "active" or "dead".');
  }

  if (status === "dead") {
    if (record.deathTick === undefined || record.deathRaidSummaryId === undefined) {
      fail(path, "dead operator must have both deathTick and deathRaidSummaryId.");
    }

    return {
      lifecycle: {
        status: "dead",
        deathTick: expectNonNegativeInteger(record.deathTick, `${path}.deathTick`),
        deathRaidSummaryId: expectString(record.deathRaidSummaryId, `${path}.deathRaidSummaryId`),
      },
      changed: false,
    };
  }

  if (record.deathTick !== undefined || record.deathRaidSummaryId !== undefined) {
    fail(path, "active operator must not carry deathTick or deathRaidSummaryId.");
  }

  return {
    lifecycle: { status: "active" },
    changed: false,
  };
}

function parseOperatorSnapshot(
  value: unknown,
  path: string,
  appearanceContext: OperatorAppearanceParseContext,
  schemaVersion: number,
): ParsedOperatorSnapshot {
  const record = expectRecord(value, path);
  const identity = parseOptionalStructuredRecord(record.identity, `${path}.identity`);
  const appearance = parseOperatorAppearanceSnapshot(
    record.appearance,
    `${path}.appearance`,
    {
      operatorId: expectString(record.id, `${path}.id`),
      identity,
    },
    appearanceContext,
  );
  const lifecycle = parseOperatorLifecycleSnapshot(
    record.lifecycle,
    `${path}.lifecycle`,
    schemaVersion,
  );

  return {
    id: expectString(record.id, `${path}.id`),
    lifecycle: lifecycle.lifecycle,
    identity,
    preferences: parseOptionalStructuredRecord(record.preferences, `${path}.preferences`),
    schedule: parseOptionalStructuredRecord(record.schedule, `${path}.schedule`),
    needs: parseOptionalStructuredRecord(record.needs, `${path}.needs`),
    morale: parseOptionalStructuredRecord(record.morale, `${path}.morale`),
    loyalty: parseOptionalStructuredRecord(record.loyalty, `${path}.loyalty`),
    injury: parseOptionalStructuredRecord(record.injury, `${path}.injury`),
    assignment: parseOptionalStructuredRecord(record.assignment, `${path}.assignment`),
    appearance: appearance.appearance,
    _changed: appearance.changed || lifecycle.changed,
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
  const assignment = expectRecord(record.assignment, `${path}.assignment`);
  const targetId = assignment.targetId;

  if (typeof targetId !== "string") {
    fail(`${path}.assignment.targetId`, "must be a string.");
  }

  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    roleTag: expectString(record.roleTag, `${path}.roleTag`),
    status: expectString(record.status, `${path}.status`),
    wage: expectNumber(record.wage, `${path}.wage`),
    assignment: {
      kind: expectString(assignment.kind, `${path}.assignment.kind`),
      targetId,
    },
    schedule: parseOptionalStructuredRecord(record.schedule, `${path}.schedule`),
    needs: parseOptionalStructuredRecord(record.needs, `${path}.needs`),
    morale: parseOptionalStructuredRecord(record.morale, `${path}.morale`),
    loyalty: parseOptionalStructuredRecord(record.loyalty, `${path}.loyalty`),
    injury: parseOptionalStructuredRecord(record.injury, `${path}.injury`),
  };
}

function parseVisitorSnapshot(value: unknown, path: string): VisitorSnapshot {
  const record = expectRecord(value, path);

  return {
    ...record,
    id: expectString(record.id, `${path}.id`),
  };
}

function parseActiveEventSnapshot(value: unknown, path: string): ActiveEventSnapshot {
  const record = expectRecord(value, path);

  return {
    ...record,
    id: expectString(record.id, `${path}.id`),
  };
}

function parseRaidOpportunitySnapshot(value: unknown, path: string): ParsedRaidOpportunitySnapshot {
  const record = expectRecord(value, path);
  const interestedOperatorIds = record.interestedOperatorIds;
  const claimedOperatorIds = record.claimedOperatorIds;
  const hadId = typeof record.id === "string" && record.id.length > 0;
  const indexMatch = path.match(/\[(\d+)\]$/);
  const fallbackIndex = indexMatch ? Number(indexMatch[1]) + 1 : 1;
  const changed = interestedOperatorIds === undefined || claimedOperatorIds === undefined || !hadId;

  return {
    id: hadId ? (record.id as string) : `opportunity/${fallbackIndex}`,
    missionId: expectString(record.missionId, `${path}.missionId`),
    location: parseOptionalCompactValue(record.location, `${path}.location`),
    threat: parseOptionalCompactValue(record.threat, `${path}.threat`),
    intel: parseOptionalCompactValue(record.intel, `${path}.intel`),
    reward: parseOptionalCompactValue(record.reward, `${path}.reward`),
    risk: parseOptionalCompactValue(record.risk, `${path}.risk`),
    status: parseOptionalCompactValue(record.status, `${path}.status`),
    interestedOperatorIds:
      interestedOperatorIds === undefined
        ? []
        : expectStringArray(interestedOperatorIds, `${path}.interestedOperatorIds`),
    claimedOperatorIds:
      claimedOperatorIds === undefined
        ? []
        : expectStringArray(claimedOperatorIds, `${path}.claimedOperatorIds`),
    ...(record.createdTick === undefined
      ? {}
      : { createdTick: expectInteger(record.createdTick, `${path}.createdTick`) }),
    ...(record.expiresAtTick === undefined
      ? {}
      : { expiresAtTick: expectInteger(record.expiresAtTick, `${path}.expiresAtTick`) }),
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
    ...(record.contractSiteId === undefined
      ? {}
      : { contractSiteId: expectString(record.contractSiteId, `${path}.contractSiteId`) }),
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
  schemaVersion: number,
): ParsedRaidOperatorOutcomeSnapshot {
  const record = expectRecord(value, path);
  const { outcome, died, ...rest } = record;
  const normalizedOutcome =
    outcome === undefined ? undefined : expectRecord(outcome, `${path}.outcome`);

  return {
    ...normalizedOutcome,
    ...rest,
    operatorId: expectString(record.operatorId, `${path}.operatorId`),
    ...(schemaVersion >= 7 && died !== undefined
      ? { died: expectBoolean(died, `${path}.died`) }
      : {}),
    _changed: normalizedOutcome !== undefined || (schemaVersion < 7 && died !== undefined),
  };
}

function parseRaidSummarySnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
): ParsedRaidSummarySnapshot {
  const record = expectRecord(value, path);

  let changed = false;
  const operatorOutcomes = record.operatorOutcomes;
  const narrativeTags = record.narrativeTags;
  const intelMismatchTags = record.intelMismatchTags;
  const parsedOperatorOutcomes =
    operatorOutcomes === undefined
      ? []
      : expectArray(operatorOutcomes, `${path}.operatorOutcomes`).map((entry, index) =>
          parseRaidOperatorOutcomeSnapshot(
            entry,
            `${path}.operatorOutcomes[${index}]`,
            schemaVersion,
          ),
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
    ...(record.contractSiteId === undefined
      ? {}
      : { contractSiteId: expectString(record.contractSiteId, `${path}.contractSiteId`) }),
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
  schemaVersion: number,
  options: SaveCodecOptions,
): { world: WorldSnapshot; changed: boolean } {
  const record = expectRecord(value, path);
  const appearanceContext = createOperatorAppearanceParseContext(options);
  const operators = parseOptionalCollection(
    record.operators,
    `${path}.operators`,
    (entry, entryPath) => parseOperatorSnapshot(entry, entryPath, appearanceContext, schemaVersion),
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
    (entry, entryPath) => parseRaidSummarySnapshot(entry, entryPath, schemaVersion),
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
  const contractSite = parseContractSiteSnapshot(record.contractSite, `${path}.contractSite`);
  const fogOfWar = parseFogOfWarSnapshot(record.fogOfWar, `${path}.fogOfWar`);
  const scheduler = parseSchedulerSnapshot(record.scheduler, `${path}.scheduler`);

  if (schemaVersion >= 7) {
    const knownOperatorIds = new Set(operators.items.map((op) => op.id));
    const livingOperatorIds = new Set(
      operators.items.filter((op) => op.lifecycle.status !== "dead").map((op) => op.id),
    );
    const knownRaidSummaryIds = new Set(raidSummaries.map((summary) => summary.id));

    operators.items.forEach((operator, operatorIndex) => {
      if (
        operator.lifecycle.status === "dead" &&
        !knownRaidSummaryIds.has(operator.lifecycle.deathRaidSummaryId)
      ) {
        fail(
          `${path}.operators[${operatorIndex}].lifecycle.deathRaidSummaryId`,
          `must reference an existing raid summary id, got "${operator.lifecycle.deathRaidSummaryId}".`,
        );
      }
    });

    raidSummaries.forEach((summary, summaryIndex) => {
      summary.operatorOutcomes?.forEach((outcome, outcomeIndex) => {
        if (outcome.died === true && !knownOperatorIds.has(outcome.operatorId)) {
          fail(
            `${path}.raidSummaries[${summaryIndex}].operatorOutcomes[${outcomeIndex}]`,
            `claims died for unknown operatorId "${outcome.operatorId}".`,
          );
        }
      });
    });

    activeRaidPackets.forEach((packet, packetIndex) => {
      if (packet.operatorIds.length === 0) {
        fail(`${path}.activeRaidPackets[${packetIndex}].operatorIds`, "must not be empty.");
      }

      packet.operatorIds.forEach((operatorId, operatorIndex) => {
        if (!livingOperatorIds.has(operatorId)) {
          fail(
            `${path}.activeRaidPackets[${packetIndex}].operatorIds[${operatorIndex}]`,
            `must reference an existing living operator id, got "${operatorId}".`,
          );
        }
      });

      const outcomeRecords = packet.resolutionPacket.operatorOutcomes;
      if (!Array.isArray(outcomeRecords)) {
        return;
      }

      outcomeRecords.forEach((outcome, outcomeIndex) => {
        const outcomeRecord = expectRecord(
          outcome,
          `${path}.activeRaidPackets[${packetIndex}].resolutionPacket.operatorOutcomes[${outcomeIndex}]`,
        );
        const operatorId = expectString(
          outcomeRecord.operatorId,
          `${path}.activeRaidPackets[${packetIndex}].resolutionPacket.operatorOutcomes[${outcomeIndex}].operatorId`,
        );

        if (!packet.operatorIds.includes(operatorId)) {
          fail(
            `${path}.activeRaidPackets[${packetIndex}].resolutionPacket.operatorOutcomes[${outcomeIndex}].operatorId`,
            `must belong to the raid team, got "${operatorId}".`,
          );
        }
      });
    });
  }

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
      ...(record.operators === undefined
        ? {}
        : { operators: operators.items.map(({ _changed: _ignored, ...operator }) => operator) }),
      ...(record.operatorRelationships === undefined
        ? {}
        : {
            operatorRelationships: operatorRelationships.items.map(
              ({ _changed: _ignored, ...relationship }) => relationship,
            ),
          }),
      ...(record.staff === undefined ? {} : { staff: staff.items }),
      ...(record.visitors === undefined ? {} : { visitors: visitors.items }),
      ...(record.raidOpportunities === undefined
        ? {}
        : {
            raidOpportunities: raidOpportunities.items.map(
              ({ _changed: _ignored, ...opportunity }) => opportunity,
            ),
          }),
      ...(record.activeEvents === undefined ? {} : { activeEvents: activeEvents.items }),
      contractSite: contractSite.contractSite,
      fogOfWar: fogOfWar.fogOfWar,
      ...(scheduler.scheduler === undefined ? {} : { scheduler: scheduler.scheduler }),
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
      contractSite.changed ||
      fogOfWar.changed ||
      scheduler.changed ||
      raidSummaryChanged,
  };
}

export function hydratePersistedSaveGame(
  value: unknown,
  options: SaveCodecOptions = {},
): SaveHydrationResult {
  const record = expectRecord(value, "save");
  const schemaVersion = expectInteger(record.schemaVersion, "save.schemaVersion");

  if (schemaVersion < 1) {
    fail("save.schemaVersion", "must be a supported schema version.");
  }

  if (schemaVersion > CURRENT_SAVE_SCHEMA_VERSION) {
    fail("save.schemaVersion", `is newer than supported schema ${CURRENT_SAVE_SCHEMA_VERSION}.`);
  }

  const world = parseWorldSnapshot(record.world, "save.world", schemaVersion, options);

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

export function preparePersistedSaveGameForStorage(
  save: PersistedSaveGame,
  options: SaveCodecOptions = {},
): PersistedSaveGame {
  return hydratePersistedSaveGame(save, options).save;
}
