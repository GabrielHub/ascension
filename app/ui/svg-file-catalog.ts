import svgAssetCatalogData from "../../content/data/svg-asset-catalog.json";

export type SvgCatalogView = "hq-rooms" | "hq-parts" | "raids" | "equipment" | "reference";

export interface SvgCatalogAsset {
  id: string;
  url: string;
  path: string;
  directory: string;
  filename: string;
  label: string;
  family: "operators" | "hq" | "raids" | "other";
  pack: string;
  stage: string;
  section: string | null;
  view: SvgCatalogView;
  subGroup: string | null;
  roomBaseName: string | null;
  tier: number | null;
}

export interface SvgAssetCatalog {
  description: string;
  generatedFrom: string;
  assets: readonly SvgCatalogAsset[];
}

export function getLoadedSvgAssetCatalog(): SvgAssetCatalog {
  return svgAssetCatalogData as SvgAssetCatalog;
}

export function getLoadedSvgCatalogAssets(): readonly SvgCatalogAsset[] {
  return getLoadedSvgAssetCatalog().assets;
}

export function getRoomGroups(assets: readonly SvgCatalogAsset[]): Map<string, SvgCatalogAsset[]> {
  const groups = new Map<string, SvgCatalogAsset[]>();
  for (const asset of assets) {
    if (asset.view !== "hq-rooms" || !asset.roomBaseName) continue;
    const existing = groups.get(asset.roomBaseName);
    if (existing) {
      existing.push(asset);
    } else {
      groups.set(asset.roomBaseName, [asset]);
    }
  }
  for (const tiers of groups.values()) {
    tiers.sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1));
  }
  return groups;
}
