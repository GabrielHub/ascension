/**
 * Boss Encounter Simulation Engine
 *
 * Deterministic round-based combat simulation.
 * Runtime-owned: React must not decide outcomes or advance rounds.
 * Supports boss-only fights, boss+adds, summons, and future elite encounters.
 */

import type {
  BossEncounterDefinition,
  BossEncounterInstance,
  ActorCombatState,
  EncounterStatus,
  EncounterActionRecord,
  EncounterEffectResult,
  EncounterView,
  EncounterActorView,
  BossActionDefinition,
  InterventionId,
  InterventionDefinition,
  InterventionUsageState,
  BossEncounterSnapshot,
} from "./encounter-types";
import { INTERVENTION_DEFINITIONS, getBossEncounterDefinition } from "./encounter-types";
import { templateRegistry } from "content/templates";
import type { AbilityEffect, StatusId, TargetingRule } from "content/templates/kits";
import { REGULAR_ATTACKS, SKILLS, ULTIMATES } from "content/templates/kits";
import { SeededRng, seedFromKey, weightedChoice, type WeightedItem } from "../uncertainty";
import type { SimSystemContext } from "./types";
import {
  GuildState,
  InjuryState,
  LoyaltyState,
  MoraleState,
  OperatorIdentity,
  WorldTimeState,
} from "../components";
import { pushRuntimeEvent } from "./commands";
import { deriveOperatorCombatDefaults } from "lib/operator-combat";

// ── Kit lookup maps (built once at module load) ─────────────────────────

interface OperatorAbilityRuntime {
  targeting: TargetingRule;
  effects: readonly AbilityEffect[];
  cooldown?: number;
  aiHints?: readonly string[];
}

const operatorAbilityLookup = new Map<string, OperatorAbilityRuntime>(
  [...REGULAR_ATTACKS, ...SKILLS, ...ULTIMATES].map((template) => [
    template.id,
    {
      targeting: template.targeting,
      effects: template.effects,
      cooldown: "cooldown" in template ? template.cooldown : undefined,
      aiHints: template.aiHints,
    },
  ]),
);

// ── Encounter creation ───────────────────────────────────────────────────

export function createBossEncounter(
  context: SimSystemContext,
  activeRaidId: string,
  contractSiteId: string,
  missionId: string,
  teamId: string,
  operatorIds: string[],
  bossId: string,
): BossEncounterInstance | null {
  const bossDef = getBossEncounterDefinition(context.registry, missionId, bossId);
  if (!bossDef) return null;

  const seed = seedFromKey(`encounter:${activeRaidId}:${bossId}`);
  const rng = new SeededRng(seed);

  const actors: Record<string, ActorCombatState> = {};

  // Create operator actors
  for (const opId of operatorIds) {
    const entity = context.runtimeState.operatorEntities.find(
      (e) => OperatorIdentity.id[e] === opId,
    );
    if (entity === undefined) continue;

    const combat = getOperatorCombatData(context, entity);
    const stats = combat.baseStats;
    // Compute derived combat stats from base stats without context dependency
    const maxHp = Math.round(stats.endurance * 5 + stats.resilience * 3 + 40);
    const attack = Math.round(stats.strength * 1.2 + stats.speed * 0.3);
    const defense = Math.round(stats.resilience * 1.0 + stats.endurance * 0.4);
    const speed = Math.round(stats.speed * 1.0 + stats.perception * 0.3);

    const actorId = `actor:operator:${opId}`;
    actors[actorId] = {
      actorId,
      side: "ally",
      kind: "operator",
      label: OperatorIdentity.name[entity],
      sourceEntityId: opId,
      currentHp: maxHp,
      maxHp,
      shield: 0,
      initiative: speed + rng.int(0, 5),
      baseAttack: attack,
      baseDefense: defense,
      baseSpeed: speed,
      baseThreat: 50,
      condition: "alive",
      activeStatuses: [],
      cooldowns: [],
      temporaryStatModifiers: {},
      actionHistory: [],
      operatorId: opId,
      roleTag: OperatorIdentity.roleTag[entity],
      attunementTag: combat.attunementTag,
      presetId: OperatorIdentity.appearancePresetId[entity],
      regularAttackId: combat.kit.regularAttackId,
      skillId: combat.kit.skillId,
      ultimateId: combat.kit.ultimateId,
      passiveIds: combat.kit.passiveIds,
    };
  }

  // Create boss actor
  const bossActorId = `actor:boss:${bossId}`;
  actors[bossActorId] = {
    actorId: bossActorId,
    side: "enemy",
    kind: "boss",
    label: bossDef.name,
    sourceEntityId: bossId,
    currentHp: bossDef.baseStats.hp,
    maxHp: bossDef.baseStats.hp,
    shield: 0,
    initiative: bossDef.baseStats.speed + rng.int(0, 3),
    baseAttack: bossDef.baseStats.attack,
    baseDefense: bossDef.baseStats.defense,
    baseSpeed: bossDef.baseStats.speed,
    baseThreat: bossDef.baseStats.threat,
    condition: "alive",
    activeStatuses: [],
    cooldowns: [],
    temporaryStatModifiers: {},
    actionHistory: [],
    bossDefinitionId: bossId,
    encounterActions: bossDef.actions,
  };

  // Set up interventions
  const interventions: InterventionUsageState[] = INTERVENTION_DEFINITIONS.map((def) => ({
    interventionId: def.id,
    usesRemaining: def.usesPerEncounter,
  }));

  const encounter: BossEncounterInstance = {
    encounterId: `encounter-${Date.now()}-${rng.int(0, 9999)}`,
    contractSiteId,
    activeRaidId,
    missionId,
    teamId,
    participatingOperatorIds: operatorIds,
    bossDefinitionId: bossId,
    currentRound: 0,
    currentPhaseIndex: 0,
    status: "pending",
    elapsedMinutes: bossDef.elapsedMinutes,
    rngSeed: seed,
    rngCursor: 0,
    initiativeQueue: [],
    pendingRoundStart: false,
    actors,
    interventions,
    encounterLog: [],
    debugTraceEnabled: false,
    autoplayEnabled: false,
    autoplayIntervalMs: 800,
  };

  return encounter;
}

