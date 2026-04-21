import {
  getFloorStackLayer,
  getVisibleBuildingFloors,
  type BuildingFloorLayout,
} from "content/building-layouts";
import {
  getHqBackdropManifest,
  getHqBackdropManifestForBuilding,
  getHqEnvironmentRenderConfig,
  getHqEnvironmentRenderConfigForBuilding,
  type HqEnvironmentAssetRoots,
} from "lib/hq-environment-manifest";
import {
  HQ_PROP_ASSET_PATHS,
  type HqFallbackPropAssetKey,
  resolveHqRoomSceneAssetUrl,
} from "lib/svg-asset-contract";
import { resolveTimeOfDayPhase } from "lib/hq-time-phase";

import { buildNavigationGraph } from "./navigation";
import { createEffectsWithOverrides } from "./world-effects";
import { getExteriorScene } from "./hq-scene-data";
import type {
  ActorMarker,
  HqBackdropSnapshot,
  HqExpansionSlotNode,
  HqFloorOffset,
  HqFloorTile,
  HqFootprint,
  HqModularGeometry,
  HqPerimeterTile,
  HqPoint,
  HqRoomNode,
  HqSpritePlacement,
  HqStaticPlacementDef,
  HqSvgPlacementMeta,
  HqWallSegment,
  HqWallSide,
  HqWorldLayout,
  HqWorldSnapshot,
  NavigationGraph,
} from "./types";

// ── Grid constants ────────────────────────────────────────────────────────

const HQ_ENVIRONMENT = getHqEnvironmentRenderConfig();
const HQ_TILE_WIDTH = HQ_ENVIRONMENT.composition.tileWidth;
const HQ_TILE_HEIGHT = HQ_ENVIRONMENT.composition.tileHeight;
const HQ_WALL_HEIGHT = HQ_ENVIRONMENT.composition.wallHeight;
const WORLD_MARGIN_X = 100;
const WORLD_MARGIN_Y = 80;
const STACKED_FLOOR_OFFSET_Y = HQ_WALL_HEIGHT + 12;

function getBuildingRenderConfig(buildingId?: string) {
  return (
    (buildingId ? getHqEnvironmentRenderConfigForBuilding(buildingId) : null) ?? HQ_ENVIRONMENT
  );
}

// ── Prop / scenery asset URLs ─────────────────────────────────────────────

const PROP_SVG_VIEWBOX = {
  bandages: [0, 0, 36, 28],
  bed: [4, 10, 88, 76],
  bench: [0, 0, 72, 58],
  bottles: [0, 0, 68, 80],
  box: [26, 26, 42, 56],
  bucket: [0, 0, 36, 40],
  cabinet: [21, 12, 58, 80],
  ceilingFan: [0, 0, 48, 20],
  chair: [28, 30, 40, 52],
  clipboard: [0, 0, 36, 30],
  clock: [0, 0, 36, 36],
  coffeeMachine: [0, 0, 48, 64],
  corkboard: [0, 0, 96, 96],
  couch: [10, 26, 76, 56],
  counter: [3, 2, 156, 108],
  curtain: [0, 0, 64, 96],
  deliCase: [0, 0, 140, 96],
  desk: [13, 28, 69, 58],
  firstAid: [0, 0, 24, 24],
  foodDebris: [0, 0, 40, 24],
  gearCrate: [0, 0, 40, 38],
  guildLicense: [0, 0, 28, 34],
  ivStand: [8, 12, 28, 84],
  light: [0, 0, 96, 96],
  mat: [6, 24, 84, 50],
  medCabinet: [18, 10, 60, 78],
  menuBoard: [0, 0, 56, 40],
  microwave: [0, 0, 44, 36],
  milkCrate: [0, 0, 32, 28],
  monitor: [0, 0, 96, 96],
  mopBroom: [0, 0, 28, 80],
  phone: [0, 0, 24, 32],
  pickledEggs: [0, 0, 24, 32],
  plant: [30, 28, 36, 58],
  poster: [0, 0, 32, 40],
  posterMotivational: [0, 0, 30, 38],
  punchBag: [32, 6, 32, 78],
  radio: [0, 0, 52, 36],
  register: [0, 0, 56, 48],
  rug: [0, 0, 96, 48],
  shelf: [0, 0, 76, 100],
  sign: [8, 20, 48, 44],
  stool: [12, 2, 24, 60],
  table: [12, 24, 72, 66],
  trayMedical: [0, 0, 48, 56],
  waterCooler: [0, 0, 44, 72],
} as const satisfies Record<HqFallbackPropAssetKey, readonly [number, number, number, number]>;

function getPropSvgMeta(assetKey: HqFallbackPropAssetKey): HqSvgPlacementMeta {
  const viewBox = PROP_SVG_VIEWBOX[assetKey];
  const [minX, minY, width, height] = viewBox;
  return {
    svgAnchorX: minX + width / 2,
    svgAnchorY: minY + height,
    viewBox,
  };
}

function derivePropSpriteScale(
  assetKey: HqFallbackPropAssetKey,
  legacyWidth: number,
  legacyHeight: number,
): number {
  const [, , viewBoxWidth, viewBoxHeight] = PROP_SVG_VIEWBOX[assetKey];
  const widthScale = legacyWidth / viewBoxWidth;
  const heightScale = legacyHeight / viewBoxHeight;

  // Geometric mean preserves approximate visual area while restoring the SVG's aspect ratio.
  return Math.sqrt(widthScale * heightScale);
}

// ── Room recipe system ────────────────────────────────────────────────────

interface RoomPalette {
  floor: string;
  wallLeft: string;
  wallRight: string;
}

