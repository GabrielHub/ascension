import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import type { FocusPayload } from "render";
import { createBootstrapSimulation } from "sim";

import { HqPanel } from "./hq-panel";
import { buildHqViewFromPhase1, type GameCallbacks } from "./view-models";

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
});
