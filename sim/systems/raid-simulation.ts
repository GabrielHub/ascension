/**
 * Deterministic raid simulation engine.
 *
 * Produces a structured RaidRun transcript from team composition,
 * site seed, enemy templates, and operator stats. The transcript is
 * the single authoritative record of what happened during a raid.
 *
 * UI reads from the transcript; no presentation layer may invent
 * events that the transcript does not contain.
 */

import type {
  GoalCheckGrade,
  GoalCheckKind,
  RaidRunSnapshot,
  RaidStepSnapshot,
  SiteNodeSnapshot,
} from "save/types";
import type { EnemyFamilyTemplate, OrdinaryEnemyTemplate } from "content/templates/shared";
import {
  getObjectiveBiasConfig,
  type ContractPostureOption,
  type ObjectiveBiasOption,
  type RecoveryTriageOption,
  type RosterFlowOption,
  type StaffingPriorityOption,
} from "lib/policies";
import { SeededRng, boundedRoll, shuffle } from "../uncertainty";
import type { OperatorBaseStats } from "./derived-stats";

// ── Operator combat state for simulation ──────────────────────────────

export interface SimOperator {
  operatorId: string;
  name: string;
  roleTag: string;
  stats: OperatorBaseStats;
  combatPower: number;
  currentHp: number;
  maxHp: number;
  injury: number;
  morale: number;
  fatigue: number;
  kitRegularAttackPower: number;
  kitSkillPower: number;
  kitUltimatePower: number;
  passiveBonus: number;
  down: boolean;
}

// ── Site graph generation ──────────────────────────────────────────────

function generateSiteGraph(
  rng: SeededRng,
  missionDurationHours: number,
  hazardTags: readonly string[],
  hasBoss: boolean,
): SiteNodeSnapshot[] {
  const nodeCount = Math.max(6, Math.min(12, missionDurationHours + rng.int(2, 4)));
  const nodes: SiteNodeSnapshot[] = [];

  // Entry node
  nodes.push({
    nodeId: "node/entry",
    kind: "chamber",
    x: 1,
    y: 1,
    edges: ["node/corridor-0"],
    discovered: true,
  });

  // Generate interior nodes
  for (let i = 0; i < nodeCount - 2; i++) {
    const kindRoll = rng.float();
    let kind: SiteNodeSnapshot["kind"];
    if (kindRoll < 0.3) kind = "corridor";
    else if (kindRoll < 0.5) kind = "chamber";
    else if (kindRoll < 0.65) kind = "cache";
    else if (kindRoll < 0.78) kind = "intel_point";
    else if (kindRoll < 0.9) kind = "hazard";
    else kind = "corridor";

    const nodeId = `node/${kind}-${i}`;
    const prevNodeId = nodes[nodes.length - 1].nodeId;
    const x = 2 + Math.floor((i / (nodeCount - 2)) * 12);
    const y = 1 + rng.int(0, 12);

    const node: SiteNodeSnapshot = {
      nodeId,
      kind,
      x,
      y,
      edges: [],
      hazardTags:
        kind === "hazard" && hazardTags.length > 0
          ? [hazardTags[rng.int(0, hazardTags.length - 1)]]
          : undefined,
    };

    // Connect to previous node
    nodes[nodes.length - 1].edges.push(nodeId);
    node.edges.push(prevNodeId);

    // Occasionally create side branches
    if (i > 1 && rng.chance(0.3)) {
      const branchTarget = nodes[rng.int(1, nodes.length - 2)];
      if (!node.edges.includes(branchTarget.nodeId)) {
        node.edges.push(branchTarget.nodeId);
        branchTarget.edges.push(nodeId);
      }
    }

    nodes.push(node);
  }

  // Terminal node: boss or exit
  if (hasBoss) {
    const approachId = "node/boss-approach";
    const bossId = "node/boss-chamber";
    const lastInterior = nodes[nodes.length - 1];

    nodes.push({
      nodeId: approachId,
      kind: "boss_approach",
      x: 13,
      y: 7,
      edges: [lastInterior.nodeId, bossId],
    });
    lastInterior.edges.push(approachId);

    nodes.push({
      nodeId: bossId,
      kind: "boss_chamber",
      x: 14,
      y: 7,
      edges: [approachId],
    });
  } else {
    const exitId = "node/exit";
    const lastInterior = nodes[nodes.length - 1];
    nodes.push({
      nodeId: exitId,
      kind: "chamber",
      x: 14,
      y: 7,
      edges: [lastInterior.nodeId],
    });
    lastInterior.edges.push(exitId);
  }

  return nodes;
}

// ── Enemy group instantiation ──────────────────────────────────────────

interface SimEnemyGroup {
  enemyTemplateId: string;
  name: string;
  count: number;
  attack: number;
  defense: number;
  hp: number;
  speed: number;
  threat: number;
  totalHp: number;
  actions: OrdinaryEnemyTemplate["actions"];
  tags: OrdinaryEnemyTemplate["tags"];
  dropTableId: string;
}

