import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import type { FocusPayload } from "render";
import { createBootstrapSimulation } from "sim";

import { HqPanel } from "./hq-panel";
import { buildHqViewFromPhase1, type GameCallbacks, type HqViewModel } from "./view-models";

const callbacks: GameCallbacks = {
  tick: () => {},
  setRoomActive: () => {},
  setPolicy: () => {},
  setLootFilterEnabled: () => {},
  initiateRelocation: () => {},
  purchaseBuildingUpgrade: () => {},
  purchaseRoomUpgrade: () => {},
  acceptRecruit: () => {},
  deferRecruit: () => {},
  rejectRecruit: () => {},
  replaceRecruit: () => {},
  dismissRecruit: () => {},
  hireStaff: () => {},
  assignStaff: () => {},
  placeRoom: () => {},
  setActiveFloor: () => {},
  buyItem: () => {},
  sellItem: () => {},
  equipItem: () => {},
  autoAssignAccessory: () => {},
  unequipItem: () => {},
  bidContract: () => {},
  advanceContract: () => {},
  prepConsumable: () => {},
  craftDurable: () => {},
};

describe("hq panel", () => {
  it("keeps selected room detail out of the bottom panel so shell focus owns the detail view", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const hq = buildHqViewFromPhase1(simulation.getPhase1View(), templateRegistry);
    const selectedRoom = hq.rooms[0];

    if (!selectedRoom) {
      throw new Error("expected bootstrap simulation to include at least one room");
    }

    const focus: FocusPayload = {
      targetKind: "room",
      targetId: selectedRoom.id,
      highlightBounds: null,
    };

    const html = renderToStaticMarkup(
      <HqPanel hq={hq} callbacks={callbacks} focus={focus} roomCultures={[]} />,
    );

    expect(html).toContain(selectedRoom.name);
    expect(html).not.toContain("Why This Room Matters");
    expect(html).not.toContain('aria-label="Close room detail"');
  });

  it("renders skyscraper expansion floors using display order instead of raw floor indices", () => {
    const hq: HqViewModel = {
      guild: {
        guildName: "Ascension",
        playerName: "Test",
        treasury: 0,
        reputation: 0,
        intel: 0,
        pressure: 0,
      },
      time: { day: 1, minuteOfDay: 480, formatted: "08:00" },
      policies: {
        contractPosture: "balanced",
        objectiveBias: "standard_clearance",
        recoveryTriage: "stabilize_and_rotate",
        staffingPriority: "balanced",
        rosterFlow: "balanced",
      },
      contractLifecycle: "idle",
      building: {
        id: "building/skyscraper",
        name: "Ascension Tower",
        description: "",
        tier: 2,
        activeFloorIndex: 5,
        activeFloorDisplayNumber: 5,
        floorCount: 6,
        floorOrder: [0, 1, 2, 3, 5, 4],
        usedRoomSlots: 2,
        totalRoomSlots: 13,
        operatorSlots: 21,
        unlockedRoomTemplateIds: [],
        availableBuildingUpgradeIds: [],
      },
      rooms: [],
      expansionSlots: [],
      upgrades: [],
      roomUpgrades: [],
      operators: [],
      staff: [],
      visitors: [],
      relationships: [],
      activeEvents: [],
      placeableRoomTemplates: [],
      rosterPressure: {
        operatorCapacity: 21,
        livingOperatorCount: 0,
        vacancyCount: 21,
        deferredVisitorCapacity: 1,
        unavailableOperatorIds: [],
        recentDeathOperatorIds: [],
        replacementPressureLevel: "stable",
      },
      relocationGate: null,
    };

    const html = renderToStaticMarkup(
      <HqPanel hq={hq} callbacks={callbacks} focus={null} roomCultures={[]} />,
    );

    expect(html).toContain("Floor 5/6");
    expect(html).toContain("Nightlife");
    expect(html).toContain("club floor");
  });
});
