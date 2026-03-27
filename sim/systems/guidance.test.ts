import { describe, expect, it } from "vitest";

import {
  createGuidanceState,
  isBeatEligible,
  isCompletionMet,
  restoreGuidanceState,
  snapshotGuidanceState,
  syncOpeningContractTracking,
  type GuidanceBeat,
} from "./guidance";

const BASE_BEAT: GuidanceBeat = {
  id: "guidance/opening/test",
  track: "opening",
  featureIds: [],
  milestoneOrder: 1,
  delivery: {
    mode: "focused",
    pauseWorld: true,
    allowSkip: false,
    replayPolicy: "manual_replay",
  },
  gating: {
    requiredCompletedBeatIds: [],
  },
  bindings: {},
  copy: {
    title: "Test",
    body: "Test",
    ctaLabel: "Test",
  },
  completion: {
    kind: "acknowledged",
  },
};

describe("guidance eligibility", () => {
  it("supports the new opening gating flags", () => {
    const state = createGuidanceState("active");
    const beat: GuidanceBeat = {
      ...BASE_BEAT,
      gating: {
        requiredCompletedBeatIds: [],
        requireFirstRaidReturn: true,
        requireOperatorWorn: true,
        requireUnassignedManagementAction: true,
        requireUpgradeAffordable: true,
        requireSignificantSetback: true,
        requireSetbackRecoveryTrigger: true,
      },
    };

    expect(
      isBeatEligible(state, beat, {
        currentMinute: 0,
        contractLifecycle: "active",
        hasSecuredContract: true,
        hasActiveIncident: false,
        hasCompletedRaid: true,
        hasTeamDeparted: true,
        hasBossCommitment: false,
        hasRaidReturnWithLoot: false,
        hasOperatorWorn: true,
        hasUnassignedManagementAction: true,
        hasUpgradeAffordable: true,
        hasSignificantSetback: true,
        hasSetbackRecoveryTrigger: true,
        hasAnyUpgradePurchased: false,
        isPreview: false,
      }),
    ).toBe(true);

    expect(
      isBeatEligible(state, beat, {
        currentMinute: 0,
        contractLifecycle: "active",
        hasSecuredContract: true,
        hasActiveIncident: false,
        hasCompletedRaid: true,
        hasTeamDeparted: true,
        hasBossCommitment: false,
        hasRaidReturnWithLoot: false,
        hasOperatorWorn: false,
        hasUnassignedManagementAction: true,
        hasUpgradeAffordable: true,
        hasSignificantSetback: true,
        hasSetbackRecoveryTrigger: true,
        hasAnyUpgradePurchased: false,
        isPreview: false,
      }),
    ).toBe(false);
  });
});

describe("guidance completion evaluation", () => {
  it("supports the new completion kinds", () => {
    expect(
      isCompletionMet(
        { kind: "staffing_action_taken" },
        {
          contractLifecycle: "active",
          hasContractSite: true,
          hasActiveRaidPackets: false,
          hasCompletedRaidReturn: false,
          hasPendingIncident: false,
          hasResolvedIncidentSinceActivation: false,
          hasBossCommitmentResolved: false,
          hasRaidReturnWithLoot: false,
          hasStaffingActionTaken: true,
          hasUpgradePurchased: false,
        },
      ),
    ).toBe(true);

    expect(
      isCompletionMet(
        { kind: "upgrade_purchased" },
        {
          contractLifecycle: "active",
          hasContractSite: true,
          hasActiveRaidPackets: false,
          hasCompletedRaidReturn: false,
          hasPendingIncident: false,
          hasResolvedIncidentSinceActivation: false,
          hasBossCommitmentResolved: false,
          hasRaidReturnWithLoot: false,
          hasStaffingActionTaken: false,
          hasUpgradePurchased: true,
        },
      ),
    ).toBe(true);

    expect(
      isCompletionMet(
        { kind: "room_inspected" },
        {
          contractLifecycle: "active",
          hasContractSite: true,
          hasActiveRaidPackets: false,
          hasCompletedRaidReturn: false,
          hasPendingIncident: false,
          hasResolvedIncidentSinceActivation: false,
          hasBossCommitmentResolved: false,
          hasRaidReturnWithLoot: false,
          hasStaffingActionTaken: false,
          hasUpgradePurchased: false,
        },
      ),
    ).toBe(false);
    expect(
      isCompletionMet(
        { kind: "operator_inspected" },
        {
          contractLifecycle: "active",
          hasContractSite: true,
          hasActiveRaidPackets: false,
          hasCompletedRaidReturn: false,
          hasPendingIncident: false,
          hasResolvedIncidentSinceActivation: false,
          hasBossCommitmentResolved: false,
          hasRaidReturnWithLoot: false,
          hasStaffingActionTaken: false,
          hasUpgradePurchased: false,
        },
      ),
    ).toBe(false);
  });
});

describe("guidance save restore", () => {
  it("round-trips new completion progress fields through snapshot restore", () => {
    const state = createGuidanceState("active");
    state.activeBeatId = "guidance/opening/first-upgrade";
    state.activeBeatView = {
      beatId: "guidance/opening/first-upgrade",
      track: "opening",
      deliveryMode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      copy: {
        title: "First Upgrade",
        body: "Test",
        ctaLabel: "Buy an upgrade",
      },
      milestoneOrder: 11,
      totalMilestones: 13,
      completionKind: "upgrade_purchased",
      requiresManualCompletion: false,
      pauseWorld: true,
      allowSkip: false,
    };
    state.activeBeatProgressBaseline = 2;
    state.interactionCounts.staffingActions = 1;
    state.interactionCounts.upgradesPurchased = 3;
    state.openingTiming = {
      firstRaidReturnCompletedAtMinute: 600,
      firstIncidentSeededAtMinute: 660,
      securedContractCount: 4,
      lastTrackedContractSiteId: "contract/test-4",
    };

    const restored = restoreGuidanceState(snapshotGuidanceState(state));

    expect(restored.activeBeatView?.completionKind).toBe("upgrade_purchased");
    expect(restored.activeBeatProgressBaseline).toBe(2);
    expect(restored.interactionCounts).toEqual({
      staffingActions: 1,
      upgradesPurchased: 3,
    });
    expect(restored.openingTiming).toEqual({
      firstRaidReturnCompletedAtMinute: 600,
      firstIncidentSeededAtMinute: 660,
      securedContractCount: 4,
      lastTrackedContractSiteId: "contract/test-4",
    });
  });

  it("normalizes the active opening contract without double-counting the tracked site", () => {
    const state = createGuidanceState("active");
    state.openingTiming = {
      firstRaidReturnCompletedAtMinute: 480,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 0,
      lastTrackedContractSiteId: null,
    };

    syncOpeningContractTracking(state, "active", "contract/480");
    syncOpeningContractTracking(state, "active", "contract/480");
    syncOpeningContractTracking(state, "active", "contract/481");

    expect(state.openingTiming).toEqual({
      firstRaidReturnCompletedAtMinute: 480,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 2,
      lastTrackedContractSiteId: "contract/481",
    });
  });
});
