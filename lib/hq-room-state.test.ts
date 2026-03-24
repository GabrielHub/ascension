import { describe, expect, it } from "vitest";

import {
  getApplicableRoomUpgradeIds,
  getNextPendingRoomUpgradeIds,
  getRoomActiveFootprint,
  getRoomStateId,
  resolveKnownRoomSlotPlacement,
} from "./hq-room-state";

describe("hq room state helpers", () => {
  it("ignores unknown and duplicate room upgrades when deriving room state", () => {
    expect(
      getApplicableRoomUpgradeIds("room/register:tier_1", [
        "upgrade/room/register:records_wall",
        "upgrade/room/register:records_wall",
        "upgrade/room/register:unknown",
      ]),
    ).toEqual(["upgrade/room/register:records_wall"]);

    expect(
      getRoomStateId("room/register:tier_1", [
        "upgrade/room/register:records_wall",
        "upgrade/room/register:unknown",
      ]),
    ).toBe("room-state/register:2");
    expect(getRoomStateId("room/register:tier_1", ["upgrade/room/register:unknown"])).toBe(
      "room-state/register:1",
    );
  });

  it("resolves known room slots from legacy footprints", () => {
    expect(
      resolveKnownRoomSlotPlacement({
        buildingId: "building/bodega",
        templateId: "room/register:tier_1",
        reservedFootprint: { col: 0, row: 10, cols: 4, rows: 3 },
      }),
    ).toEqual(
      expect.objectContaining({
        floorIndex: 0,
        slotId: "slot/register",
      }),
    );
  });

  it("derives compact early counter footprint only from applicable upgrades", () => {
    expect(
      getRoomActiveFootprint("room/counter:tier_1", { col: 6, row: 10, cols: 4, rows: 3 }, [
        "upgrade/room/counter:unknown",
      ]),
    ).toEqual({ col: 6, row: 11, cols: 4, rows: 2 });
  });

  it("dining area reaches state 3 with both upgrades applied", () => {
    expect(getRoomStateId("room/dining_area:tier_1", [])).toBe("room-state/dining-area:1");
    expect(
      getRoomStateId("room/dining_area:tier_1", ["upgrade/room/dining_area:first_aid_station"]),
    ).toBe("room-state/dining-area:2");
    expect(
      getRoomStateId("room/dining_area:tier_1", [
        "upgrade/room/dining_area:first_aid_station",
        "upgrade/room/dining_area:common_table",
      ]),
    ).toBe("room-state/dining-area:3");
  });

  it("dining area clamps at state 3 even with extra unknown upgrades", () => {
    expect(
      getRoomStateId("room/dining_area:tier_1", [
        "upgrade/room/dining_area:first_aid_station",
        "upgrade/room/dining_area:common_table",
        "upgrade/room/dining_area:unknown_future",
      ]),
    ).toBe("room-state/dining-area:3");
  });

  it("gates dining area second upgrade behind first via sequential ordering", () => {
    expect(getNextPendingRoomUpgradeIds("room/dining_area:tier_1", [])).toEqual([
      "upgrade/room/dining_area:first_aid_station",
    ]);
    expect(
      getNextPendingRoomUpgradeIds("room/dining_area:tier_1", [
        "upgrade/room/dining_area:first_aid_station",
      ]),
    ).toEqual(["upgrade/room/dining_area:common_table"]);
    expect(
      getNextPendingRoomUpgradeIds("room/dining_area:tier_1", [
        "upgrade/room/dining_area:first_aid_station",
        "upgrade/room/dining_area:common_table",
      ]),
    ).toEqual([]);
  });

  it("other room state progressions are unchanged", () => {
    expect(getRoomStateId("room/register:tier_1", ["upgrade/room/register:records_wall"])).toBe(
      "room-state/register:2",
    );
    expect(getRoomStateId("room/counter:tier_1", ["upgrade/room/counter:hot_coffee"])).toBe(
      "room-state/counter:2",
    );
    expect(
      getRoomStateId("room/supply_closet:tier_1", ["upgrade/room/supply_closet:labeled_bins"]),
    ).toBe("room-state/supply-closet:2");
  });
});