function getOperatorCombatData(_context: SimSystemContext, entity: number) {
  // Look up combat data from the operator snapshot in the runtime
  // For now, use role-based defaults via the existing system
  const roleTag = OperatorIdentity.roleTag[entity];
  return deriveOperatorCombatDefaults(roleTag);
}

// ── Encounter advancement ────────────────────────────────────────────────

export function startEncounter(encounter: BossEncounterInstance): void {
  if (encounter.status !== "pending") return;
  encounter.status = "active";
  encounter.currentRound = 1;
  encounter.initiativeQueue = [];
  encounter.pendingRoundStart = true;
  encounter.autoplayEnabled = true;

  logEncounterAction(encounter, {
    round: 0,
    actorId: "system",
    actionKind: "encounter_start",
    abilityId: "",
    targetIds: [],
    effects: [],
    timestamp: Date.now(),
  });
}

export function advanceEncounterRound(encounter: BossEncounterInstance): void {
  if (encounter.status !== "active") return;

  const roundToResolve = encounter.currentRound;
  let guard = 0;
  while (encounter.status === "active" && encounter.currentRound === roundToResolve && guard < 64) {
    advanceEncounterTurn(encounter);
    guard++;
  }
}

export function advanceEncounterTurn(encounter: BossEncounterInstance): void {
  if (encounter.status !== "active") return;

  if (encounter.pendingRoundStart || encounter.initiativeQueue.length === 0) {
    beginEncounterRound(encounter);
    return;
  }

  const actorId = encounter.initiativeQueue.shift();
  if (!actorId) {
    beginEncounterRound(encounter);
    return;
  }

  const actor = encounter.actors[actorId];
  if (actor?.condition === "alive") {
    const rng = createEncounterRng(encounter);

    // Tick statuses at turn start.
    tickStatusesForActor(encounter, actor);

    const terminationAfterStatus = checkEncounterTermination(encounter);
    if (terminationAfterStatus) {
      endEncounter(encounter, terminationAfterStatus);
      return;
    }

    if (actor.condition === "alive") {
      if (actor.side === "ally") {
        resolveOperatorAction(encounter, actor, rng);
      } else {
        resolveEnemyAction(encounter, actor, rng);
      }

      const terminationAfterAction = checkEncounterTermination(encounter);
      if (terminationAfterAction) {
        endEncounter(encounter, terminationAfterAction);
        return;
      }
    }
  }

  if (encounter.initiativeQueue.length === 0) {
    finalizeEncounterRound(encounter);
  }
}

function createEncounterRng(encounter: BossEncounterInstance): SeededRng {
  const rng = new SeededRng(
    encounter.rngSeed + encounter.currentRound * 1000 + encounter.rngCursor,
  );
  encounter.rngCursor++;
  return rng;
}

function beginEncounterRound(encounter: BossEncounterInstance): void {
  if (encounter.status !== "active") return;

  const terminationResult = checkEncounterTermination(encounter);
  if (terminationResult) {
    endEncounter(encounter, terminationResult);
    return;
  }

  encounter.initiativeQueue = getSortedAliveActors(encounter).map((actor) => actor.actorId);
  encounter.pendingRoundStart = false;

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: "system",
    actionKind: "round_start",
    abilityId: "",
    targetIds: [],
    effects: [],
    timestamp: Date.now(),
  });
}

function finalizeEncounterRound(encounter: BossEncounterInstance): void {
  for (const actorId of Object.keys(encounter.actors)) {
    const actor = encounter.actors[actorId];
    if (actor.condition !== "alive") continue;
    for (const cd of actor.cooldowns) {
      if (cd.remainingCooldown > 0) cd.remainingCooldown--;
    }
  }

  const transitionRng = createEncounterRng(encounter);
  while (checkBossPhaseTransition(encounter, transitionRng)) {
    // Keep checking until no more transitions occur.
  }

  encounter.currentRound++;
  encounter.initiativeQueue = [];
  encounter.pendingRoundStart = true;

  const terminationResult = checkEncounterTermination(encounter);
  if (terminationResult) {
    endEncounter(encounter, terminationResult);
  }
}

function endEncounter(
  encounter: BossEncounterInstance,
  status: Extract<EncounterStatus, "victory" | "wipe" | "forced_abort">,
): void {
  encounter.status = status;
  encounter.pendingRoundStart = false;
  encounter.initiativeQueue = [];

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: "system",
    actionKind: "encounter_end",
    abilityId: status,
    targetIds: [],
    effects: [],
    timestamp: Date.now(),
  });
}

// ── Operator action resolution ───────────────────────────────────────────

