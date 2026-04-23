import { getBuildingFloors } from "content/building-layouts";
import type { WorldSnapshot } from "save";

import { templateRegistry } from "content/templates";
import { getRoomActiveFootprint, getRoomStateId } from "lib/hq-room-state";
import { createAscensionSimulation, createBootstrapWorldSnapshot } from "../index";
import { OPENING_BEAT_IDS } from "../systems/guidance-beats";
import { deferredSimulationSystemsReady } from "../systems";

export const PORTERS_CAMPAIGN_UPGRADE_SEQUENCE = [
  "upgrade/building/porters:kitchen_overhaul",
  "upgrade/building/porters:upstairs_conversion",
  "upgrade/building/porters:remodel",
  "upgrade/building/porters:waterfront",
] as const;

function cloneLateBodegaOperator(
  template: NonNullable<WorldSnapshot["operators"]>[number],
  index: number,
): NonNullable<WorldSnapshot["operators"]>[number] {
  const operatorVariants = [
    {
      appearancePresetId: "mira-002",
      name: "Tessa Vale",
      roleTag: "role:scout",
      specialtyTag: "focus:extraction",
    },
    {
      appearancePresetId: "dax-008",
      name: "Marco Sun",
      roleTag: "role:field_lead",
      specialtyTag: "focus:containment",
    },
    {
      appearancePresetId: "soren-003",
      name: "Nadia Cross",
      roleTag: "role:medic",
      specialtyTag: "focus:containment",
    },
    {
      appearancePresetId: "vera-004",
      name: "Owen Pike",
      roleTag: "role:scout",
      specialtyTag: "focus:extraction",
    },
  ] as const;
  const variant = operatorVariants[index % operatorVariants.length];
  const clone = structuredClone(template);
  clone.id = `operator/late-bodega-${index + 1}`;
  clone.identity = {
    ...clone.identity,
    name: variant.name,
    roleTag: variant.roleTag,
    specialtyTag: variant.specialtyTag,
  };
  clone.appearance = {
    presetId: variant.appearancePresetId,
  };
  clone.assignment = { kind: "idle", targetId: "" };
  clone.lifecycle = { status: "active" };
  return clone;
}

function buildClosedBodegaRaidSummaries(): WorldSnapshot["raidSummaries"] {
  return Array.from({ length: 20 }, (_, index) => {
    const contractNumber = index + 1;
    return {
      id: `raid/late-bodega-${contractNumber}`,
      contractSiteId: `contract/late-bodega-${contractNumber}`,
      missionId: "mission/clearance",
      startedAt: `2026-02-${String(contractNumber).padStart(2, "0")}T18:00:00.000Z`,
      endedAt: `2026-02-${String(contractNumber).padStart(2, "0")}T20:00:00.000Z`,
      result: index % 5 === 0 ? "mixed" : "success",
      reputationDelta: index % 5 === 0 ? 3 : 5,
      cashDelta: 140 + index * 3,
      threat: 44 + (index % 4) * 6,
      intel: 58 + (index % 3) * 8,
      reward: 160 + index * 4,
      cohesion: 60 + (index % 4) * 5,
      operatorOutcomes: [],
      narrativeTags: index < 3 ? ["boss:defeated"] : [],
      intelMismatchTags: [],
      bossDefeated: index < 3,
      contributingFactors: ["phase:bodega", "promotion:ready"],
    };
  });
}

function buildCompletedOpeningGuidanceState(world: WorldSnapshot): Record<string, unknown> {
  const lastTrackedContractSiteId =
    world.raidSummaries[world.raidSummaries.length - 1]?.contractSiteId ?? null;

  return {
    seenBeatIds: [...OPENING_BEAT_IDS],
    completedBeatIds: [...OPENING_BEAT_IDS],
    dismissedBeatIds: [],
    activeBeatId: null,
    activeBeatView: null,
    queuedBeatIds: [],
    lastEvaluationMinute: 12_000,
    openingPathState: "completed",
    anchorResolutionFailures: [],
    activeBeatProgressBaseline: null,
    interactionCounts: {
      staffingActions: 12,
      upgradesPurchased: 3,
    },
    lastPurchasedUpgradeId: null,
    openingTiming: {
      firstRaidReturnCompletedAtMinute: 540,
      firstIncidentSeededAtMinute: 720,
      securedContractCount: world.raidSummaries.length,
      lastTrackedContractSiteId,
    },
  };
}

