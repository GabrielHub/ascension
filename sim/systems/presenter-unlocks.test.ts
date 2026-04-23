import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";

import { WorldTimeState } from "../components";
import {
  getPresenterIdUnlockedByRoom,
  getVisiblePresenterIds,
  isPresenterUnlocked,
  MARA_PRESENTER_ID,
  seedStartingPresenterUnlocks,
  unlockPresenterForRoomTemplate,
} from "./presenter-unlocks";
import { createSimTestContext } from "./test-context";

describe("presenter unlocks", () => {
  it("maps canonical rooms to their presenters", () => {
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/dining_area:tier_1")).toBe(
      "presenter/cook",
    );
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/bar:tier_1")).toBe(
      "presenter/bartender",
    );
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/fabrication_bay:tier_1")).toBe(
      "presenter/vicente-ortega",
    );
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/infirmary:tier_1")).toBe(
      "presenter/dr-june-park",
    );
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/compliance_office:tier_1")).toBe(
      "presenter/compliance-officer",
    );
  });

  it("returns null for rooms that do not unlock a presenter", () => {
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/register:tier_1")).toBeNull();
    expect(getPresenterIdUnlockedByRoom(templateRegistry, "room/back_office:tier_1")).toBeNull();
  });

  it("seeds Mara at new-game start", () => {
    const seed = seedStartingPresenterUnlocks();
    expect(seed).toHaveLength(1);
    expect(seed[0].presenterId).toBe(MARA_PRESENTER_ID);
    expect(seed[0].unlockedAtTick).toBe(0);
    expect(seed[0].unlockedAtDay).toBe(1);
  });

  it("appends to runtime presenterUnlocks when a matching room is placed", () => {
    const context = createSimTestContext();
    WorldTimeState.tick[context.singletonEntities.time] = 720;
    WorldTimeState.day[context.singletonEntities.time] = 2;

    const unlocked = unlockPresenterForRoomTemplate(context, "room/dining_area:tier_1");

    expect(unlocked).toBe("presenter/cook");
    expect(context.runtimeState.presenterUnlocks).toEqual([
      { presenterId: "presenter/cook", unlockedAtTick: 720, unlockedAtDay: 2 },
    ]);
  });

  it("does not double-unlock a presenter on repeated room placements", () => {
    const context = createSimTestContext();
    unlockPresenterForRoomTemplate(context, "room/bar:tier_1");
    const second = unlockPresenterForRoomTemplate(context, "room/bar:tier_1");

    expect(second).toBeNull();
    expect(context.runtimeState.presenterUnlocks).toHaveLength(1);
  });

  it("does nothing when the room does not unlock a presenter", () => {
    const context = createSimTestContext();
    const result = unlockPresenterForRoomTemplate(context, "room/register:tier_1");

    expect(result).toBeNull();
    expect(context.runtimeState.presenterUnlocks).toEqual([]);
  });

  it("isPresenterUnlocked reflects current state", () => {
    const unlocks = seedStartingPresenterUnlocks();
    expect(isPresenterUnlocked(unlocks, MARA_PRESENTER_ID)).toBe(true);
    expect(isPresenterUnlocked(unlocks, "presenter/cook")).toBe(false);
  });

  it("visible presenters require both an unlock entry and a placed allowed room", () => {
    const unlocks = [
      { presenterId: MARA_PRESENTER_ID, unlockedAtTick: 0, unlockedAtDay: 1 },
      { presenterId: "presenter/cook", unlockedAtTick: 10, unlockedAtDay: 1 },
    ];

    // prep_room is Rafi-only (not in Mara's allowed list), so only Rafi is visible.
    const onlyPrep = getVisiblePresenterIds(
      templateRegistry,
      unlocks,
      new Set(["room/prep_room:tier_1"]),
    );
    expect(onlyPrep).toContain("presenter/cook");
    expect(onlyPrep).not.toContain(MARA_PRESENTER_ID);

    const bothVisible = getVisiblePresenterIds(
      templateRegistry,
      unlocks,
      new Set(["room/register:tier_1", "room/dining_area:tier_1"]),
    );
    expect(bothVisible).toContain(MARA_PRESENTER_ID);
    expect(bothVisible).toContain("presenter/cook");

    const none = getVisiblePresenterIds(templateRegistry, unlocks, new Set());
    expect(none).toEqual([]);
  });
});
