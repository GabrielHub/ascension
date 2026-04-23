/**
 * Guidance ECS system — evaluates beat eligibility each tick,
 * activates the next eligible beat, and checks runtime-detectable
 * completion conditions.
 *
 * Loaded lazily from systems/index.ts to avoid circular imports.
 */

import { getNextPendingRoomUpgradeIds } from "lib/hq-room-state";
import { formatIdentityText } from "lib/game-identity";

import {
  BuildingAuthority,
  EventState,
  InjuryState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  RoomInstance,
} from "../components";
import {
  getCurrentAbsoluteMinute,
  getAdjustedUpgradeCosts,
  meetsRequirements,
  pushRuntimeEvent,
  readResourceBalance,
  getGuildIdentity,
} from "./commands";
import { hasBlockingInterruption, enqueueInterruption } from "./interruptions";
import type { InterruptionInstance } from "./interruptions";
import type { SimSystemContext } from "./types";
import {
  activateBeat,
  completeBeat,
  checkOpeningPathCompletion,
  ensureOpeningTimingState,
  hasActiveFocusedGuidancePause,
  isBeatEligible,
  isCompletionMet,
  recordAnchorFailure,
  recordGuidanceInteraction,
  resetOpeningPath,
  syncOpeningContractTracking,
  type GuidanceBeat,
  type GuidanceCompletionContext,
  type GuidanceEvaluationContext,
} from "./guidance";
import { forceSeedOpeningIncident, queueIncident } from "./incidents";
import {
  FIRST_RAID_RETURN_BEAT_ID,
  ALL_GUIDANCE_BEATS,
  ALL_GUIDANCE_BEAT_BY_ID,
  GUIDANCE_BEAT_COUNT_BY_TRACK,
  OPENING_BEAT_IDS,
} from "./guidance-beats";

const EVALUATION_INTERVAL_MINUTES = 5;
const FIRST_INCIDENT_BEAT_ID = "guidance/opening/first-incident";
const FIRST_INCIDENT_FORCE_SEED_DELAY_MINUTES = 60;

function formatBeatCopy(context: SimSystemContext, beat: GuidanceBeat): GuidanceBeat["copy"] {
  const identity = getGuildIdentity(context);
  return {
    ...beat.copy,
    title: formatIdentityText(beat.copy.title, identity),
    subtitle: beat.copy.subtitle ? formatIdentityText(beat.copy.subtitle, identity) : undefined,
    body: formatIdentityText(beat.copy.body, identity),
    ctaLabel: formatIdentityText(beat.copy.ctaLabel, identity),
    ctaDismissLabel: beat.copy.ctaDismissLabel
      ? formatIdentityText(beat.copy.ctaDismissLabel, identity)
      : undefined,
    fallbackBody: beat.copy.fallbackBody
      ? formatIdentityText(beat.copy.fallbackBody, identity)
      : undefined,
    eventLogSummary: beat.copy.eventLogSummary
      ? formatIdentityText(beat.copy.eventLogSummary, identity)
      : undefined,
  };
}

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

function hasOperatorWorn(context: SimSystemContext): boolean {
  return context.runtimeState.operatorEntities.some((entity) => {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") {
      return false;
    }

    return (
      NeedState.fatigue[entity] > 30 ||
      InjuryState.severity[entity] > 0 ||
      MoraleState.current[entity] < MoraleState.baseline[entity] - 10
    );
  });
}

function hasUnassignedManagementAction(context: SimSystemContext): boolean {
  if (getAffordableUpgradeIds(context).length > 0) {
    return true;
  }

  const buildingEntity = context.singletonEntities.building;
  const roomSlotCount = BuildingAuthority.roomSlotCount[buildingEntity] ?? 0;
  if (context.runtimeState.roomEntities.length >= roomSlotCount) {
    return false;
  }

  const placedRoomTemplateIds = new Set(
    context.runtimeState.roomEntities.map((entity) => {
      return context.registry.rooms[RoomInstance.templateIndex[entity]]?.id ?? "";
    }),
  );
  const unlockedRoomTemplateIds = BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] ?? [];

  return unlockedRoomTemplateIds.some(
    (roomTemplateId) => !placedRoomTemplateIds.has(roomTemplateId),
  );
}