function resolveOperatorAction(
  encounter: BossEncounterInstance,
  actor: ActorCombatState,
  rng: SeededRng,
): void {
  // Select ability: ultimate > skill > regular attack based on availability
  const fallbackAbility: OperatorAbilityRuntime = {
    targeting: "enemy_single" as const,
    effects: [{ kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.8 }],
  };
  let abilityId = actor.regularAttackId ?? "kit/basic-strike";
  let actionKind: "attack" | "skill" | "ultimate" = "attack";
  let ability = operatorAbilityLookup.get(abilityId) ?? fallbackAbility;

  // Try ultimate
  if (
    actor.ultimateId &&
    !isOnCooldown(actor, actor.ultimateId) &&
    shouldUseOperatorUltimate(
      encounter,
      operatorAbilityLookup.get(actor.ultimateId) ?? fallbackAbility,
    )
  ) {
    abilityId = actor.ultimateId;
    actionKind = "ultimate";
    ability = operatorAbilityLookup.get(abilityId) ?? fallbackAbility;
    setCooldown(actor, actor.ultimateId, ability.cooldown ?? 8);
  }
  // Try skill
  else if (actor.skillId && !isOnCooldown(actor, actor.skillId)) {
    abilityId = actor.skillId;
    actionKind = "skill";
    ability = operatorAbilityLookup.get(abilityId) ?? fallbackAbility;
    setCooldown(actor, actor.skillId, ability.cooldown ?? 3);
  }

  const targets = selectTargetsForRule(encounter, actor, ability.targeting, rng);
  if (targets.length === 0) return;

  const effectResults: EncounterEffectResult[] = [];
  for (const target of targets) {
    effectResults.push(...resolveEffects(encounter, actor, target, ability.effects, rng));
  }

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: actor.actorId,
    actionKind,
    abilityId,
    targetIds: targets.map((target) => target.actorId),
    effects: effectResults,
    timestamp: Date.now(),
  });
}

function shouldUseOperatorUltimate(
  encounter: BossEncounterInstance,
  ability: OperatorAbilityRuntime,
): boolean {
  if (encounter.currentRound >= 2) {
    return true;
  }

  const hints = new Set(ability.aiHints ?? []);
  const livingEnemies = Object.values(encounter.actors).filter(
    (candidate) => candidate.side === "enemy" && candidate.condition === "alive",
  );
  const livingAllies = Object.values(encounter.actors).filter(
    (candidate) => candidate.side === "ally" && candidate.condition === "alive",
  );
  const boss = livingEnemies.find((candidate) => candidate.kind === "boss");
  const bossHpFraction = boss ? boss.currentHp / Math.max(1, boss.maxHp) : 1;
  const lowestAllyHpFraction =
    livingAllies.length > 0
      ? Math.min(...livingAllies.map((candidate) => candidate.currentHp / candidate.maxHp))
      : 1;
  const nextPhaseThreshold =
    getBossEncounterDefinitionFromEncounter(encounter)?.phases[encounter.currentPhaseIndex + 1]
      ?.hpThresholdFraction ?? null;

  if (hints.has("prefer_low_hp_ally") && lowestAllyHpFraction <= 0.6) {
    return true;
  }
  if (hints.has("prefer_finishing") && bossHpFraction <= 0.45) {
    return true;
  }
  if (hints.has("prefer_phase_transition") && nextPhaseThreshold !== null) {
    return bossHpFraction <= nextPhaseThreshold + 0.15;
  }
  if (hints.has("prefer_aoe_opportunity") && livingEnemies.length >= 2) {
    return true;
  }
  if (hints.has("prefer_boss") && bossHpFraction <= 0.75) {
    return true;
  }

  return false;
}

// ── Enemy action resolution ──────────────────────────────────────────────

function resolveEnemyAction(
  encounter: BossEncounterInstance,
  actor: ActorCombatState,
  rng: SeededRng,
): void {
  const availablePhaseActionIds =
    actor.kind === "boss"
      ? new Set(
          getBossEncounterDefinitionFromEncounter(encounter)?.phases[encounter.currentPhaseIndex]
            ?.actionIds ?? [],
        )
      : null;
  const availableActions = (actor.encounterActions ?? []).filter((action) => {
    if (
      availablePhaseActionIds !== null &&
      availablePhaseActionIds.size > 0 &&
      !availablePhaseActionIds.has(action.id)
    ) {
      return false;
    }
    if (action.phaseIndices && !action.phaseIndices.includes(encounter.currentPhaseIndex)) {
      return false;
    }
    return !isOnCooldown(actor, action.id);
  });

  if (availableActions.length === 0) return;

  // Weighted selection
  const weighted: WeightedItem<BossActionDefinition>[] = availableActions.map((a) => ({
    item: a,
    weight: a.weight,
  }));

  const chosen = weightedChoice(rng, weighted).outcome;

  if (chosen.cooldown > 0) {
    setCooldown(actor, chosen.id, chosen.cooldown);
  }

  const targets = selectBossTargets(encounter, actor, chosen, rng);

  const allEffectResults: EncounterEffectResult[] = [];
  const targetIds: string[] = [];

  for (const target of targets) {
    targetIds.push(target.actorId);
    const results = resolveEffects(encounter, actor, target, chosen.effects, rng);
    allEffectResults.push(...results);
  }

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: actor.actorId,
    actionKind: "boss_action",
    abilityId: chosen.id,
    targetIds,
    effects: allEffectResults,
    timestamp: Date.now(),
  });
}

// ── Effect resolution ────────────────────────────────────────────────────

