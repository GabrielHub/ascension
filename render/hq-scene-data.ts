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

const SVG_TREE_STREET: HqSvgPlacementMeta = {
  svgAnchorX: 30,
  svgAnchorY: 100,
  viewBox: [0, 0, 60, 100],
};

const SVG_LAMPPOST: HqSvgPlacementMeta = {
  svgAnchorX: 24,
  svgAnchorY: 180,
  viewBox: [0, 0, 48, 180],
};

const SVG_BUILDING_TALL: HqSvgPlacementMeta = {
  svgAnchorX: 380,
  svgAnchorY: 750,
  viewBox: [0, -155, 760, 905],
};

const SVG_BENCH: HqSvgPlacementMeta = {
  svgAnchorX: 36,
  svgAnchorY: 58,
  viewBox: [0, 0, 72, 58],
};

// ── Bodega exterior placements ──────────────────────────────────────────

const BODEGA_EXTERIOR_PLACEMENTS: readonly HqStaticPlacementDef[] = [
  {
    id: "scenery/building-left",
    assetId: "background/iso-bg-tenement-left",
    assetUrl: bodegaBg("iso-bg-tenement-left.svg"),
    kind: "exterior",
    col: -1,
    row: 8,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TENEMENT_LEFT,
    width: 280,
    height: 480,
    zIndex: 2,
    opacity: 0.92,
    scale: 1,
    footprintCols: 5,
    footprintRows: 7,
    tags: ["building", "adjacent", "left", "tenement"],
  },
  {
    id: "scenery/tree-right",
    assetId: "background/iso-bg-tree-street",
    assetUrl: bodegaBg("iso-bg-tree-street.svg"),
    kind: "exterior",
    col: 5,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_TREE_STREET,
    width: 60,
    height: 100,
    zIndex: 9,
    opacity: 0.82,
    scale: 1.2,
    footprintCols: 1,
    footprintRows: 1,
    tags: ["tree", "sidewalk", "right"],
  },
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
  {
    id: "placement/background-iso-bg-building-tall-2",
    assetId: "background/iso-bg-building-tall",
    assetUrl: bodegaBg("iso-bg-building-tall.svg"),
    kind: "exterior",
    col: 1.5,
    row: 19.5,
    anchorMode: "iso-bottom",
    svgMeta: SVG_BUILDING_TALL,
    width: 760,
    height: 905,
    zIndex: 2,
    opacity: 1,
    scale: 1,
  },
  {
    id: "placement/background-iso-bg-bench-4",
    assetId: "background/iso-bg-bench",
    assetUrl: bodegaBg("iso-bg-bench.svg"),
    kind: "exterior",
    col: 4.5,
    row: 20,
    anchorMode: "iso-bottom",
    svgMeta: SVG_BENCH,
    width: 72,
    height: 58,
    zIndex: 2,
    opacity: 1,
    scale: 1,
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
