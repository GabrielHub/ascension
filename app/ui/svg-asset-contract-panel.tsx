import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

import { templateRegistry } from "content/templates";
import {
  createHqWorldSnapshot,
  HqWorldCanvas,
  composeHqWorldGeometry,
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

type FamilyFilter = "" | SvgAssetFamily;

type ViewerRecordKind = "asset" | "binding";

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
  room: string;
  search: string;
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
    return { key: "hq-room-scene", label: "Room Scenes" };
  }
  if (binding.kind === "hq-environment" && envPart) {
    return {
      key: `hq-${envPart.category}`,
      label: getEnvCategoryLabel(envPart.category),
    };
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
    return {
      key: `hq-${envPart.category}`,
      label: getEnvCategoryLabel(envPart.category),
    };
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

  const assetRecords = assets.map((asset) => {
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
    if (filters.room && record.roomFamily !== filters.room) {
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
    .map((candidate) => candidate.id);
}

function useSvgFetch(src: string | null) {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setSvgText(null);
      setError(false);
      return;
    }

    setSvgText(null);
    setError(false);
    let cancelled = false;

    fetch(src)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setSvgText(text);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { svgText, error };
}

function SearchInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="6.5" cy="6.5" r="5" />
        <path d="M10.5 10.5L14.5 14.5" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name, room, tag, source path..."
        className="w-full rounded-lg border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] py-2 pl-8 pr-8 text-xs text-silver-bright placeholder:text-silver/50 outline-none transition-colors focus:border-gold/40"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-silver/55 transition-colors hover:text-silver-bright"
          aria-label="Clear search"
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.7)] px-2.5 py-2 text-xs text-silver-bright outline-none transition-colors focus:border-gold/40 [&>option]:bg-void"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetadataRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-[0.1em] text-gold/70">
        {label}
      </span>
      <div className="min-w-0 flex-1 text-xs text-silver-bright">{value ?? children}</div>
    </div>
  );
}

function RecordListItem({
  record,
  isPrimary,
  isSelected,
  onSelect,
}: {
  record: ViewerRecord;
  isPrimary: boolean;
  isSelected: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
        isPrimary
          ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
          : isSelected
            ? "border-[rgba(200,168,76,0.16)] bg-[rgba(200,168,76,0.04)]"
            : "border-transparent bg-[rgba(6,6,8,0.2)] hover:border-[rgba(200,168,76,0.1)] hover:bg-[rgba(200,168,76,0.03)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`truncate text-xs font-medium ${isPrimary ? "text-gold" : "text-silver-bright"}`}
          >
            {record.label}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="badge badge-slate text-xs">{record.family}</span>
            <span className="badge badge-gold text-xs">{record.usage}</span>
            <span className="badge badge-slate text-xs">{record.categoryLabel}</span>
            {record.roomFamily && (
              <span className="badge badge-slate text-xs">{record.roomFamily}</span>
            )}
          </div>
        </div>
        {isSelected && (
          <span className="rounded-full border border-gold/20 bg-[rgba(200,168,76,0.08)] px-2 py-0.5 text-xs text-gold">
            selected
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-xs text-silver/45">{record.detail}</div>
    </button>
  );
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

function SvgStage({
  src,
  alt,
  zoom,
  preset,
  width,
  minHeightClass = "min-h-[24rem]",
}: {
  src: string | null;
  alt: string;
  zoom: number;
  preset: EnvLightingPreset;
  width: number;
  minHeightClass?: string;
}) {
  const { svgText, error } = useSvgFetch(src);

  return (
    <div
      className={`relative overflow-auto rounded-xl border ${minHeightClass}`}
      style={{ backgroundColor: preset.background, borderColor: preset.border }}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-6">
        {!src ? (
          <div className="text-sm text-silver/45">Preview unavailable</div>
        ) : error ? (
          <div className="text-sm text-silver/45">Failed to load SVG preview</div>
        ) : !svgText ? (
          <div className="h-2 w-2 animate-pulse rounded-full bg-gold/30" />
        ) : (
          <div
            className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
            style={{ width: `${Math.round(width * zoom)}px` }}
            role="img"
            aria-label={alt}
            dangerouslySetInnerHTML={{ __html: svgText }}
          />
        )}
      </div>
      {preset.overlay && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ backgroundColor: preset.overlay }}
        />
      )}
    </div>
  );
}

