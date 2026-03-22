import { buildNavigationGraph } from "sim/navigation";

import { createDefaultEffects } from "./world-effects";
import type {
  ActorMarker,
  HqFloorTile,
  HqFootprint,
  HqModularGeometry,
  HqPerimeterTile,
  HqPoint,
  HqRoomNode,
  HqSpritePlacement,
  HqWallSegment,
  HqWallSide,
  HqWorldLayout,
  HqWorldSnapshot,
  NavigationGraph,
} from "./types";

// ── Grid constants ────────────────────────────────────────────────────────

const HQ_TILE_WIDTH = 96;
const HQ_TILE_HEIGHT = 48;
const HQ_WALL_HEIGHT = 84;
const WORLD_MARGIN_X = 100;
const WORLD_MARGIN_Y = 80;
const ASSET_ROOT = "/data/svg-environments/hq/bodega/parts";

// ── Prop / scenery asset URLs ─────────────────────────────────────────────

const PROP_ASSETS = {
  // Furniture
  desk: `${ASSET_ROOT}/props/iso-desk-reception.svg`,
  chair: `${ASSET_ROOT}/props/iso-chair-office.svg`,
  cabinet: `${ASSET_ROOT}/props/iso-cabinet-filing.svg`,
  table: `${ASSET_ROOT}/props/iso-table-folding.svg`,
  couch: `${ASSET_ROOT}/props/iso-couch-worn.svg`,
  stool: `${ASSET_ROOT}/props/iso-stool-bar.svg`,
  counter: `${ASSET_ROOT}/props/iso-counter-reception.svg`,
  // Medical
  bed: `${ASSET_ROOT}/props/iso-bed-medical.svg`,
  medCabinet: `${ASSET_ROOT}/props/iso-cabinet-medical.svg`,
  ivStand: `${ASSET_ROOT}/props/iso-iv-stand.svg`,
  curtain: `${ASSET_ROOT}/props/iso-curtain-medical.svg`,
  trayMedical: `${ASSET_ROOT}/props/iso-tray-medical.svg`,
  bandages: `${ASSET_ROOT}/props/iso-bandages-box.svg`,
  // Wall-mounted
  sign: `${ASSET_ROOT}/props/iso-sign-neon.svg`,
  light: `${ASSET_ROOT}/props/iso-light-pendant.svg`,
  shelf: `${ASSET_ROOT}/props/iso-shelf-wall.svg`,
  corkboard: `${ASSET_ROOT}/props/iso-board-cork.svg`,
  clock: `${ASSET_ROOT}/props/iso-clock-wall.svg`,
  phone: `${ASSET_ROOT}/props/iso-phone-wall.svg`,
  poster: `${ASSET_ROOT}/props/iso-poster-wanted.svg`,
  monitor: `${ASSET_ROOT}/props/iso-screen-monitor.svg`,
  // Floor items
  plant: `${ASSET_ROOT}/props/iso-plant-potted.svg`,
  mat: `${ASSET_ROOT}/props/iso-mat-floor.svg`,
  rug: `${ASSET_ROOT}/props/iso-rug-floor.svg`,
  box: `${ASSET_ROOT}/props/iso-box-cardboard.svg`,
  bucket: `${ASSET_ROOT}/props/iso-bucket.svg`,
  radio: `${ASSET_ROOT}/props/iso-radio-boombox.svg`,
  waterCooler: `${ASSET_ROOT}/props/iso-cooler-water.svg`,
  clipboard: `${ASSET_ROOT}/props/iso-clipboard-stack.svg`,
  bottles: `${ASSET_ROOT}/props/iso-bottles-shelf.svg`,
  register: `${ASSET_ROOT}/props/iso-register-cash.svg`,
  punchBag: `${ASSET_ROOT}/props/iso-bag-punching.svg`,
  // Scenery (exterior)
  awning: `${ASSET_ROOT}/background/iso-bg-awning.svg`,
  hydrant: `${ASSET_ROOT}/background/iso-bg-hydrant.svg`,
  lamp: `${ASSET_ROOT}/background/iso-bg-lamppost.svg`,
  dumpster: `${ASSET_ROOT}/background/iso-bg-dumpster.svg`,
  trash: `${ASSET_ROOT}/background/iso-bg-trash-bags.svg`,
  steam: `${ASSET_ROOT}/background/iso-bg-steam-vent.svg`,
  tree: `${ASSET_ROOT}/background/iso-bg-tree-street.svg`,
  mailbox: `${ASSET_ROOT}/background/iso-bg-mailbox.svg`,
  manhole: `${ASSET_ROOT}/background/iso-bg-manhole.svg`,
  cone: `${ASSET_ROOT}/background/iso-bg-cone-traffic.svg`,
  bench: `${ASSET_ROOT}/background/iso-bg-bench.svg`,
} as const;

