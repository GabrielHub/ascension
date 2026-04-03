/**
 * Runtime guidance system — types, state, evaluation, and save/load.
 *
 * Owns progression, eligibility, and completion state for tutorials,
 * focused walkthroughs, and blocking narrative beats.
 * Reuses the interruption framework for blocking delivery.
 *
 * This is a leaf module with no circular dependencies.
 */

// ── Beat schema ──────────────────────────────────────────────────────

export type GuidanceTrack = "opening" | "feature_intro" | "narrative";
export type GuidanceDeliveryMode = "passive" | "focused" | "blocking";
export type GuidanceReplayPolicy = "none" | "manual_replay";

export type GuidanceCompletionKind =
  | "acknowledged"
  | "intent_fired"
  | "target_opened"
  | "room_inspected"
  | "operator_inspected"
  | "contract_secured"
  | "team_departed"
  | "team_returned"
  | "incident_resolved"
  | "boss_commitment_resolved"
  | "market_opened"
  | "staffing_action_taken"
  | "upgrade_purchased";

export interface GuidanceCompletionRule {
  kind: GuidanceCompletionKind;
  targetAnchorId?: string;
  intentType?: string;
  requiresManualCompletion?: boolean;
  upgradeId?: string;
}

export interface GuidanceBeatGating {
  requiredCompletedBeatIds: string[];
  requiredBuildingId?: string;
  minimumBuildingTier?: number;
  requiredContractLifecycle?: "idle" | "bidding" | "active" | "resolved";
  minimumSecuredContractCount?: number;
  requiredAffordableUpgradeId?: string;
  requiredAppliedUpgradeIds?: string[];
  requiredMissingUpgradeId?: string;
  requireFirstContractSecured?: boolean;
  requireFirstIncidentEligible?: boolean;
  requireFirstRaidReturn?: boolean;
  requireFirstBossCommitment?: boolean;
  requireFirstTeamDeparture?: boolean;
  requireFirstRaidReturnWithLoot?: boolean;
  requireOperatorWorn?: boolean;
  requireUnassignedManagementAction?: boolean;
  requireUpgradeAffordable?: boolean;
  requireSignificantSetback?: boolean;
  requireSetbackRecoveryTrigger?: boolean;
  requireRecoveryPressure?: boolean;
  requireContractPrepGap?: boolean;
  requireStagingPressure?: boolean;
}

export interface GuidanceBeatCopy {
  title: string;
  body: string;
  subtitle?: string;
  ctaLabel: string;
  ctaDismissLabel?: string;
  fallbackBody?: string;
  eventLogSummary?: string;
}

export interface GuidanceBeatDelivery {
  mode: GuidanceDeliveryMode;
  target?: string;
  fallbackIntent?: string;
  pauseWorld: boolean;
  allowSkip: boolean;
  replayPolicy: GuidanceReplayPolicy;
}

export interface GuidanceBeat {
  id: string;
  track: GuidanceTrack;
  featureIds: string[];
  milestoneOrder: number;
  presenterId?: string;
  presenterExpression?: string;
  delivery: GuidanceBeatDelivery;
  gating: GuidanceBeatGating;
  bindings: Record<string, string>;
  copy: GuidanceBeatCopy;
  completion: GuidanceCompletionRule;
}

// ── Active beat view (stored in runtime state for view projection) ───

export interface GuidanceActiveBeatView {
  beatId: string;
  track: GuidanceTrack;
  deliveryMode: GuidanceDeliveryMode;
  target: string | null;
  fallbackIntent: string | null;
  presenterId?: string;
  presenterExpression?: string;
  copy: GuidanceBeatCopy;
  milestoneOrder: number;
  totalMilestones: number;
  completionKind: GuidanceCompletionKind;
  requiresManualCompletion?: boolean;
  pauseWorld: boolean;
  allowSkip: boolean;
}

// ── Anchor types ─────────────────────────────────────────────────────

export interface AnchorRegistration {
  anchorId: string;
  element: HTMLElement | null;
  visible: boolean;
}

export interface AnchorResolutionFailure {
  beatId: string;
  anchorId: string;
  attemptedAt: number;
  fallbackUsed: boolean;
}

// ── Runtime state ────────────────────────────────────────────────────

export type OpeningPathState = "active" | "completed" | "reset";

export interface GuidanceOpeningTimingState {
  firstRaidReturnCompletedAtMinute: number | null;
  firstIncidentSeededAtMinute: number | null;
  securedContractCount?: number;
  lastTrackedContractSiteId?: string | null;
}