function instantiateEnemyGroups(
  rng: SeededRng,
  enemyFamilies: readonly EnemyFamilyTemplate[],
  familyIds: readonly string[],
  groupCount: number,
  rankMultiplier: number,
): SimEnemyGroup[] {
  const groups: SimEnemyGroup[] = [];
  const allMembers: OrdinaryEnemyTemplate[] = [];

  for (const familyId of familyIds) {
    const family = enemyFamilies.find((f) => f.familyId === familyId);
    if (family) {
      allMembers.push(...family.members);
    }
  }

  if (allMembers.length === 0) {
    // Fallback: generate placeholder groups if no enemy templates exist
    for (let i = 0; i < groupCount; i++) {
      groups.push({
        enemyTemplateId: "enemy/generic",
        name: "Unknown Hostile",
        count: rng.int(2, 4),
        attack: Math.round(12 * rankMultiplier),
        defense: Math.round(8 * rankMultiplier),
        hp: Math.round(30 * rankMultiplier),
        speed: Math.round(12 * rankMultiplier),
        threat: Math.round(30 * rankMultiplier),
        totalHp: Math.round(30 * rankMultiplier) * 3,
        actions: [],
        tags: [],
        dropTableId: "drop-table/dungeon-f-regular",
      });
    }
    return groups;
  }

  for (let i = 0; i < groupCount; i++) {
    const template = allMembers[rng.int(0, allMembers.length - 1)];
    const count = rng.int(2, 4);
    groups.push({
      enemyTemplateId: template.enemyTemplateId,
      name: template.name,
      count,
      attack: Math.round(template.attack * rankMultiplier),
      defense: Math.round(template.defense * rankMultiplier),
      hp: Math.round(template.hp * rankMultiplier),
      speed: Math.round(template.speed * rankMultiplier),
      threat: Math.round(template.threat * rankMultiplier),
      totalHp: Math.round(template.hp * rankMultiplier) * count,
      actions: template.actions,
      tags: template.tags,
      dropTableId: template.dropTableId,
    });
  }

  return groups;
}

// ── Ordinary skirmish resolver ─────────────────────────────────────────

interface SkirmishResult {
  rounds: RaidStepSnapshot[];
  operatorDamage: Record<string, number>;
  enemiesDefeated: number;
  teamRetreated: boolean;
  lootDropped: string[];
}

function resolveSkirmish(
  rng: SeededRng,
  operators: SimOperator[],
  enemyGroup: SimEnemyGroup,
  hazardModifiers: readonly string[],
  intelLevel: number,
  tickOffset: number,
  siteNodeId: string,
): SkirmishResult {
  const steps: RaidStepSnapshot[] = [];
  const operatorDamage: Record<string, number> = {};
  let enemyHpRemaining = enemyGroup.totalHp;
  let teamRetreated = false;
  const lootDropped: string[] = [];

  // Start step
  steps.push({
    kind: "skirmish_start",
    tickOffset,
    siteNodeId,
    actorIds: operators.filter((op) => !op.down).map((op) => op.operatorId),
    message: `Engaged ${enemyGroup.name} (×${enemyGroup.count}).`,
    enemyTemplateId: enemyGroup.enemyTemplateId,
  });

  const aliveOps = () => operators.filter((op) => !op.down);
  const maxRounds = Math.min(8, 3 + enemyGroup.count);

  for (let round = 0; round < maxRounds; round++) {
    const living = aliveOps();
    if (living.length === 0) break;
    if (enemyHpRemaining <= 0) break;

    // ── Operators attack ──
    for (const op of living) {
      const attackPower = op.stats.strength * 1.2 + op.stats.speed * 0.3;
      const roleBonus = op.roleTag === "role:field_lead" ? 1.15 : 1.0;
      const intelBonus = intelLevel > 60 ? 1.08 : intelLevel > 30 ? 1.03 : 1.0;

      // Use kit abilities with some variance
      let baseDmg: number;
      if (round === 0 && op.kitUltimatePower > 0 && rng.chance(0.2)) {
        baseDmg = op.kitUltimatePower;
      } else if (op.kitSkillPower > 0 && rng.chance(0.35)) {
        baseDmg = op.kitSkillPower;
      } else {
        baseDmg = op.kitRegularAttackPower;
      }

      const dmg = Math.max(
        1,
        Math.round(
          (attackPower * 0.5 + baseDmg) * roleBonus * intelBonus -
            enemyGroup.defense * 0.4 +
            rng.int(-3, 5),
        ),
      );
      enemyHpRemaining -= dmg;
    }

    // ── Enemies attack ──
    for (let e = 0; e < enemyGroup.count; e++) {
      if (enemyHpRemaining <= 0) break;
      const livingOps = aliveOps();
      if (livingOps.length === 0) break;

      // Target selection: lowest HP or random
      const target = enemyGroup.tags.includes("hit-and-run")
        ? livingOps[rng.int(0, livingOps.length - 1)]
        : livingOps.reduce((weakest, op) => (op.currentHp < weakest.currentHp ? op : weakest));

      const enemyDmg = Math.max(
        1,
        Math.round(
          enemyGroup.attack -
            (target.stats.resilience * 1.0 + target.stats.endurance * 0.4) * 0.3 +
            rng.int(-2, 4),
        ),
      );

      // Hazard synergy bonus
      const hazardBonus =
        enemyGroup.tags.includes("hazard-synergy") && hazardModifiers.length > 0
          ? Math.round(enemyGroup.attack * 0.15)
          : 0;

      const totalDmg = enemyDmg + hazardBonus;
      target.currentHp -= totalDmg;
      operatorDamage[target.operatorId] = (operatorDamage[target.operatorId] ?? 0) + totalDmg;

      if (target.currentHp <= 0) {
        target.down = true;
      }
    }

    steps.push({
      kind: "skirmish_round",
      tickOffset: tickOffset + round + 1,
      siteNodeId,
      message: `Round ${round + 1}: ${enemyHpRemaining > 0 ? `${enemyGroup.name} at ${Math.max(0, Math.round((enemyHpRemaining / enemyGroup.totalHp) * 100))}% HP` : `${enemyGroup.name} defeated`}.`,
      deltas: {
        enemyHpFraction: Math.max(0, enemyHpRemaining / enemyGroup.totalHp),
        operatorDamageThisRound: { ...operatorDamage },
      },
    });

    // Check retreat pressure
    if (aliveOps().length <= 1 && enemyHpRemaining > enemyGroup.totalHp * 0.4) {
      teamRetreated = true;
      break;
    }
  }

  const enemiesDefeated = enemyHpRemaining <= 0 ? enemyGroup.count : 0;

  // Loot on defeat
  if (enemiesDefeated > 0) {
    lootDropped.push(enemyGroup.dropTableId);
  }

  steps.push({
    kind: "skirmish_end",
    tickOffset: tickOffset + maxRounds + 1,
    siteNodeId,
    message:
      enemiesDefeated > 0
        ? `${enemyGroup.name} eliminated.`
        : teamRetreated
          ? `Team forced to disengage from ${enemyGroup.name}.`
          : `${enemyGroup.name} endured the engagement.`,
    deltas: {
      enemiesDefeated,
      teamRetreated,
    },
  });

  return { rounds: steps, operatorDamage, enemiesDefeated, teamRetreated, lootDropped };
}

