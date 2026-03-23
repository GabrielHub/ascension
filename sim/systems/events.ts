import { addComponent, addEntity, removeEntity } from "bitecs";

import {
  BuildingAuthority,
  EventState,
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  NotableTie,
  OperatorIdentity,
  RecurringTeam,
  RoomCulture,
  RoomInstance,
} from "../components";
import {
  getCurrentAbsoluteMinute,
  getRoomTemplateForEntity,
  getStaffRoleTag,
  pushRuntimeEvent,
  removeTrackedEntity,
} from "./commands";
import { computeAutonomyFlags } from "./morale";
import { SeededRng, weightedChoice, seedFromKey } from "../uncertainty";
import type { SimSystem } from "./types";

function getAverageValue(values: number[]): number {
  if (values.length === 0) {
    return 50;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function getPressureTags(context: Parameters<SimSystem>[0]): string[] {
  const guildEntity = context.singletonEntities.guild;
  const livingOperatorEntities = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );
  const moraleValues = [
    ...livingOperatorEntities.map((entity) => MoraleState.current[entity]),
    ...context.runtimeState.staffEntities.map((entity) => MoraleState.current[entity]),
  ];
  const loyaltyValues = [
    ...livingOperatorEntities.map((entity) => LoyaltyState.current[entity]),
    ...context.runtimeState.staffEntities.map((entity) => LoyaltyState.current[entity]),
  ];
  const activeInjuries = livingOperatorEntities.filter(
    (entity) => InjuryState.severity[entity] > 0,
  ).length;
  const tags: string[] = [];

  if (livingOperatorEntities.length > 0 && getAverageValue(moraleValues) < 55) {
    tags.push("pressure:morale");
  }

  if (livingOperatorEntities.length > 0 && getAverageValue(loyaltyValues) < 55) {
    tags.push("pressure:loyalty");
  }

  if (activeInjuries > 0) {
    tags.push("pressure:casualty");
  }

  if (GuildState.treasury[guildEntity] < 80) {
    tags.push("pressure:cash");
  }

  if (GuildState.reputation[guildEntity] >= 8) {
    tags.push("pressure:reputation");
  }

  if (
    context.runtimeState.roomEntities.some((entity) => {
      const template = getRoomTemplateForEntity(context, entity);
      return (
        getStaffRoleTag(template.tags) === "staff:reception" &&
        RoomInstance.isOperational[entity] === 0
      );
    })
  ) {
    tags.push("pressure:reputation");
  }

  const highTensionRooms = context.runtimeState.roomCultureEntities.filter(
    (entity) => RoomCulture.tension[entity] > 70,
  );
  if (highTensionRooms.length > 0) {
    tags.push("pressure:morale");
  }

  const damagedTeams = context.runtimeState.recurringTeamEntities.filter(
    (entity) => RecurringTeam.damaged[entity] === 1,
  );
  if (damagedTeams.length > 0) {
    tags.push("pressure:casualty");
  }

  const retentionRiskOperators = livingOperatorEntities.filter((entity) => {
    const flags = computeAutonomyFlags(entity);
    return flags.retentionRisk;
  });
  if (retentionRiskOperators.length > 0) {
    tags.push("pressure:loyalty");
  }

  const griefTies = context.runtimeState.notableTieEntities.filter(
    (entity) => NotableTie.stance[entity] === "grief",
  );
  if (griefTies.length > 0) {
    tags.push("pressure:morale");
  }

  return tags;
}

function computePressure(context: Parameters<SimSystem>[0]): number {
  const guildEntity = context.singletonEntities.guild;
  const livingOperatorEntities = context.runtimeState.operatorEntities.filter(
    (entity) => OperatorIdentity.lifecycleStatus[entity] === "active",
  );
  const moraleValues = [
    ...livingOperatorEntities.map((entity) => MoraleState.current[entity]),
    ...context.runtimeState.staffEntities.map((entity) => MoraleState.current[entity]),
  ];
  const averageMorale = getAverageValue(moraleValues);
  const activeInjuries = livingOperatorEntities.filter(
    (entity) => InjuryState.severity[entity] > 0,
  ).length;

  return Math.max(
    0,
    Math.floor(
      Math.max(0, 80 - GuildState.treasury[guildEntity]) / 30 +
        Math.max(0, GuildState.reputation[guildEntity] - 6) / 3 +
        activeInjuries +
        Math.max(0, 55 - averageMorale) / 8 +
        (BuildingAuthority.activeRaidPackets[context.singletonEntities.building] ?? []).length,
    ),
  );
}

export const advanceEventPressureSystem: SimSystem = (context, deltaMs) => {
  const buildingEntity = context.singletonEntities.building;
  const activeEventEntities = context.runtimeState.eventEntities.slice();

  activeEventEntities.forEach((entity) => {
    if (deltaMs > 0) {
      EventState.remainingHours[entity] -= Math.max(1, Math.floor(deltaMs / 60000)) / 60;
    }

    if (EventState.remainingHours[entity] <= 0) {
      const templateIndex = EventState.templateIndex[entity];
      const template = context.registry.events[templateIndex];
      pushRuntimeEvent(context, {
        kind: "event_change",
        message: `${template?.name ?? "An event"} has ended`,
        accent: "silver",
      });
      removeEntity(context.world, entity);
      removeTrackedEntity(context.runtimeState.eventEntities, entity);
    }
  });

  BuildingAuthority.pressure[buildingEntity] = computePressure(context);
  if (deltaMs <= 0 || context.runtimeState.eventEntities.length >= 2) {
    return;
  }

  const currentMinute = getCurrentAbsoluteMinute(context);
  const lastEventTick = BuildingAuthority.lastEventTick[buildingEntity] ?? 0;
  if (currentMinute - lastEventTick < 240 || BuildingAuthority.pressure[buildingEntity] < 2) {
    return;
  }

  const activeTemplateIndexes = new Set(
    context.runtimeState.eventEntities.map((entity) => EventState.templateIndex[entity]),
  );
  const pressureTags = new Set(getPressureTags(context));
  const candidateTemplates = context.registry.events
    .map((template, index) => ({ template, index }))
    .filter(({ template, index }) => {
      return (
        !activeTemplateIndexes.has(index) &&
        template.pressureTags.some((tag) => pressureTags.has(tag))
      );
    });
  if (candidateTemplates.length === 0) {
    return;
  }

  const selection = weightedChoice(
    new SeededRng(
      seedFromKey(`event:${currentMinute}:${BuildingAuthority.pressure[buildingEntity]}`),
    ),
    candidateTemplates.map(({ index, template }) => ({ item: index, weight: template.weight })),
  );
  const nextTemplateIndex = selection.outcome;
  const template = context.registry.events[nextTemplateIndex];
  const entity = addEntity(context.world);
  addComponent(context.world, entity, EventState);
  EventState.id[entity] = `event-instance/${context.runtimeState.nextEventSequence}`;
  EventState.templateIndex[entity] = nextTemplateIndex;
  EventState.severity[entity] = Math.max(1, Math.ceil(BuildingAuthority.pressure[buildingEntity]));
  EventState.remainingHours[entity] = 6 + template.weight * 2;
  EventState.pressureContribution[entity] = template.weight;

  context.runtimeState.eventEntities.push(entity);
  context.runtimeState.nextEventSequence += 1;
  BuildingAuthority.lastEventTick[buildingEntity] = currentMinute;
  context.runtimeState.pendingCueIds.push("event.pressure");
  pushRuntimeEvent(context, {
    kind: "event_change",
    message: `${template.name} (${Math.ceil(EventState.remainingHours[entity])}h remaining)`,
    accent: "ember",
  });
};
