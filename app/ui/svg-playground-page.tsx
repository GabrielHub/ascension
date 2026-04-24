import { useMemo, useState } from "react";
import { Link } from "react-router";

import type { BuildType } from "./_svg-shared";
import {
  PortraitFromRecipe,
  deriveActorMarker,
  type ActorMarkerColors,
  type AppearanceRecipe,
} from "./_portrait-parts";
import { getLoadedRecipes } from "./operator-parts";
import {
  type EnvPartMeta,
  type EnvPartCategory,
  type EnvLightingPreset,
  buildSceneReviewGroups,
  getLoadedEnvParts,
  getLoadedEnvPartsIndex,
  getSceneReviewContract,
  envPartSvgPath,
  ENV_LIGHTING_PRESETS,
  getEnvLightingPreset,
} from "./environment-parts";
import { useLazyVisible, useSvgFetch } from "./_svg-preview";
import { SceneContractSummary } from "./svg-asset-viewer-page";
import { glassCardNavyClass, tabButtonClass } from "./styles";

/* ═══════════════════════════════════════════════════════════════════════════
   SVG Playground — Multi-Asset Experimentation Surface
   Operators: Recipe-driven modular portrait validation
   HQ Environment: scene-first props-only room review and supporting asset surfaces
   ═══════════════════════════════════════════════════════════════════════════ */

type AssetClass = "operators" | "hq-environment";

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  operators: "Operators",
  "hq-environment": "HQ Environment",
};

const ASSET_CLASS_DESCRIPTIONS: Record<AssetClass, string> = {
  operators:
    "Recipe-driven modular portraits — one builder and one appearance contract for authored and future generated operators",
  "hq-environment":
    "Scene-first HQ review — approved room scenes in recipes/ plus prop, background, and actor-marker support assets",
};

