/**
 * Combat Package System
 *
 * Every operator carries exactly one `combatPackageId`. The package defines
 * the full 3-block combat loop:
 *
 * - one basic stage-1 payload (fires at 0 blocks)
 * - one basic stage-2 payload (fires at 1 block)
 * - one basic stage-3 payload (fires at 2 blocks)
 * - one 3-block ultimate payload (auto-spends when the actor reaches 3 blocks)
 * - zero or one passive (C-rank and above)
 *
 * Each payload declares one scaling stat and an explicit coefficient. Packages
 * gate themselves to legal role tags, legal attunement tags, and a legal rank
 * pool so recruit generation pulls from band-appropriate content only.
 *
 * `U` (Unique) packages are not listed in the general generation pool. They
 * are acquired through deterministic unlocks and live outside the normal
 * recruit roll.
 */

// ── Status vocabulary ────────────────────────────────────────────────────

export const STATUS_IDS = [
  "bleeding",
  "staggered",
  "guarded",
  "suppressed",
  "slowed",
  "regenerating",
  "marked",
  "stabilized",
  "exposed",
  "empowered",
  "taunted",
  "fortified",
  "hastened",
] as const;

export type StatusId = (typeof STATUS_IDS)[number];

// ── Targeting vocabulary ─────────────────────────────────────────────────

export const TARGETING_RULES = [
  "self",
  "ally_single",
  "ally_lowest_hp",
  "ally_frontline",
  "ally_most_injured",
  "all_allies",
  "enemy_single",
  "enemy_lowest_hp",
  "enemy_highest_threat",
  "boss",
  "all_enemies",
  "random_enemy",
] as const;

export type TargetingRule = (typeof TARGETING_RULES)[number];

// ── Effect DSL (shared vocabulary across stages, ultimates, passives) ────

export type CombatStat =
  | "strength"
  | "speed"
  | "endurance"
  | "resilience"
  | "perception"
  | "intelligence";

type EffectTargeting = {
  targetingOverride?: TargetingRule;
};

export type AbilityEffect =
  | ({
      kind: "damage";
      basePower: number;
      scalingStat: CombatStat;
      scalingFactor: number;
    } & EffectTargeting)
  | ({
      kind: "heal";
      basePower: number;
      scalingStat: CombatStat;
      scalingFactor: number;
    } & EffectTargeting)
  | ({
      kind: "shield";
      basePower: number;
      scalingStat: CombatStat;
      scalingFactor: number;
    } & EffectTargeting)
  | ({
      kind: "apply_status";
      statusId: StatusId;
      duration: number;
      potency: number;
    } & EffectTargeting)
  | ({ kind: "remove_status"; statusId: StatusId } & EffectTargeting)
  | ({ kind: "cleanse_status"; count: number } & EffectTargeting)
  | ({ kind: "modify_stat"; stat: CombatStat; delta: number; duration: number } & EffectTargeting)
  | ({ kind: "modify_initiative"; delta: number } & EffectTargeting)
  | ({ kind: "modify_threat"; delta: number } & EffectTargeting)
  | ({ kind: "taunt"; duration: number } & EffectTargeting)
  | ({ kind: "redirect_damage"; fraction: number; duration: number } & EffectTargeting)
  | { kind: "grant_followup"; targetingOverride?: TargetingRule }
  | ({ kind: "prevent_defeat"; hpFloor: number } & EffectTargeting)
  | ({
      kind: "execute_threshold_bonus";
      hpThreshold: number;
      bonusDamage: number;
    } & EffectTargeting)
  | ({ kind: "phase_interaction_bonus"; bonusDamage: number } & EffectTargeting)
  | ({ kind: "boss_tag_counter"; tagId: string; reduction: number } & EffectTargeting)
  | ({ kind: "boss_weakness_bonus"; multiplier: number } & EffectTargeting)
  | ({ kind: "spawn_intel_window"; duration: number } & EffectTargeting)
  | ({ kind: "ally_damage_bonus"; multiplier: number; duration: number } & EffectTargeting);