// ── Goal check resolver ────────────────────────────────────────────────

export interface RaidGoalCheckResult {
  grade: GoalCheckGrade;
  step: RaidStepSnapshot;
  consequences: {
    /**
     * Positive values heal, negative values deal damage.
     */
    hpDelta?: Record<string, number>;
    injuryDelta?: Record<string, number>;
    loot?: string[];
    intelGain?: number;
    revealNodes?: string[];
  };
}

function resolveGoalCheck(
  rng: SeededRng,
  kind: GoalCheckKind,
  operators: SimOperator[],
  difficulty: number,
  intelLevel: number,
  hazardModifiers: readonly string[],
  tickOffset: number,
  siteNodeId: string,
): RaidGoalCheckResult {
  const living = operators.filter((op) => !op.down);
  if (living.length === 0) {
    return {
      grade: "fail",
      step: {
        kind: "goal_check",
        tickOffset,
        siteNodeId,
        goalCheckKind: kind,
        goalCheckGrade: "fail",
        message: `${formatGoalCheckKind(kind)} failed — no operators available.`,
      },
      consequences: {},
    };
  }

  // Build check score from relevant operator stats
  let baseScore = 0;
  const modifiers: { label: string; value: number }[] = [];

  switch (kind) {
    case "exploring": {
      const scoutValue = living.filter((op) => op.roleTag === "role:scout").length * 12;
      const avgPerception =
        living.reduce((sum, op) => sum + op.stats.perception, 0) / living.length;
      const avgIntelligence =
        living.reduce((sum, op) => sum + op.stats.intelligence, 0) / living.length;
      baseScore = avgPerception * 1.2 + avgIntelligence * 0.8 + scoutValue;
      modifiers.push({ label: "perception", value: avgPerception * 1.2 });
      modifiers.push({ label: "scout bonus", value: scoutValue });
      break;
    }
    case "looting": {
      const avgSpeed = living.reduce((sum, op) => sum + op.stats.speed, 0) / living.length;
      const avgEndurance = living.reduce((sum, op) => sum + op.stats.endurance, 0) / living.length;
      baseScore = avgSpeed * 1.0 + avgEndurance * 0.8 + living.length * 4;
      modifiers.push({ label: "speed", value: avgSpeed });
      modifiers.push({ label: "team size", value: living.length * 4 });
      break;
    }
    case "intel": {
      const scoutValue = living.filter((op) => op.roleTag === "role:scout").length * 14;
      const avgPerception =
        living.reduce((sum, op) => sum + op.stats.perception, 0) / living.length;
      const avgIntelligence =
        living.reduce((sum, op) => sum + op.stats.intelligence, 0) / living.length;
      baseScore = avgPerception * 1.0 + avgIntelligence * 1.2 + scoutValue;
      modifiers.push({ label: "intelligence", value: avgIntelligence * 1.2 });
      modifiers.push({ label: "scout bonus", value: scoutValue });
      break;
    }
    case "hunting": {
      const fieldLeadValue = living.filter((op) => op.roleTag === "role:field_lead").length * 10;
      const avgCombat = living.reduce((sum, op) => sum + op.combatPower, 0) / living.length;
      baseScore = avgCombat * 1.5 + fieldLeadValue;
      modifiers.push({ label: "combat power", value: avgCombat * 1.5 });
      modifiers.push({ label: "field lead", value: fieldLeadValue });
      break;
    }
    case "regrouping": {
      const medicValue = living.filter((op) => op.roleTag === "role:medic").length * 14;
      const avgResilience =
        living.reduce((sum, op) => sum + op.stats.resilience, 0) / living.length;
      const avgEndurance = living.reduce((sum, op) => sum + op.stats.endurance, 0) / living.length;
      baseScore = avgResilience * 1.0 + avgEndurance * 0.8 + medicValue;
      modifiers.push({ label: "resilience", value: avgResilience });
      modifiers.push({ label: "medic bonus", value: medicValue });
      break;
    }
    case "retreating": {
      const avgSpeed = living.reduce((sum, op) => sum + op.stats.speed, 0) / living.length;
      const avgEndurance = living.reduce((sum, op) => sum + op.stats.endurance, 0) / living.length;
      const fieldLeadValue = living.filter((op) => op.roleTag === "role:field_lead").length * 8;
      baseScore = avgSpeed * 1.2 + avgEndurance * 0.6 + fieldLeadValue;
      modifiers.push({ label: "speed", value: avgSpeed * 1.2 });
      modifiers.push({ label: "field lead", value: fieldLeadValue });
      break;
    }
  }

  // Intel modifier
  if (intelLevel > 50) {
    const intelBonus = (intelLevel - 50) * 0.2;
    baseScore += intelBonus;
    modifiers.push({ label: "intel", value: intelBonus });
  }

  // Hazard penalty
  if (hazardModifiers.length > 0) {
    const hazardPenalty = hazardModifiers.length * 5;
    baseScore -= hazardPenalty;
    modifiers.push({ label: "hazards", value: -hazardPenalty });
  }

  const result = boundedRoll(rng, baseScore, modifiers, difficulty, 15);
  const marginAboveThreshold = result.total - difficulty;

  let grade: GoalCheckGrade;
  if (marginAboveThreshold >= 8) {
    grade = "pass";
  } else if (marginAboveThreshold >= -5) {
    grade = "mixed";
  } else {
    grade = "fail";
  }

  // Build consequences
  const consequences: RaidGoalCheckResult["consequences"] = {};

  switch (kind) {
    case "exploring":
      if (grade === "pass") {
        consequences.revealNodes = ["next"];
      } else if (grade === "fail") {
        // Hazard damage on fail
        const dmg: Record<string, number> = {};
        const injury: Record<string, number> = {};
        for (const op of living) {
          const damage = rng.int(2, 6);
          dmg[op.operatorId] = -damage;
          injury[op.operatorId] = Math.max(1, Math.round(damage * 0.2));
        }
        consequences.hpDelta = dmg;
        consequences.injuryDelta = injury;
      }
      break;
    case "looting":
      if (grade !== "fail") {
        consequences.loot = [grade === "pass" ? "loot:full" : "loot:partial"];
      }
      break;
    case "intel":
      if (grade === "pass") {
        consequences.intelGain = rng.int(6, 12);
      } else if (grade === "mixed") {
        consequences.intelGain = rng.int(2, 5);
      }
      break;
    case "regrouping":
      if (grade !== "fail") {
        const heal: Record<string, number> = {};
        for (const op of living) {
          heal[op.operatorId] = grade === "pass" ? rng.int(8, 15) : rng.int(3, 8);
        }
        consequences.hpDelta = heal;
      }
      break;
    case "retreating":
      if (grade === "fail") {
        const dmg: Record<string, number> = {};
        const injury: Record<string, number> = {};
        for (const op of living) {
          const damage = rng.int(4, 10);
          dmg[op.operatorId] = -damage;
          injury[op.operatorId] = Math.max(1, Math.round(damage * 0.2));
        }
        consequences.hpDelta = dmg;
        consequences.injuryDelta = injury;
      }
      break;
  }

  return {
    grade,
    step: {
      kind: "goal_check",
      tickOffset,
      siteNodeId,
      goalCheckKind: kind,
      goalCheckGrade: grade,
      actorIds: living.map((op) => op.operatorId),
      message: `${formatGoalCheckKind(kind)}: ${formatGrade(grade)}.`,
    },
    consequences,
  };
}

