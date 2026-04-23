import svgAssetCatalogData from "content/data/svg-asset-catalog.json";
import hqEnvironmentIndexData from "content/data/hq-environment-index.json";
import operatorPartsIndexData from "content/data/operator-parts-index.json";
import operatorRecipesData from "content/data/operator-recipes.json";
import raidEnvironmentIndexData from "content/data/raid-environment-index.json";
import { getBuildingLayoutDefinition, getBuildingSlot } from "content/building-layouts";

import { getRoomActiveFootprint } from "./hq-room-state";

export type SvgAssetUsage = "live" | "library" | "reference";
export type SvgAssetFamily = "hq" | "raid" | "operator";
export type SvgAssetStatus = "approved" | "exploration";

export interface SvgAssetEntry {
  id: string;
  label: string;
  family: SvgAssetFamily;
  usage: SvgAssetUsage;
  status: SvgAssetStatus;
  sourcePath: string;
  diskPath: string | null;
  contractRole: string;
  groups: {
    primary: string;
    secondary: string | null;
  };
  tags: readonly string[];
  bindingIds: readonly string[];
}

export interface HqRoomSceneBinding {
  kind: "hq-room-scene";
  id: string;
  label: string;
  family: "hq";
  usage: "live";
  status: SvgAssetStatus;
  buildingId: string;
  templateId: string;
  roomStateId: string;
  slotId: string;
  floorIndex: number;
  assetId: string;
}

export interface HqEnvironmentBinding {
  kind: "hq-environment";
  id: string;
  label: string;
  family: "hq";
  usage: "live";
  status: SvgAssetStatus;
  buildingId: string;
  bindingKey: string;
  assetId: string;
}

export interface RaidAssetBinding {
  kind: "raid-asset";
  id: string;
  label: string;
  family: "raid";
  usage: "live";
  status: SvgAssetStatus;
  partId: string;
  assetId: string;
}

export interface OperatorRecipeBinding {
  kind: "operator-recipe";
  id: string;
  label: string;
  family: "operator";
  usage: "live";
  status: SvgAssetStatus;
  recipeId: string;
  linkedAssetIds: readonly string[];
}

export type SvgRuntimeBinding =
  | HqRoomSceneBinding
  | HqEnvironmentBinding
  | RaidAssetBinding
  | OperatorRecipeBinding;

export interface SvgAssetRegistry {
  assets: readonly SvgAssetEntry[];
  bindings: readonly SvgRuntimeBinding[];
}

export interface SvgContractViolation {
  kind: "missing-file" | "missing-asset" | "duplicate-binding";
  message: string;
  assetId?: string;
  bindingId?: string;
}

interface SvgCatalogAsset {
  url: string;
  path: string;
  label: string;
  filename: string;
  family: "operators" | "hq" | "raids" | "other";
  stage: string;
  section: string | null;
}

interface HqPartMeta {
  id: string;
  category: "shell" | "structure" | "prop" | "scene" | "actor-marker" | "background";
  tags: string[];
  roomFamily: string | null;
  status: SvgAssetStatus;
}

interface HqManifestRecord {
  paths: {
    partsRoot: string;
    referenceRoot: string;
    recipesRoot: string;
  };
  parts: HqPartMeta[];
}

interface RaidPartMeta {
  id: string;
  category: "tile" | "feature" | "fog-treatment" | "marker" | "enemy";
  tags: string[];
  status: SvgAssetStatus;
  scale: string;
  concept: string | null;
}

interface OperatorPartMeta {
  id: string;
  category:
    | "weapon"
    | "outfit-overlay"
    | "accessory"
    | "head-shape"
    | "hair"
    | "eyes"
    | "face-detail"
    | "body-silhouette";
  tags: string[];
}

interface OperatorRecipeMeta {
  id: string;
  name: string;
  headShape: string;
  hair: string;
  eyes: string;
  faceDetail: string;
  bodySilhouette: string;
}

const svgCatalogAssets = (svgAssetCatalogData as { assets: SvgCatalogAsset[] }).assets;
const catalogByUrl = new Map(svgCatalogAssets.map((asset) => [asset.url, asset]));

