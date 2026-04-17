import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { templateRegistry } from "content/templates";
import { DEFAULT_POLICY_STATE } from "lib/policies";
import { createBootstrapSimulation } from "sim";

import { ManagementPanel } from "./management-panel";
import { buildCityPressureView, buildHqViewFromPhase1, type GameCallbacks } from "./view-models";

const DEFAULT_GUILD = {
  guildName: "Red Hook Guild",
  playerName: "Testing",
  treasury: 0,
  reputation: 0,
  intel: 0,
  pressure: 0,
} as const;

const callbacks: GameCallbacks = {
  tick: () => {},
  setRoomActive: () => {},
  setPolicy: vi.fn(),
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
        guild={hq.guild}
        guildName={hq.guild.guildName}
        policies={hq.policies}
        contractLifecycle={hq.contractLifecycle}
        building={hq.building}
        rooms={hq.rooms}
        upgrades={hq.upgrades}
        operators={hq.operators}
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
        guild={DEFAULT_GUILD}
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
        upgrades={[]}
        operators={[]}
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

  it("shows the hidden skyscraper gate copy while Porter's is the active HQ", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guild={DEFAULT_GUILD}
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
        upgrades={[]}
        operators={[]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Ascension Tower stays hidden");
    expect(html).toContain(
      "When relocation opens, operators, staff, gear, cash, and reputation carry over.",
    );
  });

  it("shows the permanent badge once the guild has moved into the skyscraper", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guild={DEFAULT_GUILD}
        guildName="Red Hook Guild"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="idle"
        building={{
          id: "building/skyscraper",
          name: "Ascension Tower",
          description: "",
          tier: 1,
          activeFloorIndex: 0,
          floorCount: 5,
          usedRoomSlots: 11,
          totalRoomSlots: 11,
          operatorSlots: 18,
          unlockedRoomTemplateIds: [],
          availableBuildingUpgradeIds: [],
        }}
        rooms={[]}
        upgrades={[]}
        operators={[]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Permanent");
    expect(html).toContain("Ascension Tower is Red Hook Guild&#x27;s permanent address.");
  });

  it("shows the next Porter's campaign step after relocation", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guild={DEFAULT_GUILD}
        guildName="Red Hook Guild"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="bidding"
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
          availableBuildingUpgradeIds: ["upgrade/building/porters:kitchen_overhaul"],
        }}
        rooms={[]}
        upgrades={[
          {
            id: "upgrade/building/porters:kitchen_overhaul",
            name: "Kitchen Overhaul",
            description: "Rebuilds the kitchen into something a health inspector would survive.",
            target: "building",
            targetId: "building/porters",
            isApplied: false,
            isAffordable: true,
            requirements: [],
            effects: [{ label: "+10 cash income", type: "modify_resource_income" }],
          },
          {
            id: "upgrade/building/porters:upstairs_conversion",
            name: "Upstairs Conversion",
            description: "Converts the old apartments into operating rooms.",
            target: "building",
            targetId: "building/porters",
            isApplied: false,
            isAffordable: false,
            requirements: [],
            effects: [{ label: "Unlock The Briefing Room", type: "unlock_room_template" }],
          },
        ]}
        operators={[
          {
            id: "operator/test",
            name: "Rose Vega",
            roleTag: "role:field_lead",
            specialtyTag: "focus:containment",
            moraleCurrent: 64,
            moraleBaseline: 70,
            loyaltyCurrent: 72,
            loyaltyBaseline: 72,
            assignmentKind: "idle",
            assignmentTargetId: "",
            injurySeverity: 0,
            injuryRecoveryHours: 0,
            needHunger: 12,
            needFatigue: 28,
            needStress: 24,
            scheduleBlock: "idle",
            riskTolerance: 50,
            intent: "idle",
            dominantNeed: "rest",
            availableForRaid: true,
            readinessScore: 68,
            appearancePresetId: "vera-004",
            visibleGear: {
              weapon: null,
              outfitOverlay: null,
              accessory: null,
            },
            lifecycle: { status: "active" },
            combat: {
              rank: "f",
              attunementTag: "attunement:none",
              traits: [],
              regularAttackId: "attack/basic",
              skillId: "skill/basic",
              ultimateId: "ultimate/basic",
              passiveIds: [],
              baseStats: {
                strength: 10,
                speed: 10,
                endurance: 10,
                resilience: 10,
                perception: 10,
                intelligence: 10,
              },
            },
            training: {
              strength: 0,
              speed: 0,
              endurance: 0,
              resilience: 0,
              average: 0,
              statusLabel: "Untrained",
              bonuses: {
                strength: 0,
                speed: 0,
                endurance: 0,
                resilience: 0,
              },
            },
            refusalRisk: false,
            quitRisk: false,
            retentionRisk: false,
            autonomyReasons: [],
            canBeReplaced: true,
            replaceLockedReason: null,
          },
        ]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Porter&#x27;s Upgrade Arc");
    expect(html).toContain("Kitchen Overhaul");
    expect(html).toContain("Affordable now");
  });

  it("includes Machine Shop as the final Porter's campaign step", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guild={DEFAULT_GUILD}
        guildName="Red Hook Guild"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="bidding"
        building={{
          id: "building/porters",
          name: "Porter's",
          description: "",
          tier: 5,
          activeFloorIndex: 0,
          floorCount: 2,
          usedRoomSlots: 10,
          totalRoomSlots: 10,
          operatorSlots: 16,
          unlockedRoomTemplateIds: [],
          availableBuildingUpgradeIds: ["upgrade/building/porters:machine_shop"],
        }}
        rooms={[]}
        upgrades={[
          {
            id: "upgrade/building/porters:kitchen_overhaul",
            name: "Kitchen Overhaul",
            description: "",
            target: "building",
            targetId: "building/porters",
            isApplied: true,
            isAffordable: true,
            requirements: [],
            effects: [],
          },
          {
            id: "upgrade/building/porters:upstairs_conversion",
            name: "Upstairs Conversion",
            description: "",
            target: "building",
            targetId: "building/porters",
            isApplied: true,
            isAffordable: true,
            requirements: [],
            effects: [],
          },
          {
            id: "upgrade/building/porters:remodel",
            name: "The Remodel",
            description: "",
            target: "building",
            targetId: "building/porters",
            isApplied: true,
            isAffordable: true,
            requirements: [],
            effects: [],
          },
          {
            id: "upgrade/building/porters:waterfront",
            name: "The Waterfront",
            description: "",
            target: "building",
            targetId: "building/porters",
            isApplied: true,
            isAffordable: true,
            requirements: [],
            effects: [],
          },
          {
            id: "upgrade/building/porters:machine_shop",
            name: "Machine Shop",
            description: "Builds out Porter's fabrication workshop.",
            target: "building",
            targetId: "building/porters",
            isApplied: false,
            isAffordable: false,
            requirements: [],
            effects: [{ label: "Unlock The Workshop", type: "unlock_room_template" }],
          },
        ]}
        operators={[]}
        relocationGate={null}
        callbacks={callbacks}
      />,
    );

    expect(html).toContain("Machine Shop");
    expect(html).toContain("Step 5 of 5");
    expect(html).toContain("Unlocks: The Workshop");
  });

  it("renders the city-pressure summary when active district and faction pressure exists", () => {
    const html = renderToStaticMarkup(
      <ManagementPanel
        guild={DEFAULT_GUILD}
        guildName="Red Hook Guild"
        policies={DEFAULT_POLICY_STATE}
        contractLifecycle="bidding"
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
        upgrades={[]}
        operators={[]}
        relocationGate={null}
        callbacks={callbacks}
        cityPressure={buildCityPressureView({
          districts: [
            {
              districtId: "district/red-hook-waterfront",
              attention: 42,
              trust: 55,
              containmentDebt: 18,
              recentContractCount: 2,
              lastResolvedTick: 480,
            },
          ],
          factions: [
            {
              factionId: "faction/labor-safety",
              standing: -12,
              scrutiny: 45,
              leverage: 0,
              cooldownUntilTick: 0,
            },
          ],
        })}
      />,
    );

    expect(html).toContain("City Pressure");
    expect(html).toContain("Red Hook Waterfront");
    expect(html).toContain("Labor &amp; Safety Board");
  });
});
