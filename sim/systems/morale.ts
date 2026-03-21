import {
  BuildingAuthority,
  EventState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NeedState,
  RoomInstance,
} from "../components";
import { clamp } from "./commands";
import type { SimSystem } from "./types";

export const advanceMoraleSystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const buildingEntity = context.singletonEntities.building;
  const activeRoomBonus = context.runtimeState.roomEntities.filter((entity) => {
    return RoomInstance.isOperational[entity] === 1;
  }).length;
  const activeEventPenalty = context.runtimeState.eventEntities.reduce((total, entity) => {
    return total + EventState.severity[entity] + EventState.pressureContribution[entity];
  }, 0);
  const moraleModifier = BuildingAuthority.moraleModifier[buildingEntity] ?? 0;
  const loyaltyModifier = BuildingAuthority.loyaltyModifier[buildingEntity] ?? 0;

  [...context.runtimeState.operatorEntities, ...context.runtimeState.staffEntities].forEach(
    (entity) => {
      const moraleTarget =
        MoraleState.baseline[entity] +
        activeRoomBonus * 1.5 +
        moraleModifier -
        NeedState.stress[entity] * 0.22 -
        NeedState.fatigue[entity] * 0.16 -
        InjuryState.severity[entity] * 0.35 -
        activeEventPenalty * 1.6;
      const loyaltyTarget =
        LoyaltyState.baseline[entity] +
        loyaltyModifier +
        (MoraleState.current[entity] - 50) * 0.15 -
        InjuryState.severity[entity] * 0.2 -
        activeEventPenalty * 0.8;

      MoraleState.current[entity] = clamp(
        MoraleState.current[entity] + (moraleTarget - MoraleState.current[entity]) * 0.18,
        0,
        100,
      );
      LoyaltyState.current[entity] = clamp(
        LoyaltyState.current[entity] + (loyaltyTarget - LoyaltyState.current[entity]) * 0.1,
        0,
        100,
      );
    },
  );
};
