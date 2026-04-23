import { BuildingAuthority, RoomInstance } from "../components";
import { getRoomTemplateForEntity } from "./commands";
import type { SimSystem } from "./types";

function getRoomUpgradeCapacityBonus(
  context: Parameters<SimSystem>[0],
  roomEntity: number,
): number {
  const template = getRoomTemplateForEntity(context, roomEntity);

  return (RoomInstance.appliedUpgradeIds[roomEntity] ?? []).reduce((total, upgradeId) => {
    const upgrade = context.registry.upgradeById.get(upgradeId);
    if (!upgrade) {
      return total;
    }

    return (
      total +
      upgrade.effects.reduce((effectTotal, effect) => {
        if (effect.type === "modify_room_capacity" && effect.roomId === template.id) {
          return effectTotal + effect.amount;
        }

        return effectTotal;
      }, 0)
    );
  }, 0);
}

export const updateRoomOperationsSystem: SimSystem = (context) => {
  const buildingEntity = context.singletonEntities.building;
  const roomCapacityModifiers = BuildingAuthority.roomCapacityModifiers[buildingEntity] ?? {};

  context.runtimeState.roomEntities.forEach((roomEntity) => {
    const template = getRoomTemplateForEntity(context, roomEntity);

    RoomInstance.capacity[roomEntity] =
      template.baseCapacity +
      (roomCapacityModifiers[template.id] ?? 0) +
      getRoomUpgradeCapacityBonus(context, roomEntity);
    RoomInstance.occupancy[roomEntity] = 0;
  });
};
