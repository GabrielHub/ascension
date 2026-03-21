import { bootstrapScenario } from "content/bootstrap";
import type { TemplateRegistry } from "content/templates";

import type { WorldSnapshot } from "save";

import { createAscensionSimulation } from "./runtime";

export * from "./commands";
export * from "./components";
export * from "./runtime";
export * from "./systems";

export function createBootstrapWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const startingBuilding = registry.buildingById.get(bootstrapScenario.building.activeBuildingId);

  if (!startingBuilding) {
    throw new Error(
      `Bootstrap scenario references unknown building "${bootstrapScenario.building.activeBuildingId}".`,
    );
  }

  return {
    guild: bootstrapScenario.guild,
    time: bootstrapScenario.time,
    building: {
      activeBuildingId: startingBuilding.id,
      activeBuildingTier: startingBuilding.baseTier,
      roomSlotCount: startingBuilding.baseRoomSlots,
      operatorSlotCount: startingBuilding.baseOperatorSlots,
    },
    rooms: bootstrapScenario.rooms.map((seed) => {
      const roomTemplate = registry.roomById.get(seed.templateId);

      if (!roomTemplate) {
        throw new Error(`Bootstrap scenario references unknown room "${seed.templateId}".`);
      }

      return {
        id: seed.id,
        templateId: roomTemplate.id,
        tier: roomTemplate.tier,
        capacity: roomTemplate.baseCapacity,
        occupancy: seed.occupancy,
        position: seed.position,
      };
    }),
    activeRaidPackets: [],
    raidSummaries: [],
    appliedUpgradeIds: [],
  };
}

export function createBootstrapSimulation(registry: TemplateRegistry) {
  return createAscensionSimulation(createBootstrapWorldSnapshot(registry), registry);
}