export function createRelocationReadyWorld(): WorldSnapshot {
  const simulation = createAscensionSimulation(
    createBootstrapWorldSnapshot(templateRegistry),
    templateRegistry,
  );

  simulation.dispatch({ type: "sim/dev-set-resource", resourceId: "resource/cash", amount: 5000 });
  simulation.dispatch({
    type: "sim/dev-set-resource",
    resourceId: "resource/reputation",
    amount: 300,
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:frontage",
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:annex",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/back_office:tier_1",
    floorIndex: 0,
    slotId: "slot/back-room-right",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/backstock:tier_1",
    floorIndex: 0,
    slotId: "slot/storage-left",
  });
  simulation.dispatch({
    type: "sim/purchase-building-upgrade",
    upgradeId: "upgrade/building/bodega:extension",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/alley_staging:tier_1",
    floorIndex: 0,
    slotId: "slot/storage-right",
  });

  const upgradedWorld = structuredClone(simulation.getWorldSnapshot());
  const baseOperators = upgradedWorld.operators ?? [];
  const extraOperators = baseOperators
    .slice(0, 4)
    .map((operator, index) => cloneLateBodegaOperator(operator, index));

  upgradedWorld.guild.treasury = 1400;
  upgradedWorld.guild.reputation = 55;
  upgradedWorld.building.activeBuildingTier = 4;
  upgradedWorld.building.roomSlotCount = 7;
  upgradedWorld.building.operatorSlotCount = 10;
  upgradedWorld.operators = [...baseOperators, ...extraOperators];
  upgradedWorld.operatorDispositions = [
    ...(upgradedWorld.operatorDispositions ?? []),
    ...extraOperators.map((operator, index) => ({
      operatorId: operator.id,
      sociability: 52 + index * 4,
      temperament: 55 - index * 3,
      grievanceLevel: 8,
      satisfactionLevel: 68,
    })),
  ];
  upgradedWorld.visitors = [];
  upgradedWorld.raidSummaries = buildClosedBodegaRaidSummaries();
  upgradedWorld.guidanceState = buildCompletedOpeningGuidanceState(upgradedWorld);
  upgradedWorld.activeRaidPackets = [];
  upgradedWorld.contractSite = null;
  upgradedWorld.contractResult = null;
  upgradedWorld.contractLifecycle = "bidding";
  upgradedWorld.fogOfWar = null;
  upgradedWorld.activeEncounter = null;
  upgradedWorld.interruptionQueue = null;
  upgradedWorld.incidentState = null;

  return createAscensionSimulation(upgradedWorld, templateRegistry).getWorldSnapshot();
}

export function createPortersUpgradeCampaignSeedWorld(): WorldSnapshot {
  const relocatedWorld = structuredClone(createRelocationReadyWorld());
  const starterFloors = getBuildingFloors("building/porters", 1);

  relocatedWorld.building = {
    activeBuildingId: "building/porters",
    activeBuildingTier: 1,
    activeFloorIndex: 0,
    roomSlotCount: 7,
    operatorSlotCount: 12,
  };
  relocatedWorld.appliedUpgradeIds = [];
  relocatedWorld.rooms = starterFloors.flatMap((floor) =>
    floor.slots.flatMap((slot) => {
      if (!slot.startingTemplateId) {
        return [];
      }

      const template = templateRegistry.roomById.get(slot.startingTemplateId);
      if (!template) {
        return [];
      }

      const reservedFootprint = {
        col: slot.col,
        row: slot.row,
        cols: slot.cols,
        rows: slot.rows,
      };

      return [
        {
          id: `room-instance/${template.id.replace("room/", "").replace(":tier_1", "")}`,
          templateId: template.id,
          tier: template.tier,
          floorIndex: floor.floorIndex,
          slotId: slot.slotId,
          roomStateId: getRoomStateId(template.id, []),
          capacity: template.baseCapacity,
          occupancy: 0,
          isActive: true,
          reservedFootprint,
          activeFootprint: getRoomActiveFootprint(template.id, reservedFootprint, []),
        },
      ];
    }),
  );
  relocatedWorld.activeRaidPackets = [];
  relocatedWorld.contractSite = null;
  relocatedWorld.contractResult = null;
  relocatedWorld.contractLifecycle = "idle";
  relocatedWorld.fogOfWar = null;
  relocatedWorld.activeEncounter = null;
  relocatedWorld.interruptionQueue = null;
  relocatedWorld.incidentState = null;
  relocatedWorld.visitors = [];
  relocatedWorld.operators = (relocatedWorld.operators ?? []).map((operator) => ({
    ...operator,
    assignment: { kind: "idle", targetId: "" },
  }));
  const inventoryByItemId = new Map(
    (relocatedWorld.inventoryStacks ?? []).map((stack) => [stack.itemId, stack.quantity]),
  );
  for (const [itemId, quantity] of [
    ["loot/monster-part/fang", 3],
    ["loot/monster-part/bone-shard", 2],
    ["loot/monster-part/bollard-core", 1],
  ] as const) {
    inventoryByItemId.set(itemId, (inventoryByItemId.get(itemId) ?? 0) + quantity);
  }
  relocatedWorld.inventoryStacks = [...inventoryByItemId.entries()].map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }));
  if (relocatedWorld.cityPressure) {
    relocatedWorld.cityPressure.factions = relocatedWorld.cityPressure.factions.map((faction) =>
      faction.factionId === "faction/emergency-management"
        ? { ...faction, standing: Math.max(faction.standing, 5) }
        : faction,
    );
  }

  const simulation = createAscensionSimulation(relocatedWorld, templateRegistry);
  simulation.dispatch({ type: "sim/dev-set-resource", resourceId: "resource/cash", amount: 5200 });
  simulation.dispatch({
    type: "sim/dev-set-resource",
    resourceId: "resource/reputation",
    amount: 420,
  });

  for (let hour = 0; hour < 6; hour += 1) {
    if (simulation.getPhase1View().postedContracts.length > 0) {
      break;
    }
    simulation.tick(60 * 60 * 1000);
  }

  if (simulation.getPhase1View().postedContracts.length === 0) {
    throw new Error("Porters campaign seed did not generate posted contracts.");
  }

  return simulation.getWorldSnapshot();
}

