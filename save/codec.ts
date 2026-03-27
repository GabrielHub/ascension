import {
  CURRENT_CONTENT_COMPATIBILITY,
  CURRENT_SAVE_SCHEMA_VERSION,
  SAVE_SLOT_IDS,
  type OperatorAppearanceSnapshot,
  type OperatorCombatSnapshot,
  type ActiveEventSnapshot,
  type ActiveRaidSnapshot,
  type ContractResultSnapshot,
  type ContractSiteSnapshot,
  type EquipmentAssignmentSnapshot,
  type FogOfWarSnapshot,
  type BuildingSnapshot,
  type GuildSnapshot,
  type InventoryStackSnapshot,
  type NotableTieSnapshot,
  type OperatorDispositionSnapshot,
  type OperatorLifecycleSnapshot,
  type OperatorSnapshot,
  type OperatorRelationshipSnapshot,
  type PersistedSaveGame,
  type PostedContractSnapshot,
  type RaidOpportunitySnapshot,
  type RaidOperatorOutcomeSnapshot,
  type RaidSummarySnapshot,
  type RecurringTeamSnapshot,
  type RoomCultureSnapshot,
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
import { templateRegistry } from "content/templates";
import { deriveOperatorCombatDefaults } from "lib/operator-combat";
import {
  CONTRACT_POSTURE_OPTIONS,
  DEFAULT_POLICY_STATE,
  OBJECTIVE_BIAS_OPTIONS,
  RECOVERY_TRIAGE_OPTIONS,
  ROSTER_FLOW_OPTIONS,
  STAFFING_PRIORITY_OPTIONS,
  type PolicyState,
} from "lib/policies";
import {
  getApplicableRoomUpgradeIds,
  getKnownBuildingSlotPlacements,
  getRoomActiveFootprint,
  getRoomStateId,
  resolveKnownRoomSlotPlacement,
} from "lib/hq-room-state";

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
type ParsedPostedContractSnapshot = PostedContractSnapshot & { _changed: boolean };
type ParsedRaidOperatorOutcomeSnapshot = RaidOperatorOutcomeSnapshot & { _changed: boolean };
type ParsedRaidOpportunitySnapshot = RaidOpportunitySnapshot & { _changed: boolean };
type ParsedRaidSummarySnapshot = RaidSummarySnapshot & { _changed: boolean };

const CONTRACT_LIFECYCLE_PHASES = ["idle", "bidding", "active", "resolved"] as const;

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

function parseBuildingSnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
): { building: BuildingSnapshot; changed: boolean } {
  const record = expectRecord(value, path);

  return {
    building: {
      activeBuildingId: expectString(record.activeBuildingId, `${path}.activeBuildingId`),
      activeBuildingTier: expectNumber(record.activeBuildingTier, `${path}.activeBuildingTier`),
      activeFloorIndex:
        record.activeFloorIndex === undefined
          ? 0
          : expectNonNegativeInteger(record.activeFloorIndex, `${path}.activeFloorIndex`),
      roomSlotCount: expectNumber(record.roomSlotCount, `${path}.roomSlotCount`),
      operatorSlotCount: expectNumber(record.operatorSlotCount, `${path}.operatorSlotCount`),
    },
    changed: schemaVersion < 11 || record.activeFloorIndex === undefined,
  };
}

const LEGACY_BUILDING_ID_MAP: Readonly<Record<string, string>> = {
  "building/union_hall": "building/bodega",
};

const LEGACY_ROOM_TEMPLATE_ID_MAP: Readonly<Record<string, string>> = {
  "room/front_desk:tier_1": "room/register:tier_1",
  "room/recruitment_office:tier_1": "room/counter:tier_1",
  "room/infirmary:tier_1": "room/dining_area:tier_1",
  "room/break_room:tier_1": "room/dining_area:tier_1",
  "room/lounge:tier_1": "room/dining_area:tier_1",
  "room/gym:tier_1": "room/supply_closet:tier_1",
  "room/sparring_room:tier_1": "room/supply_closet:tier_1",
};

function mapLegacyContentId(id: string, legacyMap: Readonly<Record<string, string>>): string {
  return legacyMap[id] ?? id;
}

function footprintsEqual(
  left: { col: number; row: number; cols: number; rows: number },
  right: { col: number; row: number; cols: number; rows: number },
): boolean {
  return (
    left.col === right.col &&
    left.row === right.row &&
    left.cols === right.cols &&
    left.rows === right.rows
  );
}

function normalizeRoomUpgradeIds(
  templateId: string,
  appliedUpgradeIds: unknown,
): readonly string[] | undefined {
  if (!Array.isArray(appliedUpgradeIds)) {
    return undefined;
  }

  const stringIds = appliedUpgradeIds.filter(
    (upgradeId): upgradeId is string => typeof upgradeId === "string" && upgradeId.length > 0,
  );
  const normalizedUpgradeIds = getApplicableRoomUpgradeIds(templateId, stringIds);
  return normalizedUpgradeIds.length > 0 ? normalizedUpgradeIds : undefined;
}

