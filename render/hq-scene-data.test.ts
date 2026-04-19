import { describe, expect, it } from "vitest";

import { resolveHqEnvironmentAssetUrl } from "lib/svg-asset-contract";

import { getExteriorScene } from "./hq-scene-data";

describe("hq scene data", () => {
  it("resolves exterior placements through the shared environment contract", () => {
    for (const buildingId of ["building/bodega", "building/porters"]) {
      const scene = getExteriorScene(buildingId);
      expect(scene).toBeTruthy();

      for (const placement of scene?.placements ?? []) {
        expect(placement.assetUrl).toBe(
          resolveHqEnvironmentAssetUrl(buildingId, placement.assetId),
        );
      }
    }
  });
});
