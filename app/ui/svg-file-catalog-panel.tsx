import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { titleCase } from "./_glossary";
import { ENV_LIGHTING_PRESETS, getEnvLightingPreset } from "./environment-parts";
import { emptyStateClass } from "./styles";
import {
  getLoadedSvgAssetCatalog,
  getRoomGroups,
  type SvgCatalogAsset,
  type SvgCatalogView,
} from "./svg-file-catalog";

// ── Constants ────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<SvgCatalogView, string> = {
  "hq-rooms": "HQ Rooms",
  "hq-parts": "HQ Parts",
  raids: "Raids",
  equipment: "Equipment",
  reference: "Reference",
};

const SUBGROUP_ORDER: Record<string, readonly string[]> = {
  "hq-parts": ["background", "props", "structure", "shell", "room-kits"],
  raids: ["bosses", "enemies", "tiles", "features", "markers"],
  equipment: ["weapon", "accessory", "outfit-overlay"],
  reference: ["hq", "raids"],
};

const SUBGROUP_LABELS: Record<string, string> = {
  background: "Backgrounds",
  props: "Props",
  structure: "Structure",
  shell: "Shell",
  "room-kits": "Room Kits",
  bosses: "Bosses",
  enemies: "Enemies",
  tiles: "Dungeon Tiles",
  features: "Features",
  markers: "Markers",
  weapon: "Weapons",
  accessory: "Accessories",
  "outfit-overlay": "Outfit Overlays",
  hq: "HQ Reference",
  raids: "Raids Reference",
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
  large,
}: {
  asset: SvgCatalogAsset;
  isSelected: boolean;
  onSelect: () => void;
  large?: boolean;
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
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded border ${
          large ? "h-16 w-18" : "h-12 w-14"
        } ${
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
        {asset.subGroup && (
          <span className="mt-0.5 inline-block text-xs text-silver/40">
            {SUBGROUP_LABELS[asset.subGroup] ?? titleCase(asset.subGroup)}
          </span>
        )}
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

  return (
    <div className="animate-enter flex h-full flex-col">
      {/* Preview area */}
      <div
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
            <MetadataRow label="View" value={VIEW_LABELS[asset.view]} />
            {asset.subGroup && (
              <MetadataRow
                label="Group"
                value={SUBGROUP_LABELS[asset.subGroup] ?? titleCase(asset.subGroup)}
              />
            )}
            {asset.tier !== null && <MetadataRow label="Tier" value={`Tier ${asset.tier}`} />}
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

// ── Room Comparison View ─────────────────────────────────────────────────

function RoomComparisonView({
  roomBaseName,
  tiers,
  presetId,
  zoom,
  onSelectTier,
}: {
  roomBaseName: string;
  tiers: SvgCatalogAsset[];
  presetId: string;
  zoom: number;
  onSelectTier: (assetId: string) => void;
}) {
  const preset = getEnvLightingPreset(presetId);
  const displayName = titleCase(roomBaseName.replace(/^the-/, ""));

  return (
    <div className="animate-enter flex h-full flex-col">
      {/* Side-by-side preview */}
      <div
        className="relative flex flex-1 items-stretch justify-center gap-px overflow-auto"
        style={{ backgroundColor: preset.background }}
      >
        {tiers.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => onSelectTier(tier.id)}
            className="group relative min-h-0 flex-1 transition-all hover:bg-[rgba(200,168,76,0.03)]"
          >
            {/* Tier label */}
            <div className="absolute top-3 left-1/2 z-10 -translate-x-1/2">
              <span className="rounded-full border border-gold/20 bg-[rgba(6,6,8,0.7)] px-2.5 py-0.5 text-xs font-medium text-gold/80 backdrop-blur-sm">
                Tier {tier.tier ?? 1}
              </span>
            </div>

            {/* Image — absolute fill like AssetDetail */}
            <div
              className="absolute inset-0 flex items-center justify-center p-8 pt-12 transition-transform duration-150 ease-out"
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
            >
              <img
                src={tier.url}
                alt={`${displayName} Tier ${tier.tier ?? 1}`}
                className="max-h-full max-w-full object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                draggable={false}
              />
            </div>

            {/* Hover hint */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded bg-[rgba(6,6,8,0.8)] px-2 py-0.5 text-xs text-silver/60 backdrop-blur-sm">
                Click to inspect
              </span>
            </div>
          </button>
        ))}

        {/* Divider lines between tiers */}
        {tiers.length > 1 &&
          tiers.slice(1).map((tier) => (
            <div
              key={`div-${tier.id}`}
              className="absolute top-0 bottom-0 z-[1] w-px bg-[rgba(200,168,76,0.08)]"
              style={{
                left: `${(tiers.indexOf(tier) / tiers.length) * 100}%`,
              }}
            />
          ))}

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
          <div className="flex items-baseline gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
              {displayName}
            </h3>
            <span className="text-xs text-gold/50">
              {tiers.length} tier{tiers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => onSelectTier(tier.id)}
                className="rounded border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.5)] px-2.5 py-1 text-xs text-silver/60 transition-all hover:border-gold/20 hover:text-silver-bright"
              >
                <span className="text-gold/60">T{tier.tier ?? 1}</span>{" "}
                <code className="text-xs text-silver/40">{tier.filename}</code>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View: HQ Rooms ──────────────────────────────────────────────────────

function HqRoomsViewList({
  assets,
  selectedRoomGroup,
  onSelectRoom,
}: {
  assets: readonly SvgCatalogAsset[];
  selectedRoomGroup: string | null;
  onSelectRoom: (roomBaseName: string) => void;
}) {
  const roomGroups = useMemo(() => getRoomGroups(assets), [assets]);
  const sortedRoomNames = useMemo(
    () => [...roomGroups.keys()].sort((a, b) => a.localeCompare(b)),
    [roomGroups],
  );

  if (sortedRoomNames.length === 0) {
    return (
      <div className={`${emptyStateClass} py-10`}>
        <p className="text-xs text-silver/60">No room scenes match your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {sortedRoomNames.map((roomName) => {
        const tiers = roomGroups.get(roomName) ?? [];
        const displayName = titleCase(roomName.replace(/^the-/, ""));
        const isActive = selectedRoomGroup === roomName;

        return (
          <button
            key={roomName}
            type="button"
            onClick={() => onSelectRoom(roomName)}
            className={`group flex w-full flex-col gap-2 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
              isActive
                ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
                : "border-transparent hover:border-[rgba(200,168,76,0.1)] hover:bg-[rgba(200,168,76,0.03)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-medium ${isActive ? "text-gold" : "text-silver-bright"}`}
              >
                {displayName}
              </span>
              <span className="rounded-full bg-[rgba(200,168,76,0.06)] px-1.5 py-0.5 text-xs text-gold/50">
                {tiers.length} tier{tiers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Tier thumbnail strip */}
            <div className="flex gap-1.5">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`flex h-10 w-14 items-center justify-center overflow-hidden rounded border transition-colors ${
                    isActive
                      ? "border-gold/15 bg-[rgba(200,168,76,0.04)]"
                      : "border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]"
                  }`}
                >
                  <img
                    src={tier.url}
                    alt={`Tier ${tier.tier}`}
                    loading="lazy"
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── View: Grouped List ──────────────────────────────────────────────────

function GroupedAssetList({
  assets,
  view,
  selectedId,
  onSelectAsset,
}: {
  assets: readonly SvgCatalogAsset[];
  view: SvgCatalogView;
  selectedId: string | null;
  onSelectAsset: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const order = SUBGROUP_ORDER[view] ?? [];
    const map = new Map<string, SvgCatalogAsset[]>();

    for (const asset of assets) {
      const key = asset.subGroup ?? "other";
      const existing = map.get(key);
      if (existing) {
        existing.push(asset);
      } else {
        map.set(key, [asset]);
      }
    }

    // Sort by defined order, then alphabetically for any extras
    const sorted: [string, SvgCatalogAsset[]][] = [];
    for (const key of order) {
      const group = map.get(key);
      if (group) {
        sorted.push([key, group]);
        map.delete(key);
      }
    }
    for (const [key, group] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      sorted.push([key, group]);
    }

    return sorted;
  }, [assets, view]);

  if (groups.length === 0) {
    return (
      <div className={`${emptyStateClass} py-10`}>
        <p className="text-xs text-silver/60">No assets match your search</p>
      </div>
    );
  }

  const useLargeThumbs = view === "raids";

  return (
    <div className="space-y-3 p-2">
      {groups.map(([groupKey, groupAssets]) => (
        <div key={groupKey}>
          {/* Section header */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold/60">
              {SUBGROUP_LABELS[groupKey] ?? titleCase(groupKey)}
            </span>
            <span className="text-xs text-silver/30">{groupAssets.length}</span>
            <div className="h-px flex-1 bg-[rgba(200,168,76,0.06)]" />
          </div>

          {/* Asset list */}
          <div className="space-y-0.5">
            {groupAssets.map((asset) => (
              <AssetListItem
                key={asset.id}
                asset={asset}
                isSelected={selectedId === asset.id}
                onSelect={() => onSelectAsset(asset.id)}
                large={useLargeThumbs && groupKey === "bosses"}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Filter Select ────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  onChange,
  showAll = true,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  showAll?: boolean;
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
        {showAll && <option value="">All</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────────

export function SvgFileCatalogPanel() {
  const catalog = getLoadedSvgAssetCatalog();
  const assets = catalog.assets;

  // Navigation state
  const [activeView, setActiveView] = useState<SvgCatalogView>("hq-rooms");
  const [activeSubGroup, setActiveSubGroup] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRoomGroup, setSelectedRoomGroup] = useState<string | null>(null);

  // Display state
  const [presetId, setPresetId] = useState("neutral");
  const [zoom, setZoom] = useState(1);

  // Wheel-zoom on the preview area
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-preview-area]")) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Available sub-groups for the active view
  const subGroupOptions = useMemo(() => {
    const viewAssets = assets.filter((a) => a.view === activeView);
    const order = SUBGROUP_ORDER[activeView] ?? [];
    const seen = new Set<string>();
    for (const a of viewAssets) {
      if (a.subGroup) seen.add(a.subGroup);
    }
    const ordered: { value: string; label: string }[] = [];
    for (const key of order) {
      if (seen.has(key)) {
        ordered.push({ value: key, label: SUBGROUP_LABELS[key] ?? titleCase(key) });
        seen.delete(key);
      }
    }
    for (const key of [...seen].sort()) {
      ordered.push({ value: key, label: SUBGROUP_LABELS[key] ?? titleCase(key) });
    }
    return ordered;
  }, [assets, activeView]);

  // View options for the dropdown
  const viewOptions = useMemo(() => {
    const counts = new Map<SvgCatalogView, number>();
    for (const asset of assets) {
      counts.set(asset.view, (counts.get(asset.view) ?? 0) + 1);
    }
    return (Object.keys(VIEW_LABELS) as SvgCatalogView[])
      .filter((v) => (counts.get(v) ?? 0) > 0)
      .map((v) => ({
        value: v,
        label: `${VIEW_LABELS[v]} (${counts.get(v)})`,
      }));
  }, [assets]);

  // Filtered assets for the active view + sub-group
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return assets.filter((asset) => {
      if (asset.view !== activeView) return false;
      if (activeSubGroup && asset.subGroup !== activeSubGroup) return false;
      if (q) {
        const haystack = [
          asset.label,
          asset.filename,
          asset.url,
          asset.subGroup ?? "",
          asset.roomBaseName ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [assets, activeView, activeSubGroup, search]);

  const hasFilters = search.length > 0 || activeSubGroup.length > 0;

  // Clear selection if it's filtered out
  const effectiveSelectedId =
    selectedId && filteredAssets.some((a) => a.id === selectedId) ? selectedId : null;
  const effectiveSelectedAsset = effectiveSelectedId
    ? (filteredAssets.find((a) => a.id === effectiveSelectedId) ?? null)
    : null;

  // Room comparison data — filter directly instead of building full groups map
  const roomComparisonTiers = useMemo(() => {
    if (activeView !== "hq-rooms" || !selectedRoomGroup) return null;
    const tiers = assets
      .filter((a) => a.view === "hq-rooms" && a.roomBaseName === selectedRoomGroup)
      .sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1));
    return tiers.length > 0 ? tiers : null;
  }, [assets, activeView, selectedRoomGroup]);

  function changeView(view: SvgCatalogView) {
    setActiveView(view);
    setActiveSubGroup("");
    setSelectedId(null);
    setSelectedRoomGroup(null);
  }

  const handleSelectRoom = useCallback(
    (roomBaseName: string) => {
      if (selectedRoomGroup === roomBaseName) {
        setSelectedRoomGroup(null);
      } else {
        setSelectedRoomGroup(roomBaseName);
        setSelectedId(null);
      }
    },
    [selectedRoomGroup],
  );

  const handleSelectAsset = useCallback(
    (id: string) => {
      setSelectedId(effectiveSelectedId === id ? null : id);
      setSelectedRoomGroup(null);
    },
    [effectiveSelectedId],
  );

  // Determine what the detail panel shows
  const showRoomComparison =
    activeView === "hq-rooms" &&
    selectedRoomGroup &&
    roomComparisonTiers &&
    !effectiveSelectedAsset;

  return (
    <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="flex w-full shrink-0 flex-col border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] lg:w-80 lg:border-b-0 lg:border-r">
        {/* Search */}
        <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search assets..." />
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
          <FilterSelect
            label="View"
            value={activeView}
            onChange={(v) => changeView(v as SvgCatalogView)}
            options={viewOptions}
            showAll={false}
          />
          {subGroupOptions.length > 0 && (
            <FilterSelect
              label="Group"
              value={activeSubGroup}
              onChange={setActiveSubGroup}
              options={subGroupOptions}
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
                onClick={() => {
                  setSearch("");
                  setActiveSubGroup("");
                }}
                className="ml-2 text-gold/70 transition-colors hover:text-gold"
              >
                clear
              </button>
            )}
          </span>
        </div>

        {/* View-specific list */}
        <div className="max-h-[42vh] flex-1 overflow-y-auto lg:max-h-none">
          {activeView === "hq-rooms" ? (
            <HqRoomsViewList
              assets={filteredAssets}
              selectedRoomGroup={selectedRoomGroup}
              onSelectRoom={handleSelectRoom}
            />
          ) : (
            <GroupedAssetList
              assets={filteredAssets}
              view={activeView}
              selectedId={effectiveSelectedId}
              onSelectAsset={handleSelectAsset}
            />
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

          {(effectiveSelectedAsset || showRoomComparison) && (
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
          ) : showRoomComparison && roomComparisonTiers ? (
            <RoomComparisonView
              key={selectedRoomGroup}
              roomBaseName={selectedRoomGroup}
              tiers={roomComparisonTiers}
              presetId={presetId}
              zoom={zoom}
              onSelectTier={(id) => {
                setSelectedId(id);
              }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="text-2xl text-gold/15">&loz;</div>
              <p className="text-xs text-silver/60">
                {activeView === "hq-rooms"
                  ? "Select a room to compare upgrade tiers"
                  : "Select an asset to inspect"}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-silver/40">
                Browse {filteredAssets.length} assets in{" "}
                <span className="text-gold/50">{VIEW_LABELS[activeView]}</span>. Use the tabs to
                switch views or search by name.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
