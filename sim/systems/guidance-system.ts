/**
 * Guidance ECS system — evaluates beat eligibility each tick,
 * activates the next eligible beat, and checks runtime-detectable
 * completion conditions.
 *
 * Loaded lazily from systems/index.ts to avoid circular imports.
 */

import { BuildingAuthority } from "../components";
import { getCurrentAbsoluteMinute, pushRuntimeEvent } from "./commands";
import { hasBlockingInterruption, enqueueInterruption } from "./interruptions";
import type { InterruptionInstance } from "./interruptions";
import type { SimSystemContext } from "./types";
import {
  activateBeat,
  completeBeat,
  checkOpeningPathCompletion,
  isBeatEligible,
  isCompletionMet,
  recordAnchorFailure,
  resetOpeningPath,
  type GuidanceBeat,
  type GuidanceCompletionContext,
  type GuidanceEvaluationContext,
} from "./guidance";
import {
  OPENING_BEATS,
  OPENING_BEAT_BY_ID,
  OPENING_BEAT_IDS,
  OPENING_BEAT_COUNT,
} from "./guidance-beats";

const EVALUATION_INTERVAL_MINUTES = 5;

function canLayerGuidanceOverInterruption(
  activeInterruption: InterruptionInstance | null,
  beat: GuidanceBeat,
): boolean {
  if (!activeInterruption || beat.delivery.mode !== "blocking") {
    return false;
  }

  if (beat.completion.kind === "incident_resolved") {
    return activeInterruption.payload.kind === "incident";
  }

  if (beat.completion.kind === "boss_commitment_resolved") {
    return activeInterruption.payload.kind === "raid_boss_commitment";
  }

  return false;
}

function buildEvaluationContext(context: SimSystemContext): GuidanceEvaluationContext {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const activeRaidPackets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const incidentState = context.runtimeState.incidentState;

  // Check if there's an active boss commitment interruption in the queue
  const { interruptionQueue } = context.runtimeState;
  const hasBossCommitment =
    interruptionQueue.active?.type === "raid_boss_commitment" ||
    interruptionQueue.queue.some((i) => i.type === "raid_boss_commitment");

  // Check for loot in any completed raid
  const hasRaidReturnWithLoot = raidSummaries.some(
    (s) => s.result === "success" || s.result === "mixed",
  );

  return {
    currentMinute: getCurrentAbsoluteMinute(context),
    contractLifecycle,
    hasSecuredContract: contractSite !== null && contractSite !== undefined,
    hasActiveIncident: incidentState.pendingIncident !== null,
    hasCompletedRaid: raidSummaries.length > 0,
    hasTeamDeparted: activeRaidPackets.length > 0 || raidSummaries.length > 0,
    hasBossCommitment,
    hasRaidReturnWithLoot,
    isPreview:
      context.runtimeState.guidanceState.openingPathState === "completed" &&
      context.runtimeState.guidanceState.completedBeatIds.length === 0,
  };
}

function buildCompletionContext(context: SimSystemContext): GuidanceCompletionContext {
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const activeRaidPackets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const incidentState = context.runtimeState.incidentState;

  return {
    contractLifecycle,
    hasContractSite: contractSite !== null && contractSite !== undefined,
    hasActiveRaidPackets: activeRaidPackets.length > 0,
    hasCompletedRaidReturn: raidSummaries.length > 0,
    hasPendingIncident: incidentState.pendingIncident !== null,
    hasResolvedIncidentSinceActivation: incidentState.history.length > 0,
    hasBossCommitmentResolved: false, // Detected via command handler
    hasRaidReturnWithLoot: raidSummaries.some(
      (s) => s.result === "success" || s.result === "mixed",
    ),
  };
}

function enqueueGuidanceInterruption(context: SimSystemContext, beat: GuidanceBeat): void {
  const activeInterruption = context.runtimeState.interruptionQueue.active;
  const layeredOverActiveInterruption = canLayerGuidanceOverInterruption(activeInterruption, beat);

  enqueueInterruption(
    context.runtimeState.interruptionQueue,
    "guidance",
    {
      kind: "guidance",
      beatId: beat.id,
      track: beat.track,
      title: beat.copy.title,
      body: beat.copy.body,
      subtitle: beat.copy.subtitle,
      ctaLabel: beat.copy.ctaLabel,
      deliveryMode: beat.delivery.mode,
      milestoneOrder: beat.milestoneOrder,
      totalMilestones: OPENING_BEAT_COUNT,
      completionKind: beat.completion.kind,
      fallbackBody: beat.copy.fallbackBody,
    },
    "guidance",
    getCurrentAbsoluteMinute(context),
    {
      priority: layeredOverActiveInterruption ? (activeInterruption?.priority ?? 0) + 1 : undefined,
      blockingMode: "blocking",
      dismissible: beat.delivery.allowSkip,
      persistence: "persistent",
    },
  );
}

