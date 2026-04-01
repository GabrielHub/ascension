import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";

import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  WorldTimeState,
} from "../components";
import type { PendingIncident } from "./incidents";
import {
  OPENING_SAFE_INCIDENT_CATEGORIES,
  createIncidentInterruptionPayload,
  createIncidentState,
  INCIDENT_TEMPLATES,
  isOpeningIncidentMercyWindowActive,
  queueIncident,
  selectIncidentCandidate,
  validateIncidentTemplates,
} from "./incidents";
import type { SimSystemContext } from "./types";

function createIncidentContext(options?: {
  buildingId?: "building/bodega" | "building/porters";
  roomTemplateId?: string;
}): SimSystemContext {
  const world = createWorld();
  const guildEntity = addEntity(world);
  const timeEntity = addEntity(world);
  const buildingEntity = addEntity(world);

  addComponent(world, guildEntity, GuildState);
  addComponent(world, timeEntity, WorldTimeState);
  addComponent(world, buildingEntity, BuildingAuthority);

  GuildState.treasury[guildEntity] = 250;
  GuildState.reputation[guildEntity] = 5;
  GuildState.intel[guildEntity] = 5;
  WorldTimeState.day[timeEntity] = 1;
  WorldTimeState.minuteOfDay[timeEntity] = 600;
  const buildingId = options?.buildingId ?? "building/bodega";
  const buildingIndex = templateRegistry.buildingIndexById.get(buildingId) ?? 0;
  BuildingAuthority.activeBuildingTemplateIndex[buildingEntity] = buildingIndex;
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

  const operatorA = addEntity(world);
  addComponent(world, operatorA, OperatorIdentity);
  OperatorIdentity.id[operatorA] = "operator/a";
  OperatorIdentity.name[operatorA] = "Rose Vega";
  OperatorIdentity.roleTag[operatorA] = "role:field_lead";
  OperatorIdentity.specialtyTag[operatorA] = "";
  OperatorIdentity.lifecycleStatus[operatorA] = "active";

  const operatorB = addEntity(world);
  addComponent(world, operatorB, OperatorIdentity);
  OperatorIdentity.id[operatorB] = "operator/b";
  OperatorIdentity.name[operatorB] = "Milo Hart";
  OperatorIdentity.roleTag[operatorB] = "role:scout";
  OperatorIdentity.specialtyTag[operatorB] = "";
  OperatorIdentity.lifecycleStatus[operatorB] = "active";

  const roomEntities: number[] = [];
  if (options?.roomTemplateId) {
    const roomEntity = addEntity(world);
    addComponent(world, roomEntity, RoomInstance);
    RoomInstance.id[roomEntity] = "room-instance/test";
    RoomInstance.templateIndex[roomEntity] =
      templateRegistry.roomIndexById.get(options.roomTemplateId) ?? 0;
    RoomInstance.isOperational[roomEntity] = 1;
    roomEntities.push(roomEntity);
  }

  return {
    world,
    registry: templateRegistry,
    singletonEntities: { guild: guildEntity, time: timeEntity, building: buildingEntity },
    runtimeState: {
      roomEntities,
      operatorEntities: [operatorA, operatorB],
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
        seenBeatIds: [],
        completedBeatIds: ["guidance/opening/first-team-departure"],
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
          firstRaidReturnCompletedAtMinute: null,
          firstIncidentSeededAtMinute: null,
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

describe("incident interruption payloads", () => {
  it("validates authored incident template references against the template registry", () => {
    expect(() => validateIncidentTemplates(templateRegistry)).not.toThrow();
  });

  it("summarizes bound operators with display names instead of ids", () => {
    const template = INCIDENT_TEMPLATES.find(
      (entry) => entry.id === "incident/injury-complication",
    );
    expect(template).toBeDefined();

    const incident: PendingIncident = {
      instanceId: "incident-1",
      templateId: "incident/injury-complication",
      triggerFamily: "injury_setback",
      createdAtMinute: 120,
      boundContext: {
        operatorIds: ["operator/vera-santos"],
      },
      choices: template?.choices ?? [],
    };

    const payload = createIncidentInterruptionPayload(incident, template!, {
      "operator/vera-santos": "Vera Santos",
    });

    expect(payload.subjectSummary).toBe("Vera Santos");
  });

  it("carries presenter bindings and room labels for Porter's incident payloads", () => {
    const template = INCIDENT_TEMPLATES.find(
      (entry) => entry.id === "incident/kitchen-standards-slip",
    );
    expect(template).toBeDefined();

    const incident: PendingIncident = {
      instanceId: "incident-porters-1",
      templateId: "incident/kitchen-standards-slip",
      triggerFamily: "room_breakdown",
      createdAtMinute: 120,
      boundContext: {
        operatorIds: [],
        roomId: "room-instance/prep",
      },
      choices: template?.choices ?? [],
    };

    const payload = createIncidentInterruptionPayload(
      incident,
      template!,
      {},
      { "room-instance/prep": "Prep Room" },
    );

    expect(payload.presenterId).toBe("presenter/cook");
    expect(payload.presenterExpression).toBe("serious");
    expect(payload.subjectSummary).toBe("Prep Room");
  });

  it("filters incident selection to opening-safe templates during the mercy window", () => {
    const categories = new Set<string>();

    for (let minute = 600; minute < 680; minute += 1) {
      const context = createIncidentContext();
      const candidate = selectIncidentCandidate(
        context,
        context.runtimeState.incidentState,
        minute,
        100,
      );

      expect(candidate).toBeTruthy();
      const template = INCIDENT_TEMPLATES.find((entry) => entry.id === candidate?.templateId);
      expect(template).toBeDefined();
      categories.add(template!.category);
      expect(OPENING_SAFE_INCIDENT_CATEGORIES).toContain(template!.category);
    }

    expect(categories.size).toBeGreaterThan(1);
  });

  it("keeps Porter's-only incidents out of the bodega and admits them in Porter's", () => {
    const bodegaContext = createIncidentContext();
    const bodegaCandidate = selectIncidentCandidate(
      bodegaContext,
      bodegaContext.runtimeState.incidentState,
      600,
      100,
      {
        allowedCategories: ["kitchen_quality", "bar_drama"],
        ignorePressureThreshold: true,
        ignoreCooldowns: true,
        ignoreRecentFamilyLimit: true,
      },
    );
    expect(bodegaCandidate).toBeNull();

    const portersContext = createIncidentContext({
      buildingId: "building/porters",
      roomTemplateId: "room/prep_room:tier_1",
    });
    portersContext.runtimeState.guidanceState.openingPathState = "completed";
    portersContext.runtimeState.guidanceState.openingTiming = {
      firstRaidReturnCompletedAtMinute: null,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 4,
      lastTrackedContractSiteId: null,
    };
    const portersCandidate = selectIncidentCandidate(
      portersContext,
      portersContext.runtimeState.incidentState,
      600,
      100,
      {
        allowedCategories: ["kitchen_quality"],
        ignorePressureThreshold: true,
        ignoreCooldowns: true,
        ignoreRecentFamilyLimit: true,
      },
    );

    expect(portersCandidate).toBeTruthy();
    expect(portersCandidate?.templateId).toBe("incident/kitchen-standards-slip");
  });

  it("enforces mercy window for the first three contracts by contract count", () => {
    const context = createIncidentContext();

    // Default openingTiming has no securedContractCount → defaults to 0 → mercy active
    expect(isOpeningIncidentMercyWindowActive(context)).toBe(true);

    // Set securedContractCount to 3 → still within mercy window
    context.runtimeState.guidanceState.openingTiming = {
      firstRaidReturnCompletedAtMinute: null,
      firstIncidentSeededAtMinute: null,
      securedContractCount: 3,
      lastTrackedContractSiteId: null,
    };
    expect(isOpeningIncidentMercyWindowActive(context)).toBe(true);

    // Set securedContractCount to 4 → mercy window lifts (guidance still active
    // but beat check falls through to the guidance condition)
    context.runtimeState.guidanceState.openingTiming.securedContractCount = 4;
    // Still active via the guidance condition (openingPathState === "active"
    // and the incident-learned beat has not been completed)
    expect(isOpeningIncidentMercyWindowActive(context)).toBe(true);

    // Complete the opening path → mercy window fully lifts
    context.runtimeState.guidanceState.openingPathState = "completed";
    expect(isOpeningIncidentMercyWindowActive(context)).toBe(false);
  });

  it("emits an event-log entry when an incident is queued", () => {
    const context = createIncidentContext();
    const state = context.runtimeState.incidentState;
    const template = INCIDENT_TEMPLATES.find((entry) => entry.id === "incident/personnel-friction");

    expect(template).toBeDefined();

    const queued = queueIncident(
      context,
      state,
      {
        instanceId: "incident-1",
        templateId: template!.id,
        triggerFamily: template!.triggerFamily,
        createdAtMinute: 600,
        boundContext: {
          operatorIds: ["operator/a", "operator/b"],
        },
        choices: template!.choices,
      },
      "incident-system",
    );

    expect(queued).toBe(true);
    expect(context.runtimeState.pendingCueIds).toContain("event.incident.open");
    expect(context.runtimeState.pendingEvents).toEqual([
      {
        kind: "event_change",
        message: "Incident: Personnel Friction Report (Rose Vega, Milo Hart) requires attention.",
        timestamp: "day-1 10:00",
        accent: "ember",
      },
    ]);
  });
});
