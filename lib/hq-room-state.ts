import { getBuildingFloors, getBuildingSlot } from "content/building-layouts";

export interface HqRoomFootprint {
  col: number;
  row: number;
  cols: number;
  rows: number;
}

interface RoomStateContract {
  stateKey: string;
  maxLevel: number;
  upgradeIds?: readonly string[];
  activeFootprint: (reserved: HqRoomFootprint, level: number) => HqRoomFootprint;
}

export interface HqBuildingSlotPlacement {
  floorIndex: number;
  slotId: string;
  startingTemplateId?: string;
  footprint: HqRoomFootprint;
}

function cloneFootprint(footprint: HqRoomFootprint): HqRoomFootprint {
  return {
    col: footprint.col,
    row: footprint.row,
    cols: footprint.cols,
    rows: footprint.rows,
  };
}

function clampStateLevel(level: number, maxLevel: number): number {
  return Math.max(1, Math.min(maxLevel, Math.trunc(level)));
}

function withRows(reserved: HqRoomFootprint, rows: number, rowOffset = 0): HqRoomFootprint {
  const nextRows = Math.max(1, Math.min(reserved.rows, rows));
  return {
    col: reserved.col,
    row: reserved.row + Math.max(0, Math.min(reserved.rows - nextRows, rowOffset)),
    cols: reserved.cols,
    rows: nextRows,
  };
}

const ROOM_STATE_CONTRACTS: Record<string, RoomStateContract> = {
  "room/register:tier_1": {
    stateKey: "register",
    maxLevel: 2,
    upgradeIds: ["upgrade/room/register:records_wall"],
    activeFootprint: (reserved) => cloneFootprint(reserved),
  },
  "room/counter:tier_1": {
    stateKey: "counter",
    maxLevel: 2,
    upgradeIds: ["upgrade/room/counter:hot_coffee"],
    activeFootprint: (reserved, level) =>
      level >= 2 ? cloneFootprint(reserved) : withRows(reserved, Math.max(2, reserved.rows - 1), 1),
  },
  "room/dining_area:tier_1": {
    stateKey: "dining-area",
    maxLevel: 3,
    upgradeIds: [
      "upgrade/room/dining_area:first_aid_station",
      "upgrade/room/dining_area:common_table",
    ],
    activeFootprint: (reserved) => cloneFootprint(reserved),
  },
  "room/supply_closet:tier_1": {
    stateKey: "supply-closet",
    maxLevel: 2,
    upgradeIds: ["upgrade/room/supply_closet:labeled_bins"],
    activeFootprint: (reserved) => cloneFootprint(reserved),
  },
};

export function getRoomStateContract(templateId: string): RoomStateContract {
  return (
    ROOM_STATE_CONTRACTS[templateId] ?? {
      stateKey:
        templateId
          .split("/")
          .pop()
          ?.replace(/:tier_\d+$/, "") ?? "room",
      maxLevel: 1,
      activeFootprint: (reserved) => cloneFootprint(reserved),
    }
  );
}

export function getRoomStateLevel(
  templateId: string,
  appliedUpgradeIds: readonly string[] | undefined,
): number {
  const contract = getRoomStateContract(templateId);
  return clampStateLevel(
    1 + getApplicableRoomUpgradeIds(templateId, appliedUpgradeIds).length,
    contract.maxLevel,
  );
}

export function getRoomStateId(
  templateId: string,
  appliedUpgradeIdsOrLevel: readonly string[] | number | undefined,
): string {
  const contract = getRoomStateContract(templateId);
  const level =
    typeof appliedUpgradeIdsOrLevel === "number"
      ? clampStateLevel(appliedUpgradeIdsOrLevel, contract.maxLevel)
      : getRoomStateLevel(templateId, appliedUpgradeIdsOrLevel);
  return `room-state/${contract.stateKey}:${level}`;
}

export function getRoomActiveFootprint(
  templateId: string,
  reservedFootprint: HqRoomFootprint,
  appliedUpgradeIdsOrLevel: readonly string[] | number | undefined,
): HqRoomFootprint {
  const contract = getRoomStateContract(templateId);
  const level =
    typeof appliedUpgradeIdsOrLevel === "number"
      ? clampStateLevel(appliedUpgradeIdsOrLevel, contract.maxLevel)
      : getRoomStateLevel(templateId, appliedUpgradeIdsOrLevel);
  return contract.activeFootprint(reservedFootprint, level);
}

