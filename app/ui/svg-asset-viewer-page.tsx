import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import partsIndexData from "../../content/data/operator-parts-index.json";
import type { BuildType } from "./_svg-shared";
import { buildPortraitContext, PORTRAIT_PALETTES, SKIN_TONES } from "./_svg-shared";
import {
  PortraitFromRecipe,
  deriveActorMarker,
  type ActorMarkerColors,
  type AppearanceRecipe,
  HEAD_SHAPES,
  EYES,
  HAIR,
  FACE_DETAILS,
  BODIES,
} from "./_portrait-parts";
import type { BodyBuild, OperatorPartMeta, OperatorPartsIndex } from "./operator-parts";
import { getLoadedRecipes } from "./operator-parts";
import {
  type EnvPartMeta,
  type EnvPartCategory,
  type EnvLightingPreset,
  type EnvSceneReviewGroup,
  type EnvSceneReviewStep,
  buildSceneReviewGroups,
  getLoadedEnvParts,
  getSceneReviewContract,
  envPartSvgPath,
  ENV_LIGHTING_PRESETS,
  getEnvLightingPreset,
} from "./environment-parts";
import { SvgFileCatalogPanel } from "./svg-file-catalog-panel";
import { emptyStateClass, tabButtonClass } from "./styles";

// ═══════════════════════════════════════════════════════════════════════════
// Asset class selector
// ═══════════════════════════════════════════════════════════════════════════

type AssetClass = "all-assets" | "operators" | "hq-environment";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const OP_CATEGORY_LABELS: Record<string, string> = {
  weapon: "Weapons",
  "outfit-overlay": "Overlays",
  accessory: "Accessories",
  "head-shape": "Head Shapes",
  hair: "Hair",
  eyes: "Eyes",
  "face-detail": "Face Details",
  "body-silhouette": "Bodies",
};

const PORTRAIT_CATEGORIES: ReadonlySet<string> = new Set([
  "head-shape",
  "hair",
  "eyes",
  "face-detail",
  "body-silhouette",
]);

const RARITY_STYLES: Record<string, string> = {
  common: "text-silver/60",
  uncommon: "text-gold/80",
  rare: "text-ember",
};

function opCategoryLabel(cat: string): string {
  return OP_CATEGORY_LABELS[cat] ?? cat;
}

const ENV_CATEGORY_LABELS: Record<EnvPartCategory, string> = {
  shell: "Shell",
  scene: "Room Scenes",
  structure: "Structure",
  prop: "Props",
  background: "Background",
  "actor-marker": "Markers",
};

const ENV_STATUS_STYLES: Record<string, string> = {
  exploration: "text-ember",
  approved: "text-gold/80",
};