function resolveEffects(
  encounter: BossEncounterInstance,
  source: ActorCombatState,
  target: ActorCombatState,
  effects: readonly AbilityEffect[],
  _rng: SeededRng,
): EncounterEffectResult[] {
  const results: EncounterEffectResult[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "damage": {
        const scalingValue = getStatValue(source, effect.scalingStat);
        const rawDamage = effect.basePower + scalingValue * effect.scalingFactor;

        // Apply defense reduction
        const defense = target.baseDefense + (target.temporaryStatModifiers["defense"] ?? 0);
        const mitigated = Math.max(1, rawDamage - defense * 0.4);

        // Check exposed status (bonus damage)
        const exposedStatus = target.activeStatuses.find((s) => s.statusId === "exposed");
        const exposedBonus = exposedStatus ? exposedStatus.potency * 0.1 : 0;
        const finalDamage = Math.round(mitigated * (1 + exposedBonus));

        // Apply to shield first
        let remainingDamage = finalDamage;
        if (target.shield > 0) {
          const absorbed = Math.min(target.shield, remainingDamage);
          target.shield -= absorbed;
          remainingDamage -= absorbed;
        }

        target.currentHp = Math.max(0, target.currentHp - remainingDamage);
        if (target.currentHp <= 0) {
          target.condition = "incapacitated";
        }

        results.push({
          effectKind: "damage",
          targetId: target.actorId,
          value: finalDamage,
          blocked: false,
        });
        break;
      }

      case "heal": {
        const scalingValue = getStatValue(source, effect.scalingStat);
        const healAmount = Math.round(effect.basePower + scalingValue * effect.scalingFactor);
        // Check for recovery_block on target
        const recoveryBlocked = target.activeStatuses.some((s) => s.statusId === "suppressed");
        const actualHeal = recoveryBlocked ? Math.round(healAmount * 0.5) : healAmount;
        target.currentHp = Math.min(target.maxHp, target.currentHp + actualHeal);

        results.push({
          effectKind: "heal",
          targetId: target.actorId,
          value: actualHeal,
          blocked: false,
        });
        break;
      }

      case "shield": {
        const scalingValue = getStatValue(source, effect.scalingStat);
        const shieldAmount = Math.round(effect.basePower + scalingValue * effect.scalingFactor);
        target.shield += shieldAmount;

        results.push({
          effectKind: "shield",
          targetId: target.actorId,
          value: shieldAmount,
          blocked: false,
        });
        break;
      }

      case "apply_status": {
        const existing = target.activeStatuses.find((s) => s.statusId === effect.statusId);
        if (existing) {
          existing.remainingDuration = Math.max(existing.remainingDuration, effect.duration);
          existing.potency = Math.max(existing.potency, effect.potency);
        } else {
          target.activeStatuses.push({
            statusId: effect.statusId,
            remainingDuration: effect.duration,
            potency: effect.potency,
            sourceActorId: source.actorId,
          });
        }
        results.push({
          effectKind: "apply_status",
          targetId: target.actorId,
          value: effect.potency,
          statusApplied: effect.statusId,
          blocked: false,
        });
        break;
      }

      case "remove_status": {
        const idx = target.activeStatuses.findIndex((s) => s.statusId === effect.statusId);
        if (idx >= 0) {
          target.activeStatuses.splice(idx, 1);
        }
        results.push({
          effectKind: "remove_status",
          targetId: target.actorId,
          value: 0,
          statusRemoved: effect.statusId,
          blocked: idx < 0,
        });
        break;
      }

      case "cleanse_status": {
        let cleansed = 0;
        const negative: StatusId[] = [
          "bleeding",
          "staggered",
          "suppressed",
          "slowed",
          "exposed",
          "marked",
        ];
        for (let i = 0; i < effect.count && target.activeStatuses.length > 0; i++) {
          const idx = target.activeStatuses.findIndex((s) => negative.includes(s.statusId));
          if (idx < 0) break;
          target.activeStatuses.splice(idx, 1);
          cleansed++;
        }
        results.push({
          effectKind: "cleanse_status",
          targetId: target.actorId,
          value: cleansed,
          blocked: false,
        });
        break;
      }

      case "modify_stat": {
        if (effect.stat === "threat") {
          target.baseThreat += effect.delta;
        } else {
          target.temporaryStatModifiers[effect.stat] =
            (target.temporaryStatModifiers[effect.stat] ?? 0) + effect.delta;
          if (effect.stat === "speed") {
            target.initiative += effect.delta;
          }
        }
        results.push({
          effectKind: "modify_stat",
          targetId: target.actorId,
          value: effect.delta,
          blocked: false,
        });
        break;
      }

      case "modify_initiative": {
        target.initiative += effect.delta;
        results.push({
          effectKind: "modify_initiative",
          targetId: target.actorId,
          value: effect.delta,
          blocked: false,
        });
        break;
      }

      case "modify_threat": {
        target.baseThreat += effect.delta;
        results.push({
          effectKind: "modify_threat",
          targetId: target.actorId,
          value: effect.delta,
          blocked: false,
        });
        break;
      }

      case "taunt": {
        target.activeStatuses.push({
          statusId: "taunted",
          remainingDuration: effect.duration,
          potency: 100,
          sourceActorId: source.actorId,
        });
        results.push({
          effectKind: "taunt",
          targetId: target.actorId,
          value: effect.duration,
          blocked: false,
        });
        break;
      }

      case "redirect_damage": {
        target.activeStatuses.push({
          statusId: "guarded",
          remainingDuration: effect.duration,
          potency: Math.round(effect.fraction * 100),
          sourceActorId: source.actorId,
        });
        results.push({
          effectKind: "redirect_damage",
          targetId: target.actorId,
          value: effect.fraction,
          blocked: false,
        });
        break;
      }

      case "prevent_defeat": {
        // Mark with stabilized status
        target.activeStatuses.push({
          statusId: "stabilized",
          remainingDuration: 2,
          potency: effect.hpFloor,
          sourceActorId: source.actorId,
        });
        if (target.currentHp < effect.hpFloor) {
          target.currentHp = effect.hpFloor;
          target.condition = "alive";
        }
        results.push({
          effectKind: "prevent_defeat",
          targetId: target.actorId,
          value: effect.hpFloor,
          blocked: false,
        });
        break;
      }

      case "spawn_intel_window": {
        // Intel windows are tracked as a status on the boss
        const boss = Object.values(encounter.actors).find((a) => a.kind === "boss");
        if (boss) {
          boss.activeStatuses.push({
            statusId: "marked",
            remainingDuration: effect.duration,
            potency: 100,
            sourceActorId: source.actorId,
          });
        }
        results.push({
          effectKind: "spawn_intel_window",
          targetId: target.actorId,
          value: effect.duration,
          blocked: false,
        });
        break;
      }

      case "execute_threshold_bonus":
      case "phase_interaction_bonus":
      case "boss_tag_counter":
      case "boss_weakness_bonus":
      case "grant_followup":
        // These are combat modifiers resolved contextually
        results.push({
          effectKind: effect.kind,
          targetId: target.actorId,
          value: 0,
          blocked: false,
        });
        break;
    }
  }

  return results;
}

