import type { OperatorCombatSnapshot } from "save";
import type { CombatPackageRegistry, CombatRank } from "content/templates/combat-packages";
import {
  COMBAT_PACKAGES,
  COMBAT_RANK_ORDER,
  buildCombatPackageRegistry,
  findCombatPackagesForRecruit,
} from "content/templates/combat-packages";

const RANK_STAT_MULTIPLIER: Record<CombatRank, number> = {
  f: 1.0,
  e: 1.15,
  d: 1.35,
  c: 1.6,
  b: 1.9,
  a: 2.25,
  u: 2.6,
};

const SENIOR_RANK_BAND: ReadonlySet<CombatRank> = new Set(["c", "b", "a"]);

interface RoleArchetype {
  attunementTag: string;
  traits: readonly string[];
  defaultPackageIdByRankBand: {
    baseRanks: string;
    seniorRanks: string;
    uniqueRank?: string;
  };
  baseStats: OperatorCombatSnapshot["baseStats"];
}

const ROLE_ARCHETYPES: Record<string, RoleArchetype> = {
  "role:scout": {
    attunementTag: "attunement:void",
    traits: ["trait:alert"],
    defaultPackageIdByRankBand: {
      baseRanks: "package/scout/void/standard",
      seniorRanks: "package/scout/void/senior",
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
    defaultPackageIdByRankBand: {
      baseRanks: "package/medic/vital/standard",
      seniorRanks: "package/medic/vital/senior",
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
  defaultPackageIdByRankBand: {
    baseRanks: "package/field-lead/kinetic/standard",
    seniorRanks: "package/field-lead/kinetic/senior",
    uniqueRank: "package/field-lead/kinetic/unique/anchor-absolute",
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

export function normalizeOperatorRank(rank: string | undefined | null): CombatRank {
  if (!rank) return "f";
  const lowered = rank.toLowerCase();
  return (COMBAT_RANK_ORDER as readonly string[]).includes(lowered) ? (lowered as CombatRank) : "f";
}

function scaleStats(
  baseStats: OperatorCombatSnapshot["baseStats"],
  rank: CombatRank,
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

function pickDefaultPackageIdForRole(roleTag: string, rank: CombatRank): string {
  const archetype = ROLE_ARCHETYPES[roleTag] ?? DEFAULT_ROLE_ARCHETYPE;
  if (rank === "u" && archetype.defaultPackageIdByRankBand.uniqueRank) {
    return archetype.defaultPackageIdByRankBand.uniqueRank;
  }
  if (SENIOR_RANK_BAND.has(rank) || rank === "u") {
    return archetype.defaultPackageIdByRankBand.seniorRanks;
  }
  return archetype.defaultPackageIdByRankBand.baseRanks;
}

export function deriveOperatorCombatDefaults(
  roleTag: string,
  rank: CombatRank = "f",
  registry: CombatPackageRegistry = DEFAULT_COMBAT_PACKAGE_REGISTRY,
): OperatorCombatSnapshot {
  const archetype = ROLE_ARCHETYPES[roleTag] ?? DEFAULT_ROLE_ARCHETYPE;
  const combatPackageId = resolveRecruitCombatPackageId(
    registry,
    roleTag,
    archetype.attunementTag,
    rank,
  );
  return {
    rank,
    attunementTag: archetype.attunementTag,
    traits: [...archetype.traits],
    combatPackageId,
    blocks: 0,
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
    combatPackageId: combat.combatPackageId,
    blocks: combat.blocks,
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

/**
 * Resolve a legal combat package id for a recruit given its role, attunement,
 * and rank. Falls back to the role archetype's default id when no package in
 * the registry matches the pool filter.
 */
export function resolveRecruitCombatPackageId(
  registry: CombatPackageRegistry,
  roleTag: string,
  attunementTag: string,
  rank: CombatRank,
): string {
  const matches = findCombatPackagesForRecruit(registry, roleTag, attunementTag, rank);
  if (matches.length > 0) {
    return matches[0].id;
  }
  return pickDefaultPackageIdForRole(roleTag, normalizeOperatorRank(rank));
}

/**
 * Shared default registry used when the runtime context is not accessible.
 * Simulation systems should use `context.runtimeState.combatPackageRegistry`.
 */
export const DEFAULT_COMBAT_PACKAGE_REGISTRY: CombatPackageRegistry =
  buildCombatPackageRegistry(COMBAT_PACKAGES);