interface RecipePropPlacement {
  assetKey: HqFallbackPropAssetKey;
  relCol: number;
  relRow: number;
  /** Sprite-box width used to derive svgMeta scale. */
  width: number;
  /** Sprite-box height used to derive svgMeta scale. */
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

// ── THE REGISTER (Bodega Operations) ─────────────────────────────────────
// The checkout area. Counter hero divides customer from clerk. Register, phone,
// guild license on the wall, pickled-egg jar holding down paperwork. Aina sits here.
const REGISTER_RECIPE: RoomRecipe = {
  palette: { floor: "#3c2a16", wallLeft: "#2c2014", wallRight: "#352616" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Reception counter — center, divides clerk from customer
    { assetKey: "counter", relCol: 0.5, relRow: 0.55, width: 120, height: 83, zIndex: 40 },
    // Register ON counter surface (offsetY lifts onto counter top)
    {
      assetKey: "register",
      relCol: 0.45,
      relRow: 0.5,
      width: 36,
      height: 32,
      zIndex: 42,
      offsetY: -34,
    },
    // Pickled-egg jar ON counter (right side, holding down paperwork)
    {
      assetKey: "pickledEggs",
      relCol: 0.58,
      relRow: 0.52,
      width: 14,
      height: 20,
      zIndex: 43,
      offsetY: -32,
    },
    // Stool behind counter (clerk side, back of room)
    { assetKey: "stool", relCol: 0.55, relRow: 0.28, width: 22, height: 44, zIndex: 36 },
    // Shelf against back-right wall
    { assetKey: "shelf", relCol: 0.8, relRow: 0.2, width: 52, height: 70, zIndex: 34 },
    // Guild license on left wall (offsetY places it on wall surface)
    {
      assetKey: "guildLicense",
      relCol: 0.18,
      relRow: 0.18,
      width: 18,
      height: 24,
      zIndex: 33,
      offsetY: -44,
    },
    // Cork board on right wall
    {
      assetKey: "corkboard",
      relCol: 0.62,
      relRow: 0.08,
      width: 30,
      height: 24,
      zIndex: 33,
      offsetY: -38,
    },
    // Box near entrance (front-left area)
    { assetKey: "box", relCol: 0.2, relRow: 0.72, width: 26, height: 36, zIndex: 35 },
    // Ceiling fan (offsetY lifts to ceiling level)
    {
      assetKey: "ceilingFan",
      relCol: 0.5,
      relRow: 0.32,
      width: 42,
      height: 16,
      zIndex: 31,
      offsetY: -74,
    },
  ],
};

// ── THE COUNTER (Bodega Recruitment / Deli) ──────────────────────────────
// The deli counter. Public-facing, street-level energy. Boss makes sandwiches,
// pours coffee, talks to walk-ins. Deli case is the hero. The food is the pipeline.
const COUNTER_RECIPE: RoomRecipe = {
  palette: { floor: "#3a2818", wallLeft: "#2c2014", wallRight: "#342416" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Deli case — long glass-fronted counter, dominates the room
    { assetKey: "deliCase", relCol: 0.48, relRow: 0.55, width: 120, height: 82, zIndex: 40 },
    // Coffee machine behind counter (back-left, boss's side)
    { assetKey: "coffeeMachine", relCol: 0.28, relRow: 0.25, width: 34, height: 46, zIndex: 36 },
    // Menu board on right wall (offsetY places it on wall)
    {
      assetKey: "menuBoard",
      relCol: 0.6,
      relRow: 0.08,
      width: 44,
      height: 30,
      zIndex: 33,
      offsetY: -40,
    },
    // Customer stool (front of counter, left)
    { assetKey: "stool", relCol: 0.32, relRow: 0.8, width: 22, height: 44, zIndex: 42 },
    // Second customer stool (front of counter, right)
    { assetKey: "stool", relCol: 0.58, relRow: 0.84, width: 22, height: 44, zIndex: 42 },
    // Shelf behind counter (back-right wall, supplies)
    { assetKey: "shelf", relCol: 0.82, relRow: 0.18, width: 48, height: 64, zIndex: 34 },
    // Ceiling fan
    {
      assetKey: "ceilingFan",
      relCol: 0.5,
      relRow: 0.32,
      width: 42,
      height: 16,
      zIndex: 31,
      offsetY: -74,
    },
  ],
};

// ── THE DINING AREA (Bodega Recovery / Social) ───────────────────────────
// Double-wide dining hall covering the full front of the bodega (8×3 footprint).
// Two table clusters, warm bodega palette, casual street-food atmosphere.
const DINING_AREA_RECIPE: RoomRecipe = {
  palette: { floor: "#382818", wallLeft: "#2a2016", wallRight: "#30261c" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [
    { side: "right", cellOffset: 1 },
    { side: "right", cellOffset: 5 },
  ],
  props: [
    // Left cluster — Table 1
    { assetKey: "table", relCol: 0.18, relRow: 0.38, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.22, relRow: 0.22, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.14, relRow: 0.52, width: 30, height: 40, zIndex: 40 },
    // Left cluster — Table 2
    { assetKey: "table", relCol: 0.38, relRow: 0.62, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.42, relRow: 0.48, width: 30, height: 40, zIndex: 36 },
    // Milk crate as chair (the bodega touch)
    { assetKey: "milkCrate", relCol: 0.32, relRow: 0.76, width: 24, height: 20, zIndex: 40 },
    // Right cluster — Table 3
    { assetKey: "table", relCol: 0.62, relRow: 0.38, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.66, relRow: 0.22, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.58, relRow: 0.52, width: 30, height: 40, zIndex: 40 },
    // Right cluster — Table 4
    { assetKey: "table", relCol: 0.82, relRow: 0.62, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.86, relRow: 0.48, width: 30, height: 40, zIndex: 36 },
    { assetKey: "milkCrate", relCol: 0.76, relRow: 0.76, width: 24, height: 20, zIndex: 40 },
    // Back wall items
    { assetKey: "microwave", relCol: 0.9, relRow: 0.14, width: 32, height: 28, zIndex: 35 },
    { assetKey: "coffeeMachine", relCol: 0.1, relRow: 0.14, width: 34, height: 46, zIndex: 35 },
    // Ceiling fans
    {
      assetKey: "ceilingFan",
      relCol: 0.28,
      relRow: 0.4,
      width: 42,
      height: 16,
      zIndex: 31,
      offsetY: -74,
    },
    {
      assetKey: "ceilingFan",
      relCol: 0.72,
      relRow: 0.4,
      width: 42,
      height: 16,
      zIndex: 31,
      offsetY: -74,
    },
  ],
};

// ── SUPPLY CLOSET (Bodega Staffing / Storage) ────────────────────────────
// "Behind the register, next to the mops. Literally a closet."
// Shelves are the hero. Boxes stacked too high. Mop in the corner. Dense, cramped.
const SUPPLY_CLOSET_RECIPE: RoomRecipe = {
  palette: { floor: "#302418", wallLeft: "#261e14", wallRight: "#2c2218" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    // HERO: Shelf against back-right wall (packed with gear)
    { assetKey: "shelf", relCol: 0.75, relRow: 0.18, width: 52, height: 70, zIndex: 34 },
    // Second shelf (back-center wall)
    { assetKey: "shelf", relCol: 0.4, relRow: 0.18, width: 48, height: 66, zIndex: 34 },
    // Filing cabinet (left wall area)
    { assetKey: "cabinet", relCol: 0.18, relRow: 0.3, width: 38, height: 54, zIndex: 35 },
    // Gear crate on floor (center)
    { assetKey: "gearCrate", relCol: 0.5, relRow: 0.55, width: 30, height: 28, zIndex: 38 },
    // Cardboard box stack (front-right)
    { assetKey: "box", relCol: 0.72, relRow: 0.65, width: 28, height: 38, zIndex: 38 },
    // Mop and broom leaning against left wall
    { assetKey: "mopBroom", relCol: 0.12, relRow: 0.6, width: 20, height: 58, zIndex: 36 },
    // Bucket near mop
    { assetKey: "bucket", relCol: 0.25, relRow: 0.75, width: 22, height: 26, zIndex: 37 },
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

// ── PORTER'S: THE FLOOR (Public Dining) ─────────────────────────────────
// Public dining room. Warm brick, wooden tables, bar-restaurant atmosphere.
const PORTERS_FLOOR_RECIPE: RoomRecipe = {
  palette: { floor: "#3a2a1a", wallLeft: "#30221a", wallRight: "#362818" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [
    { side: "right", cellOffset: 1 },
    { side: "right", cellOffset: 5 },
  ],
  props: [
    { assetKey: "table", relCol: 0.2, relRow: 0.35, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.24, relRow: 0.2, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.16, relRow: 0.5, width: 30, height: 40, zIndex: 40 },
    { assetKey: "table", relCol: 0.5, relRow: 0.55, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.54, relRow: 0.4, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.46, relRow: 0.7, width: 30, height: 40, zIndex: 40 },
    { assetKey: "table", relCol: 0.8, relRow: 0.35, width: 72, height: 64, zIndex: 38 },
    { assetKey: "chair", relCol: 0.84, relRow: 0.2, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.76, relRow: 0.5, width: 30, height: 40, zIndex: 40 },
    { assetKey: "plant", relCol: 0.1, relRow: 0.8, width: 36, height: 58, zIndex: 41 },
    {
      assetKey: "light",
      relCol: 0.35,
      relRow: 0.3,
      width: 28,
      height: 36,
      zIndex: 31,
      offsetY: -72,
    },
    {
      assetKey: "light",
      relCol: 0.65,
      relRow: 0.3,
      width: 28,
      height: 36,
      zIndex: 31,
      offsetY: -72,
    },
  ],
};

// ── PORTER'S: THE BAR (Recruitment) ─────────────────────────────────────
// Recruitment over drinks. Counter hero, stools, louder than the bodega counter.
const PORTERS_BAR_RECIPE: RoomRecipe = {
  palette: { floor: "#38261a", wallLeft: "#2e2018", wallRight: "#342416" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 1 }],
  props: [
    { assetKey: "counter", relCol: 0.5, relRow: 0.45, width: 130, height: 83, zIndex: 40 },
    { assetKey: "stool", relCol: 0.25, relRow: 0.72, width: 22, height: 44, zIndex: 42 },
    { assetKey: "stool", relCol: 0.42, relRow: 0.76, width: 22, height: 44, zIndex: 42 },
    { assetKey: "stool", relCol: 0.58, relRow: 0.78, width: 22, height: 44, zIndex: 42 },
    { assetKey: "stool", relCol: 0.75, relRow: 0.74, width: 22, height: 44, zIndex: 42 },
    { assetKey: "bottles", relCol: 0.3, relRow: 0.15, width: 60, height: 68, zIndex: 34 },
    { assetKey: "bottles", relCol: 0.7, relRow: 0.15, width: 60, height: 68, zIndex: 34 },
    {
      assetKey: "sign",
      relCol: 0.5,
      relRow: 0.06,
      width: 50,
      height: 28,
      zIndex: 33,
      offsetY: -44,
    },
    {
      assetKey: "light",
      relCol: 0.5,
      relRow: 0.3,
      width: 28,
      height: 36,
      zIndex: 31,
      offsetY: -72,
    },
  ],
};

// ── PORTER'S: THE OFFICE (Operations / Intel / Admin) ───────────────────
// Upstairs room with a real desk. Filing cabinets, a door that closes.
const PORTERS_OFFICE_RECIPE: RoomRecipe = {
  palette: { floor: "#2e2a24", wallLeft: "#262220", wallRight: "#2a2822" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "desk", relCol: 0.5, relRow: 0.4, width: 100, height: 72, zIndex: 38 },
    { assetKey: "chair", relCol: 0.5, relRow: 0.22, width: 36, height: 48, zIndex: 36 },
    { assetKey: "cabinet", relCol: 0.82, relRow: 0.2, width: 44, height: 60, zIndex: 34 },
    { assetKey: "cabinet", relCol: 0.18, relRow: 0.25, width: 44, height: 60, zIndex: 34 },
    {
      assetKey: "corkboard",
      relCol: 0.5,
      relRow: 0.06,
      width: 36,
      height: 28,
      zIndex: 33,
      offsetY: -42,
    },
    { assetKey: "clipboard", relCol: 0.55, relRow: 0.38, width: 24, height: 20, zIndex: 39 },
    {
      assetKey: "phone",
      relCol: 0.3,
      relRow: 0.1,
      width: 18,
      height: 22,
      zIndex: 33,
      offsetY: -38,
    },
    { assetKey: "plant", relCol: 0.8, relRow: 0.7, width: 32, height: 50, zIndex: 40 },
  ],
};

// ── PORTER'S: THE STOCKROOM (Logistics) ─────────────────────────────────
// Proper shelving, labeled crates, enough floor space to stage a loadout.
const PORTERS_STOCKROOM_RECIPE: RoomRecipe = {
  palette: { floor: "#2c2820", wallLeft: "#24201c", wallRight: "#282620" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "shelf", relCol: 0.75, relRow: 0.15, width: 52, height: 70, zIndex: 34 },
    { assetKey: "shelf", relCol: 0.35, relRow: 0.15, width: 52, height: 70, zIndex: 34 },
    { assetKey: "gearCrate", relCol: 0.5, relRow: 0.55, width: 34, height: 30, zIndex: 38 },
    { assetKey: "gearCrate", relCol: 0.3, relRow: 0.65, width: 30, height: 28, zIndex: 38 },
    { assetKey: "box", relCol: 0.7, relRow: 0.6, width: 28, height: 38, zIndex: 37 },
    { assetKey: "clipboard", relCol: 0.2, relRow: 0.4, width: 24, height: 20, zIndex: 36 },
    { assetKey: "bucket", relCol: 0.85, relRow: 0.7, width: 22, height: 26, zIndex: 36 },
  ],
};

// ── PORTER'S: THE INFIRMARY (Recovery) ──────────────────────────────────
// First real recovery room. A cot, a cabinet, someone who knows what they're doing.
const PORTERS_INFIRMARY_RECIPE: RoomRecipe = {
  palette: { floor: "#263040", wallLeft: "#202838", wallRight: "#242e42" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "bed", relCol: 0.55, relRow: 0.48, width: 108, height: 86, zIndex: 36 },
    { assetKey: "ivStand", relCol: 0.28, relRow: 0.28, width: 26, height: 78, zIndex: 37 },
    { assetKey: "medCabinet", relCol: 0.18, relRow: 0.18, width: 52, height: 68, zIndex: 34 },
    { assetKey: "trayMedical", relCol: 0.62, relRow: 0.78, width: 40, height: 46, zIndex: 40 },
    { assetKey: "bandages", relCol: 0.32, relRow: 0.62, width: 30, height: 24, zIndex: 34 },
    { assetKey: "curtain", relCol: 0.8, relRow: 0.35, width: 40, height: 70, zIndex: 35 },
    { assetKey: "mat", relCol: 0.5, relRow: 0.82, width: 72, height: 44, zIndex: 28 },
    {
      assetKey: "firstAid",
      relCol: 0.78,
      relRow: 0.1,
      width: 24,
      height: 26,
      zIndex: 33,
      offsetY: -40,
    },
  ],
};

// ── PORTER'S: THE GYM (Training) ────────────────────────────────────────
// Scrappy but real. Heavy bag, weight bench, enough room to swing.
const PORTERS_GYM_RECIPE: RoomRecipe = {
  palette: { floor: "#282a2e", wallLeft: "#202228", wallRight: "#24262c" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "punchBag", relCol: 0.45, relRow: 0.38, width: 28, height: 68, zIndex: 38 },
    { assetKey: "mat", relCol: 0.42, relRow: 0.68, width: 72, height: 44, zIndex: 28 },
    { assetKey: "mat", relCol: 0.58, relRow: 0.82, width: 62, height: 38, zIndex: 29 },
    { assetKey: "cabinet", relCol: 0.82, relRow: 0.22, width: 44, height: 60, zIndex: 34 },
    { assetKey: "waterCooler", relCol: 0.18, relRow: 0.52, width: 30, height: 48, zIndex: 36 },
    { assetKey: "bucket", relCol: 0.8, relRow: 0.68, width: 24, height: 28, zIndex: 35 },
    { assetKey: "radio", relCol: 0.2, relRow: 0.8, width: 36, height: 24, zIndex: 35 },
  ],
};