function getCanonicalRoomCapacity(
  templateId: string,
  appliedUpgradeIds: readonly string[] | undefined,
): number {
  const template = templateRegistry.roomById.get(templateId);
  if (!template) {
    return 0;
  }

  let capacity = template.baseCapacity;
  for (const upgradeId of appliedUpgradeIds ?? []) {
    const upgrade = templateRegistry.upgradeById.get(upgradeId);
    if (!upgrade || upgrade.target !== "room" || upgrade.targetId !== templateId) {
      continue;
    }

    upgrade.effects.forEach((effect) => {
      if (effect.type === "modify_room_capacity" && effect.roomId === templateId) {
        capacity += effect.amount;
      }
    });
  }

  return capacity;
}

function canonicalizeLegacyBodegaRooms(
  buildingRecord: Record<string, unknown>,
  rooms: unknown[],
): unknown[] {
  const canonicalSlots = templateRegistry.buildingById.has("building/bodega")
    ? resolveKnownBodegaSlots()
    : [];
  const canonicalRooms: Record<string, unknown>[] = [];
  const seenTemplateIds = new Set<string>();

  for (const room of rooms) {
    if (!room || typeof room !== "object" || Array.isArray(room)) {
      continue;
    }

    const roomRecord = room as Record<string, unknown>;
    const templateId =
      typeof roomRecord.templateId === "string" ? roomRecord.templateId : undefined;
    if (!templateId || seenTemplateIds.has(templateId)) {
      continue;
    }

    const template = templateRegistry.roomById.get(templateId);
    const slot = canonicalSlots.find((candidate) => candidate.startingTemplateId === templateId);
    if (!template || !slot) {
      continue;
    }

    seenTemplateIds.add(templateId);
    const appliedUpgradeIds = normalizeRoomUpgradeIds(templateId, roomRecord.appliedUpgradeIds);
    const reservedFootprint = { ...slot.footprint };
    const activeFootprint = getRoomActiveFootprint(
      templateId,
      reservedFootprint,
      appliedUpgradeIds,
    );

    canonicalRooms.push({
      id:
        typeof roomRecord.id === "string" && roomRecord.id.length > 0
          ? roomRecord.id
          : `room-instance/${slot.slotId.replace("slot/", "")}`,
      templateId,
      tier: template.tier,
      floorIndex: slot.floorIndex,
      slotId: slot.slotId,
      roomStateId: getRoomStateId(templateId, appliedUpgradeIds),
      capacity: getCanonicalRoomCapacity(templateId, appliedUpgradeIds),
      occupancy:
        typeof roomRecord.occupancy === "number" && Number.isFinite(roomRecord.occupancy)
          ? roomRecord.occupancy
          : 0,
      isActive:
        typeof roomRecord.isActive === "boolean"
          ? roomRecord.isActive
          : typeof roomRecord.occupancy === "number" && roomRecord.occupancy > 0,
      reservedFootprint,
      activeFootprint,
      ...(appliedUpgradeIds ? { appliedUpgradeIds: [...appliedUpgradeIds] } : {}),
    });
  }

  if (canonicalSlots.length > 0) {
    buildingRecord.roomSlotCount = canonicalSlots.length;
    const bodegaTemplate = templateRegistry.buildingById.get("building/bodega");
    if (bodegaTemplate) {
      buildingRecord.operatorSlotCount = bodegaTemplate.baseOperatorSlots;
    }
    buildingRecord.activeFloorIndex = 0;
  }

  return canonicalRooms;
}

function resolveKnownBodegaSlots() {
  return getKnownBuildingSlotPlacements("building/bodega").filter(
    (slot) => typeof slot.startingTemplateId === "string" && slot.startingTemplateId.length > 0,
  );
}

function sanitizeLegacyContentReferences(record: Record<string, unknown>): {
  record: Record<string, unknown>;
  changed: boolean;
} {
  let changed = false;
  const sanitized: Record<string, unknown> = { ...record };
  let canonicalizeBodegaSlice = false;

  const buildingValue = record.building;
  if (buildingValue && typeof buildingValue === "object" && !Array.isArray(buildingValue)) {
    const buildingRecord = { ...(buildingValue as Record<string, unknown>) };
    if (typeof buildingRecord.activeBuildingId === "string") {
      const mappedBuildingId = mapLegacyContentId(
        buildingRecord.activeBuildingId,
        LEGACY_BUILDING_ID_MAP,
      );
      if (mappedBuildingId !== buildingRecord.activeBuildingId) {
        buildingRecord.activeBuildingId = mappedBuildingId;
        changed = true;
        canonicalizeBodegaSlice = mappedBuildingId === "building/bodega";
      }
    }
    sanitized.building = buildingRecord;
  }

  if (Array.isArray(record.rooms)) {
    sanitized.rooms = record.rooms.map((room) => {
      if (!room || typeof room !== "object" || Array.isArray(room)) {
        return room;
      }

      const roomRecord = { ...(room as Record<string, unknown>) };
      if (typeof roomRecord.templateId === "string") {
        const mappedRoomId = mapLegacyContentId(roomRecord.templateId, LEGACY_ROOM_TEMPLATE_ID_MAP);
        if (mappedRoomId !== roomRecord.templateId) {
          roomRecord.templateId = mappedRoomId;
          changed = true;
          canonicalizeBodegaSlice = true;
        }
      }

      return roomRecord;
    });
  }

  if (
    canonicalizeBodegaSlice &&
    sanitized.building &&
    typeof sanitized.building === "object" &&
    !Array.isArray(sanitized.building) &&
    Array.isArray(sanitized.rooms)
  ) {
    sanitized.rooms = canonicalizeLegacyBodegaRooms(
      sanitized.building as Record<string, unknown>,
      sanitized.rooms,
    );
    changed = true;
  }

  return { record: sanitized, changed };
}

function parseRoomSnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
  building: BuildingSnapshot,
): { room: RoomSnapshot; changed: boolean } {
  const record = expectRecord(value, path);
  const isActive = record.isActive;
  const appliedUpgradeIds = record.appliedUpgradeIds;
  const parsedAppliedUpgradeIds =
    appliedUpgradeIds === undefined
      ? undefined
      : expectStringArray(appliedUpgradeIds, `${path}.appliedUpgradeIds`);
  const templateId = expectString(record.templateId, `${path}.templateId`);
  const normalizedAppliedUpgradeIds = getApplicableRoomUpgradeIds(
    templateId,
    parsedAppliedUpgradeIds,
  );
  const legacyFootprint =
    record.footprint === undefined
      ? undefined
      : expectRecord(record.footprint, `${path}.footprint`);
  const reservedRecord =
    record.reservedFootprint === undefined
      ? legacyFootprint
      : expectRecord(record.reservedFootprint, `${path}.reservedFootprint`);
  const reservedFootprint = {
    col: expectInteger(
      reservedRecord?.col,
      `${path}.${record.reservedFootprint === undefined ? "footprint" : "reservedFootprint"}.col`,
    ),
    row: expectInteger(
      reservedRecord?.row,
      `${path}.${record.reservedFootprint === undefined ? "footprint" : "reservedFootprint"}.row`,
    ),
    cols: expectPositiveInteger(
      reservedRecord?.cols,
      `${path}.${record.reservedFootprint === undefined ? "footprint" : "reservedFootprint"}.cols`,
    ),
    rows: expectPositiveInteger(
      reservedRecord?.rows,
      `${path}.${record.reservedFootprint === undefined ? "footprint" : "reservedFootprint"}.rows`,
    ),
  };
  const activeRecord =
    record.activeFootprint === undefined
      ? legacyFootprint
      : expectRecord(record.activeFootprint, `${path}.activeFootprint`);
  const fallbackActiveFootprint = getRoomActiveFootprint(
    templateId,
    reservedFootprint,
    normalizedAppliedUpgradeIds,
  );
  const parsedActiveFootprint = activeRecord
    ? {
        col: expectInteger(
          activeRecord.col,
          `${path}.${record.activeFootprint === undefined ? "footprint" : "activeFootprint"}.col`,
        ),
        row: expectInteger(
          activeRecord.row,
          `${path}.${record.activeFootprint === undefined ? "footprint" : "activeFootprint"}.row`,
        ),
        cols: expectPositiveInteger(
          activeRecord.cols,
          `${path}.${record.activeFootprint === undefined ? "footprint" : "activeFootprint"}.cols`,
        ),
        rows: expectPositiveInteger(
          activeRecord.rows,
          `${path}.${record.activeFootprint === undefined ? "footprint" : "activeFootprint"}.rows`,
        ),
      }
    : undefined;
  const activeFootprint = fallbackActiveFootprint;
  const parsedFloorIndex =
    record.floorIndex === undefined
      ? 0
      : expectNonNegativeInteger(record.floorIndex, `${path}.floorIndex`);
  const resolvedSlot = resolveKnownRoomSlotPlacement({
    buildingId: building.activeBuildingId,
    buildingTier: building.activeBuildingTier,
    floorIndex: parsedFloorIndex,
    slotId: typeof record.slotId === "string" ? record.slotId : undefined,
    templateId,
    reservedFootprint,
  });
  const floorIndex = resolvedSlot?.floorIndex ?? parsedFloorIndex;
  const slotId =
    resolvedSlot?.slotId ??
    (typeof record.slotId === "string" && record.slotId.length > 0
      ? record.slotId
      : `slot/${expectString(record.id, `${path}.id`)}`);
  const roomStateId = getRoomStateId(templateId, normalizedAppliedUpgradeIds);

  return {
    room: {
      id: expectString(record.id, `${path}.id`),
      templateId,
      tier: expectNumber(record.tier, `${path}.tier`),
      floorIndex,
      slotId,
      roomStateId,
      capacity: expectNumber(record.capacity, `${path}.capacity`),
      occupancy: expectNumber(record.occupancy, `${path}.occupancy`),
      reservedFootprint,
      activeFootprint,
      ...(isActive === undefined ? {} : { isActive: expectBoolean(isActive, `${path}.isActive`) }),
      ...(normalizedAppliedUpgradeIds.length === 0
        ? {}
        : { appliedUpgradeIds: [...normalizedAppliedUpgradeIds] }),
    },
    changed:
      schemaVersion < 11 ||
      normalizedAppliedUpgradeIds.length !== (parsedAppliedUpgradeIds?.length ?? 0) ||
      record.floorIndex === undefined ||
      floorIndex !== parsedFloorIndex ||
      record.slotId === undefined ||
      (typeof record.slotId === "string" && record.slotId !== slotId) ||
      record.roomStateId === undefined ||
      record.roomStateId !== roomStateId ||
      record.reservedFootprint === undefined ||
      record.activeFootprint === undefined ||
      (parsedActiveFootprint !== undefined &&
        !footprintsEqual(parsedActiveFootprint, activeFootprint)),
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
      ...(record.siteConceptId === undefined || record.siteConceptId === ""
        ? { siteConceptId: "" }
        : { siteConceptId: expectString(record.siteConceptId, `${path}.siteConceptId`) }),
      location: expectString(record.location, `${path}.location`),
      ...(record.rank === undefined
        ? { rank: "f" }
        : { rank: expectString(record.rank, `${path}.rank`) }),
      bossDefeated: expectBoolean(record.bossDefeated, `${path}.bossDefeated`),
      contractLost: expectBoolean(record.contractLost, `${path}.contractLost`),
      threat: expectNumber(record.threat, `${path}.threat`),
      intel: expectNumber(record.intel, `${path}.intel`),
      reward: expectNumber(record.reward, `${path}.reward`),
      securedAtTick: expectInteger(record.securedAtTick, `${path}.securedAtTick`),
      ...(record.explorationProgress === undefined
        ? { explorationProgress: 0 }
        : {
            explorationProgress: expectNumber(
              record.explorationProgress,
              `${path}.explorationProgress`,
            ),
          }),
      ...(record.bossIntelProgress === undefined
        ? { bossIntelProgress: 0 }
        : {
            bossIntelProgress: expectNumber(record.bossIntelProgress, `${path}.bossIntelProgress`),
          }),
      ...(record.bossPressureProgress === undefined
        ? { bossPressureProgress: 0 }
        : {
            bossPressureProgress: expectNumber(
              record.bossPressureProgress,
              `${path}.bossPressureProgress`,
            ),
          }),
      ...(record.bossAvailable === undefined
        ? { bossAvailable: false }
        : { bossAvailable: expectBoolean(record.bossAvailable, `${path}.bossAvailable`) }),
    },
    changed:
      record.siteConceptId === undefined ||
      record.rank === undefined ||
      record.explorationProgress === undefined ||
      record.bossIntelProgress === undefined ||
      record.bossPressureProgress === undefined ||
      record.bossAvailable === undefined,
  };
}

