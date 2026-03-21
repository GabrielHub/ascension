import type { OperatorVariant } from "./_svg-shared";
import { FemaleFlowing, FemaleBob, FemalePonytail } from "./_unified-female";
import { MaleSwept, MaleSpiky, MaleUndercut } from "./_unified-male";
import { NeutralTousled, NeutralSideshave } from "./_unified-neutral";

/* ═══════════════════════════════════════════════════════════════════════════
   Operator Portrait — renders locked unified anime style portraits.

   The preset id is authoritative, supplied by the runtime appearance contract.
   The role determines the palette. The build is derived from the role.
   Hair/eye style comes from the preset — each preset maps to a specific
   unified renderer.
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
}

export function OperatorPortrait({
  name,
  roleTag,
  presetId,
  size = "detail",
}: OperatorPortraitProps) {
  const Renderer = PRESET_RENDERERS[presetId] ?? PRESET_RENDERERS["male-swept"];
  const rawRole = roleTag.replace(/^role:/, "").toLowerCase();
  const defaults = ROLE_DEFAULTS[rawRole] ?? { role: "Bruiser", build: "broad" as const };
  const variant: OperatorVariant = {
    name,
    role: defaults.role,
    build: defaults.build,
  };

  return (
    <div
      className={`${SIZE_CLASS[size]} shrink-0 overflow-hidden rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]`}
    >
      <Renderer variant={variant} />
    </div>
  );
}