// ── Room recipe system ────────────────────────────────────────────────────

interface RoomPalette {
  floor: string;
  wallLeft: string;
  wallRight: string;
}

interface RecipePropPlacement {
  assetKey: keyof typeof PROP_ASSETS;
  relCol: number;
  relRow: number;
  width: number;
  height: number;
  zIndex: number;
  offsetX?: number;
  offsetY?: number;
}

interface RoomRecipe {
  palette: RoomPalette;
  inactivePalette: RoomPalette;
  openings: readonly { side: HqWallSide; cellOffset: number }[];
  props: readonly RecipePropPlacement[];
}

const INACTIVE_PALETTE: RoomPalette = {
  floor: "#24262e",
  wallLeft: "#1e2028",
  wallRight: "#22242c",
};

// ── OPERATIONS (Front Desk) ──────────────────────────────────────────────
// Bodega counter / reception. Counter is the hero dividing customer from clerk.
// Shelf and product stock behind counter. Stool for the clerk.
// ViewBoxes are tight — width/height = actual rendered size.
const OPERATIONS_RECIPE: RoomRecipe = {
  palette: { floor: "#3c2a16", wallLeft: "#2c2014", wallRight: "#352616" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Long reception counter spanning room center (2:1 iso-aligned)
    { assetKey: "counter", relCol: 0.5, relRow: 0.65, width: 120, height: 83, zIndex: 40 },
    // Cash register on counter area
    { assetKey: "register", relCol: 0.4, relRow: 0.55, width: 44, height: 38, zIndex: 42 },
    // Clerk stool behind counter
    { assetKey: "stool", relCol: 0.6, relRow: 0.3, width: 20, height: 50, zIndex: 36 },
    // Shelf unit against back wall (product stock)
    { assetKey: "shelf", relCol: 0.75, relRow: 0.2, width: 56, height: 74, zIndex: 34 },
    // Bottles rack near shelf
    { assetKey: "bottles", relCol: 0.45, relRow: 0.2, width: 52, height: 62, zIndex: 34 },
    // Cardboard box near entrance
    { assetKey: "box", relCol: 0.2, relRow: 0.65, width: 34, height: 46, zIndex: 35 },
    // Radio on the floor
    { assetKey: "radio", relCol: 0.82, relRow: 0.5, width: 40, height: 28, zIndex: 36 },
    // Floor rug at entrance
    { assetKey: "rug", relCol: 0.3, relRow: 0.85, width: 72, height: 36, zIndex: 28 },
  ],
};

// ── RECOVERY (Infirmary) ─────────────────────────────────────────────────
// Makeshift medical bay. Cot is the hero — white sheets pop against dark room.
// IV stand at bed head, medical cabinet against wall, tray table beside bed.
const RECOVERY_RECIPE: RoomRecipe = {
  palette: { floor: "#263146", wallLeft: "#20283a", wallRight: "#24304a" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Medical cot (white sheets stand out)
    { assetKey: "bed", relCol: 0.55, relRow: 0.5, width: 108, height: 86, zIndex: 36 },
    // IV drip stand near head of bed
    { assetKey: "ivStand", relCol: 0.3, relRow: 0.3, width: 26, height: 78, zIndex: 37 },
    // Medical supply cabinet against back wall
    { assetKey: "medCabinet", relCol: 0.2, relRow: 0.2, width: 52, height: 68, zIndex: 34 },
    // Tray table beside bed
    { assetKey: "trayMedical", relCol: 0.6, relRow: 0.8, width: 40, height: 46, zIndex: 40 },
    // Bandage box on floor
    { assetKey: "bandages", relCol: 0.3, relRow: 0.65, width: 30, height: 24, zIndex: 34 },
    // Bucket
    { assetKey: "bucket", relCol: 0.8, relRow: 0.7, width: 28, height: 32, zIndex: 35 },
    // Floor mat beside cot
    { assetKey: "mat", relCol: 0.5, relRow: 0.85, width: 72, height: 44, zIndex: 28 },
  ],
};

