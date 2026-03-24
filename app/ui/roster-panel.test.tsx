import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RosterPanel } from "./roster-panel";
import type { GameCallbacks, OperatorViewModel } from "./view-models";

function makeOperator(overrides: Partial<OperatorViewModel> & { id: string }): OperatorViewModel {
  return {
    id: overrides.id,
    name: "Test",
    roleTag: "role:bruiser",
    specialtyTag: "focus:frontline",
    moraleCurrent: 70,
    moraleBaseline: 60,
    loyaltyCurrent: 80,
    loyaltyBaseline: 70,
    assignmentKind: "idle",
    assignmentTargetId: "",
    injurySeverity: 0,
    injuryRecoveryHours: 0,
    needHunger: 20,
    needFatigue: 30,
    needStress: 10,
    scheduleBlock: "idle",
    riskTolerance: 60,
    intent: "available",
    dominantNeed: "none",
    availableForRaid: true,
    readinessScore: 85,
    appearancePresetId: "kael-001",
    visibleGear: {},
    lifecycle: { status: "active" },
    ...overrides,
  };
}

const callbacks: GameCallbacks = {
  tick: () => {},
  setRoomActive: () => {},
  purchaseBuildingUpgrade: () => {},
  purchaseRoomUpgrade: () => {},
  acceptRecruit: () => {},
  rejectRecruit: () => {},
  hireStaff: () => {},
  assignStaff: () => {},
  placeRoom: () => {},
  setActiveFloor: () => {},
  buyItem: () => {},
  sellItem: () => {},
  autoAssignAccessory: () => {},
  unequipItem: () => {},
};

describe("roster panel", () => {
  it("separates fallen operators and surfaces vacancy pressure banners", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[
          makeOperator({ id: "operator/active", name: "Active" }),
          makeOperator({
            id: "operator/fallen",
            name: "Fallen",
            lifecycle: {
              status: "dead",
              deathTick: 120,
              deathRaidSummaryId: "raid/roster-test",
            },
          }),
        ]}
        staff={[]}
        visitors={[]}
        relationships={[]}
        rooms={[]}
        callbacks={callbacks}
        rosterPressure={{
          operatorCapacity: 2,
          livingOperatorCount: 1,
          vacancyCount: 1,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: ["operator/fallen"],
          replacementPressureLevel: "critical",
        }}
      />,
    );

    expect(html).toContain("Roster critical");
    expect(html).toContain("1 vacancy");
    expect(html).toContain("1/2");
    expect(html).toContain("Fallen (1)");
    expect(html).toContain("KIA");
    expect(html).toContain("line-through");
  });

  it("disables recruiting when the operator roster is full", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[makeOperator({ id: "operator/active", name: "Active" })]}
        staff={[]}
        visitors={[
          {
            id: "visitor/test",
            name: "Nika Voss",
            desiredRoleTag: "role:medic",
            patience: 18,
            quality: 61,
            expectedLoyalty: 53,
          },
        ]}
        relationships={[]}
        rooms={[]}
        callbacks={callbacks}
        rosterPressure={{
          operatorCapacity: 1,
          livingOperatorCount: 1,
          vacancyCount: 0,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: [],
          replacementPressureLevel: "stable",
        }}
      />,
    );

    expect(html).toContain("Roster full");
    expect(html).toContain("disabled");
    expect(html).toContain(">Full<");
  });
});
