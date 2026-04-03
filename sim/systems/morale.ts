import {
  DEFAULT_AUTONOMY_THRESHOLDS,
  getAutonomyThresholdsForPolicies,
  getContractPostureConfig,
  getPolicyOptionLabel,
  getRecoveryTriageConfig,
  getRosterFlowConfig,
  getStaffingPriorityConfig,
  type AutonomyThresholdConfig,
} from "lib/policies";
import {
  BuildingAuthority,
  EventState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  NotableTie,
  OperatorDisposition,
  OperatorIdentity,
  RoomCulture,
  RoomInstance,
  StaffState,
} from "../components";
import { clamp, hasOperationalRoomTemplate, pushRuntimeEvent } from "./commands";
import type { SimSystem } from "./types";

const PORTERS_INFIRMARY_TEMPLATE_ID = "room/infirmary:tier_1";
const PORTERS_BREAK_ROOM_TEMPLATE_ID = "room/break_room:tier_1";
const PORTERS_DECK_TEMPLATE_ID = "room/deck:tier_1";

export interface AutonomyFlags {
  refusalRisk: boolean;
  quitRisk: boolean;
  retentionRisk: boolean;
}

interface ThresholdEventSubject {
  operatorId: string;
  operatorName: string;
}

function humanizeEntityId(identifier: string): string {
  const slug = identifier.split("/").pop() ?? identifier;
  return slug.replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function computeAutonomyFlags(
  entity: number,
  thresholds: AutonomyThresholdConfig = DEFAULT_AUTONOMY_THRESHOLDS,
): AutonomyFlags {
  const morale = MoraleState.current[entity];
  const loyalty = LoyaltyState.current[entity];

  return {
    refusalRisk: morale < thresholds.refusalRiskMoraleFloor,
    quitRisk: morale < thresholds.quitRiskMoraleFloor,
    retentionRisk: loyalty < thresholds.retentionRiskLoyaltyFloor,
  };
}

function formatThresholdSubjectList(subjects: readonly ThresholdEventSubject[]): string {
  const visibleNames = subjects.slice(0, 2).map((subject) => subject.operatorName);
  const remainingCount = subjects.length - visibleNames.length;

  return remainingCount > 0
    ? `${visibleNames.join(", ")} +${remainingCount} more`
    : visibleNames.join(", ");
}

function pushThresholdEvent(
  context: Parameters<SimSystem>[0],
  subjects: readonly ThresholdEventSubject[],
  options: {
    kind: "morale_threshold" | "loyalty_threshold";
    accent: "ember" | "magma";
    singleMessage: (subject: ThresholdEventSubject) => string;
    summaryMessage: (subjectList: string) => string;
  },
): void {
  if (subjects.length === 0) {
    return;
  }

  if (subjects.length === 1) {
    const [subject] = subjects;
    if (!subject) {
      return;
    }

    pushRuntimeEvent(context, {
      kind: options.kind,
      message: options.singleMessage(subject),
      accent: options.accent,
      targetKind: "operator",
      targetId: subject.operatorId,
    });
    return;
  }

  pushRuntimeEvent(context, {
    kind: options.kind,
    message: options.summaryMessage(formatThresholdSubjectList(subjects)),
    accent: options.accent,
  });
}

function getGriefPenaltyForOperator(context: Parameters<SimSystem>[0], operatorId: string): number {
  let griefPenalty = 0;
  context.runtimeState.notableTieEntities.forEach((entity) => {
    if (NotableTie.stance[entity] !== "grief") return;
    if (
      NotableTie.operatorAId[entity] === operatorId ||
      NotableTie.operatorBId[entity] === operatorId
    ) {
      griefPenalty -= 8;
    }
  });
  return griefPenalty;
}

function getRoomCultureModifiers(context: Parameters<SimSystem>[0]): {
  comfortContribution: number;
  tensionContribution: number;
} {
  let totalComfort = 0;
  let totalTension = 0;
  let cultureCount = 0;

  context.runtimeState.roomCultureEntities.forEach((entity) => {
    totalComfort += RoomCulture.comfort[entity];
    totalTension += RoomCulture.tension[entity];
    cultureCount += 1;
  });

  if (cultureCount === 0) {
    return { comfortContribution: 0, tensionContribution: 0 };
  }

  const avgComfort = totalComfort / cultureCount;
  const avgTension = totalTension / cultureCount;

  return {
    comfortContribution: avgComfort * 0.1,
    tensionContribution: avgTension * -0.15,
  };
}

export const advanceMoraleSystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const elapsedHours = Math.max(1, Math.floor(deltaMs / 60000)) / 60;
  const buildingEntity = context.singletonEntities.building;
  const activeRoomBonus = context.runtimeState.roomEntities.filter((entity) => {
    return RoomInstance.isOperational[entity] === 1;
  }).length;
  const activeEventPenalty = context.runtimeState.eventEntities.reduce((total, entity) => {
    return total + EventState.severity[entity] + EventState.pressureContribution[entity];
  }, 0);
  const moraleModifier = BuildingAuthority.moraleModifier[buildingEntity] ?? 0;
  const loyaltyModifier = BuildingAuthority.loyaltyModifier[buildingEntity] ?? 0;
  const policies = BuildingAuthority.policies[buildingEntity];
  const autonomyThresholds = getAutonomyThresholdsForPolicies(policies);
  const contractPosture = getContractPostureConfig(policies);
  const recoveryTriage = getRecoveryTriageConfig(policies);
  const staffingPriority = getStaffingPriorityConfig(policies);
  const rosterFlow = getRosterFlowConfig(policies);

  const roomCulture = getRoomCultureModifiers(context);
  const hasInfirmary = hasOperationalRoomTemplate(context, PORTERS_INFIRMARY_TEMPLATE_ID);
  const hasBreakRoom = hasOperationalRoomTemplate(context, PORTERS_BREAK_ROOM_TEMPLATE_ID);
  const hasDeck = hasOperationalRoomTemplate(context, PORTERS_DECK_TEMPLATE_ID);

  const livingOperatorEntities = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );
  const criticalMoraleSubjects: ThresholdEventSubject[] = [];
  const lowMoraleSubjects: ThresholdEventSubject[] = [];
  const lowLoyaltySubjects: ThresholdEventSubject[] = [];

  const advanceEntityMorale = (
    entity: number,
    options: {
      subject?: ThresholdEventSubject;
      griefPenalty: number;
      passiveMoraleDriftPerHour: number;
      passiveLoyaltyDriftPerHour: number;
    },
  ) => {
    const prevFlags = computeAutonomyFlags(entity, autonomyThresholds);
    const moraleGap = Math.max(0, MoraleState.baseline[entity] - MoraleState.current[entity]);
    const breakRoomMoraleBonus = hasBreakRoom
      ? NeedState.stress[entity] * 0.08 + moraleGap * 0.06
      : 0;
    const deckMoraleBonus = hasDeck ? NeedState.fatigue[entity] * 0.05 + moraleGap * 0.08 : 0;
    const infirmaryReliefBonus =
      hasInfirmary && InjuryState.severity[entity] > 0
        ? 2 + InjuryState.severity[entity] * 0.03
        : 0;
    const breakRoomLoyaltyBonus = hasBreakRoom
      ? Math.max(0, 60 - LoyaltyState.current[entity]) * 0.08 +
        Math.max(0, 55 - MoraleState.current[entity]) * 0.05
      : 0;
    const deckLoyaltyBonus = hasDeck ? Math.max(0, 50 - MoraleState.current[entity]) * 0.04 : 0;

    const moraleTarget =
      MoraleState.baseline[entity] +
      activeRoomBonus * 1.5 +
      moraleModifier -
      NeedState.stress[entity] * 0.22 * recoveryTriage.stressMoraleContributionMultiplier -
      NeedState.fatigue[entity] * 0.16 -
      InjuryState.severity[entity] * 0.35 -
      activeEventPenalty * 1.6 +
      roomCulture.comfortContribution +
      roomCulture.tensionContribution +
      breakRoomMoraleBonus +
      deckMoraleBonus +
      infirmaryReliefBonus +
      options.griefPenalty;
    const loyaltyTarget =
      LoyaltyState.baseline[entity] +
      loyaltyModifier +
      (MoraleState.current[entity] - 50) * 0.15 -
      InjuryState.severity[entity] * 0.2 -
      activeEventPenalty * 0.8 +
      breakRoomLoyaltyBonus +
      deckLoyaltyBonus;

    MoraleState.current[entity] = clamp(
      MoraleState.current[entity] +
        (moraleTarget - MoraleState.current[entity]) * 0.18 +
        options.passiveMoraleDriftPerHour * elapsedHours,
      0,
      100,
    );
    LoyaltyState.current[entity] = clamp(
      LoyaltyState.current[entity] +
        (loyaltyTarget - LoyaltyState.current[entity]) * 0.1 +
        options.passiveLoyaltyDriftPerHour * elapsedHours,
      0,
      100,
    );

    if (!options.subject) {
      return;
    }

    const nextFlags = computeAutonomyFlags(entity, autonomyThresholds);
    if (nextFlags.quitRisk && !prevFlags.quitRisk) {
      criticalMoraleSubjects.push(options.subject);
    } else if (nextFlags.refusalRisk && !prevFlags.refusalRisk) {
      lowMoraleSubjects.push(options.subject);
    }

    if (nextFlags.retentionRisk && !prevFlags.retentionRisk) {
      lowLoyaltySubjects.push(options.subject);
    }
  };

  livingOperatorEntities.forEach((entity) => {
    const operatorId = OperatorIdentity.id[entity] ?? "";
    const operatorName = OperatorIdentity.name[entity] ?? humanizeEntityId(operatorId);
    advanceEntityMorale(entity, {
      subject: { operatorId, operatorName },
      griefPenalty: operatorId.length > 0 ? getGriefPenaltyForOperator(context, operatorId) : 0,
      passiveMoraleDriftPerHour:
        contractPosture.moraleDriftPerHour + staffingPriority.moraleDriftPerHour,
      passiveLoyaltyDriftPerHour:
        staffingPriority.loyaltyDriftPerHour + rosterFlow.loyaltyDriftPerHour,
    });
  });

  context.runtimeState.staffEntities.forEach((entity) => {
    const staffId = StaffState.id[entity] ?? "";
    advanceEntityMorale(entity, {
      griefPenalty: staffId.length > 0 ? getGriefPenaltyForOperator(context, staffId) : 0,
      passiveMoraleDriftPerHour: 0,
      passiveLoyaltyDriftPerHour: 0,
    });
  });

  pushThresholdEvent(context, criticalMoraleSubjects, {
    kind: "morale_threshold",
    accent: "magma",
    singleMessage: (subject) => `${subject.operatorName} morale critically low — may leave`,
    summaryMessage: (subjectList) => `Critical morale: ${subjectList} may leave`,
  });
  pushThresholdEvent(context, lowMoraleSubjects, {
    kind: "morale_threshold",
    accent: "ember",
    singleMessage: (subject) => `${subject.operatorName} morale low — may refuse raids`,
    summaryMessage: (subjectList) => `Low morale: ${subjectList} may refuse raids`,
  });
  pushThresholdEvent(context, lowLoyaltySubjects, {
    kind: "loyalty_threshold",
    accent: "ember",
    singleMessage: (subject) =>
      `${subject.operatorName} loyalty low — retention risk under ${getPolicyOptionLabel("rosterFlow", policies?.rosterFlow ?? "open_doors")}`,
    summaryMessage: (subjectList) =>
      `Low loyalty: ${subjectList} at retention risk under ${getPolicyOptionLabel("rosterFlow", policies?.rosterFlow ?? "open_doors")}`,
  });

  const operatorEntityById = new Map<string, number>();
  for (const entity of context.runtimeState.operatorEntities) {
    operatorEntityById.set(OperatorIdentity.id[entity], entity);
  }

  context.runtimeState.dispositionEntities.forEach((entity) => {
    const operatorId = OperatorDisposition.operatorId[entity];
    const operatorEntity = operatorEntityById.get(operatorId);
    if (operatorEntity === undefined) return;
    if (OperatorIdentity.lifecycleStatus[operatorEntity] !== "active") return;

    const morale = MoraleState.current[operatorEntity];
    const loyalty = LoyaltyState.current[operatorEntity];
    OperatorDisposition.satisfactionLevel[entity] = clamp(
      Math.round((morale + loyalty) / 2),
      0,
      100,
    );

    // Accumulate grievances from low morale
    if (morale < 30) {
      OperatorDisposition.grievanceLevel[entity] = clamp(
        OperatorDisposition.grievanceLevel[entity] + 1,
        0,
        100,
      );
    } else if (morale > 60) {
      OperatorDisposition.grievanceLevel[entity] = clamp(
        OperatorDisposition.grievanceLevel[entity] - 0.5,
        0,
        100,
      );
    }
  });
};