// ── STAFFING (Recruitment Space) ─────────────────────────────────────────
// Interview room. Table + two chairs facing each other is the story.
// Filing cabinet and water cooler in corners. Spartan back-office feel.
const STAFFING_RECIPE: RoomRecipe = {
  palette: { floor: "#2c3024", wallLeft: "#222820", wallRight: "#282e22" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Interview table centered
    { assetKey: "table", relCol: 0.5, relRow: 0.55, width: 92, height: 84, zIndex: 38 },
    // Chair — interviewer side (behind table)
    { assetKey: "chair", relCol: 0.5, relRow: 0.3, width: 42, height: 54, zIndex: 36 },
    // Chair — candidate side (in front of table)
    { assetKey: "chair", relCol: 0.5, relRow: 0.8, width: 42, height: 54, zIndex: 42 },
    // Clipboard on table area
    { assetKey: "clipboard", relCol: 0.5, relRow: 0.5, width: 28, height: 24, zIndex: 39 },
    // Water cooler in back corner
    { assetKey: "waterCooler", relCol: 0.8, relRow: 0.2, width: 34, height: 56, zIndex: 35 },
    // Filing cabinet in other corner
    { assetKey: "cabinet", relCol: 0.2, relRow: 0.3, width: 48, height: 66, zIndex: 34 },
    // Plant near entrance
    { assetKey: "plant", relCol: 0.75, relRow: 0.8, width: 36, height: 58, zIndex: 41 },
    // Box of files on floor
    { assetKey: "box", relCol: 0.25, relRow: 0.7, width: 28, height: 38, zIndex: 34 },
  ],
};

// ── SOCIAL (Break Room) ──────────────────────────────────────────────────
// Couch + coffee table seating area. Worn, lived-in feel.
const SOCIAL_RECIPE: RoomRecipe = {
  palette: { floor: "#342820", wallLeft: "#2a2018", wallRight: "#30261e" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Worn couch
    { assetKey: "couch", relCol: 0.5, relRow: 0.4, width: 90, height: 66, zIndex: 36 },
    // Coffee table in front of couch
    { assetKey: "table", relCol: 0.5, relRow: 0.7, width: 70, height: 64, zIndex: 40 },
    // Rug under seating area
    { assetKey: "rug", relCol: 0.5, relRow: 0.6, width: 72, height: 36, zIndex: 28 },
    // Plant in corner
    { assetKey: "plant", relCol: 0.2, relRow: 0.3, width: 36, height: 58, zIndex: 34 },
    // Radio on floor
    { assetKey: "radio", relCol: 0.8, relRow: 0.3, width: 40, height: 28, zIndex: 35 },
    // Box of snacks
    { assetKey: "box", relCol: 0.8, relRow: 0.65, width: 28, height: 38, zIndex: 35 },
  ],
};

// ── TRAINING (Gym / Training Area) ───────────────────────────────────────
// Punching bag center, mats on floor, equipment to sides.
const TRAINING_RECIPE: RoomRecipe = {
  palette: { floor: "#282a30", wallLeft: "#20222a", wallRight: "#24262e" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Punching bag (tall, narrow)
    { assetKey: "punchBag", relCol: 0.5, relRow: 0.4, width: 28, height: 68, zIndex: 38 },
    // Floor mats
    { assetKey: "mat", relCol: 0.45, relRow: 0.7, width: 72, height: 44, zIndex: 28 },
    { assetKey: "mat", relCol: 0.6, relRow: 0.85, width: 62, height: 38, zIndex: 29 },
    // Equipment cabinet
    { assetKey: "cabinet", relCol: 0.8, relRow: 0.25, width: 44, height: 60, zIndex: 34 },
    // Water cooler
    { assetKey: "waterCooler", relCol: 0.2, relRow: 0.55, width: 30, height: 48, zIndex: 36 },
    // Bucket
    { assetKey: "bucket", relCol: 0.8, relRow: 0.7, width: 24, height: 28, zIndex: 35 },
  ],
};

