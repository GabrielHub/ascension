/**
 * Canonical simulation-emitted cue IDs shared across runtime and audio layers.
 *
 * The simulation may emit only these IDs. The app audio layer can extend beyond
 * this list for UI-only cues, but it should derive runtime coverage from here.
 */
export const RUNTIME_CUE_IDS = [
  "hq.visitor",
  "hq.dismiss",
  "hq.relocation.offer",
  "hq.relocation.confirm",
  "hq.relocation.land",
  "raid.launch",
  "raid.boss.approach",
  "raid.boss.commit",
  "raid.boss.phase",
  "raid.boss.summon",
  "raid.boss.victory",
  "raid.boss.failure",
  "raid.return.success",
  "raid.return.failure",
  "raid.death",
  "raid.opportunity",
  "event.pressure",
  "event.incident.open",
  "event.interruption.open",
  "event.guidance.beat",
] as const;

export type RuntimeCueId = (typeof RUNTIME_CUE_IDS)[number];