function createOpeningTimingState(): GuidanceOpeningTimingState {
  return {
    firstRaidReturnCompletedAtMinute: null,
    firstIncidentSeededAtMinute: null,
    securedContractCount: 0,
    lastTrackedContractSiteId: null,
  };
}

export interface GuidanceState {
  seenBeatIds: string[];
  completedBeatIds: string[];
  dismissedBeatIds: string[];
  activeBeatId: string | null;
  activeBeatView: GuidanceActiveBeatView | null;
  queuedBeatIds: string[];
  lastEvaluationMinute: number;
  openingPathState: OpeningPathState;
  anchorResolutionFailures: AnchorResolutionFailure[];
  activeBeatProgressBaseline: number | null;
  interactionCounts: {
    staffingActions: number;
    upgradesPurchased: number;
  };
  lastPurchasedUpgradeId: string | null;
  openingTiming?: GuidanceOpeningTimingState;
}

export function createGuidanceState(
  openingPathState: OpeningPathState = "completed",
): GuidanceState {
  return {
    seenBeatIds: [],
    completedBeatIds: [],
    dismissedBeatIds: [],
    activeBeatId: null,
    activeBeatView: null,
    queuedBeatIds: [],
    lastEvaluationMinute: 0,
    openingPathState,
    anchorResolutionFailures: [],
    activeBeatProgressBaseline: null,
    interactionCounts: {
      staffingActions: 0,
      upgradesPurchased: 0,
    },
    lastPurchasedUpgradeId: null,
    openingTiming: createOpeningTimingState(),
  };
}

// ── Save/load ────────────────────────────────────────────────────────

export interface GuidanceStateSnapshot {
  seenBeatIds: string[];
  completedBeatIds: string[];
  dismissedBeatIds: string[];
  activeBeatId: string | null;
  activeBeatView: GuidanceActiveBeatView | null;
  queuedBeatIds: string[];
  lastEvaluationMinute: number;
  openingPathState: OpeningPathState;
  anchorResolutionFailures: AnchorResolutionFailure[];
  activeBeatProgressBaseline: number | null;
  interactionCounts: {
    staffingActions: number;
    upgradesPurchased: number;
  };
  lastPurchasedUpgradeId: string | null;
  openingTiming?: GuidanceOpeningTimingState;
}

export function snapshotGuidanceState(state: GuidanceState): GuidanceStateSnapshot {
  const openingTiming = ensureOpeningTimingState(state);

  return {
    seenBeatIds: [...state.seenBeatIds],
    completedBeatIds: [...state.completedBeatIds],
    dismissedBeatIds: [...state.dismissedBeatIds],
    activeBeatId: state.activeBeatId,
    activeBeatView: state.activeBeatView ? { ...state.activeBeatView } : null,
    queuedBeatIds: [...state.queuedBeatIds],
    lastEvaluationMinute: state.lastEvaluationMinute,
    openingPathState: state.openingPathState,
    anchorResolutionFailures: state.anchorResolutionFailures.map((f) => ({ ...f })),
    activeBeatProgressBaseline: state.activeBeatProgressBaseline,
    interactionCounts: { ...state.interactionCounts },
    lastPurchasedUpgradeId: state.lastPurchasedUpgradeId,
    openingTiming: { ...openingTiming },
  };
}

