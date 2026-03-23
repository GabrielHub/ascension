import {
  AssignmentState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  PreferenceState,
  RaidParticipationState,
  RoomInstance,
  ScheduleState,
  StaffState,
} from "../components";
import { getCurrentAbsoluteMinute, getRoomTemplateForEntity } from "./commands";
import { computeAutonomyFlags } from "./morale";
import { computeNeedReadinessFlags } from "./needs";
import { computeAverageSocialSignal } from "./social";
import type { SimSystem } from "./types";

function hasOperationalRoomForFunction(
  context: Parameters<SimSystem>[0],
  functionTag: string,
): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.tags.includes(functionTag) && RoomInstance.isOperational[entity] === 1;
  });
}

/**
 * Stability bonus applied to the operator's current schedule block.
 * Prevents rapid oscillation when two blocks have nearly equal scores.
 */
const SCHEDULE_STABILITY_BONUS = 10;

function chooseOperatorBlock(
  context: Parameters<SimSystem>[0],
  entity: number,
  localMinute: number,
  livingOperatorIds: ReadonlySet<string>,
): string {
  const workStartMinute = ScheduleState.workStartMinute[entity] || 480;
  const workEndMinute = ScheduleState.workEndMinute[entity] || 1080;
  const inShift = localMinute >= workStartMinute && localMinute < workEndMinute;
  const relationshipSignal = computeAverageSocialSignal(
    context,
    OperatorIdentity.id[entity],
    livingOperatorIds,
  );

  const autonomyFlags = computeAutonomyFlags(entity);
  const needFlags = computeNeedReadinessFlags(entity);

  const injuryRecoveryUrgency = needFlags.injuryPreventsRaid ? 30 : 0;
  const quitRiskSocialBonus = autonomyFlags.quitRisk ? 25 : autonomyFlags.retentionRisk ? 12 : 0;
  const hungerTrainingPenalty = needFlags.hungerReducesTraining ? -18 : 0;

  const recoveryScore =
    InjuryState.recoveryHoursRemaining[entity] * 2.6 +
    NeedState.fatigue[entity] * 0.72 +
    NeedState.stress[entity] * 0.45 +
    PreferenceState.recoveryBias[entity] * 0.35 +
    PreferenceState.comfortBias[entity] * 0.14 +
    injuryRecoveryUrgency;
  const socialScore =
    PreferenceState.socialBias[entity] * 0.72 +
    Math.max(0, relationshipSignal) * 0.18 +
    Math.max(0, 70 - NeedState.stress[entity]) * 0.25 -
    NeedState.fatigue[entity] * 0.08 +
    quitRiskSocialBonus;
  const trainingScore =
    PreferenceState.trainingBias[entity] * 0.7 +
    MoraleState.current[entity] * 0.2 +
    LoyaltyState.current[entity] * 0.14 -
    NeedState.fatigue[entity] * 0.24 -
    NeedState.stress[entity] * 0.08 +
    hungerTrainingPenalty;
  const workScore =
    (inShift ? 54 : 18) +
    LoyaltyState.current[entity] * 0.22 +
    MoraleState.current[entity] * 0.18 -
    NeedState.stress[entity] * 0.12 -
    NeedState.fatigue[entity] * 0.1;
  const restScore =
    PreferenceState.comfortBias[entity] * 0.45 +
    NeedState.fatigue[entity] * 0.52 +
    NeedState.hunger[entity] * 0.24 +
    NeedState.stress[entity] * 0.2;

  const ranked = [
    { block: "recovery", score: recoveryScore },
    { block: "social", score: socialScore },
    { block: "training", score: trainingScore },
    { block: "work", score: workScore },
    { block: "rest", score: restScore },
  ];

  // Hysteresis: give the current block a stability bonus to prevent
  // rapid oscillation when two blocks have nearly equal scores.
  const currentBlock = ScheduleState.currentBlock[entity] || "";
  for (const entry of ranked) {
    if (entry.block === currentBlock) {
      entry.score += SCHEDULE_STABILITY_BONUS;
    }
  }

  ranked.sort((left, right) => right.score - left.score || left.block.localeCompare(right.block));

  const preferred = ranked[0]?.block ?? "rest";

  if (preferred === "recovery" && !hasOperationalRoomForFunction(context, "room:recovery")) {
    return "rest";
  }

  if (
    preferred === "social" &&
    !hasOperationalRoomForFunction(context, "room:social") &&
    !hasOperationalRoomForFunction(context, "room:staffing")
  ) {
    return inShift ? "work" : "rest";
  }

  if (preferred === "training" && !hasOperationalRoomForFunction(context, "room:training")) {
    return inShift ? "work" : "rest";
  }

  if (preferred === "work" && !inShift) {
    return "rest";
  }

  return preferred;
}

export const reconcileAssignmentsSystem: SimSystem = (context) => {
  const currentMinute = getCurrentAbsoluteMinute(context);
  const localMinute = currentMinute % 1440;

  const livingOperatorIds = new Set(
    context.runtimeState.operatorEntities
      .filter((entity) => OperatorIdentity.lifecycleStatus[entity] === "active")
      .map((entity) => OperatorIdentity.id[entity]),
  );

  context.runtimeState.staffEntities.forEach((entity) => {
    const workStartMinute = ScheduleState.workStartMinute[entity] || 480;
    const workEndMinute = ScheduleState.workEndMinute[entity] || 1080;

    if (InjuryState.recoveryHoursRemaining[entity] > 0) {
      ScheduleState.currentBlock[entity] = "recovery";
      StaffState.status[entity] = "recovering";
      return;
    }

    ScheduleState.currentBlock[entity] =
      localMinute >= workStartMinute && localMinute < workEndMinute ? "work" : "rest";
    StaffState.status[entity] =
      AssignmentState.kind[entity] === "room"
        ? "assigned"
        : ScheduleState.currentBlock[entity] === "work"
          ? "available"
          : "off_shift";
  });

  context.runtimeState.operatorEntities.forEach((entity) => {
    if (OperatorIdentity.lifecycleStatus[entity] === "dead") {
      return;
    }

    if (
      RaidParticipationState.activeRaidId[entity].length > 0 &&
      currentMinute < RaidParticipationState.returnTick[entity]
    ) {
      ScheduleState.currentBlock[entity] = "raid";
      return;
    }

    if (InjuryState.recoveryHoursRemaining[entity] > 0) {
      ScheduleState.currentBlock[entity] = "recovery";
      AssignmentState.kind[entity] = "recovery";
      return;
    }

    ScheduleState.currentBlock[entity] = chooseOperatorBlock(
      context,
      entity,
      localMinute,
      livingOperatorIds,
    );
    AssignmentState.kind[entity] =
      ScheduleState.currentBlock[entity] === "recovery" ? "recovery" : "idle";
    AssignmentState.targetId[entity] = "";
  });
};
