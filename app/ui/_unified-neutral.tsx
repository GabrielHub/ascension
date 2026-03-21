import { PALETTES, dims } from "./_svg-shared";
import type { OperatorVariant } from "./_svg-shared";

export function NeutralTousled({ variant }: { variant: OperatorVariant }) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 42;
  const hr = d.headR + 1;
  const outline = "#151318";
  const ow = 1.6;
  const irisBase = p.accent === "#c8a84c" ? "#a89048" : "#5a7898";
  const irisMiddle = p.accent === "#c8a84c" ? "#c4a454" : "#6888b0";

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — Neutral Tousled`}
    >
      {/* ── Hair back layer — medium tousled volume ── */}
      <path
        d={`M${cx - hr - 6} ${headY - 2}
            Q${cx - hr - 8} ${headY - hr - 6} ${cx - hr + 2} ${headY - hr - 10}
            Q${cx - 4} ${headY - hr - 14} ${cx + 6} ${headY - hr - 12}
            Q${cx + hr} ${headY - hr - 8} ${cx + hr + 6} ${headY - hr - 2}
            Q${cx + hr + 8} ${headY + 2} ${cx + hr + 6} ${headY + 6}
            L${cx + hr + 4} ${headY + hr * 0.6}
            L${cx - hr - 4} ${headY + hr * 0.6}
            Q${cx - hr - 8} ${headY + 2} ${cx - hr - 6} ${headY - 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Back hair tousled texture strands */}
      <path
        d={`M${cx + hr + 3} ${headY - hr - 1}
            Q${cx + hr + 6} ${headY} ${cx + hr + 4} ${headY + hr * 0.4}`}
        stroke={p.clothingLight}
        strokeWidth="0.7"
        fill="none"
        opacity={0.2}
      />
      <path
        d={`M${cx - hr - 3} ${headY - hr + 1}
            Q${cx - hr - 6} ${headY + 2} ${cx - hr - 3} ${headY + hr * 0.4}`}
        stroke={p.clothingLight}
        strokeWidth="0.7"
        fill="none"
        opacity={0.2}
      />

      {/* ── Head — moderate jaw with rounded transitions ── */}
      <path
        d={`M${cx - hr} ${headY - hr + 4}
            Q${cx} ${headY - hr - 2} ${cx + hr} ${headY - hr + 4}
            Q${cx + hr + 2} ${headY} ${cx + hr} ${headY + 6}
            Q${cx + hr - 2} ${headY + hr} ${cx + 2} ${headY + hr + 4}
            L${cx} ${headY + hr + 5}
            L${cx - 2} ${headY + hr + 4}
            Q${cx - hr + 2} ${headY + hr} ${cx - hr} ${headY + 6}
            Q${cx - hr - 2} ${headY} ${cx - hr} ${headY - hr + 4}`}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* ── Face shadow — medium opacity on left side ── */}
      <path
        d={`M${cx - hr} ${headY + 6}
            Q${cx - hr + 2} ${headY + hr} ${cx - 2} ${headY + hr + 4}
            L${cx} ${headY + hr + 5}
            L${cx - 2} ${headY + 4}
            L${cx - hr + 3} ${headY - 2}
            Q${cx - hr - 2} ${headY + 2} ${cx - hr} ${headY + 6}`}
        fill={p.skinShadow}
        opacity={0.3}
      />

      {/* ── Left eye — almond shape, balanced detail ── */}
      {/* Eye white */}
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      {/* Upper lid — moderate weight */}
      <path
        d={`M${cx - 16.5} ${headY - 2} Q${cx - 10} ${headY - 7} ${cx - 3.5} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lower lid — subtle */}
      <path
        d={`M${cx - 16} ${headY + 4} Q${cx - 10} ${headY + 7} ${cx - 4} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Iris outer ring — darker */}
      <ellipse cx={cx - 9.5} cy={headY + 1} rx={4} ry={4.5} fill={irisBase} />
      {/* Iris inner ring — lighter */}
      <ellipse cx={cx - 9.5} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      {/* Pupil — round */}
      <circle cx={cx - 9.5} cy={headY + 1.5} r={1.8} fill={outline} />
      {/* Highlight — large */}
      <circle cx={cx - 11.5} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      {/* Highlight — small */}
      <circle cx={cx - 7.5} cy={headY + 3} r={0.8} fill="#ffffff" opacity={0.6} />

      {/* ── Right eye — mirrored almond ── */}
      <ellipse cx={cx + 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx + 3.5} ${headY - 2} Q${cx + 10} ${headY - 7} ${cx + 16.5} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY + 4} Q${cx + 10} ${headY + 7} ${cx + 16} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 10.5} cy={headY + 1} rx={4} ry={4.5} fill={irisBase} />
      <ellipse cx={cx + 10.5} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      <circle cx={cx + 10.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx + 8.5} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx + 12.5} cy={headY + 3} r={0.8} fill="#ffffff" opacity={0.6} />

      {/* ── Eyebrows — medium weight ── */}
      <path
        d={`M${cx - 16} ${headY - 6} Q${cx - 10} ${headY - 11} ${cx - 4} ${headY - 6}`}
        stroke={p.hair}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY - 6} Q${cx + 10} ${headY - 11} ${cx + 16} ${headY - 6}`}
        stroke={p.hair}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose — small L-shape stroke ── */}
      <path
        d={`M${cx - 0.5} ${headY + 6} L${cx - 1} ${headY + 11}`}
        stroke={p.skinShadow}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 2} ${headY + 11} L${cx} ${headY + 12.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx - 1} cy={headY + 11.5} r={0.5} fill={p.skinShadow} opacity={0.4} />

      {/* ── Mouth — simple subtle curve ── */}
      <path
        d={`M${cx - 4} ${headY + 16} Q${cx} ${headY + 17} ${cx + 4} ${headY + 16}`}
        stroke={outline}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Hair front — tousled medium-length bangs ── */}
      {/* Main tousled mass */}
      <path
        d={`M${cx - hr - 4} ${headY - hr + 4}
            Q${cx - hr + 2} ${headY - hr - 4} ${cx - hr + 8} ${headY - 4}
            L${cx - hr + 6} ${headY - hr}
            Q${cx - 6} ${headY - hr - 6} ${cx - 2} ${headY - 6}
            L${cx - 4} ${headY - hr - 2}
            Q${cx + 4} ${headY - hr - 8} ${cx + 8} ${headY - 5}
            L${cx + hr - 8} ${headY - hr + 2}
            Q${cx + hr - 2} ${headY - hr - 4} ${cx + hr + 2} ${headY - hr + 2}
            Q${cx + hr + 4} ${headY - hr - 2} ${cx + hr + 4} ${headY - hr + 4}
            Q${cx} ${headY - hr - 12} ${cx - hr - 4} ${headY - hr + 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Tousled strand falling across brow — section 1 */}
      <path
        d={`M${cx - 6} ${headY - hr} Q${cx - 8} ${headY - 6} ${cx - 10} ${headY + 1}`}
        stroke={p.hair}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tousled strand — section 2, shorter */}
      <path
        d={`M${cx - 2} ${headY - hr + 2} Q${cx - 3} ${headY - 8} ${cx - 4} ${headY - 3}`}
        stroke={p.hair}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tousled strand — section 3 */}
      <path
        d={`M${cx + 4} ${headY - hr - 2} Q${cx + 2} ${headY - 6} ${cx + 1} ${headY - 2}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tousled strand — section 4 */}
      <path
        d={`M${cx + hr - 6} ${headY - hr + 2}
            Q${cx + hr - 4} ${headY - 6} ${cx + hr - 6} ${headY - 2}`}
        stroke={p.hair}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Side hair covering ears — left */}
      <path
        d={`M${cx - hr - 4} ${headY - hr + 6}
            Q${cx - hr - 6} ${headY + 2} ${cx - hr - 2} ${headY + hr - 4}
            Q${cx - hr} ${headY + hr + 2} ${cx - hr + 2} ${headY + hr + 4}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />
      {/* Side hair covering ears — right */}
      <path
        d={`M${cx + hr + 4} ${headY - hr + 6}
            Q${cx + hr + 6} ${headY + 2} ${cx + hr + 2} ${headY + hr - 4}
            Q${cx + hr} ${headY + hr + 2} ${cx + hr - 2} ${headY + hr + 4}`}
        stroke={outline}
        strokeWidth={ow}
        fill={p.hair}
        strokeLinejoin="round"
      />

      {/* Hair highlight streaks */}
      <path
        d={`M${cx - hr + 4} ${headY - hr - 2}
            Q${cx - hr + 8} ${headY - hr + 4} ${cx - hr + 6} ${headY - 2}`}
        stroke={p.clothingLight}
        strokeWidth="0.6"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 2} ${headY - hr - 4}
            Q${cx + 4} ${headY - hr + 2} ${cx + 3} ${headY - 4}`}
        stroke={p.clothingLight}
        strokeWidth="0.6"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + hr - 4} ${headY - hr}
            Q${cx + hr - 2} ${headY - hr + 6} ${cx + hr - 3} ${headY - 2}`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />

      {/* ── Neck — medium width ── */}
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={12}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      {/* Neck shadow */}
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={5}
        fill={p.skinShadow}
        opacity={0.3}
      />

      {/* ── Body — clean with simple collar ── */}
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18}
            Q${cx - d.shoulderW / 2 - 2} ${headY + hr + 14} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 12}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 12}
            Q${cx + d.shoulderW / 2 + 2} ${headY + hr + 14} ${cx + d.shoulderW / 2 - 1} ${headY + hr + 18}
            L${cx + d.bodyW / 2 + 1} 160
            L${cx - d.bodyW / 2 - 1} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Clothing shadow — left side */}
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18}
            L${cx - d.bodyW / 2 - 1} 160
            L${cx - d.bodyW / 2 + 12} 160
            L${cx - d.shoulderW / 2 + 14} ${headY + hr + 22} Z`}
        fill={p.clothingLight}
        opacity={0.25}
      />

      {/* Mandarin collar — left flap */}
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 3} ${headY + hr + 12}
            L${cx - (d.neckW - 1) / 2 - 1} ${headY + hr + 6}
            L${cx - (d.neckW - 1) / 2 + 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />
      {/* Mandarin collar — right flap */}
      <path
        d={`M${cx + (d.neckW - 1) / 2 + 3} ${headY + hr + 12}
            L${cx + (d.neckW - 1) / 2 + 1} ${headY + hr + 6}
            L${cx + (d.neckW - 1) / 2 - 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />

      {/* Accent piping along collar edge */}
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 2} ${headY + hr + 12}
            L${cx} ${headY + hr + 14}
            L${cx + (d.neckW - 1) / 2 + 2} ${headY + hr + 12}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        opacity={0.6}
      />

      {/* Center seam */}
      <path
        d={`M${cx} ${headY + hr + 14} L${cx} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.25}
      />
    </svg>
  );
}

export function NeutralSideshave({ variant }: { variant: OperatorVariant }) {
  const p = PALETTES[variant.role];
  const d = dims(variant.build);
  const cx = 60;
  const headY = 42;
  const hr = d.headR + 1;
  const outline = "#151318";
  const ow = 1.6;
  const irisBase = p.accent === "#c8a84c" ? "#a89048" : "#5a7898";

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={`${variant.name} — Neutral Sideshave`}
    >
      {/* ── Hair back layer — asymmetric, long on right only ── */}
      <path
        d={`M${cx - hr + 2} ${headY - hr + 2}
            Q${cx} ${headY - hr - 8} ${cx + hr - 2} ${headY - hr - 4}
            Q${cx + hr + 6} ${headY - hr + 2} ${cx + hr + 8} ${headY + 2}
            Q${cx + hr + 10} ${headY + hr} ${cx + hr + 6} ${headY + hr + 14}
            Q${cx + hr + 4} ${headY + hr + 22} ${cx + hr} ${headY + hr + 30}
            L${cx + hr - 4} ${headY + hr + 6}
            L${cx - hr + 2} ${headY + hr * 0.5}
            Q${cx - hr - 2} ${headY} ${cx - hr + 2} ${headY - hr + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Back hair highlight on long side */}
      <path
        d={`M${cx + hr + 4} ${headY + 4}
            Q${cx + hr + 8} ${headY + 16} ${cx + hr + 5} ${headY + hr + 14}`}
        stroke={p.clothingLight}
        strokeWidth="1.4"
        fill="none"
        opacity={0.18}
        strokeLinecap="round"
      />

      {/* ── Head — moderate jaw with rounded transitions ── */}
      <path
        d={`M${cx - hr} ${headY - hr + 4}
            Q${cx} ${headY - hr - 2} ${cx + hr} ${headY - hr + 4}
            Q${cx + hr + 2} ${headY} ${cx + hr} ${headY + 6}
            Q${cx + hr - 2} ${headY + hr} ${cx + 2} ${headY + hr + 4}
            L${cx} ${headY + hr + 5}
            L${cx - 2} ${headY + hr + 4}
            Q${cx - hr + 2} ${headY + hr} ${cx - hr} ${headY + 6}
            Q${cx - hr - 2} ${headY} ${cx - hr} ${headY - hr + 4}`}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* ── Face shadow — medium opacity on left side ── */}
      <path
        d={`M${cx - hr} ${headY + 6}
            Q${cx - hr + 2} ${headY + hr} ${cx - 2} ${headY + hr + 4}
            L${cx} ${headY + hr + 5}
            L${cx - 2} ${headY + 4}
            L${cx - hr + 3} ${headY - 2}
            Q${cx - hr - 2} ${headY + 2} ${cx - hr} ${headY + 6}`}
        fill={p.skinShadow}
        opacity={0.3}
      />

      {/* ── Left side buzzed stubble strokes ── */}
      <line
        x1={cx - hr + 1}
        y1={headY - 6}
        x2={cx - hr + 1}
        y2={headY - 4}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr + 3}
        y1={headY - 8}
        x2={cx - hr + 3}
        y2={headY - 6}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr}
        y1={headY - 2}
        x2={cx - hr}
        y2={headY}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr + 2}
        y1={headY + 1}
        x2={cx - hr + 2}
        y2={headY + 3}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr - 1}
        y1={headY + 3}
        x2={cx - hr - 1}
        y2={headY + 5}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr + 4}
        y1={headY - 4}
        x2={cx - hr + 4}
        y2={headY - 2}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr + 1}
        y1={headY + 5}
        x2={cx - hr + 1}
        y2={headY + 7}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <line
        x1={cx - hr + 3}
        y1={headY + 3}
        x2={cx - hr + 3}
        y2={headY + 5}
        stroke={p.hair}
        strokeWidth="0.6"
        strokeLinecap="round"
      />

      {/* ── Left eye — sharp angular with accent liner ── */}
      {/* Eye white */}
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      {/* Upper lid — moderate-heavy, outer corner angled up */}
      <path
        d={`M${cx - 16.5} ${headY - 1}
            Q${cx - 10} ${headY - 7} ${cx - 3} ${headY - 2.5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Accent liner — thin colored line inside upper lid */}
      <path
        d={`M${cx - 15.5} ${headY - 0.5}
            Q${cx - 10} ${headY - 6} ${cx - 4} ${headY - 2}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Lower lid — thin, straight */}
      <path
        d={`M${cx - 16} ${headY + 4} L${cx - 4} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.6"
        fill="none"
        strokeLinecap="round"
      />
      {/* Iris — single solid ring */}
      <ellipse cx={cx - 9.5} cy={headY + 1} rx={4} ry={4.5} fill={irisBase} />
      {/* Pupil — round */}
      <circle cx={cx - 9.5} cy={headY + 1.5} r={1.8} fill={outline} />
      {/* Diamond highlight */}
      <path
        d={`M${cx - 12} ${headY - 1}
            L${cx - 11.5} ${headY - 2.2}
            L${cx - 11} ${headY - 1}
            L${cx - 11.5} ${headY + 0.2} Z`}
        fill="#ffffff"
      />
      {/* Small circle highlight */}
      <circle cx={cx - 7.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />

      {/* ── Right eye — mirrored sharp angular ── */}
      <ellipse cx={cx + 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx + 3} ${headY - 2.5}
            Q${cx + 10} ${headY - 7} ${cx + 16.5} ${headY - 1}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Accent liner — right eye */}
      <path
        d={`M${cx + 4} ${headY - 2}
            Q${cx + 10} ${headY - 6} ${cx + 15.5} ${headY - 0.5}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY + 4} L${cx + 16} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.6"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 10.5} cy={headY + 1} rx={4} ry={4.5} fill={irisBase} />
      <circle cx={cx + 10.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <path
        d={`M${cx + 12} ${headY - 1}
            L${cx + 11.5} ${headY - 2.2}
            L${cx + 11} ${headY - 1}
            L${cx + 11.5} ${headY + 0.2} Z`}
        fill="#ffffff"
      />
      <circle cx={cx + 12.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />

      {/* ── Eyebrows — medium weight ── */}
      <path
        d={`M${cx - 16} ${headY - 6} Q${cx - 10} ${headY - 11} ${cx - 4} ${headY - 6}`}
        stroke={p.hair}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY - 6} Q${cx + 10} ${headY - 11} ${cx + 16} ${headY - 6}`}
        stroke={p.hair}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Nose — small L-shape stroke ── */}
      <path
        d={`M${cx - 0.5} ${headY + 6} L${cx - 1} ${headY + 11}`}
        stroke={p.skinShadow}
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 2} ${headY + 11} L${cx} ${headY + 12.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={cx - 1} cy={headY + 11.5} r={0.5} fill={p.skinShadow} opacity={0.4} />

      {/* ── Mouth — simple subtle curve ── */}
      <path
        d={`M${cx - 4} ${headY + 16} Q${cx} ${headY + 17} ${cx + 4} ${headY + 16}`}
        stroke={outline}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />

      {/* ── Hair front — asymmetric: long right side, bare left ── */}
      {/* Main top hair sweeping right */}
      <path
        d={`M${cx - 4} ${headY - hr - 2}
            Q${cx - 8} ${headY - hr - 6} ${cx} ${headY - hr - 10}
            Q${cx + 8} ${headY - hr - 8} ${cx + hr} ${headY - hr - 2}
            Q${cx + hr + 4} ${headY - hr + 4} ${cx + hr + 6} ${headY - 2}
            Q${cx + hr + 4} ${headY - hr + 2} ${cx + hr + 2} ${headY - hr + 4}
            Q${cx + 6} ${headY - hr - 6} ${cx - 4} ${headY - hr - 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Long flowing right section — layer 1 */}
      <path
        d={`M${cx + hr + 2} ${headY - hr + 4}
            Q${cx + hr + 6} ${headY} ${cx + hr + 4} ${headY + hr}
            Q${cx + hr + 2} ${headY + hr + 10} ${cx + hr - 2} ${headY + hr + 20}
            L${cx + hr - 4} ${headY + hr + 6}
            Q${cx + hr} ${headY + 4} ${cx + hr + 2} ${headY - hr + 4}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      {/* Long flowing right section — layer 2 */}
      <path
        d={`M${cx + hr + 4} ${headY + 2}
            Q${cx + hr + 8} ${headY + hr + 4} ${cx + hr + 4} ${headY + hr + 18}
            Q${cx + hr + 2} ${headY + hr + 26} ${cx + hr - 2} ${headY + hr + 30}
            L${cx + hr} ${headY + hr + 20}
            Q${cx + hr + 4} ${headY + hr + 8} ${cx + hr + 4} ${headY + 2}`}
        fill={p.hair}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Strands sweeping across forehead left to right */}
      <path
        d={`M${cx - 6} ${headY - hr + 2}
            Q${cx} ${headY - hr - 2} ${cx + 6} ${headY - 6}`}
        stroke={p.hair}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 2} ${headY - hr + 4}
            Q${cx + 4} ${headY - hr} ${cx + 10} ${headY - 4}`}
        stroke={p.hair}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />

      {/* Highlight streaks on long side */}
      <path
        d={`M${cx + hr + 2} ${headY + 2}
            Q${cx + hr + 6} ${headY + 14} ${cx + hr + 3} ${headY + hr + 12}`}
        stroke={p.clothingLight}
        strokeWidth="1.2"
        fill="none"
        opacity={0.2}
        strokeLinecap="round"
      />
      <path
        d={`M${cx + hr} ${headY + 6}
            Q${cx + hr + 4} ${headY + 18} ${cx + hr + 1} ${headY + hr + 16}`}
        stroke={p.clothingLight}
        strokeWidth="0.8"
        fill="none"
        opacity={0.15}
        strokeLinecap="round"
      />

      {/* ── Neck — medium width ── */}
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={12}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      {/* Neck shadow */}
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={5}
        fill={p.skinShadow}
        opacity={0.3}
      />

      {/* ── Body — clean with simple collar ── */}
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18}
            Q${cx - d.shoulderW / 2 - 2} ${headY + hr + 14} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 12}
            L${cx + d.shoulderW / 2 - 6} ${headY + hr + 12}
            Q${cx + d.shoulderW / 2 + 2} ${headY + hr + 14} ${cx + d.shoulderW / 2 - 1} ${headY + hr + 18}
            L${cx + d.bodyW / 2 + 1} 160
            L${cx - d.bodyW / 2 - 1} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />

      {/* Clothing shadow — left side */}
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18}
            L${cx - d.bodyW / 2 - 1} 160
            L${cx - d.bodyW / 2 + 12} 160
            L${cx - d.shoulderW / 2 + 14} ${headY + hr + 22} Z`}
        fill={p.clothingLight}
        opacity={0.25}
      />

      {/* Mandarin collar — left flap */}
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 3} ${headY + hr + 12}
            L${cx - (d.neckW - 1) / 2 - 1} ${headY + hr + 6}
            L${cx - (d.neckW - 1) / 2 + 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />
      {/* Mandarin collar — right flap */}
      <path
        d={`M${cx + (d.neckW - 1) / 2 + 3} ${headY + hr + 12}
            L${cx + (d.neckW - 1) / 2 + 1} ${headY + hr + 6}
            L${cx + (d.neckW - 1) / 2 - 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />

      {/* Accent piping along collar edge */}
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 2} ${headY + hr + 12}
            L${cx} ${headY + hr + 14}
            L${cx + (d.neckW - 1) / 2 + 2} ${headY + hr + 12}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        opacity={0.6}
      />

      {/* Center seam */}
      <path
        d={`M${cx} ${headY + hr + 14} L${cx} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.25}
      />
    </svg>
  );
}
