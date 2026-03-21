import { addComponent, addEntity, createWorld } from "bitecs";

import type { TemplateRegistry } from "content/templates";

import type { WorldSnapshot } from "save";

import {
  BuildingAuthority,
  GuildState,
  Renderable,
  RoomInstance,
  WorldTimeState,
} from "./components";
import { createSimCommandQueue } from "./commands";
import { runSimSystemSchedule, simSystemSchedule, type SimSingletonEntities } from "./systems";

export interface AscensionSimulation {
  registry: TemplateRegistry;
  singletonEntities: SimSingletonEntities;
  roomEntities: readonly number[];
  schedule: typeof simSystemSchedule;
  getWorldSnapshot(): WorldSnapshot;
  tick(deltaMs: number): void;
}

function applyWorldSnapshot(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
): AscensionSimulation {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.reputation[guildEntity] = snapshot.guild.reputation;
  GuildState.treasury[guildEntity] = snapshot.guild.treasury;
  GuildState.intel[guildEntity] = snapshot.guild.intel;

  WorldTimeState.tick[timeEntity] = snapshot.time.tick;
  WorldTimeState.day[timeEntity] = snapshot.time.day;
  WorldTimeState.minuteOfDay[timeEntity] = snapshot.time.minuteOfDay;

  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] =
    registry.buildingIndexById.get(snapshot.building.activeBuildingId) ?? 0;
  BuildingAuthority.activeBuildingTier[buildingEntity] = snapshot.building.activeBuildingTier;
  BuildingAuthority.roomSlotCount[buildingEntity] = snapshot.building.roomSlotCount;
  BuildingAuthority.operatorSlotCount[buildingEntity] = snapshot.building.operatorSlotCount;

  const roomEntities = snapshot.rooms.map((room) => {
    const entity = addEntity(world);
    addComponent(world, entity, RoomInstance);
    addComponent(world, entity, Renderable);

    RoomInstance.templateIndex[entity] = registry.roomIndexById.get(room.templateId) ?? 0;
    RoomInstance.tier[entity] = room.tier;
    RoomInstance.capacity[entity] = room.capacity;
    RoomInstance.occupancy[entity] = room.occupancy;

    Renderable.x[entity] = room.position.x;
    Renderable.y[entity] = room.position.y;
    Renderable.width[entity] = room.position.width;
    Renderable.height[entity] = room.position.height;
    Renderable.layer[entity] = 1;

    return entity;
  });

  const singletonEntities: SimSingletonEntities = {
    guild: guildEntity,
    time: timeEntity,
    building: buildingEntity,
  };

  const commands = createSimCommandQueue();

  return {
    registry,
    singletonEntities,
    roomEntities,
    schedule: simSystemSchedule,
    getWorldSnapshot() {
      const activeBuilding =
        registry.buildings[
          BuildingAuthority.activeBuildingTemplateIndex[singletonEntities.building]
        ] ?? registry.buildings[0];

      return {
        guild: {
          reputation: GuildState.reputation[singletonEntities.guild],
          treasury: GuildState.treasury[singletonEntities.guild],
          intel: GuildState.intel[singletonEntities.guild],
        },
        time: {
          tick: WorldTimeState.tick[singletonEntities.time],
          day: WorldTimeState.day[singletonEntities.time],
          minuteOfDay: WorldTimeState.minuteOfDay[singletonEntities.time],
        },
        building: {
          activeBuildingId: activeBuilding.id,
          activeBuildingTier: BuildingAuthority.activeBuildingTier[singletonEntities.building],
          roomSlotCount: BuildingAuthority.roomSlotCount[singletonEntities.building],
          operatorSlotCount: BuildingAuthority.operatorSlotCount[singletonEntities.building],
        },
        rooms: roomEntities.map((entity, index) => {
          const template = registry.rooms[RoomInstance.templateIndex[entity]] ?? registry.rooms[0];

          return {
            id: snapshot.rooms[index]?.id ?? `room-instance/${index + 1}`,
            templateId: template.id,
            tier: RoomInstance.tier[entity],
            capacity: RoomInstance.capacity[entity],
            occupancy: RoomInstance.occupancy[entity],
            position: {
              x: Renderable.x[entity],
              y: Renderable.y[entity],
              width: Renderable.width[entity],
              height: Renderable.height[entity],
            },
          };
        }),
        activeRaidPackets: snapshot.activeRaidPackets,
        raidSummaries: snapshot.raidSummaries,
        appliedUpgradeIds: [...snapshot.appliedUpgradeIds],
      };
    },
    tick(deltaMs) {
      commands.enqueue({ type: "sim/tick", deltaMs });

      commands.drain().forEach((command) => {
        if (command.type === "sim/tick") {
          runSimSystemSchedule({ world, registry, singletonEntities }, command.deltaMs);
        }
      });
    },
  };
}

export function createAscensionSimulation(
  snapshot: WorldSnapshot,
  registry: TemplateRegistry,
): AscensionSimulation {
  return applyWorldSnapshot(snapshot, registry);
}