export function restoreGuidanceState(snapshot: GuidanceStateSnapshot | undefined): GuidanceState {
  if (!snapshot) {
    // Old saves without guidance → default to completed (no guidance)
    return createGuidanceState("completed");
  }
  return {
    seenBeatIds: [...(snapshot.seenBeatIds ?? [])],
    completedBeatIds: [...(snapshot.completedBeatIds ?? [])],
    dismissedBeatIds: [...(snapshot.dismissedBeatIds ?? [])],
    activeBeatId: snapshot.activeBeatId ?? null,
    activeBeatView: snapshot.activeBeatView ? { ...snapshot.activeBeatView } : null,
    queuedBeatIds: [...(snapshot.queuedBeatIds ?? [])],
    lastEvaluationMinute: snapshot.lastEvaluationMinute ?? 0,
    openingPathState: snapshot.openingPathState ?? "completed",
    anchorResolutionFailures: (snapshot.anchorResolutionFailures ?? []).map((f) => ({ ...f })),
    activeBeatProgressBaseline:
      typeof snapshot.activeBeatProgressBaseline === "number"
        ? snapshot.activeBeatProgressBaseline
        : null,
    interactionCounts: {
      staffingActions: snapshot.interactionCounts?.staffingActions ?? 0,
      upgradesPurchased: snapshot.interactionCounts?.upgradesPurchased ?? 0,
    },
    lastPurchasedUpgradeId:
      typeof snapshot.lastPurchasedUpgradeId === "string" ? snapshot.lastPurchasedUpgradeId : null,
    openingTiming: {
      firstRaidReturnCompletedAtMinute:
        typeof snapshot.openingTiming?.firstRaidReturnCompletedAtMinute === "number"
          ? snapshot.openingTiming.firstRaidReturnCompletedAtMinute
          : null,
      firstIncidentSeededAtMinute:
        typeof snapshot.openingTiming?.firstIncidentSeededAtMinute === "number"
          ? snapshot.openingTiming.firstIncidentSeededAtMinute
          : null,
      securedContractCount:
        typeof snapshot.openingTiming?.securedContractCount === "number"
          ? snapshot.openingTiming.securedContractCount
          : 0,
      lastTrackedContractSiteId:
        typeof snapshot.openingTiming?.lastTrackedContractSiteId === "string"
          ? snapshot.openingTiming.lastTrackedContractSiteId
          : null,
    },
  };
}

export function ensureOpeningTimingState(state: GuidanceState): GuidanceOpeningTimingState {
  if (!state.openingTiming) {
    state.openingTiming = createOpeningTimingState();
  }

  return state.openingTiming;
}

export function syncOpeningContractTracking(
  state: { openingTiming?: GuidanceOpeningTimingState },
  contractLifecycle: string,
  contractSiteId: string | null | undefined,
): GuidanceOpeningTimingState {
  const openingTiming = state.openingTiming ?? createOpeningTimingState();
  state.openingTiming = openingTiming;

  if (
    contractLifecycle === "active" &&
    contractSiteId &&
    openingTiming.lastTrackedContractSiteId !== contractSiteId
  ) {
    openingTiming.lastTrackedContractSiteId = contractSiteId;
    openingTiming.securedContractCount = (openingTiming.securedContractCount ?? 0) + 1;
  }

  return openingTiming;
}

// ── Eligibility ──────────────────────────────────────────────────────

export interface GuidanceEvaluationContext {
  currentMinute: number;
  activeBuildingId: string;
  activeBuildingTier: number;
  contractLifecycle: string;
  securedContractCount: number;
  affordableUpgradeIds: readonly string[];
  appliedUpgradeIds: readonly string[];
  hasSecuredContract: boolean;
  hasActiveIncident: boolean;
  hasCompletedRaid: boolean;
  hasTeamDeparted: boolean;
  hasBossCommitment: boolean;
  hasRaidReturnWithLoot: boolean;
  hasOperatorWorn: boolean;
  hasUnassignedManagementAction: boolean;
  hasUpgradeAffordable: boolean;
  hasSignificantSetback: boolean;
  hasSetbackRecoveryTrigger: boolean;
  hasRecoveryPressure: boolean;
  hasContractPrepGap: boolean;
  hasStagingPressure: boolean;
  hasAnyUpgradePurchased: boolean;
  isPreview: boolean;
}

