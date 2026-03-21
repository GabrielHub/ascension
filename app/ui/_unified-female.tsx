import { PALETTES, dims } from "./_svg-shared";
import type { OperatorVariant } from "./_svg-shared";

/* ═══════════════════════════════════════════════════════════════════════════
   Shared base body (face, blush, nose, lips, neck, clothing) used by all
   three female renderers. Only hair and eyes differ between them.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// 1. FemaleFlowing — Flowing Long Hair + Ornate Sparkle Eyes
//    (Direct rename of AnimeShoujo)
// ─────────────────────────────────────────────────────────────

export function FemaleFlowing({ variant }: { variant: OperatorVariant }) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 44;
  const hr = d.headR + 3;
  const irisBase = p.accent === "#c8a84c" ? "#b8944c" : "#5a78a8";
  const irisMiddle = p.accent === "#c8a84c" ? "#d4b060" : "#7898c0";
  const irisOuter = p.accent === "#c8a84c" ? "#8a6828" : "#3a5878";
  const ow = 1.3;
  const outline = "#2a2228";
  const blush = "#e8a0a0";
  const lipTint = "#d4a0a0";

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — Female Flowing`}
    >
      {/* ── Hair back layer — flowing, voluminous S-curves ── */}
      <path
        d={`M${cx - hr - 4} ${headY - 4}
            Q${cx - hr - 8} ${headY - hr} ${cx - hr + 2} ${headY - hr - 12}
            Q${cx - 6} ${headY - hr - 18} ${cx + 4} ${headY - hr - 16}
            Q${cx + hr - 2} ${headY - hr - 14} ${cx + hr + 6} ${headY - hr - 4}
            Q${cx + hr + 10} ${headY - 4} ${cx + hr + 8} ${headY + 8}
            Q${cx + hr + 10} ${headY + hr + 10} ${cx + hr + 6} ${headY + hr + 20}
            Q${cx + hr + 4} ${headY + hr + 30} ${cx + hr} ${headY + hr + 40}
            L${cx - hr - 2} ${headY + hr + 36}
            Q${cx - hr - 6} ${headY + hr + 26} ${cx - hr - 8} ${headY + hr + 14}
            Q${cx - hr - 10} ${headY + 6} ${cx - hr - 4} ${headY - 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Hair back — flowing highlight streaks */}
      <path
        d={`M${cx + hr + 4} ${headY} Q${cx + hr + 8} ${headY + 16} ${cx + hr + 5} ${headY + hr + 16}`}
        stroke={p.clothingLight}
        strokeWidth="2.0"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + hr + 2} ${headY + 4} Q${cx + hr + 6} ${headY + 20} ${cx + hr + 3} ${headY + hr + 20}`}
        stroke={p.clothingLight}
        strokeWidth="1.5"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />
      <path
        d={`M${cx - hr - 2} ${headY + 2} Q${cx - hr - 6} ${headY + 18} ${cx - hr - 4} ${headY + hr + 18}`}
        stroke={p.clothingLight}
        strokeWidth="1.8"
        fill="none"
        opacity={0.18}
        strokeLinecap="round"
      />
      <path
        d={`M${cx - hr - 4} ${headY + 6} Q${cx - hr - 8} ${headY + 22} ${cx - hr - 6} ${headY + hr + 24}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.12}
        strokeLinecap="round"
      />

      {/* ── Head — very soft oval ── */}
      <ellipse
        cx={cx}
        cy={headY}
        rx={hr}
        ry={hr + 2}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />

      {/* ── Face shadow ── */}
      <path
        d={`M${cx - hr} ${headY + 2}
            Q${cx - hr + 2} ${headY + hr - 4} ${cx - 4} ${headY + hr}
            L${cx - hr + 4} ${headY + hr - 2}
            Q${cx - hr} ${headY + 4} ${cx - hr} ${headY + 2}`}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Blush marks ── */}
      <ellipse cx={cx - 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />
      <ellipse cx={cx + 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />

      {/* ═══ LEFT EYE — tall, ornate, sparkly ═══ */}
      <ellipse cx={cx - 10} cy={headY} rx={7} ry={9} fill="#f8f4ee" />
      <path
        d={`M${cx - 18} ${headY - 5}
            Q${cx - 14} ${headY - 12} ${cx - 10} ${headY - 11}
            Q${cx - 6} ${headY - 10} ${cx - 3} ${headY - 5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Eyelash strokes — left (5) */}
      <line
        x1={cx - 17}
        y1={headY - 6}
        x2={cx - 19}
        y2={headY - 9}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx - 15}
        y1={headY - 8}
        x2={cx - 16.5}
        y2={headY - 11}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx - 12}
        y1={headY - 10}
        x2={cx - 13}
        y2={headY - 13}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx - 8}
        y1={headY - 10.5}
        x2={cx - 8}
        y2={headY - 13.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx - 5}
        y1={headY - 8}
        x2={cx - 3.5}
        y2={headY - 10.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      {/* Lower lid */}
      <path
        d={`M${cx - 17} ${headY + 4} Q${cx - 10} ${headY + 9.5} ${cx - 3} ${headY + 3}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Iris — 3-ring layered */}
      <ellipse cx={cx - 9} cy={headY + 1} rx={5.5} ry={7} fill={irisOuter} />
      <ellipse cx={cx - 9} cy={headY + 1} rx={4.5} ry={6} fill={irisBase} />
      <ellipse cx={cx - 9} cy={headY + 2} rx={3.2} ry={4.5} fill={irisMiddle} />
      <ellipse cx={cx - 9} cy={headY + 3} rx={2} ry={2.5} fill={irisBase} opacity={0.6} />
      <ellipse cx={cx - 9} cy={headY + 1.5} rx={1.8} ry={3} fill={outline} />
      {/* Sparkle highlights (5-6) */}
      <circle cx={cx - 12} cy={headY - 2} r={2.2} fill="#ffffff" />
      <circle cx={cx - 6} cy={headY + 4} r={1.4} fill="#ffffff" opacity={0.8} />
      <circle cx={cx - 12.5} cy={headY + 3} r={0.7} fill="#ffffff" opacity={0.7} />
      <circle cx={cx - 7} cy={headY - 1} r={0.5} fill="#ffffff" opacity={0.6} />
      <path
        d={`M${cx - 5.5} ${headY - 3} L${cx - 5} ${headY - 4.2} L${cx - 4.5} ${headY - 3}
            L${cx - 5} ${headY - 1.8} Z`}
        fill="#ffffff"
        opacity={0.9}
      />

      {/* ═══ RIGHT EYE — mirrored ornate ═══ */}
      <ellipse cx={cx + 10} cy={headY} rx={7} ry={9} fill="#f8f4ee" />
      <path
        d={`M${cx + 3} ${headY - 5}
            Q${cx + 6} ${headY - 10} ${cx + 10} ${headY - 11}
            Q${cx + 14} ${headY - 12} ${cx + 18} ${headY - 5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Eyelash strokes — right (5) */}
      <line
        x1={cx + 17}
        y1={headY - 6}
        x2={cx + 19}
        y2={headY - 9}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx + 15}
        y1={headY - 8}
        x2={cx + 16.5}
        y2={headY - 11}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx + 12}
        y1={headY - 10}
        x2={cx + 13}
        y2={headY - 13}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx + 8}
        y1={headY - 10.5}
        x2={cx + 8}
        y2={headY - 13.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx + 5}
        y1={headY - 8}
        x2={cx + 3.5}
        y2={headY - 10.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 3} ${headY + 3} Q${cx + 10} ${headY + 9.5} ${cx + 17} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 1} rx={5.5} ry={7} fill={irisOuter} />
      <ellipse cx={cx + 11} cy={headY + 1} rx={4.5} ry={6} fill={irisBase} />
      <ellipse cx={cx + 11} cy={headY + 2} rx={3.2} ry={4.5} fill={irisMiddle} />
      <ellipse cx={cx + 11} cy={headY + 3} rx={2} ry={2.5} fill={irisBase} opacity={0.6} />
      <ellipse cx={cx + 11} cy={headY + 1.5} rx={1.8} ry={3} fill={outline} />
      <circle cx={cx + 8} cy={headY - 2} r={2.2} fill="#ffffff" />
      <circle cx={cx + 14} cy={headY + 4} r={1.4} fill="#ffffff" opacity={0.8} />
      <circle cx={cx + 7.5} cy={headY + 3} r={0.7} fill="#ffffff" opacity={0.7} />
      <circle cx={cx + 13} cy={headY - 1} r={0.5} fill="#ffffff" opacity={0.6} />
      <path
        d={`M${cx + 15.5} ${headY - 3} L${cx + 15} ${headY - 4.2} L${cx + 14.5} ${headY - 3}
            L${cx + 15} ${headY - 1.8} Z`}
        fill="#ffffff"
        opacity={0.9}
      />

      {/* ── Eyebrows — thin elegant arches ── */}
      <path
        d={`M${cx - 17} ${headY - 10} Q${cx - 10} ${headY - 15} ${cx - 3} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 3} ${headY - 10} Q${cx + 10} ${headY - 15} ${cx + 17} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose ── */}
      <path
        d={`M${cx - 0.5} ${headY + 10} L${cx + 0.5} ${headY + 11.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Lips ── */}
      <path
        d={`M${cx - 3.5} ${headY + 15} Q${cx} ${headY + 16.5} ${cx + 3.5} ${headY + 15}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 15.2} Q${cx} ${headY + 17} ${cx + 3} ${headY + 15.2}
            Q${cx} ${headY + 16} ${cx - 3} ${headY + 15.2}`}
        fill={lipTint}
        opacity={0.35}
      />

      {/* ── Hair front — flowing bangs with S-curves ── */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 4}
            Q${cx - hr + 4} ${headY - hr - 6} ${cx - hr + 10} ${headY - 2}
            Q${cx - hr + 8} ${headY - hr} ${cx - 6} ${headY - 6}
            Q${cx - 4} ${headY - hr - 2} ${cx + 2} ${headY - 4}
            Q${cx + 4} ${headY - hr + 2} ${cx + 8} ${headY - 6}
            Q${cx + hr - 6} ${headY - hr - 4} ${cx + hr - 2} ${headY - 4}
            Q${cx + hr} ${headY - hr} ${cx + hr + 2} ${headY - hr + 6}
            Q${cx} ${headY - hr - 14} ${cx - hr - 2} ${headY - hr + 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Hair highlight streaks on bangs */}
      <path
        d={`M${cx - hr + 6} ${headY - hr - 2}
            Q${cx - hr + 10} ${headY - hr + 6} ${cx - hr + 8} ${headY - 2}`}
        stroke={p.clothingLight}
        strokeWidth="1.8"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 2} ${headY - hr - 4}
            Q${cx + 2} ${headY - hr + 4} ${cx + 1} ${headY - 4}`}
        stroke={p.clothingLight}
        strokeWidth="1.5"
        fill="none"
        opacity={0.18}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + hr - 6} ${headY - hr - 2}
            Q${cx + hr - 4} ${headY - hr + 4} ${cx + hr - 6} ${headY - 4}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />

      {/* Side hair locks — elegant flowing pieces framing face */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 6}
            Q${cx - hr - 4} ${headY + 4} ${cx - hr + 2} ${headY + hr + 10}
            Q${cx - hr} ${headY + hr + 18} ${cx - hr + 4} ${headY + hr + 28}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx + hr + 2} ${headY - hr + 6}
            Q${cx + hr + 4} ${headY + 4} ${cx + hr - 2} ${headY + hr + 10}
            Q${cx + hr} ${headY + hr + 18} ${cx + hr - 4} ${headY + hr + 28}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />
      {/* Side lock highlights */}
      <path
        d={`M${cx - hr} ${headY} Q${cx - hr - 2} ${headY + 12} ${cx - hr + 2} ${headY + hr + 10}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + hr} ${headY} Q${cx + hr + 2} ${headY + 12} ${cx + hr - 2} ${headY + hr + 10}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />

      {/* ── Neck ── */}
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={10}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={3}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Body — elegant clothing ── */}
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            Q${cx - d.shoulderW / 2} ${headY + hr + 10} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 8}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 8}
            Q${cx + d.shoulderW / 2} ${headY + hr + 10} ${cx + d.shoulderW / 2 - 2} ${headY + hr + 12}
            L${cx + d.bodyW / 2} 160
            L${cx - d.bodyW / 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            L${cx - d.bodyW / 2} 160
            L${cx - d.bodyW / 2 + 10} 160
            L${cx - d.shoulderW / 2 + 12} ${headY + hr + 16} Z`}
        fill={p.clothingLight}
        opacity={0.2}
      />
      {/* Collar — curved neckline */}
      <path
        d={`M${cx - d.neckW / 2 - 6} ${headY + hr + 8}
            Q${cx} ${headY + hr + 18} ${cx + d.neckW / 2 + 6} ${headY + hr + 8}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
      />
      {/* Decorative gem clasp */}
      <path
        d={`M${cx} ${headY + hr + 10}
            L${cx + 3} ${headY + hr + 13}
            L${cx} ${headY + hr + 16}
            L${cx - 3} ${headY + hr + 13} Z`}
        fill={p.accent}
        stroke={outline}
        strokeWidth="0.6"
      />
      <path
        d={`M${cx - 1} ${headY + hr + 11}
            L${cx + 1} ${headY + hr + 12.5}
            L${cx} ${headY + hr + 13} Z`}
        fill="#ffffff"
        opacity={0.6}
      />
      {/* Accent trim */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 9}
            Q${cx} ${headY + hr + 17.5} ${cx + d.neckW / 2 + 4} ${headY + hr + 9}`}
        stroke={p.accent}
        strokeWidth="0.6"
        fill="none"
        opacity={0.5}
      />
      {/* Dashed center seam */}
      <path
        d={`M${cx} ${headY + hr + 16} L${cx} 158`}
        stroke={p.accent}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
        strokeDasharray="3 4"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. FemaleBob — Short Bob Cut + Sharp Elegant Eyes
// ─────────────────────────────────────────────────────────────

export function FemaleBob({ variant }: { variant: OperatorVariant }) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 44;
  const hr = d.headR + 3;
  const irisBase = p.accent === "#c8a84c" ? "#b8944c" : "#5a78a8";
  const ow = 1.3;
  const outline = "#2a2228";
  const blush = "#e8a0a0";
  const lipTint = "#d4a0a0";

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — Female Bob`}
    >
      {/* ── Hair back layer — short geometric bob, ends at jaw ── */}
      <path
        d={`M${cx - hr - 4} ${headY - hr + 2}
            Q${cx - hr - 6} ${headY - hr - 8} ${cx} ${headY - hr - 14}
            Q${cx + hr + 6} ${headY - hr - 8} ${cx + hr + 4} ${headY - hr + 2}
            Q${cx + hr + 8} ${headY - 2} ${cx + hr + 6} ${headY + 10}
            Q${cx + hr + 4} ${headY + hr - 2} ${cx + hr + 2} ${headY + hr + 4}
            L${cx - hr - 2} ${headY + hr + 4}
            Q${cx - hr - 4} ${headY + hr - 2} ${cx - hr - 6} ${headY + 10}
            Q${cx - hr - 8} ${headY - 2} ${cx - hr - 4} ${headY - hr + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Bob — blunt-cut bottom edge left */}
      <path
        d={`M${cx - hr - 4} ${headY + hr + 2}
            Q${cx - hr - 2} ${headY + hr + 6} ${cx - hr + 4} ${headY + hr + 4}`}
        stroke={outline}
        strokeWidth={ow}
        fill="none"
        strokeLinecap="round"
      />
      {/* Bob — blunt-cut bottom edge right */}
      <path
        d={`M${cx + hr + 4} ${headY + hr + 2}
            Q${cx + hr + 2} ${headY + hr + 6} ${cx + hr - 4} ${headY + hr + 4}`}
        stroke={outline}
        strokeWidth={ow}
        fill="none"
        strokeLinecap="round"
      />

      {/* Bob highlight — subtle shine across top */}
      <path
        d={`M${cx - hr + 2} ${headY - hr + 4}
            Q${cx} ${headY - hr} ${cx + hr - 2} ${headY - hr + 4}`}
        stroke={p.clothingLight}
        strokeWidth="2.0"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />

      {/* ── Head — very soft oval ── */}
      <ellipse
        cx={cx}
        cy={headY}
        rx={hr}
        ry={hr + 2}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />

      {/* ── Face shadow ── */}
      <path
        d={`M${cx - hr} ${headY + 2}
            Q${cx - hr + 2} ${headY + hr - 4} ${cx - 4} ${headY + hr}
            L${cx - hr + 4} ${headY + hr - 2}
            Q${cx - hr} ${headY + 4} ${cx - hr} ${headY + 2}`}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Blush marks ── */}
      <ellipse cx={cx - 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />
      <ellipse cx={cx + 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />

      {/* ═══ LEFT EYE — sharp elegant, medium size ═══ */}
      {/* Eye white — medium horizontal */}
      <ellipse cx={cx - 10} cy={headY} rx={7} ry={6} fill="#f8f4ee" />

      {/* Upper eyelid — heavier, angled up at outer corner */}
      <path
        d={`M${cx - 18} ${headY - 2}
            Q${cx - 14} ${headY - 8} ${cx - 10} ${headY - 7}
            Q${cx - 6} ${headY - 6.5} ${cx - 3} ${headY - 3}
            L${cx - 2} ${headY - 5}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyelash strokes — left (3) */}
      <line
        x1={cx - 17}
        y1={headY - 3}
        x2={cx - 19}
        y2={headY - 6}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx - 13}
        y1={headY - 7}
        x2={cx - 14}
        y2={headY - 10}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx - 7}
        y1={headY - 6.5}
        x2={cx - 6.5}
        y2={headY - 9}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Lower lid — slight upturn at outer corner */}
      <path
        d={`M${cx - 17} ${headY + 2} Q${cx - 10} ${headY + 6.5} ${cx - 3} ${headY + 1}
            L${cx - 2} ${headY - 0.5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />

      {/* Iris — single solid ring */}
      <ellipse cx={cx - 9} cy={headY + 0.5} rx={4.5} ry={5} fill={irisBase} />
      {/* Pupil */}
      <ellipse cx={cx - 9} cy={headY + 0.5} rx={2} ry={2.5} fill={outline} />

      {/* Clean highlights (2-3) — no stars */}
      <circle cx={cx - 12} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx - 7} cy={headY + 2.5} r={1.0} fill="#ffffff" opacity={0.8} />
      <circle cx={cx - 11} cy={headY + 2} r={0.6} fill="#ffffff" opacity={0.6} />

      {/* ═══ RIGHT EYE — mirrored sharp elegant ═══ */}
      <ellipse cx={cx + 10} cy={headY} rx={7} ry={6} fill="#f8f4ee" />

      <path
        d={`M${cx + 18} ${headY - 2}
            Q${cx + 14} ${headY - 8} ${cx + 10} ${headY - 7}
            Q${cx + 6} ${headY - 6.5} ${cx + 3} ${headY - 3}
            L${cx + 2} ${headY - 5}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyelash strokes — right (3) */}
      <line
        x1={cx + 17}
        y1={headY - 3}
        x2={cx + 19}
        y2={headY - 6}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx + 13}
        y1={headY - 7}
        x2={cx + 14}
        y2={headY - 10}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx + 7}
        y1={headY - 6.5}
        x2={cx + 6.5}
        y2={headY - 9}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      <path
        d={`M${cx + 17} ${headY + 2} Q${cx + 10} ${headY + 6.5} ${cx + 3} ${headY + 1}
            L${cx + 2} ${headY - 0.5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx={cx + 11} cy={headY + 0.5} rx={4.5} ry={5} fill={irisBase} />
      <ellipse cx={cx + 11} cy={headY + 0.5} rx={2} ry={2.5} fill={outline} />

      <circle cx={cx + 8} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx + 13} cy={headY + 2.5} r={1.0} fill="#ffffff" opacity={0.8} />
      <circle cx={cx + 9} cy={headY + 2} r={0.6} fill="#ffffff" opacity={0.6} />

      {/* ── Eyebrows — thin elegant arches ── */}
      <path
        d={`M${cx - 17} ${headY - 10} Q${cx - 10} ${headY - 15} ${cx - 3} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 3} ${headY - 10} Q${cx + 10} ${headY - 15} ${cx + 17} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose ── */}
      <path
        d={`M${cx - 0.5} ${headY + 10} L${cx + 0.5} ${headY + 11.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Lips ── */}
      <path
        d={`M${cx - 3.5} ${headY + 15} Q${cx} ${headY + 16.5} ${cx + 3.5} ${headY + 15}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 15.2} Q${cx} ${headY + 17} ${cx + 3} ${headY + 15.2}
            Q${cx} ${headY + 16} ${cx - 3} ${headY + 15.2}`}
        fill={lipTint}
        opacity={0.35}
      />

      {/* ── Hair front — thick straight bangs (bob cut) ── */}
      {/* Main bangs — 3 sections with small gaps */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 4}
            Q${cx - hr + 2} ${headY - hr - 10} ${cx - hr + 6} ${headY - hr + 2}
            L${cx - hr + 6} ${headY - 6}
            L${cx - 4} ${headY - 4}
            L${cx - 4} ${headY - hr + 2}
            Q${cx - 2} ${headY - hr - 8} ${cx + hr - 6} ${headY - hr + 2}
            L${cx + hr - 6} ${headY - 6}
            L${cx + hr + 2} ${headY - 4}
            L${cx + hr + 2} ${headY - hr + 4}
            Q${cx} ${headY - hr - 14} ${cx - hr - 2} ${headY - hr + 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Clean horizontal bang line */}
      <line
        x1={cx - hr + 4}
        y1={headY - 5}
        x2={cx - 5}
        y2={headY - 5}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />
      <line
        x1={cx - 3}
        y1={headY - 4.5}
        x2={cx + hr - 8}
        y2={headY - 5.5}
        stroke={outline}
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Bob side pieces — short, framing jaw, not past chin */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 6}
            Q${cx - hr - 4} ${headY} ${cx - hr - 2} ${headY + hr}
            Q${cx - hr} ${headY + hr + 4} ${cx - hr + 4} ${headY + hr + 2}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx + hr + 2} ${headY - hr + 6}
            Q${cx + hr + 4} ${headY} ${cx + hr + 2} ${headY + hr}
            Q${cx + hr} ${headY + hr + 4} ${cx + hr - 4} ${headY + hr + 2}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />

      {/* ── Neck ── */}
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={10}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={3}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Body — elegant clothing ── */}
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            Q${cx - d.shoulderW / 2} ${headY + hr + 10} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 8}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 8}
            Q${cx + d.shoulderW / 2} ${headY + hr + 10} ${cx + d.shoulderW / 2 - 2} ${headY + hr + 12}
            L${cx + d.bodyW / 2} 160
            L${cx - d.bodyW / 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            L${cx - d.bodyW / 2} 160
            L${cx - d.bodyW / 2 + 10} 160
            L${cx - d.shoulderW / 2 + 12} ${headY + hr + 16} Z`}
        fill={p.clothingLight}
        opacity={0.2}
      />
      {/* Collar */}
      <path
        d={`M${cx - d.neckW / 2 - 6} ${headY + hr + 8}
            Q${cx} ${headY + hr + 18} ${cx + d.neckW / 2 + 6} ${headY + hr + 8}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
      />
      {/* Decorative gem clasp */}
      <path
        d={`M${cx} ${headY + hr + 10}
            L${cx + 3} ${headY + hr + 13}
            L${cx} ${headY + hr + 16}
            L${cx - 3} ${headY + hr + 13} Z`}
        fill={p.accent}
        stroke={outline}
        strokeWidth="0.6"
      />
      <path
        d={`M${cx - 1} ${headY + hr + 11}
            L${cx + 1} ${headY + hr + 12.5}
            L${cx} ${headY + hr + 13} Z`}
        fill="#ffffff"
        opacity={0.6}
      />
      {/* Accent trim */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 9}
            Q${cx} ${headY + hr + 17.5} ${cx + d.neckW / 2 + 4} ${headY + hr + 9}`}
        stroke={p.accent}
        strokeWidth="0.6"
        fill="none"
        opacity={0.5}
      />
      {/* Dashed center seam */}
      <path
        d={`M${cx} ${headY + hr + 16} L${cx} 158`}
        stroke={p.accent}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
        strokeDasharray="3 4"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. FemalePonytail — High Ponytail + Round Gentle Eyes