// ── Rank ladder ──────────────────────────────────────────────────────────

export type CombatRank = "f" | "e" | "d" | "c" | "b" | "a" | "u";

export const COMBAT_RANK_ORDER: readonly CombatRank[] = ["f", "e", "d", "c", "b", "a", "u"];

// ── Payload structures ───────────────────────────────────────────────────

export interface BasicStagePayload {
  name: string;
  summary: string;
  targeting: TargetingRule;
  effects: readonly AbilityEffect[];
}

export interface UltimatePayload {
  name: string;
  summary: string;
  targeting: TargetingRule;
  effects: readonly AbilityEffect[];
}

export interface PassivePayload {
  name: string;
  summary: string;
  effects: readonly AbilityEffect[];
}

// ── Package shape ────────────────────────────────────────────────────────

export interface CombatPackageTemplate {
  id: string;
  name: string;
  description: string;
  legalRoleTags: readonly string[];
  legalAttunementTags: readonly string[];
  legalRankPool: readonly CombatRank[];
  stage1: BasicStagePayload;
  stage2: BasicStagePayload;
  stage3: BasicStagePayload;
  ultimate: UltimatePayload;
  passive?: PassivePayload;
}

// ── Authored combat packages ─────────────────────────────────────────────
// Naming follows the world-foundation operational register: grounded
// workplace verbs, no fantasy jargon.
//
// Rank-band split:
//   F/E/D packages are straightforward and carry no passive.
//   C/B/A packages add one readable passive and richer ultimate riders.
//   U packages are unique, deterministic-only, and not listed in the general
//   recruit pool (legalRankPool: ["u"]).

// ── Field Lead / Kinetic ─────────────────────────────────────────────────

const FIELD_LEAD_KINETIC_BASE: CombatPackageTemplate = {
  id: "package/field-lead/kinetic/standard",
  name: "Anchor Push",
  description:
    "Straightforward kinetic field-lead loop. Each basic leans harder until the three-block anchor break opens a window for the team.",
  legalRoleTags: ["role:field_lead"],
  legalAttunementTags: ["attunement:kinetic"],
  legalRankPool: ["f", "e", "d"],
  stage1: {
    name: "Measured Strike",
    summary: "A calibrated opening blow that sets up the advance.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 13, scalingStat: "strength", scalingFactor: 1.0 }],
  },
  stage2: {
    name: "Driving Strike",
    summary: "A heavier follow-up as the field lead anchors position.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 15, scalingStat: "strength", scalingFactor: 1.1 }],
  },
  stage3: {
    name: "Pressure Break",
    summary: "A committed blow that rattles the target's footing.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 18, scalingStat: "strength", scalingFactor: 1.2 },
      { kind: "apply_status", statusId: "staggered", duration: 1, potency: 1 },
    ],
  },
  ultimate: {
    name: "Anchor Break",
    summary:
      "Commits the anchor strike and opens a window that boosts teammate damage for one beat.",
    targeting: "enemy_highest_threat",
    effects: [
      { kind: "damage", basePower: 28, scalingStat: "strength", scalingFactor: 1.4 },
      { kind: "ally_damage_bonus", multiplier: 0.2, duration: 1, targetingOverride: "all_allies" },
    ],
  },
};