// ── PORTER'S: THE PREP ROOM (Staging + Consumable Prep) ─────────────────
// Staging and lightweight consumable prep. Not a workshop, but functional.
const PORTERS_PREP_ROOM_RECIPE: RoomRecipe = {
  palette: { floor: "#2a2820", wallLeft: "#22201c", wallRight: "#26261e" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "table", relCol: 0.5, relRow: 0.48, width: 84, height: 72, zIndex: 38 },
    { assetKey: "shelf", relCol: 0.78, relRow: 0.16, width: 48, height: 66, zIndex: 34 },
    { assetKey: "shelf", relCol: 0.22, relRow: 0.16, width: 48, height: 66, zIndex: 34 },
    { assetKey: "gearCrate", relCol: 0.3, relRow: 0.7, width: 30, height: 28, zIndex: 38 },
    { assetKey: "gearCrate", relCol: 0.7, relRow: 0.72, width: 30, height: 28, zIndex: 38 },
    { assetKey: "clipboard", relCol: 0.48, relRow: 0.44, width: 24, height: 20, zIndex: 39 },
    { assetKey: "bottles", relCol: 0.5, relRow: 0.12, width: 50, height: 60, zIndex: 34 },
  ],
};

// ── PORTER'S: THE BREAK ROOM (Private Recovery / Social) ────────────────
// Private upstairs space. Couch, table, away from customers.
const PORTERS_BREAK_ROOM_RECIPE: RoomRecipe = {
  palette: { floor: "#302a22", wallLeft: "#282220", wallRight: "#2e281e" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "couch", relCol: 0.48, relRow: 0.38, width: 90, height: 66, zIndex: 36 },
    { assetKey: "table", relCol: 0.48, relRow: 0.68, width: 68, height: 60, zIndex: 40 },
    { assetKey: "rug", relCol: 0.48, relRow: 0.58, width: 72, height: 36, zIndex: 28 },
    { assetKey: "waterCooler", relCol: 0.82, relRow: 0.22, width: 30, height: 48, zIndex: 35 },
    { assetKey: "plant", relCol: 0.18, relRow: 0.28, width: 34, height: 54, zIndex: 34 },
    { assetKey: "radio", relCol: 0.78, relRow: 0.65, width: 36, height: 24, zIndex: 35 },
    { assetKey: "microwave", relCol: 0.2, relRow: 0.7, width: 28, height: 24, zIndex: 36 },
  ],
};