function hasAnyUpgradePurchased(context: SimSystemContext): boolean {
  const buildingEntity = context.singletonEntities.building;

  if ((BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? []).length > 0) {
    return true;
  }

  return context.runtimeState.roomEntities.some(
    (entity) => (RoomInstance.appliedUpgradeIds[entity] ?? []).length > 0,
  );
}

function getAllAppliedUpgradeIds(context: SimSystemContext): string[] {
  const buildingEntity = context.singletonEntities.building;

  return [
    ...(BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? []),
    ...context.runtimeState.roomEntities.flatMap(
      (entity) => RoomInstance.appliedUpgradeIds[entity] ?? [],
    ),
  ];
}

function getAffordableUpgradeIds(context: SimSystemContext): string[] {
  const buildingEntity = context.singletonEntities.building;
  const activeBuilding =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];
  const buildingAppliedUpgradeIds = new Set(
    BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? [],
  );
  const affordableUpgradeIds: string[] = [];

  if (!activeBuilding) {
    return affordableUpgradeIds;
  }

  const canAffordCosts = (costs: Map<string, number>) =>
    Array.from(costs.entries()).every(([resourceId, amount]) => {
      return readResourceBalance(context, resourceId) >= amount;
    });
  const isUpgradeAffordable = (upgradeId: string) => {
    const upgrade = context.registry.upgradeById.get(upgradeId);
    if (!upgrade || !meetsRequirements(context, upgrade.requirements)) {
      return false;
    }

    if (upgrade.target === "building") {
      return (
        upgrade.targetId === activeBuilding?.id &&
        !buildingAppliedUpgradeIds.has(upgrade.id) &&
        canAffordCosts(getAdjustedUpgradeCosts(context, upgrade.requirements))
      );
    }

    const roomEntity = context.runtimeState.roomEntities.find((entity) => {
      const roomTemplate = context.registry.rooms[RoomInstance.templateIndex[entity]];
      return roomTemplate?.id === upgrade.targetId;
    });
    if (roomEntity === undefined) {
      return false;
    }

    const appliedUpgradeIds = RoomInstance.appliedUpgradeIds[roomEntity] ?? [];
    const roomTemplate = context.registry.rooms[RoomInstance.templateIndex[roomEntity]];
    const nextPendingIds = new Set(
      getNextPendingRoomUpgradeIds(roomTemplate.id, appliedUpgradeIds),
    );
    if (appliedUpgradeIds.includes(upgrade.id)) {
      return false;
    }
    if (nextPendingIds.size > 0 && !nextPendingIds.has(upgrade.id)) {
      return false;
    }

    return canAffordCosts(getAdjustedUpgradeCosts(context, upgrade.requirements));
  };

  if (
    context.runtimeState.guidanceState.openingPathState === "active" &&
    !hasAnyUpgradePurchased(context)
  ) {
    return isUpgradeAffordable("upgrade/room/register:records_wall")
      ? ["upgrade/room/register:records_wall"]
      : [];
  }

  for (const upgrade of context.registry.upgrades) {
    if (upgrade.target !== "building" || upgrade.targetId !== activeBuilding?.id) {
      continue;
    }
    if (
      buildingAppliedUpgradeIds.has(upgrade.id) ||
      !meetsRequirements(context, upgrade.requirements)
    ) {
      continue;
    }
    if (canAffordCosts(getAdjustedUpgradeCosts(context, upgrade.requirements))) {
      affordableUpgradeIds.push(upgrade.id);
    }
  }

  for (const roomEntity of context.runtimeState.roomEntities) {
    const roomTemplate = context.registry.rooms[RoomInstance.templateIndex[roomEntity]];
    if (!roomTemplate) {
      continue;
    }
    const appliedUpgradeIds = RoomInstance.appliedUpgradeIds[roomEntity] ?? [];
    const nextPendingIds = new Set(
      getNextPendingRoomUpgradeIds(roomTemplate.id, appliedUpgradeIds),
    );

    for (const upgrade of context.registry.upgrades) {
      if (upgrade.target !== "room" || upgrade.targetId !== roomTemplate.id) {
        continue;
      }
      if (appliedUpgradeIds.includes(upgrade.id)) {
        continue;
      }
      if (nextPendingIds.size > 0 && !nextPendingIds.has(upgrade.id)) {
        continue;
      }
      if (!meetsRequirements(context, upgrade.requirements)) {
        continue;
      }

      if (canAffordCosts(getAdjustedUpgradeCosts(context, upgrade.requirements))) {
        affordableUpgradeIds.push(upgrade.id);
      }
    }
  }

  return affordableUpgradeIds;
}

