import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import { getBuildingLayout } from "content/building-layouts";
import { templateRegistry } from "content/templates";
import {
  createHqWorldSnapshot,
  HqWorldCanvas,
  composeHqWorldGeometry,
  type HqDebugOverlays,
  type HqWorldSnapshot,
} from "render";
import {
  getHqBindingPreviewFootprint,
  getSvgAssets,
  getSvgContractViolations,
  getSvgRuntimeBindings,
  type HqRoomSceneBinding,
  type SvgAssetEntry,
  type SvgAssetFamily,
  type SvgAssetStatus,
  type SvgAssetUsage,
  type SvgRuntimeBinding,
} from "lib/svg-asset-contract";

import {
  ENV_LIGHTING_PRESETS,
  envPartSvgPath,
  getEnvLightingPreset,
  getLoadedEnvParts,
  type EnvLightingPreset,
  type EnvPartMeta,
} from "./environment-parts";
import { titleCase } from "./_glossary";
import { resolveOperatorBuild } from "./operator-build";
import { getRecipeById } from "./operator-parts";
import { PortraitFromRecipe, type AppearanceRecipe } from "./_portrait-parts";
import { useLazyVisible, useSvgFetch } from "./_svg-preview";

type FamilyFilter = "" | SvgAssetFamily;
type ViewMode = "grid" | "detail";
type SortKey = "label-asc" | "label-desc" | "category" | "status" | "usage";

type ViewerRecordKind = "asset" | "binding";
const ROOM_SCENE_CATEGORY_KEY = "hq-room-scene";
const ROOM_SCENE_DEBUG_OVERLAYS = {
  showRoomBounds: true,
  showFootprints: false,
  showActiveBounds: false,
  showRoomLabels: false,
} satisfies HqDebugOverlays;

const USAGE_OPTIONS: readonly { value: SvgAssetUsage; label: string; hint: string }[] = [
  { value: "live", label: "Live", hint: "Runtime-bound assets" },
  { value: "library", label: "Library", hint: "Approved reusable inventory" },
  { value: "reference", label: "Reference", hint: "Research and review artifacts" },
];

const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
  { value: "label-asc", label: "Name (A → Z)" },
  { value: "label-desc", label: "Name (Z → A)" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status (approved first)" },
  { value: "usage", label: "Usage" },
];

interface ViewerRecord {
  kind: ViewerRecordKind;
  id: string;
  label: string;
  family: SvgAssetFamily;
  usage: SvgAssetUsage;
  status: SvgAssetStatus;
  detail: string;
  categoryKey: string;
  categoryLabel: string;
  roomFamily: string | null;
  buildingId: string | null;
  compareGroupKey: string | null;
  sourcePath: string | null;
  searchText: string;
  asset?: SvgAssetEntry;
  binding?: SvgRuntimeBinding;
  envPart?: EnvPartMeta | null;
}

interface ViewerFilters {
  usage: SvgAssetUsage;
  family: FamilyFilter;
  category: string;
  building: string;
  search: string;
}

interface CommandStripModel {
  search: string;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  usage: SvgAssetUsage;
  viewMode: ViewMode;
  disabledDetail: boolean;
  sort: SortKey;
  lighting: string;
  zoom: number;
  showGrid: boolean;
  showIsoAxes: boolean;
  navCollapsed: boolean;
  inspectorCollapsed: boolean;
  pinnedCount: number;
  resultCount: number;
}

interface CommandStripActions {
  onSearchChange: (next: string) => void;
  onUsageChange: (next: SvgAssetUsage) => void;
  onViewModeChange: (next: ViewMode) => void;
  onSortChange: (next: SortKey) => void;
  onLightingChange: (next: string) => void;
  onZoomChange: (next: number) => void;
  onShowGridChange: (next: boolean) => void;
  onShowIsoAxesChange: (next: boolean) => void;
  onNavCollapsedChange: (next: boolean) => void;
  onInspectorCollapsedChange: (next: boolean) => void;
  onClearPinned: () => void;
}

const ENV_CATEGORY_LABELS: Record<EnvPartMeta["category"], string> = {
  shell: "Shell",
  structure: "Structure",
  prop: "Props",
  scene: "Room Scenes",
  "actor-marker": "Markers",
  background: "Background",
};

function getEnvCategoryLabel(category: EnvPartMeta["category"]): string {
  return ENV_CATEGORY_LABELS[category] ?? titleCase(category.replace(/-/g, " "));
}

function getHqCategory(category: EnvPartMeta["category"]): {
  key: string;
  label: string;
} {
  return {
    key: category === "scene" ? ROOM_SCENE_CATEGORY_KEY : `hq-${category}`,
    label: getEnvCategoryLabel(category),
  };
}

function getSourcePathFromBinding(binding: SvgRuntimeBinding): string | null {
  if ("assetId" in binding) {
    return binding.assetId;
  }
  return null;
}

function buildPathToEnvPartIndex(parts: readonly EnvPartMeta[]): ReadonlyMap<string, EnvPartMeta> {
  return new Map(parts.map((part) => [envPartSvgPath(part), part]));
}

function getBindingCategory(
  binding: SvgRuntimeBinding,
  envPart: EnvPartMeta | null,
): {
  key: string;
  label: string;
} {
  if (binding.kind === "hq-room-scene") {
    return { key: ROOM_SCENE_CATEGORY_KEY, label: "Room Scenes" };
  }
  if (binding.kind === "hq-environment" && envPart) {
    return getHqCategory(envPart.category);
  }
  if (binding.kind === "operator-recipe") {
    return { key: "operator-recipe", label: "Operator Recipes" };
  }
  if (binding.kind === "raid-asset") {
    return { key: "raid-asset", label: "Raid Assets" };
  }
  return {
    key: binding.kind,
    label: titleCase(binding.kind.replace(/-/g, " ")),
  };
}

function getAssetCategory(
  asset: SvgAssetEntry,
  envPart: EnvPartMeta | null,
): {
  key: string;
  label: string;
} {
  if (envPart) {
    return getHqCategory(envPart.category);
  }

  const label =
    asset.contractRole === "hq-room-scene"
      ? "Room Scenes"
      : titleCase(asset.contractRole.replace(/-/g, " "));
  return { key: asset.contractRole, label };
}

function buildViewerRecordSearchText(record: ViewerRecord): string {
  const bindingTerms =
    record.binding?.kind === "hq-room-scene"
      ? [
          record.binding.buildingId,
          record.binding.templateId,
          record.binding.roomStateId,
          record.binding.slotId,
          record.envPart?.roomFamily ?? "",
        ]
      : record.binding?.kind === "hq-environment"
        ? [record.binding.buildingId, record.binding.bindingKey, record.envPart?.roomFamily ?? ""]
        : record.binding?.kind === "operator-recipe"
          ? [record.binding.recipeId]
          : record.binding?.kind === "raid-asset"
            ? [record.binding.partId]
            : [];

  const assetTerms = record.asset
    ? [
        record.asset.contractRole,
        record.asset.groups.primary,
        record.asset.groups.secondary ?? "",
        record.asset.tags.join(" "),
      ]
    : [];

  const envTerms = record.envPart
    ? [
        record.envPart.category,
        record.envPart.roomFamily ?? "",
        record.envPart.status,
        record.envPart.tags.join(" "),
      ]
    : [];

  return [
    record.label,
    record.id,
    record.detail,
    record.categoryLabel,
    record.family,
    record.usage,
    record.status,
    record.buildingId ?? "",
    record.roomFamily ?? "",
    record.sourcePath ?? "",
    ...bindingTerms,
    ...assetTerms,
    ...envTerms,
  ]
    .join(" ")
    .toLowerCase();
}

export function buildSvgAssetViewerRecords(
  assets: readonly SvgAssetEntry[],
  liveBindings: readonly SvgRuntimeBinding[],
  envParts: readonly EnvPartMeta[],
): ViewerRecord[] {
  const envPartsBySourcePath = buildPathToEnvPartIndex(envParts);

  const bindingRecords = liveBindings.map((binding) => {
    const sourcePath = getSourcePathFromBinding(binding);
    const envPart = sourcePath ? (envPartsBySourcePath.get(sourcePath) ?? null) : null;
    const category = getBindingCategory(binding, envPart);
    const roomFamily = envPart?.roomFamily ?? null;
    const buildingId =
      binding.kind === "hq-room-scene" || binding.kind === "hq-environment"
        ? binding.buildingId
        : null;
    const compareGroupKey =
      binding.kind === "hq-room-scene" ? `${binding.buildingId}:${binding.templateId}` : null;

    const detail =
      binding.kind === "hq-room-scene"
        ? `${binding.roomStateId} • ${roomFamily ?? binding.templateId.replace(/^room\//, "")}`
        : binding.kind === "hq-environment"
          ? `${binding.bindingKey} • ${category.label}`
          : binding.kind === "operator-recipe"
            ? binding.recipeId
            : binding.partId;

    const record: ViewerRecord = {
      kind: "binding",
      id: binding.id,
      label: binding.label,
      family: binding.family,
      usage: binding.usage,
      status: binding.status,
      detail,
      categoryKey: category.key,
      categoryLabel: category.label,
      roomFamily,
      buildingId,
      compareGroupKey,
      sourcePath,
      searchText: "",
      binding,
      envPart,
    };

    return {
      ...record,
      searchText: buildViewerRecordSearchText(record),
    };
  });

  const liveBindingSourcePaths = new Set(
    bindingRecords
      .map((record) => record.sourcePath)
      .filter((sourcePath): sourcePath is string => Boolean(sourcePath)),
  );

  const assetRecords = assets
    .filter((asset) => asset.usage !== "live" || !liveBindingSourcePaths.has(asset.sourcePath))
    .map((asset) => {
      const envPart = envPartsBySourcePath.get(asset.sourcePath) ?? null;
      const category = getAssetCategory(asset, envPart);
      const roomFamily = envPart?.roomFamily ?? null;
      const compareGroupKey =
        envPart?.category === "scene" ? `scene:${roomFamily ?? asset.id}` : null;

      const record: ViewerRecord = {
        kind: "asset",
        id: asset.id,
        label: asset.label,
        family: asset.family,
        usage: asset.usage,
        status: asset.status,
        detail: `${category.label} • ${asset.groups.primary}${asset.groups.secondary ? ` • ${asset.groups.secondary}` : ""}`,
        categoryKey: category.key,
        categoryLabel: category.label,
        roomFamily,
        buildingId: null,
        compareGroupKey,
        sourcePath: asset.sourcePath,
        searchText: "",
        asset,
        envPart,
      };

      return {
        ...record,
        searchText: buildViewerRecordSearchText(record),
      };
    });

  return [...bindingRecords, ...assetRecords].sort(
    (left, right) =>
      left.label.localeCompare(right.label) ||
      left.categoryLabel.localeCompare(right.categoryLabel) ||
      left.id.localeCompare(right.id),
  );
}

