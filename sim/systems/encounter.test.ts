import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import { siteConceptById } from "content/templates/site-concepts";
import { createBootstrapSimulation } from "sim";
import {
  COMBAT_PACKAGES,
  buildCombatPackageRegistry,
  validateCombatPackages,
} from "content/templates/combat-packages";
import {
  createBossEncounter,
  advanceEncounterTurn,
  advanceEncounterRound,
  startEncounter,
  useIntervention,
  retreatFromEncounter,
  buildEncounterView,
  snapshotEncounter,
  restoreEncounter,
} from "./encounter";
import {
  createInterruptionQueueState,
  enqueueInterruption,
  resolveActiveInterruption,
  dismissActiveInterruption,
  hasBlockingInterruption,
  snapshotInterruptionQueue,
  restoreInterruptionQueue,
} from "./interruptions";
import { INCIDENT_TEMPLATES } from "./incidents";
import type { ActorCombatState } from "./encounter-types";
import { getBossEncounterDefinition } from "./encounter-types";
import { deferredSimulationSystemsReady } from "./index";
import { OperatorIdentity } from "../components";

// ── Combat package validation ────────────────────────────────────────────

describe("combat package validation", () => {
  it("validates all authored combat packages without issues", () => {
    const registry = buildCombatPackageRegistry(COMBAT_PACKAGES);
    const issues = validateCombatPackages(registry);
    expect(issues).toEqual([]);
  });

  it("resolves authored packages by id", () => {
    const registry = buildCombatPackageRegistry(COMBAT_PACKAGES);
    expect(registry.packageById.get("package/field-lead/kinetic/standard")).toBeDefined();
    expect(registry.packageById.get("package/scout/void/standard")).toBeDefined();
    expect(registry.packageById.get("package/medic/vital/standard")).toBeDefined();
  });

  it("returns undefined for unknown package ids", () => {
    const registry = buildCombatPackageRegistry(COMBAT_PACKAGES);
    expect(registry.packageById.get("package/nonexistent")).toBeUndefined();
  });
});

// ── Boss encounter definitions ───────────────────────────────────────────

