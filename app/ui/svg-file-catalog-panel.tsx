import { type ReactNode, useMemo, useState } from "react";

import { emptyStateClass } from "./styles";
import {
  getLoadedSvgAssetCatalog,
  type SvgCatalogAsset,
  type SvgCatalogFamily,
} from "./svg-file-catalog";

const FAMILY_LABELS: Record<SvgCatalogFamily, string> = {
  operators: "Operators",
  hq: "HQ",
  raids: "Raids",
  other: "Other",
};

function formatTokenLabel(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium uppercase tracking-[0.12em] text-gold/70">
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
      <span className="w-20 shrink-0 text-sm font-medium uppercase tracking-[0.1em] text-gold/70">
        {label}
      </span>
      <div className="flex-1 text-xs text-silver-bright">{value ?? children}</div>
    </div>
  );
}

function SelectionCheckbox({ isSelected }: { isSelected: boolean }) {
  return (
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
  );
}

function CatalogAssetThumbnail({
  asset,
  className,
}: {
  asset: SvgCatalogAsset;
  className: string;
}) {
  return (
    <img
      src={asset.url}
      alt={asset.label}
      loading="lazy"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

function CatalogListItem({
  asset,
  isSelected,
  onToggle,
  onSelect,
}: {
  asset: SvgCatalogAsset;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => (event.ctrlKey || event.metaKey ? onToggle() : onSelect())}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ${
        isSelected
          ? "border-gold/30 bg-[rgba(200,168,76,0.08)]"
          : "border-transparent hover:border-[rgba(200,168,76,0.1)] hover:bg-[rgba(200,168,76,0.03)]"
      }`}
    >
      <div
        className={`flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded border ${
          isSelected
            ? "border-gold/20 bg-[rgba(200,168,76,0.06)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]"
        }`}
      >
        <CatalogAssetThumbnail asset={asset} className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${isSelected ? "text-gold" : "text-silver-bright"}`}
        >
          {asset.filename}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-silver/60">
          <span>{FAMILY_LABELS[asset.family]}</span>
          <span>{formatTokenLabel(asset.pack)}</span>
          <span>{formatTokenLabel(asset.stage)}</span>
          {asset.section && <span>{formatTokenLabel(asset.section)}</span>}
        </div>
      </div>
      <SelectionCheckbox isSelected={isSelected} />
    </button>
  );
}

function CatalogSingleDetail({ asset }: { asset: SvgCatalogAsset }) {
  return (
    <div className="animate-enter flex flex-col items-center gap-6 p-8">
      <div className="flex h-80 w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.6)] p-4">
        <CatalogAssetThumbnail asset={asset} className="max-h-full max-w-full" />
      </div>
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            {asset.label}
          </h3>
          <p className="mt-1 text-sm text-silver/60">
            <code className="text-gold/70">{asset.url}</code>
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-4">
          <MetadataRow label="Family" value={FAMILY_LABELS[asset.family]} />
          <MetadataRow label="Pack" value={formatTokenLabel(asset.pack)} />
          <MetadataRow label="Stage" value={formatTokenLabel(asset.stage)} />
          {asset.section && <MetadataRow label="Section" value={formatTokenLabel(asset.section)} />}
          <MetadataRow label="File" value={asset.filename} />
          <MetadataRow label="Path">
            <code className="text-sm text-gold/70">{asset.path}</code>
          </MetadataRow>
          <MetadataRow label="Directory">
            <code className="text-sm text-gold/70">{asset.directory}</code>
          </MetadataRow>
        </div>
      </div>
    </div>
  );
}

