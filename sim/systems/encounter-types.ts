/**
 * Boss Encounter Type Definitions
 *
 * Runtime-owned encounter state for deterministic boss combat simulation.
 * The encounter model supports boss-only fights, boss+adds, summons,
 * and future elite/miniboss encounters without schema rewrites.
 */

import type { TemplateRegistry } from "content/templates";
import type { StatusId, AbilityEffect } from "content/templates/kits";
import type {
  BossEncounterActionTemplate,
  BossEncounterReactionTemplate,
  BossEncounterSummonTemplate,
  BossTag,
} from "content/templates/shared";

// ── Encounter status ─────────────────────────────────────────────────────

export type EncounterStatus =
  | "pending"
  | "active"
  | "paused"
  | "victory"
  | "retreat"
  | "wipe"
  | "forced_abort";

// ── Actor types ──────────────────────────────────────────────────────────

export type ActorSide = "ally" | "enemy";
export type ActorKind = "operator" | "boss" | "add" | "summon";
export type ActorCondition = "alive" | "incapacitated" | "retreated" | "stabilized";

export interface ActiveStatus {
  statusId: StatusId;
  remainingDuration: number;
  potency: number;
  sourceActorId: string;
}

export interface CooldownEntry {
  abilityId: string;
  remainingCooldown: number;
}

export interface ActorCombatState {
  actorId: string;
  side: ActorSide;
  kind: ActorKind;
  label: string;
  sourceEntityId: string;
  currentHp: number;
  maxHp: number;
  shield: number;
  initiative: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseThreat: number;
  condition: ActorCondition;
  activeStatuses: ActiveStatus[];
  cooldowns: CooldownEntry[];
  temporaryStatModifiers: Record<string, number>;
  actionHistory: readonly EncounterActionRecord[];
  // Operator-specific
  operatorId?: string;
  roleTag?: string;
  attunementTag?: string;
  presetId?: string;
  regularAttackId?: string;
  skillId?: string;
  ultimateId?: string;
  passiveIds?: readonly string[];
  // Boss-specific
  bossDefinitionId?: string;
  encounterActions?: readonly BossActionDefinition[];
}

// ── Boss behavior model ──────────────────────────────────────────────────

export interface BossPhaseDefinition {
  phaseIndex: number;
  hpThresholdFraction: number;
  statModifiers: Partial<Record<string, number>>;
  actionIds: readonly string[];
  onEnterEffects: readonly AbilityEffect[];
  summonIds: readonly string[];
}

export type BossActionDefinition = BossEncounterActionTemplate;

export type BossReactionHook = BossEncounterReactionTemplate;

export interface BossEncounterDefinition {
  bossId: string;
  name: string;
  rank: string;
  baseStats: {
    attack: number;
    defense: number;
    hp: number;
    speed: number;
    threat: number;
  };
  phases: readonly BossPhaseDefinition[];
  actions: readonly BossActionDefinition[];
  reactionHooks: readonly BossReactionHook[];
  weaknesses: readonly { kind: string; target: string; multiplier: number }[];
  tags: readonly BossTag[];
  summonDefinitions: readonly SummonDefinition[];
  targetingPriority: "highest_threat" | "lowest_hp" | "random" | "frontline";
  elapsedMinutes: number;
}

export type SummonDefinition = BossEncounterSummonTemplate;

// ── Managerial interventions ─────────────────────────────────────────────

export type InterventionId =
  | "intel_reveal"
  | "emergency_stabilize"
  | "force_regroup"
  | "defensive_posture"
  | "extraction_window"
  | "consumable_boost";

export interface InterventionDefinition {
  id: InterventionId;
  name: string;
  summary: string;
  usesPerEncounter: number;
  targeting: "all_allies" | "lowest_hp_ally" | "boss_enemy";
  effects: readonly AbilityEffect[];
  logTextKey: string;
}

export interface InterventionUsageState {
  interventionId: InterventionId;
  usesRemaining: number;
}