function formatGoalCheckKind(kind: GoalCheckKind): string {
  switch (kind) {
    case "exploring":
      return "Exploration check";
    case "looting":
      return "Loot extraction check";
    case "intel":
      return "Intel discovery check";
    case "hunting":
      return "Skirmish suppression check";
    case "regrouping":
      return "Regroup and stabilize check";
    case "retreating":
      return "Withdrawal check";
  }
}

function formatGrade(grade: GoalCheckGrade): string {
  switch (grade) {
    case "pass":
      return "success";
    case "mixed":
      return "partial success";
    case "fail":
      return "failed";
  }
}

// ── Main simulation entry point ────────────────────────────────────────

export interface RaidSimulationInput {
  raidId: string;
  contractSiteId: string;
  missionId: string;
  siteSeed: number;
  missionDurationHours: number;
  operators: SimOperator[];
  enemyFamilies: readonly EnemyFamilyTemplate[];
  enemyFamilyIds: readonly string[];
  hazardTags: readonly string[];
  hasBoss: boolean;
  bossId?: string;
  intelLevel: number;
  teamCohesion: number;
  contractExplorationProgress: number;
  contractBossIntelProgress: number;
  contractBossAvailable?: boolean;
  objectiveBias: ObjectiveBiasOption;
  contractPosture?: ContractPostureOption;
  recoveryTriage?: RecoveryTriageOption;
  staffingPriority?: StaffingPriorityOption;
  rosterFlow?: RosterFlowOption;
}

