import { bootstrapScenario } from "content/bootstrap";
import type { TemplateRegistry } from "content/templates";

import type { WorldSnapshot } from "save";

import {
  createAscensionSimulation,
  type Phase1OperatorSnapshot,
  type Phase1RuntimeWorldSnapshot,
} from "./runtime";

const BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID: Record<string, Phase1OperatorSnapshot["appearance"]> = {
  "operator/rose-vega": {
    presetId: "female-flowing",
    visibleGear: {
      weaponPartId: "weapon/tactical-rifle",
      outfitOverlayPartId: "outfit-overlay/tactical-vest",
    },
  },
  "operator/milo-hart": {
    presetId: "male-undercut",
    visibleGear: {
      weaponPartId: "weapon/dual-daggers",
      accessoryPartId: "accessory/comm-earpiece",
    },
  },
};

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

  const snapshot = {
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
    operators: bootstrapScenario.operators.map((operator) => ({
      ...operator,
      appearance: BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID[operator.id] ?? { presetId: "male-swept" },
      lifecycle: { status: "active" as const },
    })),
    operatorRelationships: [...bootstrapScenario.operatorRelationships],
    staff: [...bootstrapScenario.staff],
    visitors: [...bootstrapScenario.visitors],
    raidOpportunities: [...bootstrapScenario.raidOpportunities],
    activeEvents: [],
  } satisfies Phase1RuntimeWorldSnapshot;

  return snapshot;
}

export function createBootstrapSimulation(registry: TemplateRegistry) {
  return createAscensionSimulation(createBootstrapWorldSnapshot(registry), registry);
}
