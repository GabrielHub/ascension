import { describe, expect, it } from "vitest";

import {
  buildScenePlacementOrigin,
  buildSvgPlacementMeta,
  defaultZIndexForAssetCategory,
  parseSvgViewBox,
  placementKindForAssetCategory,
} from "./builder-asset-meta";

describe("parseSvgViewBox", () => {
  it("parses numeric viewBox values from SVG markup", () => {
    expect(parseSvgViewBox('<svg viewBox="20 0 420 310"></svg>')).toEqual([20, 0, 420, 310]);
  });

  it("rejects missing or malformed viewBox values", () => {
    expect(parseSvgViewBox("<svg></svg>")).toBeNull();
    expect(parseSvgViewBox('<svg viewBox="0 0 nope 310"></svg>')).toBeNull();
  });
});

describe("placement metadata helpers", () => {
  it("derives an isometric bottom-center SVG anchor from the viewBox", () => {
    expect(buildSvgPlacementMeta([20, 0, 420, 310])).toEqual({
      svgAnchorX: 230,
      svgAnchorY: 310,
      viewBox: [20, 0, 420, 310],
    });
  });

  it("maps scene contracts to legacy room-scene origins", () => {
    expect(
      buildScenePlacementOrigin({
        building: "bodega",
        tileWidth: 96,
        tileHeight: 48,
        wallHeight: 84,
        canonicalOrigin: [200, 100],
        canonicalViewBox: {
          minX: 20,
          minY: 0,
          width: 420,
          height: 310,
        },
        roomFootprint: {
          cols: 4,
          rows: 3,
        },
      }),
    ).toEqual({
      svgOriginX: 200,
      svgOriginY: 100,
      viewBoxMinX: 20,
      viewBoxMinY: 0,
    });
  });

  it("keeps placement kinds and default z-indices aligned with asset category intent", () => {
    expect(placementKindForAssetCategory("background")).toBe("exterior");
    expect(placementKindForAssetCategory("scene")).toBe("room-scene");
    expect(placementKindForAssetCategory("prop")).toBe("decoration");
    expect(defaultZIndexForAssetCategory("background")).toBe(2);
    expect(defaultZIndexForAssetCategory("scene")).toBe(30);
    expect(defaultZIndexForAssetCategory("prop")).toBe(10);
  });
});