export function simulateRaidRun(input: RaidSimulationInput): RaidRunSnapshot {
  const rng = new SeededRng(input.siteSeed);
  const objectiveBias = getObjectiveBiasConfig({ objectiveBias: input.objectiveBias });
  const steps: RaidStepSnapshot[] = [];
  let tickOffset = 0;

  // Deep-copy operators so the simulation never mutates caller state
  const operators: SimOperator[] = input.operators.map((op) => ({
    ...op,
    stats: { ...op.stats },
  }));

  // ── Generate site graph ──
  const siteGraph = generateSiteGraph(
    rng,
    input.missionDurationHours,
    input.hazardTags,
    input.hasBoss,
  );

  // ── Instantiate enemy groups on site nodes ──
  const combatNodes = siteGraph.filter((n) => n.kind === "chamber" || n.kind === "corridor");
  const enemyGroupCount = Math.max(2, Math.min(5, Math.floor(input.missionDurationHours / 2) + 1));
  const enemyGroups = instantiateEnemyGroups(
    rng.fork(),
    input.enemyFamilies,
    input.enemyFamilyIds,
    enemyGroupCount,
    1.0,
  );

  // Assign enemy groups to nodes
  const enemyAssignments = new Map<string, SimEnemyGroup>();
  const shuffledCombatNodes = shuffle(rng.fork(), [...combatNodes]);
  enemyGroups.forEach((group, i) => {
    if (i < shuffledCombatNodes.length) {
      const node = shuffledCombatNodes[i];
      enemyAssignments.set(node.nodeId, group);
      if (!node.enemyGroupIds) node.enemyGroupIds = [];
      node.enemyGroupIds.push(group.enemyTemplateId);
    }
  });

  // ── Initialize derived state ──
  const derivedState: RaidRunSnapshot["derivedState"] = {
    revealedNodeIds: [siteGraph[0].nodeId],
    discoveredEnemyIds: [],
    discoveredFeatureIds: [],
    operatorHp: {},
    operatorMaxHp: {},
    operatorInjury: {},
    currentNodeId: siteGraph[0].nodeId,
    bossThresholdReached: false,
    retreating: false,
    lootGained: [],
    intelGained: 0,
  };

  for (const op of operators) {
    derivedState.operatorHp[op.operatorId] = op.currentHp;
    derivedState.operatorMaxHp[op.operatorId] = op.maxHp;
    derivedState.operatorInjury[op.operatorId] = 0;
  }

  // ── Deploy step ──
  steps.push({
    kind: "deploy",
    tickOffset: 0,
    siteNodeId: siteGraph[0].nodeId,
    actorIds: operators.map((op) => op.operatorId),
    message: `Team deployed into the site.`,
  });
  tickOffset += 1;

  // ── Simulate node-by-node progression ──
  const visitOrder = buildTraversalOrder(siteGraph, rng, input.hasBoss, objectiveBias);
  let retreating = false;
  let bossThresholdReached = false;
  let totalEnemiesDefeated = 0;
  const totalLoot: string[] = [];
  let totalIntel = 0;

  const aliveOps = () => operators.filter((op) => !op.down);

  for (let nodeIndex = 0; nodeIndex < visitOrder.length; nodeIndex++) {
    const node = visitOrder[nodeIndex];
    if (aliveOps().length === 0) break;

    // Move step
    steps.push({
      kind: "move",
      tickOffset,
      siteNodeId: node.nodeId,
      message: `Team moves to ${node.kind.replace(/_/g, " ")}.`,
    });
    derivedState.currentNodeId = node.nodeId;
    if (!derivedState.revealedNodeIds.includes(node.nodeId)) {
      derivedState.revealedNodeIds.push(node.nodeId);
    }
    tickOffset += 1;

    // ── Exploration check ──
    if (!retreating && node.kind !== "boss_chamber") {
      const exploreCheck = resolveGoalCheck(
        rng,
        "exploring",
        operators,
        30 + nodeIndex * 3,
        input.intelLevel,
        node.hazardTags ?? [],
        tickOffset,
        node.nodeId,
      );
      steps.push(exploreCheck.step);
      applyGoalCheckConsequences(operators, derivedState, exploreCheck);
      tickOffset += 1;

      // Reveal adjacent nodes on pass
      if (exploreCheck.grade === "pass") {
        for (const edgeId of node.edges) {
          if (!derivedState.revealedNodeIds.includes(edgeId)) {
            derivedState.revealedNodeIds.push(edgeId);
            const edgeNode = siteGraph.find((n) => n.nodeId === edgeId);
            if (edgeNode) {
              steps.push({
                kind: "discover_feature",
                tickOffset,
                siteNodeId: edgeId,
                message: `Discovered ${edgeNode.kind.replace(/_/g, " ")}.`,
              });
              derivedState.discoveredFeatureIds.push(edgeId);
              tickOffset += 1;
            }
          }
        }
      }
    }

    // ── Enemy encounter ──
    const enemyGroup = enemyAssignments.get(node.nodeId);
    if (enemyGroup && !retreating) {
      steps.push({
        kind: "discover_enemy",
        tickOffset,
        siteNodeId: node.nodeId,
        message: `${enemyGroup.name} spotted.`,
        enemyTemplateId: enemyGroup.enemyTemplateId,
      });
      derivedState.discoveredEnemyIds.push(enemyGroup.enemyTemplateId);
      tickOffset += 1;

      const skirmish = resolveSkirmish(
        rng,
        operators,
        enemyGroup,
        node.hazardTags ?? [],
        input.intelLevel,
        tickOffset,
        node.nodeId,
      );
      steps.push(...skirmish.rounds);
      tickOffset += skirmish.rounds.length;

      totalEnemiesDefeated += skirmish.enemiesDefeated;
      totalLoot.push(...skirmish.lootDropped);

      // Apply damage to derived state
      for (const [opId, dmg] of Object.entries(skirmish.operatorDamage)) {
        const op = operators.find((o) => o.operatorId === opId);
        if (op) {
          derivedState.operatorHp[opId] = Math.max(0, op.currentHp);
          derivedState.operatorInjury[opId] =
            (derivedState.operatorInjury[opId] ?? 0) + Math.round(dmg * 0.2);
        }
      }

      // Record injuries and downs
      for (const op of operators) {
        if (
          op.down &&
          !steps.some((s) => s.kind === "operator_down" && s.actorIds?.includes(op.operatorId))
        ) {
          steps.push({
            kind: "operator_down",
            tickOffset,
            siteNodeId: node.nodeId,
            actorIds: [op.operatorId],
            message: `${op.name} is down.`,
          });
          tickOffset += 1;
        }
      }

      if (skirmish.teamRetreated) {
        retreating = true;
      }
    }

    // ── Hazard check ──
    if (node.kind === "hazard" && node.hazardTags && node.hazardTags.length > 0 && !retreating) {
      steps.push({
        kind: "hazard",
        tickOffset,
        siteNodeId: node.nodeId,
        message: `Hazard: ${node.hazardTags.join(", ")}.`,
      });
      // Apply hazard damage
      for (const op of aliveOps()) {
        const dmg = rng.int(2, 8);
        op.currentHp -= dmg;
        derivedState.operatorHp[op.operatorId] = Math.max(0, op.currentHp);
        derivedState.operatorInjury[op.operatorId] =
          (derivedState.operatorInjury[op.operatorId] ?? 0) + Math.round(dmg * 0.12);
        if (op.currentHp <= 0) op.down = true;
      }
      tickOffset += 1;
    }

    // ── Cache / Loot check ──
    if (node.kind === "cache" && !retreating) {
      const lootCheck = resolveGoalCheck(
        rng,
        "looting",
        operators,
        25 + nodeIndex * 2,
        input.intelLevel,
        node.hazardTags ?? [],
        tickOffset,
        node.nodeId,
      );
      steps.push(lootCheck.step);
      applyGoalCheckConsequences(operators, derivedState, lootCheck);
      if (lootCheck.consequences.loot) {
        const targetLootCount = Math.max(
          1,
          Math.round(lootCheck.consequences.loot.length * objectiveBias.lootMultiplier),
        );
        totalLoot.push(...lootCheck.consequences.loot.slice(0, targetLootCount));
        steps.push({
          kind: "loot_gain",
          tickOffset: tickOffset + 1,
          siteNodeId: node.nodeId,
          message:
            lootCheck.grade === "pass"
              ? "Cache secured — full recovery."
              : "Partial cache recovery under pressure.",
          lootItemIds: lootCheck.consequences.loot,
        });
        derivedState.lootGained.push(...lootCheck.consequences.loot);
        tickOffset += 1;
      }
      tickOffset += 1;
    }

    // ── Intel point check ──
    if (node.kind === "intel_point" && !retreating) {
      const intelCheck = resolveGoalCheck(
        rng,
        "intel",
        operators,
        28 + nodeIndex * 2,
        input.intelLevel,
        node.hazardTags ?? [],
        tickOffset,
        node.nodeId,
      );
      steps.push(intelCheck.step);
      applyGoalCheckConsequences(operators, derivedState, intelCheck);
      if (intelCheck.consequences.intelGain) {
        const scaledIntel = Math.max(
          1,
          Math.round(intelCheck.consequences.intelGain * objectiveBias.intelMultiplier),
        );
        totalIntel += scaledIntel;
        derivedState.intelGained += scaledIntel;
        steps.push({
          kind: "intel_gain",
          tickOffset: tickOffset + 1,
          siteNodeId: node.nodeId,
          message: `Recovered ${scaledIntel} intel.`,
        });
        tickOffset += 1;
      }
      tickOffset += 1;
    }

    // ── Regroup check when team is damaged ──
    const teamHealthFraction =
      aliveOps().reduce((sum, op) => sum + op.currentHp / op.maxHp, 0) /
      Math.max(1, aliveOps().length);

    if (teamHealthFraction < 0.5 && !retreating && aliveOps().length > 0) {
      const regroupCheck = resolveGoalCheck(
        rng,
        "regrouping",
        operators,
        35,
        input.intelLevel,
        [],
        tickOffset,
        node.nodeId,
      );
      steps.push(regroupCheck.step);
      applyGoalCheckConsequences(operators, derivedState, regroupCheck);
      tickOffset += 1;
    }

    // ── Boss threshold check ──
    if (node.kind === "boss_approach" && input.hasBoss && !retreating && aliveOps().length > 0) {
      // Check if contract progress is sufficient for boss contact
      const progressSufficient =
        input.contractBossAvailable === true ||
        input.contractBossIntelProgress >= objectiveBias.contractPressureThreshold ||
        input.contractExplorationProgress >= objectiveBias.contractExplorationThreshold;
      const runProgressSufficient =
        visitOrder.length <= 1 ||
        nodeIndex / Math.max(1, visitOrder.length - 1) >= objectiveBias.bossRunProgressThreshold;

      if (progressSufficient && runProgressSufficient) {
        bossThresholdReached = true;
        derivedState.bossThresholdReached = true;
        steps.push({
          kind: "boss_threshold",
          tickOffset,
          siteNodeId: node.nodeId,
          message: "Boss chamber located. Awaiting commitment decision.",
        });
        tickOffset += 1;
        // Simulation pauses here for interactive boss commitment
        break;
      }
    }

    // ── Check for forced retreat ──
    if (aliveOps().length === 0) {
      break;
    }

    if (aliveOps().length <= 1 && teamHealthFraction < 0.3 && !retreating) {
      retreating = true;
      derivedState.retreating = true;
      steps.push({
        kind: "retreat_begin",
        tickOffset,
        siteNodeId: node.nodeId,
        message: "Team forced into withdrawal.",
      });
      tickOffset += 1;
    }
  }

  // ── Withdrawal check if retreating ──
  if (retreating && aliveOps().length > 0) {
    const retreatCheck = resolveGoalCheck(
      rng,
      "retreating",
      operators,
      30,
      input.intelLevel,
      input.hazardTags,
      tickOffset,
      derivedState.currentNodeId,
    );
    steps.push(retreatCheck.step);
    applyGoalCheckConsequences(operators, derivedState, retreatCheck);
    tickOffset += 1;
  }

  // ── Return step (if not paused for boss) ──
  if (!bossThresholdReached) {
    steps.push({
      kind: "return",
      tickOffset,
      siteNodeId: siteGraph[0].nodeId,
      message:
        aliveOps().length > 0 ? "Team returning from site." : "All operators down. Mission failed.",
    });
    tickOffset += 1;

    // ── Resolve step ──
    const result = determineRaidResult(
      operators,
      totalEnemiesDefeated,
      enemyGroupCount,
      retreating,
    );

    const reputationDelta = result === "success" ? 7 : result === "mixed" ? 2 : -5;
    const cashBase = 100 + input.missionDurationHours * 15;
    const cashDelta =
      result === "success"
        ? Math.round(cashBase * objectiveBias.lootMultiplier)
        : result === "mixed"
          ? Math.round(cashBase * 0.55 * objectiveBias.lootMultiplier)
          : -Math.round(cashBase * 0.3);

    const contributingFactors = buildContributingFactors(
      input,
      totalEnemiesDefeated,
      totalIntel,
      retreating,
      result,
    );
    const teamWiped = aliveOps().length === 0;

    steps.push({
      kind: "resolve",
      tickOffset,
      message: `Raid ${result}. ${aliveOps().length}/${operators.length} operators returning.`,
      deltas: {
        result,
        reputationDelta,
        cashDelta,
        operatorOutcomes: operators.map((op) => ({
          operatorId: op.operatorId,
          injuryDelta: derivedState.operatorInjury[op.operatorId] ?? 0,
          moraleDelta: result === "failure" ? -10 : result === "mixed" ? -3 : 6,
          loyaltyDelta: result === "failure" ? -7 : result === "mixed" ? -2 : 3,
          status: op.down ? "hurt" : result === "failure" ? "shaken" : "steady",
          died:
            op.down &&
            result === "failure" &&
            teamWiped &&
            (derivedState.operatorInjury[op.operatorId] ?? 0) >= 45,
        })),
      },
    });

    return {
      raidId: input.raidId,
      contractSiteId: input.contractSiteId,
      missionId: input.missionId,
      siteSeed: input.siteSeed,
      teamOperatorIds: operators.map((op) => op.operatorId),
      startedTick: 0,
      status: "resolved",
      currentStepIndex: steps.length - 1,
      steps,
      siteGraph,
      derivedState,
      summaryDraft: {
        result,
        reputationDelta,
        cashDelta,
        contributingFactors,
      },
    };
  }

  // Boss threshold reached — return paused run
  return {
    raidId: input.raidId,
    contractSiteId: input.contractSiteId,
    missionId: input.missionId,
    siteSeed: input.siteSeed,
    teamOperatorIds: operators.map((op) => op.operatorId),
    startedTick: 0,
    status: "awaiting_boss_commitment",
    currentStepIndex: steps.length - 1,
    steps,
    siteGraph,
    derivedState,
  };
}