function HqRoomBindingPreview({ binding }: { binding: HqRoomSceneBinding }) {
  const snapshot = useMemo<HqWorldSnapshot | null>(() => {
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
          isRequestedActive: true,
          isOperational: true,
          functionTag,
          reservedFootprint: previewFootprint.reservedFootprint,
          activeFootprint: previewFootprint.activeFootprint,
        },
      ],
      {
        buildingId: binding.buildingId,
        buildingTier: 1,
        floorIndex: binding.floorIndex,
      },
    );

    return createHqWorldSnapshot(building.name, geometry, [], 480, binding.buildingId);
  }, [binding]);

  if (!snapshot) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-silver/50">
        HQ preview unavailable
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[18rem] overflow-hidden rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.45)]">
      <HqWorldCanvas snapshot={snapshot} />
    </div>
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
      <div className="flex h-full items-center justify-center text-sm text-silver/50">
        Operator recipe unavailable
      </div>
    );
  }

  const typedRecipe = recipe as AppearanceRecipe;
  const build = resolveOperatorBuild("role:general", recipe.id);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] p-6 md:flex-row md:items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-40 w-[calc(120*10rem/160)] overflow-hidden rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.6)]">
            <PortraitFromRecipe
              recipe={typedRecipe}
              build={build}
              label={`${recipe.name} portrait`}
            />
          </div>
          <span className="text-xs text-silver/55">Recipe preview</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm text-silver/70">
          <div className="text-base font-medium text-silver-bright">{recipe.name}</div>
          <div>
            <span className="text-gold/70">recipe:</span> {recipe.id}
          </div>
          <div>
            <span className="text-gold/70">head:</span> {recipe.headShape}
          </div>
          <div>
            <span className="text-gold/70">hair:</span> {recipe.hair}
          </div>
          <div>
            <span className="text-gold/70">eyes:</span> {recipe.eyes}
          </div>
          <div>
            <span className="text-gold/70">face:</span> {recipe.faceDetail}
          </div>
          <div>
            <span className="text-gold/70">body:</span> {recipe.bodySilhouette}
          </div>
          <div>
            <span className="text-gold/70">build:</span> {build}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordMetadata({ record, preset }: { record: ViewerRecord; preset: EnvLightingPreset }) {
  return (
    <div className="space-y-3 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] p-4">
      <MetadataRow label="Category" value={record.categoryLabel} />
      <MetadataRow label="Family" value={record.family} />
      <MetadataRow label="Usage" value={record.usage} />
      <MetadataRow label="Status" value={record.status} />
      <MetadataRow label="Lighting" value={preset.label} />
      {record.roomFamily && <MetadataRow label="Room" value={record.roomFamily} />}
      {record.buildingId && <MetadataRow label="Building" value={record.buildingId} />}
      <MetadataRow label="Source">
        <span className="break-all">{record.sourcePath ?? "runtime-only preview"}</span>
      </MetadataRow>
      <MetadataRow label="Id">
        <span className="break-all">{record.id}</span>
      </MetadataRow>
      {record.kind === "binding" && (
        <MetadataRow label="Binding" value={record.binding?.kind ?? "unknown"} />
      )}
      {record.kind === "asset" && (
        <MetadataRow label="Role" value={record.asset?.contractRole ?? "unknown"} />
      )}
      {record.envPart && (
        <MetadataRow label="Tags">
          <div className="flex flex-wrap gap-1">
            {record.envPart.tags.map((tag) => (
              <span key={tag} className="badge badge-gold text-xs">
                {tag}
              </span>
            ))}
          </div>
        </MetadataRow>
      )}
    </div>
  );
}

