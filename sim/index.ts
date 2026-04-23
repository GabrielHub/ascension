import {
  bootstrapScenario,
  buildRandomizedNewGameScenario,
  canonicalNewGameScenario,
  type BootstrapScenario,
} from "content/bootstrap";
import type { TemplateRegistry } from "content/templates";
import { DEFAULT_GUILD_NAME, normalizeGameIdentity, type GameIdentity } from "lib/game-identity";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";

import type { WorldSnapshot } from "save";

import {
  createAscensionSimulation,
  type Phase1OperatorSnapshot,
  type Phase1RuntimeWorldSnapshot,
} from "./runtime";

const OPERATOR_APPEARANCE_PRESET_BY_ID: Record<string, string> = {
  "operator/rose-vega": "vera-004",
  "operator/milo-hart": "dax-008",
  "operator/jin-tanaka": "jin-005",
  "operator/vera-santos": "ryn-011",
  "operator/ash-okafor": "ash-006",
  "operator/lena-park": "lena-007",
};

const BOOTSTRAP_OPERATOR_VISIBLE_GEAR_BY_ID: Record<
  string,
  NonNullable<Phase1OperatorSnapshot["appearance"]["visibleGear"]>
> = {
  "operator/rose-vega": {
    weaponPartId: "weapon/tactical-rifle",
    outfitOverlayPartId: "outfit-overlay/tactical-vest",
  },
  "operator/milo-hart": {
    weaponPartId: "weapon/dual-daggers",
    accessoryPartId: "accessory/comm-earpiece",
  },
};

export * from "./commands";
export * from "./components";
export * from "./contracts";
export * from "./recruitment";
export * from "./runtime";
export * from "./systems";
export * from "./uncertainty";

