import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DevConsole } from "./dev-menu";

describe("dev console", () => {
  it("renders the empty-state command reference with the shipped discovery commands", () => {
    const html = renderToStaticMarkup(
      <DevConsole
        session={{
          mode: "preview",
          isPreview: true,
          isAutoTicking: true,
          commands: {
            dispatch: vi.fn(),
            tick: vi.fn(),
            initiateRelocation: vi.fn(),
            placeRoom: vi.fn(),
            setActiveFloor: vi.fn(),
            setRoomActive: vi.fn(),
            setPolicy: vi.fn(),
            setLootFilter: vi.fn(),
            purchaseBuildingUpgrade: vi.fn(),
            purchaseRoomUpgrade: vi.fn(),
            acceptRecruit: vi.fn(),
            deferRecruit: vi.fn(),
            rejectRecruit: vi.fn(),
            replaceRecruit: vi.fn(),
            dismissRecruit: vi.fn(),
            hireStaff: vi.fn(),
            assignStaff: vi.fn(),
            buyItem: vi.fn(),
            sellItem: vi.fn(),
            equipItem: vi.fn(),
            autoAssignAccessory: vi.fn(),
            unequipItem: vi.fn(),
            prepConsumable: vi.fn(),
          },
          lifecycle: {
            startAutoTick: vi.fn(),
            stopAutoTick: vi.fn(),
          },
          phase1View: {
            clock: { day: 1, minuteOfDay: 600 },
            resources: { cash: 500, reputation: 10, intel: 20 },
            building: {
              activeBuildingId: "building/bodega",
              tier: 1,
              activeFloorIndex: 0,
              floorCount: 1,
              roomSlotCount: 4,
              operatorSlotCount: 3,
            },
            rooms: [],
            visitors: [],
            postedContracts: [],
            contractLifecycle: "bidding",
            activeInterruption: null,
            encounter: null,
            operators: [],
          },
          state: { hqWorldSnapshot: null },
          worldSnapshot: { staff: [], activeRaidPackets: [] },
        }}
        onClose={() => {}}
        debugOverlays={{
          showRoomBounds: false,
          showFootprints: false,
          showAnchors: false,
          showPointerCoords: false,
        }}
        onDebugOverlaysChange={() => {}}
        eventLogEntries={[]}
      />,
    );

    expect(html).toContain("Command Console");
    expect(html).toContain("Type a command or browse the reference below.");
    expect(html).toContain("/help");
    expect(html).toContain("/list");
    expect(html).toContain("/cash");
    expect(html).toContain("/inspect");
  });
});
