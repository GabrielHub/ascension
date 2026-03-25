import { bootstrapScenario } from "content/bootstrap";
import type { TemplateRegistry } from "content/templates";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";

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
export * from "./contracts";
export * from "./recruitment";
export * from "./runtime";
export * from "./systems";
export * from "./uncertainty";

function buildBootstrapWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
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
      activeFloorIndex: 0,
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
        floorIndex: seed.floorIndex,
        slotId: seed.slotId,
        roomStateId: getRoomStateId(roomTemplate.id, []),
        capacity: roomTemplate.baseCapacity,
        occupancy: seed.occupancy,
        ...(seed.isActive === undefined ? {} : { isActive: seed.isActive }),
        reservedFootprint: { ...seed.reservedFootprint },
        activeFootprint:
          seed.activeFootprint ??
          getRoomActiveFootprint(roomTemplate.id, seed.reservedFootprint, []),
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
      combat: {
        rank: operator.combat.rank,
        attunementTag: operator.combat.attunementTag,
        traits: [...operator.combat.traits],
        kit: {
          regularAttackId: operator.combat.kit.regularAttackId,
          skillId: operator.combat.kit.skillId,
          ultimateId: operator.combat.kit.ultimateId,
          passiveIds: [...operator.combat.kit.passiveIds],
        },
        baseStats: { ...operator.combat.baseStats },
      },
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
    operatorDispositions: bootstrapScenario.operators.map((operator) => ({
      operatorId: operator.id,
      sociability: 50,
      temperament: 50,
      grievanceLevel: Math.max(0, Math.round(50 - operator.morale.current * 0.5)),
      satisfactionLevel: Math.round((operator.morale.current + operator.loyalty.current) / 2),
    })),
    inventoryStacks: bootstrapScenario.inventory.map((entry) => ({ ...entry })),
    equipmentAssignments: bootstrapScenario.operators
      .map((operator) => {
        const appearance = BOOTSTRAP_OPERATOR_APPEARANCE_BY_ID[operator.id];
        if (!appearance?.visibleGear) {
          return null;
        }

        return {
          operatorId: operator.id,
          weaponId: appearance.visibleGear.weaponPartId ?? "",
          outfitOverlayId: appearance.visibleGear.outfitOverlayPartId ?? "",
          accessoryId: appearance.visibleGear.accessoryPartId ?? "",
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          operatorId: string;
          weaponId: string;
          outfitOverlayId: string;
          accessoryId: string;
        } => entry !== null,
      ),
  } satisfies Phase1RuntimeWorldSnapshot;

  return snapshot;
}

function getAbsoluteMinute(snapshot: WorldSnapshot): number {
  return Math.max(0, (snapshot.time.day - 1) * 1440 + snapshot.time.minuteOfDay);
}

export function createBootstrapWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const simulation = createAscensionSimulation(buildBootstrapWorldSnapshot(registry), registry);
  simulation.tick(0);
  return simulation.getWorldSnapshot();
}

export function createPreviewWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const world = createBootstrapWorldSnapshot(registry);
  const posting = world.postedContracts?.[0];

  if (!posting) {
    return world;
  }

  const securedAtTick = getAbsoluteMinute(world);

  return {
    ...world,
    contractLifecycle: "active",
    contractSite: {
      contractSiteId: `contract/${securedAtTick}`,
      missionId: posting.missionId,
      siteConceptId: posting.siteConceptId,
      location: posting.location,
      rank: posting.rank,
      bossDefeated: false,
      contractLost: false,
      threat: posting.threat,
      intel: posting.intel,
      reward: posting.reward,
      securedAtTick,
      explorationProgress: 0,
      bossIntelProgress: 0,
      bossPressureProgress: 0,
      bossAvailable: false,
    },
    postedContracts: [],
    contractResult: null,
    fogOfWar: {
      gridWidth: 16,
      gridHeight: 16,
      revealed: Array.from({ length: 16 * 16 }, () => false),
      revealedCount: 0,
    },
  };
}

export function createBootstrapSimulation(registry: TemplateRegistry) {
  return createAscensionSimulation(createBootstrapWorldSnapshot(registry), registry);
}
