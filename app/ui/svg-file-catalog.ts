import svgAssetCatalogData from "../../content/data/svg-asset-catalog.json";

export type SvgCatalogFamily = "operators" | "hq" | "raids" | "other";

export interface SvgCatalogAsset {
  id: string;
  url: string;
  path: string;
  directory: string;
  filename: string;
  label: string;
  family: SvgCatalogFamily;
  pack: string;
  stage: string;
  section: string | null;
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
