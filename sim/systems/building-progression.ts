import { applyEffect } from "content/effects";
import type { TemplateRegistry } from "content/templates";

import { BuildingAuthority } from "../components";
import type { SimSystem } from "./types";

function getBaseUnlockedRooms(buildingId: string, registry: TemplateRegistry): string[] {
  const gatedRoomIds = new Set<string>();

  registry.upgrades.forEach((upgrade) => {
    if (upgrade.target !== "building" || upgrade.targetId !== buildingId) {
      return;
    }

    upgrade.effects.forEach((effect) => {
      if (effect.type === "unlock_room_template") {
        gatedRoomIds.add(effect.roomId);
      }
    });
  });

  return registry.rooms
    .filter((room) => room.availableInBuildings.includes(buildingId) && !gatedRoomIds.has(room.id))
    .map((room) => room.id);
}

export const refreshBuildingAuthoritySystem: SimSystem = ({ registry, singletonEntities }) => {
  const buildingEntity = singletonEntities.building;
  const buildingTemplate =
    registry.buildings[BuildingAuthority.activeBuildingTemplateIndex[buildingEntity]] ??
    registry.buildings[0];
  const appliedUpgradeIds = BuildingAuthority.appliedUpgradeIds[buildingEntity] ?? [];
  let roomSlotCount = buildingTemplate.baseRoomSlots;
  let operatorSlotCount = buildingTemplate.baseOperatorSlots;
  let activeBuildingTier = buildingTemplate.baseTier;
  const unlockedRoomTemplateIds = new Set(getBaseUnlockedRooms(buildingTemplate.id, registry));
  const unlockedRoomTierByTemplateId: Record<string, number> = {};
  const roomCapacityModifiers: Record<string, number> = {};
  const needRateMultipliers: Record<string, number> = {};
  const attractionWeightByTag: Record<string, number> = {};
  const resourceIncomeModifiers: Record<string, number> = {};
  const resourceCostMultipliers: Record<string, number> = {};
  let recoveryRateModifier = 0;
  let trainingRateModifier = 0;
  let moraleModifier = 0;
  let loyaltyModifier = 0;

  appliedUpgradeIds.forEach((upgradeId) => {
    const upgrade = registry.upgradeById.get(upgradeId);
    if (!upgrade) {
      return;
    }

    upgrade.effects.forEach((effect) => {
      applyEffect(effect, {
        addRoomSlot(amount) {
          roomSlotCount += amount;
        },
        unlockRoomTemplate(roomId) {
          unlockedRoomTemplateIds.add(roomId);
        },
        unlockRoomTier(roomId, tier) {
          unlockedRoomTierByTemplateId[roomId] = Math.max(
            unlockedRoomTierByTemplateId[roomId] ?? 0,
            tier,
          );
        },
        modifyRoomCapacity(roomId, amount) {
          roomCapacityModifiers[roomId] = (roomCapacityModifiers[roomId] ?? 0) + amount;
        },
        modifyNeedRate(needId, multiplier) {
          needRateMultipliers[needId] = multiplier;
        },
        modifyAttractionWeight(tag, amount) {
          attractionWeightByTag[tag] = (attractionWeightByTag[tag] ?? 0) + amount;
        },
        modifyRecoveryRate(amount) {
          recoveryRateModifier += amount;
        },
        modifyTrainingRate(amount) {
          trainingRateModifier += amount;
        },
        modifyMorale(amount) {
          moraleModifier += amount;
        },
        modifyResourceIncome(resourceId, amount) {
          resourceIncomeModifiers[resourceId] = (resourceIncomeModifiers[resourceId] ?? 0) + amount;
        },
        modifyResourceCost(resourceId, multiplier) {
          resourceCostMultipliers[resourceId] = multiplier;
        },
        grantOperatorSlot(amount) {
          operatorSlotCount += amount;
        },
        modifyLoyalty(amount) {
          loyaltyModifier += amount;
        },
        modifyScalar() {},
      });
    });
  });

  BuildingAuthority.activeBuildingTier[buildingEntity] = activeBuildingTier;
  BuildingAuthority.roomSlotCount[buildingEntity] = roomSlotCount;
  BuildingAuthority.operatorSlotCount[buildingEntity] = operatorSlotCount;
  BuildingAuthority.unlockedRoomTemplateIds[buildingEntity] = Array.from(unlockedRoomTemplateIds);
  BuildingAuthority.unlockedRoomTierByTemplateId[buildingEntity] = unlockedRoomTierByTemplateId;
  BuildingAuthority.roomCapacityModifiers[buildingEntity] = roomCapacityModifiers;
  BuildingAuthority.needRateMultipliers[buildingEntity] = needRateMultipliers;
  BuildingAuthority.attractionWeightByTag[buildingEntity] = attractionWeightByTag;
  BuildingAuthority.recoveryRateModifier[buildingEntity] = recoveryRateModifier;
  BuildingAuthority.trainingRateModifier[buildingEntity] = trainingRateModifier;
  BuildingAuthority.moraleModifier[buildingEntity] = moraleModifier;
  BuildingAuthority.loyaltyModifier[buildingEntity] = loyaltyModifier;
  BuildingAuthority.resourceIncomeModifiers[buildingEntity] = resourceIncomeModifiers;
  BuildingAuthority.resourceCostMultipliers[buildingEntity] = resourceCostMultipliers;
};
