import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RoomDetailPanel } from "./room-detail-panel";
import type { GameCallbacks, RoomViewModel } from "./view-models";

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
};

function makeTrainingRoom(overrides: Partial<RoomViewModel> = {}): RoomViewModel {
  return {
    id: "room-instance/gym",
    templateId: "room/gym:tier_1",
    name: "The Gym",
    description: "Scrappy but real.",
    tier: 1,
    floorIndex: 1,
    slotId: "slot/gym",
    roomStateId: "room-state/gym",
    capacity: 3,
    occupancy: 0,
    isActive: true,
    isOperational: true,
    requiredStaffTag: "",
    assignedStaffCount: 0,
    appliedUpgradeIds: [],
    availableUpgradeIds: [],
    tags: ["room:training"],
    reservedFootprint: { col: 6, row: 8, cols: 4, rows: 3 },
    activeFootprint: { col: 6, row: 8, cols: 4, rows: 3 },
    prepRecipes: [],
    training: {
      currentTraineeCount: 2,
      currentTraineeNames: ["Rose Vega", "Ivo Mercer"],
      rosterAverageReadiness: 41,
      rateModifier: 20,
    },
    ...overrides,
  };
}

describe("room detail panel", () => {
  it("surfaces live gym training state instead of placeholder copy", () => {
    const html = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom()}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Training Program");
    expect(html).toContain("Roster Avg");
    expect(html).toContain("+20%");
    expect(html).toContain("Rose Vega, Ivo Mercer are on the current training block.");
    expect(html).toContain("physical readiness between contracts");
    expect(html).not.toContain("once training comes online");
  });

  it("describes the real Porter's office and briefing benefits", () => {
    const officeHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/office",
          templateId: "room/office:tier_1",
          name: "The Office",
          tags: ["room:operations", "ops:intel", "staff:admin"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );
    const briefingHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/briefing",
          templateId: "room/briefing_room:tier_1",
          name: "The Briefing Room",
          tags: ["room:operations", "ops:intel"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );

    expect(officeHtml).toContain("filed dossiers");
    expect(briefingHtml).toContain("secured-contract briefing layer");
  });

  it("describes the differentiated recovery and waterfront rooms", () => {
    const infirmaryHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/infirmary",
          templateId: "room/infirmary:tier_1",
          name: "The Infirmary",
          tags: ["room:recovery", "staff:medical"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );
    const breakRoomHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/break-room",
          templateId: "room/break_room:tier_1",
          name: "The Break Room",
          tags: ["room:social", "room:recovery"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );
    const dockHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/dock",
          templateId: "room/dock:tier_1",
          name: "The Dock",
          tags: ["room:operations", "ops:staging"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );
    const deckHtml = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom({
          id: "room-instance/deck",
          templateId: "room/deck:tier_1",
          name: "The Deck",
          tags: ["room:social"],
          training: undefined,
        })}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
      />,
    );

    expect(infirmaryHtml).toContain("Cuts injury recovery time");
    expect(breakRoomHtml).toContain("private decompression");
    expect(dockHtml).toContain("shortening departures");
    expect(deckHtml).toContain("waterfront morale reset");
  });

  it("renders a close control when the detail surface is hosted in the shell overlay", () => {
    const html = renderToStaticMarkup(
      <RoomDetailPanel
        guildName="Porter's"
        room={makeTrainingRoom()}
        buildingUpgrades={[]}
        roomUpgrades={[]}
        callbacks={callbacks}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Close room detail"');
  });
});