// Default: generic storage room
const DEFAULT_RECIPE: RoomRecipe = {
  palette: { floor: "#2f2b24", wallLeft: "#26231d", wallRight: "#2c2921" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "box", relCol: 0.35, relRow: 0.45, width: 34, height: 46, zIndex: 36 },
    { assetKey: "box", relCol: 0.55, relRow: 0.65, width: 30, height: 40, zIndex: 37 },
    { assetKey: "cabinet", relCol: 0.75, relRow: 0.3, width: 48, height: 66, zIndex: 34 },
  ],
};

const ROOM_RECIPES: Record<string, RoomRecipe> = {
  "room:operations": OPERATIONS_RECIPE,
  "room:recovery": RECOVERY_RECIPE,
  "room:social": SOCIAL_RECIPE,
  "room:staffing": STAFFING_RECIPE,
  "room:training": TRAINING_RECIPE,
};

function getRecipe(functionTag: string): RoomRecipe {
  return ROOM_RECIPES[functionTag] ?? DEFAULT_RECIPE;
}

// ── Seed type ─────────────────────────────────────────────────────────────

interface HqRoomSeed {
  id: string;
  templateId: string;
  name: string;
  tier: number;
  isOperational: boolean;
  functionTag: string;
  footprint: HqFootprint;
}

// ── Geometry output ───────────────────────────────────────────────────────

interface HqWorldGeometry {
  layout: HqWorldLayout;
  rooms: readonly HqRoomNode[];
  modular: HqModularGeometry;
  roomProps: readonly HqSpritePlacement[];
  scenery: readonly HqSpritePlacement[];
  navGraph: NavigationGraph;
}

// ── Isometric projection ──────────────────────────────────────────────────

export function projectIso(col: number, row: number, originX: number, originY: number): HqPoint {
  return {
    x: originX + (col - row) * (HQ_TILE_WIDTH / 2),
    y: originY + (col + row) * (HQ_TILE_HEIGHT / 2),
  };
}

function shiftPoints(points: readonly HqPoint[], dx: number, dy: number): HqPoint[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

function projectDoorCenter(
  footprint: HqFootprint,
  opening: { side: HqWallSide; cellOffset: number },
  originX: number,
  originY: number,
): HqPoint {
  if (opening.side === "left") {
    const start = projectIso(footprint.col, footprint.row + opening.cellOffset, originX, originY);
    const end = projectIso(footprint.col, footprint.row + opening.cellOffset + 1, originX, originY);
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  }

  const start = projectIso(footprint.col + opening.cellOffset, footprint.row, originX, originY);
  const end = projectIso(footprint.col + opening.cellOffset + 1, footprint.row, originX, originY);
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

// ── Room node (hit-test geometry) ─────────────────────────────────────────

function createRoomNode(seed: HqRoomSeed, originX: number, originY: number): HqRoomNode {
  const fp = seed.footprint;
  const top = projectIso(fp.col, fp.row, originX, originY);
  const right = projectIso(fp.col + fp.cols, fp.row, originX, originY);
  const bottom = projectIso(fp.col + fp.cols, fp.row + fp.rows, originX, originY);
  const left = projectIso(fp.col, fp.row + fp.rows, originX, originY);
  const topLift = { x: top.x, y: top.y - HQ_WALL_HEIGHT };
  const leftLift = { x: left.x, y: left.y - HQ_WALL_HEIGHT };
  const rightLift = { x: right.x, y: right.y - HQ_WALL_HEIGHT };

  const floorPoints = [top, right, bottom, left];
  const leftWallPoints = [top, left, leftLift, topLift];
  const rightWallPoints = [top, right, rightLift, topLift];
  const allPoints = [...floorPoints, ...leftWallPoints, ...rightWallPoints];
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);

  return {
    id: seed.id,
    templateId: seed.templateId,
    label: seed.name,
    tier: seed.tier,
    isOperational: seed.isOperational,
    functionTag: seed.functionTag,
    footprint: fp,
    floorPoints,
    leftWallPoints,
    rightWallPoints,
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    },
  };
}

