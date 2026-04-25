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

export interface BuildingShellShape {
  kind: "chamfered";
  cut: number;
}

export interface BuildingShellFootprint {
  col: number;
  row: number;
  cols: number;
  rows: number;
  shape?: BuildingShellShape;
}

export interface BuildingFloorLayout {
  floorIndex: number;
  elevationBandId: string | null;
  /** Floors in the same group render together; floors in different groups swap views. */
  stackGroupId?: string;
  /** Vertical story order inside a rendered group. */
  stackLayer?: number;
  shell: BuildingShellFootprint;
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

export interface BuildingShellCell {
  col: number;
  row: number;
}

function normalizeChamferCut(shell: BuildingShellFootprint): number {
  if (shell.shape?.kind !== "chamfered") {
    return 0;
  }

  return Math.max(0, Math.trunc(shell.shape.cut));
}

export function isCellInsideBuildingShell(
  shell: BuildingShellFootprint,
  col: number,
  row: number,
): boolean {
  if (
    col < shell.col ||
    row < shell.row ||
    col >= shell.col + shell.cols ||
    row >= shell.row + shell.rows
  ) {
    return false;
  }

  const cut = normalizeChamferCut(shell);
  if (cut <= 0) {
    return true;
  }

  const localCol = col - shell.col;
  const localRow = row - shell.row;
  const maxCol = shell.cols - 1;
  const maxRow = shell.rows - 1;

  return (
    localCol + localRow >= cut &&
    maxCol - localCol + localRow >= cut &&
    localCol + (maxRow - localRow) >= cut &&
    maxCol - localCol + (maxRow - localRow) >= cut
  );
}

export function getBuildingShellCells(shell: BuildingShellFootprint): readonly BuildingShellCell[] {
  const cells: BuildingShellCell[] = [];
  for (let col = shell.col; col < shell.col + shell.cols; col++) {
    for (let row = shell.row; row < shell.row + shell.rows; row++) {
      if (isCellInsideBuildingShell(shell, col, row)) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

export function isFootprintInsideBuildingShell(
  shell: BuildingShellFootprint,
  footprint: Pick<BuildingRoomSlot, "col" | "row" | "cols" | "rows">,
): boolean {
  for (let col = footprint.col; col < footprint.col + footprint.cols; col++) {
    for (let row = footprint.row; row < footprint.row + footprint.rows; row++) {
      if (!isCellInsideBuildingShell(shell, col, row)) {
        return false;
      }
    }
  }

  return true;
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

const BODEGA_ANNEX_FLOOR_0: BuildingFloorLayout = {
  ...BODEGA_FLOOR_0,
  shell: { col: 0, row: 0, cols: 12, rows: 18 },
};

const BODEGA_EXTENSION_FLOOR_0: BuildingFloorLayout = {
  ...BODEGA_FLOOR_0,
  shell: { col: 0, row: -2, cols: 12, rows: 20 },
};

export const BODEGA_LAYOUT: BuildingLayoutDefinition = {
  buildingId: "building/bodega",
  stages: [
    {
      stageId: "bodega/starter",
      minimumTier: 1,
      floors: [BODEGA_FLOOR_0],
    },
    {
      stageId: "bodega/annex",
      minimumTier: 3,
      floors: [BODEGA_ANNEX_FLOOR_0],
    },
    {
      stageId: "bodega/extension",
      minimumTier: 4,
      floors: [BODEGA_EXTENSION_FLOOR_0],
    },
  ],
};

// ── Porter's layouts ────────────────────────────────────────────────────

const PORTERS_GROUND: BuildingFloorLayout = {
  floorIndex: 0,
  elevationBandId: "ground-floor",
  stackGroupId: "main-interior",
  stackLayer: 0,
  shell: { col: 0, row: 0, cols: 12, rows: 18 },
  slots: [
    {
      slotId: "slot/floor",
      col: 1,
      row: 8,
      cols: 10,
      rows: 10,
      startingTemplateId: "room/floor:tier_1",
    },
    {
      slotId: "slot/bar",
      col: 1,
      row: 1,
      cols: 10,
      rows: 6,
      startingTemplateId: "room/bar:tier_1",
    },
  ],
};

const PORTERS_UPPER: BuildingFloorLayout = {
  floorIndex: 1,
  elevationBandId: "upper-floor",
  stackGroupId: "main-interior",
  stackLayer: 1,
  shell: { col: 0, row: 0, cols: 12, rows: 18 },
  slots: [
    {
      slotId: "slot/office",
      col: 0,
      row: 12,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/office:tier_1",
    },
    {
      slotId: "slot/stockroom",
      col: 6,
      row: 12,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/stockroom:tier_1",
    },
    {
      slotId: "slot/infirmary",
      col: 0,
      row: 8,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/infirmary:tier_1",
    },
    {
      slotId: "slot/gym",
      col: 6,
      row: 8,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/gym:tier_1",
    },
    {
      slotId: "slot/prep-room",
      col: 0,
      row: 4,
      cols: 4,
      rows: 3,
      startingTemplateId: "room/prep_room:tier_1",
    },
    { slotId: "slot/break-room", col: 6, row: 4, cols: 4, rows: 3 },
    { slotId: "slot/briefing-room", col: 0, row: 0, cols: 4, rows: 3 },
  ],
};

const PORTERS_WATERFRONT: BuildingFloorLayout = {
  floorIndex: 2,
  elevationBandId: "waterfront",
  stackGroupId: "waterfront",
  stackLayer: 0,
  shell: { col: 0, row: 0, cols: 12, rows: 8 },
  slots: [
    { slotId: "slot/dock", col: 0, row: 0, cols: 6, rows: 4 },
    { slotId: "slot/deck", col: 6, row: 0, cols: 6, rows: 4 },
  ],
};

const PORTERS_WATERFRONT_MACHINE_SHOP: BuildingFloorLayout = {
  ...PORTERS_WATERFRONT,
  shell: { col: 0, row: 0, cols: 12, rows: 12 },
  slots: [
    ...PORTERS_WATERFRONT.slots,
    { slotId: "slot/workshop", col: 0, row: 4, cols: 12, rows: 4 },
  ],
};

export const PORTERS_LAYOUT: BuildingLayoutDefinition = {
  buildingId: "building/porters",
  stages: [
    {
      stageId: "porters/starter",
      minimumTier: 1,
      floors: [PORTERS_GROUND, PORTERS_UPPER],
    },
    {
      stageId: "porters/upstairs-conversion",
      minimumTier: 3,
      floors: [PORTERS_GROUND, PORTERS_UPPER],
    },
    {
      stageId: "porters/waterfront",
      minimumTier: 5,
      floors: [PORTERS_GROUND, PORTERS_UPPER, PORTERS_WATERFRONT],
    },
    {
      stageId: "porters/machine-shop",
      minimumTier: 6,
      floors: [PORTERS_GROUND, PORTERS_UPPER, PORTERS_WATERFRONT_MACHINE_SHOP],
    },
  ],
};

// ── Skyscraper layouts ──────────────────────────────────────────────────
//
// The skyscraper starts as a bounded owned stack of five floors. Each floor
// has its own identity (public lobby, operations, recovery/training,
// logistics, rooftop) so the move out of Porter's reads as the guild becoming
// an institution — not as a Porter's with a taller roof.

const SKYSCRAPER_SHELL: BuildingShellFootprint = {
  col: 0,
  row: 0,
  cols: 20,
  rows: 20,
};

const SKYSCRAPER_LOBBY: BuildingFloorLayout = {
  floorIndex: 0,
  elevationBandId: "ground-floor",
  stackGroupId: "tower-core",
  stackLayer: 0,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/lobby",
      col: 4,
      row: 6,
      cols: 12,
      rows: 8,
      startingTemplateId: "room/lobby:tier_1",
    },
    {
      slotId: "slot/reception",
      col: 16,
      row: 7,
      cols: 4,
      rows: 5,
      startingTemplateId: "room/reception:tier_1",
    },
  ],
};

const SKYSCRAPER_OPERATIONS: BuildingFloorLayout = {
  floorIndex: 1,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 1,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/bullpen",
      col: 2,
      row: 6,
      cols: 13,
      rows: 8,
      startingTemplateId: "room/bullpen:tier_1",
    },
    {
      slotId: "slot/situation-room",
      col: 15,
      row: 7,
      cols: 5,
      rows: 6,
      startingTemplateId: "room/situation_room:tier_1",
    },
  ],
};

const SKYSCRAPER_RECOVERY: BuildingFloorLayout = {
  floorIndex: 2,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 2,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/clinic",
      col: 1,
      row: 6,
      cols: 6,
      rows: 8,
      startingTemplateId: "room/clinic:tier_1",
    },
    {
      slotId: "slot/dojo",
      col: 7,
      row: 6,
      cols: 6,
      rows: 8,
      startingTemplateId: "room/dojo:tier_1",
    },
    {
      slotId: "slot/lounge",
      col: 15,
      row: 7,
      cols: 4,
      rows: 6,
      startingTemplateId: "room/crew_lounge:tier_1",
    },
  ],
};

