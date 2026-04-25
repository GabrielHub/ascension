import { describe, expect, it } from "vitest";

import {
  getBuildingShellCells,
  isCellInsideBuildingShell,
  isFootprintInsideBuildingShell,
  getBuildingLayout,
} from "content/building-layouts";
import {
  getHqEnvironmentRenderConfig,
  getHqEnvironmentRenderConfigForBuilding,
} from "lib/hq-environment-manifest";
import { getRoomStateId } from "lib/hq-room-state";

import {
  buildPerimeterTiles,
  composeHqWorldGeometry,
  createHqWorldSnapshot,
  getHqStructuralPalette,
} from "./hq-world";

function createRoomSeed(
  overrides: Partial<Parameters<typeof composeHqWorldGeometry>[0][number]> = {},
) {
  return {
    id: "room-instance/register",
    templateId: "room/register:tier_1",
    roomStateId: "room-state/register:1",
    slotId: "slot/register",
    floorIndex: 0,
    name: "The Register",
    tier: 1,
    isOperational: true,
    functionTag: "room:operations",
    reservedFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
    activeFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
    ...overrides,
  };
}

describe("HQ world navigation", () => {
  it("anchors room entry points to authored wall openings", () => {
    const geometry = composeHqWorldGeometry([createRoomSeed()]);

    const room = geometry.rooms.find((candidate) => candidate.id === "room-instance/register");
    const entry = geometry.navGraph.anchors.find(
      (candidate) => candidate.id === "room-instance/register/entry",
    );

    expect(room).toBeTruthy();
    expect(entry).toBeTruthy();
    expect(entry!.x).toBeLessThan(room!.bounds.x + room!.bounds.width / 2);
  });

  it("uses the recipes root for prebuilt room scenes", () => {
    const geometry = composeHqWorldGeometry([createRoomSeed()]);

    expect(geometry.roomProps).toHaveLength(1);
    expect(geometry.roomProps[0]?.assetUrl).toBe(
      "/data/svg-environments/hq/bodega/recipes/scene-the-register.svg",
    );
  });

  it("uses the shared scene contract for upgraded room-state scene swaps", () => {
    const geometry = composeHqWorldGeometry([
      createRoomSeed({
        roomStateId: "room-state/register:2",
      }),
    ]);

    expect(geometry.roomProps).toHaveLength(1);
    expect(geometry.roomProps[0]?.assetUrl).toBe(
      "/data/svg-environments/hq/bodega/recipes/scene-the-register-2.svg",
    );
  });

  it("resolves the dining area tier 1 room through the shared scene contract", () => {
    const geometry = composeHqWorldGeometry([
      createRoomSeed({
        id: "room-instance/dining",
        templateId: "room/dining_area:tier_1",
        roomStateId: "room-state/dining-area:1",
        slotId: "slot/dining-area",
        name: "The Dining Area",
        functionTag: "room:recovery",
        reservedFootprint: { col: 1, row: 15, cols: 8, rows: 3 },
        activeFootprint: { col: 1, row: 15, cols: 8, rows: 3 },
      }),
    ]);

    expect(geometry.roomProps).toHaveLength(1);
    expect(geometry.roomProps[0]?.assetUrl).toBe(
      "/data/svg-environments/hq/bodega/recipes/scene-the-dining-area.svg",
    );
  });

  it("centers room-scene assets inside non-canonical slot sizes", () => {
    const renderConfig = getHqEnvironmentRenderConfig().composition;
    const sceneSystem = renderConfig.sceneSystem;
    const cases = [
      { cols: 8, rows: 3 },
      { cols: 6, rows: 6 },
    ];

    for (const footprint of cases) {
      const geometry = composeHqWorldGeometry([
        createRoomSeed({
          id: `room-instance/register-${footprint.cols}x${footprint.rows}`,
          reservedFootprint: { col: 2, row: 2, cols: footprint.cols, rows: footprint.rows },
          activeFootprint: { col: 2, row: 2, cols: footprint.cols, rows: footprint.rows },
        }),
      ]);

      const room = geometry.rooms[0]!;
      const scene = geometry.roomProps[0]!;
      const dc = (footprint.cols - sceneSystem.roomFootprint.cols) / 2;
      const dr = (footprint.rows - sceneSystem.roomFootprint.rows) / 2;
      const expectedOffsetX =
        -(sceneSystem.canonicalOrigin[0] - sceneSystem.canonicalViewBox.minX) +
        (dc - dr) * (renderConfig.tileWidth / 2);
      const expectedOffsetY =
        -(sceneSystem.canonicalOrigin[1] - sceneSystem.canonicalViewBox.minY) +
        (dc + dr) * (renderConfig.tileHeight / 2);

      expect(scene.x - room.floorPoints[0]!.x).toBeCloseTo(expectedOffsetX, 6);
      expect(scene.y - room.floorPoints[0]!.y).toBeCloseTo(expectedOffsetY, 6);
    }
  });

  it("centers scenes inside a non-canonical skyscraper slot footprint via the shared scene system", () => {
    // The skyscraper ships multiple slot shapes that differ from the canonical
    // 4x3 scene frame (e.g. 2x5 compliance office, 7x5 lobby/sky lounge). This
    // test proves the shared centering math resolves correctly for a narrow
    // skyscraper slot using the shipped compliance-office scene binding.
    const skyscraperConfig = getHqEnvironmentRenderConfigForBuilding("building/skyscraper");
    const defaultConfig = getHqEnvironmentRenderConfig();
    const skyscraperScene = skyscraperConfig.composition.sceneSystem;
    const defaultScene = defaultConfig.composition.sceneSystem;
    expect(skyscraperScene.canonicalOrigin).toEqual(defaultScene.canonicalOrigin);
    expect(skyscraperScene.canonicalViewBox).toEqual(defaultScene.canonicalViewBox);
    expect(skyscraperScene.roomFootprint).toEqual(defaultScene.roomFootprint);

    // slot/compliance-office on floor 7 is now a compact 4x6 rectangle inside
    // the square tower floor plate.
    const complianceFootprint = { cols: 4, rows: 6 };
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/register-skyscraper-compliance",
          templateId: "room/compliance_office:tier_1",
          roomStateId: getRoomStateId("room/compliance_office:tier_1", []),
          slotId: "slot/compliance-office",
          floorIndex: 7,
          name: "The Compliance Office",
          reservedFootprint: {
            col: 8,
            row: 7,
            cols: complianceFootprint.cols,
            rows: complianceFootprint.rows,
          },
          activeFootprint: {
            col: 8,
            row: 7,
            cols: complianceFootprint.cols,
            rows: complianceFootprint.rows,
          },
        }),
      ],
      { buildingId: "building/skyscraper", floorIndex: 7, buildingTier: 4 },
    );

    const room = geometry.rooms[0]!;
    const scene = geometry.roomProps[0]!;
    const sceneViewBox = { minX: -70, minY: 0 };
    const sceneOrigin = [200, 100] as const;
    const dc = (complianceFootprint.cols - complianceFootprint.cols) / 2;
    const dr = (complianceFootprint.rows - complianceFootprint.rows) / 2;
    const expectedOffsetX =
      -(sceneOrigin[0] - sceneViewBox.minX) +
      (dc - dr) * (skyscraperConfig.composition.tileWidth / 2);
    const expectedOffsetY =
      -(sceneOrigin[1] - sceneViewBox.minY) +
      (dc + dr) * (skyscraperConfig.composition.tileHeight / 2);

    expect(scene.assetUrl).toBe(
      "/data/svg-environments/hq/skyscraper/recipes/scene-the-compliance-office.svg",
    );
    expect(scene.x - room.floorPoints[0]!.x).toBeCloseTo(expectedOffsetX, 6);
    expect(scene.y - room.floorPoints[0]!.y).toBeCloseTo(expectedOffsetY, 6);
  });

  it("uses the authored full-slot scene frame for Porter's restaurant floor", () => {
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/floor",
          templateId: "room/floor:tier_1",
          roomStateId: "room-state/floor:1",
          slotId: "slot/floor",
          name: "The Floor",
          functionTag: "room:social",
          reservedFootprint: { col: 1, row: 8, cols: 10, rows: 10 },
          activeFootprint: { col: 1, row: 8, cols: 10, rows: 10 },
        }),
      ],
      { buildingId: "building/porters", floorIndex: 0, buildingTier: 1 },
    );

    const scene = geometry.roomProps[0]!;
    const room = geometry.rooms[0]!;

    expect(scene.assetUrl).toBe("/data/svg-environments/hq/porters/recipes/scene-the-floor.svg");
    expect(scene.width).toBe(1060);
    expect(scene.height).toBe(640);
    expect(scene.x - room.floorPoints[0]!.x).toBeCloseTo(-530, 6);
  });

  it("tracks reserved shell bounds separately from active room bounds", () => {
    const geometry = composeHqWorldGeometry([
      createRoomSeed({
        id: "room-instance/counter",
        templateId: "room/counter:tier_1",
        roomStateId: "room-state/counter:1",
        slotId: "slot/counter",
        name: "The Counter",
        reservedFootprint: { col: 6, row: 10, cols: 4, rows: 3 },
        activeFootprint: { col: 6, row: 11, cols: 4, rows: 2 },
      }),
    ]);

    const room = geometry.rooms[0];
    expect(room?.reservedFootprint.rows).toBe(3);
    expect(room?.activeFootprint.rows).toBe(2);
    expect(room?.activeBounds.height).toBeLessThan(room?.bounds.height ?? 0);
    expect(geometry.roomProps[0]?.debugOrigin).toBeTruthy();
  });

  it("renders fallback room props through svg metadata with preserved aspect ratio", () => {
    const geometry = composeHqWorldGeometry([
      createRoomSeed({
        id: "room-instance/infirmary",
        templateId: "room/infirmary:tier_1",
        roomStateId: "room-state/infirmary:1",
        slotId: "slot/infirmary",
        name: "The Infirmary",
        functionTag: "room:recovery",
      }),
    ]);

    const bed = geometry.roomProps.find((sprite) =>
      sprite.assetUrl.endsWith("iso-bed-medical.svg"),
    );

    expect(geometry.roomProps).toHaveLength(8);
    expect(bed).toBeTruthy();
    expect(bed!.width).not.toBe(108);
    expect(bed!.width / bed!.height).toBeCloseTo(88 / 76, 3);
  });

  it("renders available and locked expansion bays as explicit slot nodes", () => {
    const geometry = composeHqWorldGeometry([createRoomSeed()], {
      reservedSlots: [
        {
          id: "room-slot/available",
          label: "Open Slot 2",
          kind: "available",
          floorIndex: 0,
          footprint: { col: 4, row: 0, cols: 4, rows: 3 },
        },
        {
          id: "room-slot/locked",
          label: "Locked Slot 3",
          kind: "locked",
          floorIndex: 0,
          footprint: { col: 8, row: 0, cols: 4, rows: 3 },
        },
      ],
    });

    expect(geometry.expansionSlots).toHaveLength(2);
    expect(geometry.expansionSlots.map((slot) => slot.kind)).toEqual(["available", "locked"]);
    expect(geometry.layout.worldWidth).toBeGreaterThan(geometry.rooms[0]!.bounds.width);
  });

  it("uses backdrop phase values as the HQ effects source of truth", () => {
    const geometry = composeHqWorldGeometry([
      createRoomSeed({
        reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
        activeFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
      }),
    ]);

    const snapshot = createHqWorldSnapshot("Bodega", geometry, [], 1080);

    expect(snapshot.backdrop?.phase).toBe("sunset");
    expect(snapshot.effects.ambientTint).toBe(snapshot.backdrop?.ambientTint);
    expect(snapshot.effects.fogColor).toBe(snapshot.backdrop?.fogColor);
    expect(snapshot.effects.shadowIntensity).toBe(snapshot.backdrop?.shadowIntensity);
  });

  it("selects skyscraper backdrop assets from the active floor elevation band", () => {
    const cases = [
      {
        floorIndex: 0,
        elevationBandId: "ground-floor",
        rearAsset: "background/iso-bg-tower-altitude-day.png",
      },
      {
        floorIndex: 1,
        elevationBandId: "mid-tower",
        rearAsset: "background/iso-bg-tower-altitude-day.png",
      },
      {
        floorIndex: 4,
        elevationBandId: "rooftop",
        rearAsset: "background/iso-bg-tower-altitude-day.png",
      },
    ] as const;

    for (const testCase of cases) {
      const geometry = composeHqWorldGeometry([], {
        buildingId: "building/skyscraper",
        buildingTier: 5,
        floorIndex: testCase.floorIndex,
      });
      const snapshot = createHqWorldSnapshot(
        "Skyscraper",
        geometry,
        [],
        720,
        "building/skyscraper",
      );

      expect(snapshot.backdrop?.elevationBandId).toBe(testCase.elevationBandId);
      expect(snapshot.backdrop?.zones.rear).toEqual([testCase.rearAsset]);
    }
  });

  it("stacks visible upper floors above the ground floor for multi-story buildings", () => {
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/ground",
          floorIndex: 0,
          reservedFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
          activeFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
        }),
        createRoomSeed({
          id: "room-instance/upper",
          floorIndex: 1,
          reservedFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
          activeFootprint: { col: 0, row: 0, cols: 4, rows: 3 },
        }),
      ],
      {
        buildingId: "building/porters",
        buildingTier: 1,
        floorIndex: 0,
      },
    );

    const ground = geometry.rooms.find((room) => room.id === "room-instance/ground");
    const upper = geometry.rooms.find((room) => room.id === "room-instance/upper");
    const groundOffset = geometry.layout.floorOffsets.find((offset) => offset.floorIndex === 0);
    const upperOffset = geometry.layout.floorOffsets.find((offset) => offset.floorIndex === 1);

    expect(geometry.layout.visibleFloorIndexes).toEqual([0, 1]);
    expect(groundOffset).toEqual(expect.objectContaining({ floorIndex: 0, stackLayer: 0 }));
    expect(upperOffset).toEqual(expect.objectContaining({ floorIndex: 1, stackLayer: 1 }));
    expect(upperOffset?.offsetY ?? 0).toBeLessThan(groundOffset?.offsetY ?? 1);
    expect(upper).toBeTruthy();
    expect(ground).toBeTruthy();
    expect(upper!.bounds.y).toBeLessThan(ground!.bounds.y);
  });

  it("keeps the navigation graph scoped to the active floor even when multiple floors are visible", () => {
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/ground",
          floorIndex: 0,
        }),
        createRoomSeed({
          id: "room-instance/upper",
          floorIndex: 1,
        }),
      ],
      {
        buildingId: "building/porters",
        buildingTier: 1,
        floorIndex: 0,
      },
    );

    expect(new Set(geometry.navGraph.anchors.map((anchor) => anchor.roomId))).toEqual(
      new Set(["room-instance/ground"]),
    );
  });

  it("renders only the active skyscraper floor even if callers provide every floor", () => {
    const lobbyLayout = getBuildingLayout("building/skyscraper", 0, 1)!;
    const operationsLayout = getBuildingLayout("building/skyscraper", 1, 1)!;
    const lobbySlot = lobbyLayout.slots.find((slot) => slot.slotId === "slot/lobby")!;
    const bullpenSlot = operationsLayout.slots.find((slot) => slot.slotId === "slot/bullpen")!;
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/lobby",
          templateId: "room/lobby:tier_1",
          slotId: lobbySlot.slotId,
          floorIndex: 0,
          reservedFootprint: lobbySlot,
          activeFootprint: lobbySlot,
        }),
        createRoomSeed({
          id: "room-instance/bullpen",
          templateId: "room/bullpen:tier_1",
          slotId: bullpenSlot.slotId,
          floorIndex: 1,
          reservedFootprint: bullpenSlot,
          activeFootprint: bullpenSlot,
        }),
      ],
      {
        buildingId: "building/skyscraper",
        buildingTier: 1,
        floorIndex: 1,
      },
    );

    expect(geometry.layout.visibleFloorIndexes).toEqual([1]);
    expect(geometry.rooms.map((room) => room.id)).toEqual(["room-instance/bullpen"]);
    expect(new Set(geometry.modular.floorTiles.map((tile) => tile.floorIndex))).toEqual(
      new Set([1]),
    );
    expect(geometry.layout.floorOffsets).toEqual([
      expect.objectContaining({ floorIndex: 1, stackLayer: 1, offsetY: 0 }),
    ]);
  });

  it("uses Porter's scene contract for waterfront room scenes", () => {
    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/workshop",
          templateId: "room/workshop:tier_1",
          roomStateId: "room-state/workshop:1",
          slotId: "slot/workshop",
          floorIndex: 2,
          name: "The Workshop",
          functionTag: "room:operations",
          reservedFootprint: { col: 0, row: 4, cols: 12, rows: 4 },
          activeFootprint: { col: 0, row: 4, cols: 12, rows: 4 },
        }),
      ],
      {
        buildingId: "building/porters",
        buildingTier: 6,
        floorIndex: 2,
      },
    );

    expect(geometry.roomProps).toHaveLength(1);
    const scene = geometry.roomProps[0]!;
    const room = geometry.rooms[0]!;

    expect(scene.assetUrl).toBe("/data/svg-environments/hq/porters/recipes/scene-the-workshop.svg");
    expect(scene.width).toBe(900);
    expect(scene.height).toBe(540);
    expect(scene.x - room.floorPoints[0]!.x).toBeCloseTo(-240, 6);
    expect(scene.y - room.floorPoints[0]!.y).toBeCloseTo(-100, 6);
  });
});