export function isBeatEligible(
  state: GuidanceState,
  beat: GuidanceBeat,
  evalContext: GuidanceEvaluationContext,
): boolean {
  // Already completed, dismissed, or currently active
  if (state.completedBeatIds.includes(beat.id)) return false;
  if (state.activeBeatId !== null) return false;

  // Opening path must be active for opening-track beats
  if (beat.track === "opening" && state.openingPathState !== "active") return false;

  // Suppressed in preview mode
  if (evalContext.isPreview) return false;

  // Required completed beats
  for (const requiredId of beat.gating.requiredCompletedBeatIds) {
    if (!state.completedBeatIds.includes(requiredId)) return false;
  }

  if (
    beat.gating.requiredBuildingId &&
    evalContext.activeBuildingId !== beat.gating.requiredBuildingId
  ) {
    return false;
  }
  if (
    beat.gating.minimumBuildingTier !== undefined &&
    evalContext.activeBuildingTier < beat.gating.minimumBuildingTier
  ) {
    return false;
  }
  if (
    beat.gating.requiredAffordableUpgradeId &&
    !evalContext.affordableUpgradeIds.includes(beat.gating.requiredAffordableUpgradeId)
  ) {
    return false;
  }
  if (
    beat.gating.requiredAppliedUpgradeIds &&
    !beat.gating.requiredAppliedUpgradeIds.every((upgradeId) =>
      evalContext.appliedUpgradeIds.includes(upgradeId),
    )
  ) {
    return false;
  }
  if (
    beat.gating.requiredMissingUpgradeId &&
    evalContext.appliedUpgradeIds.includes(beat.gating.requiredMissingUpgradeId)
  ) {
    return false;
  }

  // Contract lifecycle gate
  if (
    beat.gating.requiredContractLifecycle &&
    evalContext.contractLifecycle !== beat.gating.requiredContractLifecycle
  ) {
    return false;
  }
  if (
    beat.gating.minimumSecuredContractCount !== undefined &&
    evalContext.securedContractCount < beat.gating.minimumSecuredContractCount
  ) {
    return false;
  }

  // First-seen gates
  if (beat.gating.requireFirstContractSecured && !evalContext.hasSecuredContract) return false;
  if (beat.gating.requireFirstIncidentEligible && !evalContext.hasActiveIncident) return false;
  if (beat.gating.requireFirstRaidReturn && !evalContext.hasCompletedRaid) return false;
  if (beat.gating.requireFirstTeamDeparture && !evalContext.hasTeamDeparted) return false;
  if (beat.gating.requireFirstBossCommitment && !evalContext.hasBossCommitment) return false;
  if (beat.gating.requireFirstRaidReturnWithLoot && !evalContext.hasRaidReturnWithLoot) {
    return false;
  }
  if (beat.gating.requireOperatorWorn && !evalContext.hasOperatorWorn) return false;
  if (beat.gating.requireUnassignedManagementAction && !evalContext.hasUnassignedManagementAction) {
    return false;
  }
  if (beat.gating.requireUpgradeAffordable && !evalContext.hasUpgradeAffordable) return false;
  if (beat.gating.requireSignificantSetback && !evalContext.hasSignificantSetback) return false;
  if (beat.gating.requireSetbackRecoveryTrigger && !evalContext.hasSetbackRecoveryTrigger) {
    return false;
  }
  if (beat.gating.requireRecoveryPressure && !evalContext.hasRecoveryPressure) return false;
  if (beat.gating.requireContractPrepGap && !evalContext.hasContractPrepGap) return false;
  if (beat.gating.requireStagingPressure && !evalContext.hasStagingPressure) return false;

  return true;
}

// ── Beat activation ──────────────────────────────────────────────────

export function activateBeat(
  state: GuidanceState,
  beat: GuidanceBeat,
  totalMilestones: number,
): void {
  state.activeBeatId = beat.id;
  state.activeBeatProgressBaseline =
    beat.completion.kind === "staffing_action_taken"
      ? state.interactionCounts.staffingActions
      : beat.completion.kind === "upgrade_purchased"
        ? state.interactionCounts.upgradesPurchased
        : null;
  state.activeBeatView = {
    beatId: beat.id,
    track: beat.track,
    deliveryMode: beat.delivery.mode,
    target: beat.delivery.target ?? null,
    fallbackIntent: beat.delivery.fallbackIntent ?? null,
    presenterId: beat.presenterId,
    presenterExpression: beat.presenterExpression,
    copy: beat.copy,
    milestoneOrder: beat.milestoneOrder,
    totalMilestones,
    completionKind: beat.completion.kind,
    requiresManualCompletion: beat.completion.requiresManualCompletion,
    pauseWorld: beat.delivery.pauseWorld,
    allowSkip: beat.delivery.allowSkip,
  };
  if (!state.seenBeatIds.includes(beat.id)) {
    state.seenBeatIds.push(beat.id);
  }
}

export function completeBeat(state: GuidanceState, beatId: string): void {
  if (state.activeBeatId === beatId) {
    state.activeBeatId = null;
    state.activeBeatView = null;
    state.activeBeatProgressBaseline = null;
  }
  if (!state.completedBeatIds.includes(beatId)) {
    state.completedBeatIds.push(beatId);
  }
  const idx = state.queuedBeatIds.indexOf(beatId);
  if (idx >= 0) state.queuedBeatIds.splice(idx, 1);
}