const SKYSCRAPER_LOGISTICS: BuildingFloorLayout = {
  floorIndex: 3,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 3,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/supply-hall",
      col: 3,
      row: 6,
      cols: 8,
      rows: 8,
      startingTemplateId: "room/supply_hall:tier_1",
    },
    {
      slotId: "slot/fabrication-bay",
      col: 12,
      row: 6,
      cols: 7,
      rows: 8,
      startingTemplateId: "room/fabrication_bay:tier_1",
    },
  ],
};

const SKYSCRAPER_ROOFTOP: BuildingFloorLayout = {
  floorIndex: 4,
  elevationBandId: "rooftop",
  stackGroupId: "rooftop",
  stackLayer: 0,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/helipad",
      col: 2,
      row: 6,
      cols: 9,
      rows: 8,
      startingTemplateId: "room/rooftop_helipad:tier_1",
    },
    {
      slotId: "slot/sky-garden",
      col: 12,
      row: 6,
      cols: 7,
      rows: 8,
      startingTemplateId: "room/sky_garden:tier_1",
    },
  ],
};

// ── Skyscraper expansion floors ─────────────────────────────────────────
//
// Acquired via the four building upgrades. Each floor slots into the
// `tower-core` stack between Logistics (stackLayer 3) and the Rooftop (its
// own stack group). The narrative order from low to high is:
//   Nightlife → Specialist Training → Executive → Penthouse.