function envCategoryLabel(cat: string): string {
  return (ENV_CATEGORY_LABELS as Record<string, string>)[cat] ?? cat;
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG preview components (shared)
// ═══════════════════════════════════════════════════════════════════════════

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
        className={`flex items-center justify-center text-sm text-silver/60 ${className ?? ""}`}
      >
        &times;
      </div>
    );
  }
  if (!svgText) {
    return (
      <div ref={ref} className={`flex items-center justify-center ${className ?? ""}`}>
        <div className="h-2 w-2 animate-pulse rounded-full bg-gold/30" />
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
      <div className={`flex items-center justify-center text-sm text-silver/60 ${className ?? ""}`}>
        failed to load
      </div>
    );
  }
  if (!svgText) {
    return (
      <div className={`flex items-center justify-center text-sm text-silver/60 ${className ?? ""}`}>
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

// ═══════════════════════════════════════════════════════════════════════════
// Portrait part preview (programmatic render, no static SVG file)
// ═══════════════════════════════════════════════════════════════════════════

const defaultPortraitCtx = buildPortraitContext(
  "angular-jaw",
  PORTRAIT_PALETTES["warm-earth"],
  SKIN_TONES["medium-warm"],
  "medium",
);

function PortraitPartPreview({ part, className }: { part: OperatorPartMeta; className?: string }) {
  const partName = part.id.split("/").pop() ?? "";
  let content: React.JSX.Element | null = null;
  const ctx = defaultPortraitCtx;

  switch (part.category) {
    case "head-shape": {
      const r = HEAD_SHAPES[partName];
      if (r) content = r(ctx);
      break;
    }
    case "eyes": {
      const head = HEAD_SHAPES["angular-jaw"];
      const r = EYES[partName];
      if (r)
        content = (
          <>
            {head(ctx)}
            {r(ctx)}
          </>
        );
      break;
    }
    case "hair": {
      const head = HEAD_SHAPES["angular-jaw"];
      const h = HAIR[partName];
      if (h)
        content = (
          <>
            {h.back(ctx)}
            {head(ctx)}
            {h.front(ctx)}
          </>
        );
      break;
    }
    case "face-detail": {
      const head = HEAD_SHAPES["angular-jaw"];
      const r = FACE_DETAILS[partName];
      if (r)
        content = (
          <>
            {head(ctx)}
            {r(ctx)}
          </>
        );
      break;
    }
    case "body-silhouette": {
      const r = BODIES[partName];
      if (r) content = r(ctx);
      break;
    }
  }

  if (!content) {
    return (
      <div className={`flex items-center justify-center text-sm text-silver/60 ${className ?? ""}`}>
        &times;
      </div>
    );
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 120 160" className="h-full w-full">
        {content}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI components
// ═══════════════════════════════════════════════════════════════════════════

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
      <label className="text-sm font-medium uppercase tracking-[0.12em] text-gold/70">
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

export function SceneContractSummary({
  contract,
}: {
  contract: ReturnType<typeof getSceneReviewContract>;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.32)] p-3 text-sm text-silver/70 sm:grid-cols-2">
      <div>
        <span className="text-gold/60">Building</span>
        <div className="text-silver-bright">{contract.building}</div>
      </div>
      <div>
        <span className="text-gold/60">Tile size</span>
        <div className="text-silver-bright">
          {contract.tileWidth} x {contract.tileHeight}
        </div>
      </div>
      <div>
        <span className="text-gold/60">Wall height</span>
        <div className="text-silver-bright">{contract.wallHeight}</div>
      </div>
      <div>
        <span className="text-gold/60">Origin</span>
        <div className="text-silver-bright">
          {contract.canonicalOrigin[0]}, {contract.canonicalOrigin[1]}
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="text-gold/60">View box</span>
        <div className="text-silver-bright">
          {contract.canonicalViewBox.minX}, {contract.canonicalViewBox.minY},{" "}
          {contract.canonicalViewBox.width} x {contract.canonicalViewBox.height}
        </div>
      </div>
      <div className="sm:col-span-2">
        <span className="text-gold/60">Room footprint</span>
        <div className="text-silver-bright">
          {contract.roomFootprint.cols} x {contract.roomFootprint.rows}
        </div>
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
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

// ═══════════════════════════════════════════════════════════════════════════
// OPERATOR ASSET VIEWER (preserved from original)
// ═══════════════════════════════════════════════════════════════════════════

function OperatorPartListItem({
  part,
  isSelected,
  onToggle,
  onSelect,
}: {
  part: OperatorPartMeta;
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
      <div
        className={`flex h-12 w-9 shrink-0 items-center justify-center rounded border ${
          isSelected
            ? "border-gold/20 bg-[rgba(200,168,76,0.06)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]"
        }`}
      >
        {PORTRAIT_CATEGORIES.has(part.category) ? (
          <PortraitPartPreview part={part} className="h-10 w-7 [&>svg]:h-full [&>svg]:w-full" />
        ) : (
          <LazySvgPreview
            src={`/data/svg-parts/operators/parts/${part.id}.svg`}
            alt={name}
            className="h-10 w-7 [&>svg]:h-full [&>svg]:w-full"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${isSelected ? "text-gold" : "text-silver-bright"}`}
        >
          {name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm text-silver/60">{opCategoryLabel(part.category)}</span>
          <span className={`text-sm ${RARITY_STYLES[part.rarity] ?? "text-silver/60"}`}>
            {part.rarity}
          </span>
        </div>
      </div>
      <SelectionCheckbox isSelected={isSelected} />
    </button>
  );
}

function OperatorSingleDetail({ part }: { part: OperatorPartMeta }) {
  const name = part.id.split("/").pop() ?? part.id;

  return (
    <div className="animate-enter flex flex-col items-center gap-6 p-8">
      <div className="flex h-64 w-48 items-center justify-center rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.6)]">
        {PORTRAIT_CATEGORIES.has(part.category) ? (
          <PortraitPartPreview part={part} className="h-56 w-40 [&>svg]:h-full [&>svg]:w-full" />
        ) : (
          <SvgPreview
            src={`/data/svg-parts/operators/parts/${part.id}.svg`}
            alt={name}
            className="h-56 w-40 [&>svg]:h-full [&>svg]:w-full"
          />
        )}
      </div>
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            {name}
          </h3>
          <p className="mt-1 text-sm text-silver/60">
            <code className="text-gold/70">
              {PORTRAIT_CATEGORIES.has(part.category)
                ? `${part.category}/${part.id.split("/").pop()}`
                : `${part.id}.svg`}
            </code>
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-4">
          <MetadataRow label="Category" value={opCategoryLabel(part.category)} />
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

function OperatorComparisonView({ parts }: { parts: OperatorPartMeta[] }) {
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
                {PORTRAIT_CATEGORIES.has(part.category) ? (
                  <PortraitPartPreview
                    part={part}
                    className="h-36 w-24 [&>svg]:h-full [&>svg]:w-full"
                  />
                ) : (
                  <SvgPreview
                    src={`/data/svg-parts/operators/parts/${part.id}.svg`}
                    alt={name}
                    className="h-36 w-24 [&>svg]:h-full [&>svg]:w-full"
                  />
                )}
              </div>
              <div className="w-full space-y-2 text-center">
                <p className="text-xs font-medium text-silver-bright">{name}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <span className="badge badge-gold">{opCategoryLabel(part.category)}</span>
                  <span className={`text-sm ${RARITY_STYLES[part.rarity] ?? "text-silver/60"}`}>
                    {part.rarity}
                  </span>
                </div>
                <div className="space-y-0.5 text-sm text-silver/60">
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

// ── Inline chibi marker for recipe preview ──────────────────────────────

function ChibiMarkerSvg({ colors, size }: { colors: ActorMarkerColors; size: number }) {
  return (
    <svg viewBox="0 0 32 40" width={size} height={size * 1.25} role="img" aria-label="marker">
      <ellipse
        cx="16"
        cy="37"
        rx={colors.build === "broad" ? 9 : colors.build === "lean" ? 6.5 : 7.5}
        ry="2.2"
        fill="#000"
        opacity="0.18"
      />
      {colors.build === "broad" ? (
        <path
          d="M8 22 Q8 20 10 19 L22 19 Q24 20 24 22 L24 34 Q24 36 22 36 L10 36 Q8 36 8 34 Z"
          fill={colors.clothingColor}
          stroke="#0a0a0c"
          strokeWidth="0.8"
        />
      ) : colors.build === "lean" ? (
        <path
          d="M11 22 Q11 20 12 19 L20 19 Q21 20 21 22 L21 34 Q21 36 20 36 L12 36 Q11 36 11 34 Z"
          fill={colors.clothingColor}
          stroke="#0a0a0c"
          strokeWidth="0.8"
        />
      ) : (
        <path
          d="M9.5 22 Q9.5 20 11 19 L21 19 Q22.5 20 22.5 22 L22.5 34 Q22.5 36 21 36 L11 36 Q9.5 36 9.5 34 Z"
          fill={colors.clothingColor}
          stroke="#0a0a0c"
          strokeWidth="0.8"
        />
      )}
      <rect
        x={colors.build === "broad" ? 10 : colors.build === "lean" ? 12 : 11}
        y="19"
        width={colors.build === "broad" ? 12 : colors.build === "lean" ? 8 : 10}
        height="2.5"
        rx="1"
        fill={colors.accentColor}
        opacity="0.85"
      />
      <rect x="13.5" y="16" width="5" height="4" rx="1.5" fill={colors.skinColor} />
      <circle
        cx="16"
        cy="12"
        r={colors.build === "broad" ? 8 : colors.build === "lean" ? 7 : 7.5}
        fill={colors.skinColor}
        stroke="#0a0a0c"
        strokeWidth="0.8"
      />
      <path
        d="M10.5 14 Q16 17.5 21.5 14 Q20 8.5 16 6.5 Q12 8.5 10.5 14"
        fill="#000"
        opacity="0.08"
      />
      <path
        d="M9 10 Q8.5 4.5 16 3.5 Q23.5 4.5 23 10 Q21.5 7.5 16 7 Q10.5 7.5 9 10"
        fill={colors.hairColor}
        stroke="#0a0a0c"
        strokeWidth="0.6"
      />
      <circle cx="13" cy="12.5" r="1.1" fill="#0a0a0c" />
      <circle cx="19" cy="12.5" r="1.1" fill="#0a0a0c" />
      <circle cx="13.5" cy="12" r="0.35" fill="#fff" opacity="0.7" />
      <circle cx="19.5" cy="12" r="0.35" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function OperatorRecipesContent() {
  const recipes = getLoadedRecipes();

  return (
    <div className="animate-enter mx-auto max-w-5xl space-y-6 p-8">
      <p className="text-sm text-silver/60">
        {recipes.length} appearance recipes &mdash; modular portrait assembly with derived HQ
        markers
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recipes.map((recipe) => {
          const build: BuildType =
            recipe.bodySilhouette === "armored-structured"
              ? "broad"
              : recipe.bodySilhouette === "lithe-agile"
                ? "lean"
                : "medium";
          const marker = deriveActorMarker(recipe as AppearanceRecipe, build);

          return (
            <div
              key={recipe.id}
              className="flex flex-col items-center gap-3 rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-4"
            >
              {/* Portrait */}
              <div className="flex h-40 w-28 items-center justify-center rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]">
                <div className="h-36 w-24">
                  <PortraitFromRecipe recipe={recipe as AppearanceRecipe} build={build} />
                </div>
              </div>
              {/* Name and recipe id */}
              <div className="w-full text-center">
                <p className="text-xs font-medium text-silver-bright">{recipe.name}</p>
                <p className="mt-0.5 text-xs text-silver/40">{recipe.id}</p>
              </div>
              {/* HQ marker + color swatches */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-7 items-center justify-center rounded border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]">
                  <ChibiMarkerSvg colors={marker} size={18} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-2.5 w-2.5 rounded-sm border border-[rgba(200,168,76,0.12)]"
                      style={{ backgroundColor: marker.hairColor }}
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-sm border border-[rgba(200,168,76,0.12)]"
                      style={{ backgroundColor: marker.clothingColor }}
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-sm border border-[rgba(200,168,76,0.12)]"
                      style={{ backgroundColor: marker.accentColor }}
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-sm border border-[rgba(200,168,76,0.12)]"
                      style={{ backgroundColor: marker.skinColor }}
                    />
                  </div>
                  <span className="text-xs text-silver/40">{build} build</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HQ ENVIRONMENT ASSET VIEWER
// ═══════════════════════════════════════════════════════════════════════════

/** Preview size varies by scale — wider for buildings/rooms, square for props */
function envThumbnailClass(scale: string): { container: string; svg: string } {
  switch (scale) {
    case "building":
      return {
        container: "h-10 w-16 shrink-0",
        svg: "h-8 w-14 [&>svg]:h-full [&>svg]:w-full",
      };
    case "room":
      return {
        container: "h-10 w-14 shrink-0",
        svg: "h-8 w-12 [&>svg]:h-full [&>svg]:w-full",
      };
    case "marker":
      return {
        container: "h-10 w-7 shrink-0",
        svg: "h-8 w-5 [&>svg]:h-full [&>svg]:w-full",
      };
    default:
      return {
        container: "h-12 w-9 shrink-0",
        svg: "h-10 w-7 [&>svg]:h-full [&>svg]:w-full",
      };
  }
}

function envDetailSize(scale: string): { container: string; svg: string } {
  switch (scale) {
    case "building":
      return {
        container: "h-64 w-[28rem] max-w-full",
        svg: "h-56 w-full [&>svg]:h-full [&>svg]:w-full",
      };
    case "room":
      return {
        container: "h-56 w-80",
        svg: "h-48 w-72 [&>svg]:h-full [&>svg]:w-full",
      };
    case "structure":
      return {
        container: "h-64 w-44",
        svg: "h-56 w-36 [&>svg]:h-full [&>svg]:w-full",
      };
    case "marker":
      return {
        container: "h-48 w-32",
        svg: "h-40 w-24 [&>svg]:h-full [&>svg]:w-full",
      };
    default:
      return {
        container: "h-48 w-48",
        svg: "h-40 w-40 [&>svg]:h-full [&>svg]:w-full",
      };
  }
}

function EnvPartListItem({
  part,
  isSelected,
  onToggle,
  onSelect,
}: {
  part: EnvPartMeta;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const name = part.id.split("/").pop() ?? part.id;
  const src = envPartSvgPath(part);
  const thumb = envThumbnailClass(part.scale);
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
      <div
        className={`flex items-center justify-center rounded border ${thumb.container} ${
          isSelected
            ? "border-gold/20 bg-[rgba(200,168,76,0.06)]"
            : "border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.6)]"
        }`}
      >
        <LazySvgPreview src={src} alt={name} className={thumb.svg} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-xs font-medium ${isSelected ? "text-gold" : "text-silver-bright"}`}
        >
          {name}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-sm text-silver/60">{envCategoryLabel(part.category)}</span>
          <span className={`text-sm ${ENV_STATUS_STYLES[part.status] ?? "text-silver/60"}`}>
            {part.status}
          </span>
        </div>
      </div>
      <SelectionCheckbox isSelected={isSelected} />
    </button>
  );
}

function EnvSingleDetail({
  part,
  preset,
  sceneStepByPartId,
  sceneContract,
}: {
  part: EnvPartMeta;
  preset: EnvLightingPreset;
  sceneStepByPartId: ReadonlyMap<string, { group: EnvSceneReviewGroup; step: EnvSceneReviewStep }>;
  sceneContract: ReturnType<typeof getSceneReviewContract>;
}) {
  const name = part.id.split("/").pop() ?? part.id;
  const src = envPartSvgPath(part);
  const size = envDetailSize(part.scale);
  const sceneLookup = sceneStepByPartId.get(part.id);
  const sceneGroup = sceneLookup?.group;
  const sceneStep = sceneLookup?.step;
  return (
    <div className="animate-enter flex flex-col items-center gap-6 p-8">
      <div
        className={`relative flex items-center justify-center rounded-xl border ${size.container}`}
        style={{ backgroundColor: preset.background, borderColor: preset.border }}
      >
        <SvgPreview src={src} alt={name} className={size.svg} />
        {preset.overlay && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ backgroundColor: preset.overlay }}
          />
        )}
      </div>
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            {name}
          </h3>
          <p className="mt-1 text-sm text-silver/60">
            <code className="text-gold/70">{src}</code>
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.4)] p-4">
          <MetadataRow label="Category" value={envCategoryLabel(part.category)} />
          <MetadataRow label="Scale" value={part.scale} />
          <MetadataRow label="Status">
            <span className={ENV_STATUS_STYLES[part.status] ?? "text-silver/60"}>
              {part.status}
            </span>
          </MetadataRow>
          <MetadataRow label="Preset" value={preset.label} />
          {part.roomFamily && <MetadataRow label="Room" value={part.roomFamily} />}
          {part.category === "scene" && (
            <>
              <MetadataRow label="Series" value={sceneGroup?.label ?? "Unmapped"} />
              <MetadataRow
                label="Progress"
                value={
                  sceneStep
                    ? `State ${sceneStep.index}${sceneStep.isPlaceholder ? " (placeholder)" : ""}`
                    : "State unmapped"
                }
              />
              <MetadataRow label="Scene rules">
                <div className="flex flex-wrap gap-1">
                  <span className="badge badge-gold">props-only</span>
                  <span className="badge badge-gold">room-scale</span>
                  <span className="badge badge-gold">recipes/</span>
                </div>
              </MetadataRow>
              <SceneContractSummary contract={sceneContract} />
            </>
          )}
          <MetadataRow label="Tags">
            <div className="flex flex-wrap gap-1">
              {part.tags.map((t) => (
                <span key={t} className="badge badge-gold">
                  {t}
                </span>
              ))}
            </div>
          </MetadataRow>
        </div>
      </div>
    </div>
  );
}

