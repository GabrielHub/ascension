import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_POLICY_STATE } from "lib/policies";

import { RosterPanel } from "./roster-panel";
import type { OperatorViewModel } from "./view-models";

function makeOperator(overrides: Partial<OperatorViewModel> & { id: string }): OperatorViewModel {
  return {
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
      combatPackageId: "package/field-lead/kinetic/standard",
      blocks: 0,
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
        visitors={[]}
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

  it("renders visitors as compact cascade-entry rows without inline action buttons", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[makeOperator({ id: "operator/active", name: "Active" })]}
        visitors={[
          {
            id: "visitor/test",
            name: "Nika Voss",
            desiredRoleTag: "role:medic",
            specialtyTag: "",
            patience: 18,
            quality: 61,
            expectedLoyalty: 53,
            projectedMorale: 61,
            projectedLoyalty: 77,
            presetId: "kael-001",
            personaSummary: null,
            personaHooks: [],
            identitySource: "deterministic",
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
        onSelectVisitor={() => {}}
      />,
    );

    expect(html).toContain("Roster full");
    expect(html).toContain('data-testid="visitor-row"');
    expect(html).toContain('data-testid="visitor-open"');
    // Inline recruit/defer/pass/replace buttons belong to the visitor-detail cascade
    // branch now, not the people-root directory row.
    expect(html).not.toMatch(/data-testid="visitor-recruit"/);
    expect(html).not.toMatch(/data-testid="visitor-pass"/);
    expect(html).not.toContain(">defer<");
    expect(html).not.toContain("Replace Operator");
  });

  it("surfaces recruitment policy context while keeping visitor rows inert", () => {
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
        visitors={[
          {
            id: "visitor/selective",
            name: "Nika Voss",
            desiredRoleTag: "role:medic",
            specialtyTag: "",
            patience: 90,
            quality: 61,
            expectedLoyalty: 53,
            projectedMorale: 61,
            projectedLoyalty: 77,
            presetId: "kael-001",
            personaSummary: null,
            personaHooks: [],
            identitySource: "deterministic",
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

    expect(html).toContain("Recruitment:");
    expect(html).toContain("Selective Intake");
    expect(html).toContain("Q61");
    expect(html).toContain("2h patience");
    expect(html).toContain("Injured (7h)");
    expect(html).toContain('data-operator-id="operator/recovering"');
    expect(html).toContain("shadow-[inset_2px_0_0_var(--color-gold)]");
    // Long-form policy explanations live in Management now, not inside the roster cascade.
    expect(html).not.toContain("Daily Routine");
    expect(html).not.toContain("Visitor volume is lower than usual.");
  });

  it("renders deferred reserve rows as plain cascade entries", () => {
    const html = renderToStaticMarkup(
      <RosterPanel
        operators={[makeOperator({ id: "operator/active", name: "Active" })]}
        visitors={[
          {
            id: "visitor/deferred",
            name: "Deferred Recruit",
            desiredRoleTag: "role:medic",
            specialtyTag: "",
            patience: 120,
            quality: 68,
            expectedLoyalty: 58,
            projectedMorale: 66,
            projectedLoyalty: 80,
            presetId: "kael-001",
            personaSummary: null,
            personaHooks: [],
            identitySource: "deterministic",
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
        onSelectVisitor={() => {}}
      />,
    );

    expect(html).toContain("Deferred (1)");
    expect(html).toContain("Deferred Recruit");
    // No inline dismiss action — that belongs to the cascade branch.
    expect(html).not.toContain(">dismiss<");
    // No inline replace-operator picker — that also belongs to the cascade branch.
    expect(html).not.toContain("Replace Operator");
  });
});