function hasOperationalRoomTemplate(context: SimSystemContext, templateId: string): boolean {
  return context.runtimeState.roomEntities.some(
    (entity) =>
      context.registry.rooms[RoomInstance.templateIndex[entity]]?.id === templateId &&
      RoomInstance.isOperational[entity] === 1,
  );
}

function hasRecoveryPressure(context: SimSystemContext): boolean {
  return context.runtimeState.operatorEntities.some((entity) => {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") {
      return false;
    }

    return (
      NeedState.fatigue[entity] >= 35 ||
      NeedState.stress[entity] >= 35 ||
      InjuryState.severity[entity] > 0 ||
      MoraleState.current[entity] < MoraleState.baseline[entity] - 5
    );
  });
}

function hasContractPrepGap(context: SimSystemContext): boolean {
  const buildingEntity = context.singletonEntities.building;
  const activeBuilding =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];

  if (activeBuilding?.id !== "building/porters") {
    return false;
  }

  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const hasBriefingRoom = hasOperationalRoomTemplate(context, "room/briefing_room:tier_1");

  return !hasBriefingRoom && contractLifecycle === "active";
}

function hasStagingPressure(context: SimSystemContext): boolean {
  const buildingEntity = context.singletonEntities.building;
  const activeBuilding =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];

  if (activeBuilding?.id !== "building/porters") {
    return false;
  }

  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const hasDock = hasOperationalRoomTemplate(context, "room/dock:tier_1");
  const hasDeck = hasOperationalRoomTemplate(context, "room/deck:tier_1");

  return (
    (!hasDock || !hasDeck) &&
    (contractLifecycle === "active" || hasRecoveryPressure(context) || raidSummaries.length > 0)
  );
}

function hasSignificantSetback(context: SimSystemContext): boolean {
  const buildingEntity = context.singletonEntities.building;
  const contractResult = BuildingAuthority.contractResult[buildingEntity];
  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];

  if (contractResult?.outcome === "contract_lost" || (contractResult?.operatorDeaths ?? 0) > 0) {
    return true;
  }

  if (
    raidSummaries.some(
      (summary) =>
        summary.result === "failure" ||
        (summary.result === "mixed" &&
          summary.operatorOutcomes.some((outcome) => outcome.died === true)),
    )
  ) {
    return true;
  }

  if (
    context.runtimeState.operatorEntities.some(
      (entity) =>
        OperatorIdentity.lifecycleStatus[entity] === "active" && InjuryState.severity[entity] >= 40,
    )
  ) {
    return true;
  }

  return context.runtimeState.eventEntities.some((entity) => {
    const template = context.registry.events[EventState.templateIndex[entity]];
    return template?.category === "departure_warning";
  });
}

function hasSetbackRecoveryFallbackCondition(context: SimSystemContext): boolean {
  return context.runtimeState.operatorEntities.some((entity) => {
    if (OperatorIdentity.lifecycleStatus[entity] !== "active") {
      return false;
    }

    return MoraleState.current[entity] < 45 || InjuryState.severity[entity] > 0;
  });
}

function updateOpeningContractTracking(context: SimSystemContext): number {
  const { guidanceState } = context.runtimeState;
  const buildingEntity = context.singletonEntities.building;
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const openingTiming = syncOpeningContractTracking(
    guidanceState,
    contractLifecycle,
    contractSite?.contractSiteId,
  );

  return openingTiming.securedContractCount ?? 0;
}