// ── Status ticking ───────────────────────────────────────────────────────

function tickStatusesForActor(encounter: BossEncounterInstance, actor: ActorCombatState): void {
  const toRemove: number[] = [];

  for (let i = 0; i < actor.activeStatuses.length; i++) {
    const status = actor.activeStatuses[i];
    status.remainingDuration--;

    // Bleeding does damage over time
    if (status.statusId === "bleeding" && actor.condition === "alive") {
      const bleedDamage = Math.round(status.potency * 0.5);
      actor.currentHp = Math.max(0, actor.currentHp - bleedDamage);
      if (actor.currentHp <= 0) {
        // Check for stabilized
        const stabilized = actor.activeStatuses.find((s) => s.statusId === "stabilized");
        if (stabilized) {
          actor.currentHp = stabilized.potency;
        } else {
          actor.condition = "incapacitated";
        }
      }
    }

    // Regenerating heals over time
    if (status.statusId === "regenerating" && actor.condition === "alive") {
      const regenAmount = Math.round(status.potency);
      actor.currentHp = Math.min(actor.maxHp, actor.currentHp + regenAmount);
    }

    if (status.remainingDuration <= 0) {
      toRemove.push(i);
    }
  }

  // Remove expired statuses (reverse order to preserve indices)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    actor.activeStatuses.splice(toRemove[i], 1);
  }
}

// ── Boss phase transitions ───────────────────────────────────────────────

function checkBossPhaseTransition(encounter: BossEncounterInstance, rng: SeededRng): boolean {
  const bossActor = Object.values(encounter.actors).find((a) => a.kind === "boss");
  if (!bossActor || bossActor.condition !== "alive") return false;

  const bossDef = getBossEncounterDefinitionFromEncounter(encounter);
  if (!bossDef) return false;

  const hpFraction = bossActor.currentHp / bossActor.maxHp;
  const nextPhaseIndex = encounter.currentPhaseIndex + 1;

  if (nextPhaseIndex >= bossDef.phases.length) return false;

  const nextPhase = bossDef.phases[nextPhaseIndex];
  if (hpFraction <= nextPhase.hpThresholdFraction) {
    encounter.currentPhaseIndex = nextPhaseIndex;

    // Apply phase stat modifiers
    for (const [stat, delta] of Object.entries(nextPhase.statModifiers)) {
      if (delta !== undefined) {
        if (stat === "threat") {
          bossActor.baseThreat += delta;
        } else {
          bossActor.temporaryStatModifiers[stat] =
            (bossActor.temporaryStatModifiers[stat] ?? 0) + delta;
          if (stat === "speed") {
            bossActor.initiative += delta;
          }
        }
      }
    }

    // Apply on-enter effects
    for (const effect of nextPhase.onEnterEffects) {
      if (effect.kind === "apply_status") {
        bossActor.activeStatuses.push({
          statusId: effect.statusId,
          remainingDuration: effect.duration,
          potency: effect.potency,
          sourceActorId: bossActor.actorId,
        });
      } else if (effect.kind === "shield") {
        bossActor.shield += effect.basePower;
      }
    }

    applyReactionHooks(encounter, bossActor, bossDef, "on_phase_enter", rng);

    if (nextPhase.summonIds.length > 0 && bossDef.summonDefinitions.length > 0) {
      nextPhase.summonIds.forEach((summonId, i) => {
        const summonDef = bossDef.summonDefinitions.find(
          (definition) => definition.summonId === summonId,
        );
        if (!summonDef) {
          return;
        }
        const summonActorId = `actor:summon:${summonDef.summonId}:${encounter.currentRound}:${i}`;

        encounter.actors[summonActorId] = {
          actorId: summonActorId,
          side: "enemy",
          kind: "summon",
          label: summonDef.label,
          sourceEntityId: summonDef.summonId,
          currentHp: summonDef.stats.hp,
          maxHp: summonDef.stats.hp,
          shield: 0,
          initiative: summonDef.stats.speed + rng.int(0, 3),
          baseAttack: summonDef.stats.attack,
          baseDefense: summonDef.stats.defense,
          baseSpeed: summonDef.stats.speed,
          baseThreat: summonDef.stats.threat,
          condition: "alive",
          activeStatuses: [],
          cooldowns: [],
          temporaryStatModifiers: {},
          actionHistory: [],
          encounterActions: summonDef.actions,
        };

        logEncounterAction(encounter, {
          round: encounter.currentRound,
          actorId: bossActor.actorId,
          actionKind: "summon",
          abilityId: summonDef.summonId,
          targetIds: [summonActorId],
          effects: [],
          timestamp: Date.now(),
        });
      });
    }

    logEncounterAction(encounter, {
      round: encounter.currentRound,
      actorId: bossActor.actorId,
      actionKind: "phase_transition",
      abilityId: `phase-${nextPhaseIndex}`,
      targetIds: [],
      effects: [],
      timestamp: Date.now(),
    });
    return true;
  }
  return false;
}

