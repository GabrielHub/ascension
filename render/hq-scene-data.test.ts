import { describe, expect, it } from "vitest";

import { resolveHqEnvironmentAssetUrl } from "lib/svg-asset-contract";

import { getExteriorScene } from "./hq-scene-data";

describe("hq scene data", () => {
  it("resolves exterior placements through the shared environment contract", () => {
    for (const buildingId of ["building/bodega", "building/porters", "building/skyscraper"]) {
      const scene = getExteriorScene(buildingId);
      expect(scene).toBeTruthy();

      for (const placement of scene?.placements ?? []) {
        expect(placement.assetUrl).toBe(
          resolveHqEnvironmentAssetUrl(buildingId, placement.assetId),
        );
      }
    }
  });

  it("registers an empty skyscraper exterior scene before backdrops exist", () => {
    const scene = getExteriorScene("building/skyscraper");
    expect(scene).toBeTruthy();
    expect(scene!.buildingId).toBe("building/skyscraper");
    expect(scene!.sceneId).toBe("skyscraper-exterior");
    expect(scene!.placements).toHaveLength(0);
  });
});