// ─────────────────────────────────────────────────────────────

export function FemalePonytail({ variant }: { variant: OperatorVariant }) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 44;
  const hr = d.headR + 3;
  const irisBase = p.accent === "#c8a84c" ? "#b8944c" : "#5a78a8";
  const irisMiddle = p.accent === "#c8a84c" ? "#d4b060" : "#7898c0";
  const ow = 1.3;
  const outline = "#2a2228";
  const blush = "#e8a0a0";
  const lipTint = "#d4a0a0";

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — Female Ponytail`}
    >
      {/* ── Hair back layer — pulled-back base covering head top ── */}
      <path
        d={`M${cx - hr - 2} ${headY - hr + 6}
            Q${cx - hr - 4} ${headY - hr - 6} ${cx} ${headY - hr - 14}
            Q${cx + hr + 4} ${headY - hr - 6} ${cx + hr + 2} ${headY - hr + 6}
            Q${cx + hr + 4} ${headY - 4} ${cx + hr} ${headY + 4}
            L${cx - hr} ${headY + 4}
            Q${cx - hr - 4} ${headY - 4} ${cx - hr - 2} ${headY - hr + 6}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* ── High ponytail — thick flowing shape from crown down ── */}
      <path
        d={`M${cx + 6} ${headY - hr - 8}
            Q${cx + 14} ${headY - hr - 14} ${cx + 20} ${headY - hr - 6}
            Q${cx + 26} ${headY - hr + 8} ${cx + 22} ${headY + 10}
            Q${cx + 20} ${headY + 30} ${cx + 18} ${headY + 50}
            Q${cx + 16} ${headY + 70} ${cx + 14} ${headY + hr + 50}
            Q${cx + 12} ${headY + hr + 56} ${cx + 8} ${headY + hr + 52}
            Q${cx + 10} ${headY + hr + 40} ${cx + 12} ${headY + 30}
            Q${cx + 14} ${headY + 10} ${cx + 14} ${headY - hr + 4}
            Q${cx + 10} ${headY - hr - 4} ${cx + 6} ${headY - hr - 8}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Ponytail highlight streaks */}
      <path
        d={`M${cx + 18} ${headY - hr + 2}
            Q${cx + 20} ${headY + 10} ${cx + 16} ${headY + 40}`}
        stroke={p.clothingLight}
        strokeWidth="1.8"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 16} ${headY - hr + 6}
            Q${cx + 18} ${headY + 14} ${cx + 14} ${headY + 44}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />

      {/* Hair tie / band at ponytail base — accent colored */}
      <ellipse
        cx={cx + 10}
        cy={headY - hr - 4}
        rx={5}
        ry={3}
        fill={p.accent}
        stroke={outline}
        strokeWidth="0.8"
      />

      {/* ── Head — very soft oval ── */}
      <ellipse
        cx={cx}
        cy={headY}
        rx={hr}
        ry={hr + 2}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />

      {/* ── Face shadow ── */}
      <path
        d={`M${cx - hr} ${headY + 2}
            Q${cx - hr + 2} ${headY + hr - 4} ${cx - 4} ${headY + hr}
            L${cx - hr + 4} ${headY + hr - 2}
            Q${cx - hr} ${headY + 4} ${cx - hr} ${headY + 2}`}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Blush marks ── */}
      <ellipse cx={cx - 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />
      <ellipse cx={cx + 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />

      {/* ═══ LEFT EYE — round, warm, gentle ═══ */}
      {/* Eye white — medium-large round */}
      <ellipse cx={cx - 10} cy={headY} rx={6} ry={7} fill="#f8f4ee" />

      {/* Upper eyelid — moderate, evenly curved */}
      <path
        d={`M${cx - 17} ${headY - 3}
            Q${cx - 13} ${headY - 9} ${cx - 10} ${headY - 8.5}
            Q${cx - 7} ${headY - 8} ${cx - 4} ${headY - 3}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyelash strokes — left (2, minimal) */}
      <line
        x1={cx - 16}
        y1={headY - 4}
        x2={cx - 17.5}
        y2={headY - 7}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx - 12}
        y1={headY - 8}
        x2={cx - 12.5}
        y2={headY - 10.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Soft lower lid */}
      <path
        d={`M${cx - 16} ${headY + 3} Q${cx - 10} ${headY + 7.5} ${cx - 4} ${headY + 3}`}
        stroke={outline}
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Iris — 2 rings: outer and inner */}
      <circle cx={cx - 9} cy={headY + 0.5} r={4.5} fill={irisBase} />
      <circle cx={cx - 9} cy={headY + 1} r={3} fill={irisMiddle} />
      {/* Round pupil */}
      <circle cx={cx - 9} cy={headY + 0.5} r={1.8} fill={outline} />

      {/* Warm soft highlights (3, circular only) */}
      <circle cx={cx - 12} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx - 7} cy={headY + 3} r={1.2} fill="#ffffff" opacity={0.7} />
      <circle cx={cx - 11} cy={headY + 2} r={0.6} fill="#ffffff" opacity={0.5} />

      {/* ═══ RIGHT EYE — mirrored round gentle ═══ */}
      <ellipse cx={cx + 10} cy={headY} rx={6} ry={7} fill="#f8f4ee" />

      <path
        d={`M${cx + 4} ${headY - 3}
            Q${cx + 7} ${headY - 8} ${cx + 10} ${headY - 8.5}
            Q${cx + 13} ${headY - 9} ${cx + 17} ${headY - 3}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {/* Eyelash strokes — right (2, minimal) */}
      <line
        x1={cx + 16}
        y1={headY - 4}
        x2={cx + 17.5}
        y2={headY - 7}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />
      <line
        x1={cx + 12}
        y1={headY - 8}
        x2={cx + 12.5}
        y2={headY - 10.5}
        stroke={outline}
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      <path
        d={`M${cx + 4} ${headY + 3} Q${cx + 10} ${headY + 7.5} ${cx + 16} ${headY + 3}`}
        stroke={outline}
        strokeWidth="0.5"
        fill="none"
        strokeLinecap="round"
      />

      <circle cx={cx + 11} cy={headY + 0.5} r={4.5} fill={irisBase} />
      <circle cx={cx + 11} cy={headY + 1} r={3} fill={irisMiddle} />
      <circle cx={cx + 11} cy={headY + 0.5} r={1.8} fill={outline} />

      <circle cx={cx + 8} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx + 13} cy={headY + 3} r={1.2} fill="#ffffff" opacity={0.7} />
      <circle cx={cx + 9} cy={headY + 2} r={0.6} fill="#ffffff" opacity={0.5} />

      {/* ── Eyebrows — thin elegant arches ── */}
      <path
        d={`M${cx - 17} ${headY - 10} Q${cx - 10} ${headY - 15} ${cx - 3} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 3} ${headY - 10} Q${cx + 10} ${headY - 15} ${cx + 17} ${headY - 10}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose ── */}
      <path
        d={`M${cx - 0.5} ${headY + 10} L${cx + 0.5} ${headY + 11.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Lips ── */}
      <path
        d={`M${cx - 3.5} ${headY + 15} Q${cx} ${headY + 16.5} ${cx + 3.5} ${headY + 15}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 15.2} Q${cx} ${headY + 17} ${cx + 3} ${headY + 15.2}
            Q${cx} ${headY + 16} ${cx - 3} ${headY + 15.2}`}
        fill={lipTint}
        opacity={0.35}
      />

      {/* ── Hair front — minimal, showing forehead ── */}
      {/* Pulled-back hairline across top of forehead */}
      <path
        d={`M${cx - hr} ${headY - hr + 6}
            Q${cx - hr + 2} ${headY - hr - 4} ${cx} ${headY - hr - 10}
            Q${cx + hr - 2} ${headY - hr - 4} ${cx + hr} ${headY - hr + 6}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Wispy loose strand at left temple */}
      <path
        d={`M${cx - hr + 2} ${headY - hr + 6}
            Q${cx - hr} ${headY - hr + 12} ${cx - hr + 3} ${headY - 4}`}
        stroke={p.hair}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Wispy loose strand at right temple */}
      <path
        d={`M${cx + hr - 2} ${headY - hr + 6}
            Q${cx + hr} ${headY - hr + 12} ${cx + hr - 3} ${headY - 4}`}
        stroke={p.hair}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Small center fringe */}
      <path
        d={`M${cx - 3} ${headY - hr + 2}
            Q${cx} ${headY - hr + 6} ${cx + 3} ${headY - hr + 2}`}
        stroke={p.hair}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Neck ── */}
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={10}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <rect
        x={cx - d.neckW / 2 + 1}
        y={headY + hr + 1}
        width={d.neckW - 2}
        height={3}
        fill={p.skinShadow}
        opacity={0.2}
      />

      {/* ── Body — elegant clothing ── */}
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            Q${cx - d.shoulderW / 2} ${headY + hr + 10} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 8}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 8}
            Q${cx + d.shoulderW / 2} ${headY + hr + 10} ${cx + d.shoulderW / 2 - 2} ${headY + hr + 12}
            L${cx + d.bodyW / 2} 160
            L${cx - d.bodyW / 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12}
            L${cx - d.bodyW / 2} 160
            L${cx - d.bodyW / 2 + 10} 160
            L${cx - d.shoulderW / 2 + 12} ${headY + hr + 16} Z`}
        fill={p.clothingLight}
        opacity={0.2}
      />
      {/* Collar */}
      <path
        d={`M${cx - d.neckW / 2 - 6} ${headY + hr + 8}
            Q${cx} ${headY + hr + 18} ${cx + d.neckW / 2 + 6} ${headY + hr + 8}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
      />
      {/* Decorative gem clasp */}
      <path
        d={`M${cx} ${headY + hr + 10}
            L${cx + 3} ${headY + hr + 13}
            L${cx} ${headY + hr + 16}
            L${cx - 3} ${headY + hr + 13} Z`}
        fill={p.accent}
        stroke={outline}
        strokeWidth="0.6"
      />
      <path
        d={`M${cx - 1} ${headY + hr + 11}
            L${cx + 1} ${headY + hr + 12.5}
            L${cx} ${headY + hr + 13} Z`}
        fill="#ffffff"
        opacity={0.6}
      />
      {/* Accent trim */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 9}
            Q${cx} ${headY + hr + 17.5} ${cx + d.neckW / 2 + 4} ${headY + hr + 9}`}
        stroke={p.accent}
        strokeWidth="0.6"
        fill="none"
        opacity={0.5}
      />
      {/* Dashed center seam */}
      <path
        d={`M${cx} ${headY + hr + 16} L${cx} 158`}
        stroke={p.accent}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
        strokeDasharray="3 4"
      />
    </svg>
  );
}
