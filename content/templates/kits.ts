/**
 * Operator Kit System
 *
 * First-class structured combat content for operator abilities.
 * Every operator has a permanent kit defined by their attunement and role.
 * Kits execute through deterministic simulation rules during encounters.
 *
 * Design constraints:
 * - Effects use a constrained typed vocabulary, not opaque JSON blobs
 * - All templates are validated at registration time
 * - Targeting and timing rules are structured data, not freeform strings
 * - World-doc grounding: operational/workplace language, no fantasy jargon
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
  "taunted",
  "fortified",
  "hastened",
] as const;

export type StatusId = (typeof STATUS_IDS)[number];

// ── Targeting model ──────────────────────────────────────────────────────

export const TARGETING_RULES = [
  "self",
  "ally_single",
  "ally_lowest_hp",
  "ally_frontline",
  "ally_most_injured",
  "enemy_single",
  "enemy_lowest_hp",
  "enemy_highest_threat",
  "boss",
  "enemy_group_member",
  "all_allies",
  "all_enemies",
  "random_enemy",
  "random_ally",
  "summoned_enemy",
] as const;

export type TargetingRule = (typeof TARGETING_RULES)[number];

// ── Timing model ─────────────────────────────────────────────────────────

export const TIMING_RULES = [
  "action_turn",
  "reaction_window",
  "phase_transition",
  "turn_start",
  "turn_end",
  "ally_defeat_trigger",
  "self_hp_threshold",
  "encounter_start",
] as const;

export type TimingRule = (typeof TIMING_RULES)[number];

// ── Effect DSL ───────────────────────────────────────────────────────────

export type AbilityEffect =
  | { kind: "damage"; basePower: number; scalingStat: string; scalingFactor: number }
  | { kind: "heal"; basePower: number; scalingStat: string; scalingFactor: number }
  | { kind: "shield"; basePower: number; scalingStat: string; scalingFactor: number }
  | { kind: "apply_status"; statusId: StatusId; duration: number; potency: number }
  | { kind: "remove_status"; statusId: StatusId }
  | { kind: "cleanse_status"; count: number }
  | { kind: "modify_stat"; stat: string; delta: number; duration: number }
  | { kind: "modify_initiative"; delta: number }
  | { kind: "modify_threat"; delta: number }
  | { kind: "taunt"; duration: number }
  | { kind: "redirect_damage"; fraction: number; duration: number }
  | { kind: "grant_followup"; targetingOverride?: TargetingRule }
  | { kind: "prevent_defeat"; hpFloor: number }
  | { kind: "execute_threshold_bonus"; hpThreshold: number; bonusDamage: number }
  | { kind: "phase_interaction_bonus"; bonusDamage: number }
  | { kind: "boss_tag_counter"; tagId: string; reduction: number }
  | { kind: "boss_weakness_bonus"; multiplier: number }
  | { kind: "spawn_intel_window"; duration: number };

// ── AI selection hints ───────────────────────────────────────────────────

export type AiSelectionHint =
  | "prefer_low_hp_ally"
  | "prefer_high_threat_enemy"
  | "prefer_boss"
  | "prefer_when_guarded"
  | "prefer_when_exposed"
  | "prefer_phase_transition"
  | "prefer_opening"
  | "prefer_finishing"
  | "prefer_aoe_opportunity"
  | "use_on_cooldown";

// ── Ability template families ────────────────────────────────────────────

interface AbilityTemplateBase {
  id: string;
  name: string;
  summary: string;
  tags: readonly string[];
  attunementTag: string;
  roleTags: readonly string[];
  targeting: TargetingRule;
  effects: readonly AbilityEffect[];
  aiHints: readonly AiSelectionHint[];
  logTextKey: string;
}

export interface RegularAttackTemplate extends AbilityTemplateBase {
  family: "regular_attack";
  timing: "action_turn";
}

export interface SkillTemplate extends AbilityTemplateBase {
  family: "skill";
  timing: TimingRule;
  cooldown: number;
}

export interface UltimateTemplate extends AbilityTemplateBase {
  family: "ultimate";
  timing: TimingRule;
  cooldown: number;
  chargeCondition?: string;
}

export interface PassiveTemplate {
  id: string;
  family: "passive";
  name: string;
  summary: string;
  tags: readonly string[];
  attunementTag: string;
  roleTags: readonly string[];
  timing: TimingRule;
  effects: readonly AbilityEffect[];
  logTextKey: string;
}

export type AbilityTemplate =
  | RegularAttackTemplate
  | SkillTemplate
  | UltimateTemplate
  | PassiveTemplate;

// ── Kit resolution ───────────────────────────────────────────────────────

export interface ResolvedOperatorKit {
  regularAttack: RegularAttackTemplate;
  skill: SkillTemplate;
  ultimate: UltimateTemplate;
  passives: readonly PassiveTemplate[];
}

// ── Registry extension types ─────────────────────────────────────────────

export interface KitTemplateRegistry {
  regularAttacks: readonly RegularAttackTemplate[];
  skills: readonly SkillTemplate[];
  ultimates: readonly UltimateTemplate[];
  passives: readonly PassiveTemplate[];
  regularAttackById: ReadonlyMap<string, RegularAttackTemplate>;
  skillById: ReadonlyMap<string, SkillTemplate>;
  ultimateById: ReadonlyMap<string, UltimateTemplate>;
  passiveById: ReadonlyMap<string, PassiveTemplate>;
}

// ── Authored kit library ─────────────────────────────────────────────────
// Naming: operational/workplace language per world-doc content rules.
// Structure: one kit family per attunement×role combination.

// ── Regular attacks ──────────────────────────────────────────────────────

export const REGULAR_ATTACKS: readonly RegularAttackTemplate[] = [
  {
    id: "kit/kinetic-strike",
    family: "regular_attack",
    name: "Kinetic Strike",
    summary: "Channels attunement-enhanced force into a focused physical blow.",
    tags: ["attunement:kinetic", "damage"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:field_lead"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [{ kind: "damage", basePower: 12, scalingStat: "strength", scalingFactor: 1.2 }],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.kinetic_strike",
  },
  {
    id: "kit/void-cut",
    family: "regular_attack",
    name: "Void Cut",
    summary: "A precise spatial-displacement strike that bypasses surface armor.",
    tags: ["attunement:void", "damage", "armor-pierce"],
    attunementTag: "attunement:void",
    roleTags: ["role:scout"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [
      { kind: "damage", basePower: 10, scalingStat: "speed", scalingFactor: 1.0 },
      { kind: "apply_status", statusId: "exposed", duration: 1, potency: 10 },
    ],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.void_cut",
  },
  {
    id: "kit/vital-pulse",
    family: "regular_attack",
    name: "Vital Pulse",
    summary: "Disrupts hostile biological processes with an attunement-backed energy discharge.",
    tags: ["attunement:vital", "damage", "sustain"],
    attunementTag: "attunement:vital",
    roleTags: ["role:medic"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [
      { kind: "damage", basePower: 7, scalingStat: "intelligence", scalingFactor: 0.8 },
      { kind: "heal", basePower: 3, scalingStat: "intelligence", scalingFactor: 0.3 },
    ],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.vital_pulse",
  },
  {
    id: "kit/basic-strike",
    family: "regular_attack",
    name: "Standard Issue",
    summary: "A reliable baseline attack with no attunement specialization.",
    tags: ["damage", "generic"],
    attunementTag: "",
    roleTags: [],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [{ kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.8 }],
    aiHints: [],
    logTextKey: "attack.basic_strike",
  },
  {
    id: "kit/void-lance",
    family: "regular_attack",
    name: "Void Lance",
    summary: "Projects a narrow spatial tear at range, disrupting the target's position.",
    tags: ["attunement:void", "damage", "ranged"],
    attunementTag: "attunement:void",
    roleTags: ["role:field_lead"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [{ kind: "damage", basePower: 11, scalingStat: "perception", scalingFactor: 1.1 }],
    aiHints: ["prefer_boss"],
    logTextKey: "attack.void_lance",
  },
  {
    id: "kit/kinetic-snap",
    family: "regular_attack",
    name: "Kinetic Snap",
    summary: "A quick burst of kinetic force at close range.",
    tags: ["attunement:kinetic", "damage", "fast"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:scout"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [{ kind: "damage", basePower: 9, scalingStat: "speed", scalingFactor: 1.1 }],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.kinetic_snap",
  },
  {
    id: "kit/vital-drain",
    family: "regular_attack",
    name: "Vital Drain",
    summary: "Siphons biological energy from a hostile, converting it to minor self-repair.",
    tags: ["attunement:vital", "damage", "lifesteal"],
    attunementTag: "attunement:vital",
    roleTags: ["role:field_lead"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [
      { kind: "damage", basePower: 10, scalingStat: "endurance", scalingFactor: 1.0 },
      { kind: "heal", basePower: 4, scalingStat: "resilience", scalingFactor: 0.2 },
    ],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.vital_drain",
  },
  {
    id: "kit/kinetic-jab",
    family: "regular_attack",
    name: "Kinetic Jab",
    summary: "A fast, force-amplified jab that disrupts the target's stance.",
    tags: ["attunement:kinetic", "damage", "disrupt"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:medic"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [
      { kind: "damage", basePower: 8, scalingStat: "strength", scalingFactor: 0.9 },
      { kind: "modify_initiative", delta: -5 },
    ],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.kinetic_jab",
  },
  {
    id: "kit/void-flicker",
    family: "regular_attack",
    name: "Void Flicker",
    summary: "Rapid spatial micro-shifts create disorienting bursts of contact.",
    tags: ["attunement:void", "damage", "evasive"],
    attunementTag: "attunement:void",
    roleTags: ["role:medic"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [{ kind: "damage", basePower: 7, scalingStat: "perception", scalingFactor: 0.9 }],
    aiHints: [],
    logTextKey: "attack.void_flicker",
  },
  {
    id: "kit/vital-sting",
    family: "regular_attack",
    name: "Vital Sting",
    summary: "Injects a destabilizing biological pulse that causes persistent tissue damage.",
    tags: ["attunement:vital", "damage", "dot"],
    attunementTag: "attunement:vital",
    roleTags: ["role:scout"],
    targeting: "enemy_single",
    timing: "action_turn",
    effects: [
      { kind: "damage", basePower: 6, scalingStat: "speed", scalingFactor: 0.8 },
      { kind: "apply_status", statusId: "bleeding", duration: 2, potency: 5 },
    ],
    aiHints: ["prefer_high_threat_enemy"],
    logTextKey: "attack.vital_sting",
  },
];

// ── Skills ───────────────────────────────────────────────────────────────

export const SKILLS: readonly SkillTemplate[] = [
  // Kinetic × Field Lead
  {
    id: "kit/field-lead-skill",
    family: "skill",
    name: "Concussive Authority",
    summary:
      "Releases a focused kinetic shockwave that staggers the primary threat and shifts frontline pressure.",
    tags: ["attunement:kinetic", "damage", "control"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:field_lead"],
    targeting: "enemy_single",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "damage", basePower: 22, scalingStat: "strength", scalingFactor: 1.5 },
      { kind: "apply_status", statusId: "staggered", duration: 2, potency: 15 },
    ],
    aiHints: ["prefer_boss", "prefer_high_threat_enemy"],
    logTextKey: "skill.concussive_authority",
  },
  // Void × Scout
  {
    id: "kit/scout-skill",
    family: "skill",
    name: "Spatial Recon",
    summary:
      "Displaces through nearby space to map threats, exposing enemy weaknesses and gathering tactical data.",
    tags: ["attunement:void", "intel", "debuff"],
    attunementTag: "attunement:void",
    roleTags: ["role:scout"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "apply_status", statusId: "exposed", duration: 2, potency: 12 },
      { kind: "spawn_intel_window", duration: 2 },
    ],
    aiHints: ["prefer_opening", "prefer_boss"],
    logTextKey: "skill.spatial_recon",
  },
  // Vital × Medic
  {
    id: "kit/medic-skill",
    family: "skill",
    name: "Triage Protocol",
    summary:
      "Channels vital attunement into the most injured ally, accelerating tissue repair and clearing debilitating conditions.",
    tags: ["attunement:vital", "heal", "cleanse"],
    attunementTag: "attunement:vital",
    roleTags: ["role:medic"],
    targeting: "ally_most_injured",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "heal", basePower: 28, scalingStat: "intelligence", scalingFactor: 1.5 },
      { kind: "cleanse_status", count: 1 },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "skill.triage_protocol",
  },
  // Void × Field Lead
  {
    id: "kit/void-authority-skill",
    family: "skill",
    name: "Displacement Command",
    summary:
      "Warps spatial geometry around the team, repositioning the frontline and disrupting enemy formations.",
    tags: ["attunement:void", "control", "utility"],
    attunementTag: "attunement:void",
    roleTags: ["role:field_lead"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 4,
    effects: [
      { kind: "modify_initiative", delta: -15 },
      { kind: "apply_status", statusId: "slowed", duration: 2, potency: 10 },
    ],
    aiHints: ["prefer_aoe_opportunity"],
    logTextKey: "skill.displacement_command",
  },
  // Kinetic × Scout
  {
    id: "kit/kinetic-scout-skill",
    family: "skill",
    name: "Burst Advance",
    summary:
      "Explosive kinetic propulsion carries the scout behind enemy lines for a devastating flanking strike.",
    tags: ["attunement:kinetic", "damage", "mobility"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:scout"],
    targeting: "enemy_single",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "damage", basePower: 20, scalingStat: "speed", scalingFactor: 1.4 },
      { kind: "apply_status", statusId: "exposed", duration: 1, potency: 8 },
    ],
    aiHints: ["prefer_boss", "prefer_high_threat_enemy"],
    logTextKey: "skill.burst_advance",
  },
  // Vital × Field Lead
  {
    id: "kit/vital-lead-skill",
    family: "skill",
    name: "Resilience Anchor",
    summary:
      "Floods the frontline with vital energy, shielding the field lead and nearby allies from incoming damage.",
    tags: ["attunement:vital", "shield", "sustain"],
    attunementTag: "attunement:vital",
    roleTags: ["role:field_lead"],
    targeting: "self",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "shield", basePower: 20, scalingStat: "resilience", scalingFactor: 1.3 },
      { kind: "apply_status", statusId: "fortified", duration: 2, potency: 10 },
    ],
    aiHints: ["prefer_when_guarded"],
    logTextKey: "skill.resilience_anchor",
  },
  // Kinetic × Medic
  {
    id: "kit/kinetic-medic-skill",
    family: "skill",
    name: "Shockwave Stabilization",
    summary:
      "Uses kinetic pulses to reset an ally's biomechanics, clearing trauma and restoring function.",
    tags: ["attunement:kinetic", "heal", "cleanse"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:medic"],
    targeting: "ally_most_injured",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "heal", basePower: 22, scalingStat: "strength", scalingFactor: 1.0 },
      { kind: "remove_status", statusId: "staggered" },
      { kind: "remove_status", statusId: "bleeding" },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "skill.shockwave_stabilization",
  },
  // Void × Medic
  {
    id: "kit/void-medic-skill",
    family: "skill",
    name: "Phase Shift Ward",
    summary:
      "Creates a localized spatial pocket around a wounded ally, deflecting incoming threats while they recover.",
    tags: ["attunement:void", "shield", "protect"],
    attunementTag: "attunement:void",
    roleTags: ["role:medic"],
    targeting: "ally_most_injured",
    timing: "action_turn",
    cooldown: 3,
    effects: [
      { kind: "shield", basePower: 18, scalingStat: "perception", scalingFactor: 1.1 },
      { kind: "apply_status", statusId: "guarded", duration: 2, potency: 12 },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "skill.phase_shift_ward",
  },
  // Vital × Scout
  {
    id: "kit/vital-scout-skill",
    family: "skill",
    name: "Biotracker Pulse",
    summary:
      "Sends out a wave of vital energy that maps biological signatures, revealing concealed threats and weak points.",
    tags: ["attunement:vital", "intel", "debuff"],
    attunementTag: "attunement:vital",
    roleTags: ["role:scout"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 4,
    effects: [
      { kind: "apply_status", statusId: "marked", duration: 3, potency: 8 },
      { kind: "spawn_intel_window", duration: 2 },
    ],
    aiHints: ["prefer_opening"],
    logTextKey: "skill.biotracker_pulse",
  },
];

// ── Ultimates ────────────────────────────────────────────────────────────

export const ULTIMATES: readonly UltimateTemplate[] = [
  // Kinetic × Field Lead
  {
    id: "kit/field-lead-ultimate",
    family: "ultimate",
    name: "Seismic Override",
    summary:
      "Unleashes the full force of the field lead's kinetic attunement in a devastating area-of-effect assault.",
    tags: ["attunement:kinetic", "damage", "aoe"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:field_lead"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "damage", basePower: 35, scalingStat: "strength", scalingFactor: 2.0 },
      { kind: "apply_status", statusId: "staggered", duration: 2, potency: 20 },
    ],
    aiHints: ["prefer_aoe_opportunity", "prefer_finishing"],
    logTextKey: "ultimate.seismic_override",
  },
  // Void × Scout
  {
    id: "kit/scout-ultimate",
    family: "ultimate",
    name: "Dimensional Breach",
    summary:
      "Tears open a spatial rift that exposes every hostile's vulnerabilities and grants the team a critical intelligence window.",
    tags: ["attunement:void", "intel", "debuff", "aoe"],
    attunementTag: "attunement:void",
    roleTags: ["role:scout"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "damage", basePower: 18, scalingStat: "perception", scalingFactor: 1.5 },
      { kind: "apply_status", statusId: "exposed", duration: 3, potency: 20 },
      { kind: "spawn_intel_window", duration: 3 },
    ],
    aiHints: ["prefer_phase_transition", "prefer_boss"],
    logTextKey: "ultimate.dimensional_breach",
  },
  // Vital × Medic
  {
    id: "kit/medic-ultimate",
    family: "ultimate",
    name: "Mass Stabilization",
    summary:
      "Channels an overwhelming surge of vital energy through the entire team, healing wounds and purging debilitating conditions.",
    tags: ["attunement:vital", "heal", "cleanse", "aoe"],
    attunementTag: "attunement:vital",
    roleTags: ["role:medic"],
    targeting: "all_allies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "heal", basePower: 40, scalingStat: "intelligence", scalingFactor: 2.0 },
      { kind: "cleanse_status", count: 3 },
      { kind: "apply_status", statusId: "regenerating", duration: 3, potency: 8 },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "ultimate.mass_stabilization",
  },
  // Void × Field Lead
  {
    id: "kit/void-lead-ultimate",
    family: "ultimate",
    name: "Gravity Collapse",
    summary:
      "Inverts local spatial density, crushing enemies inward and suppressing their ability to act.",
    tags: ["attunement:void", "damage", "control", "aoe"],
    attunementTag: "attunement:void",
    roleTags: ["role:field_lead"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "damage", basePower: 30, scalingStat: "perception", scalingFactor: 1.8 },
      { kind: "apply_status", statusId: "suppressed", duration: 2, potency: 15 },
    ],
    aiHints: ["prefer_aoe_opportunity"],
    logTextKey: "ultimate.gravity_collapse",
  },
  // Kinetic × Scout
  {
    id: "kit/kinetic-scout-ultimate",
    family: "ultimate",
    name: "Hypersonic Barrage",
    summary:
      "Accelerates to extreme velocity, delivering a rapid chain of devastating kinetic impacts across all threats.",
    tags: ["attunement:kinetic", "damage", "aoe", "multi-hit"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:scout"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "damage", basePower: 28, scalingStat: "speed", scalingFactor: 2.2 },
      { kind: "apply_status", statusId: "bleeding", duration: 3, potency: 10 },
    ],
    aiHints: ["prefer_finishing", "prefer_aoe_opportunity"],
    logTextKey: "ultimate.hypersonic_barrage",
  },
  // Vital × Field Lead
  {
    id: "kit/vital-lead-ultimate",
    family: "ultimate",
    name: "Fortification Surge",
    summary:
      "Reinforces the entire team with an overwhelming pulse of vital energy, creating massive shields.",
    tags: ["attunement:vital", "shield", "sustain", "aoe"],
    attunementTag: "attunement:vital",
    roleTags: ["role:field_lead"],
    targeting: "all_allies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "shield", basePower: 35, scalingStat: "resilience", scalingFactor: 2.0 },
      { kind: "apply_status", statusId: "fortified", duration: 3, potency: 15 },
    ],
    aiHints: ["prefer_when_guarded"],
    logTextKey: "ultimate.fortification_surge",
  },
  // Kinetic × Medic
  {
    id: "kit/kinetic-medic-ultimate",
    family: "ultimate",
    name: "Resuscitation Burst",
    summary:
      "A massive kinetic-vital hybrid pulse that restores the most critical ally to near-full readiness.",
    tags: ["attunement:kinetic", "heal", "revive"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:medic"],
    targeting: "ally_most_injured",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "heal", basePower: 50, scalingStat: "strength", scalingFactor: 1.5 },
      { kind: "cleanse_status", count: 5 },
      { kind: "prevent_defeat", hpFloor: 1 },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "ultimate.resuscitation_burst",
  },
  // Void × Medic
  {
    id: "kit/void-medic-ultimate",
    family: "ultimate",
    name: "Sanctuary Fold",
    summary:
      "Folds local space into a protective enclave, shielding allies while rendering a portion of incoming damage ineffective.",
    tags: ["attunement:void", "shield", "protect", "aoe"],
    attunementTag: "attunement:void",
    roleTags: ["role:medic"],
    targeting: "all_allies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "shield", basePower: 30, scalingStat: "perception", scalingFactor: 1.6 },
      { kind: "apply_status", statusId: "guarded", duration: 3, potency: 18 },
      { kind: "redirect_damage", fraction: 0.3, duration: 3 },
    ],
    aiHints: ["prefer_low_hp_ally"],
    logTextKey: "ultimate.sanctuary_fold",
  },
  // Vital × Scout
  {
    id: "kit/vital-scout-ultimate",
    family: "ultimate",
    name: "Predator Mapping",
    summary:
      "Floods the encounter zone with bio-resonant markers, permanently revealing all enemy patterns and applying crippling debuffs.",
    tags: ["attunement:vital", "intel", "debuff", "aoe"],
    attunementTag: "attunement:vital",
    roleTags: ["role:scout"],
    targeting: "all_enemies",
    timing: "action_turn",
    cooldown: 8,
    effects: [
      { kind: "apply_status", statusId: "marked", duration: 5, potency: 15 },
      { kind: "apply_status", statusId: "exposed", duration: 3, potency: 12 },
      { kind: "damage", basePower: 15, scalingStat: "speed", scalingFactor: 1.2 },
    ],
    aiHints: ["prefer_boss", "prefer_opening"],
    logTextKey: "ultimate.predator_mapping",
  },
];

// ── Passives ─────────────────────────────────────────────────────────────

export const PASSIVES: readonly PassiveTemplate[] = [
  // Kinetic × Field Lead
  {
    id: "kit/field-lead-passive",
    family: "passive",
    name: "Frontline Presence",
    summary: "The field lead's kinetic aura reduces incoming damage for all frontline allies.",
    tags: ["attunement:kinetic", "defense", "aura"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:field_lead"],
    timing: "turn_start",
    effects: [{ kind: "modify_stat", stat: "resilience", delta: 3, duration: 0 }],
    logTextKey: "passive.frontline_presence",
  },
  // Void × Scout
  {
    id: "kit/scout-passive",
    family: "passive",
    name: "Threat Awareness",
    summary: "Heightened spatial perception grants the scout a persistent initiative advantage.",
    tags: ["attunement:void", "intel", "initiative"],
    attunementTag: "attunement:void",
    roleTags: ["role:scout"],
    timing: "encounter_start",
    effects: [{ kind: "modify_initiative", delta: 10 }],
    logTextKey: "passive.threat_awareness",
  },
  // Vital × Medic
  {
    id: "kit/medic-passive",
    family: "passive",
    name: "Triage Instinct",
    summary: "An instinctive vital-energy trickle stabilizes critically wounded allies each round.",
    tags: ["attunement:vital", "heal", "sustain"],
    attunementTag: "attunement:vital",
    roleTags: ["role:medic"],
    timing: "turn_end",
    effects: [{ kind: "heal", basePower: 5, scalingStat: "intelligence", scalingFactor: 0.4 }],
    logTextKey: "passive.triage_instinct",
  },
  // Void × Field Lead
  {
    id: "kit/void-lead-passive",
    family: "passive",
    name: "Spatial Dominance",
    summary: "Warps the local space around the field lead, making enemies slightly less effective.",
    tags: ["attunement:void", "debuff", "aura"],
    attunementTag: "attunement:void",
    roleTags: ["role:field_lead"],
    timing: "turn_start",
    effects: [{ kind: "modify_stat", stat: "speed", delta: -2, duration: 1 }],
    logTextKey: "passive.spatial_dominance",
  },
  // Kinetic × Scout
  {
    id: "kit/kinetic-scout-passive",
    family: "passive",
    name: "Momentum Read",
    summary: "Kinetic sensitivity detects enemy movement patterns, boosting the scout's evasion.",
    tags: ["attunement:kinetic", "defense", "evasion"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:scout"],
    timing: "encounter_start",
    effects: [{ kind: "modify_stat", stat: "speed", delta: 4, duration: 0 }],
    logTextKey: "passive.momentum_read",
  },
  // Vital × Field Lead
  {
    id: "kit/vital-lead-passive",
    family: "passive",
    name: "Living Bulwark",
    summary:
      "Vital attunement reinforces the field lead's constitution, granting passive regeneration.",
    tags: ["attunement:vital", "heal", "sustain"],
    attunementTag: "attunement:vital",
    roleTags: ["role:field_lead"],
    timing: "turn_end",
    effects: [{ kind: "heal", basePower: 4, scalingStat: "resilience", scalingFactor: 0.3 }],
    logTextKey: "passive.living_bulwark",
  },
  // Kinetic × Medic
  {
    id: "kit/kinetic-medic-passive",
    family: "passive",
    name: "Impact Absorption",
    summary:
      "Kinetic attunement absorbs excess combat energy and converts it to minor team healing.",
    tags: ["attunement:kinetic", "heal", "reactive"],
    attunementTag: "attunement:kinetic",
    roleTags: ["role:medic"],
    timing: "turn_end",
    effects: [{ kind: "heal", basePower: 3, scalingStat: "endurance", scalingFactor: 0.3 }],
    logTextKey: "passive.impact_absorption",
  },
  // Void × Medic
  {
    id: "kit/void-medic-passive",
    family: "passive",
    name: "Warp Triage",
    summary: "Spatial micro-warps redirect a fraction of incoming ally damage into empty space.",
    tags: ["attunement:void", "defense", "redirect"],
    attunementTag: "attunement:void",
    roleTags: ["role:medic"],
    timing: "turn_start",
    effects: [{ kind: "redirect_damage", fraction: 0.1, duration: 1 }],
    logTextKey: "passive.warp_triage",
  },
  // Vital × Scout
  {
    id: "kit/vital-scout-passive",
    family: "passive",
    name: "Predatory Instinct",
    summary:
      "Bio-resonance highlights targets below half health, granting bonus damage against them.",
    tags: ["attunement:vital", "damage", "execute"],
    attunementTag: "attunement:vital",
    roleTags: ["role:scout"],
    timing: "action_turn",
    effects: [{ kind: "execute_threshold_bonus", hpThreshold: 0.5, bonusDamage: 8 }],
    logTextKey: "passive.predatory_instinct",
  },
];

// ── Kit resolution helpers ───────────────────────────────────────────────

export function buildKitTemplateRegistry(
  regularAttacks: readonly RegularAttackTemplate[],
  skills: readonly SkillTemplate[],
  ultimates: readonly UltimateTemplate[],
  passives: readonly PassiveTemplate[],
): KitTemplateRegistry {
  return {
    regularAttacks,
    skills,
    ultimates,
    passives,
    regularAttackById: new Map(regularAttacks.map((a) => [a.id, a])),
    skillById: new Map(skills.map((s) => [s.id, s])),
    ultimateById: new Map(ultimates.map((u) => [u.id, u])),
    passiveById: new Map(passives.map((p) => [p.id, p])),
  };
}

const DEFAULT_REGULAR_ATTACK_ID = "kit/basic-strike";
const DEFAULT_SKILL_ID = "kit/field-lead-skill";
const DEFAULT_ULTIMATE_ID = "kit/field-lead-ultimate";
const DEFAULT_PASSIVE_ID = "kit/field-lead-passive";

export function resolveOperatorKit(
  kitRegistry: KitTemplateRegistry,
  kitIds: {
    regularAttackId: string;
    skillId: string;
    ultimateId: string;
    passiveIds: readonly string[];
  },
): ResolvedOperatorKit {
  const regularAttack =
    kitRegistry.regularAttackById.get(kitIds.regularAttackId) ??
    kitRegistry.regularAttackById.get(DEFAULT_REGULAR_ATTACK_ID)!;

  const skill =
    kitRegistry.skillById.get(kitIds.skillId) ?? kitRegistry.skillById.get(DEFAULT_SKILL_ID)!;

  const ultimate =
    kitRegistry.ultimateById.get(kitIds.ultimateId) ??
    kitRegistry.ultimateById.get(DEFAULT_ULTIMATE_ID)!;

  const passives = kitIds.passiveIds
    .map((id) => kitRegistry.passiveById.get(id))
    .filter((p): p is PassiveTemplate => p !== undefined);

  if (passives.length === 0) {
    const defaultPassive = kitRegistry.passiveById.get(DEFAULT_PASSIVE_ID);
    if (defaultPassive) {
      passives.push(defaultPassive);
    }
  }

  return { regularAttack, skill, ultimate, passives };
}

// ── Validation ───────────────────────────────────────────────────────────

export interface KitValidationIssue {
  templateId: string;
  message: string;
}

export function validateKitTemplates(registry: KitTemplateRegistry): readonly KitValidationIssue[] {
  const issues: KitValidationIssue[] = [];

  const seenIds = new Set<string>();

  function checkUniqueId(id: string) {
    if (seenIds.has(id)) {
      issues.push({ templateId: id, message: `Duplicate ability template id "${id}".` });
    }
    seenIds.add(id);
  }

  function checkEffects(id: string, effects: readonly AbilityEffect[]) {
    if (effects.length === 0) {
      issues.push({ templateId: id, message: "Ability has no effects." });
    }
    for (const effect of effects) {
      if (effect.kind === "damage" && effect.basePower <= 0) {
        issues.push({ templateId: id, message: "Damage effect has non-positive basePower." });
      }
      if (effect.kind === "heal" && effect.basePower <= 0) {
        issues.push({ templateId: id, message: "Heal effect has non-positive basePower." });
      }
      if (effect.kind === "apply_status" && effect.duration <= 0) {
        issues.push({ templateId: id, message: "Status effect has non-positive duration." });
      }
    }
  }

  for (const attack of registry.regularAttacks) {
    checkUniqueId(attack.id);
    checkEffects(attack.id, attack.effects);
  }
  for (const skill of registry.skills) {
    checkUniqueId(skill.id);
    checkEffects(skill.id, skill.effects);
    if (skill.cooldown < 1) {
      issues.push({ templateId: skill.id, message: "Skill cooldown must be at least 1." });
    }
  }
  for (const ultimate of registry.ultimates) {
    checkUniqueId(ultimate.id);
    checkEffects(ultimate.id, ultimate.effects);
    if (ultimate.cooldown < 1) {
      issues.push({ templateId: ultimate.id, message: "Ultimate cooldown must be at least 1." });
    }
  }
  for (const passive of registry.passives) {
    checkUniqueId(passive.id);
    if (passive.effects.length === 0) {
      issues.push({ templateId: passive.id, message: "Passive has no effects." });
    }
  }

  return issues;
}
