import type { OperatorVariant } from "./_svg-shared";
import type { VisibleGear } from "./operator-parts";
import { partSvgPath } from "./operator-parts";
import { FemaleFlowing, FemaleBob, FemalePonytail } from "./_unified-female";
import { MaleSwept, MaleSpiky, MaleUndercut } from "./_unified-male";
import { NeutralTousled, NeutralSideshave } from "./_unified-neutral";

/* ═══════════════════════════════════════════════════════════════════════════
   Operator Portrait — renders locked unified anime style portraits.

   The preset id is authoritative, supplied by the runtime appearance contract.
   The role determines the palette. The build is derived from the role.
   Hair/eye style comes from the preset — each preset maps to a specific
   unified renderer.

   Raid-context portraits may include visible gear overlays when present.
   HQ/non-raid contexts omit gear (pass no visibleGear prop).
   ═══════════════════════════════════════════════════════════════════════════ */

const PRESET_RENDERERS: Record<string, React.ComponentType<{ variant: OperatorVariant }>> = {
  "male-swept": MaleSwept,
  "male-spiky": MaleSpiky,
  "male-undercut": MaleUndercut,
  "female-flowing": FemaleFlowing,
  "female-bob": FemaleBob,
  "female-ponytail": FemalePonytail,
  "neutral-tousled": NeutralTousled,
  "neutral-sideshave": NeutralSideshave,
};

/** Role tag → palette name and default build. */
const ROLE_DEFAULTS: Record<string, { role: string; build: "broad" | "lean" | "medium" }> = {
  bruiser: { role: "Bruiser", build: "broad" },
  infiltrator: { role: "Infiltrator", build: "lean" },
  strategist: { role: "Strategist", build: "medium" },
};

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
  const Renderer = PRESET_RENDERERS[presetId] ?? PRESET_RENDERERS["male-swept"];
  const rawRole = roleTag.replace(/^role:/, "").toLowerCase();
  const defaults = ROLE_DEFAULTS[rawRole] ?? { role: "Bruiser", build: "broad" as const };
  const variant: OperatorVariant = {
    name,
    role: defaults.role,
    build: defaults.build,
  };

  const hasGear =
    visibleGear &&
    (visibleGear.weaponPartId || visibleGear.outfitOverlayPartId || visibleGear.accessoryPartId);

  return (
    <div
      className={`${SIZE_CLASS[size]} relative shrink-0 overflow-hidden rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]`}
    >
      {/* Base portrait */}
      <Renderer variant={variant} />

      {/* Gear overlays — raid-context only, layered on top of base */}
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
