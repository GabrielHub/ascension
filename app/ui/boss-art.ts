import { resolveBossArtAssetUrl } from "lib/svg-asset-contract";

/** Resolve a boss's encounter portrait SVG path, or null for unknown bosses. */
export function getBossArtPath(bossDefinitionId: string): string | null {
  return resolveBossArtAssetUrl(bossDefinitionId);
}
