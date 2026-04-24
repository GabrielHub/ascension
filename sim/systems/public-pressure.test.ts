import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, it, expect } from "vitest";
import { templateRegistry } from "content/templates";
import { readyToWireRivals } from "content/templates/rivals";
import { buildCombatPackageRegistry } from "content/templates/combat-packages";
import { createDefaultPublicPressureState } from "../components/public-pressure";
import {
  BuildingAuthority,
  GuildState,
  OperatorIdentity,
  RoomInstance,
  WorldTimeState,
} from "../components";
import {
  applyPublicPressureOutcome,
  advancePublicPressureSystem,
  computePublicContractModifiers,
  emitPublicPressureEvents,
  SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID,
  SKYSCRAPER_WAR_ROOM_TEMPLATE_ID,
  tickPublicPressureDecay,
} from "./public-pressure";
import {
  advanceCurrentRivalMove,
  advanceRivalPressureSystem,
  computeCompetitiveScore,
  resolveRivalMoveChoice,
  seedRivalPressure,
} from "./rival-pressure";
import type { RivalMovePayload } from "./interruptions";
import type { SimSystemContext } from "./types";

function createContext(): SimSystemContext {
  const world = createWorld();
  const guild = addEntity(world);
  const time = addEntity(world);
  const building = addEntity(world);
  addComponent(world, time, WorldTimeState);
  GuildState.reputation[guild] = 40;
  WorldTimeState.day[time] = 1;
  WorldTimeState.minuteOfDay[time] = 600;
  BuildingAuthority.activeBuildingTier[building] = 3;

  return {
    world,
    registry: templateRegistry,
    singletonEntities: { guild, time, building },
    runtimeState: {
      roomEntities: [],
      operatorEntities: [],
      raidOpportunityEntities: [],
      visitorEntities: [],
      eventEntities: [],
      dispositionEntities: [],
      notableTieEntities: [],
      recurringTeamEntities: [],
      roomCultureEntities: [],
      inventoryEntities: [],
      equipmentEntities: [],
      nextRoomSequence: 1,
      nextOperatorSequence: 1,
      nextOpportunitySequence: 1,
      nextVisitorSequence: 1,
      nextRaidSequence: 1,
      nextEventSequence: 1,
      nextTeamSequence: 1,
      pendingCueIds: [],
      pendingEvents: [],
      raidPresentation: { contractSiteId: null, teams: [], enemies: [], features: [] },
      activeEncounter: null,
      interruptionQueue: { active: null, queue: [], nextInstanceId: 1 },
      incidentState: {
        pendingIncident: null,
        history: [],
        cooldowns: {},
        nextInstanceId: 1,
        lastEvaluationMinute: 0,
        pressureModifier: 0,
      },
      guidanceState: {
        seenBeatIds: [],
        completedBeatIds: [],
        dismissedBeatIds: [],
        activeBeatId: null,
        activeBeatView: null,
        queuedBeatIds: [],
        lastEvaluationMinute: 0,
        openingPathState: "completed",
        anchorResolutionFailures: [],
        activeBeatProgressBaseline: null,
        interactionCounts: { staffingActions: 0, upgradesPurchased: 0 },
        lastPurchasedUpgradeId: null,
      },
      combatPackageRegistry: buildCombatPackageRegistry([]),
      worldTimeFrozen: false,
      deferIncidentPresentation: false,
      publicPressure: createDefaultPublicPressureState(),
      rivalPressure: { active: false, currentPrimaryRivalId: null, rivals: [] },
      presenterUnlocks: [],
    },
  };
}

function addOperationalRoomTemplate(context: SimSystemContext, templateId: string): void {
  const entity = addEntity(context.world);
  addComponent(context.world, entity, RoomInstance);
  RoomInstance.id[entity] =
    `room-instance/${templateId.replace("room/", "").replace(":tier_1", "")}`;
  RoomInstance.templateIndex[entity] = context.registry.roomIndexById.get(templateId) ?? 0;
  RoomInstance.isOperational[entity] = 1;
  context.runtimeState.roomEntities.push(entity);
}