// ── PORTER'S: THE BRIEFING ROOM (Operations / Intel) ────────────────────
// Dedicated planning space. Board, map, chairs for the whole team.
const PORTERS_BRIEFING_ROOM_RECIPE: RoomRecipe = {
  palette: { floor: "#2c2a26", wallLeft: "#242220", wallRight: "#282824" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "left", cellOffset: 0 }],
  props: [
    { assetKey: "table", relCol: 0.5, relRow: 0.52, width: 92, height: 78, zIndex: 38 },
    { assetKey: "chair", relCol: 0.3, relRow: 0.35, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.7, relRow: 0.35, width: 30, height: 40, zIndex: 36 },
    { assetKey: "chair", relCol: 0.5, relRow: 0.78, width: 30, height: 40, zIndex: 42 },
    {
      assetKey: "corkboard",
      relCol: 0.5,
      relRow: 0.06,
      width: 44,
      height: 30,
      zIndex: 33,
      offsetY: -42,
    },
    { assetKey: "monitor", relCol: 0.2, relRow: 0.2, width: 32, height: 38, zIndex: 35 },
    { assetKey: "clipboard", relCol: 0.55, relRow: 0.5, width: 24, height: 20, zIndex: 39 },
  ],
};

// ── PORTER'S: THE DOCK (Waterfront Staging) ─────────────────────────────
// Harbor-side staging. Open, industrial, functional.
const PORTERS_DOCK_RECIPE: RoomRecipe = {
  palette: { floor: "#2a3034", wallLeft: "#222830", wallRight: "#262e32" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "right", cellOffset: 0 }],
  props: [
    { assetKey: "gearCrate", relCol: 0.3, relRow: 0.4, width: 36, height: 32, zIndex: 38 },
    { assetKey: "gearCrate", relCol: 0.5, relRow: 0.5, width: 34, height: 30, zIndex: 38 },
    { assetKey: "box", relCol: 0.7, relRow: 0.45, width: 30, height: 40, zIndex: 37 },
    { assetKey: "clipboard", relCol: 0.2, relRow: 0.3, width: 24, height: 20, zIndex: 36 },
    { assetKey: "bucket", relCol: 0.8, relRow: 0.6, width: 24, height: 28, zIndex: 36 },
  ],
};

