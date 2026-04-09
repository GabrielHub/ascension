import { describe, expect, it } from "vitest";

import { templateRegistry } from "content/templates";
import { createBootstrapSimulation } from "sim";
import {
  validateKitTemplates,
  buildKitTemplateRegistry,
  REGULAR_ATTACKS,
  SKILLS,
  ULTIMATES,
  PASSIVES,
  resolveOperatorKit,
} from "content/templates/kits";
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

// ── Kit template validation ──────────────────────────────────────────────

describe("kit template validation", () => {
  it("validates all authored kits without issues", () => {
    const registry = buildKitTemplateRegistry(REGULAR_ATTACKS, SKILLS, ULTIMATES, PASSIVES);
    const issues = validateKitTemplates(registry);
    expect(issues).toEqual([]);
  });

  it("resolves default kits for all role/attunement combos", () => {
    const registry = buildKitTemplateRegistry(REGULAR_ATTACKS, SKILLS, ULTIMATES, PASSIVES);
    const kit = resolveOperatorKit(registry, {
      regularAttackId: "kit/kinetic-strike",
      skillId: "kit/field-lead-skill",
      ultimateId: "kit/field-lead-ultimate",
      passiveIds: ["kit/field-lead-passive"],
    });
    expect(kit.regularAttack.id).toBe("kit/kinetic-strike");
    expect(kit.skill.id).toBe("kit/field-lead-skill");
    expect(kit.ultimate.id).toBe("kit/field-lead-ultimate");
    expect(kit.passives.length).toBeGreaterThan(0);
  });

  it("falls back to defaults for unknown kit ids", () => {
    const registry = buildKitTemplateRegistry(REGULAR_ATTACKS, SKILLS, ULTIMATES, PASSIVES);
    const kit = resolveOperatorKit(registry, {
      regularAttackId: "kit/nonexistent",
      skillId: "kit/nonexistent",
      ultimateId: "kit/nonexistent",
      passiveIds: ["kit/nonexistent"],
    });
    expect(kit.regularAttack).toBeDefined();
    expect(kit.skill).toBeDefined();
    expect(kit.ultimate).toBeDefined();
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
      cooldowns: [],
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
        ["attack", "skill", "ultimate", "boss_action"].includes(entry.actionKind),
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
      (entry) => entry.round === 1 && ["attack", "skill", "ultimate"].includes(entry.actionKind),
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

  it("resolves support abilities against allies instead of healing the boss", () => {
    const { encounter } = createTestEncounter();
    startEncounter(encounter!);

    const { allies, boss } = getActors(encounter!);
    const healer = allies[0];
    const injured = allies[1];

    healer.skillId = "kit/medic-skill";
    healer.ultimateId = undefined;
    healer.regularAttackId = "kit/basic-strike";
    healer.initiative = 999;
    injured.currentHp = Math.max(1, Math.floor(injured.maxHp / 4));

    for (const actor of Object.values(encounter!.actors)) {
      if (actor.actorId !== healer.actorId) {
        actor.initiative = 1;
      }
    }

    advanceEncounterRound(encounter!);

    const healerLog = encounter!.encounterLog.find(
      (entry) => entry.actorId === healer.actorId && entry.actionKind === "skill",
    );
    expect(healerLog).toBeDefined();
    expect(healerLog!.targetIds).toEqual([injured.actorId]);
    expect(healerLog!.targetIds).not.toContain(boss.actorId);
    expect(
      healerLog!.effects.some(
        (effect) => effect.effectKind === "heal" && effect.targetId === injured.actorId,
      ),
    ).toBe(true);
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
      ally.skillId = undefined;
      ally.ultimateId = undefined;
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