export function filterSvgAssetViewerRecords(
  records: readonly ViewerRecord[],
  filters: ViewerFilters,
): ViewerRecord[] {
  const q = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    if (record.usage !== filters.usage) {
      return false;
    }
    if (filters.family && record.family !== filters.family) {
      return false;
    }
    if (filters.category && record.categoryKey !== filters.category) {
      return false;
    }
    if (filters.building && record.buildingId !== filters.building) {
      return false;
    }
    if (q && !record.searchText.includes(q)) {
      return false;
    }
    return true;
  });
}

export function getRoomSceneComparisonIds(
  records: readonly ViewerRecord[],
  record: ViewerRecord | null,
): string[] {
  if (!record?.compareGroupKey) {
    return [];
  }

  return records
    .filter((candidate) => candidate.compareGroupKey === record.compareGroupKey)
    .sort((left, right) => {
      const leftLevel =
        left.binding?.kind === "hq-room-scene"
          ? Number.parseInt(left.binding.roomStateId.split(":").pop() ?? "0", 10)
          : 0;
      const rightLevel =
        right.binding?.kind === "hq-room-scene"
          ? Number.parseInt(right.binding.roomStateId.split(":").pop() ?? "0", 10)
          : 0;

      return leftLevel - rightLevel || left.label.localeCompare(right.label);
    })
    .map((candidate) => candidate.id);
}

function clampViewerZoom(nextZoom: number): number {
  return Math.max(0.25, Math.min(4, Number(nextZoom.toFixed(2))));
}

function getAdjacentRecordId(
  records: readonly ViewerRecord[],
  currentId: string | null,
  direction: 1 | -1,
): string | null {
  if (records.length === 0) return null;
  if (!currentId) return records[0]?.id ?? null;

  const index = records.findIndex((record) => record.id === currentId);
  if (index === -1) return records[0]?.id ?? null;

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= records.length) return null;
  return records[nextIndex]?.id ?? null;
}

function sortRecords(records: readonly ViewerRecord[], sortKey: SortKey): ViewerRecord[] {
  const copy = [...records];
  const statusWeight = (status: SvgAssetStatus) => (status === "approved" ? 0 : 1);
  const usageWeight = (usage: SvgAssetUsage) =>
    usage === "live" ? 0 : usage === "library" ? 1 : 2;
  copy.sort((a, b) => {
    switch (sortKey) {
      case "label-desc":
        return b.label.localeCompare(a.label);
      case "category":
        return a.categoryLabel.localeCompare(b.categoryLabel) || a.label.localeCompare(b.label);
      case "status":
        return statusWeight(a.status) - statusWeight(b.status) || a.label.localeCompare(b.label);
      case "usage":
        return usageWeight(a.usage) - usageWeight(b.usage) || a.label.localeCompare(b.label);
      case "label-asc":
      default:
        return a.label.localeCompare(b.label);
    }
  });
  return copy;
}

function stageBaseWidthForRecord(record: ViewerRecord): number {
  const scale = record.envPart?.scale;
  if (record.binding?.kind === "hq-room-scene" || scale === "room") {
    return 900;
  }
  if (scale === "building" || record.envPart?.category === "shell") {
    return 1040;
  }
  if (scale === "structure" || scale === "backdrop") {
    return 760;
  }
  if (scale === "marker") {
    return 320;
  }
  return 560;
}

function getRoomStateLevel(record: ViewerRecord): number {
  if (record.binding?.kind === "hq-room-scene") {
    return Number.parseInt(record.binding.roomStateId.split(":").pop() ?? "0", 10) || 0;
  }
  return 0;
}

function familyLabel(family: FamilyFilter): string {
  return family === "" ? "All families" : titleCase(family);
}

interface NavigatorTreeNode {
  key: string;
  testId: string;
  label: string;
  count: number;
  filters: { family: FamilyFilter; category: string; building: string };
  children: NavigatorTreeNode[];
}

function buildingLabel(buildingId: string): string {
  const tail = buildingId.split("/").pop() ?? buildingId;
  return titleCase(tail.replace(/[-_]/g, " "));
}

function formatFloorPlacementLabel(elevationBandId: string | null): string | null {
  return elevationBandId ? titleCase(elevationBandId.replace(/-/g, " ")) : null;
}

function getHqRoomBindingPlacementLabel(binding: HqRoomSceneBinding): string {
  const buildingName =
    templateRegistry.buildingById.get(binding.buildingId)?.name ??
    buildingLabel(binding.buildingId);
  const preview = getHqBindingPreviewFootprint(binding);
  const layout = getBuildingLayout(
    binding.buildingId,
    binding.floorIndex,
    preview?.buildingTier ?? 1,
  );
  const parts = [buildingName, `Floor ${binding.floorIndex + 1}`];
  const floorLabel = formatFloorPlacementLabel(layout?.elevationBandId ?? null);
  if (floorLabel) {
    parts.push(floorLabel);
  }
  return parts.join(" · ");
}

function buildingTestIdSegment(buildingId: string): string {
  return buildingId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function buildNavigatorTree(records: readonly ViewerRecord[]): NavigatorTreeNode[] {
  const byFamily = new Map<SvgAssetFamily, ViewerRecord[]>();
  for (const record of records) {
    const list = byFamily.get(record.family) ?? [];
    list.push(record);
    byFamily.set(record.family, list);
  }

  const families: SvgAssetFamily[] = ["hq", "raid", "operator"];
  const familyNodes: NavigatorTreeNode[] = [];

  for (const family of families) {
    const familyRecords = byFamily.get(family) ?? [];
    if (familyRecords.length === 0) continue;

    const byCategory = new Map<string, { label: string; records: ViewerRecord[] }>();
    for (const record of familyRecords) {
      const bucket = byCategory.get(record.categoryKey);
      if (bucket) {
        bucket.records.push(record);
      } else {
        byCategory.set(record.categoryKey, { label: record.categoryLabel, records: [record] });
      }
    }

    const categoryNodes: NavigatorTreeNode[] = [];
    const sortedCategories = [...byCategory.entries()].sort((a, b) =>
      a[1].label.localeCompare(b[1].label),
    );

    for (const [categoryKey, bucket] of sortedCategories) {
      const buildings = new Map<string, ViewerRecord[]>();
      for (const record of bucket.records) {
        if (!record.buildingId) continue;
        const list = buildings.get(record.buildingId) ?? [];
        list.push(record);
        buildings.set(record.buildingId, list);
      }

      const buildingNodes: NavigatorTreeNode[] = [...buildings.entries()]
        .sort((a, b) => buildingLabel(a[0]).localeCompare(buildingLabel(b[0])))
        .map(([buildingId, buildingRecords]) => ({
          key: `${family}:${categoryKey}:${buildingId}`,
          testId: `svg-nav-${family}-${categoryKey}-${buildingTestIdSegment(buildingId)}`,
          label: buildingLabel(buildingId),
          count: buildingRecords.length,
          filters: { family, category: categoryKey, building: buildingId },
          children: [],
        }));

      categoryNodes.push({
        key: `${family}:${categoryKey}`,
        testId: `svg-nav-${family}-${categoryKey}`,
        label: bucket.label,
        count: bucket.records.length,
        filters: { family, category: categoryKey, building: "" },
        children: buildingNodes,
      });
    }

    familyNodes.push({
      key: family,
      testId: `svg-nav-${family}`,
      label: family === "hq" ? "HQ" : titleCase(family),
      count: familyRecords.length,
      filters: { family, category: "", building: "" },
      children: categoryNodes,
    });
  }

  return familyNodes;
}

function EyebrowLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-xs font-medium uppercase tracking-[0.14em] text-gold/65 ${className}`.trim()}
    >
      {children}
    </span>
  );
}

function CopyButton({ value, label, testId }: { value: string; label: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const handle = useCallback(() => {
    if (!value || !navigator.clipboard?.writeText) return;
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        if (resetTimerRef.current !== null) {
          window.clearTimeout(resetTimerRef.current);
        }
        setCopied(true);
        resetTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => {
        setCopied(false);
      });
  }, [value]);

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={`Copy ${label}`}
      data-testid={testId}
      className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-1.5 py-0.5 text-xs text-silver/60 transition-colors hover:border-gold/40 hover:text-gold"
    >
      <svg
        viewBox="0 0 12 12"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      >
        <rect x="2.5" y="2.5" width="6" height="7" rx="1" />
        <path d="M4.5 4.5H5.5M4.5 6.5H6.5M4.5 8.5H6" />
      </svg>
      <span>{copied ? "copied" : "copy"}</span>
    </button>
  );
}

function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-silver/40">
      {keys.map((key) => (
        <kbd
          key={key}
          className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.6)] px-1 font-[family-name:var(--font-sans)] text-xs text-silver/70"
        >
          {key}
        </kbd>
      ))}
      <span className="lowercase">{label}</span>
    </span>
  );
}

function StatusPill({ status, usage }: { status: SvgAssetStatus; usage: SvgAssetUsage }) {
  const statusTone =
    status === "approved"
      ? "text-gold border-gold/25 bg-[rgba(200,168,76,0.12)]"
      : "text-ember border-[rgba(212,84,30,0.3)] bg-[rgba(212,84,30,0.08)]";
  const usageTone =
    usage === "live"
      ? "text-frost border-[rgba(110,184,224,0.3)] bg-[rgba(110,184,224,0.08)]"
      : usage === "library"
        ? "text-silver border-[rgba(200,168,76,0.12)] bg-[rgba(42,53,85,0.3)]"
        : "text-silver/70 border-[rgba(42,53,85,0.4)] bg-[rgba(42,53,85,0.2)]";
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center rounded-sm border px-1.5 py-[1px] text-xs font-medium uppercase tracking-[0.1em] ${statusTone}`}
      >
        {status}
      </span>
      <span
        className={`inline-flex items-center rounded-sm border px-1.5 py-[1px] text-xs font-medium uppercase tracking-[0.1em] ${usageTone}`}
      >
        {usage}
      </span>
    </span>
  );
}