function parseContractLifecycleSnapshot(
  value: unknown,
  path: string,
): {
  contractLifecycle: WorldSnapshot["contractLifecycle"] | undefined;
  changed: boolean;
} {
  if (value === undefined) {
    return { contractLifecycle: undefined, changed: false };
  }

  const phase = expectString(value, path);
  if (!CONTRACT_LIFECYCLE_PHASES.some((candidate) => candidate === phase)) {
    fail(path, `must be one of ${CONTRACT_LIFECYCLE_PHASES.join(", ")}.`);
  }

  return {
    contractLifecycle: phase as WorldSnapshot["contractLifecycle"],
    changed: false,
  };
}

function parsePostedContractSnapshot(value: unknown, path: string): ParsedPostedContractSnapshot {
  const record = expectRecord(value, path);

  return {
    postingId: expectString(record.postingId, `${path}.postingId`),
    missionId: expectString(record.missionId, `${path}.missionId`),
    siteConceptId: expectString(record.siteConceptId, `${path}.siteConceptId`),
    location: expectString(record.location, `${path}.location`),
    rank: expectString(record.rank, `${path}.rank`),
    threat: expectNumber(record.threat, `${path}.threat`),
    intel: expectNumber(record.intel, `${path}.intel`),
    reward: expectNumber(record.reward, `${path}.reward`),
    risk: expectNumber(record.risk, `${path}.risk`),
    bidCost: expectNumber(record.bidCost, `${path}.bidCost`),
    minReputation: expectNumber(record.minReputation, `${path}.minReputation`),
    generatedAtTick: expectInteger(record.generatedAtTick, `${path}.generatedAtTick`),
    ...(record.knownTraits === undefined
      ? { knownTraits: [] }
      : { knownTraits: expectStringArray(record.knownTraits, `${path}.knownTraits`) }),
    ...(record.hiddenTraitCount === undefined
      ? { hiddenTraitCount: 0 }
      : {
          hiddenTraitCount: expectNonNegativeInteger(
            record.hiddenTraitCount,
            `${path}.hiddenTraitCount`,
          ),
        }),
    ...(record.enemyHints === undefined
      ? { enemyHints: [] }
      : { enemyHints: expectStringArray(record.enemyHints, `${path}.enemyHints`) }),
    ...(record.lootFamilyHints === undefined
      ? { lootFamilyHints: [] }
      : { lootFamilyHints: expectStringArray(record.lootFamilyHints, `${path}.lootFamilyHints`) }),
    ...(record.bossHint === undefined
      ? {}
      : {
          bossHint:
            record.bossHint === null ? null : expectString(record.bossHint, `${path}.bossHint`),
        }),
    ...(record.neighborhoodLabel === undefined
      ? { neighborhoodLabel: "" }
      : {
          neighborhoodLabel: expectString(record.neighborhoodLabel, `${path}.neighborhoodLabel`),
        }),
    _changed:
      record.knownTraits === undefined ||
      record.hiddenTraitCount === undefined ||
      record.enemyHints === undefined ||
      record.lootFamilyHints === undefined ||
      record.neighborhoodLabel === undefined,
  };
}

