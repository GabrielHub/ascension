import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import partsIndexData from "../../content/data/operator-parts-index.json";

// ---------------------------------------------------------------------------
// Types for the operator parts index and presets manifest
// ---------------------------------------------------------------------------

interface OperatorPart {
  id: string;
  category: string;
  tags: string[];
  paletteTags: string[];
  roleTags: string[];
  bodyCompatibility: string[];
  poseCompatibility: string[];
  rarity: string;
}

interface PartsIndex {
  description: string;
  locked: string;
  style: string;
  viewBox: string;
  parts: OperatorPart[];
}

interface Preset {
  id: string;
  presentation: string;
  hair: string;
  eyes: string;
  renderer: string;
  module: string;
  referenceExemplar?: string;
}

interface PresetsManifest {
  description: string;
  locked: string;
  style: string;
  presets: Preset[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  weapon: "Weapons",
  "outfit-overlay": "Overlays",
  accessory: "Accessories",
};

const RARITY_STYLES: Record<string, string> = {
  common: "text-silver/60",
  uncommon: "text-gold/80",
  rare: "text-ember",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

// ---------------------------------------------------------------------------
// SVG fetch hook — shared by lazy and eager previews
// ---------------------------------------------------------------------------

function useSvgFetch(src: string, enabled: boolean) {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setSvgText(null);
    setError(false);
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setSvgText(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  return { svgText, error };
}

// ---------------------------------------------------------------------------
// SVG previews — lazy (sidebar thumbnails) and eager (detail panel)
// ---------------------------------------------------------------------------

function LazySvgPreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { svgText, error } = useSvgFetch(src, visible);

  if (error) {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center text-[0.6875rem] text-silver/60 ${className ?? ""}`}
      >
        &times;
      </div>
    );
  }
  if (!svgText) {
    return (
      <div ref={ref} className={`flex items-center justify-center ${className ?? ""}`}>
        <div className="h-2 w-2 rounded-full bg-gold/30 animate-pulse" />
      </div>
    );
  }
  return (
    <div
      ref={ref}
      className={className}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
}

function SvgPreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { svgText, error } = useSvgFetch(src, true);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-[0.6875rem] text-silver/60 ${className ?? ""}`}
      >
        failed to load
      </div>
    );
  }
  if (!svgText) {
    return (
      <div
        className={`flex items-center justify-center text-[0.6875rem] text-silver/60 ${className ?? ""}`}
      >
        loading&hellip;
      </div>
    );
  }
  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
}

// ---------------------------------------------------------------------------
// Filter dropdown
// ---------------------------------------------------------------------------

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-gold/70">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.8)] px-2.5 py-1.5 text-xs text-silver-bright outline-none transition-colors focus:border-gold/40 [&>option]:bg-void"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar part list item
// ---------------------------------------------------------------------------