function RecordComparisonCard({
  record,
  preset,
}: {
  record: ViewerRecord;
  preset: EnvLightingPreset;
}) {
  if (record.binding?.kind === "operator-recipe") {
    return (
      <div className="overflow-hidden rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)]">
        <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
          <div className="text-sm font-medium text-silver-bright">{record.label}</div>
          <div className="mt-1 text-xs text-silver/45">{record.detail}</div>
        </div>
        <div className="h-[22rem]">
          <OperatorRecipePreview binding={record.binding} />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)]">
      <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
        <div className="text-sm font-medium text-silver-bright">{record.label}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="badge badge-gold text-xs">{record.categoryLabel}</span>
          {record.roomFamily && (
            <span className="badge badge-slate text-xs">{record.roomFamily}</span>
          )}
          <span className="badge badge-slate text-xs">{record.status}</span>
        </div>
      </div>
      <div className="p-4">
        <SvgStage
          src={record.sourcePath}
          alt={record.label}
          zoom={1}
          preset={preset}
          width={stageBaseWidthForRecord(record)}
          minHeightClass="min-h-[16rem]"
        />
        <div className="mt-3 text-xs text-silver/50">{record.detail}</div>
      </div>
    </div>
  );
}

function DetailPanel({
  records,
  primaryRecord,
  preset,
  zoom,
}: {
  records: readonly ViewerRecord[];
  primaryRecord: ViewerRecord | null;
  preset: EnvLightingPreset;
  zoom: number;
}) {
  if (!primaryRecord) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-silver/45">
        Select a contracted asset or live binding
      </div>
    );
  }

  if (records.length > 1) {
    const allRoomStates = records.every((record) => record.binding?.kind === "hq-room-scene");
    const compareLabel =
      allRoomStates && primaryRecord.roomFamily
        ? `${primaryRecord.roomFamily} room states`
        : `${records.length} selected records`;

    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="mb-5">
          <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.12em] text-silver-bright">
            Compare {compareLabel}
          </h3>
          <p className="mt-1 text-xs text-silver/45">
            Lighting applies to raw SVG previews so you can check contrast and silhouette under
            different review conditions.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {records.map((record) => (
            <RecordComparisonCard key={record.id} record={record} preset={preset} />
          ))}
        </div>
      </div>
    );
  }

  if (primaryRecord.binding?.kind === "operator-recipe") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto">
          <OperatorRecipePreview binding={primaryRecord.binding} />
        </div>
        <div className="border-t border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] px-5 py-4">
          <RecordMetadata record={primaryRecord} preset={preset} />
        </div>
      </div>
    );
  }

  if (primaryRecord.binding?.kind === "hq-room-scene") {
    return (
      <div className="h-full overflow-y-auto p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-gold/70">
                Raw Room Scene
              </div>
              <SvgStage
                src={primaryRecord.sourcePath}
                alt={primaryRecord.label}
                zoom={zoom}
                preset={preset}
                width={stageBaseWidthForRecord(primaryRecord)}
                minHeightClass="min-h-[28rem]"
              />
            </div>
            <RecordMetadata record={primaryRecord} preset={preset} />
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.14em] text-gold/70">
                Runtime Room Fit
              </div>
              <HqRoomBindingPreview binding={primaryRecord.binding} />
              <p className="mt-2 text-xs text-silver/45">
                Drag to pan the runtime composition and use the mouse wheel over the canvas to zoom.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
        <div>
          <SvgStage
            src={primaryRecord.sourcePath}
            alt={primaryRecord.label}
            zoom={zoom}
            preset={preset}
            width={stageBaseWidthForRecord(primaryRecord)}
            minHeightClass="min-h-[28rem]"
          />
        </div>
        <RecordMetadata record={primaryRecord} preset={preset} />
      </div>
    </div>
  );
}

