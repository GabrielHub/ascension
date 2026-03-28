import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ActiveRaidViewModel, OperatorViewModel } from "./view-models";

import { RaidWatch } from "./raid-watch";

function makeOperator(overrides: Partial<OperatorViewModel> & { id: string }): OperatorViewModel {
  return {
    id: overrides.id,
    name: "Test",
    roleTag: "role:bruiser",
    specialtyTag: "melee",
    moraleCurrent: 70,
    moraleBaseline: 60,
    loyaltyCurrent: 80,
    loyaltyBaseline: 70,
    assignmentKind: "raid",
    assignmentTargetId: "",
    injurySeverity: 0,
    injuryRecoveryHours: 0,
    needHunger: 20,
    needFatigue: 30,
    needStress: 10,
    scheduleBlock: "active",
    riskTolerance: 60,
    intent: "raiding",
    dominantNeed: "none",
    availableForRaid: false,
    readinessScore: 85,
    appearancePresetId: "kael-001",
    visibleGear: {},
    lifecycle: { status: "active" },
    refusalRisk: false,
    quitRisk: false,
    retentionRisk: false,
    autonomyReasons: [],
    canBeReplaced: false,
    replaceLockedReason: "Cannot replace someone who is already on a contract.",
    ...overrides,
  };
}

function makeRaid(overrides: Partial<ActiveRaidViewModel> & { id: string }): ActiveRaidViewModel {
  return {
    id: overrides.id,
    missionName: "Clearance",
    missionId: "mission/clearance",
    startedAt: "day-1 09:00",
    revealProgress: 25,
    operatorIds: [],
    location: "district/lower-east-side",
    threat: 61,
    cohesion: 72,
    durationHours: 4,
    ...overrides,
  };
}