// ── Post-boss resolution ────────────────────────────────────────────

export function resolveRaidRunAfterBoss(
  run: RaidRunSnapshot,
  bossResult: "victory" | "wipe" | "retreat",
  operatorHpAfter: Record<string, number>,
): RaidRunSnapshot {
  const steps = [...run.steps];
  let tickOffset = steps.length > 0 ? steps[steps.length - 1].tickOffset + 1 : 0;

  if (bossResult === "retreat") {
    steps.push({
      kind: "boss_retreat",
      tickOffset,
      message: "Team retreated from boss encounter.",
    });
  } else {
    steps.push({
      kind: "boss_result",
      tickOffset,
      message: bossResult === "victory" ? "Boss defeated." : "Team wiped during boss encounter.",
    });
  }
  tickOffset += 1;

  steps.push({
    kind: "return",
    tickOffset,
    siteNodeId: run.siteGraph[0]?.nodeId ?? "node/entry",
    message:
      bossResult === "wipe" ? "All operators down. Mission failed." : "Team returning from site.",
  });
  tickOffset += 1;

  const result = bossResult === "victory" ? "success" : "failure";
  const reputationDelta = bossResult === "victory" ? 10 : bossResult === "retreat" ? -4 : -8;
  const cashDelta = bossResult === "victory" ? 150 : bossResult === "retreat" ? -30 : -60;

  const contributingFactors = [
    ...(run.summaryDraft?.contributingFactors ?? []),
    bossResult === "victory"
      ? "boss:defeated"
      : bossResult === "retreat"
        ? "boss:retreated"
        : "boss:wipe",
  ];

  steps.push({
    kind: "resolve",
    tickOffset,
    message: `Raid ${result}. Boss ${bossResult}.`,
    deltas: { result, reputationDelta, cashDelta },
  });

  // Update derived state with post-boss HP
  const derivedState = { ...run.derivedState };
  for (const [opId, hp] of Object.entries(operatorHpAfter)) {
    derivedState.operatorHp[opId] = hp;
  }

  return {
    ...run,
    status: "resolved",
    currentStepIndex: steps.length - 1,
    steps,
    derivedState,
    summaryDraft: {
      result,
      reputationDelta,
      cashDelta,
      contributingFactors,
    },
  };
}

