import { describe, expect, it } from "vitest";

import { composeHqWorldGeometry, createHqWorldSnapshot } from "./hq-world";

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
    isRequestedActive: true,
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
});