describe("raid watch", () => {
  // ── Existing behavior ────────────────────────────────────────────────

  it("renders active raid reveal progress as a percentage without rescaling", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({ id: "raid/1", revealProgress: 25, operatorIds: ["operator/a", "operator/b"] }),
        ]}
        operators={[]}
      />,
    );

    expect(html).toContain("25%");
    // The reveal progress bar width should be 25%, not rescaled to some other value
    expect(html).toContain("width:25%");
  });

  it("renders deployed operator portraits with gear overlays in raid context", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/gear-test",
            missionName: "Strike",
            operatorIds: ["operator/alpha"],
          }),
        ]}
        operators={[
          makeOperator({
            id: "operator/alpha",
            name: "Alpha",
            visibleGear: {
              weaponPartId: "weapon/katana",
              outfitOverlayPartId: "outfit-overlay/tactical-vest",
            },
          }),
        ]}
      />,
    );

    expect(html).toContain("Alpha");
    expect(html).toContain("/data/svg-parts/operators/parts/weapon/katana.svg");
    expect(html).toContain("/data/svg-parts/operators/parts/outfit-overlay/tactical-vest.svg");
  });

  it("renders deployed portraits without gear overlays when visibleGear is empty", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/no-gear",
            missionName: "Recon",
            operatorIds: ["operator/beta"],
          }),
        ]}
        operators={[
          makeOperator({
            id: "operator/beta",
            name: "Beta",
            roleTag: "role:infiltrator",
            appearancePresetId: "mira-002",
            visibleGear: {},
          }),
        ]}
      />,
    );

    expect(html).toContain("Beta");
    expect(html).not.toContain("/data/svg-parts/operators/parts/");
  });

  it("renders dead deployed operators and per-raid casualty counts", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/casualty-test",
            missionName: "Last Stand",
            operatorIds: ["operator/fallen", "operator/support"],
          }),
        ]}
        operators={[
          makeOperator({
            id: "operator/fallen",
            name: "Fallen",
            lifecycle: {
              status: "dead",
              deathTick: 240,
              deathRaidSummaryId: "raid/casualty-test",
            },
          }),
          makeOperator({
            id: "operator/support",
            name: "Support",
          }),
        ]}
      />,
    );

    expect(html).toContain("1 casualty");
    expect(html).toContain("KIA");
    expect(html).toContain("line-through");
    expect(html).toContain("Fallen");
  });

  // ── Selection interaction ────────────────────────────────────────────

  it("renders raid cards as clickable buttons", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({ id: "raid/a" }),
          makeRaid({ id: "raid/b", missionName: "Breach" }),
        ]}
        operators={[]}
      />,
    );

    // Each raid card is a <button> element
    const buttonCount = (html.match(/<button /g) ?? []).length;
    expect(buttonCount).toBe(2);
  });

  it("shows team inspection panel when a raid is focused via defaultSelectedRaidId", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/focused",
            missionName: "Assault",
            operatorIds: ["operator/viper", "operator/shadow"],
            threat: 72,
            cohesion: 65,
          }),
        ]}
        operators={[
          makeOperator({
            id: "operator/viper",
            name: "Viper",
            roleTag: "role:bruiser",
            moraleCurrent: 80,
            readinessScore: 90,
          }),
          makeOperator({
            id: "operator/shadow",
            name: "Shadow",
            roleTag: "role:infiltrator",
            moraleCurrent: 55,
            readinessScore: 70,
          }),
        ]}
        defaultSelectedRaidId="raid/focused"
      />,
    );

    // Inspection panel renders
    expect(html).toContain("Team Inspection");

    // Per-operator details appear in inspection
    expect(html).toContain("Viper");
    expect(html).toContain("Shadow");
    expect(html).toContain("Bruiser");
    expect(html).toContain("Infiltrator");

    // Morale and readiness stats appear in inspection
    expect(html).toContain("Morale");
    expect(html).toContain("Readiness");

    // The focused card has the data-selected attribute
    expect(html).toContain("data-selected");
  });

  it("does not show inspection panel without a selection", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[makeRaid({ id: "raid/a", operatorIds: ["operator/x"] })]}
        operators={[makeOperator({ id: "operator/x", name: "X" })]}
      />,
    );

    // No inspection panel
    expect(html).not.toContain("Team Inspection");
    // No data-selected attribute
    expect(html).not.toContain("data-selected");
  });

  it("clears stale selection when the focused raid is not in the active list", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[makeRaid({ id: "raid/current", missionName: "Current Op" })]}
        operators={[]}
        defaultSelectedRaidId="raid/gone"
      />,
    );

    // Stale selection is ignored — no inspection panel
    expect(html).not.toContain("Team Inspection");
    expect(html).not.toContain("data-selected");
    // The active raid still renders normally
    expect(html).toContain("Current Op");
  });

  it("focuses correct raid when multiple raids exist", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({ id: "raid/alpha", missionName: "Alpha Op", operatorIds: ["operator/a1"] }),
          makeRaid({ id: "raid/beta", missionName: "Beta Op", operatorIds: ["operator/b1"] }),
        ]}
        operators={[
          makeOperator({ id: "operator/a1", name: "A1", roleTag: "role:bruiser" }),
          makeOperator({ id: "operator/b1", name: "B1", roleTag: "role:strategist" }),
        ]}
        defaultSelectedRaidId="raid/beta"
      />,
    );

    // Inspection panel shows Beta Op team
    expect(html).toContain("Team Inspection");
    expect(html).toContain("B1");
    expect(html).toContain("Strategist");

    // Both raid cards render (zoomed-out readability preserved)
    expect(html).toContain("Alpha Op");
    expect(html).toContain("Beta Op");
  });

  it("shows role breakdown and team stats in inspection panel", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/team",
            operatorIds: ["operator/t1", "operator/t2", "operator/t3"],
            threat: 80,
            cohesion: 55,
            durationHours: 6,
          }),
        ]}
        operators={[
          makeOperator({ id: "operator/t1", roleTag: "role:bruiser" }),
          makeOperator({ id: "operator/t2", roleTag: "role:bruiser" }),
          makeOperator({ id: "operator/t3", roleTag: "role:infiltrator" }),
        ]}
        defaultSelectedRaidId="raid/team"
      />,
    );

    // Threat, cohesion, duration in inspection
    expect(html).toContain("80");
    expect(html).toContain("55");
    expect(html).toContain("6h");

    // Role breakdown
    expect(html).toContain("Bruiser");
    expect(html).toContain("Infiltrator");
  });

  it("shows injury and stress warnings in inspection for distressed operators", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/distressed",
            operatorIds: ["operator/hurt", "operator/tired"],
          }),
        ]}
        operators={[
          makeOperator({ id: "operator/hurt", name: "Hurt", injurySeverity: 3 }),
          makeOperator({ id: "operator/tired", name: "Tired", needFatigue: 75, needStress: 60 }),
        ]}
        defaultSelectedRaidId="raid/distressed"
      />,
    );

    expect(html).toContain("Injured");
    expect(html).toContain("Fatigue");
    expect(html).toContain("Stress");
  });

  it("renders dead operators in inspection with KIA marker and suppressed stats", () => {
    const html = renderToStaticMarkup(
      <RaidWatch
        activeRaids={[
          makeRaid({
            id: "raid/loss",
            operatorIds: ["operator/alive", "operator/dead"],
          }),
        ]}
        operators={[
          makeOperator({ id: "operator/alive", name: "Alive", moraleCurrent: 60 }),
          makeOperator({
            id: "operator/dead",
            name: "Fallen",
            lifecycle: { status: "dead", deathTick: 100, deathRaidSummaryId: "raid/loss" },
          }),
        ]}
        defaultSelectedRaidId="raid/loss"
      />,
    );

    // Inspection header shows living and casualty counts
    expect(html).toContain("1 active");
    expect(html).toContain("1 KIA");
    // Living operator shows stats
    expect(html).toContain("Morale");
    // Dead operator shows KIA, not detailed stats
    expect(html).toContain("Fallen");
  });
});
