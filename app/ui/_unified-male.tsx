import { PALETTES, dims } from "./_svg-shared";
import type { OperatorVariant } from "./_svg-shared";

/* ─────────────────────────────────────────────────────────────────────────────
   Shared base body renderer used by all three male variants.
   Everything is identical except hair and eyes, which are injected via
   the `renderHairBack`, `renderEyes`, and `renderHairFront` callbacks.
   ───────────────────────────────────────────────────────────────────────────── */

interface BaseParts {
  variant: OperatorVariant;
  label: string;
  renderHairBack: (ctx: BaseCtx) => React.JSX.Element;
  renderEyes: (ctx: BaseCtx) => React.JSX.Element;
  renderHairFront: (ctx: BaseCtx) => React.JSX.Element;
}

interface BaseCtx {
  cx: number;
  headY: number;
  hr: number;
  outline: string;
  ow: number;
  irisColor: string;
  p: (typeof PALETTES)[string];
  d: ReturnType<typeof dims>;
}

function MaleBase({ variant, label, renderHairBack, renderEyes, renderHairFront }: BaseParts) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 40;
  const hr = d.headR;
  const irisColor = p.accent === "#c8a84c" ? "#9a8040" : "#4a6888";
  const ow = 2.0;
  const outline = "#0a0a0c";
  const ctx: BaseCtx = { cx, headY, hr, outline, ow, irisColor, p, d };

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — ${label}`}
    >
      {/* ── Hair back layer (variant-specific) ── */}
      {renderHairBack(ctx)}

      {/* ── Head — angular jaw with chin definition ── */}
      <path
        d={`M${cx - hr} ${headY - hr + 4}
            Q${cx} ${headY - hr - 3} ${cx + hr} ${headY - hr + 4}
            Q${cx + hr + 3} ${headY - 2} ${cx + hr + 1} ${headY + 6}
            L${cx + hr - 4} ${headY + hr - 2}
            L${cx + 4} ${headY + hr + 6}
            L${cx} ${headY + hr + 7}
            L${cx - 4} ${headY + hr + 6}
            L${cx - hr + 4} ${headY + hr - 2}
            L${cx - hr - 1} ${headY + 6}
            Q${cx - hr - 3} ${headY - 2} ${cx - hr} ${headY - hr + 4}`}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* ── Heavy cel shadow — left face ── */}
      <path
        d={`M${cx - hr - 1} ${headY + 6}
            L${cx - hr + 4} ${headY + hr - 2}
            L${cx - 4} ${headY + hr + 6}
            L${cx} ${headY + hr + 7}
            L${cx - 2} ${headY + 6}
            L${cx - hr + 2} ${headY - 4}
            Q${cx - hr - 3} ${headY} ${cx - hr - 1} ${headY + 6}`}
        fill={p.skinShadow}
        opacity={0.45}
      />
      {/* Secondary shadow under jaw on right */}
      <path
        d={`M${cx + 4} ${headY + hr + 6}
            L${cx} ${headY + hr + 7}
            L${cx + 2} ${headY + hr + 2}
            L${cx + hr - 6} ${headY + hr - 4}
            Z`}
        fill={p.skinShadow}
        opacity={0.25}
      />

      {/* ── Eyes (variant-specific) ── */}
      {renderEyes(ctx)}

      {/* ── Thick eyebrows ── */}
      <path
        d={`M${cx - 16} ${headY - 5} Q${cx - 12} ${headY - 10} ${cx - 4} ${headY - 5}`}
        stroke={p.hair}
        strokeWidth="3.0"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY - 5} Q${cx + 12} ${headY - 10} ${cx + 16} ${headY - 5}`}
        stroke={p.hair}
        strokeWidth="3.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose — bridge line + tip triangle + nostril dot ── */}
      <path
        d={`M${cx - 1} ${headY + 2} L${cx - 1.5} ${headY + 10}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 10} L${cx} ${headY + 12} L${cx + 1} ${headY + 10}`}
        stroke={p.skinShadow}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx - 1.5} cy={headY + 11} r={0.6} fill={p.skinShadow} opacity={0.5} />

      {/* ── Mouth — firm line + lower lip shadow ── */}
      <path
        d={`M${cx - 5} ${headY + 16} L${cx} ${headY + 15.5} L${cx + 5} ${headY + 16}`}
        stroke={outline}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 17.5} Q${cx} ${headY + 18.5} ${cx + 3} ${headY + 17.5}`}
        stroke={p.skinShadow}
        strokeWidth="0.8"
        fill="none"
        opacity={0.4}
      />

      {/* ── Hair front layer (variant-specific) ── */}
      {renderHairFront(ctx)}

      {/* ── Neck ── */}
      <rect
        x={cx - d.neckW / 2}
        y={headY + hr + 5}
        width={d.neckW}
        height={14}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <rect
        x={cx - d.neckW / 2}
        y={headY + hr + 5}
        width={d.neckW}
        height={6}
        fill={p.skinShadow}
        opacity={0.4}
      />
      <path
        d={`M${cx - 3} ${headY + hr + 6} L${cx - d.neckW / 2 + 2} ${headY + hr + 18}`}
        stroke={p.skinShadow}
        strokeWidth="0.7"
        fill="none"
        opacity={0.3}
      />

      {/* ── Body — structured clothing with armor/detail ── */}
      <path
        d={`M${cx - d.shoulderW / 2} ${headY + hr + 20}
            Q${cx - d.shoulderW / 2 - 4} ${headY + hr + 16} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 14}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 14}
            Q${cx + d.shoulderW / 2 + 4} ${headY + hr + 16} ${cx + d.shoulderW / 2} ${headY + hr + 20}
            L${cx + d.bodyW / 2 + 2} 160
            L${cx - d.bodyW / 2 - 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Heavy clothing shadow — large diagonal slab */}
      <path
        d={`M${cx - d.shoulderW / 2} ${headY + hr + 20}
            L${cx - d.bodyW / 2 - 2} 160
            L${cx - d.bodyW / 2 + 16} 160
            L${cx - d.shoulderW / 2 + 20} ${headY + hr + 24} Z`}
        fill={p.clothingLight}
        opacity={0.35}
      />
      {/* Right body shadow */}
      <path
        d={`M${cx + d.shoulderW / 2} ${headY + hr + 20}
            L${cx + d.bodyW / 2 + 2} 160
            L${cx + d.bodyW / 2 - 8} 160
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 28} Z`}
        fill="#000000"
        opacity={0.15}
      />

      {/* Collar — high stiff collar */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 14}
            L${cx - d.neckW / 2 - 2} ${headY + hr + 7}
            L${cx - d.neckW / 2 + 2} ${headY + hr + 14}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="1.0"
      />
      <path
        d={`M${cx + d.neckW / 2 + 4} ${headY + hr + 14}
            L${cx + d.neckW / 2 + 2} ${headY + hr + 7}
            L${cx + d.neckW / 2 - 2} ${headY + hr + 14}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="1.0"
      />

      {/* Collar V opening */}
      <path
        d={`M${cx - 6} ${headY + hr + 14} L${cx} ${headY + hr + 30} L${cx + 6} ${headY + hr + 14}`}
        stroke={p.accent}
        strokeWidth="1.5"
        fill="none"
        opacity={0.7}
      />

      {/* Shoulder armor plate — left */}
      <path
        d={`M${cx - d.shoulderW / 2 + 6} ${headY + hr + 14}
            L${cx - d.shoulderW / 2} ${headY + hr + 20}
            L${cx - d.shoulderW / 2 + 4} ${headY + hr + 28}
            L${cx - d.shoulderW / 2 + 14} ${headY + hr + 22}
            Z`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
        opacity={0.5}
      />
      {/* Shoulder armor plate — right */}
      <path
        d={`M${cx + d.shoulderW / 2 - 6} ${headY + hr + 14}
            L${cx + d.shoulderW / 2} ${headY + hr + 20}
            L${cx + d.shoulderW / 2 - 4} ${headY + hr + 28}
            L${cx + d.shoulderW / 2 - 14} ${headY + hr + 22}
            Z`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
        opacity={0.5}
      />

      {/* Seam lines on body */}
      <path
        d={`M${cx - d.shoulderW / 2 + 10} ${headY + hr + 16} L${cx - d.bodyW / 2 + 10} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.6"
        opacity={0.35}
      />
      <path
        d={`M${cx + d.shoulderW / 2 - 10} ${headY + hr + 16} L${cx + d.bodyW / 2 - 10} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.6"
        opacity={0.35}
      />
      {/* Center seam */}
      <path
        d={`M${cx} ${headY + hr + 30} L${cx} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        opacity={0.25}
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   1. MaleSwept — Swept Hair + Narrow Eyes  (identical to AnimeSeinen)
   ═══════════════════════════════════════════════════════════════════════════════ */

function sweptHairBack({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      <path
        d={`M${cx - hr - 5} ${headY - 2}
            Q${cx - hr - 8} ${headY - hr - 4} ${cx - hr + 2} ${headY - hr - 10}
            Q${cx - 4} ${headY - hr - 16} ${cx + 4} ${headY - hr - 14}
            Q${cx + hr - 2} ${headY - hr - 12} ${cx + hr + 4} ${headY - hr - 6}
            Q${cx + hr + 8} ${headY - hr + 2} ${cx + hr + 6} ${headY + 2}
            L${cx + hr + 4} ${headY + hr * 0.7}
            L${cx - hr - 4} ${headY + hr * 0.7}
            Q${cx - hr - 8} ${headY + 2} ${cx - hr - 5} ${headY - 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Back hair volume strand lines */}
      <path
        d={`M${cx + hr + 2} ${headY - hr - 2} Q${cx + hr + 6} ${headY} ${cx + hr + 4} ${headY + hr * 0.5}`}
        stroke={p.clothing}
        strokeWidth="0.7"
        fill="none"
        opacity={0.25}
      />
      <path
        d={`M${cx - hr - 2} ${headY - hr} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 3} ${headY + hr * 0.5}`}
        stroke={p.clothing}
        strokeWidth="0.7"
        fill="none"
        opacity={0.25}
      />
    </>
  );
}

function sweptEyes({ cx, headY, outline, irisColor }: BaseCtx) {
  return (
    <>
      {/* ── Left eye — narrow, intense ── */}
      <ellipse cx={cx - 10} cy={headY + 1} rx={5.5} ry={3.5} fill="#f0ece4" />
      <path
        d={`M${cx - 16} ${headY - 1} Q${cx - 10} ${headY - 5} ${cx - 4} ${headY - 1}`}
        stroke={outline}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 15} ${headY + 3} Q${cx - 10} ${headY + 5.5} ${cx - 5} ${headY + 3}`}
        stroke={outline}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9} cy={headY + 1} rx={3} ry={3.5} fill={irisColor} />
      <ellipse
        cx={cx - 9}
        cy={headY + 1}
        rx={3}
        ry={3.5}
        fill="none"
        stroke={outline}
        strokeWidth="0.6"
      />
      <ellipse cx={cx - 9} cy={headY + 1.5} rx={1.4} ry={2.5} fill={outline} />
      <circle cx={cx - 11} cy={headY - 0.5} r={1.2} fill="#ffffff" />
      <circle cx={cx - 7.5} cy={headY + 2.5} r={0.6} fill="#ffffff" opacity={0.5} />

      {/* ── Right eye ── */}
      <ellipse cx={cx + 10} cy={headY + 1} rx={5.5} ry={3.5} fill="#f0ece4" />
      <path
        d={`M${cx + 4} ${headY - 1} Q${cx + 10} ${headY - 5} ${cx + 16} ${headY - 1}`}
        stroke={outline}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 5} ${headY + 3} Q${cx + 10} ${headY + 5.5} ${cx + 15} ${headY + 3}`}
        stroke={outline}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 1} rx={3} ry={3.5} fill={irisColor} />
      <ellipse
        cx={cx + 11}
        cy={headY + 1}
        rx={3}
        ry={3.5}
        fill="none"
        stroke={outline}
        strokeWidth="0.6"
      />
      <ellipse cx={cx + 11} cy={headY + 1.5} rx={1.4} ry={2.5} fill={outline} />
      <circle cx={cx + 9} cy={headY - 0.5} r={1.2} fill="#ffffff" />
      <circle cx={cx + 12.5} cy={headY + 2.5} r={0.6} fill="#ffffff" opacity={0.5} />
    </>
  );
}

function sweptHairFront({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      <path
        d={`M${cx - hr - 3} ${headY - hr + 2}
            Q${cx - hr + 2} ${headY - hr - 6} ${cx - hr + 8} ${headY - 6}
            L${cx - hr + 6} ${headY - hr - 2}
            Q${cx - 4} ${headY - hr - 8} ${cx} ${headY - 8}
            L${cx - 2} ${headY - hr - 4}
            Q${cx + 6} ${headY - hr - 10} ${cx + hr - 4} ${headY - 6}
            L${cx + hr - 6} ${headY - hr}
            Q${cx + hr + 2} ${headY - hr - 4} ${cx + hr + 4} ${headY - hr + 4}
            Q${cx + hr + 2} ${headY - hr - 6} ${cx + hr + 4} ${headY - hr + 4}
            Q${cx} ${headY - hr - 12} ${cx - hr - 3} ${headY - hr + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Hair texture strand lines */}
      <path
        d={`M${cx - hr + 4} ${headY - hr - 2} Q${cx - hr + 8} ${headY - hr + 6} ${cx - hr + 7} ${headY - 4}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
      />
      <path
        d={`M${cx - 2} ${headY - hr - 6} Q${cx + 2} ${headY - hr + 4} ${cx + 1} ${headY - 6}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
      />
      <path
        d={`M${cx + hr - 6} ${headY - hr - 2} Q${cx + hr - 2} ${headY - hr + 4} ${cx + hr - 4} ${headY - 4}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
      />
      {/* One dramatic strand falling across forehead */}
      <path
        d={`M${cx - 4} ${headY - hr - 2} Q${cx - 6} ${headY - 6} ${cx - 8} ${headY + 1}`}
        stroke={p.hair}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

export function MaleSwept({ variant }: { variant: OperatorVariant }) {
  return (
    <MaleBase
      variant={variant}
      label="Male Swept"
      renderHairBack={sweptHairBack}
      renderEyes={sweptEyes}
      renderHairFront={sweptHairFront}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   2. MaleSpiky — Spiky Wild Hair + Sharp Angular Eyes
   ═══════════════════════════════════════════════════════════════════════════════ */

function spikyHairBack({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      {/* Wide spiked silhouette — flame/crown shape behind head */}
      <path
        d={`M${cx - hr - 6} ${headY + 2}
            L${cx - hr - 4} ${headY - hr + 2}
            L${cx - hr - 10} ${headY - hr - 8}
            L${cx - hr + 2} ${headY - hr - 4}
            L${cx - hr + 6} ${headY - hr - 14}
            L${cx - 4} ${headY - hr - 8}
            L${cx} ${headY - hr - 18}
            L${cx + 4} ${headY - hr - 10}
            L${cx + hr - 6} ${headY - hr - 16}
            L${cx + hr - 2} ${headY - hr - 4}
            L${cx + hr + 8} ${headY - hr - 10}
            L${cx + hr + 4} ${headY - hr + 2}
            L${cx + hr + 6} ${headY + 2}
            L${cx + hr + 4} ${headY + hr * 0.7}
            L${cx - hr - 4} ${headY + hr * 0.7}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
    </>
  );
}

function spikyEyes({ cx, headY, outline, irisColor }: BaseCtx) {
  return (
    <>
      {/* ── Left eye — angular, fierce, slightly larger ── */}
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={4} fill="#f0ece4" />
      {/* Upper lid — angled UP at outer corner for fierce look */}
      <path
        d={`M${cx - 16.5} ${headY + 1} Q${cx - 10} ${headY - 5} ${cx - 4} ${headY - 2.5}`}
        stroke={outline}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lower lid — thicker, angling up at outer corner */}
      <path
        d={`M${cx - 16} ${headY + 4} Q${cx - 10} ${headY + 5.5} ${cx - 4.5} ${headY + 2.5}`}
        stroke={outline}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Solid clear iris — round pupil, not slit */}
      <ellipse cx={cx - 9} cy={headY + 1} rx={3.5} ry={3.5} fill={irisColor} />
      <ellipse
        cx={cx - 9}
        cy={headY + 1}
        rx={3.5}
        ry={3.5}
        fill="none"
        stroke={outline}
        strokeWidth="0.6"
      />
      {/* Round pupil */}
      <circle cx={cx - 9} cy={headY + 1.5} r={1.8} fill={outline} />
      {/* Diamond-shaped highlight (4-pointed star) */}
      <path
        d={`M${cx - 11} ${headY - 0.5}
            L${cx - 10} ${headY - 1.5}
            L${cx - 9} ${headY - 0.5}
            L${cx - 10} ${headY + 0.5}
            Z`}
        fill="#ffffff"
      />

      {/* ── Right eye ── */}
      <ellipse cx={cx + 10} cy={headY + 1} rx={6} ry={4} fill="#f0ece4" />
      <path
        d={`M${cx + 4} ${headY - 2.5} Q${cx + 10} ${headY - 5} ${cx + 16.5} ${headY + 1}`}
        stroke={outline}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4.5} ${headY + 2.5} Q${cx + 10} ${headY + 5.5} ${cx + 16} ${headY + 4}`}
        stroke={outline}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 1} rx={3.5} ry={3.5} fill={irisColor} />
      <ellipse
        cx={cx + 11}
        cy={headY + 1}
        rx={3.5}
        ry={3.5}
        fill="none"
        stroke={outline}
        strokeWidth="0.6"
      />
      <circle cx={cx + 11} cy={headY + 1.5} r={1.8} fill={outline} />
      <path
        d={`M${cx + 9} ${headY - 0.5}
            L${cx + 10} ${headY - 1.5}
            L${cx + 11} ${headY - 0.5}
            L${cx + 10} ${headY + 0.5}
            Z`}
        fill="#ffffff"
      />
    </>
  );
}

function spikyHairFront({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      {/* Sharp triangular spike shapes overlapping forehead */}
      {/* Center spike — tallest */}
      <path
        d={`M${cx - 6} ${headY - hr + 2}
            L${cx} ${headY - hr - 12}
            L${cx + 6} ${headY - hr + 2}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Left spike — angled left */}
      <path
        d={`M${cx - hr + 2} ${headY - hr + 6}
            L${cx - hr - 4} ${headY - hr - 8}
            L${cx - 4} ${headY - hr + 2}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Inner-left spike */}
      <path
        d={`M${cx - hr + 6} ${headY - hr + 4}
            L${cx - 8} ${headY - hr - 6}
            L${cx - 2} ${headY - hr + 2}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Right spike — angled right */}
      <path
        d={`M${cx + 4} ${headY - hr + 2}
            L${cx + hr + 2} ${headY - hr - 10}
            L${cx + hr - 2} ${headY - hr + 6}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Inner-right spike */}
      <path
        d={`M${cx + 2} ${headY - hr + 2}
            L${cx + 8} ${headY - hr - 8}
            L${cx + hr - 6} ${headY - hr + 4}
            Z`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Base hairline connecting all spikes */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 4}
            Q${cx - hr + 4} ${headY - 8} ${cx - 4} ${headY - 6}
            Q${cx} ${headY - 8} ${cx + 4} ${headY - 6}
            Q${cx + hr - 4} ${headY - 8} ${cx + hr + 2} ${headY - hr + 4}
            Q${cx} ${headY - hr - 2} ${cx - hr - 2} ${headY - hr + 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
    </>
  );
}

export function MaleSpiky({ variant }: { variant: OperatorVariant }) {
  return (
    <MaleBase
      variant={variant}
      label="Male Spiky"
      renderHairBack={spikyHairBack}
      renderEyes={spikyEyes}
      renderHairFront={spikyHairFront}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   3. MaleUndercut — Undercut Hair + Round Softer Eyes
   ═══════════════════════════════════════════════════════════════════════════════ */

function undercutHairBack({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      {/* Top/back long section swept back — volume on top only */}
      <path
        d={`M${cx - 4} ${headY - hr + 2}
            Q${cx - 2} ${headY - hr - 8} ${cx + 4} ${headY - hr - 12}
            Q${cx + hr - 4} ${headY - hr - 10} ${cx + hr + 2} ${headY - hr - 4}
            Q${cx + hr + 6} ${headY - hr + 4} ${cx + hr + 4} ${headY + 2}
            L${cx + hr + 4} ${headY + hr * 0.4}
            L${cx + hr} ${headY + hr * 0.4}
            Q${cx + hr + 2} ${headY - hr} ${cx + hr - 2} ${headY - hr - 2}
            Q${cx + 4} ${headY - hr - 6} ${cx - 4} ${headY - hr + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Back strand detail */}
      <path
        d={`M${cx + hr} ${headY - hr - 4} Q${cx + hr + 4} ${headY - hr + 6} ${cx + hr + 3} ${headY + hr * 0.3}`}
        stroke={p.clothing}
        strokeWidth="0.7"
        fill="none"
        opacity={0.25}
      />
    </>
  );
}

