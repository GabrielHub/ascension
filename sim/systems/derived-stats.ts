import { EquipmentAssignment, InjuryState, OperatorIdentity } from "../components";
import type { SimSystemContext } from "./types";

// ── Interfaces ───────────────────────────────────────────────────────────

export interface OperatorBaseStats {
  strength: number;
  speed: number;
  endurance: number;
  resilience: number;
  perception: number;
  intelligence: number;
}

export interface StatModifier {
  source: string;
  stat: string;
  value: number;
}

export interface DerivedStatsResult {
  base: OperatorBaseStats;
  modifiers: readonly StatModifier[];
  effective: OperatorBaseStats;
  combatPower: number;
}

// ── Stat keys ────────────────────────────────────────────────────────────

const STAT_KEYS: readonly (keyof OperatorBaseStats)[] = [
  "strength",
  "speed",
  "endurance",
  "resilience",
  "perception",
  "intelligence",
] as const;

// ── Combat power weights ─────────────────────────────────────────────────

const COMBAT_POWER_WEIGHTS: Record<keyof OperatorBaseStats, number> = {
  strength: 1.2,
  speed: 1.0,
  endurance: 0.8,
  resilience: 1.0,
  perception: 0.7,
  intelligence: 0.5,
};

const COMBAT_POWER_DIVISOR = 5.2;

// ── Core functions ───────────────────────────────────────────────────────

/** Read base stats from the ECS operator entity. */
export function readOperatorBaseStats(entity: number): OperatorBaseStats {
  return {
    strength: OperatorIdentity.baseStrength[entity] ?? 0,
    speed: OperatorIdentity.baseSpeed[entity] ?? 0,
    endurance: OperatorIdentity.baseEndurance[entity] ?? 0,
    resilience: OperatorIdentity.baseResilience[entity] ?? 0,
    perception: OperatorIdentity.basePerception[entity] ?? 0,
    intelligence: OperatorIdentity.baseIntelligence[entity] ?? 0,
  };
}

/** Collect all stat modifiers for an operator (gear, injury, etc). */
export function collectStatModifiers(context: SimSystemContext, entity: number): StatModifier[] {
  const modifiers: StatModifier[] = [];
  const operatorId = OperatorIdentity.id[entity];

  // 1. Equipment modifiers — find the equipment entity for this operator
  const equipmentEntity = context.runtimeState.equipmentEntities.find(
    (candidate) => EquipmentAssignment.operatorId[candidate] === operatorId,
  );

  if (equipmentEntity !== undefined) {
    const slots: readonly { slotKey: "weaponId" | "outfitOverlayId" | "accessoryId" }[] = [
      { slotKey: "weaponId" },
      { slotKey: "outfitOverlayId" },
      { slotKey: "accessoryId" },
    ] as const;

    for (const { slotKey } of slots) {
      const itemId = EquipmentAssignment[slotKey][equipmentEntity];
      if (!itemId) continue;

      const itemTemplate = context.registry.itemById.get(itemId);
      if (!itemTemplate) continue;

      for (const effect of itemTemplate.statEffects) {
        modifiers.push({
          source: itemId,
          stat: effect.stat,
          value: effect.value,
        });
      }
    }
  }

  // 2. Injury penalty — proportional to severity
  const severity = InjuryState.severity[entity] ?? 0;
  if (severity > 0) {
    const penalty = -Math.floor(severity * 0.15);
    for (const stat of STAT_KEYS) {
      modifiers.push({
        source: "injury",
        stat,
        value: penalty,
      });
    }
  }

  return modifiers;
}

/** Compute the full derived stats for an operator. */
export function computeDerivedStats(context: SimSystemContext, entity: number): DerivedStatsResult {
  const base = readOperatorBaseStats(entity);
  const modifiers = collectStatModifiers(context, entity);

  // Sum modifiers per stat
  const bonuses: Record<string, number> = {};
  for (const modifier of modifiers) {
    bonuses[modifier.stat] = (bonuses[modifier.stat] ?? 0) + modifier.value;
  }

  // Compute effective stats (base + modifiers, clamped to minimum 1)
  const effective: OperatorBaseStats = {
    strength: Math.max(1, base.strength + (bonuses["strength"] ?? 0)),
    speed: Math.max(1, base.speed + (bonuses["speed"] ?? 0)),
    endurance: Math.max(1, base.endurance + (bonuses["endurance"] ?? 0)),
    resilience: Math.max(1, base.resilience + (bonuses["resilience"] ?? 0)),
    perception: Math.max(1, base.perception + (bonuses["perception"] ?? 0)),
    intelligence: Math.max(1, base.intelligence + (bonuses["intelligence"] ?? 0)),
  };

  // Compute combat power as weighted aggregate
  let weightedSum = 0;
  for (const stat of STAT_KEYS) {
    weightedSum += effective[stat] * COMBAT_POWER_WEIGHTS[stat];
  }
  const combatPower = weightedSum / COMBAT_POWER_DIVISOR;

  return { base, modifiers, effective, combatPower };
}
