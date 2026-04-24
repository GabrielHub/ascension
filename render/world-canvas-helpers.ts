import { worldToScreen } from "./camera";
import { projectIso } from "./hq-world";
import type {
  CameraState,
  HqBackdropSnapshot,
  HqFloorOffset,
  HqPerimeterTile,
  HqPoint,
  HqWorldSnapshot,
} from "./types";

export const HQ_DOF_NEAR_RATIO = 0.82;
export const HQ_DOF_FAR_RATIO = 0.08;
const HQ_DOF_SATURATION_FLOOR = 0.66;
const HQ_DOF_BACKDROP_ALPHA_FLOOR = 0.58;
const HQ_DOF_SCENERY_ALPHA_FLOOR = 0.8;

export const HQ_DOF_BACKDROP_ZONES = [
  "rear",
  "leftFlank",
  "rightFlank",
  "belowShell",
  "fore",
  "aboveShell",
] as const;

export type HqDofBackdropZone = (typeof HQ_DOF_BACKDROP_ZONES)[number];
export type HqDofLayerKind = "backdrop" | "scenery" | "sky" | "silhouettes" | "facades";

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
  bottom: number;
}

const DOF_MAX_BLUR_BY_LAYER: Readonly<Record<HqDofLayerKind, number>> = {
  backdrop: 20,
  scenery: 12,
  sky: 22,
  silhouettes: 18,
  facades: 16,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function sampleHqDofIntensity(screenY: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0;

  const nearY = viewportHeight * HQ_DOF_NEAR_RATIO;
  const farY = viewportHeight * HQ_DOF_FAR_RATIO;
  if (screenY >= nearY) return 0;
  if (screenY <= farY) return 1;

  return clamp01((nearY - screenY) / (nearY - farY));
}

export function projectWorldRectToScreen(
  rect: Readonly<{ x: number; y: number; width: number; height: number }>,
  camera: CameraState,
  viewW: number,
  viewH: number,
): ScreenRect {
  const { x, y } = worldToScreen(rect.x, rect.y, camera, viewW, viewH);
  const width = rect.width * camera.zoom;
  const height = rect.height * camera.zoom;
  return { x, y, width, height, bottom: y + height };
}

export function computeHqDofAppearance(
  kind: HqDofLayerKind,
  screenBottomY: number,
  viewportHeight: number,
  baseAlpha = 1,
): Readonly<{ intensity: number; blurPx: number; saturation: number; alpha: number }> {
  const intensity = sampleHqDofIntensity(screenBottomY, viewportHeight);
  const alphaFloor = kind === "scenery" ? HQ_DOF_SCENERY_ALPHA_FLOOR : HQ_DOF_BACKDROP_ALPHA_FLOOR;
  return {
    intensity,
    blurPx: DOF_MAX_BLUR_BY_LAYER[kind] * intensity,
    saturation: lerp(1, HQ_DOF_SATURATION_FLOOR, intensity),
    alpha: baseAlpha * lerp(1, alphaFloor, intensity),
  };
}

export function buildHqDofPassPlan(snapshot: HqWorldSnapshot) {
  return {
    backgroundBackdropZones: ["rear", "leftFlank", "rightFlank"] as const,
    structuralBackdropZones: ["belowShell"] as const,
    foregroundBackdropZones: ["fore", "aboveShell"] as const,
    dofScenery: snapshot.scenery.slice().sort((a, b) => a.zIndex - b.zIndex),
    crispRoomProps: snapshot.roomProps,
    crispFxOverlay: snapshot.backdrop?.zones.fxOverlay ?? [],
    actorsUseDof: false as const,
    structuralLayersUseDof: false as const,
  };
}

export function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return h;
}

/** Seeded pseudo-random for deterministic star placement. */
export function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const floorOffsetIndexCache = new WeakMap<readonly HqFloorOffset[], Map<number, HqFloorOffset>>();

function getFloorOffsetIndex(offsets: readonly HqFloorOffset[]): Map<number, HqFloorOffset> {
  let index = floorOffsetIndexCache.get(offsets);
  if (!index) {
    index = new Map(offsets.map((entry) => [entry.floorIndex, entry]));
    floorOffsetIndexCache.set(offsets, index);
  }
  return index;
}