export const INTERVENTION_DEFINITIONS: readonly InterventionDefinition[] = [
  {
    id: "intel_reveal",
    name: "Intel Deployment",
    summary: "Spend accumulated intel to reveal the boss's current action pattern and weaknesses.",
    usesPerEncounter: 2,
    targeting: "boss_enemy",
    effects: [{ kind: "spawn_intel_window", duration: 3 }],
    logTextKey: "intervention.intel_reveal",
  },
  {
    id: "emergency_stabilize",
    name: "Emergency Stabilization",
    summary: "Authorize field medics to break routine and stabilize the most critical operator.",
    usesPerEncounter: 2,
    targeting: "lowest_hp_ally",
    effects: [
      { kind: "heal", basePower: 30, scalingStat: "intelligence", scalingFactor: 0.5 },
      { kind: "apply_status", statusId: "stabilized", duration: 2, potency: 10 },
    ],
    logTextKey: "intervention.emergency_stabilize",
  },
  {
    id: "force_regroup",
    name: "Forced Regroup",
    summary:
      "Order the team to fall back momentarily, gaining shields at the cost of a lost action round.",
    usesPerEncounter: 1,
    targeting: "all_allies",
    effects: [
      { kind: "shield", basePower: 15, scalingStat: "resilience", scalingFactor: 0.5 },
      { kind: "cleanse_status", count: 1 },
    ],
    logTextKey: "intervention.force_regroup",
  },
  {
    id: "defensive_posture",
    name: "Defensive Posture Shift",
    summary: "Instruct all operators to prioritize survival over damage output for several rounds.",
    usesPerEncounter: 1,
    targeting: "all_allies",
    effects: [
      { kind: "apply_status", statusId: "guarded", duration: 3, potency: 12 },
      { kind: "apply_status", statusId: "suppressed", duration: 3, potency: 5 },
    ],
    logTextKey: "intervention.defensive_posture",
  },
  {
    id: "extraction_window",
    name: "Limited Extraction Window",
    summary:
      "Open a narrow extraction route. If the encounter ends within 2 rounds, defeated operators may survive.",
    usesPerEncounter: 1,
    targeting: "all_allies",
    effects: [{ kind: "prevent_defeat", hpFloor: 1 }],
    logTextKey: "intervention.extraction_window",
  },
  {
    id: "consumable_boost",
    name: "Raid Consumable Burn",
    summary: "Expend a stored raid consumable to boost the entire team's combat performance.",
    usesPerEncounter: 1,
    targeting: "all_allies",
    effects: [
      { kind: "modify_stat", stat: "strength", delta: 5, duration: 3 },
      { kind: "modify_stat", stat: "speed", delta: 3, duration: 3 },
    ],
    logTextKey: "intervention.consumable_boost",
  },
];

// ── Encounter action records (log/trace) ─────────────────────────────────

export type EncounterActionKind =
  | "attack"
  | "skill"
  | "ultimate"
  | "boss_action"
  | "passive_trigger"
  | "intervention"
  | "status_tick"
  | "phase_transition"
  | "summon"
  | "defeat"
  | "encounter_start"
  | "encounter_end"
  | "round_start";

export interface EncounterActionRecord {
  round: number;
  actorId: string;
  actionKind: EncounterActionKind;
  abilityId: string;
  targetIds: readonly string[];
  effects: readonly EncounterEffectResult[];
  timestamp: number;
}

export interface EncounterEffectResult {
  effectKind: string;
  targetId: string;
  value: number;
  statusApplied?: StatusId;
  statusRemoved?: StatusId;
  blocked: boolean;
}

// ── Boss encounter instance ──────────────────────────────────────────────

export interface BossEncounterInstance {
  encounterId: string;
  contractSiteId: string;
  activeRaidId: string;
  missionId: string;
  teamId: string;
  participatingOperatorIds: readonly string[];
  bossDefinitionId: string;
  currentRound: number;
  currentPhaseIndex: number;
  status: EncounterStatus;
  elapsedMinutes: number;
  rngSeed: number;
  rngCursor: number;
  initiativeQueue: string[];
  pendingRoundStart: boolean;
  actors: Record<string, ActorCombatState>;
  interventions: InterventionUsageState[];
  encounterLog: EncounterActionRecord[];
  debugTraceEnabled: boolean;
  autoplayEnabled: boolean;
  autoplayIntervalMs: number;
}

