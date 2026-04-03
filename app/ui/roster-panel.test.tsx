import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_POLICY_STATE } from "lib/policies";

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
    combat: {
      rank: "f",
      attunementTag: "attunement:kinetic",
      traits: ["trait:steady"],
      regularAttackId: "kit/basic-strike",
      skillId: "kit/field-lead-skill",
      ultimateId: "kit/field-lead-ultimate",
      passiveIds: ["kit/field-lead-passive"],
      baseStats: {
        strength: 10,
        speed: 8,
        endurance: 9,
        resilience: 10,
        perception: 7,
        intelligence: 6,
      },
    },
    training: {
      strength: 40,
      speed: 35,
      endurance: 45,
      resilience: 30,
      average: 38,
      statusLabel: "Conditioning",
      bonuses: {
        strength: 1,
        speed: 1,
        endurance: 1,
        resilience: 1,
      },
    },
    refusalRisk: false,
    quitRisk: false,
    retentionRisk: false,
    autonomyReasons: [],
    canBeReplaced: true,
    replaceLockedReason: null,
    ...overrides,
  };
}

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
          deferredVisitorCapacity: 1,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: ["operator/fallen"],
          replacementPressureLevel: "critical",
        }}
        policies={DEFAULT_POLICY_STATE}
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
            projectedMorale: 61,
            projectedLoyalty: 77,
            presetId: "kael-001",
            rank: "b",
            queueState: "active",
            canAccept: false,
            lockedReason: "Operator roster is full.",
            canDefer: true,
            deferLockedReason: null,
            canReplace: false,
            replaceLockedReason: null,
          },
        ]}
        relationships={[]}
        rooms={[]}
        callbacks={callbacks}
        rosterPressure={{
          operatorCapacity: 1,
          livingOperatorCount: 1,
          vacancyCount: 0,
          deferredVisitorCapacity: 1,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: [],
          replacementPressureLevel: "stable",
        }}
        policies={DEFAULT_POLICY_STATE}
      />,
    );

    expect(html).toContain("Roster full");
    expect(html).toContain("disabled");
    expect(html).toContain(">Full<");
  });

  it("surfaces recovery and recruitment policy context in ordinary roster play", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[
          makeOperator({
            id: "operator/recovering",
            name: "Recovering",
            assignmentKind: "recovery",
            injurySeverity: 42,
            injuryRecoveryHours: 7,
            availableForRaid: false,
          }),
        ]}
        staff={[]}
        visitors={[
          {
            id: "visitor/selective",
            name: "Nika Voss",
            desiredRoleTag: "role:medic",
            patience: 90,
            quality: 61,
            expectedLoyalty: 53,
            projectedMorale: 61,
            projectedLoyalty: 77,
            presetId: "kael-001",
            rank: "b",
            queueState: "active",
            canAccept: true,
            lockedReason: null,
            canDefer: true,
            deferLockedReason: null,
            canReplace: false,
            replaceLockedReason: null,
          },
        ]}
        relationships={[]}
        rooms={[]}
        callbacks={callbacks}
        rosterPressure={{
          operatorCapacity: 2,
          livingOperatorCount: 1,
          vacancyCount: 1,
          deferredVisitorCapacity: 1,
          unavailableOperatorIds: ["operator/recovering"],
          recentDeathOperatorIds: [],
          replacementPressureLevel: "stable",
        }}
        policies={{
          ...DEFAULT_POLICY_STATE,
          recoveryTriage: "full_recovery",
          staffingPriority: "welfare_priority",
          rosterFlow: "selective_intake",
        }}
        focusedOperatorId="operator/recovering"
      />,
    );

    expect(html).toContain("Daily Routine");
    expect(html).toContain("Welfare Priority");
    expect(html).toContain("Recruitment Policy");
    expect(html).toContain("Selective Intake");
    expect(html).toContain("Visitor volume is lower than usual.");
    expect(html).toContain("Quality 61");
    expect(html).toContain("2h patience");
    expect(html).toContain("Recovering");
    expect(html).toContain("Recovery Standards: Full Recovery.");
    expect(html).toContain("injury severity 42");
    expect(html).toContain("Training Readiness");
    expect(html).toContain("Conditioning (38)");
    expect(html).toContain("Combat Profile");
    expect(html).toContain("Standard Issue");
  });

  it("renders deferred reserve actions when overflow is being curated", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[makeOperator({ id: "operator/active", name: "Active" })]}
        staff={[]}
        visitors={[
          {
            id: "visitor/deferred",
            name: "Deferred Recruit",
            desiredRoleTag: "role:medic",
            patience: 120,
            quality: 68,
            expectedLoyalty: 58,
            projectedMorale: 66,
            projectedLoyalty: 80,
            presetId: "kael-001",
            rank: "c",
            queueState: "deferred",
            canAccept: false,
            lockedReason: "Operator roster is full.",
            canDefer: false,
            deferLockedReason: "Already deferred.",
            canReplace: true,
            replaceLockedReason: null,
          },
        ]}
        relationships={[]}
        rooms={[]}
        callbacks={callbacks}
        rosterPressure={{
          operatorCapacity: 1,
          livingOperatorCount: 1,
          vacancyCount: 0,
          deferredVisitorCapacity: 1,
          unavailableOperatorIds: [],
          recentDeathOperatorIds: [],
          replacementPressureLevel: "stable",
        }}
        policies={DEFAULT_POLICY_STATE}
      />,
    );

    expect(html).toContain("Deferred (1)");
    expect(html).toContain("Deferred Recruit");
    expect(html).toContain(">dismiss<");
    expect(html).toContain(">Replace<");
  });
});