function shouldAutoCompleteBeat(
  context: SimSystemContext,
  beat: GuidanceBeat,
  evalContext: GuidanceEvaluationContext,
): boolean {
  const { guidanceState } = context.runtimeState;

  if (guidanceState.completedBeatIds.includes(beat.id) || guidanceState.activeBeatId !== null) {
    return false;
  }
  if (beat.track === "opening" && guidanceState.openingPathState !== "active") {
    return false;
  }
  if (evalContext.isPreview) {
    return false;
  }
  if (
    beat.gating.requiredContractLifecycle &&
    evalContext.contractLifecycle !== beat.gating.requiredContractLifecycle
  ) {
    return false;
  }
  for (const requiredId of beat.gating.requiredCompletedBeatIds) {
    if (!guidanceState.completedBeatIds.includes(requiredId)) {
      return false;
    }
  }

  if (beat.completion.kind === "staffing_action_taken") {
    return !evalContext.hasUnassignedManagementAction || evalContext.hasAnyUpgradePurchased;
  }

  if (beat.completion.kind === "upgrade_purchased") {
    return beat.completion.upgradeId
      ? evalContext.appliedUpgradeIds.includes(beat.completion.upgradeId)
      : evalContext.hasAnyUpgradePurchased;
  }

  return false;
}

function buildEvaluationContext(context: SimSystemContext): GuidanceEvaluationContext {
  const buildingEntity = context.singletonEntities.building;
  const activeBuilding =
    context.registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]];
  const contractSite = BuildingAuthority.contractSite[buildingEntity];
  const contractLifecycle = BuildingAuthority.contractLifecycle[buildingEntity] ?? "bidding";
  const activeRaidPackets = BuildingAuthority.activeRaidPackets[buildingEntity] ?? [];
  const raidSummaries = BuildingAuthority.raidSummaries[buildingEntity] ?? [];
  const incidentState = context.runtimeState.incidentState;
  const affordableUpgradeIds = getAffordableUpgradeIds(context);
  const appliedUpgradeIds = getAllAppliedUpgradeIds(context);

  // Check if there's an active boss commitment interruption in the queue
  const { interruptionQueue } = context.runtimeState;
  const hasBossCommitment =
    interruptionQueue.active?.type === "raid_boss_commitment" ||
    interruptionQueue.queue.some((i) => i.type === "raid_boss_commitment");

  // Check for loot in any completed raid
  const hasRaidReturnWithLoot = raidSummaries.some(
    (s) => s.result === "success" || s.result === "mixed",
  );
  const contractsSecuredCount = updateOpeningContractTracking(context);
  const hasReachedContractFivePoint =
    contractsSecuredCount >= 5 ||
    (contractsSecuredCount >= 4 &&
      (contractLifecycle === "bidding" || contractLifecycle === "resolved"));
  const significantSetback = hasSignificantSetback(context);
  const setbackRecoveryTrigger =
    significantSetback ||
    (hasReachedContractFivePoint && hasSetbackRecoveryFallbackCondition(context));
  const recoveryPressure = hasRecoveryPressure(context);

  return {
    currentMinute: getCurrentAbsoluteMinute(context),
    activeBuildingId: activeBuilding?.id ?? "building/unknown",
    activeBuildingTier: BuildingAuthority.activeBuildingTier[buildingEntity] ?? 1,
    contractLifecycle,
    securedContractCount: contractsSecuredCount,
    affordableUpgradeIds,
    appliedUpgradeIds,
    hasSecuredContract: contractSite !== null && contractSite !== undefined,
    hasActiveIncident: incidentState.pendingIncident !== null,
    hasCompletedRaid: raidSummaries.length > 0,
    hasTeamDeparted: activeRaidPackets.length > 0 || raidSummaries.length > 0,
    hasBossCommitment,
    hasRaidReturnWithLoot,
    hasOperatorWorn: hasOperatorWorn(context),
    hasUnassignedManagementAction: hasUnassignedManagementAction(context),
    hasUpgradeAffordable: affordableUpgradeIds.length > 0,
    hasSignificantSetback: significantSetback,
    hasSetbackRecoveryTrigger: setbackRecoveryTrigger,
    hasRecoveryPressure: recoveryPressure,
    hasContractPrepGap: hasContractPrepGap(context),
    hasStagingPressure: hasStagingPressure(context),
    hasAnyUpgradePurchased: hasAnyUpgradePurchased(context),
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
    hasStaffingActionTaken:
      context.runtimeState.guidanceState.activeBeatProgressBaseline !== null &&
      context.runtimeState.guidanceState.interactionCounts.staffingActions >
        context.runtimeState.guidanceState.activeBeatProgressBaseline,
    hasUpgradePurchased:
      context.runtimeState.guidanceState.activeBeatProgressBaseline !== null &&
      context.runtimeState.guidanceState.interactionCounts.upgradesPurchased >
        context.runtimeState.guidanceState.activeBeatProgressBaseline,
    lastPurchasedUpgradeId: context.runtimeState.guidanceState.lastPurchasedUpgradeId,
  };
}

