import { describe, expect, it } from "vitest";

import {
  BUILDER_PERIMETER_FILLS,
  buildBuilderPreviewCenterLaneSets,
  buildBuilderPreviewPerimeterTiles,
} from "./builder-preview-context";

describe("builder preview context", () => {
  it("builds sidewalk and street context around the active shell", () => {
    const tiles = buildBuilderPreviewPerimeterTiles({
      col: 0,
      row: 0,
      cols: 10,
      rows: 18,
      dirty: false,
    });

    expect(tiles.some((tile) => tile.kind === "street")).toBe(true);
    expect(tiles.some((tile) => tile.kind === "sidewalk")).toBe(true);
    // Sidewalk zone: maxRow+0 to maxRow+3 (rows 18–21)
    expect(
      tiles.some((tile) => tile.col === 0 && tile.row === 20 && tile.kind === "sidewalk"),
    ).toBe(true);
    // Street zone starts at maxRow+4 (row 22)
    expect(tiles.some((tile) => tile.col === 0 && tile.row === 22 && tile.kind === "street")).toBe(
      true,
    );
  });

  it("identifies the center lane for the generated road", () => {
    const tiles = buildBuilderPreviewPerimeterTiles({
      col: 0,
      row: 0,
      cols: 10,
      rows: 18,
      dirty: false,
    });

    // Street zone: rows 22–31 (10 tiles). Center at rows 26–27.
    const { rowSet } = buildBuilderPreviewCenterLaneSets(tiles);

    expect(rowSet.has("0,26")).toBe(true);
  });

  it("detects col-direction center lanes for corner streets", () => {
    const tiles = buildBuilderPreviewPerimeterTiles(
      { col: 0, row: 0, cols: 10, rows: 18, dirty: false },
      "building/bodega",
    );

    const { rowSet, colSet } = buildBuilderPreviewCenterLaneSets(tiles);

    // Main street (south): center lane in row direction
    expect(rowSet.has("0,26")).toBe(true);
    // Side street (east): center lane in col direction
    expect(colSet.has("18,5")).toBe(true);
    // Intersection area: no markings
    expect(rowSet.has("18,26")).toBe(false);
    expect(colSet.has("18,26")).toBe(false);
  });

  it("keeps builder lighting palettes aligned with the shipped runtime phases", () => {
    expect(BUILDER_PERIMETER_FILLS.day.street).toBe("#3a3a44");
    expect(BUILDER_PERIMETER_FILLS.night.street).toBe("#1a1a20");
  });
});