const FIELD_LEAD_KINETIC_SENIOR: CombatPackageTemplate = {
  id: "package/field-lead/kinetic/senior",
  name: "Anchor Command",
  description:
    "Senior kinetic field-lead package. The anchor break lands harder and the operator stays composed under pressure.",
  legalRoleTags: ["role:field_lead"],
  legalAttunementTags: ["attunement:kinetic"],
  legalRankPool: ["c", "b", "a"],
  stage1: {
    name: "Commander's Strike",
    summary: "A measured opening blow that anchors the formation.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 14, scalingStat: "strength", scalingFactor: 1.1 }],
  },
  stage2: {
    name: "Advancing Strike",
    summary: "Heavier follow-up that pressures the opponent's footing.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 17, scalingStat: "strength", scalingFactor: 1.2 }],
  },
  stage3: {
    name: "Line Break",
    summary: "Committed hit that staggers and exposes.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 20, scalingStat: "strength", scalingFactor: 1.3 },
      { kind: "apply_status", statusId: "staggered", duration: 1, potency: 1 },
    ],
  },
  ultimate: {
    name: "Anchor Command",
    summary: "A heavy anchor break that opens a broader damage window for the whole team.",
    targeting: "enemy_highest_threat",
    effects: [
      { kind: "damage", basePower: 32, scalingStat: "strength", scalingFactor: 1.5 },
      { kind: "ally_damage_bonus", multiplier: 0.25, duration: 2, targetingOverride: "all_allies" },
    ],
  },
  passive: {
    name: "Steady Under Pressure",
    summary: "At low HP, takes 15% less damage from the highest-threat enemy.",
    effects: [{ kind: "modify_stat", stat: "resilience", delta: 2, duration: 999 }],
  },
};

// ── Scout / Void ─────────────────────────────────────────────────────────

const SCOUT_VOID_BASE: CombatPackageTemplate = {
  id: "package/scout/void/standard",
  name: "Slip Strike",
  description:
    "Void scout loop built on speed. Each basic reads the opening more cleanly; the ultimate exposes the target for follow-up damage.",
  legalRoleTags: ["role:scout"],
  legalAttunementTags: ["attunement:void"],
  legalRankPool: ["f", "e", "d"],
  stage1: {
    name: "Probing Cut",
    summary: "A quick attunement-channeled cut that tests the target's guard.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 13, scalingStat: "speed", scalingFactor: 1.0 }],
  },
  stage2: {
    name: "Reading the Line",
    summary: "The scout finds the opening and strikes faster.",
    targeting: "enemy_lowest_hp",
    effects: [{ kind: "damage", basePower: 15, scalingStat: "speed", scalingFactor: 1.1 }],
  },
  stage3: {
    name: "Slip Cut",
    summary: "A punishing slip inside the target's guard.",
    targeting: "enemy_lowest_hp",
    effects: [
      { kind: "damage", basePower: 18, scalingStat: "speed", scalingFactor: 1.2 },
      { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 1 },
    ],
  },
  ultimate: {
    name: "Expose Angle",
    summary: "Commits a shaped cut that exposes the target for one beat.",
    targeting: "enemy_highest_threat",
    effects: [
      { kind: "damage", basePower: 26, scalingStat: "speed", scalingFactor: 1.4 },
      { kind: "apply_status", statusId: "exposed", duration: 1, potency: 1 },
    ],
  },
};

const SCOUT_VOID_SENIOR: CombatPackageTemplate = {
  id: "package/scout/void/senior",
  name: "Perfect Angle",
  description:
    "Senior void scout package. Finds every opening, marks targets, and exposes the boss when it matters.",
  legalRoleTags: ["role:scout"],
  legalAttunementTags: ["attunement:void"],
  legalRankPool: ["c", "b", "a"],
  stage1: {
    name: "Scout's Probe",
    summary: "Fast opening cut that marks the target's weakest line.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 14, scalingStat: "speed", scalingFactor: 1.1 },
      { kind: "apply_status", statusId: "marked", duration: 2, potency: 1 },
    ],
  },
  stage2: {
    name: "Angle Cut",
    summary: "Slides the angle further, harder hit on the marked line.",
    targeting: "enemy_lowest_hp",
    effects: [{ kind: "damage", basePower: 17, scalingStat: "speed", scalingFactor: 1.2 }],
  },
  stage3: {
    name: "Perfect Cut",
    summary: "A committed cut that bleeds the target.",
    targeting: "enemy_lowest_hp",
    effects: [
      { kind: "damage", basePower: 20, scalingStat: "speed", scalingFactor: 1.3 },
      { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 1 },
    ],
  },
  ultimate: {
    name: "Perfect Angle",
    summary: "A clean shaped cut that exposes and marks a high-threat target.",
    targeting: "enemy_highest_threat",
    effects: [
      { kind: "damage", basePower: 30, scalingStat: "speed", scalingFactor: 1.5 },
      { kind: "apply_status", statusId: "exposed", duration: 2, potency: 1 },
    ],
  },
  passive: {
    name: "Read the Room",
    summary: "Gains a small permanent speed bump from constant pattern reading.",
    effects: [{ kind: "modify_stat", stat: "speed", delta: 2, duration: 999 }],
  },
};