const hqBuildings = (hqEnvironmentIndexData as { buildings: Record<string, HqManifestRecord> })
  .buildings;
const raidParts = (raidEnvironmentIndexData as { parts: RaidPartMeta[] }).parts;
const operatorParts = (operatorPartsIndexData as { parts: OperatorPartMeta[] }).parts;
const operatorRecipes = (operatorRecipesData as { recipes: OperatorRecipeMeta[] }).recipes;

export const HQ_PROP_ASSET_PATHS = {
  desk: "props/iso-desk-reception.svg",
  chair: "props/iso-chair-office.svg",
  cabinet: "props/iso-cabinet-filing.svg",
  table: "props/iso-table-folding.svg",
  couch: "props/iso-couch-worn.svg",
  stool: "props/iso-stool-bar.svg",
  counter: "props/iso-counter-reception.svg",
  bed: "props/iso-bed-medical.svg",
  medCabinet: "props/iso-cabinet-medical.svg",
  ivStand: "props/iso-iv-stand.svg",
  curtain: "props/iso-curtain-medical.svg",
  trayMedical: "props/iso-tray-medical.svg",
  bandages: "props/iso-bandages-box.svg",
  sign: "props/iso-sign-neon.svg",
  light: "props/iso-light-pendant.svg",
  shelf: "props/iso-shelf-wall.svg",
  corkboard: "props/iso-board-cork.svg",
  clock: "props/iso-clock-wall.svg",
  phone: "props/iso-phone-wall.svg",
  poster: "props/iso-poster-wanted.svg",
  monitor: "props/iso-screen-monitor.svg",
  plant: "props/iso-plant-potted.svg",
  mat: "props/iso-mat-floor.svg",
  rug: "props/iso-rug-floor.svg",
  box: "props/iso-box-cardboard.svg",
  bucket: "props/iso-bucket.svg",
  radio: "props/iso-radio-boombox.svg",
  waterCooler: "props/iso-cooler-water.svg",
  clipboard: "props/iso-clipboard-stack.svg",
  bottles: "props/iso-bottles-shelf.svg",
  register: "props/iso-register-cash.svg",
  punchBag: "props/iso-bag-punching.svg",
  bench: "background/iso-bg-bench.svg",
  coffeeMachine: "props/iso-coffee-machine.svg",
  menuBoard: "props/iso-menu-board.svg",
  microwave: "props/iso-microwave.svg",
  mopBroom: "props/iso-mop-broom.svg",
  pickledEggs: "props/iso-jar-pickled-eggs.svg",
  deliCase: "props/iso-deli-case.svg",
  firstAid: "props/iso-firstaid-wall.svg",
  milkCrate: "props/iso-crate-milk.svg",
  gearCrate: "props/iso-crate-gear.svg",
  guildLicense: "props/iso-license-guild.svg",
  posterMotivational: "props/iso-poster-motivational.svg",
  ceilingFan: "props/iso-fan-ceiling.svg",
  foodDebris: "props/iso-food-debris.svg",
} as const;

export type HqFallbackPropAssetKey = keyof typeof HQ_PROP_ASSET_PATHS;