const SKYSCRAPER_NIGHTLIFE: BuildingFloorLayout = {
  floorIndex: 5,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 4,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/club",
      col: 2,
      row: 6,
      cols: 13,
      rows: 8,
      startingTemplateId: "room/club:tier_1",
    },
    {
      slotId: "slot/green-room",
      col: 15,
      row: 7,
      cols: 5,
      rows: 6,
      startingTemplateId: "room/green_room:tier_1",
    },
  ],
};

const SKYSCRAPER_SPECIALIST_TRAINING: BuildingFloorLayout = {
  floorIndex: 6,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 5,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/drill-floor",
      col: 1,
      row: 6,
      cols: 6,
      rows: 8,
      startingTemplateId: "room/drill_floor:tier_1",
    },
    {
      slotId: "slot/recon-course",
      col: 8,
      row: 6,
      cols: 5,
      rows: 8,
      startingTemplateId: "room/recon_course:tier_1",
    },
    {
      slotId: "slot/trauma-bay",
      col: 14,
      row: 6,
      cols: 5,
      rows: 8,
      startingTemplateId: "room/trauma_bay:tier_1",
    },
  ],
};

const SKYSCRAPER_EXECUTIVE: BuildingFloorLayout = {
  floorIndex: 7,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 6,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/executive-office",
      col: 1,
      row: 6,
      cols: 6,
      rows: 8,
      startingTemplateId: "room/executive_office:tier_1",
    },
    {
      slotId: "slot/compliance-office",
      col: 8,
      row: 7,
      cols: 4,
      rows: 6,
      startingTemplateId: "room/compliance_office:tier_1",
    },
    {
      slotId: "slot/war-room",
      col: 13,
      row: 6,
      cols: 6,
      rows: 8,
      startingTemplateId: "room/war_room:tier_1",
    },
  ],
};

const SKYSCRAPER_PENTHOUSE: BuildingFloorLayout = {
  floorIndex: 8,
  elevationBandId: "mid-tower",
  stackGroupId: "tower-core",
  stackLayer: 7,
  shell: SKYSCRAPER_SHELL,
  slots: [
    {
      slotId: "slot/sky-lounge",
      col: 2,
      row: 6,
      cols: 13,
      rows: 8,
      startingTemplateId: "room/sky_lounge:tier_1",
    },
    {
      slotId: "slot/private-cellar",
      col: 15,
      row: 7,
      cols: 5,
      rows: 6,
      startingTemplateId: "room/private_cellar:tier_1",
    },
  ],
};

