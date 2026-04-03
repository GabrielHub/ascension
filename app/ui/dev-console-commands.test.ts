import { describe, expect, it, vi } from "vitest";

import {
  executeConsoleCommand,
  getCommandRegistry,
  parseCommand,
  type DevConsoleContext,
} from "./dev-console-commands";

function createContext(): DevConsoleContext {
  const dispatch = vi.fn(() => Promise.resolve());
  const stopAutoTick = vi.fn();
  const startAutoTick = vi.fn();
  const setActiveFloor = vi.fn(() => Promise.resolve());
  const setRoomActive = vi.fn(() => Promise.resolve());

  return {
    session: {
      mode: "preview",
      isPreview: true,
      commands: {
        dispatch,
        tick: vi.fn(() => Promise.resolve()),
        initiateRelocation: vi.fn(() => Promise.resolve()),
        placeRoom: vi.fn(() => Promise.resolve()),
        setActiveFloor,
        setRoomActive,
        setPolicy: vi.fn(() => Promise.resolve()),
        setLootFilter: vi.fn(() => Promise.resolve()),
        purchaseBuildingUpgrade: vi.fn(() => Promise.resolve()),
        purchaseRoomUpgrade: vi.fn(() => Promise.resolve()),
        acceptRecruit: vi.fn(() => Promise.resolve()),
        deferRecruit: vi.fn(() => Promise.resolve()),
        rejectRecruit: vi.fn(() => Promise.resolve()),
        replaceRecruit: vi.fn(() => Promise.resolve()),
        dismissRecruit: vi.fn(() => Promise.resolve()),
        hireStaff: vi.fn(() => Promise.resolve()),
        assignStaff: vi.fn(() => Promise.resolve()),
        buyItem: vi.fn(() => Promise.resolve()),
        sellItem: vi.fn(() => Promise.resolve()),
        equipItem: vi.fn(() => Promise.resolve()),
        autoAssignAccessory: vi.fn(() => Promise.resolve()),
        unequipItem: vi.fn(() => Promise.resolve()),
        prepConsumable: vi.fn(() => Promise.resolve()),
      },
      lifecycle: {
        startAutoTick,
        stopAutoTick,
      },
      phase1View: {
        clock: { day: 2, minuteOfDay: 600 },
        resources: { cash: 500, reputation: 10, intel: 25 },
        building: {
          activeBuildingId: "building/bodega",
          tier: 1,
          activeFloorIndex: 0,
          floorCount: 2,
          roomSlotCount: 4,
          operatorSlotCount: 3,
        },
        rooms: [
          {
            id: "room/gym-1",
            name: "The Gym",
            templateId: "room/gym:tier_1",
            floorIndex: 1,
            occupancy: 1,
            capacity: 3,
            isOperational: true,
          },
        ],
        visitors: [{ id: "visitor/rose", name: "Rose Vega", desiredRoleTag: "role:scout" }],
        postedContracts: [{ postingId: "posting/1", siteConceptName: "Slipyard" }],
        contractLifecycle: "bidding",
        activeInterruption: null,
        encounter: null,
        operators: [
          {
            id: "operator/rose",
            identity: { name: "Rose Vega", roleTag: "role:scout" },
            lifecycle: { status: "active" },
          },
        ],
      },
      state: {
        hqWorldSnapshot: null,
      },
      worldSnapshot: {
        staff: [
          { id: "staff/admin-1", name: "Dana Wolfe", roleTag: "staff:admin", assignment: {} },
        ],
        activeRaidPackets: [],
      },
    },
    debugOverlays: {
      showRoomBounds: false,
      showFootprints: false,
      showAnchors: false,
      showPointerCoords: false,
    },
    setDebugOverlays: vi.fn(),
    eventLogEntries: [],
  };
}

describe("dev console commands", () => {
  it("parses subcommands and quoted arguments deterministically", () => {
    const parsed = parseCommand('/room place "room/gym:tier_1" "slot/gym" 2');

    expect(parsed?.command.name).toBe("room place");
    expect(parsed?.args).toEqual(["room/gym:tier_1", "slot/gym", "2"]);
  });

  it("lists a specific command family from the shared registry", () => {
    const result = executeConsoleCommand("/list resources", createContext());

    expect(result.status).toBe("info");
    expect(result.message).toBe("Resources commands");
    expect(result.detail).toContain("/cash <amount>");
    expect(result.detail).toContain("/resource <cash|rep|intel> <amount>");
  });

  it("returns a clear error for unknown command families", () => {
    const result = executeConsoleCommand("/list ghosts", createContext());

    expect(result.status).toBe("error");
    expect(result.message).toContain("Unknown family: ghosts");
  });

  it("dispatches day jumps through the explicit dev day command", () => {
    const ctx = createContext();
    const result = executeConsoleCommand("/day 5", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toBe("Day set to 5");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/dev-set-day",
      day: 5,
    });
  });

  it("resolves relative cash adjustments against the current resource value", () => {
    const ctx = createContext();
    const result = executeConsoleCommand("/cash +1000", ctx);

    expect(result.status).toBe("ok");
    expect(result.message).toBe("Cash set to 1500");
    expect(ctx.session.commands.dispatch).toHaveBeenCalledWith({
      type: "sim/dev-set-resource",
      resourceId: "resource/cash",
      amount: 1500,
    });
  });

  it("keeps the shipped /list command discoverable through the registry", () => {
    expect(getCommandRegistry().some((command) => command.name === "list")).toBe(true);
  });
});