// ── Termination checks ───────────────────────────────────────────────────

function checkEncounterTermination(encounter: BossEncounterInstance): EncounterStatus | null {
  const aliveAllies = Object.values(encounter.actors).filter(
    (a) => a.side === "ally" && a.condition === "alive",
  );
  const aliveBoss = Object.values(encounter.actors).find(
    (a) => a.kind === "boss" && a.condition === "alive",
  );

  if (!aliveBoss) return "victory";
  if (aliveAllies.length === 0) return "wipe";
  if (encounter.currentRound > 50) return "forced_abort"; // Safety cap

  return null;
}

// ── Managerial interventions ─────────────────────────────────────────────

export function useIntervention(
  encounter: BossEncounterInstance,
  interventionId: InterventionId,
): boolean {
  if (encounter.status !== "active") return false;

  const usage = encounter.interventions.find((i) => i.interventionId === interventionId);
  if (!usage || usage.usesRemaining <= 0) return false;

  const def = INTERVENTION_DEFINITIONS.find((d) => d.id === interventionId);
  if (!def) return false;

  usage.usesRemaining--;

  const rng = new SeededRng(
    encounter.rngSeed + encounter.currentRound * 1000 + encounter.rngCursor,
  );
  encounter.rngCursor++;

  const targets = selectInterventionTargets(encounter, def);
  if (targets.length === 0) {
    usage.usesRemaining++;
    return false;
  }

  const allEffects: EncounterEffectResult[] = [];
  for (const target of targets) {
    const results = resolveEffects(encounter, target, target, def.effects, rng);
    allEffects.push(...results);
  }

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: "manager",
    actionKind: "intervention",
    abilityId: interventionId,
    targetIds: targets.map((target) => target.actorId),
    effects: allEffects,
    timestamp: Date.now(),
  });

  return true;
}

// ── Encounter retreat ────────────────────────────────────────────────────

export function retreatFromEncounter(encounter: BossEncounterInstance): void {
  if (encounter.status !== "active") return;
  encounter.status = "retreat";
  encounter.pendingRoundStart = false;
  encounter.initiativeQueue = [];

  logEncounterAction(encounter, {
    round: encounter.currentRound,
    actorId: "manager",
    actionKind: "encounter_end",
    abilityId: "retreat",
    targetIds: [],
    effects: [],
    timestamp: Date.now(),
  });
}

// ── Encounter view building ──────────────────────────────────────────────

export function buildEncounterView(encounter: BossEncounterInstance): EncounterView {
  const bossDef = getBossEncounterDefinitionFromEncounter(encounter);
  const bossActor = Object.values(encounter.actors).find((a) => a.kind === "boss");

  const actors: EncounterActorView[] = Object.values(encounter.actors).map((actor) => ({
    actorId: actor.actorId,
    label: actor.label,
    side: actor.side,
    kind: actor.kind,
    currentHp: actor.currentHp,
    maxHp: actor.maxHp,
    shield: actor.shield,
    condition: actor.condition,
    activeStatuses: actor.activeStatuses,
    initiative: actor.initiative,
    operatorId: actor.operatorId,
    roleTag: actor.roleTag,
    attunementTag: actor.attunementTag,
    presetId: actor.presetId,
    bossDefinitionId: actor.bossDefinitionId,
  }));

  return {
    encounterId: encounter.encounterId,
    status: encounter.status,
    currentRound: encounter.currentRound,
    currentPhaseIndex: encounter.currentPhaseIndex,
    phaseCount: bossDef?.phases.length ?? 1,
    phaseThresholdFractions: bossDef?.phases.map((phase) => phase.hpThresholdFraction) ?? [1],
    bossName: bossDef?.name ?? "Unknown",
    bossHpFraction: bossActor ? bossActor.currentHp / bossActor.maxHp : 0,
    bossDefinitionId: encounter.bossDefinitionId,
    bossRank: bossDef?.rank ?? "?",
    bossTags: bossDef?.tags ?? [],
    bossWeaknesses: bossDef?.weaknesses.map((w) => ({ kind: w.kind, target: w.target })) ?? [],
    actors,
    initiativeQueue: encounter.initiativeQueue,
    interventions: encounter.interventions,
    recentLog: encounter.encounterLog.slice(-20),
    autoplayEnabled: encounter.autoplayEnabled,
    elapsedMinutes: encounter.elapsedMinutes,
  };
}

// ── Outcome writeback ────────────────────────────────────────────────────

