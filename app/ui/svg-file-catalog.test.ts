import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getLoadedSvgAssetCatalog } from "./svg-file-catalog";

async function walkSvgFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkSvgFiles(fullPath);
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg")) {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
}

function toCatalogUrl(repoRoot: string, filePath: string): string {
  const relativePath = path
    .relative(path.join(repoRoot, "public"), filePath)
    .split(path.sep)
    .join("/");
  return `/${relativePath}`;
}

describe("svg file catalog", () => {
  it("tracks every shipped SVG file under public/data", async () => {
    const repoRoot = process.cwd();
    const publicDataDir = path.join(repoRoot, "public", "data");
    const svgFiles = await walkSvgFiles(publicDataDir);
    const expectedUrls = svgFiles.map((filePath) => toCatalogUrl(repoRoot, filePath)).sort();

    const catalog = getLoadedSvgAssetCatalog();
    const catalogUrls = [...catalog.assets].map((asset) => asset.url).sort();

    expect(catalogUrls).toEqual(expectedUrls);
  });

  it("includes key asset classes that were previously missing from the viewer", () => {
    const catalog = getLoadedSvgAssetCatalog();
    const urls = new Set(catalog.assets.map((asset) => asset.url));

    expect(urls.has("/data/svg-environments/hq/bodega/reference/room-the-counter.svg")).toBe(true);
    expect(urls.has("/data/svg-environments/raids/bosses/the-dispatcher.svg")).toBe(true);
    expect(urls.has("/data/svg-parts/operators/parts/weapon/katana.svg")).toBe(true);
  });
});
