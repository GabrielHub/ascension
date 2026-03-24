import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry, createHqWorldSnapshot } from "./hq-world";
import { computeBackdropZonePlacement, preparePerimeterRenderData } from "./world-canvas";

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
      isRequestedActive: true,
      isOperational: true,
      functionTag: "room:operations",
      reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
      activeFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
    },
  ]);

  return createHqWorldSnapshot("Bodega", geometry, [], 480);
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
