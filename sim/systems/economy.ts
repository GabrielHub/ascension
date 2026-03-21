import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  StaffState,
  WorldTimeState,
} from "../components";
import { getRoleTag } from "./commands";
import type { SimSystem } from "./types";

export const advanceEconomySystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const buildingEntity = context.singletonEntities.building;
  const dayEntity = context.singletonEntities.time;
  const currentDay = WorldTimeState.day[dayEntity];
  if (currentDay <= (BuildingAuthority.lastPayrollDay[buildingEntity] ?? 0)) {
    return;
  }

  const payroll =
    context.runtimeState.staffEntities.reduce(
      (total, entity) => total + StaffState.wage[entity],
      0,
    ) +
    context.runtimeState.operatorEntities.filter(
      (entity) => OperatorIdentity.lifecycleStatus[entity] !== "dead",
    ).length *
      12;
  const activeReceptionRooms = context.runtimeState.roomEntities.filter((entity) => {
    const template =
      context.registry.rooms[RoomInstance.templateIndex[entity]] ?? context.registry.rooms[0];
    return (
      getRoleTag(template.tags) === "role:reception" && RoomInstance.isOperational[entity] === 1
    );
  }).length;
  const resourceIncomeModifiers = BuildingAuthority.resourceIncomeModifiers[buildingEntity] ?? {};
  const dailyIncome = activeReceptionRooms * 38 + (resourceIncomeModifiers["resource/cash"] ?? 0);

  GuildState.treasury[context.singletonEntities.guild] += dailyIncome - payroll;
  if (activeReceptionRooms === 0) {
    GuildState.reputation[context.singletonEntities.guild] -= 2;
  } else {
    GuildState.intel[context.singletonEntities.guild] += 1;
  }

  BuildingAuthority.lastPayrollDay[buildingEntity] = currentDay;
};
