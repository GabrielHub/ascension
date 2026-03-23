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

export interface NeedReadinessFlags {
  injuryPreventsRaid: boolean;
  exhaustionPenalty: boolean;
  stressPenalty: boolean;
  hungerReducesTraining: boolean;
}

export function computeNeedReadinessFlags(entity: number): NeedReadinessFlags {
  return {
    injuryPreventsRaid: InjuryState.severity[entity] > 60,
    exhaustionPenalty: NeedState.fatigue[entity] > 80,
    stressPenalty: NeedState.stress[entity] > 70,
    hungerReducesTraining: NeedState.hunger[entity] > 70,
  };
}

function getOperationalRecoveryRate(context: Parameters<SimSystem>[0]): number {
  const buildingEntity = context.singletonEntities.building;
  const buildingRecoveryModifier = BuildingAuthority.recoveryRateModifier[buildingEntity] ?? 0;

  const roomRecoveryModifier = context.runtimeState.roomEntities.reduce((total, roomEntity) => {
    const template = getRoomTemplateForEntity(context, roomEntity);
    if (RoomInstance.isOperational[roomEntity] !== 1 || !template.tags.includes("room:recovery")) {
      return total;
    }

    return (
      total +
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

  return 1 + buildingRecoveryModifier + roomRecoveryModifier;
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
    InjuryState.recoveryHoursRemaining[entity] = Math.max(
      0,
      InjuryState.recoveryHoursRemaining[entity] - recoveryRate * elapsedHours,
    );

    if (InjuryState.recoveryHoursRemaining[entity] === 0) {
      InjuryState.severity[entity] = Math.max(0, InjuryState.severity[entity] - 20);
      InjuryState.treated[entity] = 1;
    }
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

  context.runtimeState.staffEntities.forEach((entity) => {
    advanceEntityNeeds(context, entity, elapsedHours, recoveryRate);
  });
};
