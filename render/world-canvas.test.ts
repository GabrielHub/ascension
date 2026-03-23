import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry, createHqWorldSnapshot } from "./hq-world";
import { computeBackdropZonePlacement } from "./world-canvas";

function createSnapshot() {
  const geometry = composeHqWorldGeometry([
    {
      id: "room-instance/register",
      templateId: "room/register:tier_1",
      name: "The Register",
      tier: 1,
      isRequestedActive: true,
      isOperational: true,
      functionTag: "room:operations",
      footprint: { col: 0, row: 10, cols: 4, rows: 3 },
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
