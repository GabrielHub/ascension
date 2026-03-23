import type { OperatorCombatSnapshot } from "save";

export function deriveOperatorCombatDefaults(roleTag: string): OperatorCombatSnapshot {
  if (roleTag === "role:scout") {
    return {
      rank: "f",
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
    };
  }

  if (roleTag === "role:medic") {
    return {
      rank: "f",
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
    };
  }

  return {
    rank: "f",
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
  return cloneOperatorCombatSnapshot(combat ?? deriveOperatorCombatDefaults(roleTag));
}