function addOperationalWarRoom(context: SimSystemContext): void {
  addOperationalRoomTemplate(context, SKYSCRAPER_WAR_ROOM_TEMPLATE_ID);
}

function addOperator(context: SimSystemContext, rank: string): void {
  const entity = addEntity(context.world);
  OperatorIdentity.id[entity] = `operator/${context.runtimeState.operatorEntities.length + 1}`;
  OperatorIdentity.name[entity] = "Test Operator";
  OperatorIdentity.lifecycleStatus[entity] = "active";
  OperatorIdentity.rank[entity] = rank;
  context.runtimeState.operatorEntities.push(entity);
}

describe("public-pressure", () => {
  it("applies contract outcome writeback to public pressure and relationship state", () => {
    const state = createDefaultPublicPressureState();
    const events = applyPublicPressureOutcome(
      state,
      "district/lower-east-side",
      "faction/city-licensing",
      "contract_lost",
      100,
    );

    expect(state.score).toBeGreaterThan(0);
    expect(state.dominantSource).toBe("regulator");
    expect(state.districts["district/lower-east-side"].standing).toBeLessThan(50);
    expect(state.districts["district/lower-east-side"].heat).toBeGreaterThan(0);
    expect(events).toContain("Lower East Side standing eroded");
  });

  it("computes contract modifiers from district heat, containment, relationships, and score", () => {
    const state = createDefaultPublicPressureState();
    state.score = 60;
    state.districts["district/lower-east-side"].heat = 50;
    state.districts["district/lower-east-side"].containment = 55;
    state.factionRelationships["faction/city-licensing"].standing = -30;

    const mods = computePublicContractModifiers(
      state,
      "district/lower-east-side",
      "faction/city-licensing",
    );

    expect(mods.riskMultiplier).toBeGreaterThan(1);
    expect(mods.rewardMultiplier).toBeLessThan(1.1);
    expect(mods.pressureTags).toContain("pressure:public-exposure");
  });

  it("compliance office decay cools global score faster", () => {
    const baseline = createDefaultPublicPressureState();
    baseline.score = 50;
    tickPublicPressureDecay(baseline, 60, 1000);

    const withCompliance = createDefaultPublicPressureState();
    withCompliance.score = 50;
    tickPublicPressureDecay(withCompliance, 60, 1000, { complianceOfficeActive: true });

    expect(withCompliance.score).toBeLessThan(baseline.score);
  });

  it("decays public pressure proportionally for sub-minute ticks", () => {
    const oncePerMinute = createDefaultPublicPressureState();
    oncePerMinute.score = 60;
    tickPublicPressureDecay(oncePerMinute, 1, 1000);

    const frameTick = createContext();
    frameTick.runtimeState.publicPressure!.score = 60;
    for (let i = 0; i < 60; i += 1) {
      advancePublicPressureSystem(frameTick, 1000);
    }

    expect(frameTick.runtimeState.publicPressure!.score).toBeCloseTo(oncePerMinute.score);
  });

  it("emits public-pressure runtime events", () => {
    const context = createContext();
    emitPublicPressureEvents(context, ["Public pressure exposed"]);
    expect(context.runtimeState.pendingEvents[0]).toEqual(
      expect.objectContaining({
        kind: "public_pressure",
        message: "Public pressure exposed",
        accent: "ember",
      }),
    );
  });
});

