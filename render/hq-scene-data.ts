/**
 * HQ static scene composition data.
 *
 * Each building owns one exterior scene composition expressed as grid-anchored
 * placements. All positions use isometric col/row coordinates — no raw screen
 * x/y. The projection function in hq-world.ts converts these to screen-space
 * HqSpritePlacement records at composition time.
 *
 * Placement contract:
 * - Every placement specifies `svgMeta` with the asset's viewBox and an anchor
 *   point in SVG user-space.  The renderer derives screen dimensions from
 *   `viewBox × scale` and maps the SVG anchor to the grid point (col, row).
 * - `width`/`height` mirror the viewBox dimensions for documentation only.
 * - `scale` adjusts visual size relative to the grid (1.0 = SVG natural size).
 * - `offsetX`/`offsetY` are small fine-tuning corrections, not the primary contract.
 * - `footprintCols`/`footprintRows` are builder metadata (not used by renderer).
 */

import type { HqSceneComposition, HqStaticPlacementDef, HqSvgPlacementMeta } from "./types";

// ── Bodega exterior scene ────────────────────────────────────────────────
//
// Grid reference: bodega shell is col 0..10, row 0..18.
// Exterior placements use absolute grid coordinates relative to that shell.

const BODEGA_BG = "/data/svg-environments/hq/bodega/parts/background";

function bodegaBg(filename: string): string {
  return `${BODEGA_BG}/${filename}`;
}

// ── SVG metadata catalog ────────────────────────────────────────────────
//
// Each entry describes the SVG viewBox and the anchor point (in SVG coords)
// that maps to the grid coordinate. Derived from the SVG file itself.

const SVG_BUILDING_TALL: HqSvgPlacementMeta = {
  svgAnchorX: 340,
  svgAnchorY: 650,
  viewBox: [0, -155, 760, 905],
};

const SVG_GARDEN: HqSvgPlacementMeta = {
  svgAnchorX: 150,
  svgAnchorY: 80,
  viewBox: [0, 0, 300, 220],
};

const SVG_BACK_ALLEY: HqSvgPlacementMeta = {
  svgAnchorX: 300,
  svgAnchorY: 155,
  viewBox: [0, 0, 600, 310],
};

const SVG_TREE_STREET: HqSvgPlacementMeta = {
  svgAnchorX: 30,
  svgAnchorY: 100,
  viewBox: [0, 0, 60, 100],
};

const SVG_HYDRANT: HqSvgPlacementMeta = {
  svgAnchorX: 20,
  svgAnchorY: 56,
  viewBox: [0, 0, 40, 56],
};

const SVG_LAMPPOST: HqSvgPlacementMeta = {
  svgAnchorX: 24,
  svgAnchorY: 180,
  viewBox: [0, 0, 48, 180],
};

const SVG_BENCH: HqSvgPlacementMeta = {
  svgAnchorX: 36,
  svgAnchorY: 58,
  viewBox: [0, 0, 72, 58],
};

const SVG_MAILBOX: HqSvgPlacementMeta = {
  svgAnchorX: 18,
  svgAnchorY: 52,
  viewBox: [0, 0, 36, 52],
};

// ── Bodega exterior placements ──────────────────────────────────────────