export function writeEncounterOutcome(
  context: SimSystemContext,
  encounter: BossEncounterInstance,
): void {
  const isVictory = encounter.status === "victory";
  const isWipe = encounter.status === "wipe";
  const bossName =
    Object.values(encounter.actors).find((actor) => actor.kind === "boss")?.label ?? "the boss";

  // Write elapsed time back to world clock
  const timeEntity = context.singletonEntities.time;
  const minutesToAdd = encounter.elapsedMinutes;
  let newMinuteOfDay = WorldTimeState.minuteOfDay[timeEntity] + minutesToAdd;
  let daysToAdd = Math.floor(newMinuteOfDay / 1440);
  newMinuteOfDay = newMinuteOfDay % 1440;
  WorldTimeState.minuteOfDay[timeEntity] = newMinuteOfDay;
  WorldTimeState.day[timeEntity] += daysToAdd;

  // Process operator outcomes
  for (const actor of Object.values(encounter.actors)) {
    if (actor.kind !== "operator" || !actor.operatorId) continue;

    const entity = context.runtimeState.operatorEntities.find(
      (e) => OperatorIdentity.id[e] === actor.operatorId,
    );
    if (entity === undefined) continue;

    if (actor.condition === "incapacitated") {
      InjuryState.severity[entity] = Math.min(100, InjuryState.severity[entity] + 40);
      InjuryState.recoveryHoursRemaining[entity] += 48;

      pushRuntimeEvent(context, {
        kind: "encounter_injury",
        message: `${actor.label} was injured in the encounter.`,
        timestamp: `Day ${WorldTimeState.day[timeEntity]}`,
        accent: "warning",
        targetKind: "operator",
        targetId: actor.operatorId,
      });
    }

    if (isVictory) {
      MoraleState.current[entity] = Math.min(100, MoraleState.current[entity] + 8);
      LoyaltyState.current[entity] = Math.min(100, LoyaltyState.current[entity] + 5);
    } else if (isWipe) {
      MoraleState.current[entity] = Math.max(0, MoraleState.current[entity] - 12);
    }
  }

  // Boss defeat flag
  if (isVictory) {
    pushRuntimeEvent(context, {
      kind: "boss_defeated",
      message: `Boss defeated: ${bossName}`,
      timestamp: `Day ${WorldTimeState.day[timeEntity]}`,
      accent: "success",
    });

    // Award loot via guild resources
    const guild = context.singletonEntities.guild;
    GuildState.treasury[guild] += 200;
    GuildState.reputation[guild] += 10;
  } else if (isWipe) {
    pushRuntimeEvent(context, {
      kind: "encounter_wipe",
      message: "The team was overwhelmed. All operators retreated with injuries.",
      timestamp: `Day ${WorldTimeState.day[timeEntity]}`,
      accent: "danger",
    });
  } else if (encounter.status === "retreat") {
    pushRuntimeEvent(context, {
      kind: "encounter_retreat",
      message: "The team retreated from the encounter.",
      timestamp: `Day ${WorldTimeState.day[timeEntity]}`,
      accent: "warning",
    });
  }

  // Unfreeze world time
  context.runtimeState.worldTimeFrozen = false;
}

// ── Save/load ────────────────────────────────────────────────────────────

export function snapshotEncounter(encounter: BossEncounterInstance): BossEncounterSnapshot {
  return {
    encounterId: encounter.encounterId,
    contractSiteId: encounter.contractSiteId,
    activeRaidId: encounter.activeRaidId,
    missionId: encounter.missionId,
    teamId: encounter.teamId,
    participatingOperatorIds: [...encounter.participatingOperatorIds],
    bossDefinitionId: encounter.bossDefinitionId,
    currentRound: encounter.currentRound,
    currentPhaseIndex: encounter.currentPhaseIndex,
    status: encounter.status,
    elapsedMinutes: encounter.elapsedMinutes,
    rngSeed: encounter.rngSeed,
    rngCursor: encounter.rngCursor,
    initiativeQueue: [...encounter.initiativeQueue],
    pendingRoundStart: encounter.pendingRoundStart,
    actors: JSON.parse(JSON.stringify(encounter.actors)),
    interventions: encounter.interventions.map((i) => ({ ...i })),
    encounterLog: encounter.encounterLog.slice(-50),
  };
}

