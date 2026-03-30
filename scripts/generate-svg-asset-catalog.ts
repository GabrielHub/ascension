import { promises as fs } from "node:fs";
import path from "node:path";

interface SvgCatalogAsset {
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
}

interface SvgAssetCatalog {
  description: string;
  generatedFrom: string;
  assets: SvgCatalogAsset[];
}

const REPO_ROOT = process.cwd();
const PUBLIC_DATA_DIR = path.join(REPO_ROOT, "public", "data");
const OUTPUT_PATH = path.join(REPO_ROOT, "content", "data", "svg-asset-catalog.json");

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

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

function titleCaseToken(token: string): string {
  return token
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildAssetLabel(stem: string): string {
  return stem
    .replace(/^iso-bg-/, "")
    .replace(/^iso-/, "")
    .replace(/^scene-/, "")
    .replace(/^marker-/, "")
    .replace(/^room-/, "")
    .replace(/^the-/, "")
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function classifyAsset(urlPath: string): SvgCatalogAsset {
  const normalizedPath = urlPath.replace(/\\/g, "/");
  const segments = normalizedPath.replace(/^\//, "").split("/");
  const filename = segments.at(-1) ?? "";
  const stem = filename.replace(/\.svg$/i, "");
  const directory = `/${segments.slice(0, -1).join("/")}`;
  const id = normalizedPath.replace(/^\/data\//, "").replace(/\.svg$/i, "");

  let family: SvgCatalogAsset["family"] = "other";
  let pack = segments[1] ?? "other";
  let stage = segments[2] ?? "root";
  let section: string | null = segments[3] ?? null;

  if (segments[1] === "svg-parts" && segments[2] === "operators") {
    family = "operators";
    pack = "operators";
    stage = segments[3] ?? "parts";
    section = segments[4] ?? null;
  } else if (segments[1] === "svg-environments" && segments[2] === "hq") {
    family = "hq";
    pack = segments[3] ?? "unknown";
    stage = segments[4] ?? "unknown";
    section = segments[5] ?? null;
  } else if (segments[1] === "svg-environments" && segments[2] === "raids") {
    family = "raids";
    pack = "raids";
    stage = segments[3] ?? "unknown";
    section = stage === "parts" ? (segments[4] ?? null) : null;
  }

  return {
    id,
    url: normalizedPath,
    path: normalizedPath.replace(/^\//, ""),
    directory,
    filename,
    label: buildAssetLabel(stem) || titleCaseToken(stem),
    family,
    pack,
    stage,
    section,
  };
}

function sortAssets(left: SvgCatalogAsset, right: SvgCatalogAsset): number {
  return (
    left.family.localeCompare(right.family) ||
    left.pack.localeCompare(right.pack) ||
    left.stage.localeCompare(right.stage) ||
    (left.section ?? "").localeCompare(right.section ?? "") ||
    left.filename.localeCompare(right.filename)
  );
}

async function main() {
  const svgFiles = await walkSvgFiles(PUBLIC_DATA_DIR);
  const assets = svgFiles
    .map((filePath) => {
      const relativePath = toPosixPath(path.relative(path.join(REPO_ROOT, "public"), filePath));
      return classifyAsset(`/${relativePath}`);
    })
    .sort(sortAssets);

  const payload: SvgAssetCatalog = {
    description: "Full shipped SVG asset catalog generated from public/data/**/*.svg.",
    generatedFrom: "public/data/**/*.svg",
    assets,
  };

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${assets.length} SVG assets to ${OUTPUT_PATH}\n`);
}

await main();