// ── PORTER'S: THE DECK (Waterfront Social) ──────────────────────────────
// Open waterfront platform. Harbor air and industrial skyline.
const PORTERS_DECK_RECIPE: RoomRecipe = {
  palette: { floor: "#2e3238", wallLeft: "#242a30", wallRight: "#283036" },
  inactivePalette: INACTIVE_PALETTE,
  openings: [{ side: "right", cellOffset: 0 }],
  props: [
    { assetKey: "bench", relCol: 0.3, relRow: 0.4, width: 72, height: 48, zIndex: 38 },
    { assetKey: "bench", relCol: 0.7, relRow: 0.5, width: 72, height: 48, zIndex: 38 },
    { assetKey: "plant", relCol: 0.15, relRow: 0.6, width: 34, height: 54, zIndex: 36 },
    { assetKey: "plant", relCol: 0.85, relRow: 0.35, width: 34, height: 54, zIndex: 36 },
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

// Template-specific recipes: keyed by room templateId.
// Bodega rooms get their own canon-accurate dressing.
const TEMPLATE_RECIPES: Record<string, RoomRecipe> = {
  // Bodega rooms
  "room/register:tier_1": REGISTER_RECIPE,
  "room/counter:tier_1": COUNTER_RECIPE,
  "room/dining_area:tier_1": DINING_AREA_RECIPE,
  "room/supply_closet:tier_1": SUPPLY_CLOSET_RECIPE,
  // Porter's rooms
  "room/floor:tier_1": PORTERS_FLOOR_RECIPE,
  "room/bar:tier_1": PORTERS_BAR_RECIPE,
  "room/office:tier_1": PORTERS_OFFICE_RECIPE,
  "room/stockroom:tier_1": PORTERS_STOCKROOM_RECIPE,
  "room/infirmary:tier_1": PORTERS_INFIRMARY_RECIPE,
  "room/gym:tier_1": PORTERS_GYM_RECIPE,
  "room/prep_room:tier_1": PORTERS_PREP_ROOM_RECIPE,
  "room/break_room:tier_1": PORTERS_BREAK_ROOM_RECIPE,
  "room/briefing_room:tier_1": PORTERS_BRIEFING_ROOM_RECIPE,
  "room/dock:tier_1": PORTERS_DOCK_RECIPE,
  "room/deck:tier_1": PORTERS_DECK_RECIPE,
};

// Function-tag fallback recipes: used when no template-specific recipe exists.
// Union hall and later-tier rooms resolve through here.
const ROOM_RECIPES: Record<string, RoomRecipe> = {
  "room:operations": REGISTER_RECIPE,
  "room:recovery": RECOVERY_RECIPE,
  "room:social": SOCIAL_RECIPE,
  "room:staffing": STAFFING_RECIPE,
  "room:training": TRAINING_RECIPE,
};

function getRecipe(templateId: string, functionTag: string): RoomRecipe {
  return TEMPLATE_RECIPES[templateId] ?? ROOM_RECIPES[functionTag] ?? DEFAULT_RECIPE;
}

// ── Seed type ─────────────────────────────────────────────────────────────

interface HqRoomSeed {
  id: string;
  templateId: string;
  roomStateId: string;
  slotId: string;
  floorIndex: number;
  name: string;
  tier: number;
  isRequestedActive: boolean;
  isOperational: boolean;
  functionTag: string;
  appliedUpgradeIds?: readonly string[];
  reservedFootprint: HqFootprint;
  activeFootprint: HqFootprint;
}

interface HqExpansionSlotSeed {
  id: string;
  label: string;
  kind: "available" | "locked";
  floorIndex: number;
  footprint: HqFootprint;
}

interface ComposeHqWorldOptions {
  reservedSlots?: readonly HqExpansionSlotSeed[];
  /** Building template ID — used to look up the fixed building layout. */
  buildingId?: string;
  buildingTier?: number;
  floorIndex?: number;
}

// ── Geometry output ───────────────────────────────────────────────────────

interface HqWorldGeometry {
  layout: HqWorldLayout;
  rooms: readonly HqRoomNode[];
  expansionSlots: readonly HqExpansionSlotNode[];
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

function buildFloorOffsetMap(
  layouts: readonly BuildingFloorLayout[],
): ReadonlyMap<number, HqFloorOffset> {
  return new Map(
    layouts.map((layout) => {
      const stackLayer = getFloorStackLayer(layout);
      return [
        layout.floorIndex,
        {
          floorIndex: layout.floorIndex,
          stackLayer,
          offsetX: 0,
          offsetY: -stackLayer * STACKED_FLOOR_OFFSET_Y,
        },
      ];
    }),
  );
}

function getFloorOrigin(
  originX: number,
  originY: number,
  floorIndex: number,
  floorOffsets: ReadonlyMap<number, HqFloorOffset>,
): Readonly<{ x: number; y: number }> {
  const offset = floorOffsets.get(floorIndex);
  return {
    x: originX + (offset?.offsetX ?? 0),
    y: originY + (offset?.offsetY ?? 0),
  };
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

export function getBoundsFromPoints(points: readonly { x: number; y: number }[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

// ── Room node (hit-test geometry) ─────────────────────────────────────────

function createRoomNode(
  seed: HqRoomSeed,
  originX: number,
  originY: number,
  floorOffsets: ReadonlyMap<number, HqFloorOffset>,
): HqRoomNode {
  const floorOrigin = getFloorOrigin(originX, originY, seed.floorIndex, floorOffsets);
  const reserved = seed.reservedFootprint;
  const active = seed.activeFootprint;
  const top = projectIso(reserved.col, reserved.row, floorOrigin.x, floorOrigin.y);
  const right = projectIso(
    reserved.col + reserved.cols,
    reserved.row,
    floorOrigin.x,
    floorOrigin.y,
  );
  const bottom = projectIso(
    reserved.col + reserved.cols,
    reserved.row + reserved.rows,
    floorOrigin.x,
    floorOrigin.y,
  );
  const left = projectIso(reserved.col, reserved.row + reserved.rows, floorOrigin.x, floorOrigin.y);
  const topLift = { x: top.x, y: top.y - HQ_WALL_HEIGHT };
  const leftLift = { x: left.x, y: left.y - HQ_WALL_HEIGHT };
  const rightLift = { x: right.x, y: right.y - HQ_WALL_HEIGHT };

  const floorPoints = [top, right, bottom, left];
  const leftWallPoints = [top, left, leftLift, topLift];
  const rightWallPoints = [top, right, rightLift, topLift];
  const activeTop = projectIso(active.col, active.row, floorOrigin.x, floorOrigin.y);
  const activeRight = projectIso(
    active.col + active.cols,
    active.row,
    floorOrigin.x,
    floorOrigin.y,
  );
  const activeBottom = projectIso(
    active.col + active.cols,
    active.row + active.rows,
    floorOrigin.x,
    floorOrigin.y,
  );
  const activeLeft = projectIso(active.col, active.row + active.rows, floorOrigin.x, floorOrigin.y);

  return {
    id: seed.id,
    templateId: seed.templateId,
    roomStateId: seed.roomStateId,
    slotId: seed.slotId,
    floorIndex: seed.floorIndex,
    label: seed.name,
    tier: seed.tier,
    isRequestedActive: seed.isRequestedActive,
    isOperational: seed.isOperational,
    functionTag: seed.functionTag,
    reservedFootprint: reserved,
    activeFootprint: active,
    floorPoints,
    leftWallPoints,
    rightWallPoints,
    bounds: getBoundsFromPoints([...floorPoints, ...leftWallPoints, ...rightWallPoints]),
    activeBounds: getBoundsFromPoints([activeTop, activeRight, activeBottom, activeLeft]),
  };
}

function createExpansionSlotNode(
  seed: HqExpansionSlotSeed,
  originX: number,
  originY: number,
  floorOffsets: ReadonlyMap<number, HqFloorOffset>,
): HqExpansionSlotNode {
  const floorOrigin = getFloorOrigin(originX, originY, seed.floorIndex, floorOffsets);
  const fp = seed.footprint;
  const top = projectIso(fp.col, fp.row, floorOrigin.x, floorOrigin.y);
  const right = projectIso(fp.col + fp.cols, fp.row, floorOrigin.x, floorOrigin.y);
  const bottom = projectIso(fp.col + fp.cols, fp.row + fp.rows, floorOrigin.x, floorOrigin.y);
  const left = projectIso(fp.col, fp.row + fp.rows, floorOrigin.x, floorOrigin.y);
  const topLift = { x: top.x, y: top.y - HQ_WALL_HEIGHT };
  const leftLift = { x: left.x, y: left.y - HQ_WALL_HEIGHT };
  const rightLift = { x: right.x, y: right.y - HQ_WALL_HEIGHT };
  const floorPoints = [top, right, bottom, left];
  const leftWallPoints = [top, left, leftLift, topLift];
  const rightWallPoints = [top, right, rightLift, topLift];
  const allPoints = [...floorPoints, ...leftWallPoints, ...rightWallPoints];
  const xs = allPoints.map((point) => point.x);
  const ys = allPoints.map((point) => point.y);

  return {
    id: seed.id,
    label: seed.label,
    kind: seed.kind,
    floorIndex: seed.floorIndex,
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
    const recipe = getRecipe(seed.templateId, seed.functionTag);
    const palette =
      seed.isOperational || seed.isRequestedActive ? recipe.palette : recipe.inactivePalette;
    const fp = seed.reservedFootprint;
    for (let c = fp.col; c < fp.col + fp.cols; c++) {
      for (let r = fp.row; r < fp.row + fp.rows; r++) {
        tiles.push({
          floorIndex: seed.floorIndex,
          col: c,
          row: r,
          tint: palette.floor,
          roomId: seed.id,
        });
      }
    }
  }
  return tiles;
}

// ── Modular wall segments ─────────────────────────────────────────────────

function buildWallSegments(seeds: readonly HqRoomSeed[]): HqWallSegment[] {
  const segments: HqWallSegment[] = [];
  for (const seed of seeds) {
    const recipe = getRecipe(seed.templateId, seed.functionTag);
    const palette =
      seed.isOperational || seed.isRequestedActive ? recipe.palette : recipe.inactivePalette;
    const fp = seed.reservedFootprint;

    const openingSet = new Set(recipe.openings.map((o) => `${o.side}:${o.cellOffset}`));

    // Left wall: along col = fp.col, from row fp.row to fp.row + fp.rows - 1
    for (let i = 0; i < fp.rows; i++) {
      const kind = openingSet.has(`left:${i}`) ? ("opening" as const) : ("solid" as const);
      segments.push({
        floorIndex: seed.floorIndex,
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
        floorIndex: seed.floorIndex,
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

/** Map distance from building edge to street zone for corner layouts. */
function distToStreetZone(dist: number): HqPerimeterTile["kind"] {
  if (dist < 4) return "sidewalk";
  if (dist < 14) return "street";
  if (dist < 17) return "sidewalk";
  return "alley";
}

const ZONE_PRIORITY: Record<string, number> = {
  street: 3,
  sidewalk: 2,
  alley: 1,
  void: 0,
};

export function buildPerimeterTiles(
  footprints: readonly HqFootprint[],
  buildingId?: string,
): HqPerimeterTile[] {
  if (footprints.length === 0) return [];

  const minCol = Math.min(...footprints.map((footprint) => footprint.col));
  const maxCol = Math.max(...footprints.map((footprint) => footprint.col + footprint.cols));
  const minRow = Math.min(...footprints.map((footprint) => footprint.row));
  const maxRow = Math.max(...footprints.map((footprint) => footprint.row + footprint.rows));

  const isWaterfrontRear = buildingId === "building/porters";
  const isCornerStreet = buildingId === "building/bodega";

  // Occupied cells set
  const occupied = new Set<string>();
  for (const fp of footprints) {
    for (let c = fp.col; c < fp.col + fp.cols; c++) {
      for (let r = fp.row; r < fp.row + fp.rows; r++) {
        occupied.add(`${c},${r}`);
      }
    }
  }

  const tiles: HqPerimeterTile[] = [];
  // Extended padding so the tile grid covers the full visible canvas area.
  // Must be large enough that the isometric ground plane fills the viewport
  // at all zoom levels, with room for street, sidewalk, and alley zones.
  const padLeft = 22;
  const padRight = 22;
  const padTop = 16;
  const padBottom = 22;

  for (let c = minCol - padLeft; c <= maxCol + padRight; c++) {
    for (let r = minRow - padTop; r <= maxRow + padBottom; r++) {
      if (occupied.has(`${c},${r}`)) continue;

      let kind: HqPerimeterTile["kind"];
      if (r < minRow) {
        if (isWaterfrontRear) {
          kind = r >= minRow - 4 ? "pier" : "water";
        } else {
          kind = "alley";
        }
      } else if (isCornerStreet) {
        // Corner layout: L-shaped street wraps front + right side.
        // Compute distance from each building edge to classify zones.
        const dSouth = r >= maxRow ? r - maxRow : -1;
        const dEast = c >= maxCol ? c - maxCol : -1;
        const mainZone = dSouth >= 0 ? distToStreetZone(dSouth) : null;
        const sideZone = dEast >= 0 ? distToStreetZone(dEast) : null;

        if (mainZone && sideZone) {
          // Intersection area — pick the more road-like zone
          kind = ZONE_PRIORITY[mainZone] >= ZONE_PRIORITY[sideZone] ? mainZone : sideZone;
        } else if (mainZone) {
          kind = mainZone;
        } else if (sideZone) {
          kind = sideZone;
        } else if (c < minCol || c >= maxCol) {
          kind = "alley";
        } else {
          kind = "void";
        }
      } else if (r >= maxRow && r < maxRow + 4) {
        kind = "sidewalk";
      } else if (r >= maxRow + 4 && r < maxRow + 14) {
        kind = "street";
      } else if (r >= maxRow + 14) {
        // Far side of street — more sidewalk then alley
        kind = r < maxRow + 17 ? "sidewalk" : "alley";
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

// ── Unified static placement projection ──────────────────────────────────

/**
 * Project a grid-anchored HqStaticPlacementDef to screen-space HqSpritePlacement.
 * This is the single code path for all non-actor HQ SVG placement.
 *
 * Priority: svgMeta → sceneOrigin → anchorMode with explicit width/height.
 */
export function projectStaticPlacement(
  def: HqStaticPlacementDef,
  originX: number,
  originY: number,
): HqSpritePlacement {
  const anchor = projectIso(def.col, def.row, originX, originY);
  const ox = def.offsetX ?? 0;
  const oy = def.offsetY ?? 0;

  let x: number;
  let y: number;
  let w: number;
  let h: number;

  if (def.svgMeta) {
    // SVG-metadata placement: size from viewBox, position from SVG anchor.
    const [vbMinX, vbMinY, vbW, vbH] = def.svgMeta.viewBox;
    w = vbW * def.scale;
    h = vbH * def.scale;
    x = anchor.x - (def.svgMeta.svgAnchorX - vbMinX) * def.scale;
    y = anchor.y - (def.svgMeta.svgAnchorY - vbMinY) * def.scale;
  } else if (def.anchorMode === "scene-origin" && def.sceneOrigin) {
    // Legacy room-scene placement.
    const so = def.sceneOrigin;
    w = def.width * def.scale;
    h = def.height * def.scale;
    x = anchor.x - (so.svgOriginX - so.viewBoxMinX);
    y = anchor.y - (so.svgOriginY - so.viewBoxMinY);
  } else {
    // Simple anchor mode with explicit width/height.
    w = def.width * def.scale;
    h = def.height * def.scale;
    switch (def.anchorMode) {
      case "iso-bottom":
        x = anchor.x - w / 2;
        y = anchor.y - h;
        break;
      case "iso-center":
        x = anchor.x - w / 2;
        y = anchor.y - h / 2;
        break;
      default:
        x = anchor.x;
        y = anchor.y;
    }
  }

  return {
    id: def.id,
    assetUrl: def.assetUrl,
    x: x + ox,
    y: y + oy,
    width: w,
    height: h,
    zIndex: def.zIndex,
    opacity: def.opacity,
  };
}

function resolvePropAssetUrl(
  assetKey: HqFallbackPropAssetKey,
  assetRoots: HqEnvironmentAssetRoots,
): string {
  return `${assetRoots.partsRoot}/${HQ_PROP_ASSET_PATHS[assetKey]}`;
}

function buildRoomProps(
  rooms: readonly HqRoomSeed[],
  originX: number,
  originY: number,
  floorOffsets: ReadonlyMap<number, HqFloorOffset>,
  assetRoots: HqEnvironmentAssetRoots,
  buildingId: string,
): HqSpritePlacement[] {
  const props: HqSpritePlacement[] = [];
  const sceneSystem = getBuildingRenderConfig(buildingId).composition.sceneSystem;

  for (const room of rooms) {
    const floorOrigin = getFloorOrigin(originX, originY, room.floorIndex, floorOffsets);
    const recipe = getRecipe(room.templateId, room.functionTag);
    const reserved = room.reservedFootprint;
    const active = room.activeFootprint;
    const activeTopCorner = projectIso(active.col, active.row, floorOrigin.x, floorOrigin.y);
    const roomOpacity = room.isOperational ? 1 : room.isRequestedActive ? 0.65 : 0.35;

    const resolvedSceneUrl = resolveHqRoomSceneAssetUrl(
      buildingId,
      room.templateId,
      room.roomStateId,
    );

    if (resolvedSceneUrl) {
      // Room scenes are authored in a canonical footprint (usually 4x3). Center that
      // authored frame within the runtime slot so wider/taller rooms still align.
      const sceneAnchorCol = reserved.col + (reserved.cols - sceneSystem.roomFootprint.cols) / 2;
      const sceneAnchorRow = reserved.row + (reserved.rows - sceneSystem.roomFootprint.rows) / 2;
      const scene = {
        svgOriginX: sceneSystem.canonicalOrigin[0],
        svgOriginY: sceneSystem.canonicalOrigin[1],
        svgWidth: sceneSystem.canonicalViewBox.width,
        svgHeight: sceneSystem.canonicalViewBox.height,
        viewBoxMinX: sceneSystem.canonicalViewBox.minX,
        viewBoxMinY: sceneSystem.canonicalViewBox.minY,
      };
      const placement: HqStaticPlacementDef = {
        id: `${room.id}/scene`,
        assetId: "",
        assetUrl: resolvedSceneUrl,
        kind: "room-scene",
        col: sceneAnchorCol,
        row: sceneAnchorRow,
        anchorMode: "scene-origin",
        width: scene.svgWidth,
        height: scene.svgHeight,
        zIndex: 35,
        opacity: roomOpacity,
        scale: 1,
        sceneOrigin: {
          svgOriginX: scene.svgOriginX,
          svgOriginY: scene.svgOriginY,
          viewBoxMinX: scene.viewBoxMinX,
          viewBoxMinY: scene.viewBoxMinY,
        },
      };
      const sprite = projectStaticPlacement(placement, floorOrigin.x, floorOrigin.y);
      props.push({ ...sprite, floorIndex: room.floorIndex, debugOrigin: activeTopCorner });
    } else {
      // Per-prop sprite placement routed through the same svgMeta projection contract.
      for (const propDef of recipe.props) {
        const svgMeta = getPropSvgMeta(propDef.assetKey);
        const placement: HqStaticPlacementDef = {
          id: `${room.id}/${propDef.assetKey}`,
          assetId: `prop/${String(propDef.assetKey)}`,
          assetUrl: resolvePropAssetUrl(propDef.assetKey, assetRoots),
          kind: "decoration",
          col: active.col + active.cols * propDef.relCol,
          row: active.row + active.rows * propDef.relRow,
          anchorMode: "iso-bottom",
          svgMeta,
          width: propDef.width,
          height: propDef.height,
          zIndex: propDef.zIndex,
          opacity: roomOpacity,
          scale: derivePropSpriteScale(propDef.assetKey, propDef.width, propDef.height),
          offsetX: propDef.offsetX ?? 0,
          offsetY: propDef.offsetY ?? 0,
        };
        const sprite = projectStaticPlacement(placement, floorOrigin.x, floorOrigin.y);
        props.push({ ...sprite, floorIndex: room.floorIndex, debugOrigin: activeTopCorner });
      }
    }
  }

  return props;
}

// ── Building layout: corridor + empty-slot tiles ─────────────────────────

const CORRIDOR_TINT = "#2a2420";
const EMPTY_SLOT_TINT = "#1c1a18";
const LOCKED_SLOT_TINT = "#161514";
const BUILDING_WALL_LEFT = "#2c2014";
const BUILDING_WALL_RIGHT = "#352616";

function buildCorridorTiles(layout: BuildingFloorLayout | undefined): HqFloorTile[] {
  if (!layout) return [];
  // Every cell inside the shell that isn't a room slot is a corridor.
  const slotCells = new Set<string>();
  for (const slot of layout.slots) {
    for (let c = slot.col; c < slot.col + slot.cols; c++) {
      for (let r = slot.row; r < slot.row + slot.rows; r++) {
        slotCells.add(`${c},${r}`);
      }
    }
  }
  const tiles: HqFloorTile[] = [];
  const sh = layout.shell;
  for (let c = sh.col; c < sh.col + sh.cols; c++) {
    for (let r = sh.row; r < sh.row + sh.rows; r++) {
      if (!slotCells.has(`${c},${r}`)) {
        tiles.push({
          floorIndex: layout.floorIndex,
          col: c,
          row: r,
          tint: CORRIDOR_TINT,
          roomId: "corridor",
        });
      }
    }
  }
  return tiles;
}

function buildExpansionSlotTiles(expansionSlots: readonly HqExpansionSlotSeed[]): HqFloorTile[] {
  const tiles: HqFloorTile[] = [];
  for (const slot of expansionSlots) {
    const tint = slot.kind === "available" ? EMPTY_SLOT_TINT : LOCKED_SLOT_TINT;
    for (let c = slot.footprint.col; c < slot.footprint.col + slot.footprint.cols; c++) {
      for (let r = slot.footprint.row; r < slot.footprint.row + slot.footprint.rows; r++) {
        tiles.push({ floorIndex: slot.floorIndex, col: c, row: r, tint, roomId: slot.id });
      }
    }
  }
  return tiles;
}

/** Build a single continuous wall along the building shell exterior. */
function buildBuildingShellWalls(layout: BuildingFloorLayout | undefined): HqWallSegment[] {
  if (!layout) return [];
  const sh = layout.shell;
  const segments: HqWallSegment[] = [];

  // Left wall: back-left face along col = sh.col
  for (let r = sh.row; r < sh.row + sh.rows; r++) {
    segments.push({
      floorIndex: layout.floorIndex,
      col: sh.col,
      row: r,
      side: "left",
      kind: "solid",
      tint: BUILDING_WALL_LEFT,
      roomId: "building-shell",
    });
  }

  // Right wall: back-right face along row = sh.row
  for (let c = sh.col; c < sh.col + sh.cols; c++) {
    segments.push({
      floorIndex: layout.floorIndex,
      col: c,
      row: sh.row,
      side: "right",
      kind: "solid",
      tint: BUILDING_WALL_RIGHT,
      roomId: "building-shell",
    });
  }

  return segments;
}

// ── Scenery (data-driven exterior SVG placements) ────────────────────────

function buildExteriorScenery(
  buildingId: string | undefined,
  originX: number,
  originY: number,
): HqSpritePlacement[] {
  if (!buildingId) return [];
  const scene = getExteriorScene(buildingId);
  if (!scene) return [];
  return scene.placements.map((def) => projectStaticPlacement(def, originX, originY));
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
    activeBounds: {
      x: room.activeBounds.x + dx,
      y: room.activeBounds.y + dy,
      width: room.activeBounds.width,
      height: room.activeBounds.height,
    },
  };
}

// ── World bounds ──────────────────────────────────────────────────────────

function computeWorldBounds(
  rooms: readonly HqRoomNode[],
  expansionSlots: readonly HqExpansionSlotNode[],
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
  expansionSlots.forEach((slot) => {
    slot.floorPoints.forEach(absorbPoint);
    slot.leftWallPoints.forEach(absorbPoint);
    slot.rightWallPoints.forEach(absorbPoint);
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

function shiftExpansionSlot(
  slot: HqExpansionSlotNode,
  dx: number,
  dy: number,
): HqExpansionSlotNode {
  return {
    ...slot,
    floorPoints: shiftPoints(slot.floorPoints, dx, dy),
    leftWallPoints: shiftPoints(slot.leftWallPoints, dx, dy),
    rightWallPoints: shiftPoints(slot.rightWallPoints, dx, dy),
    bounds: {
      x: slot.bounds.x + dx,
      y: slot.bounds.y + dy,
      width: slot.bounds.width,
      height: slot.bounds.height,
    },
  };
}

export function composeHqWorldGeometry(
  rooms: readonly HqRoomSeed[],
  options: ComposeHqWorldOptions = {},
): HqWorldGeometry {
  const reservedSlots = options.reservedSlots ?? [];
  const activeFloorIndex = options.floorIndex ?? 0;
  const visibleFloorLayouts = options.buildingId
    ? getVisibleBuildingFloors(options.buildingId, activeFloorIndex, options.buildingTier ?? 1)
    : [];
  const floorOffsets = buildFloorOffsetMap(visibleFloorLayouts);
  const baseFloorLayout = visibleFloorLayouts[0];

  if (rooms.length === 0 && reservedSlots.length === 0 && visibleFloorLayouts.length === 0) {
    const layout: HqWorldLayout = {
      tileWidth: HQ_TILE_WIDTH,
      tileHeight: HQ_TILE_HEIGHT,
      wallHeight: HQ_WALL_HEIGHT,
      activeFloorIndex,
      visibleFloorIndexes: [activeFloorIndex],
      floorOffsets: [],
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
      expansionSlots: [],
      modular: { floorTiles: [], wallSegments: [], perimeterTiles: [] },
      roomProps: [],
      scenery: [],
      navGraph: { anchors: [], connectors: [] },
    };
  }

  // When a building layout exists, use the full shell for perimeter/bounds
  // so the building size stays fixed regardless of how many rooms are placed.
  const perimeterFootprints: HqFootprint[] = baseFloorLayout
    ? [baseFloorLayout.shell]
    : [
        ...rooms.map((room) => room.reservedFootprint),
        ...reservedSlots.map((slot) => slot.footprint),
      ];
  const maxRow = Math.max(...perimeterFootprints.map((fp) => fp.row + fp.rows));
  const originX = (maxRow + 6) * (HQ_TILE_WIDTH / 2);
  const originY = 180;

  // Build modular geometry
  const floorTiles = [
    ...buildFloorTiles(rooms),
    ...visibleFloorLayouts.flatMap((layout) => buildCorridorTiles(layout)),
    ...buildExpansionSlotTiles(reservedSlots),
  ];
  const wallSegments =
    visibleFloorLayouts.length > 0
      ? visibleFloorLayouts.flatMap((layout) => buildBuildingShellWalls(layout))
      : buildWallSegments(rooms);
  const perimeterTiles = buildPerimeterTiles(perimeterFootprints, options.buildingId);

  // Build room nodes (for hit-testing), props, scenery, navGraph
  const rawRooms = rooms.map((seed) => createRoomNode(seed, originX, originY, floorOffsets));
  const rawExpansionSlots = reservedSlots.map((slot) =>
    createExpansionSlotNode(slot, originX, originY, floorOffsets),
  );
  const roomProps = buildRoomProps(
    rooms,
    originX,
    originY,
    floorOffsets,
    getBuildingRenderConfig(options.buildingId).paths,
    options.buildingId ?? "building/bodega",
  );
  const scenery = buildExteriorScenery(options.buildingId, originX, originY);

  const rawBounds = computeWorldBounds(
    rawRooms,
    rawExpansionSlots,
    roomProps,
    scenery,
    perimeterTiles,
    originX,
    originY,
  );
  const dx = WORLD_MARGIN_X - rawBounds.minX;
  const dy = WORLD_MARGIN_Y - rawBounds.minY;

  const shiftedRooms = rawRooms.map((r) => shiftRoom(r, dx, dy));
  const shiftedExpansionSlots = rawExpansionSlots.map((slot) => shiftExpansionSlot(slot, dx, dy));
  const shiftedProps = roomProps.map((s) => shiftSprite(s, dx, dy));
  const shiftedScenery = scenery.map((s) => shiftSprite(s, dx, dy));

  const bounds = computeWorldBounds(
    shiftedRooms,
    shiftedExpansionSlots,
    shiftedProps,
    shiftedScenery,
    perimeterTiles,
    originX + dx,
    originY + dy,
  );

  const navGraph = buildNavigationGraph(
    shiftedRooms
      .filter((room) => room.floorIndex === activeFloorIndex)
      .map((room) => ({
        id: room.id,
        x: room.activeBounds.x,
        y: room.activeBounds.y,
        width: room.activeBounds.width,
        height: room.activeBounds.height,
        functionTag: room.functionTag,
        ...(() => {
          const seed = rooms.find((candidate) => candidate.id === room.id);
          const opening = seed
            ? getRecipe(seed.templateId, seed.functionTag, seed.roomStateId).openings[0]
            : undefined;
          if (!seed || !opening) {
            return {};
          }

          const floorOrigin = getFloorOrigin(
            originX + dx,
            originY + dy,
            seed.floorIndex,
            floorOffsets,
          );
          const entry = projectDoorCenter(
            seed.reservedFootprint,
            opening,
            floorOrigin.x,
            floorOrigin.y,
          );
          return {
            entryX: entry.x,
            entryY: entry.y,
          };
        })(),
      })),
  );

  // Compute building shell world-space size for camera zoom limits
  let buildingWorldSize: { width: number; height: number } | undefined;
  if (visibleFloorLayouts.length > 0) {
    const shellPoints: HqPoint[] = [];
    for (const layout of visibleFloorLayouts) {
      const floorOrigin = getFloorOrigin(
        originX + dx,
        originY + dy,
        layout.floorIndex,
        floorOffsets,
      );
      shellPoints.push(
        projectIso(layout.shell.col, layout.shell.row, floorOrigin.x, floorOrigin.y),
        projectIso(
          layout.shell.col + layout.shell.cols,
          layout.shell.row,
          floorOrigin.x,
          floorOrigin.y,
        ),
        projectIso(
          layout.shell.col + layout.shell.cols,
          layout.shell.row + layout.shell.rows,
          floorOrigin.x,
          floorOrigin.y,
        ),
        projectIso(
          layout.shell.col,
          layout.shell.row + layout.shell.rows,
          floorOrigin.x,
          floorOrigin.y,
        ),
      );
    }
    const sxs = shellPoints.map((p) => p.x);
    const sys = shellPoints.map((p) => p.y);
    buildingWorldSize = {
      width: (Math.max(...sxs) - Math.min(...sxs)) * 1.4,
      height: (Math.max(...sys) - Math.min(...sys) + HQ_WALL_HEIGHT) * 1.4,
    };
  }

  const layout: HqWorldLayout = {
    tileWidth: HQ_TILE_WIDTH,
    tileHeight: HQ_TILE_HEIGHT,
    wallHeight: HQ_WALL_HEIGHT,
    activeFloorIndex,
    visibleFloorIndexes:
      visibleFloorLayouts.length > 0
        ? visibleFloorLayouts.map((floor) => floor.floorIndex)
        : [activeFloorIndex],
    floorOffsets: visibleFloorLayouts
      .map((floor) => floorOffsets.get(floor.floorIndex))
      .filter((floor): floor is HqFloorOffset => floor !== undefined),
    originX: originX + dx,
    originY: originY + dy,
    minX: bounds.minX,
    minY: bounds.minY,
    worldWidth: bounds.maxX - bounds.minX + WORLD_MARGIN_X,
    worldHeight: bounds.maxY - bounds.minY + WORLD_MARGIN_Y,
    buildingWorldSize,
  };

  return {
    layout,
    rooms: shiftedRooms,
    expansionSlots: shiftedExpansionSlots,
    modular: { floorTiles, wallSegments, perimeterTiles },
    roomProps: shiftedProps,
    scenery: shiftedScenery,
    navGraph,
  };
}

// ── Backdrop snapshot ────────────────────────────────────────────────────

function buildBackdropSnapshot(
  minuteOfDay: number,
  buildingId?: string,
): HqBackdropSnapshot | null {
  const renderConfig = getBuildingRenderConfig(buildingId);
  const manifest = buildingId
    ? getHqBackdropManifestForBuilding(buildingId)
    : getHqBackdropManifest();
  if (!manifest) return null;

  const phase = resolveTimeOfDayPhase(minuteOfDay);
  const profile = manifest.phases[phase];

  return {
    phase,
    profileId: manifest.profileId,
    elevationBandId: manifest.elevationBandId,
    assetRoot: renderConfig.paths.partsRoot,
    zones: profile.zones,
    ambientTint: profile.ambientTint,
    fogColor: profile.fogColor,
    shadowIntensity: profile.shadowIntensity,
  };
}

// ── Snapshot assembly ─────────────────────────────────────────────────────

export function createHqWorldSnapshot(
  buildingName: string,
  geometry: HqWorldGeometry,
  actors: readonly ActorMarker[],
  minuteOfDay?: number,
  buildingId?: string,
): HqWorldSnapshot {
  const backdrop =
    minuteOfDay !== undefined ? buildBackdropSnapshot(minuteOfDay, buildingId) : null;
  const phase = backdrop?.phase;

  return {
    buildingName,
    layout: geometry.layout,
    rooms: geometry.rooms,
    expansionSlots: geometry.expansionSlots,
    modular: geometry.modular,
    roomProps: geometry.roomProps,
    scenery: geometry.scenery,
    actors,
    navGraph: geometry.navGraph,
    effects: createEffectsWithOverrides(phase, {
      ambientTint: backdrop?.ambientTint,
      fogColor: backdrop?.fogColor,
      shadowIntensity: backdrop?.shadowIntensity,
    }),
    backdrop,
    focus: null,
  };
}