function undercutEyes({ cx, headY, outline, irisColor }: BaseCtx) {
  return (
    <>
      {/* ── Left eye — rounder, softer, more open ── */}
      <ellipse cx={cx - 10} cy={headY + 1} rx={5.5} ry={5} fill="#f0ece4" />
      {/* Upper lid — lighter weight, less angular */}
      <path
        d={`M${cx - 16} ${headY - 2} Q${cx - 10} ${headY - 6} ${cx - 4} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lower lid — softer arched curve */}
      <path
        d={`M${cx - 15.5} ${headY + 4} Q${cx - 10} ${headY + 7} ${cx - 4.5} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Round iris */}
      <circle cx={cx - 9} cy={headY + 1} r={3.5} fill={irisColor} />
      <circle cx={cx - 9} cy={headY + 1} r={3.5} fill="none" stroke={outline} strokeWidth="0.6" />
      {/* Round pupil */}
      <circle cx={cx - 9} cy={headY + 1.5} r={1.8} fill={outline} />
      {/* Two highlight dots — large + small */}
      <circle cx={cx - 11} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx - 7.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />

      {/* ── Right eye ── */}
      <ellipse cx={cx + 10} cy={headY + 1} rx={5.5} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx + 4} ${headY - 2} Q${cx + 10} ${headY - 6} ${cx + 16} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4.5} ${headY + 4} Q${cx + 10} ${headY + 7} ${cx + 15.5} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={cx + 11} cy={headY + 1} r={3.5} fill={irisColor} />
      <circle cx={cx + 11} cy={headY + 1} r={3.5} fill="none" stroke={outline} strokeWidth="0.6" />
      <circle cx={cx + 11} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx + 9} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx + 12.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />
    </>
  );
}