describe("rival-pressure", () => {
  it("seeds every runtime-ready rival and assigns exactly one primary", () => {
    const context = createContext();
    addOperator(context, "c");
    addOperator(context, "d");

    const introduced = seedRivalPressure(context, context.runtimeState.rivalPressure!, 500);

    expect(introduced).toBe(true);
    expect(context.runtimeState.rivalPressure!.rivals.map((rival) => rival.rivalId)).toEqual(
      readyToWireRivals.map((rival) => rival.id),
    );
    expect(
      context.runtimeState.rivalPressure!.rivals.filter((rival) => rival.isPrimary),
    ).toHaveLength(1);
    expect(computeCompetitiveScore(context)).toBeGreaterThan(0);
  });

  it("keeps a preserved primary rival in the peer strength band", () => {
    const context = createContext();
    addOperator(context, "c");
    addOperator(context, "d");

    const preservedPrimary = readyToWireRivals[readyToWireRivals.length - 1];
    context.runtimeState.rivalPressure!.currentPrimaryRivalId = preservedPrimary.id;

    seedRivalPressure(context, context.runtimeState.rivalPressure!, 500);

    const primary = context.runtimeState.rivalPressure!.rivals.find(
      (rival) => rival.rivalId === preservedPrimary.id,
    );
    expect(primary).toEqual(
      expect.objectContaining({
        isPrimary: true,
        strengthBand: "peer",
      }),
    );
  });

  it("counts Executive Office support in the hidden competitive score", () => {
    const baseline = createContext();
    addOperator(baseline, "c");

    const supported = createContext();
    addOperator(supported, "c");
    addOperationalRoomTemplate(supported, SKYSCRAPER_EXECUTIVE_OFFICE_TEMPLATE_ID);

    expect(computeCompetitiveScore(supported)).toBe(computeCompetitiveScore(baseline) + 10);
  });

  it("advances repeatable named-rival moves after the War Room seed", () => {
    const context = createContext();
    addOperationalWarRoom(context);
    addOperator(context, "c");
    addOperator(context, "d");

    advanceRivalPressureSystem(context, 1000);
    const state = context.runtimeState.rivalPressure!;
    const primary = state.rivals.find((rival) => rival.isPrimary);
    expect(primary).toBeDefined();

    context.runtimeState.pendingEvents = [];
    const moved = advanceCurrentRivalMove(context, state, 2400);

    expect(moved).toBe(true);
    expect(primary!.lastMoveTick).toBe(2400);
    expect(primary!.intensity).toBeGreaterThanOrEqual(32);
    expect(context.runtimeState.publicPressure!.score).toBeGreaterThan(0);
    expect(context.runtimeState.pendingEvents[0]).toEqual(
      expect.objectContaining({
        kind: "rival_pressure",
        message: expect.stringContaining(
          readyToWireRivals.find((rival) => rival.id === primary!.rivalId)!.shortDisplayName,
        ),
      }),
    );
  });

  it("selects rival moves from the active rival's authored packet", () => {
    const context = createContext();
    addOperationalWarRoom(context);
    addOperator(context, "c");
    seedRivalPressure(context, context.runtimeState.rivalPressure!, 0);

    const state = context.runtimeState.rivalPressure!;
    const primary = state.rivals.find((rival) => rival.isPrimary)!;
    const template = readyToWireRivals.find((rival) => rival.id === primary.rivalId)!;
    const authoredMoveIds = new Set(template.moves.map((move) => move.id));

    const longCooldown = Math.max(...template.moves.map((move) => move.cooldownMinutes));
    advanceCurrentRivalMove(context, state, longCooldown + 1);

    expect(primary.recentMoveIds).toHaveLength(1);
    expect(authoredMoveIds.has(primary.recentMoveIds[0])).toBe(true);
  });

  it("does not repeat the most recent rival move when another option is cooldown-ready", () => {
    const context = createContext();
    addOperationalWarRoom(context);
    addOperator(context, "c");
    seedRivalPressure(context, context.runtimeState.rivalPressure!, 0);

    const state = context.runtimeState.rivalPressure!;
    const primary = state.rivals.find((rival) => rival.isPrimary)!;
    const template = readyToWireRivals.find((rival) => rival.id === primary.rivalId)!;

    const firstTick = Math.max(...template.moves.map((move) => move.cooldownMinutes)) + 1;
    advanceCurrentRivalMove(context, state, firstTick);
    const firstMoveId = primary.recentMoveIds[0];
    expect(firstMoveId).toBeDefined();

    const secondTick =
      firstTick + Math.max(...template.moves.map((move) => move.cooldownMinutes)) + 1;
    advanceCurrentRivalMove(context, state, secondTick);
    const secondMoveId = primary.recentMoveIds[primary.recentMoveIds.length - 1];

    expect(secondMoveId).not.toBe(firstMoveId);
  });

  it("lets longer-cooldown rival moves become eligible during continuous simulation", () => {
    const context = createContext();
    addOperationalWarRoom(context);
    addOperator(context, "c");
    seedRivalPressure(context, context.runtimeState.rivalPressure!, 0);

    const state = context.runtimeState.rivalPressure!;
    const primary = state.rivals.find((rival) => rival.isPrimary)!;
    const template = readyToWireRivals.find((rival) => rival.id === primary.rivalId)!;
    const longestCooldownMove = template.moves.reduce((longest, move) =>
      move.cooldownMinutes > longest.cooldownMinutes ? move : longest,
    );
    const firedMoveIds = new Set<string>();

    for (let minute = 1; minute <= longestCooldownMove.cooldownMinutes * 3; minute += 1) {
      if (advanceCurrentRivalMove(context, state, minute)) {
        firedMoveIds.add(primary.recentMoveIds[primary.recentMoveIds.length - 1]);
      }
    }

    expect(firedMoveIds.has(longestCooldownMove.id)).toBe(true);
  });

  it("enqueues a blocking persistent rival move interruption", () => {
    const context = createContext();
    addOperationalWarRoom(context);
    addOperator(context, "c");
    advanceRivalPressureSystem(context, 1000);
    const state = context.runtimeState.rivalPressure!;

    advanceCurrentRivalMove(context, state, 2400);

    const active = context.runtimeState.interruptionQueue!.active;
    expect(active).not.toBeNull();
    expect(active!.type).toBe("rival_move");
    expect(active!.dismissible).toBe(false);
    expect(active!.persistence).toBe("persistent");
    expect(active!.blockingMode).toBe("blocking");
    expect((active!.payload as RivalMovePayload).choices.length).toBeGreaterThanOrEqual(2);
  });

  it("applies rival move choice effects through the shared consequence handlers", () => {
    const context = createContext();
    GuildState.treasury[context.singletonEntities.guild] = 1000;
    GuildState.reputation[context.singletonEntities.guild] = 50;

    const payload: RivalMovePayload = {
      kind: "rival_move",
      rivalId: "rival/test",
      moveTemplateId: "rival-move/test/one",
      shortDisplayName: "Test",
      guildName: "Test Guild",
      leaderName: "Test Leader",
      leaderPortrait: "/data/rivals/test/leader-neutral.png",
      insignia: "/data/rivals/test/insignia.png",
      pressureLane: "hybrid",
      family: "contract_challenge",
      message: "msg",
      briefing: "briefing",
      intensity: 50,
      aggression: 30,
      intensityDelta: 2,
      publicPressureDelta: 0,
      trend: "rising",
      warRoomMitigated: false,
      dayNumber: 1,
      choices: [
        {
          choiceId: "accept",
          label: "Accept",
          description: "desc",
          consequenceSummary: "summary",
          effects: [
            { kind: "treasury_delta", targetRef: "guild", value: -120 },
            { kind: "reputation_delta", targetRef: "guild", value: 2 },
          ],
        },
      ],
    };

    const applied = resolveRivalMoveChoice(context, payload, "accept");
    expect(applied).toBe(true);
    expect(GuildState.treasury[context.singletonEntities.guild]).toBe(880);
    expect(GuildState.reputation[context.singletonEntities.guild]).toBe(52);
  });
});
