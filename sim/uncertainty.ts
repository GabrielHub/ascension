/**
 * Shared seeded uncertainty utility.
 *
 * All simulation-owned weighted outcomes, autonomous decisions, and
 * chance-driven gameplay systems should route through this utility
 * instead of using ad hoc randomness.
 *
 * Contract:
 * - Seeded: deterministic replay from the same seed.
 * - Simulation-owned: UI and render code must not create or advance RNG state.
 * - Inspectable: every weighted result carries contributing modifiers for debug surfaces.
 * - Extensible: the core API stays stable while new systems adopt it.
 */

// ── Seeded PRNG (xorshift128+) ───────────────────────────────────────────

export class SeededRng {
  private s0: number;
  private s1: number;

  constructor(seed: number) {
    // Initialize with splitmix64-style seeding to spread entropy
    let s = seed | 0;
    s = (s + 0x9e3779b9) | 0;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
    this.s0 = (s ^ (s >>> 16)) | 0;

    s = (seed + 0x9e3779b9 * 2) | 0;
    s = Math.imul(s ^ (s >>> 16), 0x85ebca6b);
    s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35);
    this.s1 = (s ^ (s >>> 16)) | 0;

    // Warm up
    for (let i = 0; i < 8; i++) this.nextRaw();
  }

  /** Raw 32-bit integer (internal use). */
  private nextRaw(): number {
    let s0 = this.s0;
    let s1 = this.s1;
    const result = (s0 + s1) | 0;

    s1 ^= s0;
    this.s0 = ((s0 << 23) | (s0 >>> 9)) ^ s1 ^ (s1 << 17);
    this.s1 = (s1 << 5) | (s1 >>> 27);

    return result;
  }

  /** Float in [0, 1). */
  float(): number {
    return (this.nextRaw() >>> 0) / 0x100000000;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.float() * (max - min + 1));
  }

  /** Boolean with given probability (0..1). */
  chance(probability: number): boolean {
    return this.float() < probability;
  }

  /** Fork a child RNG from the current state for parallel deterministic use. */
  fork(): SeededRng {
    const child = new SeededRng(0);
    child.s0 = this.nextRaw();
    child.s1 = this.nextRaw();
    return child;
  }
}

// ── Modifier tracking ─────────────────────────────────────────────────────

export interface UncertaintyModifier {
  label: string;
  value: number;
}

export interface UncertaintyResult<T> {
  outcome: T;
  roll: number;
  modifiers: readonly UncertaintyModifier[];
  total: number;
}

// ── Weighted choice ───────────────────────────────────────────────────────

export interface WeightedItem<T> {
  item: T;
  weight: number;
}

/**
 * Pick one item from a weighted list.
 * Items with higher weight are more likely to be chosen.
 * Returns the chosen item along with the roll value for inspection.
 */
export function weightedChoice<T>(
  rng: SeededRng,
  items: readonly WeightedItem<T>[],
): UncertaintyResult<T> {
  if (items.length === 0) {
    throw new Error("weightedChoice: empty items list");
  }

  const totalWeight = items.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  if (totalWeight <= 0) {
    // All weights zero or negative: uniform selection
    const index = rng.int(0, items.length - 1);
    return {
      outcome: items[index].item,
      roll: index,
      modifiers: items.map((entry) => ({ label: String(entry.item), value: entry.weight })),
      total: totalWeight,
    };
  }

  const roll = rng.float() * totalWeight;
  let cumulative = 0;

  for (const entry of items) {
    cumulative += Math.max(0, entry.weight);
    if (roll < cumulative) {
      return {
        outcome: entry.item,
        roll,
        modifiers: items.map((e) => ({ label: String(e.item), value: e.weight })),
        total: totalWeight,
      };
    }
  }

  // Fallback to last item (rounding edge case)
  return {
    outcome: items[items.length - 1].item,
    roll,
    modifiers: items.map((e) => ({ label: String(e.item), value: e.weight })),
    total: totalWeight,
  };
}

// ── Bounded roll / score check ────────────────────────────────────────────

/**
 * Roll a score check against a threshold.
 * Base value plus modifiers are summed, then compared against threshold.
 * The roll adds a bounded random factor.
 *
 * Returns whether the check passed plus the full breakdown.
 */
export function boundedRoll(
  rng: SeededRng,
  base: number,
  modifiers: readonly UncertaintyModifier[],
  threshold: number,
  variance: number = 20,
): UncertaintyResult<boolean> {
  const modifierTotal = modifiers.reduce((sum, m) => sum + m.value, 0);
  const roll = rng.float() * variance * 2 - variance; // [-variance, +variance)
  const total = base + modifierTotal + roll;

  return {
    outcome: total >= threshold,
    roll,
    modifiers,
    total,
  };
}

// ── Shuffle ───────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle in place, returns the same array. */
export function shuffle<T>(rng: SeededRng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

// ── Seed derivation ───────────────────────────────────────────────────────

/** Derive a numeric seed from a string key for deterministic forking. */
export function seedFromKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 0x5bd1e995);
    hash ^= hash >>> 15;
  }
  return hash;
}