function getFloorOffset(
  snapshot: HqWorldSnapshot,
  floorIndex: number,
): Readonly<{ x: number; y: number; stackLayer: number }> {
  const offset = getFloorOffsetIndex(snapshot.layout.floorOffsets).get(floorIndex);
  return {
    x: offset?.offsetX ?? 0,
    y: offset?.offsetY ?? 0,
    stackLayer: offset?.stackLayer ?? 0,
  };
}

export function compareFloorLayers(
  snapshot: HqWorldSnapshot,
  leftFloorIndex: number,
  rightFloorIndex: number,
): number {
  const left = getFloorOffset(snapshot, leftFloorIndex);
  const right = getFloorOffset(snapshot, rightFloorIndex);
  return left.stackLayer - right.stackLayer || leftFloorIndex - rightFloorIndex;
}

export function hqProject(
  snapshot: HqWorldSnapshot,
  col: number,
  row: number,
  floorIndex = 0,
): HqPoint {
  const offset = getFloorOffset(snapshot, floorIndex);
  return projectIso(
    col,
    row,
    snapshot.layout.originX + offset.x,
    snapshot.layout.originY + offset.y,
  );
}

export interface GridBounds {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

export interface PreparedPerimeterRenderData {
  bounds: GridBounds | null;
  sortedTiles: readonly HqPerimeterTile[];
  kindMap: ReadonlyMap<string, HqPerimeterTile["kind"]>;
  /** Center lane tiles along the row axis (main street, iso-right direction). */
  centerLaneSet: ReadonlySet<string>;
  /** Center lane tiles along the col axis (side street, iso-left direction). */
  centerLaneColSet: ReadonlySet<string>;
}

const perimeterRenderPrepCache = new WeakMap<
  readonly HqPerimeterTile[],
  PreparedPerimeterRenderData
>();

export function computeGridBounds(
  tiles: readonly { col: number; row: number }[],
): GridBounds | null {
  if (tiles.length === 0) return null;
  let minCol = tiles[0].col;
  let maxCol = tiles[0].col;
  let minRow = tiles[0].row;
  let maxRow = tiles[0].row;
  for (let i = 1; i < tiles.length; i++) {
    const t = tiles[i];
    if (t.col < minCol) minCol = t.col;
    if (t.col > maxCol) maxCol = t.col;
    if (t.row < minRow) minRow = t.row;
    if (t.row > maxRow) maxRow = t.row;
  }
  return { minCol, maxCol, minRow, maxRow };
}

export function preparePerimeterRenderData(
  tiles: readonly HqPerimeterTile[],
): PreparedPerimeterRenderData {
  const cached = perimeterRenderPrepCache.get(tiles);
  if (cached) return cached;

  const sortedTiles = tiles.slice().sort((a, b) => a.col + a.row - (b.col + b.row));
  const kindMap = new Map<string, HqPerimeterTile["kind"]>();
  for (const tile of tiles) {
    kindMap.set(`${tile.col},${tile.row}`, tile.kind);
  }

  const centerLaneSet = new Set<string>();
  const centerLaneColSet = new Set<string>();
  for (const tile of tiles) {
    if (tile.kind !== "street") continue;
    // Row-direction: count contiguous street tiles above/below
    let streetsAbove = 0;
    let streetsBelow = 0;
    for (let dr = 1; dr <= 16; dr++) {
      if (kindMap.get(`${tile.col},${tile.row - dr}`) === "street") streetsAbove++;
      else break;
    }
    for (let dr = 1; dr <= 16; dr++) {
      if (kindMap.get(`${tile.col},${tile.row + dr}`) === "street") streetsBelow++;
      else break;
    }
    const MAX_ROAD_WIDTH = 14;
    const isRowCenter =
      streetsAbove >= 2 &&
      streetsBelow >= 2 &&
      Math.abs(streetsAbove - streetsBelow) <= 1 &&
      streetsAbove + streetsBelow + 1 <= MAX_ROAD_WIDTH;

    // Col-direction: count contiguous street tiles left/right
    let streetsLeft = 0;
    let streetsRight = 0;
    for (let dc = 1; dc <= 16; dc++) {
      if (kindMap.get(`${tile.col - dc},${tile.row}`) === "street") streetsLeft++;
      else break;
    }
    for (let dc = 1; dc <= 16; dc++) {
      if (kindMap.get(`${tile.col + dc},${tile.row}`) === "street") streetsRight++;
      else break;
    }
    const isColCenter =
      streetsLeft >= 2 &&
      streetsRight >= 2 &&
      Math.abs(streetsLeft - streetsRight) <= 1 &&
      streetsLeft + streetsRight + 1 <= MAX_ROAD_WIDTH;

    // Skip intersection tiles (both directions active = no marking)
    if (isRowCenter && !isColCenter) {
      centerLaneSet.add(`${tile.col},${tile.row}`);
    } else if (isColCenter && !isRowCenter) {
      centerLaneColSet.add(`${tile.col},${tile.row}`);
    }
  }

  const prepared: PreparedPerimeterRenderData = {
    bounds: computeGridBounds(tiles),
    sortedTiles,
    kindMap,
    centerLaneSet,
    centerLaneColSet,
  };
  perimeterRenderPrepCache.set(tiles, prepared);
  return prepared;
}

export function computeBackdropZonePlacement(
  snapshot: HqWorldSnapshot,
  zone: keyof HqBackdropSnapshot["zones"],
  assetId: string,
  aspect: number,
  intrinsicHeight = 0,
  index = 0,
): Readonly<{ x: number; y: number; width: number; height: number; alpha?: number }> | null {
  const floorBounds = computeGridBounds(snapshot.modular.floorTiles);
  if (!floorBounds) return null;

  const proj = (col: number, row: number) => hqProject(snapshot, col, row);
  const bldMinCol = floorBounds.minCol;
  const bldMaxCol = floorBounds.maxCol + 1;
  const bldMinRow = floorBounds.minRow;
  const bldMaxRow = floorBounds.maxRow + 1;
  const topPt = proj(bldMinCol, bldMinRow);
  const leftPt = proj(bldMinCol, bldMaxRow);
  const rightPt = proj(bldMaxCol, bldMinRow);
  const bottomPt = proj(bldMaxCol, bldMaxRow);
  const bldW = rightPt.x - leftPt.x;
  const bldH = bottomPt.y - topPt.y;

  if (zone === "rear") {
    const width = bldW * 1.6;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: topPt.y - height - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "leftFlank") {
    const height = bldH * 1.2 + snapshot.layout.wallHeight;
    const width = height * aspect;
    return {
      x: leftPt.x - width - 20,
      y: topPt.y - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "rightFlank") {
    const height = bldH * 1.2 + snapshot.layout.wallHeight;
    const width = height * aspect;
    return {
      x: rightPt.x + 20,
      y: topPt.y - snapshot.layout.wallHeight,
      width,
      height,
    };
  }

  if (zone === "belowShell") {
    const width = bldW * 1.4;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: bottomPt.y + index * 4,
      width,
      height,
    };
  }

  if (zone === "aboveShell") {
    const width = bldW * 0.9;
    const height = width / aspect;
    return {
      x: (leftPt.x + rightPt.x) / 2 - width / 2,
      y: topPt.y - height - snapshot.layout.wallHeight * 1.2 - index * 12,
      width,
      height,
    };
  }

  if (zone === "fore") {
    const seed = idHash(assetId);
    const scale = intrinsicHeight > 100 ? 0.6 : 0.4;
    const height = bldH * scale;
    const width = height * aspect;
    const spread = bldW * 0.8;
    return {
      x: (leftPt.x + rightPt.x) / 2 - spread / 2 + seededRand(seed) * spread,
      y: bottomPt.y + 30 + seededRand(seed + 1) * 60,
      width,
      height,
    };
  }

  if (zone === "fxOverlay") {
    const seed = idHash(assetId);
    const height = bldH * 0.4;
    const width = height * aspect;
    return {
      x: leftPt.x + seededRand(seed + 3) * bldW * 0.6,
      y: bottomPt.y - height * 0.3 + seededRand(seed + 4) * 40,
      width,
      height,
      alpha: 0.5,
    };
  }

  return null;
}
