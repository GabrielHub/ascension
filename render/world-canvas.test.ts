import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry, createHqWorldSnapshot } from "./hq-world";
import {
  buildHqDofPassPlan,
  computeBackdropZonePlacement,
  computeHqDofAppearance,
  preparePerimeterRenderData,
  projectWorldRectToScreen,
  sampleHqDofIntensity,
} from "./world-canvas";

function createSnapshot() {
  const geometry = composeHqWorldGeometry([
    {
      id: "room-instance/register",
      templateId: "room/register:tier_1",
      roomStateId: "room-state/register:1",
      slotId: "slot/register",
      floorIndex: 0,
      name: "The Register",
      tier: 1,
      isOperational: true,
      functionTag: "room:operations",
      reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
      activeFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
    },
  ]);

  return createHqWorldSnapshot("Bodega", geometry, [], 480);
}

function createBackdropSnapshot() {
  const geometry = composeHqWorldGeometry(
    [
      {
        id: "room-instance/register",
        templateId: "room/register:tier_1",
        roomStateId: "room-state/register:1",
        slotId: "slot/register",
        floorIndex: 0,
        name: "The Register",
        tier: 1,
        isOperational: true,
        functionTag: "room:operations",
        reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
        activeFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
      },
    ],
    { buildingId: "building/bodega" },
  );

  return createHqWorldSnapshot("Bodega", geometry, [], 480, "building/bodega");
}

describe("computeBackdropZonePlacement", () => {
  it("places above-shell assets above the building roofline", () => {
    const snapshot = createSnapshot();
    const placement = computeBackdropZonePlacement(snapshot, "aboveShell", "asset/sign", 2, 120, 0);

    expect(placement).not.toBeNull();
    expect(placement!.y + placement!.height).toBeLessThan(snapshot.rooms[0]!.bounds.y);
  });

  it("keeps foreground assets in front of the building base", () => {
    const snapshot = createSnapshot();
    const placement = computeBackdropZonePlacement(snapshot, "fore", "asset/tree", 0.75, 160, 0);
    const roomBottom = snapshot.rooms[0]!.bounds.y + snapshot.rooms[0]!.bounds.height;

    expect(placement).not.toBeNull();
    expect(placement!.y).toBeGreaterThan(roomBottom - 10);
  });
});

describe("HQ depth of field", () => {
  it("returns zero blur at or below the near threshold", () => {
    expect(sampleHqDofIntensity(820, 1000)).toBe(0);
    expect(sampleHqDofIntensity(900, 1000)).toBe(0);
  });

  it("returns max blur at or above the far threshold", () => {
    expect(sampleHqDofIntensity(80, 1000)).toBe(1);
    expect(sampleHqDofIntensity(40, 1000)).toBe(1);
  });

  it("interpolates between far and near thresholds", () => {
    expect(sampleHqDofIntensity(450, 1000)).toBeCloseTo(0.5, 5);
  });

  it("routes backdrop and scenery through the DOF-managed pass only", () => {
    const snapshot = createBackdropSnapshot();
    const plan = buildHqDofPassPlan(snapshot);

    expect(plan.backgroundBackdropZones).toEqual(["rear", "leftFlank", "rightFlank"]);
    expect(plan.structuralBackdropZones).toEqual(["belowShell"]);
    expect(plan.foregroundBackdropZones).toEqual(["fore", "aboveShell"]);
    expect([
      ...plan.backgroundBackdropZones,
      ...plan.structuralBackdropZones,
      ...plan.foregroundBackdropZones,
    ]).not.toContain("fxOverlay");
    expect(plan.dofScenery.length).toBeGreaterThan(0);
    expect(plan.crispRoomProps).toBe(snapshot.roomProps);
    expect(plan.crispFxOverlay).toEqual(snapshot.backdrop?.zones.fxOverlay ?? []);
    expect(plan.actorsUseDof).toBe(false);
    expect(plan.structuralLayersUseDof).toBe(false);
  });

  it("changes the same scenery asset's blur amount when camera framing changes", () => {
    const snapshot = createBackdropSnapshot();
    const sprite = snapshot.scenery[0];
    expect(sprite).toBeTruthy();

    const wideView = { width: 1200, height: 800 };
    const nearCamera = {
      x: sprite!.x + sprite!.width / 2,
      y: sprite!.y + sprite!.height / 2,
      zoom: 1,
    };
    const farCamera = {
      x: nearCamera.x,
      y: nearCamera.y + 260,
      zoom: 1,
    };

    const nearRect = projectWorldRectToScreen(sprite!, nearCamera, wideView.width, wideView.height);
    const farRect = projectWorldRectToScreen(sprite!, farCamera, wideView.width, wideView.height);

    const nearAppearance = computeHqDofAppearance(
      "scenery",
      nearRect.bottom,
      wideView.height,
      sprite!.opacity,
    );
    const farAppearance = computeHqDofAppearance(
      "scenery",
      farRect.bottom,
      wideView.height,
      sprite!.opacity,
    );

    expect(farRect.bottom).toBeLessThan(nearRect.bottom);
    expect(farAppearance.intensity).toBeGreaterThan(nearAppearance.intensity);
    expect(farAppearance.blurPx).toBeGreaterThan(nearAppearance.blurPx);
  });
});

describe("preparePerimeterRenderData", () => {
  it("caches derived perimeter lookups for static tile arrays", () => {
    const tiles = [
      { col: 0, row: 0, kind: "street" },
      { col: 0, row: 1, kind: "street" },
      { col: 0, row: 2, kind: "street" },
      { col: 0, row: 3, kind: "street" },
      { col: 0, row: 4, kind: "street" },
      { col: 1, row: 0, kind: "sidewalk" },
    ] as const;

    const first = preparePerimeterRenderData(tiles);
    const second = preparePerimeterRenderData(tiles);

    expect(second).toBe(first);
    expect(first.bounds).toEqual({ minCol: 0, maxCol: 1, minRow: 0, maxRow: 4 });
    expect(first.centerLaneSet.has("0,2")).toBe(true);
    expect(first.sortedTiles[0]).toEqual({ col: 0, row: 0, kind: "street" });
  });
});