function PartListItem({
  part,
  isSelected,
  onToggle,
  onSelect,
}: {
  part: OperatorPart;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const name = part.id.split("/").pop() ?? part.id;

  return (
    <button
      type="button"
      onClick={(e) => (e.ctrlKey || e.metaKey ? onToggle() : onSelect())}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
        isSelected
          ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
          : "border-transparent hover:border-[rgba(200,168,76,0.1)] hover:bg-[rgba(200,168,76,0.03)]"
      }`}
    >
      {/* Thumbnail */}
      <div
        className={`flex h-12 w-9 shrink-0 items-center justify-center rounded border ${
          isSelected
            ? "border-gold/20 bg-[rgba(200,168,76,0.06)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]"
        }`}
      >
        <LazySvgPreview
          src={`/data/svg-parts/operators/parts/${part.id}.svg`}
          alt={name}
          className="h-10 w-7 [&>svg]:h-full [&>svg]:w-full"
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${isSelected ? "text-gold" : "text-silver-bright"}`}
        >
          {name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[0.6875rem] text-silver/60">{categoryLabel(part.category)}</span>
          <span className={`text-[0.6875rem] ${RARITY_STYLES[part.rarity] ?? "text-silver/60"}`}>
            {part.rarity}
          </span>
        </div>
      </div>

      {/* Selection checkbox */}
      <div
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          isSelected
            ? "border-gold bg-gold"
            : "border-[rgba(200,168,76,0.15)] group-hover:border-gold/30"
        }`}
      >
        {isSelected && (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-void"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail panel — metadata row
// ---------------------------------------------------------------------------

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
      <span className="w-20 shrink-0 text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-gold/70">
        {label}
      </span>
      <div className="flex-1 text-xs text-silver-bright">{value ?? children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel — single asset view
// ---------------------------------------------------------------------------

function SingleAssetDetail({ part }: { part: OperatorPart }) {
  const name = part.id.split("/").pop() ?? part.id;

  return (
    <div className="animate-enter flex flex-col items-center gap-6 p-8">
      {/* Large preview */}
      <div className="flex h-64 w-48 items-center justify-center rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.6)]">
        <SvgPreview
          src={`/data/svg-parts/operators/parts/${part.id}.svg`}
          alt={name}
          className="h-56 w-40 [&>svg]:h-full [&>svg]:w-full"
        />
      </div>

      {/* Metadata */}
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            {name}
          </h3>
          <p className="mt-1 text-[0.6875rem] text-silver/60">
            <code className="text-gold/70">{part.id}.svg</code>
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-4">
          <MetadataRow label="Category" value={categoryLabel(part.category)} />
          <MetadataRow label="Rarity">
            <span className={RARITY_STYLES[part.rarity] ?? "text-silver/60"}>{part.rarity}</span>
          </MetadataRow>
          <MetadataRow label="Tags">
            <div className="flex flex-wrap gap-1">
              {part.tags.map((t) => (
                <span key={t} className="badge badge-gold">
                  {t}
                </span>
              ))}
            </div>
          </MetadataRow>
          <MetadataRow label="Roles">
            <div className="flex flex-wrap gap-1">
              {part.roleTags.map((r) => (
                <span key={r} className="badge badge-slate">
                  {r}
                </span>
              ))}
            </div>
          </MetadataRow>
          <MetadataRow label="Body" value={part.bodyCompatibility.join(", ")} />
          <MetadataRow label="Pose" value={part.poseCompatibility.join(", ")} />
          <MetadataRow label="Palettes" value={part.paletteTags.join(", ")} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail panel — multi-asset comparison
// ---------------------------------------------------------------------------

function ComparisonView({ parts }: { parts: OperatorPart[] }) {
  return (
    <div className="animate-enter p-6">
      <div className="mb-5 text-center">
        <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Comparing {parts.length} assets
        </h3>
      </div>
      <div
        className={`grid gap-4 ${
          parts.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {parts.map((part) => {
          const name = part.id.split("/").pop() ?? part.id;
          return (
            <div
              key={part.id}
              className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] p-4"
            >
              <div className="flex h-40 w-28 items-center justify-center rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]">
                <SvgPreview
                  src={`/data/svg-parts/operators/parts/${part.id}.svg`}
                  alt={name}
                  className="h-36 w-24 [&>svg]:h-full [&>svg]:w-full"
                />
              </div>
              <div className="w-full space-y-2 text-center">
                <p className="text-xs font-medium text-silver-bright">{name}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <span className="badge badge-gold">{categoryLabel(part.category)}</span>
                  <span
                    className={`text-[0.6875rem] ${RARITY_STYLES[part.rarity] ?? "text-silver/60"}`}
                  >
                    {part.rarity}
                  </span>
                </div>
                <div className="space-y-0.5 text-[0.6875rem] text-silver/60">
                  <p>Roles: {part.roleTags.join(", ")}</p>
                  <p>Body: {part.bodyCompatibility.join(", ")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content — canonical references
// ---------------------------------------------------------------------------

function ReferencesContent() {
  const refs = [
    {
      file: "male-bruiser-swept.svg",
      label: "Male Bruiser (Swept)",
      path: "/data/svg-parts/operators/reference/male-bruiser-swept.svg",
    },
    {
      file: "female-infiltrator-flowing.svg",
      label: "Female Infiltrator (Flowing)",
      path: "/data/svg-parts/operators/reference/female-infiltrator-flowing.svg",
    },
    {
      file: "neutral-strategist-tousled.svg",
      label: "Neutral Strategist (Tousled)",
      path: "/data/svg-parts/operators/reference/neutral-strategist-tousled.svg",
    },
  ];

  return (
    <div className="animate-enter mx-auto max-w-4xl p-8">
      <p className="mb-6 text-[0.6875rem] text-silver/60">
        Locked exemplar SVGs from{" "}
        <code className="text-gold/70">public/data/svg-parts/operators/reference/</code>
      </p>
      <div className="grid gap-6 sm:grid-cols-3">
        {refs.map((r) => (
          <div
            key={r.file}
            className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-5"
          >
            <SvgPreview
              src={r.path}
              alt={r.label}
              className="h-52 w-40 [&>svg]:h-full [&>svg]:w-full"
            />
            <div className="text-center">
              <p className="text-xs font-medium text-silver-bright">{r.label}</p>
              <p className="mt-0.5 text-[0.6875rem] text-silver/60">{r.file}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content — presets manifest
// ---------------------------------------------------------------------------

function PresetsContent({ presets }: { presets: PresetsManifest | null }) {
  if (!presets) {
    return (
      <div className="empty-state py-12">
        <p className="text-xs text-silver/60">Loading presets&hellip;</p>
      </div>
    );
  }

  const byPresentation = new Map<string, Preset[]>();
  for (const p of presets.presets) {
    const list = byPresentation.get(p.presentation) ?? [];
    list.push(p);
    byPresentation.set(p.presentation, list);
  }

  return (
    <div className="animate-enter mx-auto max-w-4xl space-y-6 p-8">
      <p className="text-[0.6875rem] text-silver/60">
        {presets.presets.length} presets &mdash; style:{" "}
        <span className="text-gold/70">{presets.style}</span>, locked {presets.locked}
      </p>
      {[...byPresentation.entries()].map(([pres, items]) => (
        <div key={pres}>
          <h3 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.15em] text-gold/70">
            {pres}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((preset) => (
              <div
                key={preset.id}
                className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] px-4 py-3"
              >
                <p className="text-xs font-medium text-silver-bright">{preset.id}</p>
                <p className="mt-1 text-[0.6875rem] text-silver/60">Hair: {preset.hair}</p>
                <p className="text-[0.6875rem] text-silver/60">Eyes: {preset.eyes}</p>
                <p className="mt-1.5 text-[0.6875rem] text-silver/60">
                  Renderer: <code className="text-gold/70">{preset.renderer}</code>
                </p>
                {preset.referenceExemplar && (
                  <p className="text-[0.6875rem] text-silver/60">
                    Exemplar:{" "}
                    <code className="text-gold/70">
                      {preset.referenceExemplar.split("/").pop()}
                    </code>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function SvgAssetViewerPage() {
  const [partsIndex] = useState<PartsIndex>(partsIndexData as PartsIndex);
  const [presets, setPresets] = useState<PresetsManifest | null>(null);
  const [activeTab, setActiveTab] = useState<"parts" | "references" | "presets">("parts");

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [bodyFilter, setBodyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/svg-parts/operators/presets.json")
      .then((r) => r.json())
      .then(setPresets)
      .catch(() => {});
  }, []);

  // Derive unique filter options from the full parts set
  const filterOptions = useMemo(() => {
    const parts = partsIndex.parts;
    return {
      categories: [...new Set(parts.map((p) => p.category))],
      rarities: [...new Set(parts.map((p) => p.rarity))],
      bodies: [...new Set(parts.flatMap((p) => p.bodyCompatibility))],
      roles: [...new Set(parts.flatMap((p) => p.roleTags))],
    };
  }, [partsIndex.parts]);

  // Filtered parts based on search and filters
  const filteredParts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return partsIndex.parts.filter((p) => {
      if (q) {
        const haystack = [
          p.id,
          ...p.tags,
          ...p.roleTags,
          p.category,
          p.rarity,
          ...p.bodyCompatibility,
          ...p.paletteTags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (rarityFilter && p.rarity !== rarityFilter) return false;
      if (bodyFilter && !p.bodyCompatibility.includes(bodyFilter)) return false;
      if (roleFilter && !p.roleTags.includes(roleFilter)) return false;
      return true;
    });
  }, [partsIndex.parts, searchQuery, categoryFilter, rarityFilter, bodyFilter, roleFilter]);

  // Selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectOnly = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredParts.map((p) => p.id)));
  }, [filteredParts]);

  // Resolve selected parts (preserving index order)
  const selectedParts = useMemo(
    () => partsIndex.parts.filter((p) => selectedIds.has(p.id)),
    [partsIndex.parts, selectedIds],
  );

  const hasActiveFilters = !!(
    searchQuery ||
    categoryFilter ||
    rarityFilter ||
    bodyFilter ||
    roleFilter
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setCategoryFilter("");
    setRarityFilter("");
    setBodyFilter("");
    setRoleFilter("");
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-void">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="animate-enter shrink-0 border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.7)] backdrop-blur-xl">
        <div className="flex items-center gap-4 px-5 py-3">
          <Link to="/" className="btn-ghost text-xs">
            &larr; back
          </Link>
          <div className="h-4 w-px bg-[rgba(200,168,76,0.08)]" />
          <h1 className="flex-1 font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
            SVG Asset Viewer
          </h1>
          {selectedIds.size > 0 && (
            <span className="text-[0.6875rem] text-gold/80">{selectedIds.size} selected</span>
          )}
          <Link to="/svg-playground" className="btn-ghost text-xs">
            playground &rarr;
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-t border-[rgba(200,168,76,0.04)] px-5">
          {(["parts", "references", "presets"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className="tab-button"
              data-active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "parts" ? `Parts (${partsIndex.parts.length})` : tab}
            </button>
          ))}
        </div>
      </header>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      {activeTab === "parts" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar catalog ─────────────────────────────────────── */}
          <aside className="flex w-80 shrink-0 flex-col border-r border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)]">
            {/* Search */}
            <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, tag, role&hellip;"
                  className="w-full rounded-lg border border-[rgba(200,168,76,0.1)] bg-[rgba(6,6,8,0.6)] py-2 pl-8 pr-8 text-xs text-silver-bright placeholder:text-silver/60 outline-none transition-all focus:border-gold/40 focus:shadow-[0_0_16px_rgba(200,168,76,0.06)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
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
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={filterOptions.categories.map((c) => ({
                  value: c,
                  label: categoryLabel(c),
                }))}
              />
              <FilterSelect
                label="Rarity"
                value={rarityFilter}
                onChange={setRarityFilter}
                options={filterOptions.rarities.map((r) => ({ value: r, label: r }))}
              />
              <FilterSelect
                label="Body"
                value={bodyFilter}
                onChange={setBodyFilter}
                options={filterOptions.bodies.map((b) => ({ value: b, label: b }))}
              />
              <FilterSelect
                label="Role"
                value={roleFilter}
                onChange={setRoleFilter}
                options={filterOptions.roles.map((r) => ({ value: r, label: r }))}
              />
            </div>

            {/* Results bar */}
            <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-3 py-2">
              <span className="text-[0.6875rem] text-silver/60">
                {filteredParts.length} result{filteredParts.length !== 1 ? "s" : ""}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-2 text-gold/70 transition-colors hover:text-gold"
                  >
                    clear
                  </button>
                )}
              </span>
              <div className="flex items-center gap-2 text-[0.6875rem]">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-silver/60 transition-colors hover:text-silver"
                  >
                    deselect
                  </button>
                )}
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-gold/70 transition-colors hover:text-gold"
                >
                  all
                </button>
              </div>
            </div>

            {/* Scrollable parts list */}
            <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {filteredParts.length === 0 ? (
                <div className="empty-state py-10">
                  <p className="text-xs text-silver/60">No parts match your filters</p>
                </div>
              ) : (
                filteredParts.map((part) => (
                  <PartListItem
                    key={part.id}
                    part={part}
                    isSelected={selectedIds.has(part.id)}
                    onToggle={() => toggleSelect(part.id)}
                    onSelect={() => selectOnly(part.id)}
                  />
                ))
              )}
            </div>
          </aside>

          {/* ── Detail / inspection panel ───────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            {selectedParts.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="text-2xl text-gold/15">&loz;</div>
                <p className="text-xs text-silver/60">Select a part to inspect</p>
                <p className="text-[0.6875rem] text-silver/60">
                  Click to select &middot; Ctrl+click to multi-select
                </p>
              </div>
            )}
            {selectedParts.length === 1 && (
              <SingleAssetDetail key={selectedParts[0].id} part={selectedParts[0]} />
            )}
            {selectedParts.length > 1 && (
              <ComparisonView key={[...selectedIds].sort().join()} parts={selectedParts} />
            )}
          </main>
        </div>
      ) : activeTab === "references" ? (
        <main key="references" className="flex-1 overflow-y-auto">
          <ReferencesContent />
        </main>
      ) : (
        <main key="presets" className="flex-1 overflow-y-auto">
          <PresetsContent presets={presets} />
        </main>
      )}
    </div>
  );
}
