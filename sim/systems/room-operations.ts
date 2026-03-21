import { AssignmentState, BuildingAuthority, RoomInstance, StaffState } from "../components";
import { getRoleTag } from "./commands";
import type { SimSystem } from "./types";

function getRoomUpgradeCapacityBonus(
  context: Parameters<SimSystem>[0],
  roomEntity: number,
): number {
  const template =
    context.registry.rooms[RoomInstance.templateIndex[roomEntity]] ?? context.registry.rooms[0];

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
    const template =
      context.registry.rooms[RoomInstance.templateIndex[roomEntity]] ?? context.registry.rooms[0];
    const requiredRoleTag = getRoleTag(template.tags);
    const assignedStaffCount = context.runtimeState.staffEntities.filter((staffEntity) => {
      return (
        AssignmentState.kind[staffEntity] === "room" &&
        AssignmentState.targetId[staffEntity] === RoomInstance.id[roomEntity] &&
        StaffState.roleTag[staffEntity] === requiredRoleTag
      );
    }).length;

    RoomInstance.assignedStaffCount[roomEntity] = assignedStaffCount;
    RoomInstance.capacity[roomEntity] =
      template.baseCapacity +
      (roomCapacityModifiers[template.id] ?? 0) +
      getRoomUpgradeCapacityBonus(context, roomEntity);
    RoomInstance.occupancy[roomEntity] = assignedStaffCount;
    RoomInstance.isOperational[roomEntity] =
      RoomInstance.isRequestedActive[roomEntity] === 1 && assignedStaffCount >= 1 ? 1 : 0;
  });
};
