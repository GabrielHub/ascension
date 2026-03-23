import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  StaffState,
  WorldTimeState,
} from "../components";
import { getRoomTemplateForEntity, getStaffRoleTag, pushRuntimeEvent } from "./commands";
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
      (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
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
  const dailyIncome = activeReceptionRooms * 50 + (resourceIncomeModifiers["resource/cash"] ?? 0);

  const netCash = (dailyIncome - payroll) * daysElapsed;
  GuildState.treasury[context.singletonEntities.guild] += netCash;

  const parts: string[] = [];
  if (netCash !== 0) parts.push(`${netCash > 0 ? "+" : ""}${netCash} cash`);

  if (activeReceptionRooms === 0) {
    const repLoss = -2 * daysElapsed;
    GuildState.reputation[context.singletonEntities.guild] += repLoss;
    parts.push(`${repLoss} rep`);
  } else {
    GuildState.intel[context.singletonEntities.guild] += daysElapsed;
    if (daysElapsed > 0) parts.push(`+${daysElapsed} intel`);
  }

  if (parts.length > 0) {
    pushRuntimeEvent(context, {
      kind: "resource_swing",
      message: `Daily ledger: ${parts.join(", ")}`,
      accent: netCash >= 0 ? "gold" : "ember",
    });
  }

  BuildingAuthority.lastPayrollDay[buildingEntity] = currentDay;
};