function ComparePinButton({
  isPinned,
  onToggle,
  testId,
  labelMode = "short",
  className = "",
}: {
  isPinned: boolean;
  onToggle: () => void;
  testId: string;
  labelMode?: "short" | "full";
  className?: string;
}) {
  const tone = isPinned
    ? "border-gold/40 bg-[rgba(200,168,76,0.14)] text-gold"
    : labelMode === "full"
      ? "border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.5)] text-silver/75 hover:border-gold/30 hover:text-gold"
      : "border-[rgba(200,168,76,0.1)] text-silver/55 hover:border-gold/30 hover:text-gold";
  const layout =
    labelMode === "full"
      ? "justify-center rounded-md px-3 py-2 uppercase tracking-[0.1em]"
      : "rounded px-2 py-1";
  const label =
    labelMode === "full"
      ? isPinned
        ? "pinned to compare"
        : "pin to compare"
      : isPinned
        ? "pinned"
        : "pin";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPinned}
      aria-label={isPinned ? "Unpin from compare" : "Pin to compare"}
      data-testid={testId}
      className={`inline-flex items-center gap-1 border text-xs transition-colors ${layout} ${tone} ${className}`.trim()}
    >
      <svg
        viewBox="0 0 12 12"
        className={labelMode === "full" ? "h-3 w-3" : "h-2.5 w-2.5"}
        fill={isPinned ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        aria-hidden
      >
        <path d="M6 1.5l1.3 2.7 2.95.42-2.13 2.08.5 2.93L6 8.27l-2.62 1.38.5-2.93L1.75 4.62l2.95-.42z" />
      </svg>
      {label}
    </button>
  );
}

