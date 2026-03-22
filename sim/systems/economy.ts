import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  StaffState,
  WorldTimeState,
} from "../components";
import { getRoomTemplateForEntity, getStaffRoleTag } from "./commands";
import type { SimSystem } from "./types";

export const advanceEconomySystem: SimSystem = (context, deltaMs) => {
  if (deltaMs <= 0) {
    return;
  }

  const buildingEntity = context.singletonEntities.building;
  const dayEntity = context.singletonEntities.time;
  const currentDay = WorldTimeState.day[dayEntity];
  const lastPayrollDay = BuildingAuthority.lastPayrollDay[buildingEntity] ?? 0;
  const daysElapsed = currentDay - lastPayrollDay;
  if (daysElapsed <= 0) {
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
    const template = getRoomTemplateForEntity(context, entity);
    return (
      getStaffRoleTag(template.tags) === "staff:reception" &&
      RoomInstance.isOperational[entity] === 1
    );
  }).length;
  const resourceIncomeModifiers = BuildingAuthority.resourceIncomeModifiers[buildingEntity] ?? {};
  const dailyIncome = activeReceptionRooms * 38 + (resourceIncomeModifiers["resource/cash"] ?? 0);

  GuildState.treasury[context.singletonEntities.guild] += (dailyIncome - payroll) * daysElapsed;
  if (activeReceptionRooms === 0) {
    GuildState.reputation[context.singletonEntities.guild] -= 2 * daysElapsed;
  } else {
    GuildState.intel[context.singletonEntities.guild] += daysElapsed;
  }

  BuildingAuthority.lastPayrollDay[buildingEntity] = currentDay;
};