function maybeForceFirstIncident(context: SimSystemContext, currentMinute: number): void {
  const { guidanceState, incidentState, interruptionQueue } = context.runtimeState;
  if (guidanceState.openingPathState !== "active") {
    return;
  }
  if (!guidanceState.completedBeatIds.includes(FIRST_RAID_RETURN_BEAT_ID)) {
    return;
  }
  if (guidanceState.completedBeatIds.includes(FIRST_INCIDENT_BEAT_ID)) {
    return;
  }
  if (incidentState.pendingIncident !== null || incidentState.history.length > 0) {
    return;
  }
  if (hasBlockingInterruption(interruptionQueue)) {
    return;
  }

  const openingTiming = ensureOpeningTimingState(guidanceState);
  if (openingTiming.firstIncidentSeededAtMinute !== null) {
    return;
  }
  if (openingTiming.firstRaidReturnCompletedAtMinute === null) {
    openingTiming.firstRaidReturnCompletedAtMinute = currentMinute;
  }

  const contractLifecycle =
    BuildingAuthority.contractLifecycle[context.singletonEntities.building] ?? "bidding";
  const dueByTimer =
    currentMinute - openingTiming.firstRaidReturnCompletedAtMinute >=
    FIRST_INCIDENT_FORCE_SEED_DELAY_MINUTES;
  const dueByBoardFallback = contractLifecycle === "bidding" || contractLifecycle === "resolved";
  if (!dueByTimer && !dueByBoardFallback) {
    return;
  }

  const candidate = forceSeedOpeningIncident(context, incidentState, currentMinute);
  if (!candidate) {
    return;
  }

  if (queueIncident(context, incidentState, candidate, "guidance-system")) {
    openingTiming.firstIncidentSeededAtMinute = currentMinute;
  }
}