export interface PortersUpgradeCampaignReport {
  activeBuildingId: string;
  appliedUpgradeIds: string[];
  contractBriefing: ReturnType<
    ReturnType<typeof createAscensionSimulation>["getPhase1View"]
  >["contractSite"]["briefing"];
  latestRaidSummaryFactors: string[];
  placedRoomTemplateIds: string[];
}

export async function runPortersUpgradeCampaign(): Promise<PortersUpgradeCampaignReport> {
  await deferredSimulationSystemsReady;

  const simulation = createAscensionSimulation(
    createPortersUpgradeCampaignSeedWorld(),
    templateRegistry,
  );

  for (const upgradeId of PORTERS_CAMPAIGN_UPGRADE_SEQUENCE) {
    simulation.dispatch({ type: "sim/purchase-building-upgrade", upgradeId });
    simulation.tick(0);
  }

  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/break_room:tier_1",
    floorIndex: 1,
    slotId: "slot/break-room",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/briefing_room:tier_1",
    floorIndex: 1,
    slotId: "slot/briefing-room",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/dock:tier_1",
    floorIndex: 2,
    slotId: "slot/dock",
  });
  simulation.dispatch({
    type: "sim/place-room",
    templateId: "room/deck:tier_1",
    floorIndex: 2,
    slotId: "slot/deck",
  });

  const postingId = simulation.getPhase1View().postedContracts[0]?.postingId;
  if (!postingId) {
    throw new Error("Expected a posted contract for the Porters campaign run.");
  }

  simulation.dispatch({ type: "sim/bid-contract", postingId });
  simulation.tick(60_000);

  const contractBriefing = simulation.getPhase1View().contractSite?.briefing ?? null;
  if (!contractBriefing) {
    throw new Error("Expected The Briefing Room to affect the secured Porters contract.");
  }

  const initialRaidSummaryCount = simulation.getPhase1View().raidSummaries.length;
  for (let hour = 0; hour < 48; hour += 1) {
    const phase1View = simulation.getPhase1View();
    const latestSummary = phase1View.raidSummaries[phase1View.raidSummaries.length - 1];
    if (
      phase1View.raidSummaries.length > initialRaidSummaryCount &&
      latestSummary?.contributingFactors.includes("dock:staged") &&
      latestSummary?.contributingFactors.includes("deck:aired_out")
    ) {
      break;
    }
    simulation.tick(60 * 60 * 1000);
  }

  const finalView = simulation.getPhase1View();
  const latestSummary = finalView.raidSummaries[finalView.raidSummaries.length - 1];
  if (!latestSummary) {
    throw new Error("Expected a Porters raid summary after the campaign run.");
  }

  return {
    activeBuildingId: finalView.building.activeBuildingId,
    appliedUpgradeIds: [...finalView.building.appliedUpgradeIds],
    contractBriefing,
    latestRaidSummaryFactors: latestSummary.contributingFactors ?? [],
    placedRoomTemplateIds: finalView.rooms.map((room) => room.templateId),
  };
}