export function restoreEncounter(snapshot: BossEncounterSnapshot): BossEncounterInstance {
  return {
    ...snapshot,
    participatingOperatorIds: [...snapshot.participatingOperatorIds],
    initiativeQueue: [...snapshot.initiativeQueue],
    pendingRoundStart: snapshot.pendingRoundStart ?? snapshot.initiativeQueue.length === 0,
    actors: JSON.parse(JSON.stringify(snapshot.actors)),
    interventions: snapshot.interventions.map((i) => ({ ...i })),
    encounterLog: [...snapshot.encounterLog],
    debugTraceEnabled: false,
    autoplayEnabled: snapshot.status === "active",
    autoplayIntervalMs: 800,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getStatValue(actor: ActorCombatState, statName: string): number {
  const mod = actor.temporaryStatModifiers[statName] ?? 0;
  switch (statName) {
    case "strength":
      return actor.baseAttack + mod;
    case "speed":
      return actor.baseSpeed + mod;
    case "endurance":
    case "resilience":
      return actor.baseDefense + mod;
    case "perception":
    case "intelligence":
      return Math.round((actor.baseAttack + actor.baseSpeed) / 2) + mod;
    default:
      return actor.baseAttack + mod;
  }
}

function isOnCooldown(actor: ActorCombatState, abilityId: string): boolean {
  const cd = actor.cooldowns.find((c) => c.abilityId === abilityId);
  return cd !== undefined && cd.remainingCooldown > 0;
}

function setCooldown(actor: ActorCombatState, abilityId: string, duration: number): void {
  const existing = actor.cooldowns.find((c) => c.abilityId === abilityId);
  if (existing) {
    existing.remainingCooldown = duration;
  } else {
    actor.cooldowns.push({ abilityId, remainingCooldown: duration });
  }
}

function selectTargetsForRule(
  encounter: BossEncounterInstance,
  actor: ActorCombatState,
  targeting: TargetingRule,
  rng: SeededRng,
): ActorCombatState[] {
  const allies = Object.values(encounter.actors).filter(
    (candidate) => candidate.side === actor.side && candidate.condition === "alive",
  );
  const enemies = Object.values(encounter.actors).filter(
    (candidate) => candidate.side !== actor.side && candidate.condition === "alive",
  );

  switch (targeting) {
    case "self":
      return [actor];
    case "all_allies":
      return allies;
    case "ally_single":
    case "ally_lowest_hp":
    case "ally_most_injured":
      return selectLowestHpTargets(allies);
    case "ally_frontline":
      return selectHighestThreatTargets(allies);
    case "random_ally":
      return allies.length > 0 ? [allies[rng.int(0, allies.length - 1)]] : [];
    case "all_enemies":
      return enemies;
    case "boss":
      return enemies.filter((candidate) => candidate.kind === "boss").slice(0, 1);
    case "enemy_lowest_hp":
      return selectLowestHpTargets(enemies);
    case "enemy_highest_threat":
      return selectHighestThreatTargets(enemies);
    case "random_enemy":
    case "enemy_group_member":
    case "summoned_enemy": {
      const summonTargets = enemies.filter((candidate) => candidate.kind === "summon");
      if (targeting === "summoned_enemy" && summonTargets.length > 0) {
        return [summonTargets[rng.int(0, summonTargets.length - 1)]];
      }
      return enemies.length > 0 ? [enemies[rng.int(0, enemies.length - 1)]] : [];
    }
    case "enemy_single":
    default: {
      const taunted = enemies.find((candidate) =>
        candidate.activeStatuses.some((status) => status.statusId === "taunted"),
      );
      if (taunted) {
        return [taunted];
      }
      return selectHighestThreatTargets(enemies);
    }
  }
}

function selectLowestHpTargets(actors: readonly ActorCombatState[]): ActorCombatState[] {
  return actors.length === 0
    ? []
    : [actors.reduce((lowest, actor) => (actor.currentHp < lowest.currentHp ? actor : lowest))];
}

function selectHighestThreatTargets(actors: readonly ActorCombatState[]): ActorCombatState[] {
  return actors.length === 0
    ? []
    : [
        actors.reduce((highest, actor) =>
          actor.baseThreat > highest.baseThreat ? actor : highest,
        ),
      ];
}

function selectBossTargets(
  encounter: BossEncounterInstance,
  _actor: ActorCombatState,
  action: BossActionDefinition,
  rng: SeededRng,
): ActorCombatState[] {
  const allies = Object.values(encounter.actors).filter(
    (a) => a.side === "ally" && a.condition === "alive",
  );

  if (allies.length === 0) return [];

  switch (action.targeting) {
    case "all_enemies":
      return allies;
    case "enemy_single":
    case "enemy_lowest_hp":
      return [allies.reduce((min, a) => (a.currentHp < min.currentHp ? a : min), allies[0])];
    case "enemy_highest_threat":
      return [allies.reduce((max, a) => (a.baseThreat > max.baseThreat ? a : max), allies[0])];
    case "random_enemy":
      return [allies[rng.int(0, allies.length - 1)]];
    case "boss": {
      const boss = Object.values(encounter.actors).find(
        (a) => a.kind === "boss" && a.condition === "alive",
      );
      return boss ? [boss] : [];
    }
    default:
      return [allies[0]];
  }
}

function logEncounterAction(encounter: BossEncounterInstance, record: EncounterActionRecord): void {
  encounter.encounterLog.push(record);
  // Keep log bounded
  if (encounter.encounterLog.length > 200) {
    encounter.encounterLog.splice(0, encounter.encounterLog.length - 200);
  }
}

function getBossEncounterDefinitionFromEncounter(
  encounter: BossEncounterInstance,
): BossEncounterDefinition | undefined {
  return getBossEncounterDefinition(
    templateRegistry,
    encounter.missionId,
    encounter.bossDefinitionId,
  );
}

function getSortedAliveActors(encounter: BossEncounterInstance): ActorCombatState[] {
  return Object.values(encounter.actors)
    .filter((actor) => actor.condition === "alive")
    .sort((left, right) => {
      if (right.initiative !== left.initiative) {
        return right.initiative - left.initiative;
      }
      return left.actorId.localeCompare(right.actorId);
    });
}

function selectInterventionTargets(
  encounter: BossEncounterInstance,
  intervention: InterventionDefinition,
): ActorCombatState[] {
  const allies = Object.values(encounter.actors).filter(
    (actor) => actor.side === "ally" && actor.condition === "alive",
  );
  const boss = Object.values(encounter.actors).find(
    (actor) => actor.kind === "boss" && actor.condition === "alive",
  );

  switch (intervention.targeting) {
    case "boss_enemy":
      return boss ? [boss] : [];
    case "lowest_hp_ally":
      return allies.length === 0
        ? []
        : [
            allies.reduce((lowest, actor) =>
              actor.currentHp / actor.maxHp < lowest.currentHp / lowest.maxHp ? actor : lowest,
            ),
          ];
    case "all_allies":
    default:
      return allies;
  }
}

function applyReactionHooks(
  encounter: BossEncounterInstance,
  bossActor: ActorCombatState,
  bossDef: BossEncounterDefinition,
  trigger: "on_phase_enter",
  rng: SeededRng,
): void {
  for (const hook of bossDef.reactionHooks) {
    if (hook.trigger !== trigger || hook.usesRemaining <= 0) {
      continue;
    }

    hook.usesRemaining -= 1;
    const targets =
      hook.target === "boss_self"
        ? [bossActor]
        : Object.values(encounter.actors).filter(
            (actor) => actor.side === "ally" && actor.condition === "alive",
          );

    const effects = targets.flatMap((target) =>
      resolveEffects(encounter, bossActor, target, hook.effects, rng),
    );
    logEncounterAction(encounter, {
      round: encounter.currentRound,
      actorId: bossActor.actorId,
      actionKind: "passive_trigger",
      abilityId: `${trigger}:${hook.target}`,
      targetIds: targets.map((target) => target.actorId),
      effects,
      timestamp: Date.now(),
    });
  }
}