// ── Medic / Vital ────────────────────────────────────────────────────────

const MEDIC_VITAL_BASE: CombatPackageTemplate = {
  id: "package/medic/vital/standard",
  name: "Field Triage",
  description:
    "Vital medic loop. Basics keep allies on their feet through sustain riders while still carrying attunement-channeled damage.",
  legalRoleTags: ["role:medic"],
  legalAttunementTags: ["attunement:vital"],
  legalRankPool: ["f", "e", "d"],
  stage1: {
    name: "Attunement Lash",
    summary: "A short attunement lash that also ticks a small heal on the nearest ally.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 11, scalingStat: "intelligence", scalingFactor: 1.0 },
      {
        kind: "heal",
        basePower: 4,
        scalingStat: "intelligence",
        scalingFactor: 0.3,
        targetingOverride: "ally_lowest_hp",
      },
    ],
  },
  stage2: {
    name: "Steady Lash",
    summary: "Harder attunement strike with a larger stabilizing tick.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 13, scalingStat: "intelligence", scalingFactor: 1.1 },
      {
        kind: "heal",
        basePower: 6,
        scalingStat: "intelligence",
        scalingFactor: 0.4,
        targetingOverride: "ally_lowest_hp",
      },
    ],
  },
  stage3: {
    name: "Purging Lash",
    summary: "Committed strike that also cleanses a status on the most injured ally.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 16, scalingStat: "intelligence", scalingFactor: 1.2 },
      { kind: "cleanse_status", count: 1, targetingOverride: "ally_most_injured" },
    ],
  },
  ultimate: {
    name: "Field Triage",
    summary:
      "Commits to a full-team stabilize pass, healing everyone and granting brief regeneration.",
    targeting: "all_allies",
    effects: [
      { kind: "heal", basePower: 22, scalingStat: "intelligence", scalingFactor: 1.0 },
      { kind: "apply_status", statusId: "regenerating", duration: 2, potency: 1 },
    ],
  },
};

const MEDIC_VITAL_SENIOR: CombatPackageTemplate = {
  id: "package/medic/vital/senior",
  name: "Standing Care",
  description:
    "Senior vital medic package. Stronger sustain, a cleansing rider, and an ultimate that holds the team through a hard beat.",
  legalRoleTags: ["role:medic"],
  legalAttunementTags: ["attunement:vital"],
  legalRankPool: ["c", "b", "a"],
  stage1: {
    name: "Focused Lash",
    summary: "A tuned attunement strike that also ticks a steady heal on the nearest ally.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 12, scalingStat: "intelligence", scalingFactor: 1.1 },
      {
        kind: "heal",
        basePower: 6,
        scalingStat: "intelligence",
        scalingFactor: 0.4,
        targetingOverride: "ally_lowest_hp",
      },
    ],
  },
  stage2: {
    name: "Binding Lash",
    summary: "Harder lash with a larger sustain tick and a shield top-up.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 14, scalingStat: "intelligence", scalingFactor: 1.2 },
      {
        kind: "heal",
        basePower: 8,
        scalingStat: "intelligence",
        scalingFactor: 0.5,
        targetingOverride: "ally_lowest_hp",
      },
    ],
  },
  stage3: {
    name: "Clearing Lash",
    summary: "Committed strike that cleanses up to two statuses on the team.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 17, scalingStat: "intelligence", scalingFactor: 1.3 },
      { kind: "cleanse_status", count: 2, targetingOverride: "ally_most_injured" },
    ],
  },
  ultimate: {
    name: "Standing Care",
    summary: "Full-team stabilize pass with extended regeneration and a brief fortify.",
    targeting: "all_allies",
    effects: [
      { kind: "heal", basePower: 26, scalingStat: "intelligence", scalingFactor: 1.1 },
      { kind: "apply_status", statusId: "regenerating", duration: 3, potency: 1 },
      { kind: "apply_status", statusId: "fortified", duration: 1, potency: 1 },
    ],
  },
  passive: {
    name: "Steady Hands",
    summary: "Basic stage sustain ticks carry slightly further through training.",
    effects: [{ kind: "modify_stat", stat: "intelligence", delta: 2, duration: 999 }],
  },
};

