import {
  DEFAULT_POLICY_STATE,
  getRecoveryTriageConfig,
  type RecoveryTriageConfig,
} from "lib/policies";
import {
  BuildingAuthority,
  InjuryState,
  NeedState,
  OperatorIdentity,
  RoomInstance,
  ScheduleState,
} from "../components";
import { clamp, getRoomTemplateForEntity } from "./commands";
import type { SimSystem } from "./types";

const PORTERS_INFIRMARY_TEMPLATE_ID = "room/infirmary:tier_1";
const PORTERS_BREAK_ROOM_TEMPLATE_ID = "room/break_room:tier_1";

export interface NeedReadinessFlags {
  injuryPreventsRaid: boolean;
  exhaustionPenalty: boolean;
  stressPenalty: boolean;
  hungerReducesTraining: boolean;
}

const DEFAULT_RECOVERY_TRIAGE_CONFIG = getRecoveryTriageConfig(DEFAULT_POLICY_STATE);

export function computeNeedReadinessFlags(
  entity: number,
  recoveryTriage: RecoveryTriageConfig = DEFAULT_RECOVERY_TRIAGE_CONFIG,
): NeedReadinessFlags {
  return {
    injuryPreventsRaid: InjuryState.severity[entity] > recoveryTriage.injuryRaidThreshold,
    exhaustionPenalty: NeedState.fatigue[entity] > recoveryTriage.fatigueRaidPenaltyThreshold,
    stressPenalty: NeedState.stress[entity] > 70,
    hungerReducesTraining: NeedState.hunger[entity] > 70,
  };
}

function getOperationalRecoveryRate(context: Parameters<SimSystem>[0]): number {
  const buildingEntity = context.singletonEntities.building;
  const buildingRecoveryModifier = BuildingAuthority.recoveryRateModifier[buildingEntity] ?? 0;
  const recoveryPolicy = getRecoveryTriageConfig(BuildingAuthority.policies[buildingEntity]);

  const roomRecoveryModifier = context.runtimeState.roomEntities.reduce((total, roomEntity) => {
    const template = getRoomTemplateForEntity(context, roomEntity);
    if (RoomInstance.isOperational[roomEntity] !== 1 || !template.tags.includes("room:recovery")) {
      return total;
    }

    const templateRecoveryModifier =
      template.id === PORTERS_INFIRMARY_TEMPLATE_ID
        ? 1.1
        : template.id === PORTERS_BREAK_ROOM_TEMPLATE_ID
          ? 0.35
          : 0;

    return (
      total +
      templateRecoveryModifier +
      (RoomInstance.appliedUpgradeIds[roomEntity] ?? []).reduce((upgradeTotal, upgradeId) => {
        const upgrade = context.registry.upgradeById.get(upgradeId);
        if (!upgrade) {
          return upgradeTotal;
        }

        return (
          upgradeTotal +
          upgrade.effects.reduce((effectTotal, effect) => {
            return effect.type === "modify_recovery_rate"
              ? effectTotal + effect.amount
              : effectTotal;
          }, 0)
        );
      }, 0)
    );
  }, 0);

  return (
    (1 + buildingRecoveryModifier + roomRecoveryModifier) * recoveryPolicy.recoveryRateMultiplier
  );
}

function advanceEntityNeeds(
  context: Parameters<SimSystem>[0],
  entity: number,
  elapsedHours: number,
  recoveryRate: number,
): void {
  const block = ScheduleState.currentBlock[entity] || "rest";
  const buildingEntity = context.singletonEntities.building;
  const needRateMultipliers = BuildingAuthority.needRateMultipliers[buildingEntity] ?? {};
  const hungerMultiplier = needRateMultipliers.hunger ?? 1;
  const fatigueMultiplier = needRateMultipliers.fatigue ?? 1;
  const stressMultiplier = needRateMultipliers.stress ?? 1;

  const hungerDelta =
    block === "raid"
      ? 12
      : block === "work"
        ? 7
        : block === "training"
          ? 5
          : block === "social"
            ? 2
            : block === "recovery"
              ? -3
              : -4;
  const fatigueDelta =
    block === "raid"
      ? 15
      : block === "work"
        ? 9
        : block === "training"
          ? 7
          : block === "social"
            ? -2
            : block === "recovery"
              ? -8
              : -6;
  const stressDelta =
    block === "raid"
      ? 10
      : block === "work"
        ? 5
        : block === "training"
          ? -1
          : block === "social"
            ? -6
            : block === "recovery"
              ? -6
              : -3;

  NeedState.hunger[entity] = clamp(
    NeedState.hunger[entity] + hungerDelta * hungerMultiplier * elapsedHours,
    0,
    100,
  );
  NeedState.fatigue[entity] = clamp(
    NeedState.fatigue[entity] + fatigueDelta * fatigueMultiplier * elapsedHours,
    0,
    100,
  );
  NeedState.stress[entity] = clamp(
    NeedState.stress[entity] + stressDelta * stressMultiplier * elapsedHours,
    0,
    100,
  );

  if (InjuryState.recoveryHoursRemaining[entity] > 0) {
    const recoveredHours = recoveryRate * elapsedHours;
    InjuryState.recoveryHoursRemaining[entity] = Math.max(
      0,
      InjuryState.recoveryHoursRemaining[entity] - recoveredHours,
    );
    InjuryState.severity[entity] = Math.max(
      0,
      InjuryState.severity[entity] - Math.max(1, Math.round(recoveredHours * 2)),
    );

    if (InjuryState.recoveryHoursRemaining[entity] === 0) {
      InjuryState.severity[entity] = Math.max(0, Math.round(InjuryState.severity[entity] * 0.5));
      InjuryState.treated[entity] = 1;
    }
  } else if (InjuryState.severity[entity] > 0) {
    InjuryState.severity[entity] = Math.max(
      0,
      InjuryState.severity[entity] - Math.max(1, Math.round(recoveryRate * elapsedHours)),
    );
  }
}

export const advanceNeedsSystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const elapsedHours = Math.max(1, Math.floor(deltaMs / 60000)) / 60;
  const recoveryRate = getOperationalRecoveryRate(context);

  context.runtimeState.operatorEntities
    .filter((entity) => OperatorIdentity.lifecycleStatus[entity] === "active")
    .forEach((entity) => {
      advanceEntityNeeds(context, entity, elapsedHours, recoveryRate);
    });
};
