/** Boss encounter art resolver — maps bossId to encounter-grade SVG portrait paths. */

const BOSS_ART_MAP: Record<string, string> = {
  "boss/the-dispatcher": "/data/svg-environments/raids/bosses/the-dispatcher.svg",
  "boss/the-superintendent": "/data/svg-environments/raids/bosses/the-superintendent.svg",
  "boss/the-super": "/data/svg-environments/raids/bosses/the-superintendent.svg",
  "boss/tunneler-brood-mother": "/data/svg-environments/raids/bosses/tunneler-brood-mother.svg",
  "boss/sewer-warden": "/data/svg-environments/raids/bosses/sewer-warden.svg",
  "boss/phantom-stalker": "/data/svg-environments/raids/bosses/phantom-stalker.svg",
  "boss/the-curator": "/data/svg-environments/raids/bosses/the-curator.svg",
  "boss/the-attendant": "/data/svg-environments/raids/bosses/the-attendant.svg",
  "boss/the-referee": "/data/svg-environments/raids/bosses/the-referee.svg",
  "boss/the-stockkeeper": "/data/svg-environments/raids/bosses/the-stockkeeper.svg",
  "boss/the-manicurist": "/data/svg-environments/raids/bosses/the-manicurist.svg",
  "boss/the-inspector": "/data/svg-environments/raids/bosses/the-inspector.svg",
  "boss/the-appraiser": "/data/svg-environments/raids/bosses/the-appraiser.svg",
  "boss/the-projectionist": "/data/svg-environments/raids/bosses/the-projectionist.svg",
  "boss/the-valve-master": "/data/svg-environments/raids/bosses/the-valve-master.svg",
  "boss/the-astronomer": "/data/svg-environments/raids/bosses/the-astronomer.svg",
  "boss/the-engineer": "/data/svg-environments/raids/bosses/the-engineer.svg",
  "boss/the-director": "/data/svg-environments/raids/bosses/the-director.svg",
  "boss/the-researcher": "/data/svg-environments/raids/bosses/the-researcher.svg",
};

/** Resolve a boss's encounter portrait SVG path, or null for unknown bosses. */
export function getBossArtPath(bossDefinitionId: string): string | null {
  return BOSS_ART_MAP[bossDefinitionId] ?? null;
}
