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
import { getRoomStateId } from "./hq-room-state";

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

  it("resolves every skyscraper room scene through the contract", () => {
    const expectedScenes = [
      ["room/lobby:tier_1", "room-state/lobby:1", "scene-the-lobby"],
      ["room/reception:tier_1", "room-state/reception:1", "scene-the-reception-desk"],
      ["room/bullpen:tier_1", "room-state/bullpen:1", "scene-the-bullpen"],
      [
        "room/situation_room:tier_1",
        getRoomStateId("room/situation_room:tier_1", []),
        "scene-the-situation-room",
      ],
      ["room/clinic:tier_1", "room-state/clinic:1", "scene-the-clinic"],
      ["room/dojo:tier_1", "room-state/dojo:1", "scene-the-dojo"],
      [
        "room/crew_lounge:tier_1",
        getRoomStateId("room/crew_lounge:tier_1", []),
        "scene-the-crew-lounge",
      ],
      [
        "room/supply_hall:tier_1",
        getRoomStateId("room/supply_hall:tier_1", []),
        "scene-the-supply-hall",
      ],
      [
        "room/fabrication_bay:tier_1",
        getRoomStateId("room/fabrication_bay:tier_1", []),
        "scene-the-fabrication-bay",
      ],
      [
        "room/rooftop_helipad:tier_1",
        getRoomStateId("room/rooftop_helipad:tier_1", []),
        "scene-the-helipad",
      ],
      [
        "room/sky_garden:tier_1",
        getRoomStateId("room/sky_garden:tier_1", []),
        "scene-the-sky-garden",
      ],
      ["room/club:tier_1", "room-state/club:1", "scene-the-club"],
      [
        "room/green_room:tier_1",
        getRoomStateId("room/green_room:tier_1", []),
        "scene-the-green-room",
      ],
      [
        "room/drill_floor:tier_1",
        getRoomStateId("room/drill_floor:tier_1", []),
        "scene-the-drill-floor",
      ],
      [
        "room/recon_course:tier_1",
        getRoomStateId("room/recon_course:tier_1", []),
        "scene-the-recon-course",
      ],
      [
        "room/trauma_bay:tier_1",
        getRoomStateId("room/trauma_bay:tier_1", []),
        "scene-the-trauma-bay",
      ],
      [
        "room/executive_office:tier_1",
        getRoomStateId("room/executive_office:tier_1", []),
        "scene-the-executive-office",
      ],
      [
        "room/compliance_office:tier_1",
        getRoomStateId("room/compliance_office:tier_1", []),
        "scene-the-compliance-office",
      ],
      ["room/war_room:tier_1", getRoomStateId("room/war_room:tier_1", []), "scene-the-war-room"],
      [
        "room/sky_lounge:tier_1",
        getRoomStateId("room/sky_lounge:tier_1", []),
        "scene-the-sky-lounge",
      ],
      [
        "room/private_cellar:tier_1",
        getRoomStateId("room/private_cellar:tier_1", []),
        "scene-the-private-cellar",
      ],
    ] as const;

    for (const [templateId, roomStateId, fileBase] of expectedScenes) {
      expect(resolveHqRoomSceneAssetUrl("building/skyscraper", templateId, roomStateId)).toBe(
        `/data/svg-environments/hq/skyscraper/recipes/${fileBase}.svg`,
      );
    }
  });

  it("carries per-room scene overrides for skyscraper scenes whose slot differs from canonical 4x3", () => {
    const bindings = getSvgRuntimeBindings();
    const complianceBinding = bindings.find(
      (binding) =>
        binding.kind === "hq-room-scene" &&
        binding.buildingId === "building/skyscraper" &&
        binding.templateId === "room/compliance_office:tier_1",
    );
    expect(complianceBinding).toBeDefined();
    if (complianceBinding?.kind === "hq-room-scene") {
      expect(complianceBinding.sceneFootprint).toEqual({ cols: 4, rows: 6 });
      expect(complianceBinding.sceneViewBox).toEqual({
        minX: -70,
        minY: 0,
        width: 520,
        height: 460,
      });
      expect(complianceBinding.sceneOrigin).toEqual([200, 100]);
    }

    const skyLoungeBinding = bindings.find(
      (binding) =>
        binding.kind === "hq-room-scene" &&
        binding.buildingId === "building/skyscraper" &&
        binding.templateId === "room/sky_lounge:tier_1",
    );
    expect(skyLoungeBinding).toBeDefined();
    if (skyLoungeBinding?.kind === "hq-room-scene") {
      expect(skyLoungeBinding.sceneFootprint).toEqual({ cols: 13, rows: 8 });
      expect(skyLoungeBinding.sceneViewBox).toEqual({
        minX: -130,
        minY: 0,
        width: 1120,
        height: 700,
      });
    }

    const greenRoomBinding = bindings.find(
      (binding) =>
        binding.kind === "hq-room-scene" &&
        binding.buildingId === "building/skyscraper" &&
        binding.templateId === "room/green_room:tier_1",
    );
    expect(greenRoomBinding).toBeDefined();
    if (greenRoomBinding?.kind === "hq-room-scene") {
      expect(greenRoomBinding.sceneFootprint).toEqual({ cols: 5, rows: 6 });
      expect(greenRoomBinding.sceneViewBox).toEqual({
        minX: -80,
        minY: 0,
        width: 600,
        height: 460,
      });
    }
  });

  it("resolves skyscraper shell and backdrop SVGs to their skyscraper asset paths", () => {
    expect(resolveHqEnvironmentAssetUrl("building/skyscraper", "shell/skyscraper-core-shell")).toBe(
      "/data/svg-environments/hq/skyscraper/parts/shell/skyscraper-core-shell.svg",
    );
    expect(
      resolveHqEnvironmentAssetUrl("building/skyscraper", "background/iso-bg-tower-altitude-day"),
    ).toBe("/data/svg-environments/hq/skyscraper/parts/background/iso-bg-tower-altitude-day.svg");
    expect(
      resolveHqEnvironmentAssetUrl(
        "building/skyscraper",
        "background/iso-bg-tower-altitude-sunrise",
      ),
    ).toBe(
      "/data/svg-environments/hq/skyscraper/parts/background/iso-bg-tower-altitude-sunrise.svg",
    );
    expect(
      resolveHqEnvironmentAssetUrl("building/skyscraper", "background/iso-bg-tower-altitude-night"),
    ).toBe("/data/svg-environments/hq/skyscraper/parts/background/iso-bg-tower-altitude-night.svg");
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
