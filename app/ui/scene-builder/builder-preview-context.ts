import type { HqTimeOfDayPhase } from "lib/hq-time-phase";
import { buildPerimeterTiles } from "render/hq-world";

import type { BuilderShell } from "./builder-types";

export type BuilderPreviewPerimeterKind =
  | "sidewalk"
  | "street"
  | "alley"
  | "void"
  | "pier"
  | "water";

export interface BuilderPreviewPerimeterTile {
  col: number;
  row: number;
  kind: BuilderPreviewPerimeterKind;
}

type PerimeterPalette = Record<BuilderPreviewPerimeterKind, string>;

export const BUILDER_PERIMETER_FILLS: Record<HqTimeOfDayPhase, PerimeterPalette> = {
  day: {
    sidewalk: "#6e645a",
    street: "#3a3a44",
    alley: "#2e2e38",
    void: "#24242e",
    pier: "#4a3e2e",
    water: "#1a3d52",
  },
  sunrise: {
    sidewalk: "#5a4e3e",
    street: "#2e2824",
    alley: "#201c18",
    void: "#181410",
    pier: "#3e3224",
    water: "#2a3a3e",
  },
  sunset: {
    sidewalk: "#5a4430",
    street: "#2c2220",
    alley: "#1e1614",
    void: "#161010",
    pier: "#3e2e20",
    water: "#2a2e30",
  },
  night: {
    sidewalk: "#3c362a",
    street: "#1a1a20",
    alley: "#0e0e14",
    void: "#0a0a0e",
    pier: "#1e1a14",
    water: "#0c1a24",
  },
};

export const BUILDER_PERIMETER_STROKES: Record<HqTimeOfDayPhase, PerimeterPalette> = {
  day: {
    sidewalk: "rgba(255, 255, 255, 0.10)",
    street: "rgba(255, 255, 255, 0.04)",
    alley: "rgba(255, 255, 255, 0.03)",
    void: "rgba(255, 255, 255, 0.01)",
    pier: "rgba(255, 255, 255, 0.06)",
    water: "rgba(140, 200, 255, 0.08)",
  },
  sunrise: {
    sidewalk: "rgba(255, 220, 180, 0.08)",
    street: "rgba(255, 220, 180, 0.03)",
    alley: "rgba(255, 220, 180, 0.02)",
    void: "rgba(255, 220, 180, 0.005)",
    pier: "rgba(255, 220, 180, 0.05)",
    water: "rgba(255, 200, 140, 0.06)",
  },
  sunset: {
    sidewalk: "rgba(255, 180, 120, 0.10)",
    street: "rgba(255, 180, 120, 0.04)",
    alley: "rgba(255, 180, 120, 0.03)",
    void: "rgba(255, 180, 120, 0.01)",
    pier: "rgba(255, 180, 120, 0.06)",
    water: "rgba(255, 160, 80, 0.08)",
  },
  night: {
    sidewalk: "rgba(255, 255, 255, 0.05)",
    street: "rgba(255, 255, 255, 0.02)",
    alley: "rgba(255, 255, 255, 0.015)",
    void: "rgba(255, 255, 255, 0.005)",
    pier: "rgba(255, 255, 255, 0.03)",
    water: "rgba(100, 160, 220, 0.04)",
  },
};

export function buildBuilderPreviewPerimeterTiles(
  shell: BuilderShell | null,
  buildingId?: string,
): BuilderPreviewPerimeterTile[] {
  if (!shell) {
    return [];
  }

  // Delegate to the shared perimeter builder so the scene builder and the
  // HQ world renderer always agree on street geometry (corner layouts,
  // zone widths, waterfront, etc.).
  return buildPerimeterTiles([shell], buildingId).sort(
    (left, right) => left.col + left.row - (right.col + right.row),
  );
}

export function buildBuilderPreviewPerimeterKindMap(
  tiles: readonly BuilderPreviewPerimeterTile[],
): ReadonlyMap<string, BuilderPreviewPerimeterKind> {
  return new Map(tiles.map((tile) => [`${tile.col},${tile.row}`, tile.kind]));
}

export interface BuilderCenterLaneSets {
  /** Tiles on the center of a row-direction road (iso-right slope). */
  rowSet: ReadonlySet<string>;
  /** Tiles on the center of a col-direction road (iso-left slope). */
  colSet: ReadonlySet<string>;
}

export function buildBuilderPreviewCenterLaneSets(
  tiles: readonly BuilderPreviewPerimeterTile[],
): BuilderCenterLaneSets {
  const kindMap = buildBuilderPreviewPerimeterKindMap(tiles);
  const MAX_ROAD_WIDTH = 14;
  const rowSet = new Set<string>();
  const colSet = new Set<string>();

  for (const tile of tiles) {
    if (tile.kind !== "street") continue;

    // Row direction: count contiguous street tiles above/below
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
    const isRowCenter =
      streetsAbove >= 2 &&
      streetsBelow >= 2 &&
      Math.abs(streetsAbove - streetsBelow) <= 1 &&
      streetsAbove + streetsBelow + 1 <= MAX_ROAD_WIDTH;

    // Col direction: count contiguous street tiles left/right
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

    if (isRowCenter && !isColCenter) rowSet.add(`${tile.col},${tile.row}`);
    else if (isColCenter && !isRowCenter) colSet.add(`${tile.col},${tile.row}`);
  }

  return { rowSet, colSet };
}
