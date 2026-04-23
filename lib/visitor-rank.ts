import type { CombatRank } from "content/templates/combat-packages";
import { normalizeOperatorRank } from "./operator-combat";

/**
 * Map a visitor's quality score onto a concrete operator rank, gated by the
 * active building's contract rank ceiling.
 *
 * The bodega always produces `f`. Porter's opens `e` and `d` once quality
 * crosses the thresholds. The skyscraper spreads across `e`, `d`, and `c`,
 * giving the first real rank ladder inside the endgame HQ.
 *
 * Kept deterministic and inspectable: no RNG, just quality + ceiling.
 */
export function deriveRecruitRank(
  quality: number,
  buildingContractRankCeiling?: string,
): CombatRank {
  const ceiling = normalizeOperatorRank(buildingContractRankCeiling);

  if (ceiling === "f") return "f";

  if (ceiling === "e") {
    if (quality >= 45) return "e";
    return "f";
  }

  if (ceiling === "d") {
    if (quality >= 60) return "d";
    if (quality >= 40) return "e";
    return "f";
  }

  // Skyscraper (c ceiling) and any higher ceiling bridged later: we still
  // only emit up to `c` until the B/A/U plan ships.
  if (quality >= 65) return "c";
  if (quality >= 45) return "d";
  return "e";
}

/**
 * Display helper for pre-hire visitor cards. Returns the uppercase letter
 * matching the rank the visitor would actually be assigned at hire time.
 */
export function visitorQualityToRank(
  quality: number,
  buildingContractRankCeiling?: string,
): string {
  return deriveRecruitRank(quality, buildingContractRankCeiling).toUpperCase();
}