function SearchField({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="relative flex-1 min-w-[14rem]">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/45"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <circle cx="6.5" cy="6.5" r="5" />
        <path d="M10.5 10.5L14.5 14.5" />
      </svg>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search name · room · tag · source path"
        spellCheck={false}
        data-testid="svg-search"
        aria-label="Search assets and runtime bindings"
        className="w-full rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] py-2 pl-9 pr-14 text-xs text-silver-bright placeholder:text-silver/45 outline-none transition-colors focus:border-gold/45"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden items-center gap-1 text-xs text-silver/35 sm:inline-flex">
        <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.6)] px-1 text-silver/70">
          /
        </kbd>
      </span>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-silver/55 transition-colors hover:text-silver-bright"
          aria-label="Clear search"
          data-testid="svg-search-clear"
        >
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  testIdPrefix,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (next: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-stretch overflow-hidden rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "_any"}
            role="radio"
            aria-checked={active}
            data-testid={`${testIdPrefix}-${option.value || "all"}`}
            onClick={() => onChange(option.value)}
            title={option.hint ?? option.label}
            className={`relative px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
              active
                ? "bg-[rgba(200,168,76,0.14)] text-gold"
                : "text-silver/55 hover:text-silver-bright"
            } rounded-[4px]`}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SortControl({ value, onChange }: { value: SortKey; onChange: (next: SortKey) => void }) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.1em] text-gold/60">Sort</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        data-testid="svg-sort"
        aria-label="Sort records"
        className="rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] px-2 py-1.5 text-xs text-silver-bright outline-none transition-colors focus:border-gold/40 [&>option]:bg-void"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LightingPopover({
  activeId,
  onChange,
}: {
  activeId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = getEnvLightingPreset(activeId);

  useEffect(() => {
    if (!open) return;
    const handler = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (target && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="svg-lighting-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] px-2.5 py-1.5 text-xs text-silver-bright transition-colors hover:border-gold/40"
      >
        <span
          className="h-3 w-3 rounded-full border"
          style={{ backgroundColor: active.background, borderColor: active.border }}
          aria-hidden
        />
        <span className="uppercase tracking-[0.1em] text-gold/70">Light</span>
        <span className="text-silver/75">{active.label}</span>
        <svg
          viewBox="0 0 10 6"
          className={`h-2 w-2 text-silver/55 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Lighting presets"
          className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.95)] p-1 shadow-[0_12px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {ENV_LIGHTING_PRESETS.map((preset) => {
            const current = preset.id === activeId;
            return (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                data-testid={`svg-lighting-${preset.id}`}
                onClick={() => {
                  onChange(preset.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                  current
                    ? "bg-[rgba(200,168,76,0.12)] text-gold"
                    : "text-silver/70 hover:bg-[rgba(200,168,76,0.06)] hover:text-silver-bright"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: preset.background, borderColor: preset.border }}
                  aria-hidden
                />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ZoomPod({ zoom, onZoomChange }: { zoom: number; onZoomChange: (next: number) => void }) {
  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] text-xs">
      <button
        type="button"
        onClick={() => onZoomChange(clampViewerZoom(zoom - 0.25))}
        className="px-2 py-1.5 text-silver/60 transition-colors hover:text-gold"
        aria-label="Zoom out"
        data-testid="svg-zoom-out"
      >
        −
      </button>
      <span
        className="flex min-w-[3.5rem] items-center justify-center border-x border-[rgba(200,168,76,0.08)] px-2 font-[family-name:var(--font-display)] tabular-nums text-silver-bright"
        data-testid="svg-zoom-value"
        aria-live="polite"
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => onZoomChange(clampViewerZoom(zoom + 0.25))}
        className="px-2 py-1.5 text-silver/60 transition-colors hover:text-gold"
        aria-label="Zoom in"
        data-testid="svg-zoom-in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(1)}
        className="border-l border-[rgba(200,168,76,0.08)] px-2 py-1.5 text-silver/55 uppercase tracking-[0.1em] transition-colors hover:text-gold"
        aria-label="Reset zoom to 100%"
        data-testid="svg-zoom-fit"
      >
        fit
      </button>
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
  disabledDetail,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  disabledDetail: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="inline-flex items-stretch overflow-hidden rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] p-0.5"
    >
      {(["grid", "detail"] as const).map((mode) => {
        const active = mode === value;
        const isDisabled = mode === "detail" && disabledDetail;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={isDisabled}
            data-testid={`svg-view-${mode}`}
            onClick={() => !isDisabled && onChange(mode)}
            className={`flex items-center gap-1 rounded-[4px] px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors ${
              active
                ? "bg-[rgba(200,168,76,0.14)] text-gold"
                : isDisabled
                  ? "text-silver/25"
                  : "text-silver/55 hover:text-silver-bright"
            }`}
          >
            {mode === "grid" ? (
              <>
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden
                >
                  <rect x="1" y="1" width="4" height="4" rx="0.5" />
                  <rect x="7" y="1" width="4" height="4" rx="0.5" />
                  <rect x="1" y="7" width="4" height="4" rx="0.5" />
                  <rect x="7" y="7" width="4" height="4" rx="0.5" />
                </svg>
                Grid
              </>
            ) : (
              <>
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden
                >
                  <rect x="1" y="1" width="10" height="7" rx="0.5" />
                  <path d="M1 10H11" />
                </svg>
                Detail
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

function CommandStrip({
  model,
  actions,
}: {
  model: CommandStripModel;
  actions: CommandStripActions;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.7)] px-4 py-2 backdrop-blur-xl"
      data-testid="svg-command-strip"
    >
      <button
        type="button"
        onClick={() => actions.onNavCollapsedChange(!model.navCollapsed)}
        aria-label={model.navCollapsed ? "Expand library navigator" : "Collapse library navigator"}
        aria-pressed={model.navCollapsed}
        data-testid="svg-nav-collapse"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] text-silver/55 transition-colors hover:border-gold/30 hover:text-gold"
      >
        <svg
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform ${model.navCollapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M8 3l-4 3 4 3" />
        </svg>
      </button>
      <SearchField
        value={model.search}
        onChange={actions.onSearchChange}
        inputRef={model.searchInputRef}
      />
      <SegmentedControl
        label="Usage"
        value={model.usage}
        options={USAGE_OPTIONS}
        onChange={actions.onUsageChange}
        testIdPrefix="svg-usage"
      />
      <ViewToggle
        value={model.viewMode}
        onChange={actions.onViewModeChange}
        disabledDetail={model.disabledDetail}
      />
      <SortControl value={model.sort} onChange={actions.onSortChange} />
      <LightingPopover activeId={model.lighting} onChange={actions.onLightingChange} />
      <div className="inline-flex items-center gap-1">
        <OverlayToggle
          label="Grid"
          active={model.showGrid}
          onChange={actions.onShowGridChange}
          testId="svg-toggle-grid"
        />
        <OverlayToggle
          label="Axes"
          active={model.showIsoAxes}
          onChange={actions.onShowIsoAxesChange}
          testId="svg-toggle-axes"
        />
      </div>
      <ZoomPod zoom={model.zoom} onZoomChange={actions.onZoomChange} />

      <div className="ml-auto flex items-center gap-2 text-xs text-silver/55">
        <span data-testid="svg-result-count" className="tabular-nums">
          <span className="font-[family-name:var(--font-display)] text-silver-bright">
            {model.resultCount}
          </span>
          <span className="ml-1">in view</span>
        </span>
        {model.pinnedCount > 0 && (
          <>
            <span className="h-3 w-px bg-[rgba(200,168,76,0.14)]" />
            <button
              type="button"
              onClick={actions.onClearPinned}
              data-testid="svg-clear-selection"
              className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.14)] bg-[rgba(200,168,76,0.06)] px-2 py-1 text-gold transition-colors hover:border-gold/40"
              aria-label="Clear pinned selection"
            >
              <span className="tabular-nums">{model.pinnedCount}</span>
              <span>pinned</span>
              <svg
                viewBox="0 0 12 12"
                className="h-2.5 w-2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => actions.onInspectorCollapsedChange(!model.inspectorCollapsed)}
          aria-label={model.inspectorCollapsed ? "Expand inspector" : "Collapse inspector"}
          aria-pressed={model.inspectorCollapsed}
          data-testid="svg-inspector-collapse"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] text-silver/55 transition-colors hover:border-gold/30 hover:text-gold"
        >
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform ${
              model.inspectorCollapsed ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M8 3l-4 3 4 3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function NavigatorNode({
  node,
  level,
  isActive,
  onSelect,
}: {
  node: NavigatorTreeNode;
  level: number;
  isActive: (key: string) => boolean;
  onSelect: (node: NavigatorTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(level === 0);
  const active = isActive(node.key);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className="flex items-center">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
            className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-silver/45 hover:text-gold"
            data-testid={`${node.testId}-toggle`}
          >
            <svg
              viewBox="0 0 10 10"
              className={`h-2.5 w-2.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d="M3 1l4 4-4 4" />
            </svg>
          </button>
        ) : (
          <span className="mr-1 inline-block w-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          role="treeitem"
          aria-selected={active}
          aria-expanded={hasChildren ? expanded : undefined}
          onClick={() => onSelect(node)}
          data-testid={node.testId}
          className={`group flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 pl-2 pr-2 text-left text-xs transition-colors ${
            active
              ? "bg-[rgba(200,168,76,0.1)] text-gold"
              : "text-silver/70 hover:bg-[rgba(200,168,76,0.04)] hover:text-silver-bright"
          }`}
          style={{ paddingLeft: `${0.5 + level * 0.75}rem` }}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              active ? "bg-gold" : "bg-[rgba(200,168,76,0.3)]"
            }`}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          <span className={`tabular-nums text-xs ${active ? "text-gold/80" : "text-silver/40"}`}>
            {node.count}
          </span>
        </button>
      </div>
      {hasChildren && expanded && (
        <ul role="group" className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <NavigatorNode
              key={child.key}
              node={child}
              level={level + 1}
              isActive={isActive}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NavigatorRail({
  tree,
  activeKey,
  onSelect,
  onReset,
  totalCount,
}: {
  tree: NavigatorTreeNode[];
  activeKey: string;
  onSelect: (filters: { family: FamilyFilter; category: string; building: string }) => void;
  onReset: () => void;
  totalCount: number;
}) {
  const isActive = useCallback((key: string) => key === activeKey, [activeKey]);

  return (
    <aside
      className="flex min-h-0 w-full shrink-0 flex-col border-r border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] lg:w-[16rem]"
      data-testid="svg-nav"
      aria-label="Asset library navigator"
    >
      <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
        <div>
          <EyebrowLabel>Library</EyebrowLabel>
          <button
            type="button"
            onClick={onReset}
            data-testid="svg-nav-all"
            className={`mt-1 flex items-baseline gap-2 text-left font-[family-name:var(--font-display)] text-sm font-light tracking-[0.08em] transition-colors ${
              activeKey === "__all__" ? "text-gold" : "text-silver-bright hover:text-gold"
            }`}
          >
            <span>All families</span>
            <span className="text-xs text-silver/40 tabular-nums">{totalCount}</span>
          </button>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul
          role="tree"
          aria-label="Records grouped by family → category → building"
          className="space-y-0.5"
        >
          {tree.map((node) => (
            <NavigatorNode
              key={node.key}
              node={node}
              level={0}
              isActive={isActive}
              onSelect={(n) => onSelect(n.filters)}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function IsoGridBackdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <pattern
          id="iso-tile-grid"
          x="50%"
          y="50%"
          width="48"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 12 L24 0 L48 12 L24 24 Z"
            fill="none"
            stroke="rgba(200,168,76,0.32)"
            strokeWidth="0.7"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iso-tile-grid)" />
    </svg>
  );
}

function IsoAxesOverlay() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g stroke="rgba(110,184,224,0.65)" strokeWidth="0.5" fill="none" strokeLinecap="round">
        <path d="M100 100 L180 140" />
        <path d="M100 100 L20 140" />
        <path d="M100 100 L100 20" />
      </g>
      <g
        fill="rgba(224,232,236,0.96)"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize="2.8"
        letterSpacing="0.18"
        paintOrder="stroke"
        stroke="rgba(8,10,14,0.9)"
        strokeWidth="0.7"
      >
        <text x="183" y="142" textAnchor="start">
          x (row+)
        </text>
        <text x="17" y="142" textAnchor="end">
          y (col+)
        </text>
        <text x="103" y="18" textAnchor="start">
          z (up+)
        </text>
      </g>
      <circle cx="100" cy="100" r="1.5" fill="rgba(200,168,76,0.9)" />
    </svg>
  );
}

function SvgStage({
  src,
  alt,
  zoom,
  preset,
  width,
  minHeightClass = "min-h-[24rem]",
  onZoomChange,
  testId = "svg-stage",
  fillHeight = false,
  showGrid = true,
  showIsoAxes = false,
}: {
  src: string | null;
  alt: string;
  zoom: number;
  preset: EnvLightingPreset;
  width: number;
  minHeightClass?: string;
  onZoomChange?: (next: number) => void;
  testId?: string;
  fillHeight?: boolean;
  showGrid?: boolean;
  showIsoAxes?: boolean;
}) {
  const { svgText, error } = useSvgFetch(src);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panState = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const zoomRef = useRef(zoom);
  const onZoomChangeRef = useRef(onZoomChange);
  zoomRef.current = zoom;
  onZoomChangeRef.current = onZoomChange;

  const onMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    panState.current = {
      x: event.clientX,
      y: event.clientY,
      sx: container.scrollLeft,
      sy: container.scrollTop,
    };
    setDragging(true);
  }, []);

  const onMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const state = panState.current;
    const container = containerRef.current;
    if (!state || !container) return;
    container.scrollLeft = state.sx - (event.clientX - state.x);
    container.scrollTop = state.sy - (event.clientY - state.y);
  }, []);

  const onMouseEnd = useCallback(() => {
    panState.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (event: WheelEvent) => {
      const cb = onZoomChangeRef.current;
      if (!cb) return;
      event.preventDefault();
      cb(clampViewerZoom(zoomRef.current * (event.deltaY > 0 ? 0.9 : 1.1)));
    };
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseEnd}
      onMouseLeave={onMouseEnd}
      className={`relative overflow-auto rounded-lg border ${
        fillHeight ? "h-full min-h-0" : minHeightClass
      } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        backgroundColor: preset.background,
        borderColor: preset.border,
      }}
      data-testid={testId}
    >
      {showGrid && <IsoGridBackdrop />}
      {showIsoAxes && <IsoAxesOverlay />}
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        {!src ? (
          <div className="text-xs text-silver/45">Preview unavailable</div>
        ) : error ? (
          <div className="text-xs text-silver/45">Failed to load SVG</div>
        ) : !svgText ? (
          <div className="h-2 w-2 animate-pulse rounded-full bg-gold/30" />
        ) : (
          <div
            className="pointer-events-none relative select-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            style={{ width: `${Math.round(width * zoom)}px` }}
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: svgText }}
          />
        )}
      </div>
      {preset.overlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: preset.overlay }}
        />
      )}
    </div>
  );
}