export function getApplicableRoomUpgradeIds(
  templateId: string,
  appliedUpgradeIds: readonly string[] | undefined,
): string[] {
  const knownUpgradeIds = getRoomStateContract(templateId).upgradeIds;
  if (!knownUpgradeIds?.length || !appliedUpgradeIds?.length) {
    return [];
  }

  const allowedIds = new Set(knownUpgradeIds);
  const seenIds = new Set<string>();
  return appliedUpgradeIds.filter((upgradeId) => {
    if (!allowedIds.has(upgradeId) || seenIds.has(upgradeId)) {
      return false;
    }
    seenIds.add(upgradeId);
    return true;
  });
}

/**
 * Returns the next upgrade IDs that are eligible for purchase given the
 * current applied upgrades.  When a room state contract defines an ordered
 * `upgradeIds` list, only the first unapplied upgrade in that sequence is
 * returned — the rest are gated behind it.
 *
 * If a room has no contract or no ordered list, all unapplied IDs targeting
 * that room are eligible (the caller still filters by template matching and
 * requirements).
 */
export function getNextPendingRoomUpgradeIds(
  templateId: string,
  appliedUpgradeIds: readonly string[] | undefined,
): string[] {
  const contract = getRoomStateContract(templateId);
  const orderedIds = contract.upgradeIds;
  if (!orderedIds?.length) {
    return [];
  }

  const applied = new Set(getApplicableRoomUpgradeIds(templateId, appliedUpgradeIds));

  for (const upgradeId of orderedIds) {
    if (!applied.has(upgradeId)) {
      return [upgradeId];
    }
  }

  return [];
}

function footprintsMatch(left: HqRoomFootprint, right: HqRoomFootprint): boolean {
  return (
    left.col === right.col &&
    left.row === right.row &&
    left.cols === right.cols &&
    left.rows === right.rows
  );
}

export function getKnownBuildingSlotPlacements(
  buildingId: string,
  buildingTier = 1,
): readonly HqBuildingSlotPlacement[] {
  return getBuildingFloors(buildingId, buildingTier).flatMap((floor) =>
    floor.slots.map((slot) => ({
      floorIndex: floor.floorIndex,
      slotId: slot.slotId,
      startingTemplateId: slot.startingTemplateId,
      footprint: {
        col: slot.col,
        row: slot.row,
        cols: slot.cols,
        rows: slot.rows,
      },
    })),
  );
}

export function resolveKnownRoomSlotPlacement(input: {
  buildingId: string;
  buildingTier?: number;
  floorIndex?: number;
  slotId?: string;
  templateId?: string;
  reservedFootprint?: HqRoomFootprint;
}): HqBuildingSlotPlacement | undefined {
  const buildingTier = input.buildingTier ?? 1;
  const floorIndex = input.floorIndex ?? 0;

  if (input.slotId) {
    const explicitSlot = getBuildingSlot(input.buildingId, input.slotId, floorIndex, buildingTier);
    if (explicitSlot) {
      return {
        floorIndex,
        slotId: explicitSlot.slotId,
        startingTemplateId: explicitSlot.startingTemplateId,
        footprint: {
          col: explicitSlot.col,
          row: explicitSlot.row,
          cols: explicitSlot.cols,
          rows: explicitSlot.rows,
        },
      };
    }
  }

  const slots = getKnownBuildingSlotPlacements(input.buildingId, buildingTier);

  if (input.reservedFootprint) {
    const footprintMatch = slots.find(
      (slot) =>
        slot.floorIndex === floorIndex && footprintsMatch(slot.footprint, input.reservedFootprint!),
    );
    if (footprintMatch) {
      return footprintMatch;
    }
  }

  if (input.templateId) {
    return slots.find(
      (slot) => slot.floorIndex === floorIndex && slot.startingTemplateId === input.templateId,
    );
  }

  return undefined;
}

export function getRoomStateLabel(roomStateId: string): string {
  const [rawKey, rawLevel] = roomStateId.replace("room-state/", "").split(":");
  const label = rawKey.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return rawLevel ? `${label} ${rawLevel}` : label;
}

export function formatSlotLabel(slotId: string): string {
  return (
    slotId
      .split("/")
      .pop()
      ?.replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) ?? slotId
  );
}

export function getSlotKey(floorIndex: number, slotId: string): string {
  return `${floorIndex}:${slotId}`;
}