export function markRaidRunBossCommitment(run: RaidRunSnapshot): RaidRunSnapshot {
  if (run.status === "boss_encounter") {
    return run;
  }

  if (run.status !== "awaiting_boss_commitment") {
    return run;
  }

  const existingCommitIndex = run.steps.findIndex((step) => step.kind === "boss_commit");
  if (existingCommitIndex >= 0) {
    return {
      ...run,
      status: "boss_encounter",
      currentStepIndex: existingCommitIndex,
    };
  }

  const lastStep = run.steps[run.steps.length - 1];
  const commitStep: RaidStepSnapshot = {
    kind: "boss_commit",
    tickOffset: (lastStep?.tickOffset ?? -1) + 1,
    siteNodeId:
      lastStep?.siteNodeId ??
      run.derivedState.currentNodeId ??
      run.siteGraph.find((node) => node.kind === "boss_approach")?.nodeId,
    actorIds: [...run.teamOperatorIds],
    message: "Team committed to boss encounter.",
  };
  const steps = [...run.steps, commitStep];

  return {
    ...run,
    status: "boss_encounter",
    currentStepIndex: steps.length - 1,
    steps,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildTraversalOrder(
  siteGraph: SiteNodeSnapshot[],
  rng: SeededRng,
  _hasBoss: boolean,
  objectiveBias: ReturnType<typeof getObjectiveBiasConfig>,
): SiteNodeSnapshot[] {
  // Simple path: visit nodes in order, skipping entry (already deployed there)
  const order: SiteNodeSnapshot[] = [];
  const visited = new Set<string>();
  visited.add(siteGraph[0].nodeId);

  let current = siteGraph[0];
  while (true) {
    const unvisitedEdges = current.edges
      .map((id) => siteGraph.find((n) => n.nodeId === id))
      .filter((n): n is SiteNodeSnapshot => n !== undefined && !visited.has(n.nodeId));

    if (unvisitedEdges.length === 0) break;

    // Prefer progressing forward, but add randomness
    const next =
      unvisitedEdges.length > 1
        ? (() => {
            if (objectiveBias.bossRunProgressThreshold <= 0.5) {
              const bossFacingNode = unvisitedEdges.find(
                (node) => node.kind === "boss_approach" || node.kind === "boss_chamber",
              );
              if (bossFacingNode) {
                return bossFacingNode;
              }
            }
            return unvisitedEdges[rng.int(0, unvisitedEdges.length - 1)];
          })()
        : unvisitedEdges[0];

    visited.add(next.nodeId);
    order.push(next);
    current = next;
  }

  return order;
}

export function applyGoalCheckConsequences(
  operators: SimOperator[],
  derivedState: RaidRunSnapshot["derivedState"],
  result: RaidGoalCheckResult,
): void {
  if (result.consequences.hpDelta) {
    for (const [opId, delta] of Object.entries(result.consequences.hpDelta)) {
      const op = operators.find((o) => o.operatorId === opId);
      if (op) {
        if (delta > 0) {
          // Healing
          op.currentHp = Math.min(op.maxHp, op.currentHp + delta);
        } else {
          // Damage
          op.currentHp = Math.max(0, op.currentHp + delta);
          if (op.currentHp <= 0) op.down = true;
        }
        derivedState.operatorHp[opId] = op.currentHp;
      }
    }
  }
  if (result.consequences.injuryDelta) {
    for (const [opId, delta] of Object.entries(result.consequences.injuryDelta)) {
      derivedState.operatorInjury[opId] = (derivedState.operatorInjury[opId] ?? 0) + delta;
    }
  }
}

function determineRaidResult(
  operators: SimOperator[],
  enemiesDefeated: number,
  totalEnemyGroups: number,
  retreated: boolean,
): "success" | "failure" | "mixed" {
  const aliveCount = operators.filter((op) => !op.down).length;
  const totalCount = operators.length;
  const defeatRatio = totalEnemyGroups > 0 ? enemiesDefeated / totalEnemyGroups : 0;

  if (aliveCount === 0) return "failure";
  if (retreated && defeatRatio < 0.5) return "failure";
  if (retreated) return "mixed";
  if (defeatRatio >= 0.7 && aliveCount >= totalCount / 2) return "success";
  if (defeatRatio >= 0.4) return "mixed";
  return "failure";
}

function buildContributingFactors(
  input: RaidSimulationInput,
  enemiesDefeated: number,
  intelGained: number,
  retreated: boolean,
  _result: "success" | "failure" | "mixed",
): string[] {
  const factors: string[] = [];
  if (input.teamCohesion >= 70) factors.push("cohesion:strong");
  if (input.teamCohesion < 40) factors.push("cohesion:weak");
  if (input.intelLevel >= 60) factors.push("intel:high");
  if (input.intelLevel < 30) factors.push("intel:low");
  if (enemiesDefeated > 0) factors.push(`enemies:defeated:${enemiesDefeated}`);
  if (intelGained > 0) factors.push(`intel:gained:${intelGained}`);
  if (retreated) factors.push("team:retreated");

  const scoutCount = input.operators.filter((op) => op.roleTag === "role:scout").length;
  if (scoutCount > 0) factors.push("scout:present");

  const medicCount = input.operators.filter((op) => op.roleTag === "role:medic").length;
  if (medicCount > 0) factors.push("medic:present");

  const fieldLeadCount = input.operators.filter((op) => op.roleTag === "role:field_lead").length;
  if (fieldLeadCount > 0) factors.push("field_lead:present");
  if (input.contractPosture) factors.push(`policy:contract_posture:${input.contractPosture}`);
  factors.push(`policy:objective_bias:${input.objectiveBias}`);
  if (input.recoveryTriage) factors.push(`policy:recovery_triage:${input.recoveryTriage}`);
  if (input.staffingPriority) factors.push(`policy:staffing_priority:${input.staffingPriority}`);
  if (input.rosterFlow) factors.push(`policy:roster_flow:${input.rosterFlow}`);

  return factors;
}

// ── Transcript projection helpers for UI ────────────────────────────

export interface RaidTranscriptSummary {
  raidId: string;
  result: "success" | "failure" | "mixed";
  totalSteps: number;
  enemiesEncountered: number;
  enemiesDefeated: number;
  goalChecks: { kind: GoalCheckKind; grade: GoalCheckGrade }[];
  lootGained: string[];
  intelGained: number;
  operatorOutcomes: {
    operatorId: string;
    injuryDelta: number;
    down: boolean;
  }[];
  contributingFactors: string[];
}

export function projectTranscriptSummary(run: RaidRunSnapshot): RaidTranscriptSummary {
  const enemySteps = run.steps.filter((s) => s.kind === "discover_enemy");
  const skirmishEnds = run.steps.filter((s) => s.kind === "skirmish_end");
  const goalChecks = run.steps
    .filter((s) => s.kind === "goal_check" && s.goalCheckKind && s.goalCheckGrade)
    .map((s) => ({
      kind: s.goalCheckKind as GoalCheckKind,
      grade: s.goalCheckGrade as GoalCheckGrade,
    }));

  return {
    raidId: run.raidId,
    result: run.summaryDraft?.result ?? "mixed",
    totalSteps: run.steps.length,
    enemiesEncountered: enemySteps.length,
    enemiesDefeated: skirmishEnds.filter(
      (s) => (s.deltas as Record<string, unknown>)?.enemiesDefeated,
    ).length,
    goalChecks,
    lootGained: run.derivedState.lootGained,
    intelGained: run.derivedState.intelGained,
    operatorOutcomes: run.teamOperatorIds.map((opId) => ({
      operatorId: opId,
      injuryDelta: run.derivedState.operatorInjury[opId] ?? 0,
      down: (run.derivedState.operatorHp[opId] ?? 1) <= 0,
    })),
    contributingFactors: run.summaryDraft?.contributingFactors ?? [],
  };
}

/** Project focused-team event stream for UI display. */
export function projectTeamEventStream(run: RaidRunSnapshot): RaidStepSnapshot[] {
  return run.steps.filter((s) => s.kind !== "move" || s.message !== undefined);
}