function undercutHairFront({ cx, headY, hr, outline, ow, p }: BaseCtx) {
  return (
    <>
      {/* Buzzed side strokes — left temple (very short parallel lines) */}
      <line
        x1={cx - hr + 1}
        y1={headY - hr + 8}
        x2={cx - hr + 3}
        y2={headY - hr + 7}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx - hr}
        y1={headY - hr + 11}
        x2={cx - hr + 2.5}
        y2={headY - hr + 10}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx - hr - 0.5}
        y1={headY - hr + 14}
        x2={cx - hr + 2}
        y2={headY - hr + 13}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx - hr - 0.5}
        y1={headY - hr + 17}
        x2={cx - hr + 2}
        y2={headY - hr + 16}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.4}
      />

      {/* Buzzed side strokes — right temple */}
      <line
        x1={cx + hr - 1}
        y1={headY - hr + 8}
        x2={cx + hr - 3}
        y2={headY - hr + 7}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx + hr}
        y1={headY - hr + 11}
        x2={cx + hr - 2.5}
        y2={headY - hr + 10}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx + hr - 0.5}
        y1={headY - hr + 14}
        x2={cx + hr - 2}
        y2={headY - hr + 13}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <line
        x1={cx + hr - 0.5}
        y1={headY - hr + 17}
        x2={cx + hr - 2}
        y2={headY - hr + 16}
        stroke={p.hair}
        strokeWidth="0.8"
        opacity={0.4}
      />

      {/* Long top section swept back — main mass on top of head */}
      <path
        d={`M${cx - hr + 4} ${headY - hr + 2}
            Q${cx - 6} ${headY - hr - 4} ${cx} ${headY - hr - 8}
            Q${cx + hr - 8} ${headY - hr - 10} ${cx + hr} ${headY - hr - 2}
            Q${cx + hr + 4} ${headY - hr + 4} ${cx + hr + 2} ${headY - hr + 8}
            Q${cx + hr - 2} ${headY - hr + 2} ${cx + 4} ${headY - hr + 2}
            Q${cx} ${headY - hr - 2} ${cx - hr + 4} ${headY - hr + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Top hair strand lines */}
      <path
        d={`M${cx - 4} ${headY - hr - 2} Q${cx + 4} ${headY - hr - 6} ${cx + hr - 4} ${headY - hr}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
      />
      <path
        d={`M${cx - 2} ${headY - hr} Q${cx + 6} ${headY - hr - 4} ${cx + hr - 2} ${headY - hr + 2}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.25}
      />

      {/* Long strand falling forward over right side of face */}
      <path
        d={`M${cx + 4} ${headY - hr}
            Q${cx + 8} ${headY - hr + 8} ${cx + 10} ${headY - 2}
            Q${cx + 12} ${headY + 4} ${cx + 14} ${headY + 8}`}
        stroke={p.hair}
        strokeWidth="3.0"
        fill="none"
        strokeLinecap="round"
      />
      {/* Secondary thinner strand beside main one */}
      <path
        d={`M${cx + 2} ${headY - hr + 2}
            Q${cx + 6} ${headY - hr + 10} ${cx + 8} ${headY}`}
        stroke={p.hair}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

export function MaleUndercut({ variant }: { variant: OperatorVariant }) {
  return (
    <MaleBase
      variant={variant}
      label="Male Undercut"
      renderHairBack={undercutHairBack}
      renderEyes={undercutEyes}
      renderHairFront={undercutHairFront}
    />
  );
}