const HQ_ROOM_SCENE_BINDINGS = [
  {
    buildingId: "building/bodega",
    templateId: "room/register:tier_1",
    roomStateId: "room-state/register:1",
    slotId: "slot/register",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-register.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/register:tier_1",
    roomStateId: "room-state/register:2",
    slotId: "slot/register",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-register-2.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/counter:tier_1",
    roomStateId: "room-state/counter:1",
    slotId: "slot/counter",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-counter.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/counter:tier_1",
    roomStateId: "room-state/counter:2",
    slotId: "slot/counter",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-counter-2.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/dining_area:tier_1",
    roomStateId: "room-state/dining-area:1",
    slotId: "slot/dining-area",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-dining-area.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/dining_area:tier_1",
    roomStateId: "room-state/dining-area:2",
    slotId: "slot/dining-area",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-dining-area-2.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/dining_area:tier_1",
    roomStateId: "room-state/dining-area:3",
    slotId: "slot/dining-area",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-dining-area-3.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/supply_closet:tier_1",
    roomStateId: "room-state/supply-closet:1",
    slotId: "slot/supply-closet",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-supply-closet.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/supply_closet:tier_1",
    roomStateId: "room-state/supply-closet:2",
    slotId: "slot/supply-closet",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-supply-closet-2.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/back_office:tier_1",
    roomStateId: "room-state/back_office:1",
    slotId: "slot/back-room-right",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-back-office.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/backstock:tier_1",
    roomStateId: "room-state/backstock:1",
    slotId: "slot/storage-left",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-backstock.svg",
  },
  {
    buildingId: "building/bodega",
    templateId: "room/alley_staging:tier_1",
    roomStateId: "room-state/alley_staging:1",
    slotId: "slot/storage-right",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/bodega/recipes/scene-the-alley.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/floor:tier_1",
    roomStateId: "room-state/floor:1",
    slotId: "slot/floor",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-floor.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/bar:tier_1",
    roomStateId: "room-state/bar:1",
    slotId: "slot/bar",
    floorIndex: 0,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-bar.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/office:tier_1",
    roomStateId: "room-state/office:1",
    slotId: "slot/office",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-office.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/stockroom:tier_1",
    roomStateId: "room-state/stockroom:1",
    slotId: "slot/stockroom",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-stockroom.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/infirmary:tier_1",
    roomStateId: "room-state/infirmary:1",
    slotId: "slot/infirmary",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-infirmary.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/gym:tier_1",
    roomStateId: "room-state/gym:1",
    slotId: "slot/gym",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-gym.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/prep_room:tier_1",
    roomStateId: "room-state/prep_room:1",
    slotId: "slot/prep-room",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-prep-room.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/break_room:tier_1",
    roomStateId: "room-state/break_room:1",
    slotId: "slot/break-room",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-break-room.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/briefing_room:tier_1",
    roomStateId: "room-state/briefing_room:1",
    slotId: "slot/briefing-room",
    floorIndex: 1,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-briefing-room.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/dock:tier_1",
    roomStateId: "room-state/dock:1",
    slotId: "slot/dock",
    floorIndex: 2,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-dock.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/deck:tier_1",
    roomStateId: "room-state/deck:1",
    slotId: "slot/deck",
    floorIndex: 2,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-deck.svg",
  },
  {
    buildingId: "building/porters",
    templateId: "room/workshop:tier_1",
    roomStateId: "room-state/workshop:1",
    slotId: "slot/workshop",
    floorIndex: 2,
    assetId: "/data/svg-environments/hq/porters/recipes/scene-the-workshop.svg",
  },
] as const;

const BOSS_ART_ASSET_PATHS: Record<string, string> = {
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
  "boss/the-dockmaster": "/data/svg-environments/raids/bosses/the-dockmaster.svg",
  "boss/the-manifest-clerk": "/data/svg-environments/raids/bosses/the-manifest-clerk.svg",
  "boss/the-revenue-agent": "/data/svg-environments/raids/bosses/the-revenue-agent.svg",
  "boss/the-lift-operator": "/data/svg-environments/raids/bosses/the-lift-operator.svg",
  "boss/the-ballast-master": "/data/svg-environments/raids/bosses/the-ballast-master.svg",
  "boss/the-signalman": "/data/svg-environments/raids/bosses/the-signalman.svg",
  "boss/the-excise-officer": "/data/svg-environments/raids/bosses/the-excise-officer.svg",
  "boss/the-yardmaster": "/data/svg-environments/raids/bosses/the-yardmaster.svg",
  "boss/the-regulator": "/data/svg-environments/raids/bosses/the-regulator.svg",
  "boss/the-surveyor": "/data/svg-environments/raids/bosses/the-surveyor.svg",
  "boss/the-market-maker": "/data/svg-environments/raids/bosses/the-market-maker.svg",
  "boss/the-concierge-prime": "/data/svg-environments/raids/bosses/the-concierge-prime.svg",
  "boss/the-foreman-prime": "/data/svg-environments/raids/bosses/the-foreman-prime.svg",
  "boss/the-stationmaster": "/data/svg-environments/raids/bosses/the-stationmaster.svg",
  "boss/the-curator-prime": "/data/svg-environments/raids/bosses/the-curator-prime.svg",
  "boss/the-altitude-keeper": "/data/svg-environments/raids/bosses/the-altitude-keeper.svg",
};