// ── Modular floor tiles ───────────────────────────────────────────────────

function buildFloorTiles(seeds: readonly HqRoomSeed[]): HqFloorTile[] {
  const tiles: HqFloorTile[] = [];
  for (const seed of seeds) {
    const recipe = getRecipe(seed.functionTag);
    const palette = seed.isOperational ? recipe.palette : recipe.inactivePalette;
    const fp = seed.footprint;
    for (let c = fp.col; c < fp.col + fp.cols; c++) {
      for (let r = fp.row; r < fp.row + fp.rows; r++) {
        tiles.push({ col: c, row: r, tint: palette.floor, roomId: seed.id });
      }
    }
  }
  return tiles;
}

// ── Modular wall segments ─────────────────────────────────────────────────

function buildWallSegments(seeds: readonly HqRoomSeed[]): HqWallSegment[] {
  const segments: HqWallSegment[] = [];
  for (const seed of seeds) {
    const recipe = getRecipe(seed.functionTag);
    const palette = seed.isOperational ? recipe.palette : recipe.inactivePalette;
    const fp = seed.footprint;

    const openingSet = new Set(recipe.openings.map((o) => `${o.side}:${o.cellOffset}`));

    // Left wall: along col = fp.col, from row fp.row to fp.row + fp.rows - 1
    for (let i = 0; i < fp.rows; i++) {
      const kind = openingSet.has(`left:${i}`) ? ("opening" as const) : ("solid" as const);
      segments.push({
        col: fp.col,
        row: fp.row + i,
        side: "left",
        kind,
        tint: palette.wallLeft,
        roomId: seed.id,
      });
    }

    // Right wall: along row = fp.row, from col fp.col to fp.col + fp.cols - 1
    for (let j = 0; j < fp.cols; j++) {
      const kind = openingSet.has(`right:${j}`) ? ("opening" as const) : ("solid" as const);
      segments.push({
        col: fp.col + j,
        row: fp.row,
        side: "right",
        kind,
        tint: palette.wallRight,
        roomId: seed.id,
      });
    }
  }
  return segments;
}

// ── Perimeter tiles ───────────────────────────────────────────────────────

function buildPerimeterTiles(seeds: readonly HqRoomSeed[]): HqPerimeterTile[] {
  if (seeds.length === 0) return [];

  const minCol = Math.min(...seeds.map((s) => s.footprint.col));
  const maxCol = Math.max(...seeds.map((s) => s.footprint.col + s.footprint.cols));
  const minRow = Math.min(...seeds.map((s) => s.footprint.row));
  const maxRow = Math.max(...seeds.map((s) => s.footprint.row + s.footprint.rows));

  // Occupied cells set
  const occupied = new Set<string>();
  for (const seed of seeds) {
    const fp = seed.footprint;
    for (let c = fp.col; c < fp.col + fp.cols; c++) {
      for (let r = fp.row; r < fp.row + fp.rows; r++) {
        occupied.add(`${c},${r}`);
      }
    }
  }

  const tiles: HqPerimeterTile[] = [];
  // Extended padding so the tile grid covers the visible ground area.
  // The flanking "buildings" sit behind this tiled ground plane.
  const padLeft = 6;
  const padRight = 6;
  const padTop = 3;
  const padBottom = 6;

  for (let c = minCol - padLeft; c <= maxCol + padRight; c++) {
    for (let r = minRow - padTop; r <= maxRow + padBottom; r++) {
      if (occupied.has(`${c},${r}`)) continue;

      let kind: HqPerimeterTile["kind"];
      if (r < minRow) {
        // Behind the building — alley/void
        kind = "alley";
      } else if (r >= maxRow && r < maxRow + 2) {
        kind = "sidewalk";
      } else if (r >= maxRow + 2) {
        kind = "street";
      } else if (c < minCol || c >= maxCol) {
        kind = "alley";
      } else {
        kind = "void";
      }

      tiles.push({ col: c, row: r, kind });
    }
  }

  return tiles;
}