// ── Unique packages (U rank, deterministic unlock only) ──────────────────

const UNIQUE_FIELD_LEAD_KINETIC: CombatPackageTemplate = {
  id: "package/field-lead/kinetic/unique/anchor-absolute",
  name: "Anchor Absolute",
  description:
    "Signature unique field-lead package. Still obeys +1 block per basic and one ultimate payload, but carries signature riders reserved for endgame unlocks.",
  legalRoleTags: ["role:field_lead"],
  legalAttunementTags: ["attunement:kinetic"],
  legalRankPool: ["u"],
  stage1: {
    name: "Anchor Strike",
    summary: "An anchor-grade opening blow.",
    targeting: "enemy_single",
    effects: [{ kind: "damage", basePower: 16, scalingStat: "strength", scalingFactor: 1.2 }],
  },
  stage2: {
    name: "Anchor Pressure",
    summary: "An anchor follow-up that rattles formations.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 19, scalingStat: "strength", scalingFactor: 1.3 },
      { kind: "apply_status", statusId: "staggered", duration: 1, potency: 1 },
    ],
  },
  stage3: {
    name: "Anchor Collapse",
    summary: "A structure-cracking anchor strike.",
    targeting: "enemy_single",
    effects: [
      { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.4 },
      { kind: "apply_status", statusId: "exposed", duration: 1, potency: 1 },
    ],
  },
  ultimate: {
    name: "Anchor Absolute",
    summary: "Commits the anchor break with a sustained team damage window.",
    targeting: "enemy_highest_threat",
    effects: [
      { kind: "damage", basePower: 38, scalingStat: "strength", scalingFactor: 1.6 },
      { kind: "ally_damage_bonus", multiplier: 0.3, duration: 2, targetingOverride: "all_allies" },
    ],
  },
  passive: {
    name: "Anchor Presence",
    summary:
      "Anchor presence steadies the line, granting a small resilience bump to the whole team.",
    effects: [{ kind: "modify_stat", stat: "resilience", delta: 3, duration: 999 }],
  },
};

// ── Registry ─────────────────────────────────────────────────────────────

export const COMBAT_PACKAGES: readonly CombatPackageTemplate[] = [
  FIELD_LEAD_KINETIC_BASE,
  FIELD_LEAD_KINETIC_SENIOR,
  SCOUT_VOID_BASE,
  SCOUT_VOID_SENIOR,
  MEDIC_VITAL_BASE,
  MEDIC_VITAL_SENIOR,
  UNIQUE_FIELD_LEAD_KINETIC,
];

export interface CombatPackageRegistry {
  packages: readonly CombatPackageTemplate[];
  packageById: ReadonlyMap<string, CombatPackageTemplate>;
}

export function buildCombatPackageRegistry(
  packages: readonly CombatPackageTemplate[] = COMBAT_PACKAGES,
): CombatPackageRegistry {
  const packageById = new Map<string, CombatPackageTemplate>();
  for (const pkg of packages) {
    packageById.set(pkg.id, pkg);
  }
  return { packages, packageById };
}

// ── Validation ───────────────────────────────────────────────────────────

export interface CombatPackageValidationIssue {
  packageId: string;
  message: string;
}