export function dismissBeat(state: GuidanceState, beatId: string): void {
  if (state.activeBeatId === beatId) {
    state.activeBeatId = null;
    state.activeBeatView = null;
    state.activeBeatProgressBaseline = null;
  }
  if (!state.dismissedBeatIds.includes(beatId)) {
    state.dismissedBeatIds.push(beatId);
  }
}

export function recordAnchorFailure(
  state: GuidanceState,
  beatId: string,
  anchorId: string,
  currentMinute: number,
  fallbackUsed: boolean,
): void {
  state.anchorResolutionFailures.push({
    beatId,
    anchorId,
    attemptedAt: currentMinute,
    fallbackUsed,
  });
}

// ── Opening path helpers ─────────────────────────────────────────────

export function checkOpeningPathCompletion(
  state: GuidanceState,
  openingBeatIds: readonly string[],
): void {
  if (state.openingPathState !== "active") return;
  const allCompleted = openingBeatIds.every((id) => state.completedBeatIds.includes(id));
  if (allCompleted) {
    state.openingPathState = "completed";
  }
}

export function resetOpeningPath(state: GuidanceState, openingBeatIds: readonly string[]): void {
  state.openingPathState = "active";
  for (const id of openingBeatIds) {
    const completedIdx = state.completedBeatIds.indexOf(id);
    if (completedIdx >= 0) state.completedBeatIds.splice(completedIdx, 1);
    const seenIdx = state.seenBeatIds.indexOf(id);
    if (seenIdx >= 0) state.seenBeatIds.splice(seenIdx, 1);
    const dismissedIdx = state.dismissedBeatIds.indexOf(id);
    if (dismissedIdx >= 0) state.dismissedBeatIds.splice(dismissedIdx, 1);
  }
  state.activeBeatId = null;
  state.activeBeatView = null;
  state.queuedBeatIds = [];
  state.lastEvaluationMinute = 0;
  state.anchorResolutionFailures = [];
  state.activeBeatProgressBaseline = null;
  state.interactionCounts = {
    staffingActions: 0,
    upgradesPurchased: 0,
  };
  state.lastPurchasedUpgradeId = null;
  state.openingTiming = createOpeningTimingState();
}

export function recordGuidanceInteraction(
  state: GuidanceState,
  kind: "staffing_action" | "upgrade_purchase",
  upgradeId?: string,
): void {
  if (kind === "staffing_action") {
    state.interactionCounts.staffingActions += 1;
    return;
  }

  state.interactionCounts.upgradesPurchased += 1;
  state.lastPurchasedUpgradeId = upgradeId ?? null;
}

// ── Completion checking ──────────────────────────────────────────────

export interface GuidanceCompletionContext {
  contractLifecycle: string;
  hasContractSite: boolean;
  hasActiveRaidPackets: boolean;
  hasCompletedRaidReturn: boolean;
  hasPendingIncident: boolean;
  hasResolvedIncidentSinceActivation: boolean;
  hasBossCommitmentResolved: boolean;
  hasRaidReturnWithLoot: boolean;
  hasStaffingActionTaken: boolean;
  hasUpgradePurchased: boolean;
  lastPurchasedUpgradeId: string | null;
}

export function isCompletionMet(
  rule: GuidanceCompletionRule,
  completionContext: GuidanceCompletionContext,
): boolean {
  if (rule.requiresManualCompletion) {
    return false;
  }

  switch (rule.kind) {
    case "acknowledged":
      // Completed by explicit user action (handled by command)
      return false;
    case "target_opened":
      // Completed by UI signal (handled by command)
      return false;
    case "room_inspected":
      // Completed by UI signal (handled by command)
      return false;
    case "operator_inspected":
      // Completed by UI signal (handled by command)
      return false;
    case "intent_fired":
      // Completed by UI signal (handled by command)
      return false;
    case "market_opened":
      // Completed by UI signal (handled by command)
      return false;
    case "contract_secured":
      return completionContext.hasContractSite && completionContext.contractLifecycle === "active";
    case "team_departed":
      return completionContext.hasActiveRaidPackets;
    case "team_returned":
      return completionContext.hasCompletedRaidReturn;
    case "incident_resolved":
      return completionContext.hasResolvedIncidentSinceActivation;
    case "boss_commitment_resolved":
      return completionContext.hasBossCommitmentResolved;
    case "staffing_action_taken":
      return completionContext.hasStaffingActionTaken;
    case "upgrade_purchased":
      return rule.upgradeId
        ? completionContext.lastPurchasedUpgradeId === rule.upgradeId
        : completionContext.hasUpgradePurchased;
  }
}