// ── Encounter snapshot (for save/load) ───────────────────────────────────

export interface BossEncounterSnapshot {
  encounterId: string;
  contractSiteId: string;
  activeRaidId: string;
  missionId: string;
  teamId: string;
  participatingOperatorIds: readonly string[];
  bossDefinitionId: string;
  currentRound: number;
  currentPhaseIndex: number;
  status: EncounterStatus;
  elapsedMinutes: number;
  rngSeed: number;
  rngCursor: number;
  initiativeQueue: readonly string[];
  pendingRoundStart?: boolean;
  actors: Record<string, ActorCombatState>;
  interventions: InterventionUsageState[];
  encounterLog: EncounterActionRecord[];
}

// ── Encounter view (for UI consumption) ──────────────────────────────────

export interface EncounterActorView {
  actorId: string;
  label: string;
  side: ActorSide;
  kind: ActorKind;
  currentHp: number;
  maxHp: number;
  shield: number;
  condition: ActorCondition;
  activeStatuses: readonly ActiveStatus[];
  initiative: number;
  operatorId?: string;
  roleTag?: string;
  attunementTag?: string;
  presetId?: string;
  bossDefinitionId?: string;
  // Operator ability IDs (for detail display)
  regularAttackId?: string;
  skillId?: string;
  ultimateId?: string;
  passiveIds?: readonly string[];
  // Base combat stats
  baseAttack?: number;
  baseDefense?: number;
  baseSpeed?: number;
}

export interface EncounterView {
  encounterId: string;
  status: EncounterStatus;
  currentRound: number;
  currentPhaseIndex: number;
  phaseCount: number;
  phaseThresholdFractions: readonly number[];
  bossName: string;
  bossHpFraction: number;
  bossDefinitionId: string;
  bossRank: string;
  bossTags: readonly string[];
  bossWeaknesses: readonly { kind: string; target: string }[];
  actors: readonly EncounterActorView[];
  initiativeQueue: readonly string[];
  interventions: readonly InterventionUsageState[];
  recentLog: readonly EncounterActionRecord[];
  autoplayEnabled: boolean;
  elapsedMinutes: number;
}

export function getBossEncounterDefinition(
  registry: TemplateRegistry,
  missionId: string,
  bossId: string,
): BossEncounterDefinition | undefined {
  const mission = registry.missionById.get(missionId);
  const boss = mission?.combatProfile?.boss;
  const encounter = boss?.encounter;

  if (!boss || boss.bossId !== bossId || !encounter) {
    return undefined;
  }

  return {
    bossId: boss.bossId,
    name: boss.name,
    rank: boss.rank,
    baseStats: {
      attack: boss.attack,
      defense: boss.defense,
      hp: boss.hp,
      speed: boss.speed,
      threat: boss.threat,
    },
    phases: encounter.phases.map((phase) => ({
      phaseIndex: phase.phaseIndex,
      hpThresholdFraction: phase.hpThresholdFraction,
      statModifiers: { ...phase.statModifiers },
      actionIds: [...phase.actionIds],
      onEnterEffects: phase.onEnterEffects,
      summonIds: [...(phase.summonIds ?? [])],
    })),
    actions: encounter.actions.map((action) => ({
      ...action,
      effects: action.effects,
      ...(action.phaseIndices ? { phaseIndices: [...action.phaseIndices] } : {}),
    })),
    reactionHooks: (encounter.reactionHooks ?? []).map((hook) => ({
      ...hook,
      effects: hook.effects,
    })),
    weaknesses: boss.weaknesses,
    tags: boss.tags,
    summonDefinitions: (encounter.summonDefinitions ?? []).map((summon) => ({
      ...summon,
      stats: { ...summon.stats },
      actions: summon.actions.map((action) => ({
        ...action,
        effects: action.effects,
        ...(action.phaseIndices ? { phaseIndices: [...action.phaseIndices] } : {}),
      })),
    })),
    targetingPriority: encounter.targetingPriority ?? "highest_threat",
    elapsedMinutes: encounter.elapsedMinutes,
  };
}