function titleCase(value: string): string {
  return value
    .split(/[-_/]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function sourcePathToLabel(sourcePath: string): string {
  return (
    catalogByUrl.get(sourcePath)?.label ?? titleCase(sourcePath.split("/").pop() ?? sourcePath)
  );
}

function buildHqPartUrl(buildingId: string, part: HqPartMeta): string {
  const manifest = hqBuildings[buildingId];
  const filename = part.id.split("/").pop() ?? part.id;

  if (part.status === "approved") {
    if (part.category === "scene") {
      return `${manifest.paths.recipesRoot}/${filename}.svg`;
    }

    return `${manifest.paths.partsRoot}/${part.id}.svg`;
  }

  return `${manifest.paths.referenceRoot}/${filename}.svg`;
}

function buildHqFallbackPropAssetUrl(buildingId: string, assetKey: HqFallbackPropAssetKey): string {
  return `${hqBuildings[buildingId].paths.partsRoot}/${HQ_PROP_ASSET_PATHS[assetKey]}`;
}

function resolveApprovedHqEnvironmentAssetUrl(
  buildingId: string,
  bindingKey: string,
): string | null {
  const findApprovedPart = (ownerBuildingId: string) =>
    hqBuildings[ownerBuildingId]?.parts.find(
      (part) => part.id === bindingKey && part.status === "approved" && part.category !== "scene",
    );

  const exactPart = findApprovedPart(buildingId);
  if (exactPart) {
    return buildHqPartUrl(buildingId, exactPart);
  }

  for (const ownerBuildingId of Object.keys(hqBuildings)) {
    if (ownerBuildingId === buildingId) {
      continue;
    }

    const sharedPart = findApprovedPart(ownerBuildingId);
    if (sharedPart) {
      return buildHqPartUrl(ownerBuildingId, sharedPart);
    }
  }

  return null;
}

const RAID_CANDIDATE_BUILDERS: Record<RaidPartMeta["category"], (basename: string) => string[]> = {
  tile: (basename) => [
    `/data/svg-environments/raids/parts/tiles/${basename}.svg`,
    `/data/svg-environments/raids/reference/tile-${basename}.svg`,
  ],
  feature: (basename) => [
    `/data/svg-environments/raids/parts/features/${basename}.svg`,
    `/data/svg-environments/raids/reference/feature-${basename}.svg`,
  ],
  "fog-treatment": (basename) => [
    `/data/svg-environments/raids/parts/fog/${basename}.svg`,
    `/data/svg-environments/raids/reference/fog-${basename}.svg`,
  ],
  marker: (basename) => [
    `/data/svg-environments/raids/parts/markers/${basename}.svg`,
    `/data/svg-environments/raids/reference/marker-${basename}.svg`,
  ],
  enemy: (basename) => [
    `/data/svg-environments/raids/enemies/${basename}.svg`,
    `/data/svg-environments/raids/enemies/${basename.replace(/^family-/, "")}.svg`,
    `/data/svg-environments/raids/enemies/${basename.replace(/^boss-/, "")}.svg`,
    `/data/svg-environments/raids/bosses/${basename.replace(/^boss-/, "")}.svg`,
    `/data/svg-environments/raids/reference/enemy-${basename}.svg`,
  ],
};

function resolveRaidAssetUrl(part: RaidPartMeta): string {
  const basename = part.id.split("/").pop() ?? "";
  const candidates = RAID_CANDIDATE_BUILDERS[part.category](basename);
  return candidates.find((candidate) => catalogByUrl.has(candidate)) ?? candidates[0];
}

function buildOperatorGearAssetUrl(partId: string): string {
  return `/data/svg-parts/operators/parts/${partId}.svg`;
}

function bumpUsage(current: SvgAssetUsage, next: SvgAssetUsage): SvgAssetUsage {
  const weight = { reference: 0, library: 1, live: 2 } as const;
  return weight[next] > weight[current] ? next : current;
}

let cachedRegistry: SvgAssetRegistry | null = null;
let cachedAssetIndexById: ReadonlyMap<string, SvgAssetEntry> | null = null;
let cachedBindingIndexById: ReadonlyMap<string, SvgRuntimeBinding> | null = null;
let cachedHqRoomBindingIndex: ReadonlyMap<string, HqRoomSceneBinding> | null = null;
let cachedHqEnvironmentBindingIndex: ReadonlyMap<string, HqEnvironmentBinding> | null = null;
let cachedRaidBindingIndex: ReadonlyMap<string, RaidAssetBinding> | null = null;

function getHqRoomBindingKey(buildingId: string, templateId: string, roomStateId: string): string {
  return `${buildingId}::${templateId}::${roomStateId}`;
}

function getHqEnvironmentBindingKey(buildingId: string, bindingKey: string): string {
  return `${buildingId}::${bindingKey}`;
}

export function getSvgAssetRegistry(): SvgAssetRegistry {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const assetMap = new Map<string, SvgAssetEntry>();
  const bindings: SvgRuntimeBinding[] = [];

  const upsertAsset = (
    sourcePath: string,
    input: Omit<SvgAssetEntry, "id" | "bindingIds"> & {
      id?: string;
      bindingIds?: readonly string[];
    },
  ) => {
    const existing = assetMap.get(sourcePath);
    if (existing) {
      assetMap.set(sourcePath, {
        ...existing,
        usage: bumpUsage(existing.usage, input.usage),
        status:
          existing.status === "approved" || input.status === "approved"
            ? "approved"
            : "exploration",
        tags: Array.from(new Set([...existing.tags, ...input.tags])),
        bindingIds: existing.bindingIds,
      });
      return;
    }

    assetMap.set(sourcePath, {
      id: sourcePath,
      label: input.label,
      family: input.family,
      usage: input.usage,
      status: input.status,
      sourcePath,
      diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
      contractRole: input.contractRole,
      groups: input.groups,
      tags: input.tags,
      bindingIds: input.bindingIds ?? [],
    });
  };

  const markAssetLive = (sourcePath: string) => {
    const existing = assetMap.get(sourcePath);
    if (!existing) {
      return;
    }
    assetMap.set(sourcePath, { ...existing, usage: "live" });
  };

  for (const [buildingId, manifest] of Object.entries(hqBuildings)) {
    for (const part of manifest.parts ?? []) {
      const sourcePath = buildHqPartUrl(buildingId, part);
      upsertAsset(sourcePath, {
        label: sourcePathToLabel(sourcePath),
        family: "hq",
        usage: "library",
        status: part.status,
        sourcePath,
        diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
        contractRole: `hq-${part.category}`,
        groups: {
          primary: buildingId.replace("building/", ""),
          secondary: part.category,
        },
        tags: part.tags,
      });

      if (part.status === "approved" && part.category !== "scene") {
        bindings.push({
          kind: "hq-environment",
          id: `hq-environment:${buildingId}:${part.id}`,
          label: `${titleCase(buildingId.replace("building/", ""))} ${sourcePathToLabel(sourcePath)}`,
          family: "hq",
          usage: "live",
          status: "approved",
          buildingId,
          bindingKey: part.id,
          assetId: sourcePath,
        });
        markAssetLive(sourcePath);
      }
    }
  }

  for (const asset of svgCatalogAssets) {
    if (asset.family === "hq" && asset.stage === "reference") {
      upsertAsset(asset.url, {
        label: asset.label,
        family: "hq",
        usage: "reference",
        status: "exploration",
        sourcePath: asset.url,
        diskPath: asset.path,
        contractRole: "hq-reference",
        groups: { primary: "reference", secondary: asset.section ?? "hq" },
        tags: ["reference"],
      });
    }
  }

  for (const bindingKey of Object.keys(HQ_PROP_ASSET_PATHS) as HqFallbackPropAssetKey[]) {
    const sourcePath = buildHqFallbackPropAssetUrl("building/bodega", bindingKey);
    upsertAsset(sourcePath, {
      label: sourcePathToLabel(sourcePath),
      family: "hq",
      usage: "live",
      status: "approved",
      sourcePath,
      diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
      contractRole: "hq-fallback-prop",
      groups: { primary: "bodega", secondary: "fallback-props" },
      tags: ["fallback", "prop"],
    });

    bindings.push({
      kind: "hq-environment",
      id: `hq-environment:building/bodega:${bindingKey}`,
      label: `HQ Fallback Prop: ${titleCase(bindingKey)}`,
      family: "hq",
      usage: "live",
      status: "approved",
      buildingId: "building/bodega",
      bindingKey,
      assetId: sourcePath,
    });
    markAssetLive(sourcePath);
  }

  for (const binding of HQ_ROOM_SCENE_BINDINGS) {
    const templateSuffix =
      binding.templateId.split("/").pop()?.replace(":tier_1", "") ?? binding.templateId;
    bindings.push({
      kind: "hq-room-scene",
      id: `hq-room:${binding.buildingId}:${binding.templateId}:${binding.roomStateId}`,
      label: `${titleCase(templateSuffix)} ${binding.roomStateId.split(":").pop()}`,
      family: "hq",
      usage: "live",
      status: "approved",
      buildingId: binding.buildingId,
      templateId: binding.templateId,
      roomStateId: binding.roomStateId,
      slotId: binding.slotId,
      floorIndex: binding.floorIndex,
      assetId: binding.assetId,
    });
    markAssetLive(binding.assetId);
  }

  for (const part of raidParts) {
    const sourcePath = resolveRaidAssetUrl(part);
    upsertAsset(sourcePath, {
      label: sourcePathToLabel(sourcePath),
      family: "raid",
      usage: part.status === "approved" ? "live" : "reference",
      status: part.status,
      sourcePath,
      diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
      contractRole: `raid-${part.category}`,
      groups: { primary: part.category, secondary: part.scale },
      tags: part.tags,
    });

    if (part.status === "approved") {
      bindings.push({
        kind: "raid-asset",
        id: `raid:${part.id}`,
        label: titleCase(part.id.split("/").pop() ?? part.id),
        family: "raid",
        usage: "live",
        status: "approved",
        partId: part.id,
        assetId: sourcePath,
      });
    }
  }

  for (const [bossId, sourcePath] of Object.entries(BOSS_ART_ASSET_PATHS)) {
    upsertAsset(sourcePath, {
      label: sourcePathToLabel(sourcePath),
      family: "raid",
      usage: "live",
      status: "approved",
      sourcePath,
      diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
      contractRole: "raid-boss-portrait",
      groups: { primary: "bosses", secondary: "encounter" },
      tags: ["boss", "encounter", "portrait"],
    });

    bindings.push({
      kind: "raid-asset",
      id: `boss-art:${bossId}`,
      label: titleCase(bossId.replace(/^boss\//, "")),
      family: "raid",
      usage: "live",
      status: "approved",
      partId: bossId,
      assetId: sourcePath,
    });
  }

  for (const part of operatorParts) {
    if (!["weapon", "outfit-overlay", "accessory"].includes(part.category)) {
      continue;
    }

    const sourcePath = buildOperatorGearAssetUrl(part.id);
    upsertAsset(sourcePath, {
      label: sourcePathToLabel(sourcePath),
      family: "operator",
      usage: "library",
      status: "approved",
      sourcePath,
      diskPath: catalogByUrl.get(sourcePath)?.path ?? null,
      contractRole: `operator-${part.category}`,
      groups: { primary: "gear", secondary: part.category },
      tags: part.tags,
    });
  }

  for (const recipe of operatorRecipes) {
    bindings.push({
      kind: "operator-recipe",
      id: `operator-recipe:${recipe.id}`,
      label: recipe.name,
      family: "operator",
      usage: "live",
      status: "approved",
      recipeId: recipe.id,
      linkedAssetIds: [],
    });
  }

  const assets = [...assetMap.values()].sort(
    (left, right) =>
      left.label.localeCompare(right.label) || left.sourcePath.localeCompare(right.sourcePath),
  );

  const bindingIdsByAsset = new Map<string, string[]>();
  for (const binding of bindings) {
    if ("assetId" in binding) {
      const existing = bindingIdsByAsset.get(binding.assetId) ?? [];
      existing.push(binding.id);
      bindingIdsByAsset.set(binding.assetId, existing);
    }
  }

  cachedRegistry = {
    assets: assets.map((asset) => ({
      ...asset,
      bindingIds: bindingIdsByAsset.get(asset.id) ?? [],
    })),
    bindings: bindings.sort((left, right) => left.label.localeCompare(right.label)),
  };
  cachedAssetIndexById = new Map(cachedRegistry.assets.map((asset) => [asset.id, asset]));
  cachedBindingIndexById = new Map(cachedRegistry.bindings.map((binding) => [binding.id, binding]));
  cachedHqRoomBindingIndex = new Map(
    cachedRegistry.bindings
      .filter((binding): binding is HqRoomSceneBinding => binding.kind === "hq-room-scene")
      .map((binding) => [
        getHqRoomBindingKey(binding.buildingId, binding.templateId, binding.roomStateId),
        binding,
      ]),
  );
  cachedHqEnvironmentBindingIndex = new Map(
    cachedRegistry.bindings
      .filter((binding): binding is HqEnvironmentBinding => binding.kind === "hq-environment")
      .map((binding) => [
        getHqEnvironmentBindingKey(binding.buildingId, binding.bindingKey),
        binding,
      ]),
  );
  cachedRaidBindingIndex = new Map(
    cachedRegistry.bindings
      .filter((binding): binding is RaidAssetBinding => binding.kind === "raid-asset")
      .map((binding) => [binding.partId, binding]),
  );
  return cachedRegistry;
}

export function getSvgAssets(): readonly SvgAssetEntry[] {
  return getSvgAssetRegistry().assets;
}

export function getSvgRuntimeBindings(): readonly SvgRuntimeBinding[] {
  return getSvgAssetRegistry().bindings;
}

export function findSvgAssetById(assetId: string): SvgAssetEntry | undefined {
  getSvgAssetRegistry();
  return cachedAssetIndexById?.get(assetId);
}

export function findSvgRuntimeBindingById(bindingId: string): SvgRuntimeBinding | undefined {
  getSvgAssetRegistry();
  return cachedBindingIndexById?.get(bindingId);
}

export function findHqRoomSceneBinding(
  buildingId: string,
  templateId: string,
  roomStateId: string,
): HqRoomSceneBinding | undefined {
  getSvgAssetRegistry();
  return cachedHqRoomBindingIndex?.get(getHqRoomBindingKey(buildingId, templateId, roomStateId));
}

export function resolveHqRoomSceneAssetUrl(
  buildingId: string,
  templateId: string,
  roomStateId: string,
): string | null {
  return findHqRoomSceneBinding(buildingId, templateId, roomStateId)?.assetId ?? null;
}

export function resolveHqEnvironmentAssetUrl(
  buildingId: string,
  bindingKey: string,
): string | null {
  getSvgAssetRegistry();
  const binding = cachedHqEnvironmentBindingIndex?.get(
    getHqEnvironmentBindingKey(buildingId, bindingKey),
  );
  return binding?.assetId ?? resolveApprovedHqEnvironmentAssetUrl(buildingId, bindingKey);
}

export function resolveRaidBindingAssetUrl(partId: string): string | null {
  getSvgAssetRegistry();
  const binding = cachedRaidBindingIndex?.get(partId);
  return binding?.assetId ?? null;
}

export function resolveRaidPartAssetUrl(partId: string): string | null {
  const approved = resolveRaidBindingAssetUrl(partId);
  if (approved) {
    return approved;
  }

  const basename = partId.split("/").pop() ?? "";
  const candidates = [
    `/data/svg-environments/raids/reference/${partId.replace(/\//g, "-")}.svg`,
    `/data/svg-environments/raids/reference/tile-${basename}.svg`,
    `/data/svg-environments/raids/reference/feature-${basename}.svg`,
    `/data/svg-environments/raids/reference/fog-${basename}.svg`,
    `/data/svg-environments/raids/reference/marker-${basename}.svg`,
    `/data/svg-environments/raids/reference/enemy-${basename}.svg`,
    `/data/svg-environments/raids/enemies/${basename.replace(/^family-/, "")}.svg`,
    `/data/svg-environments/raids/enemies/${basename.replace(/^boss-/, "")}.svg`,
    `/data/svg-environments/raids/bosses/${basename.replace(/^boss-/, "")}.svg`,
  ];

  return candidates.find((candidate) => catalogByUrl.has(candidate)) ?? null;
}

export function resolveOperatorPartAssetUrl(partId: string): string | null {
  const assetId = buildOperatorGearAssetUrl(partId);
  return findSvgAssetById(assetId)?.sourcePath ?? null;
}

export function resolveBossArtAssetUrl(bossDefinitionId: string): string | null {
  return resolveRaidBindingAssetUrl(bossDefinitionId);
}

function resolveHqBindingPreviewTier(binding: HqRoomSceneBinding): number {
  const definition = getBuildingLayoutDefinition(binding.buildingId);
  if (!definition) {
    return 1;
  }

  const sortedStages = [...definition.stages].sort(
    (left, right) => left.minimumTier - right.minimumTier,
  );
  const matchingStage = sortedStages.find((stage) =>
    stage.floors.some(
      (floor) =>
        floor.floorIndex === binding.floorIndex &&
        floor.slots.some((slot) => slot.slotId === binding.slotId),
    ),
  );

  return matchingStage?.minimumTier ?? 1;
}

export function getHqBindingPreviewFootprint(binding: HqRoomSceneBinding) {
  const buildingTier = resolveHqBindingPreviewTier(binding);
  const slot = getBuildingSlot(
    binding.buildingId,
    binding.slotId,
    binding.floorIndex,
    buildingTier,
  );
  if (!slot) {
    return null;
  }

  const stateLevel = Number.parseInt(binding.roomStateId.split(":").pop() ?? "1", 10);

  return {
    buildingTier,
    reservedFootprint: {
      col: slot.col,
      row: slot.row,
      cols: slot.cols,
      rows: slot.rows,
    },
    activeFootprint: getRoomActiveFootprint(
      binding.templateId,
      {
        col: slot.col,
        row: slot.row,
        cols: slot.cols,
        rows: slot.rows,
      },
      Number.isFinite(stateLevel) ? stateLevel : 1,
    ),
  };
}

export function getSvgContractViolations(): SvgContractViolation[] {
  const registry = getSvgAssetRegistry();
  const violations: SvgContractViolation[] = [];
  const seenBindings = new Set<string>();

  for (const asset of registry.assets) {
    if (!catalogByUrl.has(asset.sourcePath)) {
      violations.push({
        kind: "missing-file",
        message: `Contracted asset is missing from the SVG catalog: ${asset.sourcePath}`,
        assetId: asset.id,
      });
    }
  }

  for (const binding of registry.bindings) {
    if (seenBindings.has(binding.id)) {
      violations.push({
        kind: "duplicate-binding",
        message: `Duplicate SVG runtime binding "${binding.id}"`,
        bindingId: binding.id,
      });
    }
    seenBindings.add(binding.id);

    if ("assetId" in binding && !findSvgAssetById(binding.assetId)) {
      violations.push({
        kind: "missing-asset",
        message: `Runtime binding "${binding.id}" points at an unknown asset "${binding.assetId}"`,
        bindingId: binding.id,
        assetId: binding.assetId,
      });
    }
  }

  return violations;
}