// ── Prop placement (recipe-driven) ────────────────────────────────────────

function placeFloorSprite(
  id: string,
  assetUrl: string,
  col: number,
  row: number,
  width: number,
  height: number,
  zIndex: number,
  originX: number,
  originY: number,
  offsetX = 0,
  offsetY = 0,
): HqSpritePlacement {
  const anchor = projectIso(col, row, originX, originY);
  return {
    id,
    assetUrl,
    x: anchor.x - width / 2 + offsetX,
    y: anchor.y - height + offsetY,
    width,
    height,
    zIndex,
    opacity: 1,
  };
}

function buildRoomProps(
  rooms: readonly HqRoomSeed[],
  originX: number,
  originY: number,
): HqSpritePlacement[] {
  const props: HqSpritePlacement[] = [];

  for (const room of rooms) {
    const recipe = getRecipe(room.functionTag);
    const fp = room.footprint;

    for (const propDef of recipe.props) {
      props.push(
        placeFloorSprite(
          `${room.id}/${propDef.assetKey}`,
          PROP_ASSETS[propDef.assetKey],
          fp.col + fp.cols * propDef.relCol,
          fp.row + fp.rows * propDef.relRow,
          propDef.width,
          propDef.height,
          propDef.zIndex,
          originX,
          originY,
          propDef.offsetX ?? 0,
          propDef.offsetY ?? 0,
        ),
      );
    }
  }

  return props;
}

// ── Scenery (background SVG sprites on grid) ──────────────────────────────

function buildScenery(
  rooms: readonly HqRoomSeed[],
  originX: number,
  originY: number,
): HqSpritePlacement[] {
  const minCol = Math.min(...rooms.map((r) => r.footprint.col));
  const maxCol = Math.max(...rooms.map((r) => r.footprint.col + r.footprint.cols));
  const minRow = Math.min(...rooms.map((r) => r.footprint.row));
  const maxRow = Math.max(...rooms.map((r) => r.footprint.row + r.footprint.rows));

  return [
    // Street-level scenery
    placeFloorSprite(
      "scenery/awning",
      PROP_ASSETS.awning,
      minCol + 1.5,
      maxRow - 0.15,
      144,
      52,
      26,
      originX,
      originY,
      0,
      -72,
    ),
    placeFloorSprite(
      "scenery/hydrant",
      PROP_ASSETS.hydrant,
      minCol - 1.2,
      maxRow + 1.4,
      32,
      42,
      32,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/lamp",
      PROP_ASSETS.lamp,
      maxCol + 1.4,
      minRow + 2.6,
      36,
      150,
      10,
      originX,
      originY,
      0,
      -108,
    ),
    placeFloorSprite(
      "scenery/dumpster",
      PROP_ASSETS.dumpster,
      minCol - 1.4,
      minRow + 2,
      58,
      46,
      28,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/trash",
      PROP_ASSETS.trash,
      maxCol + 0.4,
      maxRow + 0.8,
      46,
      32,
      31,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/steam",
      PROP_ASSETS.steam,
      maxCol + 1.8,
      maxRow + 2,
      52,
      82,
      8,
      originX,
      originY,
      0,
      -24,
    ),
    // ── Trees along sidewalk (large canopy, spaced along both edges) ──
    placeFloorSprite(
      "scenery/tree-1",
      PROP_ASSETS.tree,
      minCol - 0.8,
      maxRow + 0.8,
      68,
      110,
      30,
      originX,
      originY,
      0,
      -56,
    ),
    placeFloorSprite(
      "scenery/tree-2",
      PROP_ASSETS.tree,
      minCol + 2,
      maxRow + 0.6,
      72,
      116,
      30,
      originX,
      originY,
      0,
      -60,
    ),
    placeFloorSprite(
      "scenery/tree-3",
      PROP_ASSETS.tree,
      minCol + 5,
      maxRow + 0.8,
      64,
      104,
      30,
      originX,
      originY,
      0,
      -52,
    ),
    placeFloorSprite(
      "scenery/tree-4",
      PROP_ASSETS.tree,
      maxCol + 1.4,
      minRow + 0.6,
      70,
      112,
      30,
      originX,
      originY,
      0,
      -58,
    ),
    placeFloorSprite(
      "scenery/tree-5",
      PROP_ASSETS.tree,
      maxCol + 0.4,
      minRow + 3.2,
      60,
      98,
      30,
      originX,
      originY,
      0,
      -48,
    ),
    placeFloorSprite(
      "scenery/tree-6",
      PROP_ASSETS.tree,
      minCol - 2,
      minRow + 1.5,
      66,
      106,
      30,
      originX,
      originY,
      0,
      -54,
    ),
    // ── Sidewalk furniture ────────────────────────────────────
    placeFloorSprite(
      "scenery/bench",
      PROP_ASSETS.bench,
      minCol + 1,
      maxRow + 1.2,
      58,
      48,
      31,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/mailbox",
      PROP_ASSETS.mailbox,
      maxCol + 0.8,
      minRow + 1.2,
      28,
      40,
      31,
      originX,
      originY,
      0,
      -10,
    ),
    // ── Street details ────────────────────────────────────────
    placeFloorSprite(
      "scenery/manhole",
      PROP_ASSETS.manhole,
      minCol + 0.5,
      maxRow + 3,
      38,
      22,
      7,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/cone-1",
      PROP_ASSETS.cone,
      maxCol + 2.5,
      maxRow + 1.5,
      18,
      24,
      31,
      originX,
      originY,
    ),
    placeFloorSprite(
      "scenery/cone-2",
      PROP_ASSETS.cone,
      maxCol + 3,
      maxRow + 1.8,
      16,
      22,
      31,
      originX,
      originY,
    ),
  ];
}