describe("HQ structural palette", () => {
  it("returns the default warm palette for bodega", () => {
    const palette = getHqStructuralPalette("building/bodega");
    expect(palette.corridor).toBe("#2a2420");
    expect(palette.wallLeft).toBe("#2c2014");
    expect(palette.wallRight).toBe("#352616");
  });

  it("returns the default warm palette for Porter's", () => {
    const palette = getHqStructuralPalette("building/porters");
    expect(palette.corridor).toBe("#2a2420");
    expect(palette.wallLeft).toBe("#2c2014");
    expect(palette.wallRight).toBe("#352616");
  });

  it("returns a cool-neutral palette for the skyscraper", () => {
    const palette = getHqStructuralPalette("building/skyscraper");
    expect(palette.corridor).toBe("#2a2e34");
    expect(palette.emptySlot).toBe("#1a1d22");
    expect(palette.lockedSlot).toBe("#131519");
    expect(palette.wallLeft).toBe("#2c343e");
    expect(palette.wallRight).toBe("#3a4452");
    expect(palette.corridor).not.toBe(getHqStructuralPalette("building/bodega").corridor);
  });
});

describe("HQ skyscraper structural contract", () => {
  it("uses one large rectangular shell for the skyscraper floor plate", () => {
    const shell = getBuildingLayout("building/skyscraper", 0, 1)!.shell;
    const cells = getBuildingShellCells(shell);
    const keys = new Set(cells.map((cell) => `${cell.col},${cell.row}`));

    expect(shell.shape).toBeUndefined();
    expect(isCellInsideBuildingShell(shell, 0, 0)).toBe(true);
    expect(isCellInsideBuildingShell(shell, 1, 0)).toBe(true);
    expect(isCellInsideBuildingShell(shell, 3, 0)).toBe(true);
    expect(shell.cols).toBe(shell.rows);
    expect(keys.has("19,19")).toBe(true);
    expect(keys.has("0,19")).toBe(true);
    expect(keys.has("19,0")).toBe(true);
  });

  it("tints skyscraper corridor tiles with the skyscraper palette", () => {
    const geometry = composeHqWorldGeometry([], {
      buildingId: "building/skyscraper",
      buildingTier: 1,
      floorIndex: 1,
    });

    const corridors = geometry.modular.floorTiles.filter((tile) => tile.roomId === "corridor");
    const skyscraperPalette = getHqStructuralPalette("building/skyscraper");

    expect(corridors.length).toBeGreaterThan(0);
    for (const tile of corridors) {
      expect(tile.tint).toBe(skyscraperPalette.corridor);
      expect(
        isCellInsideBuildingShell(
          getBuildingLayout("building/skyscraper", 1, 1)!.shell,
          tile.col,
          tile.row,
        ),
      ).toBe(true);
    }
  });

  it("keeps room hit-test polygons rectangular on skyscraper floors", () => {
    const lobbyLayout = getBuildingLayout("building/skyscraper", 0, 1)!;
    const lobbySlot = lobbyLayout.slots.find((slot) => slot.slotId === "slot/lobby")!;
    expect(isFootprintInsideBuildingShell(lobbyLayout.shell, lobbySlot)).toBe(true);

    const geometry = composeHqWorldGeometry(
      [
        createRoomSeed({
          id: "room-instance/lobby",
          templateId: "room/lobby:tier_1",
          roomStateId: "room-state/lobby:1",
          slotId: "slot/lobby",
          floorIndex: 0,
          name: "The Lobby",
          reservedFootprint: lobbySlot,
          activeFootprint: lobbySlot,
        }),
      ],
      { buildingId: "building/skyscraper", buildingTier: 1, floorIndex: 0 },
    );

    expect(geometry.rooms[0]!.floorPoints).toHaveLength(4);
    expect(geometry.rooms[0]!.reservedFootprint).toEqual(
      expect.objectContaining({ col: 4, row: 6, cols: 12, rows: 8 }),
    );
  });

  it("tints skyscraper shell walls with the skyscraper palette", () => {
    const geometry = composeHqWorldGeometry([], {
      buildingId: "building/skyscraper",
      buildingTier: 1,
      floorIndex: 0,
    });

    const walls = geometry.modular.wallSegments.filter((seg) => seg.roomId === "building-shell");
    const skyscraperPalette = getHqStructuralPalette("building/skyscraper");

    expect(walls.length).toBeGreaterThan(0);
    const leftWalls = walls.filter((seg) => seg.side === "left");
    const rightWalls = walls.filter((seg) => seg.side === "right");
    expect(leftWalls.length).toBeGreaterThan(0);
    expect(rightWalls.length).toBeGreaterThan(0);
    for (const seg of leftWalls) expect(seg.tint).toBe(skyscraperPalette.wallLeft);
    for (const seg of rightWalls) expect(seg.tint).toBe(skyscraperPalette.wallRight);
  });
});