function PreviewToolbar({
  selectedCount,
  zoom,
  onZoomChange,
  lightingPresetId,
  onLightingPresetChange,
  canCompareRoomStates,
  onCompareRoomStates,
  onShowSingle,
}: {
  selectedCount: number;
  zoom: number;
  onZoomChange: (next: number) => void;
  lightingPresetId: string;
  onLightingPresetChange: (next: string) => void;
  canCompareRoomStates: boolean;
  onCompareRoomStates: () => void;
  onShowSingle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.35)] px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
            Runtime-Authoritative Asset Preview
          </div>
          <p className="mt-1 text-xs text-silver/45">
            Contract-backed review with room-state comparison, lighting presets, and raw SVG zoom.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {canCompareRoomStates && selectedCount <= 1 && (
            <button
              type="button"
              onClick={onCompareRoomStates}
              className="rounded-lg border border-[rgba(200,168,76,0.12)] bg-[rgba(200,168,76,0.06)] px-3 py-2 text-gold transition-colors hover:border-gold/30 hover:bg-[rgba(200,168,76,0.1)]"
            >
              compare room states
            </button>
          )}
          {selectedCount > 1 && (
            <button
              type="button"
              onClick={onShowSingle}
              className="rounded-lg border border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.5)] px-3 py-2 text-silver/70 transition-colors hover:border-gold/20 hover:text-silver-bright"
            >
              show single
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ENV_LIGHTING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLightingPresetChange(preset.id)}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                lightingPresetId === preset.id
                  ? "bg-[rgba(200,168,76,0.12)] text-gold"
                  : "text-silver/50 hover:bg-[rgba(200,168,76,0.06)] hover:text-silver-bright"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-silver/55">
          <span>Zoom {Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.5, Number((zoom - 0.25).toFixed(2))))}
            className="rounded border border-[rgba(200,168,76,0.12)] px-2 py-1 transition-colors hover:border-gold/30 hover:text-silver-bright"
            aria-label="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(1)}
            className="rounded border border-[rgba(200,168,76,0.12)] px-2 py-1 transition-colors hover:border-gold/30 hover:text-silver-bright"
          >
            reset
          </button>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(3, Number((zoom + 0.25).toFixed(2))))}
            className="rounded border border-[rgba(200,168,76,0.12)] px-2 py-1 transition-colors hover:border-gold/30 hover:text-silver-bright"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function SvgAssetContractPanel() {
  const [usage, setUsage] = useState<SvgAssetUsage>("live");
  const [family, setFamily] = useState<FamilyFilter>("hq");
  const [category, setCategory] = useState("");
  const [room, setRoom] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightingPresetId, setLightingPresetId] = useState("neutral");
  const [zoom, setZoom] = useState(1);

  const violations = useMemo(() => getSvgContractViolations(), []);
  const liveBindings = useMemo(() => getSvgRuntimeBindings(), []);
  const assets = useMemo(() => getSvgAssets(), []);
  const envParts = useMemo(() => getLoadedEnvParts(), []);

  const allRecords = useMemo(
    () => buildSvgAssetViewerRecords(assets, liveBindings, envParts),
    [assets, envParts, liveBindings],
  );

  const records = useMemo(
    () =>
      filterSvgAssetViewerRecords(allRecords, {
        usage,
        family,
        category,
        room,
        search,
      }),
    [allRecords, category, family, room, search, usage],
  );

  const categoryOptions = useMemo(() => {
    const options = allRecords
      .filter((record) => record.usage === usage)
      .filter((record) => !family || record.family === family)
      .map((record) => ({ value: record.categoryKey, label: record.categoryLabel }));
    return [
      { value: "", label: "All Categories" },
      ...new Map(options.map((option) => [option.value, option])).values(),
    ].sort((left, right) => left.label.localeCompare(right.label));
  }, [allRecords, family, usage]);

  const roomOptions = useMemo(() => {
    const rooms = allRecords
      .filter((record) => record.usage === usage)
      .filter((record) => !family || record.family === family)
      .filter((record) => !category || record.categoryKey === category)
      .map((record) => record.roomFamily)
      .filter((roomFamily): roomFamily is string => !!roomFamily);
    return [
      { value: "", label: "All Rooms" },
      ...[...new Set(rooms)].sort().map((value) => ({ value, label: value })),
    ];
  }, [allRecords, category, family, usage]);

  const selectedRecords = records.filter((record) => selectedIds.has(record.id));
  const primaryRecord = selectedRecords[0] ?? records[0] ?? null;
  const roomComparisonIds = useMemo(
    () => getRoomSceneComparisonIds(records, primaryRecord),
    [primaryRecord, records],
  );
  const preset = getEnvLightingPreset(lightingPresetId);

  useEffect(() => {
    setZoom(1);
  }, [primaryRecord?.id, selectedRecords.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] lg:w-[28rem] lg:border-b-0 lg:border-r">
        <div className="space-y-3 border-b border-[rgba(200,168,76,0.06)] p-4">
          <SearchInput value={search} onChange={setSearch} />
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Usage"
              value={usage}
              onChange={(next) => {
                setUsage(next as SvgAssetUsage);
                setCategory("");
                setRoom("");
                setSelectedIds(new Set());
              }}
              options={[
                { value: "live", label: "Live Assets" },
                { value: "library", label: "Library Assets" },
                { value: "reference", label: "Reference Assets" },
              ]}
            />
            <Select
              label="Family"
              value={family}
              onChange={(next) => {
                setFamily(next as FamilyFilter);
                setCategory("");
                setRoom("");
                setSelectedIds(new Set());
              }}
              options={[
                { value: "", label: "All Families" },
                { value: "hq", label: "HQ" },
                { value: "raid", label: "Raids" },
                { value: "operator", label: "Operators" },
              ]}
            />
            <Select
              label="Category"
              value={category}
              onChange={(next) => {
                setCategory(next);
                setRoom("");
                setSelectedIds(new Set());
              }}
              options={categoryOptions}
            />
            <Select
              label="Room"
              value={room}
              onChange={(next) => {
                setRoom(next);
                setSelectedIds(new Set());
              }}
              options={roomOptions}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-silver/55">
              {records.length} result{records.length === 1 ? "" : "s"}
              {selectedRecords.length > 0 ? ` • ${selectedRecords.length} selected` : ""}
            </span>
            <div className="flex items-center gap-2">
              {(search || category || room || family !== "hq" || usage !== "live") && (
                <button
                  type="button"
                  onClick={() => {
                    setUsage("live");
                    setFamily("hq");
                    setCategory("");
                    setRoom("");
                    setSearch("");
                    setSelectedIds(new Set());
                  }}
                  className="text-gold/70 transition-colors hover:text-gold"
                >
                  clear filters
                </button>
              )}
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(records.map((record) => record.id)))}
                  className="text-gold/70 transition-colors hover:text-gold"
                >
                  select all
                </button>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-3 py-2 text-xs text-silver/65">
            <span className="text-gold">Contract viewer:</span> runtime bindings stay authoritative,
            but the room and asset review controls are back so you can search, filter, compare, and
            iterate without leaving the contract-backed surface.
          </div>
          {violations.length > 0 && (
            <div className="rounded-lg border border-[rgba(200,96,96,0.18)] bg-[rgba(120,24,24,0.18)] px-3 py-2 text-xs text-silver/70">
              <span className="text-gold">{violations.length}</span> contract violation
              {violations.length === 1 ? "" : "s"} detected.
            </div>
          )}
          <div className="text-xs text-silver/45">
            Click selects a single record. Ctrl/Cmd-click builds a compare set for side-by-side
            review.
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {records.length > 0 ? (
              records.map((record) => (
                <RecordListItem
                  key={record.id}
                  record={record}
                  isPrimary={primaryRecord?.id === record.id}
                  isSelected={selectedIds.has(record.id)}
                  onSelect={(event) => {
                    if (event.ctrlKey || event.metaKey) {
                      setSelectedIds((previous) => {
                        const next = new Set(previous);
                        if (next.has(record.id)) {
                          next.delete(record.id);
                        } else {
                          next.add(record.id);
                        }
                        return next;
                      });
                      return;
                    }
                    setSelectedIds(new Set([record.id]));
                  }}
                />
              ))
            ) : (
              <div className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.2)] px-3 py-4 text-sm text-silver/45">
                No contracted records match the current filters.
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PreviewToolbar
          selectedCount={selectedRecords.length}
          zoom={zoom}
          onZoomChange={setZoom}
          lightingPresetId={lightingPresetId}
          onLightingPresetChange={setLightingPresetId}
          canCompareRoomStates={roomComparisonIds.length > 1}
          onCompareRoomStates={() => setSelectedIds(new Set(roomComparisonIds))}
          onShowSingle={() => primaryRecord && setSelectedIds(new Set([primaryRecord.id]))}
        />
        <div className="min-h-0 flex-1 bg-[rgba(6,6,8,0.45)]">
          <DetailPanel
            records={
              selectedRecords.length > 1 ? selectedRecords : primaryRecord ? [primaryRecord] : []
            }
            primaryRecord={primaryRecord}
            preset={preset}
            zoom={zoom}
          />
        </div>
      </section>
    </div>
  );
}
