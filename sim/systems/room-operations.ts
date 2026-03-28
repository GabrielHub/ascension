import { AssignmentState, BuildingAuthority, RoomInstance, StaffState } from "../components";
import { getRoomTemplateForEntity, getStaffRoleTag } from "./commands";
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
    const requiredStaffTag = getStaffRoleTag(template.tags);
    const assignedStaffCount = context.runtimeState.staffEntities.filter(
      (staffEntity) =>
        AssignmentState.kind[staffEntity] === "room" &&
        AssignmentState.targetId[staffEntity] === RoomInstance.id[roomEntity] &&
        (requiredStaffTag ? StaffState.roleTag[staffEntity] === requiredStaffTag : true),
    ).length;

    RoomInstance.assignedStaffCount[roomEntity] = assignedStaffCount;
    RoomInstance.capacity[roomEntity] =
      template.baseCapacity +
      (roomCapacityModifiers[template.id] ?? 0) +
      getRoomUpgradeCapacityBonus(context, roomEntity);
    RoomInstance.occupancy[roomEntity] = assignedStaffCount;
    RoomInstance.isOperational[roomEntity] =
      RoomInstance.isRequestedActive[roomEntity] === 1 &&
      (requiredStaffTag !== "" ? assignedStaffCount >= 1 : true)
        ? 1
        : 0;
  });
};