function LazySvgPreview({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { ref, visible } = useLazyVisible();
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

// ── Inline chibi marker — recipe-colorized SVG token ─────────────────────

function ChibiMarkerToken({ colors, size }: { colors: ActorMarkerColors; size: number }) {
  const s = size;
  const aspect = 40 / 32;
  const h = s * aspect;

  return (
    <svg viewBox="0 0 32 40" width={s} height={h} role="img" aria-label={`${colors.build} marker`}>
      {/* Ground shadow */}
      <ellipse
        cx="16"
        cy="37"
        rx={colors.build === "broad" ? 9 : colors.build === "lean" ? 6.5 : 7.5}
        ry="2.2"
        fill="#000"
        opacity="0.18"
      />

      {/* Body */}
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

      {/* Collar accent */}
      <rect
        x={colors.build === "broad" ? 10 : colors.build === "lean" ? 12 : 11}
        y="19"
        width={colors.build === "broad" ? 12 : colors.build === "lean" ? 8 : 10}
        height="2.5"
        rx="1"
        fill={colors.accentColor}
        opacity="0.85"
      />

      {/* Neck */}
      <rect x="13.5" y="16" width="5" height="4" rx="1.5" fill={colors.skinColor} />

      {/* Head */}
      <circle
        cx="16"
        cy="12"
        r={colors.build === "broad" ? 8 : colors.build === "lean" ? 7 : 7.5}
        fill={colors.skinColor}
        stroke="#0a0a0c"
        strokeWidth="0.8"
      />

      {/* Face shadow */}
      <path
        d="M10.5 14 Q16 17.5 21.5 14 Q20 8.5 16 6.5 Q12 8.5 10.5 14"
        fill="#000"
        opacity="0.08"
      />

      {/* Hair cap */}
      <path
        d="M9 10 Q8.5 4.5 16 3.5 Q23.5 4.5 23 10 Q21.5 7.5 16 7 Q10.5 7.5 9 10"
        fill={colors.hairColor}
        stroke="#0a0a0c"
        strokeWidth="0.6"
      />

      {/* Eyes */}
      <circle cx="13" cy="12.5" r="1.1" fill="#0a0a0c" />
      <circle cx="19" cy="12.5" r="1.1" fill="#0a0a0c" />
      <circle cx="13.5" cy="12" r="0.35" fill="#fff" opacity="0.7" />
      <circle cx="19.5" cy="12" r="0.35" fill="#fff" opacity="0.7" />
    </svg>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-3 w-3 rounded-sm border border-[rgba(200,168,76,0.12)]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-silver/50">{label}</span>
    </div>
  );
}

function OperatorPlayground() {
  const recipes = getLoadedRecipes();

  return (
    <div className="space-y-8">
      <section
        className="glass-card animate-enter overflow-hidden px-6 py-5"
        style={{ animationDelay: "60ms" }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Appearance Contract
        </h2>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-silver/70">
          <p>
            Every operator portrait is built from the same typed recipe contract: head shape, hair,
            eyes, face detail, body silhouette, palette, and skin tone.
          </p>
          <p>
            <strong className="text-silver-bright">Authored and future generated operators</strong>{" "}
            must both resolve to that same recipe before rendering. The modular builder is the only
            valid portrait renderer.
          </p>
        </div>
      </section>

      <section className={`${glassCardNavyClass} p-6`}>
        <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Assessment
        </h2>
        <div className="mt-4 space-y-3 text-xs leading-relaxed text-silver">
          <p>
            <strong className="text-gold">Single path:</strong> The builder should be evaluated on
            how well one modular system can express varied operators without branching into
            compatibility-only renderers.
          </p>
          <p>
            <strong className="text-gold">Hair as silhouette:</strong> Hair and eye choices should
            create readable individuality at both detail and roster scales while the shared
            structural language stays coherent.
          </p>
          <p>
            <strong className="text-gold">Recipe as contract:</strong> The important long-term
            boundary is not authored versus generated. The boundary is recipe input versus builder
            output.
          </p>
          <p>
            <strong className="text-gold">Scalability:</strong> New operators should add recipe data
            and, when necessary, new modular parts. They should not add a second portrait renderer
            or a new direct-SVG identity path.
          </p>
        </div>
      </section>

      {/* ── Recipe Review ───────────────────────────────────────────── */}
      <section className="glass-card overflow-hidden">
        <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
            Appearance Recipes
          </h2>
          <p className="mt-1 text-xs text-silver/60">
            {recipes.length} authored recipes &mdash; modular portrait assembly from head, hair,
            eyes, face, and body parts with palette and skin tone
          </p>
          <p className="mt-2 text-sm leading-relaxed text-silver/50">
            Each recipe drives both the full portrait and the HQ in-world actor marker from the same
            identity source. Marker colors shown below each portrait are derived automatically.
          </p>
        </div>
        <div className="space-y-6 px-6 py-6">
          {recipes.map((recipe, i) => {
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
                className="animate-enter rounded-xl border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] p-5"
                style={{ animationDelay: `${80 + i * 30}ms` }}
              >
                <div className="mb-4 flex items-baseline gap-3">
                  <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
                    {recipe.name}
                  </h3>
                  <span className="badge badge-gold text-xs">{recipe.id}</span>
                </div>

                {/* Recipe metadata */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {[
                    recipe.headShape,
                    recipe.hair,
                    recipe.eyes,
                    recipe.faceDetail,
                    recipe.bodySilhouette,
                    recipe.palette,
                    recipe.skinTone,
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[rgba(200,168,76,0.1)] bg-[rgba(200,168,76,0.04)] px-2 py-0.5 text-xs text-gold/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Portrait scales */}
                <div className="flex items-end gap-6">
                  {/* Detail */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
                      Detail
                    </p>
                    <div className="h-52 w-[calc(120*13rem/160)] rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                      <PortraitFromRecipe recipe={recipe as AppearanceRecipe} build={build} />
                    </div>
                  </div>
                  {/* Roster */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
                      Roster
                    </p>
                    <div className="h-14 w-[calc(120*3.5rem/160)] rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                      <PortraitFromRecipe recipe={recipe as AppearanceRecipe} build={build} />
                    </div>
                  </div>
                  {/* Actor marker */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
                      HQ Marker
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="flex h-14 w-10 items-center justify-center rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                        <ChibiMarkerToken colors={marker} size={28} />
                      </div>
                      <div className="flex h-8 w-6 items-center justify-center rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                        <ChibiMarkerToken colors={marker} size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Marker color swatches */}
                <div className="mt-4 flex items-center gap-4">
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/40">
                    Derived
                  </span>
                  <ColorSwatch color={marker.hairColor} label="hair" />
                  <ColorSwatch color={marker.clothingColor} label="clothing" />
                  <ColorSwatch color={marker.accentColor} label="accent" />
                  <ColorSwatch color={marker.skinColor} label="skin" />
                  <span className="text-xs text-silver/40">{marker.build}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recipe review guidance */}
      <section className={`${glassCardNavyClass} p-6`}>
        <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Recipe Review
        </h2>
        <div className="mt-4 space-y-3 text-xs leading-relaxed text-silver">
          <p>
            <strong className="text-gold">Identity coherence:</strong> Each recipe should read as a
            distinct individual at both detail and roster scales. The HQ marker should be visually
            distinguishable even at zoomed-out scale through hair and clothing color.
          </p>
          <p>
            <strong className="text-gold">Marker derivation:</strong> Marker colors are extracted
            from the same palette and skin-tone data that drives the full portrait. No second
            identity source is introduced.
          </p>
          <p>
            <strong className="text-gold">Casual presentation:</strong> HQ markers are static and
            casual &mdash; no raid armor, no weapon overlays, no combat accessories. The marker
            should map clearly to the portrait when clicking into focus mode.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="badge badge-gold text-xs">{recipes.length} recipes</span>
          <span className="badge badge-ember text-xs">approval pending</span>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HQ ENVIRONMENT PLAYGROUND
// ══════════════════════════════════════════════════════════════════════════

const ENV_CATEGORY_LABELS: Record<EnvPartCategory, string> = {
  shell: "Building Shell",
  scene: "Room Scenes",
  structure: "Structural Parts",
  prop: "Props & Fixtures",
  background: "Background Elements",
  "actor-marker": "Actor Markers",
};

const ENV_CATEGORY_DESCRIPTIONS: Record<EnvPartCategory, string> = {
  shell: "Full building views — exterior storefront and angled-isometric interior shell",
  scene:
    "Approved room-scene compositions — props-only HQ interiors stored in recipes/ and reviewed against the shared room contract",
  structure: "Reusable architectural pieces — walls, floors, doors, and windows",
  prop: "Individual furniture and fixtures — desks, beds, lights, cabinets, plants, and signage",
  background: "Street, skyline, and storefront atmosphere pieces that snap around the HQ footprint",
  "actor-marker":
    "In-world operator/staff chibi tokens — recipe-derived identity at HQ zoom scales",
};

const ENV_CATEGORY_ORDER: EnvPartCategory[] = ["scene", "prop", "background", "actor-marker"];

const HQ_BUILDINGS = [
  { id: "building/bodega", label: "Bodega" },
  { id: "building/porters", label: "Porter's" },
  { id: "building/skyscraper", label: "Skyscraper" },
] as const;

/** Scale presets for each asset category */
const SCALE_PRESETS: Record<
  EnvPartCategory,
  { label: string; containerClass: string; svgClass: string }[]
> = {
  shell: [
    {
      label: "Full",
      containerClass: "h-64 w-full max-w-[480px]",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Overview",
      containerClass: "h-32 w-60",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Thumbnail",
      containerClass: "h-16 w-28",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
  scene: [
    {
      label: "Room review",
      containerClass: "h-44 w-full max-w-[420px]",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "State card",
      containerClass: "h-28 w-40",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Thumbnail",
      containerClass: "h-14 w-20",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
  structure: [
    {
      label: "Full",
      containerClass: "h-40 w-28",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Composed",
      containerClass: "h-24 w-16",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
  prop: [
    {
      label: "Detail",
      containerClass: "h-24 w-24",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "In-room",
      containerClass: "h-14 w-14",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Mini",
      containerClass: "h-8 w-8",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
  background: [
    {
      label: "Backdrop",
      containerClass: "h-28 w-40",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Placed",
      containerClass: "h-20 w-24",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
  "actor-marker": [
    {
      label: "In-world",
      containerClass: "h-[50px] w-10",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Room zoom",
      containerClass: "h-[30px] w-6",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
    {
      label: "Minimap",
      containerClass: "h-[15px] w-3",
      svgClass: "[&>svg]:h-full [&>svg]:w-full",
    },
  ],
};

function EnvAssetCard({
  part,
  index,
  partsIndex,
  preset,
}: {
  part: EnvPartMeta;
  index: number;
  partsIndex: ReturnType<typeof getLoadedEnvPartsIndex>;
  preset: EnvLightingPreset;
}) {
  const name = part.id.split("/").pop() ?? part.id;
  const src = envPartSvgPath(part, partsIndex);
  const scales = SCALE_PRESETS[part.category];
  return (
    <div
      className="animate-enter rounded-xl border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] p-5"
      style={{ animationDelay: `${80 + index * 40}ms` }}
    >
      {/* Asset label */}
      <div className="mb-4 flex items-baseline gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
          {name}
        </h3>
        <span className="badge badge-gold text-xs">{part.status}</span>
        {part.roomFamily && <span className="badge badge-slate text-xs">{part.roomFamily}</span>}
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {part.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[rgba(200,168,76,0.1)] bg-[rgba(200,168,76,0.04)] px-2 py-0.5 text-xs text-gold/60"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Multi-scale previews */}
      {scales.map((scale) => (
        <div key={scale.label} className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
            {scale.label}
          </p>
          <div className="flex justify-center">
            <div
              className={`${scale.containerClass} relative overflow-hidden rounded-lg border`}
              style={{ backgroundColor: preset.background, borderColor: preset.border }}
            >
              <LazySvgPreview src={src} alt={name} className={`h-full w-full ${scale.svgClass}`} />
              {preset.overlay && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ backgroundColor: preset.overlay }}
                />
              )}
            </div>
          </div>
        </div>
      ))}

      {/* File path */}
      <p className="mt-4 text-center text-xs text-silver/40">
        <code>{src}</code>
      </p>
    </div>
  );
}

function EnvCategorySection({
  category,
  categoryParts,
  startIndex,
  partsIndex,
  preset,
}: {
  category: EnvPartCategory;
  categoryParts: readonly EnvPartMeta[];
  startIndex: number;
  partsIndex: ReturnType<typeof getLoadedEnvPartsIndex>;
  preset: EnvLightingPreset;
}) {
  if (categoryParts.length === 0) return null;

  let approvedCount = 0;
  let explorationCount = 0;
  for (const part of categoryParts) {
    if (part.status === "approved") approvedCount += 1;
    else if (part.status === "exploration") explorationCount += 1;
  }

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
          {ENV_CATEGORY_LABELS[category]}
        </h2>
        <p className="mt-1 text-xs text-silver/60">{ENV_CATEGORY_DESCRIPTIONS[category]}</p>
        <p className="mt-2 text-sm text-silver/40">
          {categoryParts.length} asset{categoryParts.length !== 1 ? "s" : ""} &mdash;{" "}
          {approvedCount} approved, {explorationCount} exploration
        </p>
      </div>
      <div className="space-y-6 px-6 py-6">
        {categoryParts.map((part, i) => (
          <EnvAssetCard
            key={part.id}
            part={part}
            index={startIndex + i}
            partsIndex={partsIndex}
            preset={preset}
          />
        ))}
      </div>
    </section>
  );
}

function ActorMarkerGrid() {
  const recipes = getLoadedRecipes();

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
          Recipe-Colorized Markers
        </h2>
        <p className="mt-1 text-xs text-silver/60">
          All {recipes.length} operator recipes rendered as chibi tokens at HQ zoom scales
        </p>
        <p className="mt-2 text-sm leading-relaxed text-silver/50">
          Marker identity derives from the same appearance recipe that drives the full portrait.
          Hair, clothing, accent, and skin colors are extracted automatically. Build affects body
          width. No second identity source.
        </p>
      </div>
      <div className="px-6 py-6">
        {/* Scale comparison header */}
        <div className="mb-6 flex items-end gap-6">
          {(["In-world (40px)", "Room zoom (24px)", "Minimap (12px)"] as const).map((label) => (
            <p key={label} className="text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
              {label}
            </p>
          ))}
        </div>

        {/* Recipe marker grid */}
        <div className="space-y-3">
          {recipes.map((recipe, i) => {
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
                className="animate-enter flex items-center gap-4 rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.2)] px-4 py-3"
                style={{ animationDelay: `${60 + i * 20}ms` }}
              >
                {/* Name */}
                <div className="w-28 shrink-0">
                  <p className="truncate text-xs font-medium text-silver-bright">{recipe.name}</p>
                  <p className="text-xs text-silver/40">{build}</p>
                </div>

                {/* In-world scale */}
                <div className="flex h-[50px] w-10 items-center justify-center rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                  <ChibiMarkerToken colors={marker} size={28} />
                </div>

                {/* Room zoom */}
                <div className="flex h-8 w-7 items-center justify-center rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                  <ChibiMarkerToken colors={marker} size={18} />
                </div>

                {/* Minimap */}
                <div className="flex h-5 w-4 items-center justify-center rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
                  <ChibiMarkerToken colors={marker} size={10} />
                </div>

                {/* Color swatches */}
                <div className="flex items-center gap-3 pl-2">
                  <ColorSwatch color={marker.hairColor} label="hair" />
                  <ColorSwatch color={marker.clothingColor} label="cloth" />
                  <ColorSwatch color={marker.accentColor} label="acc" />
                  <ColorSwatch color={marker.skinColor} label="skin" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EnvPresetSelector({
  activeId,
  onChange,
}: {
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/50">Lighting</span>
      {ENV_LIGHTING_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
            activeId === p.id
              ? "border-gold/40 bg-[rgba(200,168,76,0.12)] text-gold"
              : "border-[rgba(200,168,76,0.08)] text-silver/60 hover:border-gold/20 hover:text-silver/80"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function SceneReviewBoard({
  buildingId,
  parts,
  partsIndex,
  preset,
}: {
  buildingId: string;
  parts: readonly EnvPartMeta[];
  partsIndex: ReturnType<typeof getLoadedEnvPartsIndex>;
  preset: EnvLightingPreset;
}) {
  const contract = getSceneReviewContract(buildingId);
  const sceneGroups = buildSceneReviewGroups(parts);
  const supportAssets = [
    parts.find((part) => part.category === "prop" && part.status === "approved"),
    parts.find((part) => part.category === "background" && part.status === "approved"),
  ]
    .filter((part): part is EnvPartMeta => part !== undefined)
    .map((part) => ({
      label: part.category === "prop" ? "Featured Prop" : "Featured Background",
      detail: part.id,
      description:
        part.category === "prop"
          ? "Standalone prop review stays available alongside the scene-first room workflow."
          : "Exterior context remains reviewable alongside room scenes without promoting room-box or structural reference art.",
      previewSrc: envPartSvgPath(part, partsIndex),
    }));

  return (
    <section className="glass-card overflow-hidden">
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
          Scene Review Board
        </h2>
        <p className="mt-1 text-xs text-silver/60">
          Approved HQ room scenes are props-only compositions in <code>recipes/</code>, reviewed
          against the shared room contract and supported by prop and background assets.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-silver/50">
          Room scenes are the review anchor, and their metadata must stay aligned with the canonical
          geometry so new states can be reviewed without depending on room-box or structural
          reference artifacts.
        </p>
      </div>

      <div className="border-b border-[rgba(200,168,76,0.04)] px-6 py-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
          Canonical Scene Geometry
        </p>
        <SceneContractSummary contract={contract} />
      </div>

      <div className="px-6 py-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
              Progression Review
            </p>
            <p className="mt-1 text-sm text-silver/50">
              Approved scene states are grouped by series tag or room family. Missing steps stay
              visible so future scene art can be reviewed without changing the layout.
            </p>
          </div>
          <p className="text-xs text-silver/40">{sceneGroups.length} scene series</p>
        </div>

        <div className="space-y-4">
          {sceneGroups.map((group) => {
            const filledCount = group.steps.filter((step) => !step.isPlaceholder).length;
            return (
              <div
                key={group.seriesKey}
                className="rounded-xl border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] p-4"
              >
                <div className="mb-3 flex flex-wrap items-baseline gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
                    {group.label}
                  </h3>
                  {group.roomFamily && (
                    <span className="badge badge-slate text-xs">{group.roomFamily}</span>
                  )}
                  <span className="badge badge-gold text-xs">
                    {filledCount}/{group.steps.length} states
                  </span>
                  {filledCount > 1 && (
                    <span className="text-xs text-gold/40">
                      {group.steps
                        .filter((s) => !s.isPlaceholder)
                        .map((s) => s.index)
                        .join(" \u2192 ")}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {group.steps.map((step) => {
                    const part = step.part;
                    if (!part) {
                      return (
                        <div
                          key={`${group.seriesKey}-${step.index}`}
                          className="flex min-h-[13rem] flex-col justify-between rounded-lg border border-dashed border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.22)] p-3"
                        >
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-gold/40">
                              State {step.index}
                            </p>
                            <p className="mt-2 text-xs text-silver/60">Pending scene state</p>
                          </div>
                          <p className="text-xs leading-relaxed text-silver/40">
                            Placeholder only. Keep the geometry and metadata contract stable until
                            the new room art arrives.
                          </p>
                        </div>
                      );
                    }

                    const src = envPartSvgPath(part, partsIndex);
                    const name = part.id.split("/").pop() ?? part.id;
                    return (
                      <div
                        key={part.id}
                        className="flex min-h-[13rem] flex-col gap-3 rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.32)] p-3"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs uppercase tracking-[0.18em] text-gold/40">
                            State {step.index}
                          </p>
                          <span className="badge badge-gold text-xs">{part.status}</span>
                        </div>
                        <div
                          className="relative flex h-32 items-center justify-center overflow-hidden rounded-md border"
                          style={{ backgroundColor: preset.background, borderColor: preset.border }}
                        >
                          <LazySvgPreview
                            src={src}
                            alt={name}
                            className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                          />
                          {preset.overlay && (
                            <div
                              className="pointer-events-none absolute inset-0"
                              style={{ backgroundColor: preset.overlay }}
                            />
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-silver/60">
                          <p className="text-silver-bright">{name}</p>
                          <p>Room family: {part.roomFamily ?? "n/a"}</p>
                          <p>
                            {part.tags.includes("props-only")
                              ? "Props-only scene"
                              : "Scene metadata mismatch"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[rgba(200,168,76,0.04)] px-6 py-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold/50">
          Supporting Assets
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {supportAssets.map((asset) => {
            return (
              <div
                key={asset.detail}
                className="animate-enter rounded-xl border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] p-4"
              >
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
                    {asset.label}
                  </h3>
                  <span className="badge badge-gold text-xs">{asset.detail}</span>
                </div>
                <p className="mb-3 text-sm text-silver/50">{asset.description}</p>
                <div
                  className="relative h-44 w-full overflow-hidden rounded-lg border"
                  style={{ backgroundColor: preset.background, borderColor: preset.border }}
                >
                  <LazySvgPreview
                    src={asset.previewSrc}
                    alt={asset.label}
                    className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                  />
                  {preset.overlay && (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ backgroundColor: preset.overlay }}
                    />
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-silver/40">
                  <code>{asset.previewSrc}</code>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HqEnvironmentPlayground() {
  const [buildingId, setBuildingId] = useState<string>(HQ_BUILDINGS[0].id);
  const parts = getLoadedEnvParts(buildingId);
  const partsIndex = getLoadedEnvPartsIndex(buildingId);
  const buildingLabel =
    HQ_BUILDINGS.find((building) => building.id === buildingId)?.label ?? buildingId;
  const [presetId, setPresetId] = useState("neutral");
  const preset = getEnvLightingPreset(presetId);

  const partsByCategory = useMemo(() => {
    const map = new Map<EnvPartCategory, EnvPartMeta[]>();
    for (const part of parts) {
      const bucket = map.get(part.category);
      if (bucket) bucket.push(part);
      else map.set(part.category, [part]);
    }
    return map;
  }, [parts]);

  let runningIndex = 0;

  return (
    <div className="space-y-8">
      {/* Style overview */}
      <section
        className="glass-card animate-enter overflow-hidden px-6 py-5"
        style={{ animationDelay: "60ms" }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          HQ Scene Language
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.15em] text-gold/50">
            Building
          </span>
          {HQ_BUILDINGS.map((building) => (
            <button
              key={building.id}
              type="button"
              onClick={() => setBuildingId(building.id)}
              className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                buildingId === building.id
                  ? "border-gold/40 bg-[rgba(200,168,76,0.12)] text-gold"
                  : "border-[rgba(200,168,76,0.08)] text-silver/60 hover:border-gold/20 hover:text-silver/80"
              }`}
            >
              {building.label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2 text-xs leading-relaxed text-silver/70">
          <p>
            Approved room scenes are the first-class HQ review surface &mdash;{" "}
            <strong className="text-gold/80">props-only</strong>, room-scale compositions stored in{" "}
            <code className="text-gold/70">recipes/</code> and checked against the shared room
            geometry contract.
          </p>
          <p>
            {buildingLabel} keeps the same scene-first review model: props, background elements, and
            actor markers remain searchable support inventory, while room-box and structural
            reference artifacts stay out of the approved HQ library.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENV_CATEGORY_ORDER.map((cat) => {
            const count = partsByCategory.get(cat)?.length ?? 0;
            return (
              <div
                key={cat}
                className="rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.3)] px-3 py-2"
              >
                <p className="text-sm font-medium text-silver-bright">{ENV_CATEGORY_LABELS[cat]}</p>
                <p className="text-xs text-gold/50">
                  {count} asset{count !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lighting preset selector */}
      <section className="glass-card animate-enter px-6 py-4" style={{ animationDelay: "100ms" }}>
        <EnvPresetSelector activeId={presetId} onChange={setPresetId} />
      </section>

      {/* Category sections */}
      {ENV_CATEGORY_ORDER.map((cat) => {
        const catParts = partsByCategory.get(cat) ?? [];
        const si = runningIndex;
        runningIndex += catParts.length;
        return (
          <EnvCategorySection
            key={cat}
            category={cat}
            categoryParts={catParts}
            startIndex={si}
            partsIndex={partsIndex}
            preset={preset}
          />
        );
      })}

      {/* Room-scene review */}
      <SceneReviewBoard
        buildingId={buildingId}
        parts={parts}
        partsIndex={partsIndex}
        preset={preset}
      />

      {/* Recipe-colorized actor marker grid */}
      <ActorMarkerGrid />

      {/* Review guidance */}
      <section className={`${glassCardNavyClass} p-6`}>
        <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
          Review Status
        </h2>
        <div className="mt-4 space-y-3 text-xs leading-relaxed text-silver">
          <p>
            <strong className="text-gold">Promoted assets:</strong> Room scene, prop, and background
            assets have been promoted to <span className="badge badge-gold text-xs">approved</span>{" "}
            status and copied from <code className="text-gold/70">reference/</code> into canonical{" "}
            <code className="text-gold/70">parts/</code> and{" "}
            <code className="text-gold/70">recipes/</code> directories. Actor markers remain in
            exploration.
          </p>
          <p>
            <strong className="text-gold">Composition:</strong> The HQ world canvas now renders a
            scene-first composition. Scene metadata owns the room-state contract, while prop and
            background SVGs stay available for support checks.
          </p>
          <p>
            <strong className="text-gold">Scale readability:</strong> Each asset is shown at
            multiple scales to verify it reads correctly at building-zoom (full floor visible),
            room-zoom (single room filling window), and minimap scale.
          </p>
          <p>
            <strong className="text-gold">Actor markers:</strong> Chibi tokens derive identity from
            the same appearance recipe as full portraits. They should be distinguishable at
            zoomed-out scale through hair and clothing color, without requiring facial detail to
            read.
          </p>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <span className="badge badge-gold">assets promoted</span>
          <span className="text-xs text-silver/60">
            Approved assets in {partsIndex.paths.partsRoot}
          </span>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export function SvgPlaygroundPage() {
  const [assetClass, setAssetClass] = useState<AssetClass>("operators");

  return (
    <div className="min-h-dvh bg-void">
      {/* Header */}
      <header className="animate-enter border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link to="/" className="btn-ghost text-xs">
            &larr; back
          </Link>
          <div className="h-4 w-px bg-[rgba(200,168,76,0.08)]" />
          <div className="flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
              SVG Playground
            </h1>
            <p className="mt-0.5 text-sm text-silver/60">{ASSET_CLASS_DESCRIPTIONS[assetClass]}</p>
          </div>
          <Link to="/svg-assets" className="btn-ghost text-xs">
            asset viewer &rarr;
          </Link>
        </div>

        {/* Asset class selector */}
        <div className="flex gap-0 border-t border-[rgba(200,168,76,0.04)] px-6">
          {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((cls) => (
            <button
              key={cls}
              type="button"
              className={tabButtonClass}
              data-active={assetClass === cls}
              onClick={() => setAssetClass(cls)}
            >
              {ASSET_CLASS_LABELS[cls]}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {assetClass === "operators" ? <OperatorPlayground /> : <HqEnvironmentPlayground />}
      </main>
    </div>
  );
}
