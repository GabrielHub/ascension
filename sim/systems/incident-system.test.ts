import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";

import {
  BuildingAuthority,
  GuildState,
  MoraleState,
  OperatorIdentity,
  WorldTimeState,
} from "../components";
import { createIncidentState } from "./incidents";
import { advanceIncidentSystem } from "./incident-system";
import type { SimSystemContext } from "./types";

function createIncidentSystemContext(): SimSystemContext {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.treasury[guildEntity] = 0;
  GuildState.reputation[guildEntity] = 0;
  GuildState.intel[guildEntity] = 5;
  WorldTimeState.day[timeEntity] = 1;
  WorldTimeState.minuteOfDay[timeEntity] = 600;

  BuildingAuthority.contractLifecycle[buildingEntity] = "active";
  BuildingAuthority.contractSite[buildingEntity] = {
    contractSiteId: "contract/test",
    missionId: "mission/clearance",
    siteConceptId: "site/flooded-subway-tunnel",
    location: "district/lower-east-side",
    rank: "f",
    bossDefeated: false,
    contractLost: false,
    threat: 40,
    intel: 40,
    reward: 80,
    securedAtTick: 600,
    explorationProgress: 10,
    bossIntelProgress: 0,
    bossPressureProgress: 0,
    bossAvailable: false,
  };
  BuildingAuthority.raidSummaries[buildingEntity] = [];
  BuildingAuthority.activeRaidPackets[buildingEntity] = [];
  BuildingAuthority.postedContracts[buildingEntity] = [];
  BuildingAuthority.contractResult[buildingEntity] = null;
  BuildingAuthority.fogOfWar[buildingEntity] = null;
  BuildingAuthority.pressure[buildingEntity] = 0;

  const operatorIds = [
    ["operator/a", "Rose Vega"],
    ["operator/b", "Milo Hart"],
  ] as const;
  const operatorEntities = operatorIds.map(([id, name]) => {
    const entity = addEntity(world);
    addComponent(world, entity, OperatorIdentity);
    addComponent(world, entity, MoraleState);
    OperatorIdentity.id[entity] = id;
    OperatorIdentity.name[entity] = name;
    OperatorIdentity.roleTag[entity] = "role:field_lead";
    OperatorIdentity.specialtyTag[entity] = "";
    OperatorIdentity.lifecycleStatus[entity] = "active";
    MoraleState.current[entity] = 20;
    MoraleState.baseline[entity] = 60;
    return entity;
  });

  return {
    world,
    registry: templateRegistry,
    singletonEntities: { guild: guildEntity, time: timeEntity, building: buildingEntity },
    runtimeState: {
      roomEntities: [],
      operatorEntities,
      raidOpportunityEntities: [],
      staffEntities: [],
      visitorEntities: [],
      eventEntities: [],
      dispositionEntities: [],
      notableTieEntities: [],
      recurringTeamEntities: [],
      roomCultureEntities: [],
      inventoryEntities: [],
      equipmentEntities: [],
      nextRoomSequence: 1,
      nextOperatorSequence: 3,
      nextOpportunitySequence: 1,
      nextStaffSequence: 1,
      nextVisitorSequence: 1,
      nextRaidSequence: 1,
      nextEventSequence: 1,
      nextTeamSequence: 1,
      pendingCueIds: [],
      pendingEvents: [],
      raidPresentation: {
        contractSiteId: null,
        teams: [],
        enemies: [],
        features: [],
      },
      activeEncounter: null,
      interruptionQueue: { active: null, queue: [], nextInstanceId: 1 },
      incidentState: createIncidentState(),
      guidanceState: {
        seenBeatIds: [
          "guidance/opening/board-briefing",
          "guidance/opening/first-contract-choice",
          "guidance/opening/bodega-overview",
          "guidance/opening/roster-and-equip",
          "guidance/opening/first-team-departure",
          "guidance/opening/first-raid-return",
          "guidance/opening/roster-condition",
        ],
        completedBeatIds: [
          "guidance/opening/board-briefing",
          "guidance/opening/first-contract-choice",
          "guidance/opening/bodega-overview",
          "guidance/opening/roster-and-equip",
          "guidance/opening/first-team-departure",
          "guidance/opening/first-raid-return",
          "guidance/opening/roster-condition",
        ],
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
        openingTiming: {
          firstRaidReturnCompletedAtMinute: 540,
          firstIncidentSeededAtMinute: null,
          securedContractCount: 1,
          lastTrackedContractSiteId: "contract/test",
        },
      },
      kitRegistry: {
        regularAttacks: [],
        skills: [],
        ultimates: [],
        passives: [],
        regularAttackById: new Map(),
        skillById: new Map(),
        ultimateById: new Map(),
        passiveById: new Map(),
      },
      worldTimeFrozen: false,
    },
  };
}

describe("incident system", () => {
  it("does not deliver raw incidents before the opening first-incident beat is learned", () => {
    const context = createIncidentSystemContext();
    context.runtimeState.incidentState.lastEvaluationMinute = 480;

    advanceIncidentSystem(context, 1000);

    expect(context.runtimeState.incidentState.pendingIncident).toBeNull();
    expect(context.runtimeState.interruptionQueue.active).toBeNull();
  });
});