export const SKYSCRAPER_LAYOUT: BuildingLayoutDefinition = {
  buildingId: "building/skyscraper",
  stages: [
    {
      stageId: "skyscraper/baseline",
      minimumTier: 1,
      floors: [
        SKYSCRAPER_LOBBY,
        SKYSCRAPER_OPERATIONS,
        SKYSCRAPER_RECOVERY,
        SKYSCRAPER_LOGISTICS,
        SKYSCRAPER_ROOFTOP,
      ],
    },
    {
      stageId: "skyscraper/nightlife",
      minimumTier: 2,
      floors: [
        SKYSCRAPER_LOBBY,
        SKYSCRAPER_OPERATIONS,
        SKYSCRAPER_RECOVERY,
        SKYSCRAPER_LOGISTICS,
        SKYSCRAPER_NIGHTLIFE,
        SKYSCRAPER_ROOFTOP,
      ],
    },
    {
      stageId: "skyscraper/specialist-training",
      minimumTier: 3,
      floors: [
        SKYSCRAPER_LOBBY,
        SKYSCRAPER_OPERATIONS,
        SKYSCRAPER_RECOVERY,
        SKYSCRAPER_LOGISTICS,
        SKYSCRAPER_NIGHTLIFE,
        SKYSCRAPER_SPECIALIST_TRAINING,
        SKYSCRAPER_ROOFTOP,
      ],
    },
    {
      stageId: "skyscraper/executive",
      minimumTier: 4,
      floors: [
        SKYSCRAPER_LOBBY,
        SKYSCRAPER_OPERATIONS,
        SKYSCRAPER_RECOVERY,
        SKYSCRAPER_LOGISTICS,
        SKYSCRAPER_NIGHTLIFE,
        SKYSCRAPER_SPECIALIST_TRAINING,
        SKYSCRAPER_EXECUTIVE,
        SKYSCRAPER_ROOFTOP,
      ],
    },
    {
      stageId: "skyscraper/penthouse",
      minimumTier: 5,
      floors: [
        SKYSCRAPER_LOBBY,
        SKYSCRAPER_OPERATIONS,
        SKYSCRAPER_RECOVERY,
        SKYSCRAPER_LOGISTICS,
        SKYSCRAPER_NIGHTLIFE,
        SKYSCRAPER_SPECIALIST_TRAINING,
        SKYSCRAPER_EXECUTIVE,
        SKYSCRAPER_PENTHOUSE,
        SKYSCRAPER_ROOFTOP,
      ],
    },
  ],
};

const LAYOUTS_BY_BUILDING: Record<string, BuildingLayoutDefinition> = {
  [BODEGA_LAYOUT.buildingId]: BODEGA_LAYOUT,
  [PORTERS_LAYOUT.buildingId]: PORTERS_LAYOUT,
  [SKYSCRAPER_LAYOUT.buildingId]: SKYSCRAPER_LAYOUT,
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

function getFloorRenderGroupId(floor: BuildingFloorLayout): string {
  return floor.stackGroupId ?? `floor:${floor.floorIndex}`;
}

export function getFloorStackLayer(floor: BuildingFloorLayout): number {
  return floor.stackLayer ?? floor.floorIndex;
}

export function getVisibleBuildingFloors(
  buildingId: string,
  activeFloorIndex = 0,
  buildingTier = 1,
): readonly BuildingFloorLayout[] {
  const floors = getBuildingFloors(buildingId, buildingTier);
  const activeFloor = floors.find((floor) => floor.floorIndex === activeFloorIndex) ?? floors[0];

  if (!activeFloor) {
    return [];
  }

  if (buildingId === "building/skyscraper") {
    return [activeFloor];
  }

  const activeGroupId = getFloorRenderGroupId(activeFloor);
  return floors
    .filter((floor) => getFloorRenderGroupId(floor) === activeGroupId)
    .slice()
    .sort((left, right) => {
      const leftLayer = getFloorStackLayer(left);
      const rightLayer = getFloorStackLayer(right);
      return leftLayer - rightLayer || left.floorIndex - right.floorIndex;
    });
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