describe("boss encounter definitions", () => {
  it("resolves authored boss encounters from mission combat profiles", () => {
    const authoredBossEncounters = templateRegistry.missions.filter(
      (mission) => mission.combatProfile?.boss?.encounter,
    );

    expect(authoredBossEncounters.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves boss definitions from the mission registry instead of a hardcoded table", () => {
    const broodMother = getBossEncounterDefinition(
      templateRegistry,
      "mission/clearance",
      "boss/tunneler-brood-mother",
    );

    expect(broodMother).toBeDefined();
    expect(broodMother!.name).toBe("Tunneler Brood-Mother");
    expect(broodMother!.phases.length).toBe(2);
    expect(broodMother!.summonDefinitions.length).toBeGreaterThan(0);
  });
});

// ── Encounter simulation ─────────────────────────────────────────────────

describe("encounter simulation", () => {
  function createTestEncounter(
    missionId = "mission/clearance",
    bossId = "boss/tunneler-brood-mother",
  ) {
    const simulation = createBootstrapSimulation(templateRegistry);
    const context = {
      world: {} as ReturnType<typeof import("bitecs").createWorld>,
      registry: templateRegistry,
      singletonEntities: simulation.singletonEntities,
      runtimeState: simulation.runtimeState,
    };

    const operatorIds = simulation
      .getWorldSnapshot()
      .operators!.filter((op) => op.lifecycle.status === "active")
      .slice(0, 3)
      .map((op) => op.id);

    const encounter = createBossEncounter(
      context,
      "test-raid-1",
      "test-site-1",
      missionId,
      "test-team-1",
      operatorIds,
      bossId,
    );

    return { context, encounter, operatorIds };
  }

  function getActors(encounter: NonNullable<ReturnType<typeof createTestEncounter>["encounter"]>) {
    const actors = Object.values(encounter.actors);
    return {
      actors,
      allies: actors.filter((actor) => actor.side === "ally"),
      enemies: actors.filter((actor) => actor.side === "enemy"),
      boss: actors.find((actor) => actor.kind === "boss")!,
    };
  }

  function createSummonActor(overrides: Partial<ActorCombatState> = {}): ActorCombatState {
    return {
      actorId: "actor:summon:test",
      side: "enemy",
      kind: "summon",
      label: "Test Summon",
      sourceEntityId: "summon/test",
      currentHp: 20,
      maxHp: 20,
      shield: 0,
      initiative: 5,
      baseAttack: 8,
      baseDefense: 4,
      baseSpeed: 5,
      baseThreat: 20,
      condition: "alive",
      activeStatuses: [],
      temporaryStatModifiers: {},
      actionHistory: [],
      encounterActions: [
        {
          id: "action/test-claw",
          name: "Test Claw",
          weight: 1,
          cooldown: 0,
          targeting: "enemy_single",
          effects: [{ kind: "damage", basePower: 6, scalingStat: "strength", scalingFactor: 1 }],
        },
      ],
      ...overrides,
    };
  }

  it("creates a boss encounter with operator and boss actors", () => {
    const { encounter, operatorIds } = createTestEncounter();
    expect(encounter).not.toBeNull();
    expect(encounter!.status).toBe("pending");
    expect(encounter!.participatingOperatorIds).toEqual(operatorIds);

    const actors = Object.values(encounter!.actors);
    const allies = actors.filter((a) => a.side === "ally");
    const enemies = actors.filter((a) => a.side === "enemy");
    expect(allies.length).toBe(operatorIds.length);
    expect(enemies.length).toBe(1); // Boss only in phase 1
    expect(enemies[0].kind).toBe("boss");
  });

  it("starts an encounter and sets status to active", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);
    expect(encounter!.status).toBe("active");
    expect(encounter!.currentRound).toBe(1);
  });

  it("starts encounters in autoplay mode and advances one visible turn at a time", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    expect(encounter!.autoplayEnabled).toBe(true);
    expect(encounter!.pendingRoundStart).toBe(true);

    advanceEncounterTurn(encounter!);
    expect(encounter!.encounterLog.at(-1)?.actionKind).toBe("round_start");
    expect(encounter!.initiativeQueue.length).toBeGreaterThan(0);

    const queueLengthBeforeAction = encounter!.initiativeQueue.length;
    const logLengthBeforeAction = encounter!.encounterLog.length;
    advanceEncounterTurn(encounter!);

    expect(encounter!.encounterLog.length).toBeGreaterThan(logLengthBeforeAction);
    expect(encounter!.initiativeQueue.length).toBeLessThan(queueLengthBeforeAction);
    expect(
      encounter!.encounterLog.some((entry) =>
        ["basic_stage", "ultimate", "boss_action"].includes(entry.actionKind),
      ),
    ).toBe(true);
  });

  it("advances encounter rounds deterministically", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const logBefore = encounter!.encounterLog.length;
    advanceEncounterRound(encounter!);

    expect(encounter!.encounterLog.length).toBeGreaterThan(logBefore);
    expect(encounter!.currentRound).toBeGreaterThanOrEqual(1);
    expect(["active", "victory", "wipe", "forced_abort"]).toContain(encounter!.status);
  });

  it("restricts operator ultimates in round 1 to AI-hint-triggered emergencies", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    advanceEncounterRound(encounter!);

    const roundOneUltimates = encounter!.encounterLog.filter(
      (entry) => entry.round === 1 && entry.actionKind === "ultimate",
    );
    const roundOneOperatorActions = encounter!.encounterLog.filter(
      (entry) => entry.round === 1 && ["basic_stage", "ultimate"].includes(entry.actionKind),
    );
    // Round 1 ultimates are restricted: at most one may fire when an
    // AI-hint condition (e.g. low-HP ally after boss damage) is met.
    // Most operators should use regular attacks or skills.
    expect(roundOneUltimates.length).toBeLessThan(roundOneOperatorActions.length);
  });

  it("produces deterministic results for the same seed", () => {
    const results1 = runEncounterToCompletion();
    const results2 = runEncounterToCompletion();

    expect(results1.finalRound).toBe(results2.finalRound);
    expect(results1.finalStatus).toBe(results2.finalStatus);
  });

  it("terminates on wipe when all allies are defeated", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    // Force all allies to 0 HP
    for (const actor of Object.values(encounter!.actors)) {
      if (actor.side === "ally") {
        actor.currentHp = 0;
        actor.condition = "incapacitated";
      }
    }

    advanceEncounterRound(encounter!);
    expect(encounter!.status).toBe("wipe");
  });

  it("terminates on victory when boss is defeated", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    // Force boss to 0 HP
    for (const actor of Object.values(encounter!.actors)) {
      if (actor.kind === "boss") {
        actor.currentHp = 0;
        actor.condition = "incapacitated";
      }
    }

    advanceEncounterRound(encounter!);
    expect(encounter!.status).toBe("victory");
  });

  it("supports retreat", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);
    retreatFromEncounter(encounter!);
    expect(encounter!.status).toBe("retreat");
  });

  it("starts the boss encounter from interruption resolution when the player commits", async () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.runtimeState.guidanceState.openingPathState = "completed";
    simulation.runtimeState.guidanceState.activeBeatId = null;
    simulation.runtimeState.guidanceState.activeBeatView = null;
    simulation.runtimeState.guidanceState.queuedBeatIds = [];
    simulation.runtimeState.interruptionQueue.active = null;
    simulation.runtimeState.interruptionQueue.queue = [];
    await deferredSimulationSystemsReady;

    simulation.dispatch({ type: "sim/dev-trigger-boss-commitment" });
    const activeInterruption = simulation.getPhase1View().activeInterruption;

    expect(activeInterruption?.payload.kind).toBe("raid_boss_commitment");

    simulation.dispatch({
      type: "sim/interruption-resolve",
      instanceId: activeInterruption?.instanceId ?? "missing",
      choiceId: "commit",
    });

    expect(simulation.runtimeState.interruptionQueue.active).toBeNull();
    expect(simulation.runtimeState.activeEncounter).not.toBeNull();
    expect(simulation.runtimeState.activeEncounter?.status).toBe("active");
    expect(simulation.runtimeState.worldTimeFrozen).toBe(true);
  });

  it("keeps resolved encounters visible until they are dismissed", async () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.runtimeState.guidanceState.openingPathState = "completed";
    simulation.runtimeState.guidanceState.activeBeatId = null;
    simulation.runtimeState.guidanceState.activeBeatView = null;
    simulation.runtimeState.guidanceState.queuedBeatIds = [];
    simulation.runtimeState.interruptionQueue.active = null;
    simulation.runtimeState.interruptionQueue.queue = [];
    await deferredSimulationSystemsReady;

    simulation.dispatch({ type: "sim/dev-trigger-boss-commitment" });
    const activeInterruption = simulation.getPhase1View().activeInterruption;

    simulation.dispatch({
      type: "sim/interruption-resolve",
      instanceId: activeInterruption?.instanceId ?? "missing",
      choiceId: "commit",
    });

    const encounter = simulation.runtimeState.activeEncounter;
    expect(encounter).not.toBeNull();
    if (!encounter) {
      return;
    }

    const boss = Object.values(encounter.actors).find((actor) => actor.kind === "boss");
    expect(boss).toBeDefined();
    if (!boss) {
      return;
    }

    boss.currentHp = 0;
    boss.condition = "incapacitated";
    simulation.dispatch({ type: "sim/encounter-step" });

    expect(simulation.runtimeState.activeEncounter?.status).toBe("victory");

    simulation.dispatch({ type: "sim/encounter-dismiss" });
    expect(simulation.runtimeState.activeEncounter).toBeNull();
  });

  it("restores a focused guidance freeze after the encounter resolves", async () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    simulation.runtimeState.guidanceState.openingPathState = "active";
    simulation.runtimeState.guidanceState.activeBeatId = "guidance/opening/staffing-and-rooms";
    simulation.runtimeState.guidanceState.activeBeatView = {
      beatId: "guidance/opening/staffing-and-rooms",
      track: "opening",
      deliveryMode: "focused",
      target: "ui/hq/category/rooms",
      fallbackIntent: "hq/open-rooms",
      copy: {
        title: "Staffing and Rooms",
        body: "Make one Rooms improvement.",
        ctaLabel: "Make one Rooms change",
      },
      milestoneOrder: 10,
      totalMilestones: 13,
      completionKind: "staffing_action_taken",
      pauseWorld: true,
      allowSkip: false,
    };
    simulation.runtimeState.worldTimeFrozen = true;
    simulation.runtimeState.interruptionQueue.active = null;
    simulation.runtimeState.interruptionQueue.queue = [];
    await deferredSimulationSystemsReady;

    simulation.dispatch({ type: "sim/dev-trigger-boss-commitment" });
    const activeInterruption = simulation.getPhase1View().activeInterruption;

    simulation.dispatch({
      type: "sim/interruption-resolve",
      instanceId: activeInterruption?.instanceId ?? "missing",
      choiceId: "commit",
    });

    const encounter = simulation.runtimeState.activeEncounter;
    expect(encounter).not.toBeNull();
    if (!encounter) {
      return;
    }

    const boss = Object.values(encounter.actors).find((actor) => actor.kind === "boss");
    expect(boss).toBeDefined();
    if (!boss) {
      return;
    }

    boss.currentHp = 0;
    boss.condition = "incapacitated";
    simulation.dispatch({ type: "sim/encounter-step" });

    expect(simulation.runtimeState.activeEncounter?.status).toBe("victory");
    expect(simulation.runtimeState.guidanceState.activeBeatId).toBe(
      "guidance/opening/staffing-and-rooms",
    );
    expect(simulation.runtimeState.worldTimeFrozen).toBe(true);
  });

  it("supports managerial interventions", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const before = encounter!.interventions.find((i) => i.interventionId === "intel_reveal")!;
    expect(before.usesRemaining).toBe(2);

    const result = useIntervention(encounter!, "intel_reveal");
    expect(result).toBe(true);

    const after = encounter!.interventions.find((i) => i.interventionId === "intel_reveal")!;
    expect(after.usesRemaining).toBe(1);
    const { boss } = getActors(encounter!);
    expect(boss.activeStatuses.filter((status) => status.statusId === "marked")).toHaveLength(1);
  });

  it("scales operator payloads from their authored raw stat instead of derived attack buckets", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const medic = Object.values(encounter!.actors).find(
      (actor) => actor.kind === "operator" && actor.roleTag === "role:medic",
    )!;
    const boss = Object.values(encounter!.actors).find((actor) => actor.kind === "boss")!;

    medic.baseAttack = 0;
    medic.baseSpeed = 0;
    medic.baseStats = {
      strength: 0,
      speed: 0,
      endurance: 0,
      resilience: 0,
      perception: 0,
      intelligence: 40,
    };
    medic.initiative = 999;
    boss.baseDefense = 0;

    for (const actor of Object.values(encounter!.actors)) {
      if (actor.actorId !== medic.actorId) {
        actor.initiative = 1;
      }
    }

    advanceEncounterTurn(encounter!);
    advanceEncounterTurn(encounter!);

    const medicAction = [...encounter!.encounterLog]
      .reverse()
      .find((entry) => entry.actorId === medic.actorId && entry.actionKind === "basic_stage");
    const damageEffect = medicAction?.effects.find((effect) => effect.effectKind === "damage");

    expect(medicAction?.abilityId).toBe("package/medic/vital/standard/stage1");
    expect(damageEffect?.value).toBe(51);
  });

  it("applies authored operator passives when an encounter is created", () => {
    const simulation = createBootstrapSimulation(templateRegistry);
    const operatorId = simulation
      .getWorldSnapshot()
      .operators!.find((operator) => operator.identity.roleTag === "role:field_lead")!.id;
    const operatorEntity = simulation.runtimeState.operatorEntities.find(
      (entity) => OperatorIdentity.id[entity] === operatorId,
    )!;
    OperatorIdentity.combatPackageId[operatorEntity] = "package/field-lead/kinetic/senior";

    const context = {
      world: {} as ReturnType<typeof import("bitecs").createWorld>,
      registry: templateRegistry,
      singletonEntities: simulation.singletonEntities,
      runtimeState: simulation.runtimeState,
    };
    const operatorIds = simulation
      .getWorldSnapshot()
      .operators!.filter((operator) => operator.lifecycle.status === "active")
      .slice(0, 3)
      .map((operator) => operator.id);

    const encounter = createBossEncounter(
      context,
      "test-raid-passive",
      "test-site-passive",
      "mission/clearance",
      "test-team-passive",
      operatorIds,
      "boss/tunneler-brood-mother",
    );

    expect(encounter).not.toBeNull();
    const actor = Object.values(encounter!.actors).find(
      (entry) => entry.operatorId === operatorId,
    )!;
    expect(actor.temporaryStatModifiers.resilience).toBe(2);
    expect(
      encounter!.encounterLog.some(
        (entry) =>
          entry.actorId === actor.actorId &&
          entry.actionKind === "passive_trigger" &&
          entry.abilityId === "package/field-lead/kinetic/senior/passive",
      ),
    ).toBe(true);
  });

  it("keeps mixed-target medic payload riders on allies instead of healing the enemy", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const medic = Object.values(encounter!.actors).find(
      (actor) => actor.kind === "operator" && actor.roleTag === "role:medic",
    )!;
    const ally = Object.values(encounter!.actors).find(
      (actor) => actor.kind === "operator" && actor.roleTag === "role:scout",
    )!;
    const boss = Object.values(encounter!.actors).find((actor) => actor.kind === "boss")!;

    medic.initiative = 999;
    boss.baseDefense = 0;
    boss.currentHp = Math.max(1, boss.maxHp - 5);

    for (const actor of Object.values(encounter!.actors)) {
      if (actor.actorId !== medic.actorId) {
        actor.initiative = 1;
      }
      if (actor.kind === "operator" && actor.actorId !== medic.actorId) {
        actor.currentHp = actor.maxHp;
      }
    }
    ally.currentHp = Math.max(1, ally.maxHp - 10);

    advanceEncounterTurn(encounter!);
    advanceEncounterTurn(encounter!);

    const medicAction = [...encounter!.encounterLog]
      .reverse()
      .find((entry) => entry.actorId === medic.actorId && entry.actionKind === "basic_stage");

    expect(medicAction?.effects.find((effect) => effect.effectKind === "damage")?.targetId).toBe(
      boss.actorId,
    );
    expect(medicAction?.effects.find((effect) => effect.effectKind === "heal")?.targetId).toBe(
      ally.actorId,
    );
    expect(ally.currentHp).toBeGreaterThan(ally.maxHp - 10);
    expect(boss.currentHp).toBeLessThan(boss.maxHp - 5);
  });

  it("turns ally_damage_bonus into a real team damage window", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const fieldLead = Object.values(encounter!.actors).find(
      (actor) => actor.kind === "operator" && actor.roleTag === "role:field_lead",
    )!;
    const scout = Object.values(encounter!.actors).find(
      (actor) => actor.kind === "operator" && actor.roleTag === "role:scout",
    )!;
    const boss = Object.values(encounter!.actors).find((actor) => actor.kind === "boss")!;

    fieldLead.combatPackageId = "package/field-lead/kinetic/senior";
    fieldLead.blocks = 3;
    fieldLead.initiative = 999;
    scout.initiative = 998;
    scout.baseAttack = 0;
    scout.baseSpeed = 0;
    scout.baseStats = {
      strength: 0,
      speed: 40,
      endurance: 0,
      resilience: 0,
      perception: 0,
      intelligence: 0,
    };
    boss.baseDefense = 0;

    for (const actor of Object.values(encounter!.actors)) {
      if (actor.actorId !== fieldLead.actorId && actor.actorId !== scout.actorId) {
        actor.initiative = 1;
      }
    }

    advanceEncounterTurn(encounter!);
    advanceEncounterTurn(encounter!);
    advanceEncounterTurn(encounter!);

    expect(
      Object.values(encounter!.actors)
        .filter((actor) => actor.side === "ally")
        .every((actor) =>
          actor.activeStatuses.some(
            (status) => status.statusId === "empowered" && status.potency === 25,
          ),
        ),
    ).toBe(true);

    const scoutAction = [...encounter!.encounterLog]
      .reverse()
      .find((entry) => entry.actorId === scout.actorId && entry.actionKind === "basic_stage");
    const scoutDamage = scoutAction?.effects.find((effect) => effect.effectKind === "damage");

    expect(scoutDamage?.value).toBe(66);
  });

  it("builds an encounter view for UI consumption", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);
    advanceEncounterRound(encounter!);

    const view = buildEncounterView(encounter!);
    expect(view.encounterId).toBe(encounter!.encounterId);
    expect(view.status).toBe(encounter!.status);
    expect(view.actors.length).toBeGreaterThan(0);
    expect(view.interventions.length).toBeGreaterThan(0);
    expect(view.recentLog.length).toBeGreaterThan(0);
  });

  it("uses authored phase thresholds in the encounter view", () => {
    const { encounter } = createTestEncounter();
    const view = buildEncounterView(encounter!);
    const definition = getBossEncounterDefinition(
      templateRegistry,
      "mission/clearance",
      "boss/tunneler-brood-mother",
    )!;

    expect(view.phaseThresholdFractions).toEqual(
      definition.phases.map((phase) => phase.hpThresholdFraction),
    );
  });

  it("targets only the lowest-hp ally with emergency stabilization", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const { allies } = getActors(encounter!);
    allies[0].currentHp = 10;
    allies[1].currentHp = 20;
    allies[2].currentHp = allies[2].maxHp;

    const result = useIntervention(encounter!, "emergency_stabilize");
    expect(result).toBe(true);
    expect(allies[0].currentHp).toBeGreaterThan(10);
    expect(allies[1].currentHp).toBe(20);
    expect(allies[2].currentHp).toBe(allies[2].maxHp);
  });

  it("ends in victory as soon as the boss dies even if summons are still alive", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const { boss } = getActors(encounter!);
    encounter!.actors["actor:summon:test"] = createSummonActor();
    boss.currentHp = 0;
    boss.condition = "incapacitated";

    advanceEncounterRound(encounter!);
    expect(encounter!.status).toBe("victory");
  });

  it("lets summoned enemies take turns after a phase transition", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const { allies, boss } = getActors(encounter!);
    for (const ally of allies) {
      ally.baseAttack = 0;
      ally.baseSpeed = 0;
      ally.baseStats = {
        strength: 0,
        speed: 0,
        endurance: 0,
        resilience: 0,
        perception: 0,
        intelligence: 0,
      };
    }

    boss.currentHp = 55;
    advanceEncounterRound(encounter!);

    const summonIds = Object.values(encounter!.actors)
      .filter((actor) => actor.kind === "summon")
      .map((actor) => actor.actorId);
    expect(summonIds.length).toBeGreaterThan(0);

    advanceEncounterRound(encounter!);

    expect(
      encounter!.encounterLog.some(
        (entry) => summonIds.includes(entry.actorId) && entry.actionKind === "boss_action",
      ),
    ).toBe(true);
  });

  it("saves and restores encounter state exactly", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);
    advanceEncounterRound(encounter!);
    advanceEncounterRound(encounter!);
    encounter!.status = "paused";
    encounter!.autoplayEnabled = false;

    const snapshot = snapshotEncounter(encounter!);
    const restored = restoreEncounter(snapshot);

    expect(restored.encounterId).toBe(encounter!.encounterId);
    expect(restored.currentRound).toBe(encounter!.currentRound);
    expect(restored.currentPhaseIndex).toBe(encounter!.currentPhaseIndex);
    expect(restored.status).toBe(encounter!.status);
    expect(restored.rngSeed).toBe(encounter!.rngSeed);
    expect(restored.rngCursor).toBe(encounter!.rngCursor);
    expect(restored.autoplayEnabled).toBe(false);

    const originalActorIds = Object.keys(encounter!.actors).sort();
    const restoredActorIds = Object.keys(restored.actors).sort();
    expect(restoredActorIds).toEqual(originalActorIds);

    for (const actorId of originalActorIds) {
      expect(restored.actors[actorId].currentHp).toBe(encounter!.actors[actorId].currentHp);
      expect(restored.actors[actorId].condition).toBe(encounter!.actors[actorId].condition);
    }
  });

  function runEncounterToCompletion() {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    let rounds = 0;
    while (encounter!.status === "active" && rounds < 60) {
      advanceEncounterRound(encounter!);
      rounds++;
    }

    return {
      finalRound: encounter!.currentRound,
      finalStatus: encounter!.status,
    };
  }

  // ── Encounter expansion tests ─────────────────────────────────────────

  it("resolves all new D-rank encounter-expansion bosses", () => {
    const newBossIds = [
      "boss/the-excise-officer",
      "boss/the-yardmaster",
      "boss/the-regulator",
      "boss/the-surveyor",
    ];
    for (const bossId of newBossIds) {
      const def = getBossEncounterDefinition(templateRegistry, "mission/clearance", bossId);
      expect(def, `Missing encounter definition for ${bossId}`).toBeDefined();
      expect(def!.phases.length).toBeGreaterThanOrEqual(3);
      expect(def!.actions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("creates and runs encounters for all new expansion bosses", () => {
    const newBossIds = [
      "boss/the-excise-officer",
      "boss/the-yardmaster",
      "boss/the-regulator",
      "boss/the-surveyor",
    ];
    for (const bossId of newBossIds) {
      const { encounter } = createTestEncounter("mission/clearance", bossId);
      expect(encounter, `Failed to create encounter for ${bossId}`).not.toBeNull();
      startEncounter(encounter!);
      advanceEncounterRound(encounter!);
      expect(encounter!.encounterLog.length).toBeGreaterThan(0);
    }
  });

  it("fires on_ally_defeat reaction when a summon is killed", () => {
    const { encounter } = createTestEncounter("mission/clearance", "boss/the-excise-officer");
    startEncounter(encounter!);

    const summonActor = createSummonActor({
      actorId: "actor:summon:test-ally-defeat",
      currentHp: 1,
      maxHp: 20,
      baseThreat: 999,
    });
    encounter!.actors[summonActor.actorId] = summonActor;

    const firstAlly = Object.values(encounter!.actors).find(
      (a) => a.side === "ally" && a.condition === "alive",
    )!;
    firstAlly.initiative = 999;
    firstAlly.baseAttack = 200;

    for (const actor of Object.values(encounter!.actors)) {
      if (actor.actorId !== firstAlly.actorId) {
        actor.initiative = 1;
      }
    }

    const logBefore = encounter!.encounterLog.length;
    advanceEncounterTurn(encounter!);
    advanceEncounterTurn(encounter!);

    expect(encounter!.actors[summonActor.actorId]?.condition).toBe("incapacitated");
    const reactionLogs = encounter!.encounterLog
      .slice(logBefore)
      .filter(
        (e) => e.actionKind === "passive_trigger" && e.abilityId === "on_ally_defeat:boss_self",
      );
    expect(reactionLogs).toHaveLength(1);
  });

  it("fires on_intervention_used reaction when an intervention is used", () => {
    // Use the-yardmaster which has on_intervention_used reaction
    const { encounter } = createTestEncounter("mission/clearance", "boss/the-yardmaster");
    startEncounter(encounter!);

    const logBefore = encounter!.encounterLog.length;
    const result = useIntervention(encounter!, "intel_reveal");
    expect(result).toBe(true);

    // Check that the intervention was logged AND a passive_trigger reaction followed
    const newEntries = encounter!.encounterLog.slice(logBefore);
    const interventionLog = newEntries.find((e) => e.actionKind === "intervention");
    expect(interventionLog).toBeDefined();

    const reactionLog = newEntries.find((e) => e.actionKind === "passive_trigger");
    expect(reactionLog).toBeDefined();
    expect(reactionLog!.abilityId).toContain("on_intervention_used");
  });

  it("uses new managerial interventions: priority_target, field_rotation, district_intel_reserve", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    // priority_target
    const ptUsage = encounter!.interventions.find((i) => i.interventionId === "priority_target");
    expect(ptUsage).toBeDefined();
    expect(ptUsage!.usesRemaining).toBe(1);
    const ptResult = useIntervention(encounter!, "priority_target");
    expect(ptResult).toBe(true);
    const { boss } = getActors(encounter!);
    expect(boss.activeStatuses.some((s) => s.statusId === "marked")).toBe(true);

    // field_rotation
    const frResult = useIntervention(encounter!, "field_rotation");
    expect(frResult).toBe(true);

    // district_intel_reserve
    const dirResult = useIntervention(encounter!, "district_intel_reserve");
    expect(dirResult).toBe(true);
    const { allies } = getActors(encounter!);
    expect(allies.some((a) => a.activeStatuses.some((s) => s.statusId === "guarded"))).toBe(true);
  });

  it("generates transcript entries for phase transitions in expansion bosses", () => {
    const { encounter } = createTestEncounter("mission/clearance", "boss/the-regulator");
    startEncounter(encounter!);

    const { boss } = getActors(encounter!);
    boss.currentHp = Math.floor(boss.maxHp * 0.5);
    boss.baseDefense = 999;

    advanceEncounterRound(encounter!);

    const phaseTransitions = encounter!.encounterLog.filter(
      (e) => e.actionKind === "phase_transition",
    );
    expect(encounter!.currentPhaseIndex).toBeGreaterThanOrEqual(1);
    expect(phaseTransitions.length).toBeGreaterThanOrEqual(1);
    expect(phaseTransitions[0]?.abilityId).toBe("phase-1");
  });

  it("registers the new expansion sites with valid enemy families", () => {
    const newSiteIds = [
      "site/collapsed-customs-house",
      "site/rift-cracked-switchyard",
      "site/shuttered-transformer-vault",
      "site/suspended-overpass-segment",
    ];

    for (const siteId of newSiteIds) {
      const site = siteConceptById.get(siteId);
      expect(site, `Missing site concept ${siteId}`).toBeDefined();

      if (!site) {
        continue;
      }

      for (const familyId of site.enemyFamilyIds) {
        expect(
          templateRegistry.enemyFamilyById.has(familyId),
          `Missing enemy family ${familyId} in site ${siteId}`,
        ).toBe(true);
      }
    }
  });
});

// ── Interruption queue ───────────────────────────────────────────────────

describe("interruption queue", () => {
  it("creates an empty queue", () => {
    const queue = createInterruptionQueueState();
    expect(queue.active).toBeNull();
    expect(queue.queue).toEqual([]);
    expect(hasBlockingInterruption(queue)).toBe(false);
  });

  it("enqueues and activates the first interruption", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(
      queue,
      "incident",
      { kind: "announcement", title: "Test", message: "Hi" },
      "test",
      100,
    );
    expect(queue.active).not.toBeNull();
    expect(queue.active!.type).toBe("incident");
    expect(hasBlockingInterruption(queue)).toBe(true);
  });

  it("queues lower-priority interruptions behind higher-priority ones", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(
      queue,
      "raid_boss_commitment",
      { kind: "announcement", title: "Boss", message: "" },
      "test",
      100,
    );
    enqueueInterruption(
      queue,
      "announcement",
      { kind: "announcement", title: "Info", message: "" },
      "test",
      100,
    );

    expect(queue.active!.type).toBe("raid_boss_commitment");
    expect(queue.queue.length).toBe(1);
    expect(queue.queue[0].type).toBe("announcement");
  });

  it("preempts with higher priority", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(
      queue,
      "announcement",
      { kind: "announcement", title: "Info", message: "" },
      "test",
      100,
    );
    enqueueInterruption(
      queue,
      "warning",
      { kind: "warning", title: "Warn", message: "", severity: "critical" },
      "test",
      100,
    );

    expect(queue.active!.type).toBe("warning");
    expect(queue.queue[0].type).toBe("announcement");
  });

  it("resolves active and promotes next from queue", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(
      queue,
      "incident",
      { kind: "announcement", title: "A", message: "" },
      "test",
      100,
    );
    enqueueInterruption(
      queue,
      "announcement",
      { kind: "announcement", title: "B", message: "" },
      "test",
      100,
    );

    const resolved = resolveActiveInterruption(queue);
    expect(resolved!.type).toBe("incident");
    expect(queue.active!.type).toBe("announcement");
  });

  it("dismisses dismissible interruptions", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(queue, "settings", { kind: "settings" }, "test", 100, {
      dismissible: true,
    });

    const dismissed = dismissActiveInterruption(queue);
    expect(dismissed).toBe(true);
    expect(queue.active).toBeNull();
  });

  it("persists only persistent interruptions", () => {
    const queue = createInterruptionQueueState();
    enqueueInterruption(queue, "settings", { kind: "settings" }, "test", 100);
    enqueueInterruption(
      queue,
      "incident",
      { kind: "announcement", title: "Test", message: "" },
      "test",
      100,
    );

    const snapshot = snapshotInterruptionQueue(queue);
    // Settings is transient, incident is persistent
    expect(snapshot.active!.type).toBe("incident");

    const restored = restoreInterruptionQueue(snapshot);
    expect(restored.active!.type).toBe("incident");
  });
});

// ── Incident templates ───────────────────────────────────────────────────

describe("incident templates", () => {
  it("has a broad authored incident library", () => {
    expect(INCIDENT_TEMPLATES.length).toBeGreaterThanOrEqual(5);
  });

  it("each template has valid structure", () => {
    for (const template of INCIDENT_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.choices.length).toBeGreaterThan(0);
      expect(template.weight).toBeGreaterThan(0);

      for (const choice of template.choices) {
        expect(choice.choiceId).toBeTruthy();
        expect(choice.label).toBeTruthy();
      }
    }
  });
});