function buildScenarioWorldSnapshot(
  scenario: BootstrapScenario,
  registry: TemplateRegistry,
  identityInput?: Partial<GameIdentity>,
  options?: {
    includeBootstrapEquipment?: boolean;
  },
): WorldSnapshot {
  const includeBootstrapEquipment = options?.includeBootstrapEquipment ?? false;
  const identity = normalizeGameIdentity(identityInput, {
    guildNameFallback: DEFAULT_GUILD_NAME,
  });
  const startingBuilding = registry.buildingById.get(scenario.building.activeBuildingId);

  if (!startingBuilding) {
    throw new Error(
      `Bootstrap scenario references unknown building "${scenario.building.activeBuildingId}".`,
    );
  }

  const snapshot = {
    guild: {
      guildName: identity.guildName,
      playerName: identity.playerName,
      ...scenario.guild,
    },
    time: { ...scenario.time },
    building: {
      activeBuildingId: startingBuilding.id,
      activeBuildingTier: startingBuilding.baseTier,
      activeFloorIndex: 0,
      roomSlotCount: startingBuilding.baseRoomSlots,
      operatorSlotCount: startingBuilding.baseOperatorSlots,
    },
    rooms: scenario.rooms.map((seed) => {
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
    operators: scenario.operators.map((operator) => ({
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
        presetId: OPERATOR_APPEARANCE_PRESET_BY_ID[operator.id] ?? "kael-001",
        ...(includeBootstrapEquipment && BOOTSTRAP_OPERATOR_VISIBLE_GEAR_BY_ID[operator.id]
          ? {
              visibleGear: {
                ...BOOTSTRAP_OPERATOR_VISIBLE_GEAR_BY_ID[operator.id],
              },
            }
          : {}),
      },
      lifecycle: { status: "active" as const },
      training: {
        strength: 0,
        speed: 0,
        endurance: 0,
        resilience: 0,
      },
      combat: {
        rank: operator.combat.rank,
        attunementTag: operator.combat.attunementTag,
        traits: [...operator.combat.traits],
        combatPackageId: operator.combat.combatPackageId,
        blocks: operator.combat.blocks,
        baseStats: { ...operator.combat.baseStats },
      },
    })),
    operatorRelationships: scenario.operatorRelationships.map((relationship) => ({
      ...relationship,
      historyTags: [...relationship.historyTags],
    })),
    visitors: scenario.visitors.map((visitor) => ({ ...visitor, queueState: "active" as const })),
    raidOpportunities: scenario.raidOpportunities.map((opportunity) => ({
      ...opportunity,
      interestedOperatorIds: [...opportunity.interestedOperatorIds],
      claimedOperatorIds: [...opportunity.claimedOperatorIds],
    })),
    activeEvents: [],
    operatorDispositions: scenario.operators.map((operator) => ({
      operatorId: operator.id,
      sociability: 50,
      temperament: 50,
      grievanceLevel: Math.max(0, Math.round(50 - operator.morale.current * 0.5)),
      satisfactionLevel: Math.round((operator.morale.current + operator.loyalty.current) / 2),
    })),
    inventoryStacks: scenario.inventory.map((entry) => ({ ...entry })),
    equipmentAssignments: includeBootstrapEquipment
      ? scenario.operators
          .map((operator) => {
            const visibleGear = BOOTSTRAP_OPERATOR_VISIBLE_GEAR_BY_ID[operator.id];
            if (!visibleGear) {
              return null;
            }

            return {
              operatorId: operator.id,
              weaponId: visibleGear.weaponPartId ?? "",
              outfitOverlayId: visibleGear.outfitOverlayPartId ?? "",
              accessoryId: visibleGear.accessoryPartId ?? "",
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
          )
      : [],
    presenterUnlocks: registry.presenters.flatMap((presenter) => {
      if (presenter.id === "presenter/assistant") {
        return [
          {
            presenterId: presenter.id,
            unlockedAtTick: 0,
            unlockedAtDay: scenario.time.day,
          },
        ];
      }

      return presenter.unlockFromRoomTemplateId &&
        scenario.rooms.some((room) => room.templateId === presenter.unlockFromRoomTemplateId)
        ? [
            {
              presenterId: presenter.id,
              unlockedAtTick: scenario.time.tick,
              unlockedAtDay: scenario.time.day,
            },
          ]
        : [];
    }),
  } satisfies Phase1RuntimeWorldSnapshot;

  return snapshot;
}

function getAbsoluteMinute(snapshot: WorldSnapshot): number {
  return Math.max(0, (snapshot.time.day - 1) * 1440 + snapshot.time.minuteOfDay);
}

export function createBootstrapWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const bootstrap = buildScenarioWorldSnapshot(bootstrapScenario, registry, undefined, {
    includeBootstrapEquipment: true,
  });
  const simulation = createAscensionSimulation(bootstrap, registry);
  simulation.tick(0);
  return simulation.getWorldSnapshot();
}

export function createNewGameWorldSnapshot(
  registry: TemplateRegistry,
  identity?: Partial<GameIdentity>,
  options?: { seed?: number },
): WorldSnapshot {
  const seed = options?.seed ?? 1;
  const bootstrap = buildScenarioWorldSnapshot(
    seed === 1 ? canonicalNewGameScenario : buildRandomizedNewGameScenario(seed),
    registry,
    identity,
  );
  const simulation = createAscensionSimulation(bootstrap, registry, {
    simulationSeed: seed,
  });
  simulation.tick(0);
  const snapshot = simulation.getWorldSnapshot();
  // Set opening guidance AFTER the tick so the guidance system does not
  // enqueue beats during bootstrap. The player-facing new game flow
  // will restore this state and begin the opening path on first tick.
  (snapshot as Record<string, unknown>).guidanceState = {
    seenBeatIds: [],
    completedBeatIds: [],
    dismissedBeatIds: [],
    activeBeatId: null,
    activeBeatView: null,
    queuedBeatIds: [],
    lastEvaluationMinute: 0,
    openingPathState: "active",
    anchorResolutionFailures: [],
    activeBeatProgressBaseline: null,
    interactionCounts: {
      staffingActions: 0,
      upgradesPurchased: 0,
    },
    lastPurchasedUpgradeId: null,
    openingTiming: {
      firstRaidReturnCompletedAtMinute: null,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 0,
      lastTrackedContractSiteId: null,
    },
  };
  return snapshot;
}

export function createPreviewWorldSnapshot(registry: TemplateRegistry): WorldSnapshot {
  const bootstrap = buildScenarioWorldSnapshot(
    bootstrapScenario,
    registry,
    {
      guildName: "Sandbox Guild",
    },
    {
      includeBootstrapEquipment: true,
    },
  );
  const simulation = createAscensionSimulation(bootstrap, registry);
  simulation.tick(0);
  const world = simulation.getWorldSnapshot();
  // Preview mode: strip guidance so sandbox sessions skip the opening path.
  delete (world as Record<string, unknown>).guidanceState;
  // Also clear any stale interruption queue from bootstrap.
  delete (world as Record<string, unknown>).interruptionQueue;
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
      missionCompleted: false,
      contractLost: false,
      threat: posting.threat,
      intel: posting.intel,
      reward: posting.reward,
      boardIntel: posting.boardIntel ?? { source: "street", quality: "rough" },
      briefing: null,
      securedAtTick,
      explorationProgress: 0,
      closureProgress: 0,
      closureThreshold: 100,
      bossIntelProgress: 0,
      bossPressureProgress: 0,
      requiresBossClear: false,
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