export function advanceGuidanceSystem(context: SimSystemContext, _deltaMs: number): void {
  const { guidanceState, interruptionQueue } = context.runtimeState;

  // Opening path not active → skip
  if (guidanceState.openingPathState !== "active") {
    return;
  }

  // If a beat is active, always check for runtime-detectable completion
  // (must run even when world is frozen so contract_secured etc. can fire)
  if (guidanceState.activeBeatId) {
    const activeBeat = OPENING_BEAT_BY_ID.get(guidanceState.activeBeatId);
    if (activeBeat) {
      const completionContext = buildCompletionContext(context);
      if (isCompletionMet(activeBeat.completion, completionContext)) {
        completeActiveBeat(context, activeBeat);
      } else {
        return;
      }
    }
  }

  const currentMinute = getCurrentAbsoluteMinute(context);

  // Throttle new-beat evaluation (not completion checks)
  if (currentMinute - guidanceState.lastEvaluationMinute < EVALUATION_INTERVAL_MINUTES) return;
  guidanceState.lastEvaluationMinute = currentMinute;

  // Find the next eligible beat
  const evalContext = buildEvaluationContext(context);
  for (const beat of OPENING_BEATS) {
    if (isBeatEligible(guidanceState, beat, evalContext)) {
      if (
        hasBlockingInterruption(interruptionQueue) &&
        !canLayerGuidanceOverInterruption(interruptionQueue.active, beat)
      ) {
        continue;
      }

      activateBeat(guidanceState, beat, OPENING_BEAT_COUNT);

      // Blocking beats go through the interruption queue
      if (beat.delivery.mode === "blocking") {
        enqueueGuidanceInterruption(context, beat);
      }
      // Focused beats that pause world freeze simulation directly
      else if (beat.delivery.pauseWorld) {
        context.runtimeState.worldTimeFrozen = true;
      }

      // Log to event log
      if (beat.copy.eventLogSummary) {
        pushRuntimeEvent(context, {
          kind: "guidance",
          message: beat.copy.eventLogSummary,
        });
      }

      break;
    }
  }
}

function completeActiveBeat(context: SimSystemContext, beat: GuidanceBeat): void {
  const { guidanceState } = context.runtimeState;
  completeBeat(guidanceState, beat.id);

  // Unfreeze world if this beat was pausing it
  if (beat.delivery.pauseWorld && beat.delivery.mode === "focused") {
    context.runtimeState.worldTimeFrozen = false;
  }

  // Reset evaluation throttle so the next beat can activate promptly
  guidanceState.lastEvaluationMinute = 0;

  // Check if opening path is complete
  checkOpeningPathCompletion(guidanceState, OPENING_BEAT_IDS);
}

export function handleGuidanceComplete(
  context: SimSystemContext,
  beatId: string,
  signal: string,
): void {
  const { guidanceState } = context.runtimeState;
  if (guidanceState.activeBeatId !== beatId) return;

  const beat = OPENING_BEAT_BY_ID.get(beatId);
  if (!beat) return;

  // Validate signal matches completion rule
  if (beat.completion.kind !== signal) return;

  completeActiveBeat(context, beat);
  advanceGuidanceSystem(context, 0);
}

export function handleGuidanceDismiss(context: SimSystemContext, beatId: string): void {
  const { guidanceState } = context.runtimeState;
  if (guidanceState.activeBeatId !== beatId) return;

  const beat = OPENING_BEAT_BY_ID.get(beatId);
  if (!beat || !beat.delivery.allowSkip) return;

  guidanceState.activeBeatId = null;
  guidanceState.activeBeatView = null;
  if (!guidanceState.dismissedBeatIds.includes(beatId)) {
    guidanceState.dismissedBeatIds.push(beatId);
  }

  // Unfreeze world
  if (beat.delivery.pauseWorld && beat.delivery.mode === "focused") {
    context.runtimeState.worldTimeFrozen = false;
  }
}

export function handleGuidanceResetOpening(context: SimSystemContext): void {
  resetOpeningPath(context.runtimeState.guidanceState, OPENING_BEAT_IDS);
}

export function handleGuidanceRecordAnchorFailure(
  context: SimSystemContext,
  beatId: string,
  anchorId: string,
  fallbackUsed: boolean,
): void {
  recordAnchorFailure(
    context.runtimeState.guidanceState,
    beatId,
    anchorId,
    getCurrentAbsoluteMinute(context),
    fallbackUsed,
  );
}