function validatePayloadEffects(
  packageId: string,
  payloadName: string,
  effects: readonly AbilityEffect[],
  issues: CombatPackageValidationIssue[],
): void {
  if (effects.length === 0) {
    issues.push({ packageId, message: `${payloadName} has no effects.` });
    return;
  }
  for (const effect of effects) {
    if (effect.kind === "damage" && effect.basePower <= 0) {
      issues.push({
        packageId,
        message: `${payloadName} damage effect has non-positive basePower.`,
      });
    }
    if (effect.kind === "heal" && effect.basePower <= 0) {
      issues.push({ packageId, message: `${payloadName} heal effect has non-positive basePower.` });
    }
    if (effect.kind === "shield" && effect.basePower <= 0) {
      issues.push({
        packageId,
        message: `${payloadName} shield effect has non-positive basePower.`,
      });
    }
    if (effect.kind === "apply_status" && effect.duration <= 0) {
      issues.push({
        packageId,
        message: `${payloadName} status effect has non-positive duration.`,
      });
    }
  }
}

export function validateCombatPackages(
  registry: CombatPackageRegistry,
): readonly CombatPackageValidationIssue[] {
  const issues: CombatPackageValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const pkg of registry.packages) {
    if (pkg.id.trim().length === 0) {
      issues.push({ packageId: pkg.id, message: "Package id must be non-empty." });
    }
    if (seenIds.has(pkg.id)) {
      issues.push({ packageId: pkg.id, message: "Duplicate package id." });
    }
    seenIds.add(pkg.id);

    if (pkg.legalRoleTags.length === 0) {
      issues.push({
        packageId: pkg.id,
        message: "Package must declare at least one legal role tag.",
      });
    }
    if (pkg.legalAttunementTags.length === 0) {
      issues.push({
        packageId: pkg.id,
        message: "Package must declare at least one legal attunement tag.",
      });
    }
    if (pkg.legalRankPool.length === 0) {
      issues.push({ packageId: pkg.id, message: "Package must declare at least one legal rank." });
    }

    validatePayloadEffects(pkg.id, "stage1", pkg.stage1.effects, issues);
    validatePayloadEffects(pkg.id, "stage2", pkg.stage2.effects, issues);
    validatePayloadEffects(pkg.id, "stage3", pkg.stage3.effects, issues);
    validatePayloadEffects(pkg.id, "ultimate", pkg.ultimate.effects, issues);
    if (pkg.passive) {
      validatePayloadEffects(pkg.id, "passive", pkg.passive.effects, issues);
    }

    const hasPassive = pkg.passive !== undefined;
    const passiveAllowedRanks: CombatRank[] = ["c", "b", "a", "u"];
    if (hasPassive) {
      const onlyPassiveAllowedRanks = pkg.legalRankPool.every((rank) =>
        passiveAllowedRanks.includes(rank),
      );
      if (!onlyPassiveAllowedRanks) {
        issues.push({
          packageId: pkg.id,
          message: "Packages with a passive must be restricted to C-rank or higher.",
        });
      }
    }
  }

  return issues;
}

// ── Pool resolution (recruit generation) ─────────────────────────────────

/**
 * Resolve the legal package pool for a given role tag, attunement tag,
 * and target rank. Unique packages are excluded from the general pool and
 * only reachable through deterministic unlocks.
 */
export function findCombatPackagesForRecruit(
  registry: CombatPackageRegistry,
  roleTag: string,
  attunementTag: string,
  rank: CombatRank,
): readonly CombatPackageTemplate[] {
  if (rank === "u") {
    return [];
  }
  return registry.packages.filter(
    (pkg) =>
      pkg.legalRoleTags.includes(roleTag) &&
      pkg.legalAttunementTags.includes(attunementTag) &&
      pkg.legalRankPool.includes(rank),
  );
}

/**
 * Resolve a package template by id, falling back to the first legal package
 * for the (role, attunement, rank) triple if the id is missing. Used by the
 * runtime when hydrating saves or defaulting recruit combat.
 */
export function resolveCombatPackage(
  registry: CombatPackageRegistry,
  packageId: string,
): CombatPackageTemplate | undefined {
  return registry.packageById.get(packageId);
}
