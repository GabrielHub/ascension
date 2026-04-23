import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  WorldTimeState,
} from "../components";
import { getActiveBuildingTemplate, getRoomTemplateForEntity, pushRuntimeEvent } from "./commands";
import { DAILY_ACTIVE_OPERATOR_PAYROLL } from "./economy-constants";
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
    context.runtimeState.operatorEntities.filter(
      (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
    ).length * DAILY_ACTIVE_OPERATOR_PAYROLL;
  const activeReceptionRooms = context.runtimeState.roomEntities.filter((entity) => {
    const template = getRoomTemplateForEntity(context, entity);
    return template.tags.includes("room:reception") && RoomInstance.isOperational[entity] === 1;
  }).length;
  const buildingTemplate = getActiveBuildingTemplate(context);
  const storefrontIncome = buildingTemplate.baseIncome ?? 50;
  const resourceIncomeModifiers = BuildingAuthority.resourceIncomeModifiers[buildingEntity] ?? {};
  const dailyIncome =
    activeReceptionRooms * storefrontIncome + (resourceIncomeModifiers["resource/cash"] ?? 0);

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
