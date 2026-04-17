import type { OperatorCombatSnapshot } from "save";

/**
 * Supported rank identities for recruited operators.
 *
 * Ranks below `f` are not representable; ranks above `c` are not produced
 * by default recruitment yet and remain out of scope until later plans add
 * the B/A/S ladder. Recruits default to `f` unless a rank-aware caller
 * requests otherwise.
 */
export type OperatorRank = "f" | "e" | "d" | "c";

const OPERATOR_RANK_ORDER: readonly OperatorRank[] = ["f", "e", "d", "c"];

/**
 * Base-stat multiplier applied on top of the role archetype's F-rank stats.
 *
 * Each rank step compounds on the previous tier, so F < E < D < C gear and
 * enemies all have a consistent envelope: C-rank recruits are roughly 60%
 * stronger than the F-rank baseline across the board.
 */
const RANK_STAT_MULTIPLIER: Record<OperatorRank, number> = {
  f: 1.0,
  e: 1.15,
  d: 1.35,
  c: 1.6,
};

/**
 * Role archetype baseline. Rank defaults to F; rank-aware callers opt in
 * by passing a target rank.
 */
interface RoleArchetype {
  attunementTag: string;
  traits: readonly string[];
  kit: OperatorCombatSnapshot["kit"];
  baseStats: OperatorCombatSnapshot["baseStats"];
}

const ROLE_ARCHETYPES: Record<string, RoleArchetype> = {
  "role:scout": {
    attunementTag: "attunement:void",
    traits: ["trait:alert"],
    kit: {
      regularAttackId: "kit/basic-strike",
      skillId: "kit/scout-skill",
      ultimateId: "kit/scout-ultimate",
      passiveIds: ["kit/scout-passive"],
    },
    baseStats: {
      strength: 7,
      speed: 14,
      endurance: 8,
      resilience: 7,
      perception: 13,
      intelligence: 9,
    },
  },
  "role:medic": {
    attunementTag: "attunement:vital",
    traits: ["trait:resilient"],
    kit: {
      regularAttackId: "kit/basic-strike",
      skillId: "kit/medic-skill",
      ultimateId: "kit/medic-ultimate",
      passiveIds: ["kit/medic-passive"],
    },
    baseStats: {
      strength: 6,
      speed: 7,
      endurance: 9,
      resilience: 14,
      perception: 8,
      intelligence: 13,
    },
  },
};

const DEFAULT_ROLE_ARCHETYPE: RoleArchetype = {
  attunementTag: "attunement:kinetic",
  traits: ["trait:steady"],
  kit: {
    regularAttackId: "kit/basic-strike",
    skillId: "kit/field-lead-skill",
    ultimateId: "kit/field-lead-ultimate",
    passiveIds: ["kit/field-lead-passive"],
  },
  baseStats: {
    strength: 14,
    speed: 8,
    endurance: 13,
    resilience: 10,
    perception: 7,
    intelligence: 8,
  },
};

export function normalizeOperatorRank(rank: string | undefined | null): OperatorRank {
  if (!rank) return "f";
  const lowered = rank.toLowerCase();
  return (OPERATOR_RANK_ORDER as readonly string[]).includes(lowered)
    ? (lowered as OperatorRank)
    : "f";
}

function scaleStats(
  baseStats: OperatorCombatSnapshot["baseStats"],
  rank: OperatorRank,
): OperatorCombatSnapshot["baseStats"] {
  const multiplier = RANK_STAT_MULTIPLIER[rank];
  return {
    strength: Math.round(baseStats.strength * multiplier),
    speed: Math.round(baseStats.speed * multiplier),
    endurance: Math.round(baseStats.endurance * multiplier),
    resilience: Math.round(baseStats.resilience * multiplier),
    perception: Math.round(baseStats.perception * multiplier),
    intelligence: Math.round(baseStats.intelligence * multiplier),
  };
}

/**
 * Derive a combat snapshot for a newly created operator.
 *
 * Passing `rank` produces a stat block scaled for that rank band while
 * preserving the role-specific attunement, trait, and kit identity. Omitting
 * `rank` yields the legacy F-rank defaults so existing callers continue to
 * work unchanged.
 */
export function deriveOperatorCombatDefaults(
  roleTag: string,
  rank: OperatorRank = "f",
): OperatorCombatSnapshot {
  const archetype = ROLE_ARCHETYPES[roleTag] ?? DEFAULT_ROLE_ARCHETYPE;
  return {
    rank,
    attunementTag: archetype.attunementTag,
    traits: [...archetype.traits],
    kit: {
      regularAttackId: archetype.kit.regularAttackId,
      skillId: archetype.kit.skillId,
      ultimateId: archetype.kit.ultimateId,
      passiveIds: [...archetype.kit.passiveIds],
    },
    baseStats: scaleStats(archetype.baseStats, rank),
  };
}

export function cloneOperatorCombatSnapshot(
  combat: OperatorCombatSnapshot,
): OperatorCombatSnapshot {
  return {
    rank: combat.rank,
    attunementTag: combat.attunementTag,
    traits: [...combat.traits],
    kit: {
      regularAttackId: combat.kit.regularAttackId,
      skillId: combat.kit.skillId,
      ultimateId: combat.kit.ultimateId,
      passiveIds: [...combat.kit.passiveIds],
    },
    baseStats: {
      strength: combat.baseStats.strength,
      speed: combat.baseStats.speed,
      endurance: combat.baseStats.endurance,
      resilience: combat.baseStats.resilience,
      perception: combat.baseStats.perception,
      intelligence: combat.baseStats.intelligence,
    },
  };
}

export function normalizeOperatorCombatSnapshot(
  combat: OperatorCombatSnapshot | undefined,
  roleTag: string,
): OperatorCombatSnapshot {
  if (combat) {
    return cloneOperatorCombatSnapshot(combat);
  }
  return deriveOperatorCombatDefaults(roleTag);
}
