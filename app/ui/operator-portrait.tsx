import type { VisibleGear } from "./operator-parts";
import { getDefaultRecipe, getRecipeById, partSvgPath } from "./operator-parts";
import { resolveOperatorBuild } from "./operator-build";
import { PortraitFromRecipe } from "./_portrait-parts";

/* ═══════════════════════════════════════════════════════════════════════════
   Operator Portrait — renders operator identity as SVG portraits.

   Single rendering path:
   - Every operator appearance resolves to a shipped recipe.
   - The modular portrait assembler composes parts from that recipe.
   - Palette and skin tone come from the recipe, independent of role.

   Raid-context portraits may include visible gear overlays when present.
   HQ/non-raid contexts omit gear (pass no visibleGear prop).
   ═══════════════════════════════════════════════════════════════════════════ */

// ──────────────────────────────────────────────────────────────────────────

const SIZE_CLASS = {
  roster: "h-14 w-[calc(120*3.5rem/160)]",
  detail: "h-40 w-[calc(120*10rem/160)]",
  card: "h-24 w-[calc(120*6rem/160)]",
} as const;

interface OperatorPortraitProps {
  name: string;
  roleTag: string;
  presetId: string;
  size?: keyof typeof SIZE_CLASS;
  /** Visible gear overlays for raid-context portraits. Omit for HQ/base. */
  visibleGear?: VisibleGear;
}

/** Render a single gear overlay SVG as an absolutely positioned image layer.
 *  Broken or missing assets are hidden gracefully so the base portrait remains visible. */
function GearOverlay({ partId }: { partId: string }) {
  return (
    <img
      src={partSvgPath(partId)}
      alt=""
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

export function OperatorPortrait({
  name,
  roleTag,
  presetId,
  size = "detail",
  visibleGear,
}: OperatorPortraitProps) {
  const hasGear =
    visibleGear &&
    (visibleGear.weaponPartId || visibleGear.outfitOverlayPartId || visibleGear.accessoryPartId);

  const recipe = getRecipeById(presetId) ?? getDefaultRecipe();
  const build = resolveOperatorBuild(roleTag, presetId);

  return (
    <div
      className={`${SIZE_CLASS[size]} relative shrink-0 overflow-hidden rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]`}
    >
      <PortraitFromRecipe recipe={recipe} build={build} label={`${name} portrait`} />
      {hasGear && (
        <>
          {visibleGear.outfitOverlayPartId && (
            <GearOverlay partId={visibleGear.outfitOverlayPartId} />
          )}
          {visibleGear.weaponPartId && <GearOverlay partId={visibleGear.weaponPartId} />}
          {visibleGear.accessoryPartId && <GearOverlay partId={visibleGear.accessoryPartId} />}
        </>
      )}
    </div>
  );
}
