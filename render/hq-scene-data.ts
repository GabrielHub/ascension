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

const SVG_TENEMENT_LEFT: HqSvgPlacementMeta = {
  svgAnchorX: 140,
  svgAnchorY: 480,
  viewBox: [0, 0, 280, 480],
};

const SVG_TENEMENT_RIGHT: HqSvgPlacementMeta = {
  svgAnchorX: 140,
  svgAnchorY: 480,
  viewBox: [0, 0, 280, 480],
};

const SVG_GARDEN: HqSvgPlacementMeta = {
  svgAnchorX: 150,
  svgAnchorY: 80,
  viewBox: [0, 0, 300, 220],
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

const SVG_AWNING: HqSvgPlacementMeta = {
  svgAnchorX: 100,
  svgAnchorY: 58,
  viewBox: [0, 0, 200, 70],
};

// ── Bodega exterior placements ──────────────────────────────────────────

const BODEGA_EXTERIOR_PLACEMENTS: readonly HqStaticPlacementDef[] = [
  // ── Main adjacent tenement (LEFT side) ───────────────────────────────
  {
    id: "scenery/building-left",
    assetId: "background/iso-bg-tenement-left",
    assetUrl: bodegaBg("iso-bg-tenement-left.svg"),
    kind: "exterior",
    col: -3,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TENEMENT_LEFT,
    footprintCols: 5,
    footprintRows: 7,
    width: 280,
    height: 480,
    zIndex: 2,
    opacity: 0.92,
    scale: 1.0,
    tags: ["building", "adjacent", "left", "tenement"],
  },
  // ── Main adjacent tenement (RIGHT side) ──────────────────────────────
  {
    id: "scenery/building-right",
    assetId: "background/iso-bg-tenement-right",
    assetUrl: bodegaBg("iso-bg-tenement-right.svg"),
    kind: "exterior",
    col: 12,
    row: 18,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TENEMENT_RIGHT,
    footprintCols: 5,
    footprintRows: 7,
    width: 280,
    height: 480,
    zIndex: 2,
    opacity: 0.9,
    scale: 1.0,
    tags: ["building", "adjacent", "right", "tenement"],
  },
  // ── Small right-side pocket greenery (not a full park) ───────────────
  {
    id: "scenery/garden-side-lot",
    assetId: "background/iso-bg-garden",
    assetUrl: bodegaBg("iso-bg-garden.svg"),
    kind: "exterior",
    col: 15,
    row: 13,
    anchorMode: "iso-center",
    svgMeta: SVG_GARDEN,
    footprintCols: 3,
    footprintRows: 3,
    width: 300,
    height: 220,
    zIndex: 3,
    opacity: 0.76,
    scale: 0.72,
    tags: ["garden", "side-lot", "right"],
  },
  // ── Street tree (front sidewalk, right side) ─────────────────────────
  {
    id: "scenery/tree-right",
    assetId: "background/iso-bg-tree-street",
    assetUrl: bodegaBg("iso-bg-tree-street.svg"),
    kind: "exterior",
    col: 14,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TREE_STREET,
    footprintCols: 1,
    footprintRows: 1,
    width: 60,
    height: 100,
    zIndex: 9,
    opacity: 0.82,
    scale: 1.2,
    tags: ["tree", "sidewalk", "right"],
  },
  // ── Storefront awning (front edge of the bodega shell) ───────────────
  {
    id: "scenery/storefront-awning",
    assetId: "background/iso-bg-awning",
    assetUrl: bodegaBg("iso-bg-awning.svg"),
    kind: "decoration",
    col: 5,
    row: 19,
    anchorMode: "iso-bottom",
    svgMeta: SVG_AWNING,
    footprintCols: 3,
    footprintRows: 1,
    width: 200,
    height: 70,
    zIndex: 12,
    opacity: 0.96,
    scale: 1.1,
    offsetY: -14,
    tags: ["awning", "storefront", "bodega"],
  },
  // ── Hydrant (front-right sidewalk corner) ────────────────────────────
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
    opacity: 0.86,
    scale: 1.04,
    tags: ["hydrant", "sidewalk"],
  },
  // ── Lamppost (front sidewalk, left of storefront) ────────────────────
  {
    id: "scenery/lamp",
    assetId: "background/iso-bg-lamppost",
    assetUrl: bodegaBg("iso-bg-lamppost.svg"),
    kind: "exterior",
    col: 1,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_LAMPPOST,
    footprintCols: 1,
    footprintRows: 1,
    width: 48,
    height: 180,
    zIndex: 10,
    opacity: 0.82,
    scale: 0.88,
    tags: ["lamppost", "sidewalk"],
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