const BODEGA_EXTERIOR_PLACEMENTS: readonly HqStaticPlacementDef[] = [
  // ── Apartment building (LEFT side, 2-tile gap from bodega) ──
  // Facade runs along the bodega's left edge. Front corner base anchored to grid.
  {
    id: "scenery/building-left",
    assetId: "background/iso-bg-building-tall",
    assetUrl: bodegaBg("iso-bg-building-tall.svg"),
    kind: "exterior",
    col: -2,
    row: 18,
    anchorMode: "iso-bottom",
    svgMeta: SVG_BUILDING_TALL,
    footprintCols: 7,
    footprintRows: 8,
    width: 760,
    height: 905,
    zIndex: 2,
    opacity: 0.85,
    scale: 1.15,
    tags: ["building", "adjacent", "left"],
  },
  // ── Building (BEHIND the left apartment, peeks out upper-left) ──
  {
    id: "scenery/building-behind",
    assetId: "background/iso-bg-building-tall",
    assetUrl: bodegaBg("iso-bg-building-tall.svg"),
    kind: "exterior",
    col: -12,
    row: 14,
    anchorMode: "iso-bottom",
    svgMeta: SVG_BUILDING_TALL,
    footprintCols: 7,
    footprintRows: 8,
    width: 760,
    height: 905,
    zIndex: 1,
    opacity: 0.6,
    scale: 1.0,
    tags: ["building", "adjacent", "rear"],
  },
  // ── Garden park (RIGHT side, 2×2 diamond arrangement) ──
  // Four garden patches arranged as a larger park to fill the right side.
  {
    id: "scenery/garden-top",
    assetId: "background/iso-bg-garden",
    assetUrl: bodegaBg("iso-bg-garden.svg"),
    kind: "exterior",
    col: 14,
    row: 8,
    anchorMode: "iso-center",
    svgMeta: SVG_GARDEN,
    footprintCols: 3,
    footprintRows: 3,
    width: 300,
    height: 220,
    zIndex: 3,
    opacity: 0.9,
    scale: 1.0,
    tags: ["garden", "park", "right"],
  },
  {
    id: "scenery/garden-bottom",
    assetId: "background/iso-bg-garden",
    assetUrl: bodegaBg("iso-bg-garden.svg"),
    kind: "exterior",
    col: 18,
    row: 12,
    anchorMode: "iso-center",
    svgMeta: SVG_GARDEN,
    footprintCols: 3,
    footprintRows: 3,
    width: 300,
    height: 220,
    zIndex: 3,
    opacity: 0.9,
    scale: 1.0,
    tags: ["garden", "park", "right"],
  },
  {
    id: "scenery/garden-left",
    assetId: "background/iso-bg-garden",
    assetUrl: bodegaBg("iso-bg-garden.svg"),
    kind: "exterior",
    col: 14,
    row: 12,
    anchorMode: "iso-center",
    svgMeta: SVG_GARDEN,
    footprintCols: 3,
    footprintRows: 3,
    width: 300,
    height: 220,
    zIndex: 3,
    opacity: 0.9,
    scale: 1.0,
    tags: ["garden", "park", "right"],
  },
  {
    id: "scenery/garden-right",
    assetId: "background/iso-bg-garden",
    assetUrl: bodegaBg("iso-bg-garden.svg"),
    kind: "exterior",
    col: 18,
    row: 8,
    anchorMode: "iso-center",
    svgMeta: SVG_GARDEN,
    footprintCols: 3,
    footprintRows: 3,
    width: 300,
    height: 220,
    zIndex: 3,
    opacity: 0.9,
    scale: 1.0,
    tags: ["garden", "park", "right"],
  },
  // ── Street tree (front sidewalk, right side) ──
  {
    id: "scenery/tree-right",
    assetId: "background/iso-bg-tree-street",
    assetUrl: bodegaBg("iso-bg-tree-street.svg"),
    kind: "exterior",
    col: 12,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TREE_STREET,
    footprintCols: 1,
    footprintRows: 1,
    width: 60,
    height: 100,
    zIndex: 9,
    opacity: 0.9,
    scale: 2.1,
    tags: ["tree", "sidewalk", "right"],
  },
  // ── Street tree (front sidewalk, left side) ──
  {
    id: "scenery/tree-left",
    assetId: "background/iso-bg-tree-street",
    assetUrl: bodegaBg("iso-bg-tree-street.svg"),
    kind: "exterior",
    col: -1,
    row: 21,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TREE_STREET,
    footprintCols: 1,
    footprintRows: 1,
    width: 60,
    height: 100,
    zIndex: 9,
    opacity: 0.85,
    scale: 1.8,
    tags: ["tree", "sidewalk", "left"],
  },
  // ── Back alley scene (behind bodega) ──
  {
    id: "scenery/back-alley",
    assetId: "background/iso-bg-back-alley",
    assetUrl: bodegaBg("iso-bg-back-alley.svg"),
    kind: "exterior",
    col: 5,
    row: -3,
    anchorMode: "iso-center",
    svgMeta: SVG_BACK_ALLEY,
    footprintCols: 12,
    footprintRows: 5,
    width: 600,
    height: 310,
    zIndex: 4,
    opacity: 0.85,
    scale: 1.0,
    tags: ["alley", "rear"],
  },
  // ── Hydrant (front-right sidewalk corner) ──
  {
    id: "scenery/hydrant",
    assetId: "background/iso-bg-hydrant",
    assetUrl: bodegaBg("iso-bg-hydrant.svg"),
    kind: "exterior",
    col: 11,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_HYDRANT,
    footprintCols: 1,
    footprintRows: 1,
    width: 40,
    height: 56,
    zIndex: 10,
    opacity: 0.85,
    scale: 1.1,
    tags: ["hydrant", "sidewalk"],
  },
  // ── Lamppost (front sidewalk, center) ──
  {
    id: "scenery/lamp",
    assetId: "background/iso-bg-lamppost",
    assetUrl: bodegaBg("iso-bg-lamppost.svg"),
    kind: "exterior",
    col: 5,
    row: 21,
    anchorMode: "iso-bottom",
    svgMeta: SVG_LAMPPOST,
    footprintCols: 1,
    footprintRows: 1,
    width: 48,
    height: 180,
    zIndex: 10,
    opacity: 0.85,
    scale: 1.0,
    tags: ["lamppost", "sidewalk"],
  },
  // ── Bench (front sidewalk, right of lamppost) ──
  {
    id: "scenery/bench",
    assetId: "background/iso-bg-bench",
    assetUrl: bodegaBg("iso-bg-bench.svg"),
    kind: "exterior",
    col: 7,
    row: 21,
    anchorMode: "iso-bottom",
    svgMeta: SVG_BENCH,
    footprintCols: 1,
    footprintRows: 1,
    width: 72,
    height: 58,
    zIndex: 10,
    opacity: 0.85,
    scale: 0.9,
    tags: ["bench", "sidewalk"],
  },
  // ── Mailbox (front sidewalk, right side) ──
  {
    id: "scenery/mailbox",
    assetId: "background/iso-bg-mailbox",
    assetUrl: bodegaBg("iso-bg-mailbox.svg"),
    kind: "exterior",
    col: 10,
    row: 21,
    anchorMode: "iso-bottom",
    svgMeta: SVG_MAILBOX,
    footprintCols: 1,
    footprintRows: 1,
    width: 36,
    height: 52,
    zIndex: 10,
    opacity: 0.85,
    scale: 0.85,
    tags: ["mailbox", "sidewalk"],
  },
];

const BODEGA_EXTERIOR_SCENE: HqSceneComposition = {
  buildingId: "building/bodega",
  sceneId: "bodega-exterior",
  placements: BODEGA_EXTERIOR_PLACEMENTS,
};

// ── Scene lookup ─────────────────────────────────────────────────────────

const EXTERIOR_SCENES: Readonly<Record<string, HqSceneComposition>> = {
  "building/bodega": BODEGA_EXTERIOR_SCENE,
};

/** Return the exterior scene composition for a building, or undefined if none exists. */
export function getExteriorScene(buildingId: string): HqSceneComposition | undefined {
  return EXTERIOR_SCENES[buildingId];
}
