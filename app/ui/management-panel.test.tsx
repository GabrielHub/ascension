import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { templateRegistry } from "content/templates";
import { DEFAULT_POLICY_STATE } from "lib/policies";
import { createBootstrapSimulation } from "sim";

import { ManagementPanel } from "./management-panel";
import { buildHqViewFromPhase1, type GameCallbacks } from "./view-models";

const callbacks: GameCallbacks = {
  tick: () => {},
  setRoomActive: () => {},
  setPolicy: vi.fn(),
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
  autoAssignAccessory: () => {},
  unequipItem: () => {},
  bidContract: () => {},
  advanceContract: () => {},
};

describe("management panel", () => {
  it("renders shipped policies from runtime-owned state with current tradeoffs", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.dispatch({
      type: "sim/set-policy",
      policyId: "contractPosture",
      value: "aggressive",
    });
    simulation.dispatch({
      type: "sim/set-policy",
      policyId: "recoveryTriage",
      value: "full_recovery",
    });
    simulation.dispatch({
      type: "sim/set-policy",
      policyId: "rosterFlow",
      value: "retention_focus",
    });
    const hq = buildHqViewFromPhase1(simulation.getPhase1View(), templateRegistry);

    const html = renderToStaticMarkup(
      <ManagementPanel
        guildName={hq.guild.guildName}
        policies={hq.policies}
        contractLifecycle={hq.contractLifecycle}
        building={hq.building}
        rooms={hq.rooms}
        relocationGate={hq.relocationGate}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Contract Posture");
    expect(html).toContain("Field Objectives");
    expect(html).toContain("Recovery Standards");
    expect(html).toContain("Daily Routine");
    expect(html).toContain("Recruitment Policy");
    expect(html).toContain("Aggressive");
    expect(html).toContain("Full Recovery");
    expect(html).toContain("Retention Focus");
    expect(html).toContain("More raids and more loot upside, but more injuries and morale strain.");
    expect(html).toContain(
      "Healthier, steadier deployments, but a smaller raid-ready pool at any moment.",
    );
    expect(html).toContain(
      "Departures get less likely, but replacement traffic slows when losses do happen.",
    );
  });

  it("disables field objectives during active contracts and explains why", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guildName="Guild Slot 1"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="active"
        building={{
          id: "building/bodega",
          name: "The Bodega",
          description: "",
          tier: 1,
          activeFloorIndex: 0,
          floorCount: 1,
          usedRoomSlots: 0,
          totalRoomSlots: 4,
          operatorSlots: 6,
          unlockedRoomTemplateIds: [],
          availableBuildingUpgradeIds: [],
        }}
        rooms={[]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Active contract");
    expect(html).toContain(
      "Field Objectives cannot change during an active contract because deployed teams are already committed to the current objective plan.",
    );
    expect(html).toMatch(
      /data-testid="management-policy-objectiveBias-thorough_sweep"[^>]*disabled=""/,
    );
    expect(html).toMatch(
      /data-testid="management-policy-objectiveBias-standard_clearance"[^>]*disabled=""/,
    );
    expect(html).toMatch(/data-testid="management-policy-objectiveBias-boss_rush"[^>]*disabled=""/);
  });

  it("shows relocation as completed once the guild has moved to Porter's", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guildName="Red Hook Guild"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="idle"
        building={{
          id: "building/porters",
          name: "Porter's",
          description: "",
          tier: 1,
          activeFloorIndex: 0,
          floorCount: 2,
          usedRoomSlots: 7,
          totalRoomSlots: 7,
          operatorSlots: 12,
          unlockedRoomTemplateIds: [],
          availableBuildingUpgradeIds: [],
        }}
        rooms={[]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Completed");
    expect(html).toContain("Porter&#x27;s is now Red Hook Guild&#x27;s headquarters.");
  });
});
