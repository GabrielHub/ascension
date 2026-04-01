/**
 * Audio state model — derives long-lived music state from runtime game state.
 * Audio never owns gameplay authority; it reacts to state.
 *
 * Ownership:
 * - Shell-owned: tab context, navigation cues
 * - Session-owned: command-diff one-shot cues
 * - Simulation-owned: autonomous raid/event/incident/guidance cues
 * - Selector-owned: music state (this module)
 */

// ─── Music state family ─────────────────────────────────────────────────────

/**
 * Primary music state, derived from the highest-priority active context.
 * Only one music state is active at a time. Priority order (highest first):
 *
 * 1. boss-encounter — active boss fight in progress
 * 2. boss-tension — boss threshold met, commitment pending
 * 3. raid-exploration — active raid teams in the field
 * 4. decompression — post-result review window
 * 5. operations — operations tab, no active raid context
 * 6. hq — headquarters tab (default fallback)
 */
export type MusicState =
  | "hq"
  | "operations"
  | "raid-exploration"
  | "boss-tension"
  | "boss-encounter"
  | "decompression";

// ─── Selector inputs ────────────────────────────────────────────────────────

export interface AudioStateInputs {
  /** Which shell tab is active. */
  activeTab: "hq" | "operations";
  /** Whether a boss encounter is currently in progress. */
  hasActiveEncounter: boolean;
  /** Whether any active raid has a pending boss commitment (approach phase). */
  hasBossApproach: boolean;
  /** Whether any raid teams are currently deployed and exploring. */
  hasActiveRaids: boolean;
  /** Whether the player is reviewing a completed result (contract/raid). */
  isReviewingResult: boolean;
}

// ─── Selectors ──────────────────────────────────────────────────────────────

export function selectMusicState(inputs: AudioStateInputs): MusicState {
  if (inputs.hasActiveEncounter) return "boss-encounter";
  if (inputs.hasBossApproach) return "boss-tension";
  if (inputs.hasActiveRaids) return "raid-exploration";
  if (inputs.isReviewingResult) return "decompression";
  if (inputs.activeTab === "operations") return "operations";
  return "hq";
}
