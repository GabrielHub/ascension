/**
 * Fixed building layouts define the physical shell for each HQ building.
 * Layouts are floor-aware even when the live building only exposes floor 0.
 */

export interface BuildingRoomSlot {
  slotId: string;
  col: number;
  row: number;
  cols: number;
  rows: number;
  startingTemplateId?: string;
}

export interface BuildingFloorLayout {
  floorIndex: number;
  elevationBandId: string | null;
  shell: { col: number; row: number; cols: number; rows: number };
  slots: readonly BuildingRoomSlot[];
}

export interface BuildingLayoutStage {
  stageId: string;
  minimumTier: number;
  floors: readonly BuildingFloorLayout[];
}

export interface BuildingLayoutDefinition {
  buildingId: string;
  stages: readonly BuildingLayoutStage[];
}

const BODEGA_FLOOR_0: BuildingFloorLayout = {
  floorIndex: 0,
  elevationBandId: "ground-floor",
  shell: { col: 0, row: 0, cols: 10, rows: 18 },
  slots: [
    {
      slotId: "slot/dining-area",
      col: 1,
      row: 15,
      cols: 8,
      rows: 3,
      startingTemplateId: "room/dining_area:tier_1",
    },
    {
      slotId: "slot/register",
      col: 0,
      row: 10,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/register:tier_1",
    },
    {
      slotId: "slot/counter",
      col: 6,
      row: 10,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/counter:tier_1",
    },
    {
      slotId: "slot/supply-closet",
      col: 0,
      row: 5,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/supply_closet:tier_1",
    },
    { slotId: "slot/back-room-right", col: 6, row: 5, cols: 4, rows: 3 },
    { slotId: "slot/storage-left", col: 0, row: 0, cols: 4, rows: 3 },
    { slotId: "slot/storage-right", col: 6, row: 0, cols: 4, rows: 3 },
  ],
};

export const BODEGA_LAYOUT: BuildingLayoutDefinition = {
  buildingId: "building/bodega",
  stages: [
    {
      stageId: "bodega/starter",
      minimumTier: 1,
      floors: [BODEGA_FLOOR_0],
    },
  ],
};

const LAYOUTS_BY_BUILDING: Record<string, BuildingLayoutDefinition> = {
  [BODEGA_LAYOUT.buildingId]: BODEGA_LAYOUT,
};

const activeStageCache = new Map<string, BuildingLayoutStage | undefined>();

function getActiveStage(
  definition: BuildingLayoutDefinition | undefined,
  buildingTier = 1,
): BuildingLayoutStage | undefined {
  if (!definition) {
    return undefined;
  }

  const cacheKey = `${definition.buildingId}:${buildingTier}`;
  if (activeStageCache.has(cacheKey)) return activeStageCache.get(cacheKey);

  const result =
    [...definition.stages]
      .sort((left, right) => left.minimumTier - right.minimumTier)
      .filter((stage) => stage.minimumTier <= buildingTier)
      .at(-1) ?? definition.stages[0];

  activeStageCache.set(cacheKey, result);
  return result;
}

export function getBuildingLayoutDefinition(
  buildingId: string,
): BuildingLayoutDefinition | undefined {
  return LAYOUTS_BY_BUILDING[buildingId];
}

export function getBuildingFloors(
  buildingId: string,
  buildingTier = 1,
): readonly BuildingFloorLayout[] {
  return getActiveStage(getBuildingLayoutDefinition(buildingId), buildingTier)?.floors ?? [];
}

export function getBuildingLayout(
  buildingId: string,
  floorIndex = 0,
  buildingTier = 1,
): BuildingFloorLayout | undefined {
  return getBuildingFloors(buildingId, buildingTier).find(
    (floor) => floor.floorIndex === floorIndex,
  );
}

export function getBuildingSlot(
  buildingId: string,
  slotId: string,
  floorIndex = 0,
  buildingTier = 1,
): BuildingRoomSlot | undefined {
  return getBuildingLayout(buildingId, floorIndex, buildingTier)?.slots.find(
    (slot) => slot.slotId === slotId,
  );
}