function EnvComparisonView({
  parts,
  preset,
  sceneStepByPartId,
  sceneContract,
}: {
  parts: EnvPartMeta[];
  preset: EnvLightingPreset;
  sceneStepByPartId: ReadonlyMap<string, { group: EnvSceneReviewGroup; step: EnvSceneReviewStep }>;
  sceneContract: ReturnType<typeof getSceneReviewContract>;
}) {
  const allScenes = parts.every((part) => part.category === "scene");

  if (allScenes) {
    return (
      <div className="animate-enter space-y-6 p-6">
        <div className="text-center">
          <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
            Scene comparison for {parts.length} room states
          </h3>
          <p className="mt-1 text-sm text-silver/50">Preset: {preset.label}</p>
        </div>

        <SceneContractSummary contract={sceneContract} />

        <div
          className={`grid gap-4 ${
            parts.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {parts.map((part) => {
            const name = part.id.split("/").pop() ?? part.id;
            const src = envPartSvgPath(part);
            const placement = sceneStepByPartId.get(part.id);
            return (
              <div
                key={part.id}
                className="flex flex-col gap-3 rounded-xl border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] p-4"
              >
                <div
                  className="relative flex h-36 items-center justify-center overflow-hidden rounded-lg border"
                  style={{ backgroundColor: preset.background, borderColor: preset.border }}
                >
                  <SvgPreview
                    src={src}
                    alt={name}
                    className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                  />
                  {preset.overlay && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-lg"
                      style={{ backgroundColor: preset.overlay }}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-silver-bright">{name}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="badge badge-gold">{envCategoryLabel(part.category)}</span>
                    <span
                      className={`text-sm ${ENV_STATUS_STYLES[part.status] ?? "text-silver/60"}`}
                    >
                      {part.status}
                    </span>
                    <span className="badge badge-slate text-xs">
                      {placement?.group.label ?? "Unmapped"}
                    </span>
                  </div>
                  <p className="text-sm text-silver/60">
                    {placement?.step
                      ? `State ${placement.step.index}${placement.step.isPlaceholder ? " placeholder" : ""}`
                      : "State unmapped"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
              Scene series scaffold
            </h4>
            <p className="text-xs text-silver/40">{sceneGroups.length} scene series</p>
          </div>
          {sceneGroups.map((group) => (
            <div
              key={group.seriesKey}
              className="rounded-xl border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.28)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h5 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
                  {group.label}
                </h5>
                {group.roomFamily && (
                  <span className="badge badge-slate text-xs">{group.roomFamily}</span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {group.steps.map((step) =>
                  step.part ? (
                    <div
                      key={step.part.id}
                      className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(15,14,18,0.18)] p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-gold/40">
                        State {step.index}
                      </p>
                      <p className="mt-2 text-xs text-silver-bright">
                        {step.part.id.split("/").pop() ?? step.part.id}
                      </p>
                      <p className="mt-1 text-sm text-silver/60">
                        {step.part.roomFamily ?? "n/a"} | {step.part.status}
                      </p>
                    </div>
                  ) : (
                    <div
                      key={`${group.seriesKey}-${step.index}`}
                      className="rounded-lg border border-dashed border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.18)] p-3"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-gold/40">
                        State {step.index}
                      </p>
                      <p className="mt-2 text-xs text-silver/60">Pending scene state</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-enter p-6">
      <div className="mb-5 text-center">
        <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Comparing {parts.length} assets
        </h3>
        <p className="mt-1 text-sm text-silver/50">Preset: {preset.label}</p>
      </div>
      <div
        className={`grid gap-4 ${
          parts.length === 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {parts.map((part) => {
          const name = part.id.split("/").pop() ?? part.id;
          const src = envPartSvgPath(part);
          const isWide = part.scale === "building";
          return (
            <div
              key={part.id}
              className={`flex flex-col items-center gap-3 rounded-xl border p-4 border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.4)] ${isWide ? "col-span-2 lg:col-span-1" : ""}`}
            >
              <div
                className={`relative flex items-center justify-center rounded-lg border ${
                  isWide ? "h-36 w-full max-w-xs" : "h-32 w-24"
                }`}
                style={{ backgroundColor: preset.background, borderColor: preset.border }}
              >
                <SvgPreview
                  src={src}
                  alt={name}
                  className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                />
                {preset.overlay && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-lg"
                    style={{ backgroundColor: preset.overlay }}
                  />
                )}
              </div>
              <div className="w-full space-y-2 text-center">
                <p className="text-xs font-medium text-silver-bright">{name}</p>
                <div className="flex flex-wrap justify-center gap-1">
                  <span className="badge badge-gold">{envCategoryLabel(part.category)}</span>
                  <span className={`text-sm ${ENV_STATUS_STYLES[part.status] ?? "text-silver/60"}`}>
                    {part.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function SvgAssetViewerPage() {
  const [assetClass, setAssetClass] = useState<AssetClass>("all-assets");

  // ── Operator state ────────────────────────────────────────────────────
  const [partsIndex] = useState<OperatorPartsIndex>(partsIndexData as OperatorPartsIndex);
  const [opTab, setOpTab] = useState<"parts" | "recipes">("parts");
  const [opSearch, setOpSearch] = useState("");
  const [opCategory, setOpCategory] = useState("");
  const [opRarity, setOpRarity] = useState("");
  const [opBody, setOpBody] = useState("");
  const [opRole, setOpRole] = useState("");
  const [opSelected, setOpSelected] = useState<Set<string>>(new Set());

  // ── Environment state ─────────────────────────────────────────────────
  const envParts = getLoadedEnvParts();
  const [envSearch, setEnvSearch] = useState("");
  const [envCategory, setEnvCategory] = useState("");
  const [envScale, setEnvScale] = useState("");
  const [envRoom, setEnvRoom] = useState("");
  const [envSelected, setEnvSelected] = useState<Set<string>>(new Set());
  const [envPresetId, setEnvPresetId] = useState("neutral");
  const envPreset = getEnvLightingPreset(envPresetId);
  const envSceneGroups = useMemo(() => buildSceneReviewGroups(envParts), [envParts]);
  const envSceneContract = useMemo(() => getSceneReviewContract(), []);
  const envSceneStepByPartId = useMemo(() => {
    const map = new Map<string, { group: EnvSceneReviewGroup; step: EnvSceneReviewStep }>();
    for (const group of envSceneGroups) {
      for (const step of group.steps) {
        if (step.part) map.set(step.part.id, { group, step });
      }
    }
    return map;
  }, [envSceneGroups]);

  // ── Operator derived state ────────────────────────────────────────────
  const opFilterOptions = useMemo(() => {
    const parts = partsIndex.parts;
    return {
      categories: [...new Set(parts.map((p) => p.category))],
      rarities: [...new Set(parts.map((p) => p.rarity))],
      bodies: [...new Set(parts.flatMap((p) => p.bodyCompatibility))],
      roles: [...new Set(parts.flatMap((p) => p.roleTags))],
    };
  }, [partsIndex.parts]);

  const filteredOpParts = useMemo(() => {
    const q = opSearch.toLowerCase().trim();
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
      if (opCategory && p.category !== opCategory) return false;
      if (opRarity && p.rarity !== opRarity) return false;
      if (opBody && !p.bodyCompatibility.includes(opBody as BodyBuild)) return false;
      if (opRole && !p.roleTags.includes(opRole)) return false;
      return true;
    });
  }, [partsIndex.parts, opSearch, opCategory, opRarity, opBody, opRole]);

  const selectedOpParts = useMemo(
    () => partsIndex.parts.filter((p) => opSelected.has(p.id)),
    [partsIndex.parts, opSelected],
  );

  const opHasFilters = !!(opSearch || opCategory || opRarity || opBody || opRole);

  // ── Environment derived state ─────────────────────────────────────────
  const envFilterOptions = useMemo(() => {
    return {
      categories: [...new Set(envParts.map((p) => p.category))],
      scales: [...new Set(envParts.map((p) => p.scale))],
      rooms: [...new Set(envParts.map((p) => p.roomFamily).filter((r): r is string => r !== null))],
    };
  }, [envParts]);

  const filteredEnvParts = useMemo(() => {
    const q = envSearch.toLowerCase().trim();
    return envParts.filter((p) => {
      if (q) {
        const haystack = [p.id, ...p.tags, p.category, p.scale, p.roomFamily ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (envCategory && p.category !== envCategory) return false;
      if (envScale && p.scale !== envScale) return false;
      if (envRoom && p.roomFamily !== envRoom) return false;
      return true;
    });
  }, [envParts, envSearch, envCategory, envScale, envRoom]);

  const selectedEnvParts = useMemo(
    () => [...envParts].filter((p) => envSelected.has(p.id)),
    [envParts, envSelected],
  );

  const envHasFilters = !!(envSearch || envCategory || envScale || envRoom);

  // ── Selection helpers ─────────────────────────────────────────────────
  const toggleOp = useCallback((id: string) => {
    setOpSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectOnlyOp = useCallback((id: string) => setOpSelected(new Set([id])), []);

  const toggleEnv = useCallback((id: string) => {
    setEnvSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectOnlyEnv = useCallback((id: string) => setEnvSelected(new Set([id])), []);

  // Active selection count for header
  const activeSelectedCount =
    assetClass === "operators"
      ? opSelected.size
      : assetClass === "hq-environment"
        ? envSelected.size
        : 0;

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
          {activeSelectedCount > 0 && (
            <span className="text-sm text-gold/80">{activeSelectedCount} selected</span>
          )}
          <Link to="/svg-playground" className="btn-ghost text-xs">
            playground &rarr;
          </Link>
        </div>

        {/* Asset class selector + context tabs */}
        <div className="flex gap-0 border-t border-[rgba(200,168,76,0.04)] px-5">
          {/* Asset class tabs */}
          <button
            type="button"
            className={tabButtonClass}
            data-active={assetClass === "all-assets"}
            onClick={() => setAssetClass("all-assets")}
          >
            All SVGs
          </button>
          <button
            type="button"
            className={tabButtonClass}
            data-active={assetClass === "operators"}
            onClick={() => setAssetClass("operators")}
          >
            Operators
          </button>
          <button
            type="button"
            className={tabButtonClass}
            data-active={assetClass === "hq-environment"}
            onClick={() => setAssetClass("hq-environment")}
          >
            HQ Environment
          </button>

          <div className="mx-3 my-auto h-4 w-px bg-[rgba(200,168,76,0.08)]" />

          {/* Context tabs for operators */}
          {assetClass === "all-assets" && (
            <span className={`${tabButtonClass} cursor-default`} data-active="true">
              Full Catalog
            </span>
          )}

          {assetClass === "operators" &&
            (["parts", "recipes"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={tabButtonClass}
                data-active={opTab === tab}
                onClick={() => setOpTab(tab)}
              >
                {tab === "parts" ? `Parts (${partsIndex.parts.length})` : "Recipes"}
              </button>
            ))}

          {/* Context info for environment */}
          {assetClass === "hq-environment" && (
            <>
              <span className={`${tabButtonClass} cursor-default`} data-active="true">
                Assets ({envParts.length})
              </span>
              <div className="mx-2 my-auto h-4 w-px bg-[rgba(200,168,76,0.08)]" />
              <div className="flex items-center gap-1.5 py-1">
                {ENV_LIGHTING_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEnvPresetId(p.id)}
                    className={`rounded px-2 py-0.5 text-xs transition-colors ${
                      envPresetId === p.id
                        ? "bg-[rgba(200,168,76,0.12)] text-gold"
                        : "text-silver/50 hover:text-silver/70"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {assetClass === "all-assets" ? (
        <SvgFileCatalogPanel />
      ) : assetClass === "operators" ? (
        // ── OPERATOR CONTENT ──────────────────────────────────────────
        opTab === "parts" ? (
          <div className="flex flex-1 overflow-hidden">
            <aside className="flex w-80 shrink-0 flex-col border-r border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)]">
              <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
                <SearchInput
                  value={opSearch}
                  onChange={setOpSearch}
                  placeholder="Search by name, tag, role&hellip;"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
                <FilterSelect
                  label="Category"
                  value={opCategory}
                  onChange={setOpCategory}
                  options={opFilterOptions.categories.map((c) => ({
                    value: c,
                    label: opCategoryLabel(c),
                  }))}
                />
                <FilterSelect
                  label="Rarity"
                  value={opRarity}
                  onChange={setOpRarity}
                  options={opFilterOptions.rarities.map((r) => ({ value: r, label: r }))}
                />
                <FilterSelect
                  label="Body"
                  value={opBody}
                  onChange={setOpBody}
                  options={opFilterOptions.bodies.map((b) => ({ value: b, label: b }))}
                />
                <FilterSelect
                  label="Role"
                  value={opRole}
                  onChange={setOpRole}
                  options={opFilterOptions.roles.map((r) => ({ value: r, label: r }))}
                />
              </div>
              <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-3 py-2">
                <span className="text-sm text-silver/60">
                  {filteredOpParts.length} result{filteredOpParts.length !== 1 ? "s" : ""}
                  {opHasFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpSearch("");
                        setOpCategory("");
                        setOpRarity("");
                        setOpBody("");
                        setOpRole("");
                      }}
                      className="ml-2 text-gold/70 transition-colors hover:text-gold"
                    >
                      clear
                    </button>
                  )}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  {opSelected.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpSelected(new Set())}
                      className="text-silver/60 transition-colors hover:text-silver"
                    >
                      deselect
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpSelected(new Set(filteredOpParts.map((p) => p.id)))}
                    className="text-gold/70 transition-colors hover:text-gold"
                  >
                    all
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {filteredOpParts.length === 0 ? (
                  <div className={`${emptyStateClass} py-10`}>
                    <p className="text-xs text-silver/60">No parts match your filters</p>
                  </div>
                ) : (
                  filteredOpParts.map((part) => (
                    <OperatorPartListItem
                      key={part.id}
                      part={part}
                      isSelected={opSelected.has(part.id)}
                      onToggle={() => toggleOp(part.id)}
                      onSelect={() => selectOnlyOp(part.id)}
                    />
                  ))
                )}
              </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
              {selectedOpParts.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="text-2xl text-gold/15">&loz;</div>
                  <p className="text-xs text-silver/60">Select a part to inspect</p>
                  <p className="text-sm text-silver/60">
                    Click to select &middot; Ctrl+click to multi-select
                  </p>
                </div>
              )}
              {selectedOpParts.length === 1 && (
                <OperatorSingleDetail key={selectedOpParts[0].id} part={selectedOpParts[0]} />
              )}
              {selectedOpParts.length > 1 && (
                <OperatorComparisonView
                  key={[...opSelected].sort().join()}
                  parts={selectedOpParts}
                />
              )}
            </main>
          </div>
        ) : (
          <main key="recipes" className="flex-1 overflow-y-auto">
            <OperatorRecipesContent />
          </main>
        )
      ) : (
        // ── HQ ENVIRONMENT CONTENT ────────────────────────────────────
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-80 shrink-0 flex-col border-r border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)]">
            <div className="border-b border-[rgba(200,168,76,0.06)] p-3">
              <SearchInput
                value={envSearch}
                onChange={setEnvSearch}
                placeholder="Search by name, tag, room&hellip;"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 border-b border-[rgba(200,168,76,0.06)] p-3">
              <FilterSelect
                label="Category"
                value={envCategory}
                onChange={setEnvCategory}
                options={envFilterOptions.categories.map((c) => ({
                  value: c,
                  label: envCategoryLabel(c),
                }))}
              />
              <FilterSelect
                label="Scale"
                value={envScale}
                onChange={setEnvScale}
                options={envFilterOptions.scales.map((s) => ({ value: s, label: s }))}
              />
              <FilterSelect
                label="Room"
                value={envRoom}
                onChange={setEnvRoom}
                options={envFilterOptions.rooms.map((r) => ({ value: r, label: r }))}
              />
            </div>
            <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.04)] px-3 py-2">
              <span className="text-sm text-silver/60">
                {filteredEnvParts.length} result{filteredEnvParts.length !== 1 ? "s" : ""}
                {envHasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setEnvSearch("");
                      setEnvCategory("");
                      setEnvScale("");
                      setEnvRoom("");
                    }}
                    className="ml-2 text-gold/70 transition-colors hover:text-gold"
                  >
                    clear
                  </button>
                )}
              </span>
              <div className="flex items-center gap-2 text-sm">
                {envSelected.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setEnvSelected(new Set())}
                    className="text-silver/60 transition-colors hover:text-silver"
                  >
                    deselect
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEnvSelected(new Set(filteredEnvParts.map((p) => p.id)))}
                  className="text-gold/70 transition-colors hover:text-gold"
                >
                  all
                </button>
              </div>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {filteredEnvParts.length === 0 ? (
                <div className={`${emptyStateClass} py-10`}>
                  <p className="text-xs text-silver/60">No assets match your filters</p>
                </div>
              ) : (
                filteredEnvParts.map((part) => (
                  <EnvPartListItem
                    key={part.id}
                    part={part}
                    isSelected={envSelected.has(part.id)}
                    onToggle={() => toggleEnv(part.id)}
                    onSelect={() => selectOnlyEnv(part.id)}
                  />
                ))
              )}
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto">
            {selectedEnvParts.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="text-2xl text-gold/15">&loz;</div>
                <p className="text-xs text-silver/60">Select an asset to inspect</p>
                <p className="text-sm text-silver/60">
                  Click to select &middot; Ctrl+click to multi-select
                </p>
              </div>
            )}
            {selectedEnvParts.length === 1 && (
              <EnvSingleDetail
                key={selectedEnvParts[0].id}
                part={selectedEnvParts[0]}
                preset={envPreset}
                sceneStepByPartId={envSceneStepByPartId}
                sceneContract={envSceneContract}
              />
            )}
            {selectedEnvParts.length > 1 && (
              <EnvComparisonView
                key={[...envSelected].sort().join()}
                parts={selectedEnvParts}
                preset={envPreset}
                sceneStepByPartId={envSceneStepByPartId}
                sceneContract={envSceneContract}
              />
            )}
          </main>
        </div>
      )}
    </div>
  );
}
