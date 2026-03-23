import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry, createHqWorldSnapshot } from "./hq-world";

describe("HQ world navigation", () => {
  it("anchors room entry points to authored wall openings", () => {
    const geometry = composeHqWorldGeometry([
      {
        id: "room-instance/front-desk",
        templateId: "room/front-desk:tier_1",
        name: "Front Desk",
        tier: 1,
        isRequestedActive: true,
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

  it("uses the recipes root for prebuilt room scenes", () => {
    const geometry = composeHqWorldGeometry([
      {
        id: "room-instance/register",
        templateId: "room/register:tier_1",
        name: "The Register",
        tier: 1,
        isRequestedActive: true,
        isOperational: true,
        functionTag: "room:operations",
        footprint: { col: 0, row: 0, cols: 4, rows: 3 },
      },
    ]);

    expect(geometry.roomProps).toHaveLength(1);
    expect(geometry.roomProps[0]?.assetUrl).toBe(
      "/data/svg-environments/hq/bodega/recipes/scene-the-register.svg",
    );
  });

  it("renders reserved expansion bays for unlocked room slots", () => {
    const geometry = composeHqWorldGeometry(
      [
        {
          id: "room-instance/register",
          templateId: "room/register:tier_1",
          name: "The Register",
          tier: 1,
          isRequestedActive: true,
          isOperational: true,
          functionTag: "room:operations",
          footprint: { col: 0, row: 0, cols: 4, rows: 3 },
        },
      ],
      {
        reservedSlots: [
          {
            id: "room-slot/1",
            label: "Open Slot 2",
            footprint: { col: 4, row: 0, cols: 4, rows: 3 },
          },
        ],
      },
    );

    expect(geometry.expansionSlots).toHaveLength(1);
    expect(geometry.expansionSlots[0]?.label).toBe("Open Slot 2");
    expect(geometry.layout.worldWidth).toBeGreaterThan(geometry.rooms[0]!.bounds.width);
  });

  it("adds authored overlay props for applied room upgrades", () => {
    const geometry = composeHqWorldGeometry([
      {
        id: "room-instance/register",
        templateId: "room/register:tier_1",
        name: "The Register",
        tier: 1,
        isRequestedActive: true,
        isOperational: true,
        functionTag: "room:operations",
        appliedUpgradeIds: ["upgrade/room/register:records_wall"],
        footprint: { col: 0, row: 0, cols: 4, rows: 3 },
      },
    ]);

    expect(
      geometry.roomProps.some((sprite) =>
        sprite.id.includes("upgrade/upgrade/room/register:records_wall"),
      ),
    ).toBe(true);
  });

  it("uses backdrop phase values as the HQ effects source of truth", () => {
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

    const snapshot = createHqWorldSnapshot("Bodega", geometry, [], 1080);

    expect(snapshot.backdrop?.phase).toBe("sunset");
    expect(snapshot.effects.ambientTint).toBe(snapshot.backdrop?.ambientTint);
    expect(snapshot.effects.fogColor).toBe(snapshot.backdrop?.fogColor);
    expect(snapshot.effects.shadowIntensity).toBe(snapshot.backdrop?.shadowIntensity);
  });
});