// ── Geometry shift helpers ────────────────────────────────────────────────

function shiftSprite(sprite: HqSpritePlacement, dx: number, dy: number): HqSpritePlacement {
  return { ...sprite, x: sprite.x + dx, y: sprite.y + dy };
}

function shiftRoom(room: HqRoomNode, dx: number, dy: number): HqRoomNode {
  return {
    ...room,
    floorPoints: shiftPoints(room.floorPoints, dx, dy),
    leftWallPoints: shiftPoints(room.leftWallPoints, dx, dy),
    rightWallPoints: shiftPoints(room.rightWallPoints, dx, dy),
    bounds: {
      x: room.bounds.x + dx,
      y: room.bounds.y + dy,
      width: room.bounds.width,
      height: room.bounds.height,
    },
  };
}

// ── World bounds ──────────────────────────────────────────────────────────

function computeWorldBounds(
  rooms: readonly HqRoomNode[],
  roomProps: readonly HqSpritePlacement[],
  scenery: readonly HqSpritePlacement[],
  perimeterTiles: readonly HqPerimeterTile[],
  originX: number,
  originY: number,
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const absorbPoint = (p: HqPoint) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };

  const absorbSprite = (s: HqSpritePlacement) => {
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  };

  rooms.forEach((room) => {
    room.floorPoints.forEach(absorbPoint);
    room.leftWallPoints.forEach(absorbPoint);
    room.rightWallPoints.forEach(absorbPoint);
  });
  roomProps.forEach(absorbSprite);
  scenery.forEach(absorbSprite);

  // Include perimeter tile positions in bounds
  for (const tile of perimeterTiles) {
    const center = projectIso(tile.col, tile.row, originX, originY);
    absorbPoint({ x: center.x - HQ_TILE_WIDTH / 2, y: center.y - HQ_TILE_HEIGHT / 2 });
    absorbPoint({ x: center.x + HQ_TILE_WIDTH / 2, y: center.y + HQ_TILE_HEIGHT / 2 });
  }

  return { minX, minY, maxX, maxY };
}

// ── Main composition ──────────────────────────────────────────────────────