function parseContractResultSnapshot(
  value: unknown,
  path: string,
): { contractResult: ContractResultSnapshot | null; changed: boolean } {
  if (value == null) {
    return { contractResult: null, changed: false };
  }

  const record = expectRecord(value, path);
  const outcome = expectString(record.outcome, `${path}.outcome`);
  if (outcome !== "boss_defeated" && outcome !== "contract_lost") {
    fail(`${path}.outcome`, 'must be "boss_defeated" or "contract_lost".');
  }

  return {
    contractResult: {
      contractSiteId: expectString(record.contractSiteId, `${path}.contractSiteId`),
      missionId: expectString(record.missionId, `${path}.missionId`),
      siteConceptId: expectString(record.siteConceptId, `${path}.siteConceptId`),
      location: expectString(record.location, `${path}.location`),
      rank: expectString(record.rank, `${path}.rank`),
      outcome,
      totalRaids: expectNonNegativeInteger(record.totalRaids, `${path}.totalRaids`),
      totalCashEarned: expectNumber(record.totalCashEarned, `${path}.totalCashEarned`),
      totalReputationEarned: expectNumber(
        record.totalReputationEarned,
        `${path}.totalReputationEarned`,
      ),
      operatorDeaths: expectNonNegativeInteger(record.operatorDeaths, `${path}.operatorDeaths`),
      resolvedAtTick: expectInteger(record.resolvedAtTick, `${path}.resolvedAtTick`),
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

  if (status !== "active" && status !== "dead" && status !== "departed") {
    fail(`${path}.status`, 'must be "active", "dead", or "departed".');
  }

  if (status === "dead") {
    if (record.deathTick === undefined || record.deathRaidSummaryId === undefined) {
      fail(path, "dead operator must have both deathTick and deathRaidSummaryId.");
    }
    if (record.departureTick !== undefined || record.departureReason !== undefined) {
      fail(path, "dead operator must not carry departureTick or departureReason.");
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

  if (status === "departed") {
    if (record.departureTick === undefined || record.departureReason === undefined) {
      fail(path, "departed operator must have both departureTick and departureReason.");
    }
    if (record.deathTick !== undefined || record.deathRaidSummaryId !== undefined) {
      fail(path, "departed operator must not carry deathTick or deathRaidSummaryId.");
    }

    return {
      lifecycle: {
        status: "departed",
        departureTick: expectNonNegativeInteger(record.departureTick, `${path}.departureTick`),
        departureReason: expectString(record.departureReason, `${path}.departureReason`),
      },
      changed: false,
    };
  }

  if (
    record.deathTick !== undefined ||
    record.deathRaidSummaryId !== undefined ||
    record.departureTick !== undefined ||
    record.departureReason !== undefined
  ) {
    fail(
      path,
      "active operator must not carry deathTick, deathRaidSummaryId, departureTick, or departureReason.",
    );
  }

  return {
    lifecycle: { status: "active" },
    changed: false,
  };
}

function parseOperatorCombatSnapshot(value: unknown, path: string): OperatorCombatSnapshot {
  const record = expectRecord(value, path);
  const kitRecord = expectRecord(record.kit, `${path}.kit`);
  const statsRecord = expectRecord(record.baseStats, `${path}.baseStats`);

  return {
    rank: expectString(record.rank, `${path}.rank`),
    attunementTag: expectString(record.attunementTag, `${path}.attunementTag`),
    traits: expectStringArray(record.traits, `${path}.traits`),
    kit: {
      regularAttackId: expectString(kitRecord.regularAttackId, `${path}.kit.regularAttackId`),
      skillId: expectString(kitRecord.skillId, `${path}.kit.skillId`),
      ultimateId: expectString(kitRecord.ultimateId, `${path}.kit.ultimateId`),
      passiveIds: expectStringArray(kitRecord.passiveIds, `${path}.kit.passiveIds`),
    },
    baseStats: {
      strength: expectNumber(statsRecord.strength, `${path}.baseStats.strength`),
      speed: expectNumber(statsRecord.speed, `${path}.baseStats.speed`),
      endurance: expectNumber(statsRecord.endurance, `${path}.baseStats.endurance`),
      resilience: expectNumber(statsRecord.resilience, `${path}.baseStats.resilience`),
      perception: expectNumber(statsRecord.perception, `${path}.baseStats.perception`),
      intelligence: expectNumber(statsRecord.intelligence, `${path}.baseStats.intelligence`),
    },
  };
}

function parseOptionalOperatorCombatSnapshot(
  value: unknown,
  path: string,
  identity: SaveStructuredRecord | undefined,
  schemaVersion: number,
): { combat: OperatorCombatSnapshot | undefined; changed: boolean } {
  if (value !== undefined) {
    return { combat: parseOperatorCombatSnapshot(value, path), changed: false };
  }

  const roleTag = identity && typeof identity.roleTag === "string" ? identity.roleTag : "";
  return {
    combat: deriveOperatorCombatDefaults(roleTag),
    changed: schemaVersion < 10 || value === undefined,
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
  const combat = parseOptionalOperatorCombatSnapshot(
    record.combat,
    `${path}.combat`,
    identity,
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
    ...(combat.combat !== undefined ? { combat: combat.combat } : {}),
    _changed: appearance.changed || lifecycle.changed || combat.changed,
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
    ...(record.bossDefeated !== undefined
      ? { bossDefeated: expectBoolean(record.bossDefeated, `${path}.bossDefeated`) }
      : {}),
    ...(record.contributingFactors !== undefined
      ? {
          contributingFactors: expectStringArray(
            record.contributingFactors,
            `${path}.contributingFactors`,
          ),
        }
      : {}),
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

function parseOperatorDispositionSnapshot(
  value: unknown,
  path: string,
): OperatorDispositionSnapshot {
  const record = expectRecord(value, path);
  return {
    operatorId: expectString(record.operatorId, `${path}.operatorId`),
    sociability: expectNumber(record.sociability, `${path}.sociability`),
    temperament: expectNumber(record.temperament, `${path}.temperament`),
    grievanceLevel: expectNumber(record.grievanceLevel, `${path}.grievanceLevel`),
    satisfactionLevel: expectNumber(record.satisfactionLevel, `${path}.satisfactionLevel`),
  };
}

function parseNotableTieSnapshot(value: unknown, path: string): NotableTieSnapshot {
  const record = expectRecord(value, path);
  return {
    operatorAId: expectString(record.operatorAId, `${path}.operatorAId`),
    operatorBId: expectString(record.operatorBId, `${path}.operatorBId`),
    stance: expectString(record.stance, `${path}.stance`),
    strength: expectNumber(record.strength, `${path}.strength`),
  };
}

function parseRecurringTeamSnapshot(value: unknown, path: string): RecurringTeamSnapshot {
  const record = expectRecord(value, path);
  return {
    id: expectString(record.id, `${path}.id`),
    memberIds: expectStringArray(record.memberIds, `${path}.memberIds`),
    cohesion: expectNumber(record.cohesion, `${path}.cohesion`),
    raidCount: expectNonNegativeInteger(record.raidCount, `${path}.raidCount`),
    lastRaidTick: expectInteger(record.lastRaidTick, `${path}.lastRaidTick`),
    damaged: expectBoolean(record.damaged, `${path}.damaged`),
    damageReason:
      record.damageReason === undefined || record.damageReason === ""
        ? ""
        : expectString(record.damageReason, `${path}.damageReason`),
  };
}

function parseRoomCultureSnapshot(value: unknown, path: string): RoomCultureSnapshot {
  const record = expectRecord(value, path);
  return {
    roomInstanceId: expectString(record.roomInstanceId, `${path}.roomInstanceId`),
    comfort: expectNumber(record.comfort, `${path}.comfort`),
    tension: expectNumber(record.tension, `${path}.tension`),
    camaraderie: expectNumber(record.camaraderie, `${path}.camaraderie`),
    tone: expectString(record.tone, `${path}.tone`),
  };
}

function parseInventoryStackSnapshot(value: unknown, path: string): InventoryStackSnapshot {
  const record = expectRecord(value, path);
  return {
    itemId: expectString(record.itemId, `${path}.itemId`),
    quantity: expectPositiveInteger(record.quantity, `${path}.quantity`),
  };
}

function parseEquipmentAssignmentSnapshot(
  value: unknown,
  path: string,
): EquipmentAssignmentSnapshot {
  const record = expectRecord(value, path);
  return {
    operatorId: expectString(record.operatorId, `${path}.operatorId`),
    weaponId: typeof record.weaponId === "string" ? record.weaponId : "",
    outfitOverlayId: typeof record.outfitOverlayId === "string" ? record.outfitOverlayId : "",
    accessoryId: typeof record.accessoryId === "string" ? record.accessoryId : "",
  };
}

function expectPolicyOption<T extends readonly string[]>(
  value: unknown,
  path: string,
  options: T,
): T[number] {
  const parsed = expectString(value, path);
  if (!options.includes(parsed as T[number])) {
    fail(path, `must be one of ${options.join(", ")}, got "${parsed}".`);
  }
  return parsed as T[number];
}

function parsePolicyStateSnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
): { policies: PolicyState; changed: boolean } {
  if (value === undefined || value === null) {
    return {
      policies: { ...DEFAULT_POLICY_STATE },
      changed: schemaVersion < 15 || value === undefined,
    };
  }

  const record = expectRecord(value, path);
  return {
    policies: {
      contractPosture: expectPolicyOption(
        record.contractPosture,
        `${path}.contractPosture`,
        CONTRACT_POSTURE_OPTIONS,
      ),
      objectiveBias: expectPolicyOption(
        record.objectiveBias,
        `${path}.objectiveBias`,
        OBJECTIVE_BIAS_OPTIONS,
      ),
      recoveryTriage: expectPolicyOption(
        record.recoveryTriage,
        `${path}.recoveryTriage`,
        RECOVERY_TRIAGE_OPTIONS,
      ),
      staffingPriority: expectPolicyOption(
        record.staffingPriority,
        `${path}.staffingPriority`,
        STAFFING_PRIORITY_OPTIONS,
      ),
      rosterFlow: expectPolicyOption(record.rosterFlow, `${path}.rosterFlow`, ROSTER_FLOW_OPTIONS),
    },
    changed: false,
  };
}

function deriveDispositionFromOperator(operator: OperatorSnapshot): OperatorDispositionSnapshot {
  const moraleRecord = operator.morale;
  const loyaltyRecord = operator.loyalty;
  const moraleCurrent =
    moraleRecord && typeof moraleRecord.current === "number" ? moraleRecord.current : 50;
  const loyaltyCurrent =
    loyaltyRecord && typeof loyaltyRecord.current === "number" ? loyaltyRecord.current : 50;

  return {
    operatorId: operator.id,
    sociability: 50,
    temperament: 50,
    grievanceLevel: Math.max(0, Math.round(50 - moraleCurrent * 0.5)),
    satisfactionLevel: Math.round((moraleCurrent + loyaltyCurrent) / 2),
  };
}

function parseWorldSnapshot(
  value: unknown,
  path: string,
  schemaVersion: number,
  options: SaveCodecOptions,
): { world: WorldSnapshot; changed: boolean } {
  const originalRecord = expectRecord(value, path);
  const legacyContent = sanitizeLegacyContentReferences(originalRecord);
  const record = legacyContent.record;
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
  const contractLifecycle = parseContractLifecycleSnapshot(
    record.contractLifecycle,
    `${path}.contractLifecycle`,
  );
  const postedContracts = parseOptionalCollection(
    record.postedContracts,
    `${path}.postedContracts`,
    parsePostedContractSnapshot,
  );
  const contractResult = parseContractResultSnapshot(
    record.contractResult,
    `${path}.contractResult`,
  );
  const fogOfWar = parseFogOfWarSnapshot(record.fogOfWar, `${path}.fogOfWar`);
  const scheduler = parseSchedulerSnapshot(record.scheduler, `${path}.scheduler`);
  const policies = parsePolicyStateSnapshot(record.policies, `${path}.policies`, schemaVersion);
  const building = parseBuildingSnapshot(record.building, `${path}.building`, schemaVersion);
  const rooms = parseCollection(record.rooms, `${path}.rooms`, (entry, entryPath) =>
    parseRoomSnapshot(entry, entryPath, schemaVersion, building.building),
  );

  // Phase 2: Parse new snapshot types or derive defaults from schema 7 migration
  let phase2Changed = false;

  const operatorDispositions =
    record.operatorDispositions === undefined
      ? (() => {
          if (schemaVersion < 8) phase2Changed = true;
          return schemaVersion < 8
            ? operators.items.map((op) => deriveDispositionFromOperator(op))
            : [];
        })()
      : parseCollection(
          record.operatorDispositions,
          `${path}.operatorDispositions`,
          parseOperatorDispositionSnapshot,
        );

  const notableTies: NotableTieSnapshot[] = record.notableTies
    ? parseCollection(record.notableTies, `${path}.notableTies`, parseNotableTieSnapshot)
    : (() => {
        if (schemaVersion < 8) phase2Changed = true;
        return [];
      })();

  const recurringTeams: RecurringTeamSnapshot[] = record.recurringTeams
    ? parseCollection(record.recurringTeams, `${path}.recurringTeams`, parseRecurringTeamSnapshot)
    : (() => {
        if (schemaVersion < 8) phase2Changed = true;
        return [];
      })();

  const roomCultures: RoomCultureSnapshot[] = record.roomCultures
    ? parseCollection(record.roomCultures, `${path}.roomCultures`, parseRoomCultureSnapshot)
    : (() => {
        if (schemaVersion < 8) phase2Changed = true;
        return [];
      })();

  const inventoryStacks: InventoryStackSnapshot[] = record.inventoryStacks
    ? parseCollection(
        record.inventoryStacks,
        `${path}.inventoryStacks`,
        parseInventoryStackSnapshot,
      )
    : (() => {
        if (schemaVersion < 8) phase2Changed = true;
        return [];
      })();

  const equipmentAssignments: EquipmentAssignmentSnapshot[] = record.equipmentAssignments
    ? parseCollection(
        record.equipmentAssignments,
        `${path}.equipmentAssignments`,
        parseEquipmentAssignmentSnapshot,
      )
    : (() => {
        if (schemaVersion < 8) phase2Changed = true;
        return [];
      })();

  if (schemaVersion >= 7) {
    const knownOperatorIds = new Set(operators.items.map((op) => op.id));
    const knownRoomIds = new Set(rooms.map((room) => room.id));
    const activeOperatorIds = new Set(
      operators.items.filter((op) => op.lifecycle.status === "active").map((op) => op.id),
    );
    const knownRaidSummaryIds = new Set(raidSummaries.map((summary) => summary.id));

    const seenDispositionOperatorIds = new Set<string>();
    operatorDispositions.forEach((entry, entryIndex) => {
      if (!knownOperatorIds.has(entry.operatorId)) {
        fail(
          `${path}.operatorDispositions[${entryIndex}].operatorId`,
          `must reference an existing operator id, got "${entry.operatorId}".`,
        );
      }

      if (seenDispositionOperatorIds.has(entry.operatorId)) {
        fail(
          `${path}.operatorDispositions[${entryIndex}].operatorId`,
          `duplicates operatorId "${entry.operatorId}".`,
        );
      }

      seenDispositionOperatorIds.add(entry.operatorId);
    });

    const seenTieKeys = new Set<string>();
    notableTies.forEach((tie, entryIndex) => {
      if (!knownOperatorIds.has(tie.operatorAId)) {
        fail(
          `${path}.notableTies[${entryIndex}].operatorAId`,
          `must reference an existing operator id, got "${tie.operatorAId}".`,
        );
      }
      if (!knownOperatorIds.has(tie.operatorBId)) {
        fail(
          `${path}.notableTies[${entryIndex}].operatorBId`,
          `must reference an existing operator id, got "${tie.operatorBId}".`,
        );
      }

      const pairKey =
        tie.operatorAId < tie.operatorBId
          ? `${tie.operatorAId}::${tie.operatorBId}`
          : `${tie.operatorBId}::${tie.operatorAId}`;
      if (seenTieKeys.has(pairKey)) {
        fail(
          `${path}.notableTies[${entryIndex}]`,
          `duplicates tie pair "${pairKey.replace("::", " / ")}".`,
        );
      }
      seenTieKeys.add(pairKey);
    });

    const seenRecurringTeamIds = new Set<string>();
    recurringTeams.forEach((team, entryIndex) => {
      if (seenRecurringTeamIds.has(team.id)) {
        fail(
          `${path}.recurringTeams[${entryIndex}].id`,
          `duplicates recurring team id "${team.id}".`,
        );
      }
      seenRecurringTeamIds.add(team.id);

      const memberIds = new Set<string>();
      team.memberIds.forEach((memberId, memberIndex) => {
        if (!knownOperatorIds.has(memberId)) {
          fail(
            `${path}.recurringTeams[${entryIndex}].memberIds[${memberIndex}]`,
            `must reference an existing operator id, got "${memberId}".`,
          );
        }
        if (memberIds.has(memberId)) {
          fail(
            `${path}.recurringTeams[${entryIndex}].memberIds[${memberIndex}]`,
            `duplicates memberId "${memberId}".`,
          );
        }
        memberIds.add(memberId);
      });
    });

    const seenRoomCultureIds = new Set<string>();
    // Filter out stale room culture entries that reference rooms no longer present
    // (e.g. from saves created before a room-ID migration). Culture data is non-critical.
    for (let i = roomCultures.length - 1; i >= 0; i--) {
      const culture = roomCultures[i];
      if (
        !knownRoomIds.has(culture.roomInstanceId) ||
        seenRoomCultureIds.has(culture.roomInstanceId)
      ) {
        roomCultures.splice(i, 1);
        phase2Changed = true;
        continue;
      }
      seenRoomCultureIds.add(culture.roomInstanceId);
    }

    const seenInventoryItemIds = new Set<string>();
    inventoryStacks.forEach((stack, entryIndex) => {
      if (seenInventoryItemIds.has(stack.itemId)) {
        fail(
          `${path}.inventoryStacks[${entryIndex}].itemId`,
          `duplicates inventory item id "${stack.itemId}".`,
        );
      }
      seenInventoryItemIds.add(stack.itemId);
    });

    const seenEquipmentOperatorIds = new Set<string>();
    equipmentAssignments.forEach((assignment, entryIndex) => {
      if (!knownOperatorIds.has(assignment.operatorId)) {
        fail(
          `${path}.equipmentAssignments[${entryIndex}].operatorId`,
          `must reference an existing operator id, got "${assignment.operatorId}".`,
        );
      }

      if (seenEquipmentOperatorIds.has(assignment.operatorId)) {
        fail(
          `${path}.equipmentAssignments[${entryIndex}].operatorId`,
          `duplicates operatorId "${assignment.operatorId}".`,
        );
      }

      seenEquipmentOperatorIds.add(assignment.operatorId);
    });

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
        if (!activeOperatorIds.has(operatorId)) {
          fail(
            `${path}.activeRaidPackets[${packetIndex}].operatorIds[${operatorIndex}]`,
            `must reference an existing active operator id, got "${operatorId}".`,
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
      building: building.building,
      rooms: rooms.map(({ room }) => room),
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
      ...(record.contractLifecycle === undefined
        ? {}
        : { contractLifecycle: contractLifecycle.contractLifecycle }),
      ...(record.postedContracts === undefined
        ? {}
        : {
            postedContracts: postedContracts.items.map(
              ({ _changed: _ignored, ...postedContract }) => postedContract,
            ),
          }),
      ...(record.contractResult === undefined
        ? {}
        : { contractResult: contractResult.contractResult }),
      fogOfWar: fogOfWar.fogOfWar,
      ...(scheduler.scheduler === undefined ? {} : { scheduler: scheduler.scheduler }),
      operatorDispositions,
      notableTies,
      recurringTeams,
      roomCultures,
      inventoryStacks,
      equipmentAssignments,
      policies: policies.policies,
      // Encounter, interruption, and incident state: pass through if present, ignore if absent
      ...(record.activeEncounter && typeof record.activeEncounter === "object"
        ? { activeEncounter: record.activeEncounter as SaveStructuredRecord }
        : {}),
      ...(record.interruptionQueue && typeof record.interruptionQueue === "object"
        ? { interruptionQueue: record.interruptionQueue as SaveStructuredRecord }
        : {}),
      ...(record.incidentState && typeof record.incidentState === "object"
        ? { incidentState: record.incidentState as SaveStructuredRecord }
        : {}),
      ...(record.guidanceState && typeof record.guidanceState === "object"
        ? { guidanceState: record.guidanceState as SaveStructuredRecord }
        : {}),
    },
    changed:
      building.changed ||
      rooms.some((room) => room.changed) ||
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
      contractLifecycle.changed ||
      postedContracts.changed ||
      postedContracts.items.some((postedContract) => postedContract._changed) ||
      contractResult.changed ||
      fogOfWar.changed ||
      scheduler.changed ||
      policies.changed ||
      raidSummaryChanged ||
      phase2Changed ||
      legacyContent.changed,
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