function ThumbnailSvg({
  src,
  alt,
  preset,
}: {
  src: string | null;
  alt: string;
  preset: EnvLightingPreset;
}) {
  const { ref, visible } = useLazyVisible();
  const { svgText, error } = useSvgFetch(src, visible);

  return (
    <div
      ref={ref}
      className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded border"
      style={{ backgroundColor: preset.background, borderColor: preset.border }}
    >
      {!src ? (
        <span className="text-xs text-silver/40">no preview</span>
      ) : error ? (
        <span className="text-xs text-silver/40">failed</span>
      ) : !svgText ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold/40" />
      ) : (
        <div
          className="h-full w-full p-2 [&>svg]:h-full [&>svg]:w-full"
          role="img"
          aria-label={alt}
          dangerouslySetInnerHTML={{ __html: svgText }}
        />
      )}
      {preset.overlay && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: preset.overlay }}
        />
      )}
    </div>
  );
}

function ThumbnailCard({
  record,
  isFocused,
  isPinned,
  preset,
  onFocus,
  onTogglePin,
  onOpenDetail,
}: {
  record: ViewerRecord;
  isFocused: boolean;
  isPinned: boolean;
  preset: EnvLightingPreset;
  onFocus: () => void;
  onTogglePin: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
        isFocused
          ? "border-gold/50 bg-[rgba(200,168,76,0.06)]"
          : isPinned
            ? "border-[rgba(200,168,76,0.25)] bg-[rgba(200,168,76,0.03)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] hover:border-[rgba(200,168,76,0.18)] hover:bg-[rgba(200,168,76,0.03)]"
      }`}
      data-testid={`svg-card-${record.id}`}
      data-focused={isFocused ? "true" : undefined}
      data-pinned={isPinned ? "true" : undefined}
    >
      <button
        type="button"
        onClick={onFocus}
        onDoubleClick={onOpenDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onOpenDetail();
          }
        }}
        aria-label={`Focus ${record.label}`}
        data-testid={`svg-card-select-${record.id}`}
        className="flex flex-col gap-2 text-left"
      >
        <ThumbnailSvg src={record.sourcePath} alt={record.label} preset={preset} />
        <div className="min-w-0">
          <div
            className={`truncate font-[family-name:var(--font-display)] text-sm font-light tracking-[0.03em] ${
              isFocused ? "text-gold" : "text-silver-bright"
            }`}
          >
            {record.label}
          </div>
          <div className="mt-0.5 truncate text-xs text-silver/50">{record.detail}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <StatusPill status={record.status} usage={record.usage} />
          <span className="badge badge-slate text-xs">{record.categoryLabel}</span>
          {record.roomFamily && (
            <span className="badge badge-slate text-xs">{record.roomFamily}</span>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-[rgba(200,168,76,0.06)] pt-2">
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-xs text-gold/70 transition-colors hover:text-gold"
          data-testid={`svg-card-open-${record.id}`}
        >
          open detail →
        </button>
        <ComparePinButton
          isPinned={isPinned}
          onToggle={onTogglePin}
          testId={`svg-card-pin-${record.id}`}
          className="px-2 py-0.5"
        />
      </div>
    </div>
  );
}

function BrowseGrid({
  records,
  focusedId,
  pinnedIds,
  preset,
  onFocus,
  onTogglePin,
  onOpenDetail,
}: {
  records: readonly ViewerRecord[];
  focusedId: string | null;
  pinnedIds: ReadonlySet<string>;
  preset: EnvLightingPreset;
  onFocus: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenDetail: (id: string) => void;
}) {
  if (records.length === 0) {
    return (
      <div
        className="m-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.4)] p-12 text-center text-xs text-silver/45"
        data-testid="svg-grid-empty"
      >
        <span className="font-[family-name:var(--font-display)] text-sm text-silver-bright">
          No records match the current filters
        </span>
        <span>Try clearing the search or switching usage.</span>
      </div>
    );
  }

  return (
    <div
      className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3 overflow-y-auto p-5"
      data-testid="svg-grid"
      role="list"
    >
      {records.map((record) => (
        <div role="listitem" key={record.id}>
          <ThumbnailCard
            record={record}
            isFocused={focusedId === record.id}
            isPinned={pinnedIds.has(record.id)}
            preset={preset}
            onFocus={() => onFocus(record.id)}
            onTogglePin={() => onTogglePin(record.id)}
            onOpenDetail={() => onOpenDetail(record.id)}
          />
        </div>
      ))}
    </div>
  );
}

const hqRoomPreviewSnapshotCache = new Map<string, HqWorldSnapshot | null>();

function getHqRoomBindingSnapshotCacheKey(binding: HqRoomSceneBinding): string {
  return [
    binding.id,
    binding.buildingId,
    binding.templateId,
    binding.roomStateId,
    binding.slotId,
    binding.floorIndex,
  ].join("|");
}

function buildHqRoomBindingSnapshot(binding: HqRoomSceneBinding): HqWorldSnapshot | null {
  const template = templateRegistry.roomById.get(binding.templateId);
  const building = templateRegistry.buildingById.get(binding.buildingId);
  const previewFootprint = getHqBindingPreviewFootprint(binding);
  if (!template || !building || !previewFootprint) {
    return null;
  }

  const functionTag = template.tags.find((tag) => tag.startsWith("room:")) ?? "room:operations";
  const geometry = composeHqWorldGeometry(
    [
      {
        id: `preview/${binding.id}`,
        templateId: binding.templateId,
        roomStateId: binding.roomStateId,
        slotId: binding.slotId,
        floorIndex: binding.floorIndex,
        name: template.name,
        tier: 1,
        isOperational: true,
        functionTag,
        reservedFootprint: previewFootprint.reservedFootprint,
        activeFootprint: previewFootprint.activeFootprint,
      },
    ],
    {
      buildingId: binding.buildingId,
      buildingTier: previewFootprint.buildingTier,
      floorIndex: binding.floorIndex,
    },
  );

  return createHqWorldSnapshot(building.name, geometry, [], 480, binding.buildingId);
}

function getHqRoomBindingSnapshot(binding: HqRoomSceneBinding): HqWorldSnapshot | null {
  const cacheKey = getHqRoomBindingSnapshotCacheKey(binding);
  const cached = hqRoomPreviewSnapshotCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const snapshot = buildHqRoomBindingSnapshot(binding);
  hqRoomPreviewSnapshotCache.set(cacheKey, snapshot);
  return snapshot;
}

function HqRoomFitCanvas({
  binding,
  showIsoAxes,
}: {
  binding: HqRoomSceneBinding;
  showIsoAxes: boolean;
}) {
  const snapshot = useMemo(() => getHqRoomBindingSnapshot(binding), [binding]);
  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-silver/50">
        HQ preview unavailable
      </div>
    );
  }
  return (
    <>
      <div className="absolute inset-0">
        <HqWorldCanvas snapshot={snapshot} debugOverlays={ROOM_SCENE_DEBUG_OVERLAYS} />
      </div>
      {showIsoAxes && <IsoAxesOverlay />}
    </>
  );
}

function OperatorRecipePreview({
  binding,
}: {
  binding: Extract<SvgRuntimeBinding, { kind: "operator-recipe" }>;
}) {
  const recipe = getRecipeById(binding.recipeId);
  if (!recipe) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.45)] p-8 text-xs text-silver/50">
        Operator recipe unavailable
      </div>
    );
  }

  const typedRecipe = recipe as AppearanceRecipe;
  const build = resolveOperatorBuild("role:general", recipe.id);

  return (
    <div className="rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="h-40 w-[calc(120*10rem/160)] overflow-hidden rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.6)]">
            <PortraitFromRecipe
              recipe={typedRecipe}
              build={build}
              label={`${recipe.name} portrait`}
            />
          </div>
          <EyebrowLabel>Recipe preview</EyebrowLabel>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-xs text-silver/75">
          <div className="font-[family-name:var(--font-display)] text-base text-silver-bright">
            {recipe.name}
          </div>
          <div>
            <span className="text-gold/70">recipe </span>
            <code className="text-silver-bright">{recipe.id}</code>
          </div>
          <div>
            <span className="text-gold/70">head </span>
            {recipe.headShape}
          </div>
          <div>
            <span className="text-gold/70">hair </span>
            {recipe.hair}
          </div>
          <div>
            <span className="text-gold/70">eyes </span>
            {recipe.eyes}
          </div>
          <div>
            <span className="text-gold/70">face </span>
            {recipe.faceDetail}
          </div>
          <div>
            <span className="text-gold/70">body </span>
            {recipe.bodySilhouette}
          </div>
          <div>
            <span className="text-gold/70">build </span>
            {build}
          </div>
        </div>
      </div>
    </div>
  );
}

function SiblingFilmstrip({
  siblings,
  focusedId,
  preset,
  onSelect,
  onCompareAll,
}: {
  siblings: readonly ViewerRecord[];
  focusedId: string | null;
  preset: EnvLightingPreset;
  onSelect: (id: string) => void;
  onCompareAll: () => void;
}) {
  if (siblings.length <= 1) return null;

  return (
    <div
      className="rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)]"
      data-testid="svg-filmstrip"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-[rgba(200,168,76,0.06)] px-4 py-2">
        <div className="flex items-baseline gap-2">
          <EyebrowLabel>Progression</EyebrowLabel>
          <span className="text-xs text-silver/50">
            {siblings.length} room states on the same upgrade path
          </span>
        </div>
        <button
          type="button"
          onClick={onCompareAll}
          data-testid="svg-filmstrip-compare-all"
          className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.14)] bg-[rgba(200,168,76,0.06)] px-2 py-1 text-xs text-gold transition-colors hover:border-gold/40"
        >
          compare all tiers
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto p-3">
        {siblings.map((sibling) => {
          const level = getRoomStateLevel(sibling);
          const active = focusedId === sibling.id;
          return (
            <button
              key={sibling.id}
              type="button"
              onClick={() => onSelect(sibling.id)}
              aria-pressed={active}
              data-testid={`svg-filmstrip-item-${sibling.id}`}
              className={`group flex w-40 shrink-0 flex-col gap-2 rounded-md border p-2 text-left transition-colors ${
                active
                  ? "border-gold/50 bg-[rgba(200,168,76,0.08)]"
                  : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] hover:border-[rgba(200,168,76,0.22)]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xs uppercase tracking-[0.12em] text-gold/70">
                  Tier {level || "—"}
                </span>
                {active && <span className="text-xs text-gold">●</span>}
              </div>
              <ThumbnailSvg src={sibling.sourcePath} alt={sibling.label} preset={preset} />
              <div className="truncate text-xs text-silver-bright">{sibling.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailHeader({
  record,
  onBackToGrid,
  onTogglePin,
  isPinned,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: {
  record: ViewerRecord;
  onBackToGrid: () => void;
  onTogglePin: () => void;
  isPinned: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] px-5 py-3">
      <button
        type="button"
        onClick={onBackToGrid}
        data-testid="svg-detail-back"
        className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1 text-xs text-silver/70 transition-colors hover:border-gold/30 hover:text-gold"
      >
        <span aria-hidden>←</span>
        <span>grid</span>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2
            className="truncate font-[family-name:var(--font-display)] text-base font-light tracking-[0.06em] text-silver-bright"
            data-testid="svg-detail-title"
          >
            {record.label}
          </h2>
          <StatusPill status={record.status} usage={record.usage} />
        </div>
        <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-silver/50">
          <span>{record.categoryLabel}</span>
          {record.roomFamily && (
            <>
              <span>·</span>
              <span>{record.roomFamily}</span>
            </>
          )}
          {record.buildingId && (
            <>
              <span>·</span>
              <span className="font-[family-name:var(--font-sans)] tracking-normal">
                {record.buildingId}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous record"
          data-testid="svg-detail-prev"
          className="inline-flex items-center rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1 text-xs text-silver/60 transition-colors enabled:hover:border-gold/30 enabled:hover:text-gold disabled:opacity-40"
        >
          <span aria-hidden>◂</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next record"
          data-testid="svg-detail-next"
          className="inline-flex items-center rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1 text-xs text-silver/60 transition-colors enabled:hover:border-gold/30 enabled:hover:text-gold disabled:opacity-40"
        >
          <span aria-hidden>▸</span>
        </button>
        <ComparePinButton isPinned={isPinned} onToggle={onTogglePin} testId="svg-detail-pin" />
      </div>
    </div>
  );
}

function OverlayToggle({
  label,
  active,
  onChange,
  testId,
}: {
  label: string;
  active: boolean;
  onChange: (next: boolean) => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium uppercase tracking-[0.08em] transition-colors ${
        active
          ? "border-gold/40 bg-[rgba(200,168,76,0.12)] text-gold"
          : "border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] text-silver/55 hover:text-silver-bright"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-gold" : "bg-[rgba(200,168,76,0.3)]"}`}
        aria-hidden
      />
      {label}
    </button>
  );
}

function DetailWorkbench({
  record,
  preset,
  zoom,
  onZoomChange,
  siblings,
  onSelectSibling,
  onCompareAllSiblings,
  showGrid,
  showIsoAxes,
}: {
  record: ViewerRecord;
  preset: EnvLightingPreset;
  zoom: number;
  onZoomChange: (next: number) => void;
  siblings: readonly ViewerRecord[];
  onSelectSibling: (id: string) => void;
  onCompareAllSiblings: () => void;
  showGrid: boolean;
  showIsoAxes: boolean;
}) {
  const binding = record.binding;
  const isRoomScene = binding?.kind === "hq-room-scene";
  const isEnvBinding = binding?.kind === "hq-environment";
  const isOperatorRecipe = binding?.kind === "operator-recipe";
  const roomScenePlacementLabel =
    binding?.kind === "hq-room-scene" ? getHqRoomBindingPlacementLabel(binding) : null;

  const stage = isRoomScene ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <EyebrowLabel>Placed In Building</EyebrowLabel>
        <span className="text-xs text-silver/40">{roomScenePlacementLabel}</span>
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.45)]">
        <HqRoomFitCanvas binding={binding} showIsoAxes={showIsoAxes} />
      </div>
      <p className="text-xs text-silver/45">
        Dashed gold outline marks the room slot on the HQ grid.
      </p>
    </div>
  ) : isOperatorRecipe ? (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <EyebrowLabel>Recipe Composition</EyebrowLabel>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <OperatorRecipePreview binding={binding} />
      </div>
    </div>
  ) : (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <EyebrowLabel>{isEnvBinding ? "Placed On Grid" : "Asset"}</EyebrowLabel>
        <span className="text-xs text-silver/40">wheel · zoom / drag · pan</span>
      </div>
      <SvgStage
        src={record.sourcePath}
        alt={record.label}
        zoom={zoom}
        preset={preset}
        width={stageBaseWidthForRecord(record)}
        fillHeight
        showGrid={showGrid}
        showIsoAxes={showIsoAxes}
        onZoomChange={onZoomChange}
        testId="svg-detail-stage"
      />
      {isEnvBinding && (
        <p className="text-xs text-silver/45">
          Background asset on an isometric grid. Toggle axes in the toolbar to verify footprint
          edges, legs, and bases snap to the canonical 2:1 grid.
        </p>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {stage}
        {siblings.length > 1 && (
          <SiblingFilmstrip
            siblings={siblings}
            focusedId={record.id}
            preset={preset}
            onSelect={onSelectSibling}
            onCompareAll={onCompareAllSiblings}
          />
        )}
      </div>
    </div>
  );
}

function CompareTile({
  record,
  preset,
  zoom,
  onZoomChange,
  onOpenDetail,
  onUnpin,
  showGrid,
  showIsoAxes,
}: {
  record: ViewerRecord;
  preset: EnvLightingPreset;
  zoom: number;
  onZoomChange: (next: number) => void;
  onOpenDetail: () => void;
  onUnpin: () => void;
  showGrid: boolean;
  showIsoAxes: boolean;
}) {
  const binding = record.binding;
  const isRoomScene = binding?.kind === "hq-room-scene";
  const isOperatorRecipe = binding?.kind === "operator-recipe";

  const level = isRoomScene ? getRoomStateLevel(record) : 0;

  const body = isRoomScene ? (
    <div className="relative flex-1 min-h-0 overflow-hidden rounded-md border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.45)]">
      <HqRoomFitCanvas binding={binding} showIsoAxes={showIsoAxes} />
    </div>
  ) : isOperatorRecipe ? (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <OperatorRecipePreview binding={binding} />
    </div>
  ) : (
    <div className="flex-1 min-h-0">
      <SvgStage
        src={record.sourcePath}
        alt={record.label}
        zoom={zoom}
        preset={preset}
        width={stageBaseWidthForRecord(record)}
        fillHeight
        showGrid={showGrid}
        showIsoAxes={showIsoAxes}
        onZoomChange={onZoomChange}
        testId={`svg-compare-stage-${record.id}`}
      />
    </div>
  );

  return (
    <div
      className="flex h-full w-[38rem] shrink-0 flex-col overflow-hidden rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)]"
      data-testid={`svg-compare-tile-${record.id}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[rgba(200,168,76,0.06)] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            {level > 0 && (
              <span className="rounded border border-gold/25 bg-[rgba(200,168,76,0.08)] px-1.5 py-[1px] text-xs font-medium uppercase tracking-[0.12em] text-gold">
                Tier {level}
              </span>
            )}
            <div className="truncate font-[family-name:var(--font-display)] text-sm font-light tracking-[0.04em] text-silver-bright">
              {record.label}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusPill status={record.status} usage={record.usage} />
            <span className="badge badge-slate text-xs">{record.categoryLabel}</span>
            {record.roomFamily && (
              <span className="badge badge-slate text-xs">{record.roomFamily}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onOpenDetail}
            className="rounded border border-[rgba(200,168,76,0.12)] bg-[rgba(200,168,76,0.04)] px-2 py-1 text-xs text-gold/80 transition-colors hover:border-gold/30 hover:text-gold"
            data-testid={`svg-compare-open-${record.id}`}
          >
            open
          </button>
          <button
            type="button"
            onClick={onUnpin}
            aria-label="Unpin from compare"
            data-testid={`svg-compare-unpin-${record.id}`}
            className="rounded border border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.5)] px-1.5 py-1 text-xs text-silver/55 transition-colors hover:border-[rgba(212,84,30,0.35)] hover:text-ember"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">{body}</div>
    </div>
  );
}

function CompareView({
  records,
  preset,
  zoom,
  onZoomChange,
  onOpenDetail,
  onUnpin,
  showGrid,
  showIsoAxes,
}: {
  records: readonly ViewerRecord[];
  preset: EnvLightingPreset;
  zoom: number;
  onZoomChange: (next: number) => void;
  onOpenDetail: (id: string) => void;
  onUnpin: (id: string) => void;
  showGrid: boolean;
  showIsoAxes: boolean;
}) {
  if (records.length === 0) return null;
  const allRoomStates = records.every((record) => record.binding?.kind === "hq-room-scene");
  const label = allRoomStates
    ? `${records[0].label.replace(/\s+\d+$/, "")} · ${records.length} tiers`
    : `${records.length} pinned records`;

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="svg-compare">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] px-5 py-2.5">
        <div>
          <EyebrowLabel>Compare</EyebrowLabel>
          <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.06em] text-silver-bright">
            {label}
          </h2>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden p-4">
        {records.map((record) => (
          <CompareTile
            key={record.id}
            record={record}
            preset={preset}
            zoom={zoom}
            onZoomChange={onZoomChange}
            onOpenDetail={() => onOpenDetail(record.id)}
            onUnpin={() => onUnpin(record.id)}
            showGrid={showGrid}
            showIsoAxes={showIsoAxes}
          />
        ))}
      </div>
    </div>
  );
}

function InspectorRow({
  label,
  value,
  children,
  testId,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)] items-start gap-3">
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="min-w-0 text-xs text-silver-bright" data-testid={testId}>
        {value ?? children}
      </div>
    </div>
  );
}

function InspectorRail({
  record,
  preset,
  violations,
  isPinned,
  onTogglePin,
}: {
  record: ViewerRecord | null;
  preset: EnvLightingPreset;
  violations: number;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  return (
    <aside
      className="flex min-h-0 w-full shrink-0 flex-col border-l border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] lg:w-[22rem]"
      data-testid="svg-inspector"
      aria-label="Record inspector"
    >
      <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
        <EyebrowLabel>Inspector</EyebrowLabel>
        <div className="mt-1 text-xs text-silver/55">
          {record ? "Focused record metadata and actions" : "Select a record to inspect"}
        </div>
      </div>
      {!record ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-silver/45">
          Click a card or a tree node, then select a record to see its dossier here.
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <h3
              className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.06em] text-silver-bright"
              data-testid="svg-inspector-label"
            >
              {record.label}
            </h3>
            <div className="mt-1 text-xs text-silver/55">{record.detail}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              <StatusPill status={record.status} usage={record.usage} />
              <span className="badge badge-slate text-xs">{record.categoryLabel}</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.35)] p-3">
            <InspectorRow label="Family" value={titleCase(record.family)} />
            <InspectorRow label="Lighting" value={preset.label} />
            {record.roomFamily && <InspectorRow label="Room" value={record.roomFamily} />}
            {record.buildingId && <InspectorRow label="Building" value={record.buildingId} />}
            {record.binding?.kind === "hq-room-scene" && (
              <InspectorRow
                label="Placement"
                value={getHqRoomBindingPlacementLabel(record.binding)}
              />
            )}
            <InspectorRow label="Id" testId="svg-inspector-id">
              <div className="flex items-start gap-2">
                <code className="break-all font-[family-name:var(--font-sans)] text-xs text-silver-bright">
                  {record.id}
                </code>
                <CopyButton value={record.id} label="id" testId="svg-inspector-copy-id" />
              </div>
            </InspectorRow>
            <InspectorRow label="Source" testId="svg-inspector-source">
              <div className="flex items-start gap-2">
                <code className="break-all font-[family-name:var(--font-sans)] text-xs text-silver-bright">
                  {record.sourcePath ?? "runtime-only preview"}
                </code>
                {record.sourcePath && (
                  <CopyButton
                    value={record.sourcePath}
                    label="source path"
                    testId="svg-inspector-copy-path"
                  />
                )}
              </div>
            </InspectorRow>
            {record.kind === "binding" && (
              <InspectorRow label="Binding" value={record.binding?.kind ?? "unknown"} />
            )}
            {record.kind === "asset" && (
              <InspectorRow label="Role" value={record.asset?.contractRole ?? "unknown"} />
            )}
          </div>

          {record.envPart && record.envPart.tags.length > 0 && (
            <div className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.35)] p-3">
              <EyebrowLabel>Tags</EyebrowLabel>
              <div className="mt-2 flex flex-wrap gap-1">
                {record.envPart.tags.map((tag) => (
                  <span key={tag} className="badge badge-gold text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <ComparePinButton
              isPinned={isPinned}
              onToggle={onTogglePin}
              testId="svg-inspector-pin"
              labelMode="full"
            />
          </div>

          {violations > 0 && (
            <div className="rounded-lg border border-[rgba(212,84,30,0.2)] bg-[rgba(120,24,24,0.18)] px-3 py-2 text-xs text-silver/75">
              <span className="font-[family-name:var(--font-display)] text-ember">
                {violations}
              </span>
              <span className="ml-1.5">
                contract violation{violations === 1 ? "" : "s"} recorded in the registry
              </span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function CompareDock({
  records,
  focusedId,
  preset,
  onFocus,
  onUnpin,
  onClear,
  onOpenCompareView,
}: {
  records: readonly ViewerRecord[];
  focusedId: string | null;
  preset: EnvLightingPreset;
  onFocus: (id: string) => void;
  onUnpin: (id: string) => void;
  onClear: () => void;
  onOpenCompareView: () => void;
}) {
  if (records.length < 2) return null;

  return (
    <div
      className="flex items-center gap-3 border-t border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] px-4 py-2 backdrop-blur-xl"
      data-testid="svg-compare-dock"
    >
      <div className="flex shrink-0 flex-col">
        <EyebrowLabel>Compare set</EyebrowLabel>
        <span className="text-xs tabular-nums text-silver/55">{records.length} pinned</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {records.map((record) => {
          const active = focusedId === record.id;
          return (
            <div
              key={record.id}
              className={`group flex shrink-0 items-center gap-2 rounded-md border px-2 py-1 transition-colors ${
                active
                  ? "border-gold/40 bg-[rgba(200,168,76,0.08)]"
                  : "border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] hover:border-[rgba(200,168,76,0.22)]"
              }`}
              data-testid={`svg-compare-item-${record.id}`}
            >
              <button
                type="button"
                onClick={() => onFocus(record.id)}
                className="flex items-center gap-2"
                aria-label={`Focus ${record.label}`}
              >
                <div className="h-8 w-8 overflow-hidden rounded">
                  <ThumbnailSvg src={record.sourcePath} alt={record.label} preset={preset} />
                </div>
                <span
                  className={`max-w-[9rem] truncate text-xs ${active ? "text-gold" : "text-silver-bright"}`}
                >
                  {record.label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onUnpin(record.id)}
                aria-label={`Unpin ${record.label}`}
                data-testid={`svg-compare-unpin-${record.id}`}
                className="text-silver/45 hover:text-ember"
              >
                <svg
                  viewBox="0 0 12 12"
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenCompareView}
          data-testid="svg-compare-open"
          className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.14)] bg-[rgba(200,168,76,0.06)] px-2 py-1 text-xs text-gold transition-colors hover:border-gold/40"
        >
          compare →
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="svg-compare-clear"
          className="inline-flex items-center gap-1 rounded border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.5)] px-2 py-1 text-xs text-silver/60 transition-colors hover:border-[rgba(212,84,30,0.3)] hover:text-ember"
        >
          clear
        </button>
      </div>
    </div>
  );
}

function StatusBar({
  resultCount,
  totalCount,
  pinnedCount,
  violations,
  activeNavLabel,
}: {
  resultCount: number;
  totalCount: number;
  pinnedCount: number;
  violations: number;
  activeNavLabel: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 border-t border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.8)] px-4 py-1.5 text-xs text-silver/50"
      data-testid="svg-status-bar"
    >
      <span className="tabular-nums">
        <span className="text-silver-bright">{resultCount}</span>
        <span className="mx-1">/</span>
        <span>{totalCount}</span>
        <span className="ml-1">records</span>
      </span>
      <span className="h-3 w-px bg-[rgba(200,168,76,0.12)]" />
      <span>
        scope <span className="text-silver/75">{activeNavLabel}</span>
      </span>
      {pinnedCount > 0 && (
        <>
          <span className="h-3 w-px bg-[rgba(200,168,76,0.12)]" />
          <span className="tabular-nums text-gold/75">{pinnedCount} pinned</span>
        </>
      )}
      {violations > 0 && (
        <>
          <span className="h-3 w-px bg-[rgba(200,168,76,0.12)]" />
          <span className="text-ember">
            {violations} contract violation{violations === 1 ? "" : "s"}
          </span>
        </>
      )}
      <span className="ml-auto hidden items-center gap-3 md:inline-flex">
        <KeyHint keys={["/"]} label="search" />
        <KeyHint keys={["g"]} label="toggle view" />
        <KeyHint keys={["j", "k"]} label="navigate" />
        <KeyHint keys={["p"]} label="pin" />
        <KeyHint keys={["esc"]} label="clear" />
      </span>
    </div>
  );
}

export function SvgAssetContractPanel() {
  const [usage, setUsage] = useState<SvgAssetUsage>("live");
  const [family, setFamily] = useState<FamilyFilter>("hq");
  const [category, setCategory] = useState("");
  const [building, setBuilding] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("label-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [lightingPresetId, setLightingPresetId] = useState("neutral");
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showIsoAxes, setShowIsoAxes] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const violations = useMemo(() => getSvgContractViolations(), []);
  const liveBindings = useMemo(() => getSvgRuntimeBindings(), []);
  const assets = useMemo(() => getSvgAssets(), []);
  const envParts = useMemo(() => getLoadedEnvParts(), []);

  const allRecords = useMemo(
    () => buildSvgAssetViewerRecords(assets, liveBindings, envParts),
    [assets, envParts, liveBindings],
  );

  const usageRecords = useMemo(
    () => allRecords.filter((r) => r.usage === usage),
    [allRecords, usage],
  );

  const filteredRecords = useMemo(
    () =>
      filterSvgAssetViewerRecords(allRecords, {
        usage,
        family,
        category,
        building,
        search,
      }),
    [allRecords, category, family, building, search, usage],
  );

  const sortedRecords = useMemo(
    () => sortRecords(filteredRecords, sortKey),
    [filteredRecords, sortKey],
  );

  const navigatorTree = useMemo(() => buildNavigatorTree(usageRecords), [usageRecords]);

  const activeNavKey = useMemo(() => {
    if (!family) return "__all__";
    if (!category) return family;
    if (!building) return `${family}:${category}`;
    return `${family}:${category}:${building}`;
  }, [family, category, building]);

  const activeNavLabel = useMemo(() => {
    if (activeNavKey === "__all__") return familyLabel(family);
    const fam = family ? titleCase(family) : "All";
    if (!category) return fam;
    const catNode = navigatorTree
      .find((n) => n.key === family)
      ?.children.find((c) => c.key === `${family}:${category}`);
    if (!building) return `${fam} · ${catNode?.label ?? category}`;
    return `${fam} · ${catNode?.label ?? category} · ${buildingLabel(building)}`;
  }, [activeNavKey, category, family, navigatorTree, building]);

  const recordsById = useMemo(
    () => new Map(allRecords.map((record) => [record.id, record])),
    [allRecords],
  );

  const focusedRecord = useMemo(() => {
    if (focusedId) {
      const match = recordsById.get(focusedId);
      if (match) return match;
    }
    return sortedRecords[0] ?? null;
  }, [recordsById, focusedId, sortedRecords]);

  const pinnedRecords = useMemo(
    () => allRecords.filter((r) => pinnedIds.has(r.id)),
    [allRecords, pinnedIds],
  );

  const roomComparisonIds = useMemo(
    () => getRoomSceneComparisonIds(allRecords, focusedRecord),
    [allRecords, focusedRecord],
  );

  const roomComparisonRecords = useMemo(() => {
    if (roomComparisonIds.length === 0) return [];
    const ordered: ViewerRecord[] = [];
    for (const id of roomComparisonIds) {
      const record = recordsById.get(id);
      if (record) ordered.push(record);
    }
    return ordered;
  }, [recordsById, roomComparisonIds]);

  const preset = getEnvLightingPreset(lightingPresetId);

  useEffect(() => {
    setZoom(1);
  }, [focusedRecord?.id]);

  useEffect(() => {
    if (!focusedId) return;
    if (pinnedIds.has(focusedId)) return;
    if (!sortedRecords.some((r) => r.id === focusedId)) {
      setFocusedId(sortedRecords[0]?.id ?? null);
    }
  }, [focusedId, pinnedIds, sortedRecords]);

  const handleNavigate = useCallback(
    (filters: { family: FamilyFilter; category: string; building: string }) => {
      setFamily(filters.family);
      setCategory(filters.category);
      setBuilding(filters.building);
    },
    [],
  );

  const handleNavReset = useCallback(() => {
    setFamily("");
    setCategory("");
    setBuilding("");
  }, []);

  const handleTogglePin = useCallback((id: string) => {
    setPinnedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearPinned = useCallback(() => setPinnedIds(new Set()), []);

  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const handleOpenDetail = useCallback((id: string) => {
    setFocusedId(id);
    setViewMode("detail");
  }, []);

  const handleBackToGrid = useCallback(() => setViewMode("grid"), []);

  const handleNextPrev = useCallback(
    (direction: 1 | -1) => {
      const nextId = getAdjacentRecordId(sortedRecords, focusedRecord?.id ?? null, direction);
      if (nextId) setFocusedId(nextId);
    },
    [sortedRecords, focusedRecord],
  );

  const handleCompareAllSiblings = useCallback(() => {
    if (roomComparisonIds.length < 2) return;
    setPinnedIds(new Set(roomComparisonIds));
    setViewMode("detail");
  }, [roomComparisonIds]);

  const handleOpenCompareView = useCallback(() => {
    if (pinnedRecords.length >= 2) setViewMode("detail");
  }, [pinnedRecords.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (typing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        setPinnedIds(new Set());
        setFocusedId(null);
        if (viewMode === "detail") setViewMode("grid");
      } else if (event.key === "g") {
        setViewMode((m) => (m === "grid" ? "detail" : "grid"));
      } else if (event.key === "j") {
        handleNextPrev(1);
      } else if (event.key === "k") {
        handleNextPrev(-1);
      } else if (event.key === "p" && focusedRecord) {
        handleTogglePin(focusedRecord.id);
      } else if (event.key === "+" || event.key === "=") {
        setZoom((z) => clampViewerZoom(z + 0.25));
      } else if (event.key === "-" || event.key === "_") {
        setZoom((z) => clampViewerZoom(z - 0.25));
      } else if (event.key === "0") {
        setZoom(1);
      } else if (event.key === "Enter" && focusedRecord && viewMode === "grid") {
        setViewMode("detail");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedRecord, handleNextPrev, handleTogglePin, viewMode]);

  const showCompareView = viewMode === "detail" && pinnedRecords.length >= 2;
  const commandStripModel: CommandStripModel = {
    search,
    searchInputRef,
    usage,
    viewMode,
    disabledDetail: !focusedRecord,
    sort: sortKey,
    lighting: lightingPresetId,
    zoom,
    showGrid,
    showIsoAxes,
    navCollapsed,
    inspectorCollapsed,
    pinnedCount: pinnedRecords.length,
    resultCount: sortedRecords.length,
  };
  const commandStripActions: CommandStripActions = {
    onSearchChange: setSearch,
    onUsageChange: (next) => {
      setUsage(next);
      setCategory("");
      setBuilding("");
      setFocusedId(null);
    },
    onViewModeChange: setViewMode,
    onSortChange: setSortKey,
    onLightingChange: setLightingPresetId,
    onZoomChange: setZoom,
    onShowGridChange: setShowGrid,
    onShowIsoAxesChange: setShowIsoAxes,
    onNavCollapsedChange: setNavCollapsed,
    onInspectorCollapsedChange: setInspectorCollapsed,
    onClearPinned: handleClearPinned,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-void" data-testid="svg-panel">
      <CommandStrip model={commandStripModel} actions={commandStripActions} />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {!navCollapsed && (
          <NavigatorRail
            tree={navigatorTree}
            activeKey={activeNavKey}
            onSelect={handleNavigate}
            onReset={handleNavReset}
            totalCount={usageRecords.length}
          />
        )}

        <section className="flex min-w-0 min-h-0 flex-1 flex-col border-x border-[rgba(200,168,76,0.06)] lg:border-x">
          {showCompareView ? (
            <CompareView
              records={pinnedRecords}
              preset={preset}
              zoom={zoom}
              onZoomChange={setZoom}
              onOpenDetail={(id) => {
                setFocusedId(id);
                setPinnedIds(new Set([id]));
              }}
              onUnpin={handleTogglePin}
              showGrid={showGrid}
              showIsoAxes={showIsoAxes}
            />
          ) : viewMode === "detail" && focusedRecord ? (
            (() => {
              const focusedIndex = sortedRecords.findIndex((r) => r.id === focusedRecord.id);
              return (
                <>
                  <DetailHeader
                    record={focusedRecord}
                    onBackToGrid={handleBackToGrid}
                    onTogglePin={() => handleTogglePin(focusedRecord.id)}
                    isPinned={pinnedIds.has(focusedRecord.id)}
                    hasPrev={focusedIndex > 0}
                    hasNext={focusedIndex >= 0 && focusedIndex < sortedRecords.length - 1}
                    onPrev={() => handleNextPrev(-1)}
                    onNext={() => handleNextPrev(1)}
                  />
                  <DetailWorkbench
                    record={focusedRecord}
                    preset={preset}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    siblings={roomComparisonRecords}
                    onSelectSibling={(id) => setFocusedId(id)}
                    onCompareAllSiblings={handleCompareAllSiblings}
                    showGrid={showGrid}
                    showIsoAxes={showIsoAxes}
                  />
                </>
              );
            })()
          ) : (
            <BrowseGrid
              records={sortedRecords}
              focusedId={focusedRecord?.id ?? null}
              pinnedIds={pinnedIds}
              preset={preset}
              onFocus={handleFocus}
              onTogglePin={handleTogglePin}
              onOpenDetail={handleOpenDetail}
            />
          )}

          <CompareDock
            records={pinnedRecords}
            focusedId={focusedRecord?.id ?? null}
            preset={preset}
            onFocus={(id) => setFocusedId(id)}
            onUnpin={handleTogglePin}
            onClear={handleClearPinned}
            onOpenCompareView={handleOpenCompareView}
          />
        </section>

        {!inspectorCollapsed && (
          <InspectorRail
            record={focusedRecord}
            preset={preset}
            violations={violations.length}
            isPinned={focusedRecord ? pinnedIds.has(focusedRecord.id) : false}
            onTogglePin={() => focusedRecord && handleTogglePin(focusedRecord.id)}
          />
        )}
      </div>

      <StatusBar
        resultCount={sortedRecords.length}
        totalCount={usageRecords.length}
        pinnedCount={pinnedRecords.length}
        violations={violations.length}
        activeNavLabel={activeNavLabel}
      />
    </div>
  );
}