export function composeHqWorldGeometry(rooms: readonly HqRoomSeed[]): HqWorldGeometry {
  if (rooms.length === 0) {
    const layout: HqWorldLayout = {
      tileWidth: HQ_TILE_WIDTH,
      tileHeight: HQ_TILE_HEIGHT,
      wallHeight: HQ_WALL_HEIGHT,
      originX: WORLD_MARGIN_X,
      originY: WORLD_MARGIN_Y,
      minX: 0,
      minY: 0,
      worldWidth: 800,
      worldHeight: 600,
    };

    return {
      layout,
      rooms: [],
      modular: { floorTiles: [], wallSegments: [], perimeterTiles: [] },
      roomProps: [],
      scenery: [],
      navGraph: { anchors: [], connectors: [] },
    };
  }

  const maxRow = Math.max(...rooms.map((r) => r.footprint.row + r.footprint.rows));
  const originX = (maxRow + 6) * (HQ_TILE_WIDTH / 2);
  const originY = 180;

  // Build modular geometry
  const floorTiles = buildFloorTiles(rooms);
  const wallSegments = buildWallSegments(rooms);
  const perimeterTiles = buildPerimeterTiles(rooms);

  // Build room nodes (for hit-testing), props, scenery, navGraph
  const rawRooms = rooms.map((seed) => createRoomNode(seed, originX, originY));
  const roomProps = buildRoomProps(rooms, originX, originY);
  const scenery = buildScenery(rooms, originX, originY);

  const rawBounds = computeWorldBounds(
    rawRooms,
    roomProps,
    scenery,
    perimeterTiles,
    originX,
    originY,
  );
  const dx = WORLD_MARGIN_X - rawBounds.minX;
  const dy = WORLD_MARGIN_Y - rawBounds.minY;

  const shiftedRooms = rawRooms.map((r) => shiftRoom(r, dx, dy));
  const shiftedProps = roomProps.map((s) => shiftSprite(s, dx, dy));
  const shiftedScenery = scenery.map((s) => shiftSprite(s, dx, dy));

  const bounds = computeWorldBounds(
    shiftedRooms,
    shiftedProps,
    shiftedScenery,
    perimeterTiles,
    originX + dx,
    originY + dy,
  );

  const navGraph = buildNavigationGraph(
    shiftedRooms.map((room) => ({
      id: room.id,
      x: room.bounds.x,
      y: room.bounds.y,
      width: room.bounds.width,
      height: room.bounds.height,
      functionTag: room.functionTag,
      ...(() => {
        const seed = rooms.find((candidate) => candidate.id === room.id);
        const opening = seed ? getRecipe(seed.functionTag).openings[0] : undefined;
        if (!seed || !opening) {
          return {};
        }

        const entry = projectDoorCenter(seed.footprint, opening, originX + dx, originY + dy);
        return {
          entryX: entry.x,
          entryY: entry.y,
        };
      })(),
    })),
  );

  const layout: HqWorldLayout = {
    tileWidth: HQ_TILE_WIDTH,
    tileHeight: HQ_TILE_HEIGHT,
    wallHeight: HQ_WALL_HEIGHT,
    originX: originX + dx,
    originY: originY + dy,
    minX: bounds.minX,
    minY: bounds.minY,
    worldWidth: bounds.maxX - bounds.minX + WORLD_MARGIN_X,
    worldHeight: bounds.maxY - bounds.minY + WORLD_MARGIN_Y,
  };

  return {
    layout,
    rooms: shiftedRooms,
    modular: { floorTiles, wallSegments, perimeterTiles },
    roomProps: shiftedProps,
    scenery: shiftedScenery,
    navGraph,
  };
}

// ── Snapshot assembly ─────────────────────────────────────────────────────

export function createHqWorldSnapshot(
  buildingName: string,
  geometry: HqWorldGeometry,
  actors: readonly ActorMarker[],
): HqWorldSnapshot {
  return {
    buildingName,
    layout: geometry.layout,
    rooms: geometry.rooms,
    modular: geometry.modular,
    roomProps: geometry.roomProps,
    scenery: geometry.scenery,
    actors,
    navGraph: geometry.navGraph,
    effects: createDefaultEffects(),
    focus: null,
  };
}
