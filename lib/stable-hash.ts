/**
 * Character-weighted hash for deterministic selection from a stable string key.
 * Used by both save/appearance and sim/systems/commands for stable-but-varied
 * per-entity derivations.
 */
export function stableStringHash(source: string): number {
  return Array.from(source).reduce((total, character, index) => {
    return total + character.charCodeAt(0) * (index + 1);
  }, 0);
}
