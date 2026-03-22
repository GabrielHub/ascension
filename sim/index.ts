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
    presetId: "vera-004",
    visibleGear: {
      weaponPartId: "weapon/tactical-rifle",
      outfitOverlayPartId: "outfit-overlay/tactical-vest",
    },
  },
  "operator/milo-hart": {
    presetId: "dax-008",
    visibleGear: {
      weaponPartId: "weapon/dual-daggers",
      accessoryPartId: "accessory/comm-earpiece",
    },
  },
};

export * from "./commands";
export * from "./components";
export * from "./navigation";
export * from "./runtime";
export * from "./systems";
export * from "./uncertainty";

export function createBootstrapWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const startingBuilding = registry.buildingById.get(bootstrapScenario.building.activeBuildingId);

  if (!startingBuilding) {
    throw new Error(
      `Bootstrap scenario references unknown building "${bootstrapScenario.building.activeBuildingId}".`,
    );
  }

  const snapshot = {
    guild: { ...bootstrapScenario.guild },
    time: { ...bootstrapScenario.time },
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
        footprint: { ...seed.footprint },
      };
    }),
    activeRaidPackets: [],
    raidSummaries: [],
    appliedUpgradeIds: [],
    operators: bootstrapScenario.operators.map((operator) => ({
      ...operator,
      identity: { ...operator.identity },
      preferences: {
        ...operator.preferences,
        preferredMissionTags: [...operator.preferences.preferredMissionTags],
        preferredPartnerIds: [...operator.preferences.preferredPartnerIds],
      },
      schedule: { ...operator.schedule },
      needs: { ...operator.needs },
      morale: { ...operator.morale },
      loyalty: { ...operator.loyalty },
      injury: { ...operator.injury },
      assignment: { ...operator.assignment },
      appearance: {
        presetId: BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID[operator.id]?.presetId ?? "kael-001",
        ...(BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID[operator.id]?.visibleGear
          ? {
              visibleGear: {
                ...BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID[operator.id]!.visibleGear,
              },
            }
          : {}),
      },
      lifecycle: { status: "active" as const },
    })),
    operatorRelationships: bootstrapScenario.operatorRelationships.map((relationship) => ({
      ...relationship,
      historyTags: [...relationship.historyTags],
    })),
    staff: bootstrapScenario.staff.map((staff) => ({
      ...staff,
      assignment: { ...staff.assignment },
    })),
    visitors: bootstrapScenario.visitors.map((visitor) => ({ ...visitor })),
    raidOpportunities: bootstrapScenario.raidOpportunities.map((opportunity) => ({
      ...opportunity,
      interestedOperatorIds: [...opportunity.interestedOperatorIds],
      claimedOperatorIds: [...opportunity.claimedOperatorIds],
    })),
    activeEvents: [],
  } satisfies Phase1RuntimeWorldSnapshot;

  return snapshot;
}

export function createBootstrapSimulation(registry: TemplateRegistry) {
  return createAscensionSimulation(createBootstrapWorldSnapshot(registry), registry);
}
