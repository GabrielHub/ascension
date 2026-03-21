import {
  AssignmentState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  OperatorIdentity,
  PreferenceState,
  RaidParticipationState,
  RelationshipState,
  RoomInstance,
  ScheduleState,
  StaffState,
} from "../components";
import { getCurrentAbsoluteMinute, getRoleTag } from "./commands";
import type { SimSystem } from "./types";

function getAverageRelationshipSignal(
  context: Parameters<SimSystem>[0],
  operatorId: string,
): number {
  const signals = context.runtimeState.relationshipEntities
    .filter((entity) => {
      return (
        RelationshipState.operatorAId[entity] === operatorId ||
        RelationshipState.operatorBId[entity] === operatorId
      );
    })
    .map((entity) => {
      return (
        RelationshipState.trust[entity] -
        RelationshipState.friction[entity] +
        RelationshipState.familiarity[entity] * 0.35 +
        RelationshipState.recentSharedOutcome[entity] * 0.4
      );
    });

  if (signals.length === 0) {
    return 32;
  }

  return signals.reduce((total, value) => total + value, 0) / signals.length;
}

function hasOperationalRoomForRole(context: Parameters<SimSystem>[0], roleTag: string): boolean {
  return context.runtimeState.roomEntities.some((entity) => {
    const template =
      context.registry.rooms[RoomInstance.templateIndex[entity]] ?? context.registry.rooms[0];
    return getRoleTag(template.tags) === roleTag && RoomInstance.isOperational[entity] === 1;
  });
}

function chooseOperatorBlock(
  context: Parameters<SimSystem>[0],
  entity: number,
  localMinute: number,
): string {
  const workStartMinute = ScheduleState.workStartMinute[entity] || 480;
  const workEndMinute = ScheduleState.workEndMinute[entity] || 1080;
  const inShift = localMinute >= workStartMinute && localMinute < workEndMinute;
  const relationshipSignal = getAverageRelationshipSignal(context, OperatorIdentity.id[entity]);

  const recoveryScore =
    InjuryState.recoveryHoursRemaining[entity] * 2.6 +
    NeedState.fatigue[entity] * 0.72 +
    NeedState.stress[entity] * 0.45 +
    PreferenceState.recoveryBias[entity] * 0.35 +
    PreferenceState.comfortBias[entity] * 0.14;
  const socialScore =
    PreferenceState.socialBias[entity] * 0.72 +
    Math.max(0, relationshipSignal) * 0.18 +
    Math.max(0, 70 - NeedState.stress[entity]) * 0.25 -
    NeedState.fatigue[entity] * 0.08;
  const trainingScore =
    PreferenceState.trainingBias[entity] * 0.7 +
    MoraleState.current[entity] * 0.2 +
    LoyaltyState.current[entity] * 0.14 -
    NeedState.fatigue[entity] * 0.24 -
    NeedState.stress[entity] * 0.08;
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
  ].sort((left, right) => right.score - left.score || left.block.localeCompare(right.block));

  const preferred = ranked[0]?.block ?? "rest";

  if (preferred === "recovery" && !hasOperationalRoomForRole(context, "role:medic")) {
    return "rest";
  }

  if (preferred === "social" && !hasOperationalRoomForRole(context, "role:recruitment")) {
    return inShift ? "work" : "rest";
  }

  if (preferred === "training") {
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

    ScheduleState.currentBlock[entity] = chooseOperatorBlock(context, entity, localMinute);
    AssignmentState.kind[entity] =
      ScheduleState.currentBlock[entity] === "recovery" ? "recovery" : "idle";
    AssignmentState.targetId[entity] = "";
  });
};