describe("HQ perimeter tiles", () => {
  it("emits only void tiles for the skyscraper (no sidewalk/street/alley/pier/water)", () => {
    const tiles = buildPerimeterTiles(
      [{ col: 0, row: 0, cols: 20, rows: 20 }],
      "building/skyscraper",
    );

    expect(tiles.length).toBeGreaterThan(0);
    const kinds = new Set(tiles.map((tile) => tile.kind));
    expect(kinds.has("void")).toBe(true);
    expect(kinds.has("sidewalk")).toBe(false);
    expect(kinds.has("street")).toBe(false);
    expect(kinds.has("alley")).toBe(false);
    expect(kinds.has("pier")).toBe(false);
    expect(kinds.has("water")).toBe(false);
  });

  it("preserves bodega corner-street perimeter behavior", () => {
    const tiles = buildPerimeterTiles([{ col: 0, row: 0, cols: 16, rows: 10 }], "building/bodega");
    const kinds = new Set(tiles.map((tile) => tile.kind));
    expect(kinds.has("street")).toBe(true);
    expect(kinds.has("sidewalk")).toBe(true);
  });

  it("preserves Porter's waterfront rear perimeter behavior", () => {
    const tiles = buildPerimeterTiles([{ col: 0, row: 0, cols: 12, rows: 18 }], "building/porters");
    const kinds = new Set(tiles.map((tile) => tile.kind));
    expect(kinds.has("pier")).toBe(true);
    expect(kinds.has("water")).toBe(true);
  });
});
