import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { titleCase } from "./_glossary";
import { ENV_LIGHTING_PRESETS, getEnvLightingPreset } from "./environment-parts";
import { emptyStateClass } from "./styles";
import {
  getLoadedSvgAssetCatalog,
  type SvgCatalogAsset,
  type SvgCatalogFamily,
} from "./svg-file-catalog";

// ── Constants ────────────────────────────────────────────────────────────

const FAMILY_LABELS: Record<SvgCatalogFamily, string> = {
  operators: "Operators",
  hq: "HQ",
  raids: "Raids",
  other: "Other",
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;

// ── Shared UI ────────────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
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
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] py-2 pl-8 pr-8 text-xs text-silver-bright placeholder:text-silver/60 outline-none transition-all focus:border-gold/40 focus:shadow-[0_0_16px_rgba(200,168,76,0.06)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-silver/60 transition-colors hover:text-silver-bright"
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-[0.12em] text-gold/70">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.8)] px-2.5 py-1.5 text-xs text-silver-bright outline-none transition-colors focus:border-gold/40 [&>option]:bg-void"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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
      <div className="flex-1 text-xs text-silver-bright">{value ?? children}</div>
    </div>
  );
}

// ── List Item ────────────────────────────────────────────────────────────

function AssetListItem({
  asset,
  isSelected,
  onSelect,
}: {
  asset: SvgCatalogAsset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
        isSelected
          ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
          : "border-transparent hover:border-[rgba(200,168,76,0.1)] hover:bg-[rgba(200,168,76,0.03)]"
      }`}
    >
      <div
        className={`flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded border ${
          isSelected
            ? "border-gold/20 bg-[rgba(200,168,76,0.06)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]"
        }`}
      >
        <img
          src={asset.url}
          alt={asset.label}
          loading="lazy"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${isSelected ? "text-gold" : "text-silver-bright"}`}
        >
          {asset.label}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="rounded bg-[rgba(200,168,76,0.08)] px-1.5 py-0.5 text-xs text-gold/60">
            {FAMILY_LABELS[asset.family]}
          </span>
          <span className="text-xs text-silver/50">{titleCase(asset.stage)}</span>
          {asset.section && (
            <span className="text-xs text-silver/40">{titleCase(asset.section)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Detail View ──────────────────────────────────────────────────────────

function AssetDetail({
  asset,
  presetId,
  zoom,
}: {
  asset: SvgCatalogAsset;
  presetId: string;
  zoom: number;
}) {
  const preset = getEnvLightingPreset(presetId);
  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div className="animate-enter flex h-full flex-col">
      {/* Preview area */}
      <div
        ref={previewRef}
        className="relative flex flex-1 items-center justify-center overflow-auto"
        style={{ backgroundColor: preset.background }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-8 transition-transform duration-150 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
        >
          <img
            src={asset.url}
            alt={asset.label}
            className="max-h-[55vh] max-w-full object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
            draggable={false}
          />
        </div>
        {preset.overlay && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: preset.overlay }}
          />
        )}
      </div>

      {/* Metadata */}
      <div className="shrink-0 border-t border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.35)] p-5">
        <div className="mx-auto max-w-3xl space-y-3">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
              {asset.label}
            </h3>
            <p className="mt-0.5">
              <code className="text-xs text-gold/50">{asset.url}</code>
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <MetadataRow label="Family" value={FAMILY_LABELS[asset.family]} />
            <MetadataRow label="Collection" value={titleCase(asset.pack)} />
            <MetadataRow label="Type" value={titleCase(asset.stage)} />
            {asset.section && <MetadataRow label="Section" value={titleCase(asset.section)} />}
            <MetadataRow label="File" value={asset.filename} />
            <MetadataRow label="Directory">
              <code className="text-xs text-gold/40">{asset.directory}</code>
            </MetadataRow>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────

export function SvgFileCatalogPanel() {
  const catalog = getLoadedSvgAssetCatalog();
  const assets = catalog.assets;

  // Filter state
  const [search, setSearch] = useState("");
  const [activeFamily, setActiveFamily] = useState<SvgCatalogFamily | null>(null);
  const [collection, setCollection] = useState("");
  const [type, setType] = useState("");
  const [section, setSection] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Display state
  const [presetId, setPresetId] = useState("neutral");
  const [zoom, setZoom] = useState(1);

  // Wheel-zoom on the preview area (needs non-passive listener)
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // Only zoom when cursor is over the preview (not the metadata)
      const target = e.target as HTMLElement;
      if (!target.closest("[data-preview-area]")) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Cascading filter options — narrow based on active filters
  const filterOptions = useMemo(() => {
    let base = [...assets] as readonly SvgCatalogAsset[];
    if (activeFamily) base = base.filter((a) => a.family === activeFamily);

    const collections = [...new Set(base.map((a) => a.pack))]
      .sort()
      .map((v) => ({ value: v, label: titleCase(v) }));

    const afterCollection = collection ? base.filter((a) => a.pack === collection) : base;
    const types = [...new Set(afterCollection.map((a) => a.stage))]
      .sort()
      .map((v) => ({ value: v, label: titleCase(v) }));

    const afterType = type ? afterCollection.filter((a) => a.stage === type) : afterCollection;
    const sections = [
      ...new Set(afterType.map((a) => a.section).filter((s): s is string => s !== null)),
    ]
      .sort()
      .map((v) => ({ value: v, label: titleCase(v) }));

    return { collections, types, sections };
  }, [assets, activeFamily, collection, type]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assets.filter((asset) => {
      if (activeFamily && asset.family !== activeFamily) return false;
      if (collection && asset.pack !== collection) return false;
      if (type && asset.stage !== type) return false;
      if (section && asset.section !== section) return false;
      if (q) {
        const haystack = [
          asset.label,
          asset.filename,
          asset.url,
          asset.family,
          asset.pack,
          asset.stage,
          asset.section ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, search, activeFamily, collection, type, section]);

  // Family counts (always against full catalog, not filtered)
  const familyCounts = useMemo(() => {
    const counts = new Map<SvgCatalogFamily, number>();
    for (const asset of assets) {
      counts.set(asset.family, (counts.get(asset.family) ?? 0) + 1);
    }
    return counts;
  }, [assets]);

  const hasFilters = !!(search || activeFamily || collection || type || section);

  // Clear selection if selected asset is filtered out
  const effectiveSelectedId =
    selectedId && filteredAssets.some((a) => a.id === selectedId) ? selectedId : null;
  const effectiveSelectedAsset = effectiveSelectedId
    ? (assets.find((a) => a.id === effectiveSelectedId) ?? null)
    : null;

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveFamily(null);
    setCollection("");
    setType("");
    setSection("");
  }, []);

  function toggleFamily(family: SvgCatalogFamily) {
    if (activeFamily === family) {
      setActiveFamily(null);
    } else {
      setActiveFamily(family);
      setCollection("");
      setType("");
      setSection("");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="flex w-full shrink-0 flex-col border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] lg:w-80 lg:border-b-0 lg:border-r">
        {/* Search */}
        <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search assets..." />
        </div>

        {/* Family toggle chips */}
        <div className="flex flex-wrap gap-1.5 border-b border-[rgba(200,168,76,0.06)] px-3 py-2.5">
          {(Object.keys(FAMILY_LABELS) as SvgCatalogFamily[]).map((family) => {
            const count = familyCounts.get(family) ?? 0;
            if (count === 0) return null;
            const isActive = activeFamily === family;
            return (
              <button
                key={family}
                type="button"
                onClick={() => toggleFamily(family)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "border-gold/30 bg-gold/15 text-gold"
                    : "border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.5)] text-silver/50 hover:border-[rgba(200,168,76,0.15)] hover:text-silver/70"
                }`}
              >
                {FAMILY_LABELS[family]} <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
          <FilterSelect
            label="Collection"
            value={collection}
            onChange={(v) => {
              setCollection(v);
              setType("");
              setSection("");
            }}
            options={filterOptions.collections}
          />
          <FilterSelect
            label="Type"
            value={type}
            onChange={(v) => {
              setType(v);
              setSection("");
            }}
            options={filterOptions.types}
          />
          {filterOptions.sections.length > 0 && (
            <FilterSelect
              label="Section"
              value={section}
              onChange={setSection}
              options={filterOptions.sections}
            />
          )}
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-3 py-2">
          <span className="text-xs text-silver/60">
            {filteredAssets.length} asset{filteredAssets.length !== 1 ? "s" : ""}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-2 text-gold/70 transition-colors hover:text-gold"
              >
                clear
              </button>
            )}
          </span>
        </div>

        {/* Asset list */}
        <div className="max-h-[42vh] flex-1 space-y-0.5 overflow-y-auto p-2 lg:max-h-none">
          {filteredAssets.length === 0 ? (
            <div className={`${emptyStateClass} py-10`}>
              <p className="text-xs text-silver/60">No assets match your filters</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <AssetListItem
                key={asset.id}
                asset={asset}
                isSelected={effectiveSelectedId === asset.id}
                onSelect={() => setSelectedId(effectiveSelectedId === asset.id ? null : asset.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Detail panel ───────────────────────────────────────────── */}
      <div ref={mainRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar: lighting presets + zoom controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.25)] px-4 py-2">
          {/* Lighting presets */}
          <div className="flex items-center gap-1">
            {ENV_LIGHTING_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  presetId === p.id
                    ? "bg-[rgba(200,168,76,0.12)] text-gold"
                    : "text-silver/40 hover:text-silver/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[rgba(200,168,76,0.06)]" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
              className="flex h-6 w-6 items-center justify-center rounded text-sm text-silver/50 transition-colors hover:bg-[rgba(200,168,76,0.06)] hover:text-silver"
              aria-label="Zoom out"
            >
              &minus;
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="min-w-[3.25rem] rounded px-1.5 py-0.5 text-center text-xs text-silver/50 transition-colors hover:text-silver"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
              className="flex h-6 w-6 items-center justify-center rounded text-sm text-silver/50 transition-colors hover:bg-[rgba(200,168,76,0.06)] hover:text-silver"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="ml-1 rounded px-2 py-0.5 text-xs text-silver/40 transition-colors hover:text-silver/60"
            >
              Fit
            </button>
          </div>

          {effectiveSelectedAsset && (
            <>
              <div className="h-4 w-px bg-[rgba(200,168,76,0.06)]" />
              <span className="text-xs text-silver/40">Scroll to zoom in preview</span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden" data-preview-area>
          {effectiveSelectedAsset ? (
            <AssetDetail
              key={effectiveSelectedAsset.id}
              asset={effectiveSelectedAsset}
              presetId={presetId}
              zoom={zoom}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-2xl text-gold/15">&loz;</div>
              <p className="text-xs text-silver/60">Select an SVG asset to inspect</p>
              <p className="max-w-md text-sm leading-relaxed text-silver/40">
                Browse all {assets.length} shipped SVG files. Use the family chips and filters to
                narrow results, or search by name.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
