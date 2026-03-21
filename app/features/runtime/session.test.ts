import { afterEach, describe, expect, it, vi } from "vitest";

import { OPERATOR_APPEARANCE_PRESET_IDS, saveStorage, type PersistedSaveGame } from "save";

import { parseRuntimeRouteRequest, resolveRuntimeSession } from "./session";

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runtime route request parsing", () => {
  it("defaults to preview mode for empty search params", () => {
    expect(parseRuntimeRouteRequest("")).toEqual({
      mode: "preview",
      slotId: undefined,
    });
  });

  it("parses valid slot-backed requests", () => {
    expect(parseRuntimeRouteRequest("?mode=load&slot=slot/2")).toEqual({
      mode: "load",
      slotId: "slot/2",
    });
  });
});

describe("runtime session lifecycle", () => {
  it("resolves preview mode to a seeded interactive session", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });

    expect(session.mode).toBe("preview");
    expect(session.isPreview).toBe(true);
    expect(session.isSaveBacked).toBe(false);
    expect(session.state.phase1View.rooms.length).toBeGreaterThan(0);
    expect(session.state.phase1View.operators.length).toBeGreaterThan(0);
    expect(session.state.phase1View.operatorIntentReadiness.length).toBeGreaterThan(0);
    expect(session.state.phase1View.relationshipSignals.length).toBeGreaterThan(0);
    expect(session.state.phase1View.staff.length).toBeGreaterThan(0);
    expect(session.state.phase1View.visitors.length).toBeGreaterThan(0);
    expect(
      session.state.phase1View.operators.every((operator) =>
        OPERATOR_APPEARANCE_PRESET_IDS.includes(operator.appearance.presetId),
      ),
    ).toBe(true);
    expect("svgCatalog" in session).toBe(false);
    expect("operatorDetailRecipe" in session.state).toBe(false);
    expect(session.registry.missions.length).toBeGreaterThan(0);
    expect(session.stableCommandTypes).toContain("sim/place-room");
    expect(session.stableCommandTypes).toContain("sim/accept-recruit");
    expect(session.stableCommandTypes).toContain("sim/assign-staff");

    session.dispose();
  });

  it("drains an already-queued command after dispose closes the session", async () => {
    const session = await resolveRuntimeSession({
      mode: "preview",
    });
    const initialTick = session.worldSnapshot.time.tick;

    const queuedTick = session.commands.tick();
    session.dispose();

    await queuedTick;

    expect(session.worldSnapshot.time.tick).toBeGreaterThan(initialTick);
  });

  it("flushes the latest queued save writeback after dispose during an in-flight save", async () => {
    vi.spyOn(saveStorage, "readSaveGame").mockResolvedValue(undefined);

    const inFlightPersist = createDeferredPromise<void>();
    const persistedWrites: PersistedSaveGame[] = [];
    let writeCallCount = 0;

    vi.spyOn(saveStorage, "writeSaveGame").mockImplementation(async (save) => {
      writeCallCount += 1;
      persistedWrites.push(save);

      if (writeCallCount === 2) {
        await inFlightPersist.promise;
      }
    });

    const session = await resolveRuntimeSession({
      mode: "new",
      slotId: "slot/1",
    });

    await session.commands.tick();
    await session.commands.tick();
    const latestTick = session.worldSnapshot.time.tick;

    session.dispose();
    inFlightPersist.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(persistedWrites).toHaveLength(3);
    expect(persistedWrites[2]?.world.time.tick).toBe(latestTick);
  });
});
