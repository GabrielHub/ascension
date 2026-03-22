import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry } from "./hq-world";

describe("HQ world navigation", () => {
  it("anchors room entry points to authored wall openings", () => {
    const geometry = composeHqWorldGeometry([
      {
        id: "room-instance/front-desk",
        templateId: "room/front-desk:tier_1",
        name: "Front Desk",
        tier: 1,
        isOperational: true,
        functionTag: "room:operations",
        footprint: { col: 0, row: 0, cols: 2, rows: 1 },
      },
    ]);

    const room = geometry.rooms.find((candidate) => candidate.id === "room-instance/front-desk");
    const entry = geometry.navGraph.anchors.find(
      (candidate) => candidate.id === "room-instance/front-desk/entry",
    );

    expect(room).toBeTruthy();
    expect(entry).toBeTruthy();
    expect(entry!.x).toBeLessThan(room!.bounds.x + room!.bounds.width / 2);
  });
});