function enqueueGuidanceInterruption(
  context: SimSystemContext,
  beat: GuidanceBeat,
  copy: GuidanceBeat["copy"],
): void {
  const activeInterruption = context.runtimeState.interruptionQueue.active;
  const layeredOverActiveInterruption = canLayerGuidanceOverInterruption(activeInterruption, beat);

  context.runtimeState.pendingCueIds.push("event.guidance.beat");
  enqueueInterruption(
    context.runtimeState.interruptionQueue,
    "guidance",
    {
      kind: "guidance",
      beatId: beat.id,
      track: beat.track,
      title: copy.title,
      body: copy.body,
      subtitle: copy.subtitle,
      ctaLabel: copy.ctaLabel,
      deliveryMode: beat.delivery.mode,
      milestoneOrder: beat.milestoneOrder,
      totalMilestones: GUIDANCE_BEAT_COUNT_BY_TRACK[beat.track],
      completionKind: beat.completion.kind,
      fallbackBody: copy.fallbackBody,
      presenterId: beat.presenterId,
      presenterExpression: beat.presenterExpression,
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

  // If a beat is active, always check for runtime-detectable completion
  // (must run even when world is frozen so contract_secured etc. can fire)
  if (guidanceState.activeBeatId) {
    const activeBeat = ALL_GUIDANCE_BEAT_BY_ID.get(guidanceState.activeBeatId);
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

  maybeForceFirstIncident(context, currentMinute);

  // Find the next eligible beat
  const evalContext = buildEvaluationContext(context);
  for (const beat of ALL_GUIDANCE_BEATS) {
    if (shouldAutoCompleteBeat(context, beat, evalContext)) {
      completeBeat(guidanceState, beat.id);
      if (beat.track === "opening") {
        checkOpeningPathCompletion(guidanceState, OPENING_BEAT_IDS);
      }
      continue;
    }

    if (isBeatEligible(guidanceState, beat, evalContext)) {
      if (
        hasBlockingInterruption(interruptionQueue) &&
        !canLayerGuidanceOverInterruption(interruptionQueue.active, beat)
      ) {
        continue;
      }

      activateBeat(guidanceState, beat, GUIDANCE_BEAT_COUNT_BY_TRACK[beat.track]);
      const formattedCopy = formatBeatCopy(context, beat);
      if (guidanceState.activeBeatView) {
        guidanceState.activeBeatView.copy = formattedCopy;
      }

      // Blocking beats go through the interruption queue
      if (beat.delivery.mode === "blocking") {
        enqueueGuidanceInterruption(context, beat, formattedCopy);
      }
      // Focused beats that pause world freeze simulation directly
      else if (beat.delivery.pauseWorld) {
        context.runtimeState.worldTimeFrozen = hasActiveFocusedGuidancePause(guidanceState);
      }

      // Log to event log
      if (beat.copy.eventLogSummary) {
        pushRuntimeEvent(context, {
          kind: "guidance",
          message: formattedCopy.eventLogSummary ?? beat.copy.eventLogSummary,
        });
      }

      break;
    }
  }
}

function completeActiveBeat(context: SimSystemContext, beat: GuidanceBeat): void {
  const { guidanceState } = context.runtimeState;
  completeBeat(guidanceState, beat.id);

  if (beat.id === FIRST_RAID_RETURN_BEAT_ID) {
    ensureOpeningTimingState(guidanceState).firstRaidReturnCompletedAtMinute =
      getCurrentAbsoluteMinute(context);
  }

  // Unfreeze world if this beat was pausing it
  if (beat.delivery.pauseWorld && beat.delivery.mode === "focused") {
    context.runtimeState.worldTimeFrozen = hasActiveFocusedGuidancePause(guidanceState);
  }

  // Reset evaluation throttle so the next beat can activate promptly
  guidanceState.lastEvaluationMinute = 0;

  // Check if opening path is complete
  if (beat.track === "opening") {
    checkOpeningPathCompletion(guidanceState, OPENING_BEAT_IDS);
  }
}

export function handleGuidanceComplete(
  context: SimSystemContext,
  beatId: string,
  signal: string,
): void {
  const { guidanceState } = context.runtimeState;
  if (guidanceState.activeBeatId !== beatId) return;

  const beat = ALL_GUIDANCE_BEAT_BY_ID.get(beatId);
  if (!beat) return;

  // Validate signal matches completion rule
  if (beat.completion.kind !== signal) return;

  completeActiveBeat(context, beat);
  advanceGuidanceSystem(context, 0);
}

export function handleGuidanceDismiss(context: SimSystemContext, beatId: string): void {
  const { guidanceState } = context.runtimeState;
  if (guidanceState.activeBeatId !== beatId) return;

  const beat = ALL_GUIDANCE_BEAT_BY_ID.get(beatId);
  if (!beat || !beat.delivery.allowSkip) return;

  guidanceState.activeBeatId = null;
  guidanceState.activeBeatView = null;
  if (!guidanceState.dismissedBeatIds.includes(beatId)) {
    guidanceState.dismissedBeatIds.push(beatId);
  }

  // Unfreeze world
  if (beat.delivery.pauseWorld && beat.delivery.mode === "focused") {
    context.runtimeState.worldTimeFrozen = hasActiveFocusedGuidancePause(guidanceState);
  }
}

export function handleGuidanceResetOpening(context: SimSystemContext): void {
  resetOpeningPath(context.runtimeState.guidanceState, OPENING_BEAT_IDS);
}

export function recordGuidanceStaffingAction(context: SimSystemContext): void {
  recordGuidanceInteraction(context.runtimeState.guidanceState, "staffing_action");
}

export function recordGuidanceUpgradePurchase(context: SimSystemContext, upgradeId?: string): void {
  recordGuidanceInteraction(context.runtimeState.guidanceState, "upgrade_purchase", upgradeId);
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
