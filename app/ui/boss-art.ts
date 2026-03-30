/** Boss encounter art resolver — maps bossId to encounter-grade SVG portrait paths. */

const BOSS_ART_MAP: Record<string, string> = {
  "boss/the-dispatcher": "/data/svg-environments/raids/bosses/the-dispatcher.svg",
  "boss/the-superintendent": "/data/svg-environments/raids/bosses/the-superintendent.svg",
  "boss/tunneler-brood-mother": "/data/svg-environments/raids/bosses/tunneler-brood-mother.svg",
  "boss/sewer-warden": "/data/svg-environments/raids/bosses/sewer-warden.svg",
  "boss/phantom-stalker": "/data/svg-environments/raids/bosses/phantom-stalker.svg",
  "boss/the-attendant": "/data/svg-environments/raids/bosses/the-attendant.svg",
};

/** Resolve a boss's encounter portrait SVG path, or null for unknown bosses. */
export function getBossArtPath(bossDefinitionId: string): string | null {
  return BOSS_ART_MAP[bossDefinitionId] ?? null;
}
