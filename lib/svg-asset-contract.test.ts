import { describe, expect, it } from "vitest";

import {
  HQ_PROP_ASSET_PATHS,
  getHqBindingPreviewFootprint,
  getSvgAssets,
  getSvgContractViolations,
  getSvgRuntimeBindings,
  resolveHqEnvironmentAssetUrl,
  resolveBossArtAssetUrl,
  resolveHqRoomSceneAssetUrl,
  resolveOperatorPartAssetUrl,
  resolveRaidPartAssetUrl,
} from "./svg-asset-contract";

describe("svg asset contract", () => {
  it("resolves the bodega dining tier 1 room scene through the contract", () => {
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/bodega",
        "room/dining_area:tier_1",
        "room-state/dining-area:1",
      ),
    ).toBe("/data/svg-environments/hq/bodega/recipes/scene-the-dining-area.svg");
  });

  it("resolves upgraded HQ room scene swaps through the contract", () => {
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/bodega",
        "room/register:tier_1",
        "room-state/register:2",
      ),
    ).toBe("/data/svg-environments/hq/bodega/recipes/scene-the-register-2.svg");
  });

  it("resolves annex and extension bodega room scenes through the contract", () => {
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/bodega",
        "room/back_office:tier_1",
        "room-state/back_office:1",
      ),
    ).toBe("/data/svg-environments/hq/bodega/recipes/scene-the-back-office.svg");
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/bodega",
        "room/backstock:tier_1",
        "room-state/backstock:1",
      ),
    ).toBe("/data/svg-environments/hq/bodega/recipes/scene-the-backstock.svg");
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/bodega",
        "room/alley_staging:tier_1",
        "room-state/alley_staging:1",
      ),
    ).toBe("/data/svg-environments/hq/bodega/recipes/scene-the-alley.svg");
  });

  it("resolves Porter's room scenes through the contract", () => {
    expect(
      resolveHqRoomSceneAssetUrl("building/porters", "room/bar:tier_1", "room-state/bar:1"),
    ).toBe("/data/svg-environments/hq/porters/recipes/scene-the-bar.svg");
    expect(
      resolveHqRoomSceneAssetUrl(
        "building/porters",
        "room/workshop:tier_1",
        "room-state/workshop:1",
      ),
    ).toBe("/data/svg-environments/hq/porters/recipes/scene-the-workshop.svg");
  });

  it("builds preview footprints for staged Porter's waterfront rooms using their real tier", () => {
    expect(
      getHqBindingPreviewFootprint({
        kind: "hq-room-scene",
        id: "test/dock",
        label: "Dock 1",
        family: "hq",
        usage: "live",
        status: "approved",
        buildingId: "building/porters",
        templateId: "room/dock:tier_1",
        roomStateId: "room-state/dock:1",
        slotId: "slot/dock",
        floorIndex: 2,
        assetId: "/data/svg-environments/hq/porters/recipes/scene-the-dock.svg",
      }),
    ).toMatchObject({
      buildingTier: 5,
      reservedFootprint: { col: 0, row: 0, cols: 6, rows: 4 },
      activeFootprint: { col: 0, row: 0, cols: 6, rows: 4 },
    });

    expect(
      getHqBindingPreviewFootprint({
        kind: "hq-room-scene",
        id: "test/workshop",
        label: "Workshop 1",
        family: "hq",
        usage: "live",
        status: "approved",
        buildingId: "building/porters",
        templateId: "room/workshop:tier_1",
        roomStateId: "room-state/workshop:1",
        slotId: "slot/workshop",
        floorIndex: 2,
        assetId: "/data/svg-environments/hq/porters/recipes/scene-the-workshop.svg",
      }),
    ).toMatchObject({
      buildingTier: 6,
      reservedFootprint: { col: 0, row: 4, cols: 12, rows: 4 },
      activeFootprint: { col: 0, row: 4, cols: 12, rows: 4 },
    });
  });

  it("shares fallback HQ prop asset paths between runtime and contract bindings", () => {
    expect(resolveHqEnvironmentAssetUrl("building/bodega", "desk")).toBe(
      `/data/svg-environments/hq/bodega/parts/${HQ_PROP_ASSET_PATHS.desk}`,
    );
  });

  it("does not resolve removed shell or structure review artifacts", () => {
    expect(resolveHqEnvironmentAssetUrl("building/bodega", "shell/iso-bodega-shell")).toBeNull();
    expect(resolveHqEnvironmentAssetUrl("building/bodega", "structure/iso-door-interior")).toBe(
      null,
    );
  });

  it("keeps live operator recipes and library gear in the same registry", () => {
    const bindings = getSvgRuntimeBindings();
    const assets = getSvgAssets();

    expect(bindings.some((binding) => binding.kind === "operator-recipe")).toBe(true);
    expect(
      assets.some(
        (asset) =>
          asset.family === "operator" &&
          asset.usage === "library" &&
          asset.sourcePath === "/data/svg-parts/operators/parts/weapon/katana.svg",
      ),
    ).toBe(true);
    expect(resolveOperatorPartAssetUrl("weapon/katana")).toBe(
      "/data/svg-parts/operators/parts/weapon/katana.svg",
    );
  });

  it("resolves raid family and boss art through the shared contract", () => {
    expect(resolveRaidPartAssetUrl("enemy/family-tunnel-crawlers")).toBe(
      "/data/svg-environments/raids/enemies/tunnel-crawlers.svg",
    );
    expect(resolveBossArtAssetUrl("boss/tunneler-brood-mother")).toBe(
      "/data/svg-environments/raids/bosses/tunneler-brood-mother.svg",
    );
  });

  it("does not ship missing-file or missing-asset contract violations", () => {
    const violations = getSvgContractViolations();

    expect(violations.filter((violation) => violation.kind !== "duplicate-binding")).toEqual([]);
  });
});