function CatalogComparisonView({ assets }: { assets: SvgCatalogAsset[] }) {
  return (
    <div className="animate-enter p-6">
      <div className="mb-5 text-center">
        <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Comparing {assets.length} SVG assets
        </h3>
      </div>
      <div
        className={`grid gap-4 ${
          assets.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="flex flex-col gap-3 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] p-4"
          >
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.5)] p-3">
              <CatalogAssetThumbnail asset={asset} className="max-h-full max-w-full" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-silver-bright">{asset.filename}</p>
              <div className="flex flex-wrap gap-1">
                <span className="badge badge-gold">{FAMILY_LABELS[asset.family]}</span>
                <span className="badge badge-slate text-xs">{formatTokenLabel(asset.stage)}</span>
                {asset.section && (
                  <span className="badge badge-slate text-xs">
                    {formatTokenLabel(asset.section)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SvgFileCatalogPanel() {
  const catalog = getLoadedSvgAssetCatalog();
  const assets = catalog.assets;
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("");
  const [pack, setPack] = useState("");
  const [stage, setStage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filterOptions = useMemo(() => {
    const familyOptions = [...new Set(assets.map((asset) => asset.family))].map((value) => ({
      value,
      label: FAMILY_LABELS[value],
    }));
    const packOptions = [...new Set(assets.map((asset) => asset.pack))].map((value) => ({
      value,
      label: formatTokenLabel(value),
    }));
    const stageOptions = [...new Set(assets.map((asset) => asset.stage))].map((value) => ({
      value,
      label: formatTokenLabel(value),
    }));

    return {
      families: familyOptions,
      packs: packOptions.sort((left, right) => left.label.localeCompare(right.label)),
      stages: stageOptions.sort((left, right) => left.label.localeCompare(right.label)),
    };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = search.toLowerCase().trim();
    return assets.filter((asset) => {
      if (query) {
        const haystack = [
          asset.label,
          asset.filename,
          asset.url,
          asset.path,
          asset.directory,
          asset.family,
          asset.pack,
          asset.stage,
          asset.section ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (family && asset.family !== family) return false;
      if (pack && asset.pack !== pack) return false;
      if (stage && asset.stage !== stage) return false;

      return true;
    });
  }, [assets, search, family, pack, stage]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selected.has(asset.id)),
    [assets, selected],
  );

  const familyCounts = useMemo(() => {
    return (Object.keys(FAMILY_LABELS) as SvgCatalogFamily[]).map((key) => ({
      key,
      count: assets.filter((asset) => asset.family === key).length,
    }));
  }, [assets]);

  const hasFilters = !!(search || family || pack || stage);

  function toggleAsset(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectOnlyAsset(id: string) {
    setSelected(new Set([id]));
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-80 shrink-0 flex-col border-r border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)]">
        <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by filename, path, family…"
          />
          <p className="mt-2 text-sm leading-relaxed text-silver/50">
            {catalog.description} This tab is generated from <code>{catalog.generatedFrom}</code>.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
          <FilterSelect
            label="Family"
            value={family}
            onChange={setFamily}
            options={filterOptions.families}
          />
          <FilterSelect
            label="Pack"
            value={pack}
            onChange={setPack}
            options={filterOptions.packs}
          />
          <FilterSelect
            label="Stage"
            value={stage}
            onChange={setStage}
            options={filterOptions.stages}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.04)] p-3">
          {familyCounts.map((entry) => (
            <div
              key={entry.key}
              className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] px-3 py-2"
            >
              <p className="text-sm font-medium text-silver-bright">{FAMILY_LABELS[entry.key]}</p>
              <p className="text-xs text-gold/50">
                {entry.count} asset{entry.count !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-3 py-2">
          <span className="text-sm text-silver/60">
            {filteredAssets.length} result{filteredAssets.length !== 1 ? "s" : ""}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFamily("");
                  setPack("");
                  setStage("");
                }}
                className="ml-2 text-gold/70 transition-colors hover:text-gold"
              >
                clear
              </button>
            )}
          </span>
          <div className="flex items-center gap-2 text-sm">
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-silver/60 transition-colors hover:text-silver"
              >
                deselect
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelected(new Set(filteredAssets.map((asset) => asset.id)))}
              className="text-gold/70 transition-colors hover:text-gold"
            >
              all
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {filteredAssets.length === 0 ? (
            <div className={`${emptyStateClass} py-10`}>
              <p className="text-xs text-silver/60">No SVG assets match your filters</p>
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <CatalogListItem
                key={asset.id}
                asset={asset}
                isSelected={selected.has(asset.id)}
                onToggle={() => toggleAsset(asset.id)}
                onSelect={() => selectOnlyAsset(asset.id)}
              />
            ))
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {selectedAssets.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="text-2xl text-gold/15">&loz;</div>
            <p className="text-xs text-silver/60">Select an SVG asset to inspect</p>
            <p className="max-w-md text-sm leading-relaxed text-silver/50">
              This catalog includes every shipped SVG file under <code>public/data/</code>,
              including reference art, room recipes, raid bosses, and operator parts.
            </p>
          </div>
        )}
        {selectedAssets.length === 1 && <CatalogSingleDetail asset={selectedAssets[0]} />}
        {selectedAssets.length > 1 && <CatalogComparisonView assets={selectedAssets} />}
      </main>
    </div>
  );
}
