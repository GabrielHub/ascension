/**
 * Modular portrait parts and recipe-driven assembler.
 *
 * Each part category is a render function that accepts a PortraitContext
 * and produces SVG elements. The assembler composes parts from a recipe
 * to render a complete operator portrait.
 *
 * Part categories: head-shape, eyes, hair (back+front), face-detail, body-silhouette.
 * All coordinates use the standard viewBox 0 0 120 160.
 */

import type { PortraitContext, BuildType } from "./_svg-shared";
import { PORTRAIT_PALETTES, SKIN_TONES, buildPortraitContext } from "./_svg-shared";

// ── Part render function types ────────────────────────────────────────────

type PartRenderer = (ctx: PortraitContext) => React.JSX.Element;
interface HairRenderers {
  back: PartRenderer;
  front: PartRenderer;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEAD SHAPES — face outline + shadows only
// ═══════════════════════════════════════════════════════════════════════════

function headAngularJaw({ cx, headY, hr, ow, outline, p }: PortraitContext) {
  return (
    <>
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
      <path
        d={`M${cx + 4} ${headY + hr + 6}
            L${cx} ${headY + hr + 7}
            L${cx + 2} ${headY + hr + 2}
            L${cx + hr - 6} ${headY + hr - 4} Z`}
        fill={p.skinShadow}
        opacity={0.25}
      />
    </>
  );
}

function headSoftOval({ cx, headY, hr, ow, outline, p }: PortraitContext) {
  return (
    <>
      <ellipse
        cx={cx}
        cy={headY}
        rx={hr}
        ry={hr + 2}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <path
        d={`M${cx - hr} ${headY + 2}
            Q${cx - hr + 2} ${headY + hr - 4} ${cx - 4} ${headY + hr}
            L${cx - hr + 4} ${headY + hr - 2}
            Q${cx - hr} ${headY + 4} ${cx - hr} ${headY + 2}`}
        fill={p.skinShadow}
        opacity={0.2}
      />
    </>
  );
}

function headModerateJaw({ cx, headY, hr, ow, outline, p }: PortraitContext) {
  return (
    <>
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EYES — both left and right eye pairs
// ═══════════════════════════════════════════════════════════════════════════

function eyesNarrowAlmond({ cx, headY, outline, irisColor }: PortraitContext) {
  return (
    <>
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

function eyesAngularCat({ cx, headY, outline, irisColor }: PortraitContext) {
  return (
    <>
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={4} fill="#f0ece4" />
      <path
        d={`M${cx - 16.5} ${headY + 1} Q${cx - 10} ${headY - 5} ${cx - 4} ${headY - 2.5}`}
        stroke={outline}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 16} ${headY + 4} Q${cx - 10} ${headY + 5.5} ${cx - 4.5} ${headY + 2.5}`}
        stroke={outline}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
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
      <circle cx={cx - 9} cy={headY + 1.5} r={1.8} fill={outline} />
      <path
        d={`M${cx - 11} ${headY - 0.5} L${cx - 10} ${headY - 1.5} L${cx - 9} ${headY - 0.5} L${cx - 10} ${headY + 0.5} Z`}
        fill="#ffffff"
      />

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
        d={`M${cx + 9} ${headY - 0.5} L${cx + 10} ${headY - 1.5} L${cx + 11} ${headY - 0.5} L${cx + 10} ${headY + 0.5} Z`}
        fill="#ffffff"
      />
    </>
  );
}

function eyesRoundOpen({ cx, headY, outline, irisColor }: PortraitContext) {
  return (
    <>
      <ellipse cx={cx - 10} cy={headY + 1} rx={5.5} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx - 16} ${headY - 2} Q${cx - 10} ${headY - 6} ${cx - 4} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 15.5} ${headY + 4} Q${cx - 10} ${headY + 7} ${cx - 4.5} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={cx - 9} cy={headY + 1} r={3.5} fill={irisColor} />
      <circle cx={cx - 9} cy={headY + 1} r={3.5} fill="none" stroke={outline} strokeWidth="0.6" />
      <circle cx={cx - 9} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx - 11} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx - 7} cy={headY + 2.5} r={0.8} fill="#ffffff" opacity={0.6} />

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
      <circle cx={cx + 13} cy={headY + 2.5} r={0.8} fill="#ffffff" opacity={0.6} />
    </>
  );
}

function eyesSparkleOrnate({ cx, headY, outline, irisColor }: PortraitContext) {
  const irisOuter = irisColor;
  const irisMiddle = irisColor.replace(/^#[0-9a-f]{2}/i, (m) => {
    const v = Math.min(255, parseInt(m.slice(1), 16) + 30);
    return "#" + v.toString(16).padStart(2, "0");
  });
  return (
    <>
      <ellipse cx={cx - 10} cy={headY} rx={7} ry={9} fill="#f8f4ee" />
      <path
        d={`M${cx - 18} ${headY - 5} Q${cx - 14} ${headY - 12} ${cx - 10} ${headY - 11} Q${cx - 6} ${headY - 10} ${cx - 3} ${headY - 5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {[cx - 17, cx - 15, cx - 12, cx - 8, cx - 5].map((x, i) => (
        <line
          key={`ll${i}`}
          x1={x}
          y1={headY - 6 - i * 0.8}
          x2={x - (i < 2 ? 2 : i < 4 ? 1 : -1.5)}
          y2={headY - 9 - i * 0.6}
          stroke={outline}
          strokeWidth={i < 2 ? "0.8" : "0.7"}
          strokeLinecap="round"
        />
      ))}
      <path
        d={`M${cx - 17} ${headY + 4} Q${cx - 10} ${headY + 9.5} ${cx - 3} ${headY + 3}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9} cy={headY + 1} rx={5.5} ry={7} fill={irisOuter} />
      <ellipse cx={cx - 9} cy={headY + 1} rx={4.5} ry={6} fill={irisColor} />
      <ellipse cx={cx - 9} cy={headY + 2} rx={3.2} ry={4.5} fill={irisMiddle} />
      <ellipse cx={cx - 9} cy={headY + 1.5} rx={1.8} ry={3} fill={outline} />
      <circle cx={cx - 12} cy={headY - 2} r={2.2} fill="#ffffff" />
      <circle cx={cx - 6} cy={headY + 4} r={1.4} fill="#ffffff" opacity={0.8} />
      <circle cx={cx - 12.5} cy={headY + 3} r={0.7} fill="#ffffff" opacity={0.7} />
      <path
        d={`M${cx - 5.5} ${headY - 3} L${cx - 5} ${headY - 4.2} L${cx - 4.5} ${headY - 3} L${cx - 5} ${headY - 1.8} Z`}
        fill="#ffffff"
        opacity={0.9}
      />

      <ellipse cx={cx + 10} cy={headY} rx={7} ry={9} fill="#f8f4ee" />
      <path
        d={`M${cx + 3} ${headY - 5} Q${cx + 6} ${headY - 10} ${cx + 10} ${headY - 11} Q${cx + 14} ${headY - 12} ${cx + 18} ${headY - 5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      {[cx + 17, cx + 15, cx + 12, cx + 8, cx + 5].map((x, i) => (
        <line
          key={`rl${i}`}
          x1={x}
          y1={headY - 6 - i * 0.8}
          x2={x + (i < 2 ? 2 : i < 4 ? 1 : -1.5)}
          y2={headY - 9 - i * 0.6}
          stroke={outline}
          strokeWidth={i < 2 ? "0.8" : "0.7"}
          strokeLinecap="round"
        />
      ))}
      <path
        d={`M${cx + 3} ${headY + 3} Q${cx + 10} ${headY + 9.5} ${cx + 17} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 1} rx={5.5} ry={7} fill={irisOuter} />
      <ellipse cx={cx + 11} cy={headY + 1} rx={4.5} ry={6} fill={irisColor} />
      <ellipse cx={cx + 11} cy={headY + 2} rx={3.2} ry={4.5} fill={irisMiddle} />
      <ellipse cx={cx + 11} cy={headY + 1.5} rx={1.8} ry={3} fill={outline} />
      <circle cx={cx + 8} cy={headY - 2} r={2.2} fill="#ffffff" />
      <circle cx={cx + 14} cy={headY + 4} r={1.4} fill="#ffffff" opacity={0.8} />
      <circle cx={cx + 7.5} cy={headY + 3} r={0.7} fill="#ffffff" opacity={0.7} />
      <path
        d={`M${cx + 15.5} ${headY - 3} L${cx + 15} ${headY - 4.2} L${cx + 14.5} ${headY - 3} L${cx + 15} ${headY - 1.8} Z`}
        fill="#ffffff"
        opacity={0.9}
      />
    </>
  );
}

function eyesSharpElegant({ cx, headY, outline, irisColor }: PortraitContext) {
  return (
    <>
      <ellipse cx={cx - 10} cy={headY} rx={7} ry={6} fill="#f8f4ee" />
      <path
        d={`M${cx - 18} ${headY - 2} Q${cx - 14} ${headY - 8} ${cx - 10} ${headY - 7} Q${cx - 6} ${headY - 6.5} ${cx - 3} ${headY - 3} L${cx - 2} ${headY - 5}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
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
      <path
        d={`M${cx - 17} ${headY + 2} Q${cx - 10} ${headY + 6.5} ${cx - 3} ${headY + 1} L${cx - 2} ${headY - 0.5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9} cy={headY + 0.5} rx={4.5} ry={5} fill={irisColor} />
      <ellipse cx={cx - 9} cy={headY + 0.5} rx={2} ry={2.5} fill={outline} />
      <circle cx={cx - 12} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx - 7} cy={headY + 2.5} r={1.0} fill="#ffffff" opacity={0.8} />

      <ellipse cx={cx + 10} cy={headY} rx={7} ry={6} fill="#f8f4ee" />
      <path
        d={`M${cx + 18} ${headY - 2} Q${cx + 14} ${headY - 8} ${cx + 10} ${headY - 7} Q${cx + 6} ${headY - 6.5} ${cx + 3} ${headY - 3} L${cx + 2} ${headY - 5}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
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
        d={`M${cx + 17} ${headY + 2} Q${cx + 10} ${headY + 6.5} ${cx + 3} ${headY + 1} L${cx + 2} ${headY - 0.5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 0.5} rx={4.5} ry={5} fill={irisColor} />
      <ellipse cx={cx + 11} cy={headY + 0.5} rx={2} ry={2.5} fill={outline} />
      <circle cx={cx + 8} cy={headY - 2} r={1.8} fill="#ffffff" />
      <circle cx={cx + 13} cy={headY + 2.5} r={1.0} fill="#ffffff" opacity={0.8} />
    </>
  );
}

function eyesWarmRound({ cx, headY, outline, irisColor }: PortraitContext) {
  const irisMiddle = irisColor;
  return (
    <>
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={6} fill="#f8f4ee" />
      <path
        d={`M${cx - 16.5} ${headY - 2} Q${cx - 10} ${headY - 8} ${cx - 3.5} ${headY - 2}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 16} ${headY + 5} Q${cx - 10} ${headY + 8} ${cx - 4} ${headY + 5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <ellipse cx={cx - 9} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      <circle cx={cx - 9} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx - 11.5} cy={headY - 1} r={1.8} fill="#ffffff" />
      <circle cx={cx - 7} cy={headY + 3} r={1.0} fill="#ffffff" opacity={0.7} />

      <ellipse cx={cx + 10} cy={headY + 1} rx={6} ry={6} fill="#f8f4ee" />
      <path
        d={`M${cx + 3.5} ${headY - 2} Q${cx + 10} ${headY - 8} ${cx + 16.5} ${headY - 2}`}
        stroke={outline}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY + 5} Q${cx + 10} ${headY + 8} ${cx + 16} ${headY + 5}`}
        stroke={outline}
        strokeWidth="0.7"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx + 11} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <ellipse cx={cx + 11} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      <circle cx={cx + 11} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx + 8.5} cy={headY - 1} r={1.8} fill="#ffffff" />
      <circle cx={cx + 13} cy={headY + 3} r={1.0} fill="#ffffff" opacity={0.7} />
    </>
  );
}

function eyesBalancedAlmond({ cx, headY, outline, irisColor }: PortraitContext) {
  const irisMiddle = irisColor;
  return (
    <>
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx - 16.5} ${headY - 2} Q${cx - 10} ${headY - 7} ${cx - 3.5} ${headY - 2}`}
        stroke={outline}
        strokeWidth="2.0"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 16} ${headY + 4} Q${cx - 10} ${headY + 7} ${cx - 4} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9.5} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <ellipse cx={cx - 9.5} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      <circle cx={cx - 9.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx - 11.5} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx - 7.5} cy={headY + 3} r={0.8} fill="#ffffff" opacity={0.6} />

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
      <ellipse cx={cx + 10.5} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <ellipse cx={cx + 10.5} cy={headY + 1.5} rx={3} ry={3.5} fill={irisMiddle} />
      <circle cx={cx + 10.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <circle cx={cx + 8.5} cy={headY - 0.5} r={1.5} fill="#ffffff" />
      <circle cx={cx + 12.5} cy={headY + 3} r={0.8} fill="#ffffff" opacity={0.6} />
    </>
  );
}

function eyesAngularSharp({ cx, headY, outline, irisColor, p }: PortraitContext) {
  return (
    <>
      <ellipse cx={cx - 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx - 16.5} ${headY - 1} Q${cx - 10} ${headY - 7} ${cx - 3} ${headY - 2.5}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 15.5} ${headY - 0.5} Q${cx - 10} ${headY - 6} ${cx - 4} ${headY - 2}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 16} ${headY + 4} L${cx - 4} ${headY + 4}`}
        stroke={outline}
        strokeWidth="0.6"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx={cx - 9.5} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <circle cx={cx - 9.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <path
        d={`M${cx - 12} ${headY - 1} L${cx - 11.5} ${headY - 2.2} L${cx - 11} ${headY - 1} L${cx - 11.5} ${headY + 0.2} Z`}
        fill="#ffffff"
      />
      <circle cx={cx - 7.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />

      <ellipse cx={cx + 10} cy={headY + 1} rx={6} ry={5} fill="#f0ece4" />
      <path
        d={`M${cx + 3} ${headY - 2.5} Q${cx + 10} ${headY - 7} ${cx + 16.5} ${headY - 1}`}
        stroke={outline}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx + 4} ${headY - 2} Q${cx + 10} ${headY - 6} ${cx + 15.5} ${headY - 0.5}`}
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
      <ellipse cx={cx + 10.5} cy={headY + 1} rx={4} ry={4.5} fill={irisColor} />
      <circle cx={cx + 10.5} cy={headY + 1.5} r={1.8} fill={outline} />
      <path
        d={`M${cx + 12} ${headY - 1} L${cx + 11.5} ${headY - 2.2} L${cx + 11} ${headY - 1} L${cx + 11.5} ${headY + 0.2} Z`}
        fill="#ffffff"
      />
      <circle cx={cx + 12.5} cy={headY + 2.5} r={0.7} fill="#ffffff" opacity={0.6} />
    </>
  );
}

// ── Cel-shading helpers ───────────────────────────────────────────────────

/** Resolve hair cel-shading colors from palette, falling back to derived tones. */
function celColors(p: { hair: string; hairHighlight?: string; hairShadow?: string }) {
  const hi = p.hairHighlight ?? lightenHex(p.hair, 40);
  const sh = p.hairShadow ?? darkenHex(p.hair, 30);
  return { hi, sh };
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HAIR STYLES — each with back and front renderers
// ═══════════════════════════════════════════════════════════════════════════

const hairSweptBangs: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 5} ${headY - 2} Q${cx - hr - 8} ${headY - hr - 4} ${cx - hr + 2} ${headY - hr - 10} Q${cx - 4} ${headY - hr - 16} ${cx + 4} ${headY - hr - 14} Q${cx + hr - 2} ${headY - hr - 12} ${cx + hr + 4} ${headY - hr - 6} Q${cx + hr + 8} ${headY - hr + 2} ${cx + hr + 6} ${headY + 2} L${cx + hr + 4} ${headY + hr * 0.7} L${cx - hr - 4} ${headY + hr * 0.7} Q${cx - hr - 8} ${headY + 2} ${cx - hr - 5} ${headY - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel shadow on back volume */}
        <path
          d={`M${cx - hr - 4} ${headY + hr * 0.7} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 4} ${headY - 2} Q${cx - hr - 2} ${headY + 4} ${cx - hr + 4} ${headY + hr * 0.4} Z`}
          fill={sh}
          opacity={0.35}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 3} ${headY - hr + 2} Q${cx - hr + 2} ${headY - hr - 6} ${cx - hr + 8} ${headY - 6} L${cx - hr + 6} ${headY - hr - 2} Q${cx - 4} ${headY - hr - 8} ${cx} ${headY - 8} L${cx - 2} ${headY - hr - 4} Q${cx + 6} ${headY - hr - 10} ${cx + hr - 4} ${headY - 6} L${cx + hr - 6} ${headY - hr} Q${cx + hr + 2} ${headY - hr - 4} ${cx + hr + 4} ${headY - hr + 4} Q${cx} ${headY - hr - 12} ${cx - hr - 3} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight streak */}
        <path
          d={`M${cx - 2} ${headY - hr - 3} Q${cx + 4} ${headY - hr - 6} ${cx + hr - 6} ${headY - 5}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
        {/* Cel shadow under bangs */}
        <path
          d={`M${cx - hr + 8} ${headY - 6} Q${cx - 4} ${headY - 4} ${cx} ${headY - 8} Q${cx + 4} ${headY - 4} ${cx + hr - 4} ${headY - 6}`}
          fill={sh}
          opacity={0.3}
        />
        <path
          d={`M${cx - 4} ${headY - hr - 2} Q${cx - 6} ${headY - 6} ${cx - 8} ${headY + 1}`}
          stroke={p.hair}
          strokeWidth="2.0"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairWildSpikes: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 6} ${headY + 2} L${cx - hr - 4} ${headY - hr + 2} L${cx - hr - 10} ${headY - hr - 8} L${cx - hr + 2} ${headY - hr - 4} L${cx - hr + 6} ${headY - hr - 14} L${cx - 4} ${headY - hr - 8} L${cx} ${headY - hr - 18} L${cx + 4} ${headY - hr - 10} L${cx + hr - 6} ${headY - hr - 16} L${cx + hr - 2} ${headY - hr - 4} L${cx + hr + 8} ${headY - hr - 10} L${cx + hr + 4} ${headY - hr + 2} L${cx + hr + 6} ${headY + 2} L${cx + hr + 4} ${headY + hr * 0.7} L${cx - hr - 4} ${headY + hr * 0.7} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr - 4} ${headY + hr * 0.7} L${cx - hr - 6} ${headY + 2} L${cx - hr - 4} ${headY - hr + 2} L${cx - hr + 2} ${headY + hr * 0.3} Z`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - 6} ${headY - hr + 2} L${cx} ${headY - hr - 12} L${cx + 6} ${headY - hr + 2} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr + 2} ${headY - hr + 6} L${cx - hr - 4} ${headY - hr - 8} L${cx - 4} ${headY - hr + 2} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr + 6} ${headY - hr + 4} L${cx - 8} ${headY - hr - 6} L${cx - 2} ${headY - hr + 2} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + 4} ${headY - hr + 2} L${cx + hr + 2} ${headY - hr - 10} L${cx + hr - 2} ${headY - hr + 6} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + 2} ${headY - hr + 2} L${cx + 8} ${headY - hr - 8} L${cx + hr - 6} ${headY - hr + 4} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx - hr + 4} ${headY - 8} ${cx - 4} ${headY - 6} Q${cx} ${headY - 8} ${cx + 4} ${headY - 6} Q${cx + hr - 4} ${headY - 8} ${cx + hr + 2} ${headY - hr + 4} Q${cx} ${headY - hr - 2} ${cx - hr - 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on center spike */}
        <path
          d={`M${cx - 2} ${headY - hr} L${cx} ${headY - hr - 8} L${cx + 2} ${headY - hr}`}
          fill={hi}
          opacity={0.45}
        />
        {/* Cel shadow under spike bases */}
        <path
          d={`M${cx - hr + 4} ${headY - 6} Q${cx - 2} ${headY - 4} ${cx + 4} ${headY - 6}`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
};

const hairUndercut: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - 4} ${headY - hr + 2} Q${cx - 2} ${headY - hr - 8} ${cx + 4} ${headY - hr - 12} Q${cx + hr - 4} ${headY - hr - 10} ${cx + hr + 2} ${headY - hr - 4} Q${cx + hr + 6} ${headY - hr + 4} ${cx + hr + 4} ${headY + 2} L${cx + hr + 4} ${headY + hr * 0.4} L${cx + hr} ${headY + hr * 0.4} Q${cx + hr + 2} ${headY - hr} ${cx + hr - 2} ${headY - hr - 2} Q${cx + 4} ${headY - hr - 6} ${cx - 4} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + hr + 2} ${headY} Q${cx + hr + 4} ${headY - hr + 4} ${cx + hr + 3} ${headY + hr * 0.3}`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - 4} ${headY - hr + 2} Q${cx - 2} ${headY - hr - 4} ${cx + 4} ${headY - hr - 8} Q${cx + hr - 4} ${headY - hr - 6} ${cx + hr} ${headY - hr - 2} Q${cx + hr + 4} ${headY - hr + 2} ${cx + hr + 4} ${headY - 2} L${cx + hr + 2} ${headY - hr + 4} Q${cx + 4} ${headY - hr - 4} ${cx - 4} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight sweep */}
        <path
          d={`M${cx + 2} ${headY - hr - 4} Q${cx + hr - 6} ${headY - hr - 4} ${cx + hr + 2} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Buzzed sides */}
        {[-6, -8, -2, 1, 3, -4, 5, 3].map((dy, i) => (
          <line
            key={`bz${i}`}
            x1={cx - hr + (i % 4) + 1}
            y1={headY + dy}
            x2={cx - hr + (i % 4) + 1}
            y2={headY + dy + 2}
            stroke={p.hair}
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}
        <path
          d={`M${cx + 2} ${headY - hr} Q${cx - 2} ${headY - 6} ${cx - 4} ${headY + 2}`}
          stroke={p.hair}
          strokeWidth="2.0"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairFlowingLong: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 4} ${headY - 4} Q${cx - hr - 8} ${headY - hr} ${cx - hr + 2} ${headY - hr - 12} Q${cx - 6} ${headY - hr - 18} ${cx + 4} ${headY - hr - 16} Q${cx + hr - 2} ${headY - hr - 14} ${cx + hr + 6} ${headY - hr - 4} Q${cx + hr + 10} ${headY - 4} ${cx + hr + 8} ${headY + 8} Q${cx + hr + 10} ${headY + hr + 10} ${cx + hr + 6} ${headY + hr + 20} Q${cx + hr + 4} ${headY + hr + 30} ${cx + hr} ${headY + hr + 40} L${cx - hr - 2} ${headY + hr + 36} Q${cx - hr - 6} ${headY + hr + 26} ${cx - hr - 8} ${headY + hr + 14} Q${cx - hr - 10} ${headY + 6} ${cx - hr - 4} ${headY - 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight curves */}
        <path
          d={`M${cx + hr + 4} ${headY} Q${cx + hr + 8} ${headY + 16} ${cx + hr + 5} ${headY + hr + 16}`}
          stroke={hi}
          strokeWidth="2.0"
          fill="none"
          opacity={0.4}
          strokeLinecap="round"
        />
        <path
          d={`M${cx - hr - 2} ${headY + 2} Q${cx - hr - 6} ${headY + 18} ${cx - hr - 4} ${headY + hr + 18}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          opacity={0.35}
          strokeLinecap="round"
        />
        {/* Cel shadow on back mass */}
        <path
          d={`M${cx - hr - 4} ${headY - 4} Q${cx - hr - 8} ${headY + 6} ${cx - hr - 6} ${headY + hr + 14} L${cx - hr - 2} ${headY + hr + 36} L${cx - hr + 6} ${headY + hr + 30} Q${cx - hr - 2} ${headY + hr + 10} ${cx - hr} ${headY + 2} Z`}
          fill={sh}
          opacity={0.25}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx - hr + 4} ${headY - hr - 6} ${cx - hr + 10} ${headY - 2} Q${cx - hr + 8} ${headY - hr} ${cx - 6} ${headY - 6} Q${cx - 4} ${headY - hr - 2} ${cx + 2} ${headY - 4} Q${cx + 4} ${headY - hr + 2} ${cx + 8} ${headY - 6} Q${cx + hr - 6} ${headY - hr - 4} ${cx + hr - 2} ${headY - 4} Q${cx + hr} ${headY - hr} ${cx + hr + 2} ${headY - hr + 6} Q${cx} ${headY - hr - 14} ${cx - hr - 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on bangs */}
        <path
          d={`M${cx - 4} ${headY - hr} Q${cx + 2} ${headY - hr - 6} ${cx + 8} ${headY - 5}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Side locks */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 6} Q${cx - hr - 4} ${headY + 4} ${cx - hr + 2} ${headY + hr + 10} Q${cx - hr} ${headY + hr + 18} ${cx - hr + 4} ${headY + hr + 28}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        {/* Cel shadow on left lock */}
        <path
          d={`M${cx - hr - 2} ${headY + 4} Q${cx - hr - 2} ${headY + hr + 6} ${cx - hr + 2} ${headY + hr + 16}`}
          stroke={sh}
          strokeWidth="2.5"
          fill="none"
          opacity={0.25}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + hr + 2} ${headY - hr + 6} Q${cx + hr + 4} ${headY + 4} ${cx + hr - 2} ${headY + hr + 10} Q${cx + hr} ${headY + hr + 18} ${cx + hr - 4} ${headY + hr + 28}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        {/* Cel highlight on right lock */}
        <path
          d={`M${cx + hr + 2} ${headY + 2} Q${cx + hr + 2} ${headY + hr + 4} ${cx + hr - 2} ${headY + hr + 14}`}
          stroke={hi}
          strokeWidth="1.4"
          fill="none"
          opacity={0.4}
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairGeometricBob: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 4} ${headY - hr + 2} Q${cx - hr - 6} ${headY - hr - 8} ${cx} ${headY - hr - 14} Q${cx + hr + 6} ${headY - hr - 8} ${cx + hr + 4} ${headY - hr + 2} Q${cx + hr + 8} ${headY - 2} ${cx + hr + 6} ${headY + 10} Q${cx + hr + 4} ${headY + hr - 2} ${cx + hr + 2} ${headY + hr + 4} L${cx - hr - 2} ${headY + hr + 4} Q${cx - hr - 4} ${headY + hr - 2} ${cx - hr - 6} ${headY + 10} Q${cx - hr - 8} ${headY - 2} ${cx - hr - 4} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel shadow on back */}
        <path
          d={`M${cx - hr - 4} ${headY + hr + 4} Q${cx - hr - 6} ${headY + hr - 2} ${cx - hr - 6} ${headY + 10} Q${cx - hr - 4} ${headY + 4} ${cx - hr + 4} ${headY + hr + 4} Z`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Thick straight bangs */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx} ${headY - hr - 10} ${cx + hr + 2} ${headY - hr + 4} L${cx + hr} ${headY - 4} Q${cx} ${headY - 2} ${cx - hr} ${headY - 4} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight band */}
        <path
          d={`M${cx - hr + 4} ${headY - hr + 2} Q${cx} ${headY - hr - 4} ${cx + hr - 4} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          opacity={0.45}
        />
        {/* Cel shadow under bangs */}
        <path
          d={`M${cx - hr} ${headY - 4} Q${cx} ${headY - 2} ${cx + hr} ${headY - 4} L${cx + hr - 2} ${headY - 6} Q${cx} ${headY - 4} ${cx - hr + 2} ${headY - 6} Z`}
          fill={sh}
          opacity={0.3}
        />
        {/* Section lines */}
        <line
          x1={cx - 6}
          y1={headY - hr + 2}
          x2={cx - 8}
          y2={headY - 4}
          stroke={outline}
          strokeWidth="0.5"
          opacity={0.3}
        />
        <line
          x1={cx + 6}
          y1={headY - hr + 2}
          x2={cx + 8}
          y2={headY - 4}
          stroke={outline}
          strokeWidth="0.5"
          opacity={0.3}
        />
      </>
    );
  },
};

const hairHighPonytail: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Ponytail flowing from crown */}
        <path
          d={`M${cx - 4} ${headY - hr - 6} Q${cx + 8} ${headY - hr - 12} ${cx + hr + 4} ${headY - hr - 2} Q${cx + hr + 8} ${headY - hr + 8} ${cx + hr + 6} ${headY + 4} Q${cx + hr + 8} ${headY + hr + 6} ${cx + hr + 4} ${headY + hr + 18} Q${cx + hr + 2} ${headY + hr + 26} ${cx + hr - 2} ${headY + hr + 32} L${cx + hr - 6} ${headY + hr + 20} Q${cx + hr} ${headY + 8} ${cx + hr - 2} ${headY - 2} Q${cx + hr + 2} ${headY - hr + 2} ${cx + hr} ${headY - hr - 4} Q${cx + 4} ${headY - hr - 10} ${cx - 4} ${headY - hr - 6}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on ponytail */}
        <path
          d={`M${cx + hr + 2} ${headY + 2} Q${cx + hr + 6} ${headY + 14} ${cx + hr + 3} ${headY + hr + 14}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          opacity={0.45}
          strokeLinecap="round"
        />
        {/* Cel shadow inner edge */}
        <path
          d={`M${cx + hr - 2} ${headY - 2} Q${cx + hr} ${headY + 8} ${cx + hr - 6} ${headY + hr + 20}`}
          stroke={sh}
          strokeWidth="2.5"
          fill="none"
          opacity={0.25}
          strokeLinecap="round"
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi } = celColors(p);
    return (
      <>
        {/* Pulled-back hair with clean hairline */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 6} Q${cx - hr} ${headY - hr - 2} ${cx} ${headY - hr - 8} Q${cx + hr} ${headY - hr - 2} ${cx + hr + 2} ${headY - hr + 6} Q${cx} ${headY - hr - 4} ${cx - hr - 2} ${headY - hr + 6}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on crown */}
        <path
          d={`M${cx - 6} ${headY - hr + 2} Q${cx} ${headY - hr - 4} ${cx + 6} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Wispy temple strands */}
        <path
          d={`M${cx - hr + 2} ${headY - hr + 4} Q${cx - hr - 2} ${headY - 2} ${cx - hr} ${headY + 4}`}
          stroke={p.hair}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + hr - 2} ${headY - hr + 4} Q${cx + hr + 2} ${headY - 2} ${cx + hr} ${headY + 4}`}
          stroke={p.hair}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairTousled: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 6} ${headY - 2} Q${cx - hr - 8} ${headY - hr - 6} ${cx - hr + 2} ${headY - hr - 10} Q${cx - 4} ${headY - hr - 14} ${cx + 6} ${headY - hr - 12} Q${cx + hr} ${headY - hr - 8} ${cx + hr + 6} ${headY - hr - 2} Q${cx + hr + 8} ${headY + 2} ${cx + hr + 6} ${headY + 6} L${cx + hr + 4} ${headY + hr * 0.6} L${cx - hr - 4} ${headY + hr * 0.6} Q${cx - hr - 8} ${headY + 2} ${cx - hr - 6} ${headY - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr - 4} ${headY + hr * 0.6} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 4} ${headY - 2} L${cx - hr + 2} ${headY + hr * 0.4} Z`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr - 4} ${headY - hr + 4} Q${cx - hr + 2} ${headY - hr - 4} ${cx - hr + 8} ${headY - 4} L${cx - hr + 6} ${headY - hr} Q${cx - 6} ${headY - hr - 6} ${cx - 2} ${headY - 6} L${cx - 4} ${headY - hr - 2} Q${cx + 4} ${headY - hr - 8} ${cx + 8} ${headY - 5} L${cx + hr - 8} ${headY - hr + 2} Q${cx + hr - 2} ${headY - hr - 4} ${cx + hr + 2} ${headY - hr + 2} Q${cx + hr + 4} ${headY - hr - 2} ${cx + hr + 4} ${headY - hr + 4} Q${cx} ${headY - hr - 12} ${cx - hr - 4} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on messy top */}
        <path
          d={`M${cx - 4} ${headY - hr - 1} Q${cx + 2} ${headY - hr - 6} ${cx + 8} ${headY - 4}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Tousled strands across brow */}
        <path
          d={`M${cx - 6} ${headY - hr} Q${cx - 8} ${headY - 6} ${cx - 10} ${headY + 1}`}
          stroke={p.hair}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - 2} ${headY - hr + 2} Q${cx - 3} ${headY - 8} ${cx - 4} ${headY - 3}`}
          stroke={p.hair}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + 4} ${headY - hr - 2} Q${cx + 2} ${headY - 6} ${cx + 1} ${headY - 2}`}
          stroke={p.hair}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        {/* Side hair covering ears */}
        <path
          d={`M${cx - hr - 4} ${headY - hr + 6} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 2} ${headY + hr - 4} Q${cx - hr} ${headY + hr + 2} ${cx - hr + 2} ${headY + hr + 4}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + hr + 4} ${headY - hr + 6} Q${cx + hr + 6} ${headY + 2} ${cx + hr + 2} ${headY + hr - 4} Q${cx + hr} ${headY + hr + 2} ${cx + hr - 2} ${headY + hr + 4}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
      </>
    );
  },
};

const hairSideshave: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        <path
          d={`M${cx - hr + 2} ${headY - hr + 2} Q${cx} ${headY - hr - 8} ${cx + hr - 2} ${headY - hr - 4} Q${cx + hr + 6} ${headY - hr + 2} ${cx + hr + 8} ${headY + 2} Q${cx + hr + 10} ${headY + hr} ${cx + hr + 6} ${headY + hr + 14} Q${cx + hr + 4} ${headY + hr + 22} ${cx + hr} ${headY + hr + 30} L${cx + hr - 4} ${headY + hr + 6} L${cx - hr + 2} ${headY + hr * 0.5} Q${cx - hr - 2} ${headY} ${cx - hr + 2} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + hr + 4} ${headY + 4} Q${cx + hr + 8} ${headY + 16} ${cx + hr + 5} ${headY + hr + 14}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          opacity={0.4}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + hr - 4} ${headY + hr + 6} L${cx - hr + 2} ${headY + hr * 0.5} Q${cx - hr} ${headY + 2} ${cx - hr + 2} ${headY} L${cx + hr - 2} ${headY + hr * 0.4} Z`}
          fill={sh}
          opacity={0.25}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi } = celColors(p);
    return (
      <>
        {/* Left side buzzed stubble */}
        {[
          [hr - 1, -6, -4],
          [hr - 3, -8, -6],
          [hr, -2, 0],
          [hr - 2, 1, 3],
          [hr + 1, 3, 5],
          [hr - 4, -4, -2],
          [hr - 1, 5, 7],
          [hr - 3, 3, 5],
        ].map(([xo, y1o, y2o], i) => (
          <line
            key={`s${i}`}
            x1={cx - xo}
            y1={headY + y1o}
            x2={cx - xo}
            y2={headY + y2o}
            stroke={p.hair}
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        ))}
        {/* Top sweeping right */}
        <path
          d={`M${cx - 4} ${headY - hr - 2} Q${cx - 8} ${headY - hr - 6} ${cx} ${headY - hr - 10} Q${cx + 8} ${headY - hr - 8} ${cx + hr} ${headY - hr - 2} Q${cx + hr + 4} ${headY - hr + 4} ${cx + hr + 6} ${headY - 2} Q${cx + hr + 4} ${headY - hr + 2} ${cx + hr + 2} ${headY - hr + 4} Q${cx + 6} ${headY - hr - 6} ${cx - 4} ${headY - hr - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on sweep */}
        <path
          d={`M${cx} ${headY - hr - 6} Q${cx + 6} ${headY - hr - 6} ${cx + hr} ${headY - hr}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Long flowing right sections */}
        <path
          d={`M${cx + hr + 2} ${headY - hr + 4} Q${cx + hr + 6} ${headY} ${cx + hr + 4} ${headY + hr} Q${cx + hr + 2} ${headY + hr + 10} ${cx + hr - 2} ${headY + hr + 20} L${cx + hr - 4} ${headY + hr + 6} Q${cx + hr} ${headY + 4} ${cx + hr + 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + hr + 4} ${headY + 2} Q${cx + hr + 8} ${headY + hr + 4} ${cx + hr + 4} ${headY + hr + 18} Q${cx + hr + 2} ${headY + hr + 26} ${cx + hr - 2} ${headY + hr + 30} L${cx + hr} ${headY + hr + 20} Q${cx + hr + 4} ${headY + hr + 8} ${cx + hr + 4} ${headY + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - 6} ${headY - hr + 2} Q${cx} ${headY - hr - 2} ${cx + 6} ${headY - 6}`}
          stroke={p.hair}
          strokeWidth="2.0"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NEW HAIR STYLES — MapleStory-inspired variety with cel shading
// ═══════════════════════════════════════════════════════════════════════════

const hairTwinTails: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Left tail */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 2} Q${cx - hr - 8} ${headY - hr - 4} ${cx - hr - 4} ${headY - 4} Q${cx - hr - 10} ${headY + 6} ${cx - hr - 8} ${headY + hr + 8} Q${cx - hr - 6} ${headY + hr + 20} ${cx - hr - 2} ${headY + hr + 34} Q${cx - hr} ${headY + hr + 38} ${cx - hr + 4} ${headY + hr + 36} L${cx - hr + 2} ${headY + hr + 20} Q${cx - hr - 2} ${headY + hr + 8} ${cx - hr} ${headY + 2} Q${cx - hr - 2} ${headY - hr + 4} ${cx - hr - 2} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Right tail */}
        <path
          d={`M${cx + hr + 2} ${headY - hr + 2} Q${cx + hr + 8} ${headY - hr - 4} ${cx + hr + 4} ${headY - 4} Q${cx + hr + 10} ${headY + 6} ${cx + hr + 8} ${headY + hr + 8} Q${cx + hr + 6} ${headY + hr + 20} ${cx + hr + 2} ${headY + hr + 34} Q${cx + hr} ${headY + hr + 38} ${cx + hr - 4} ${headY + hr + 36} L${cx + hr - 2} ${headY + hr + 20} Q${cx + hr + 2} ${headY + hr + 8} ${cx + hr} ${headY + 2} Q${cx + hr + 2} ${headY - hr + 4} ${cx + hr + 2} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlights on tails */}
        <path
          d={`M${cx - hr - 6} ${headY + 4} Q${cx - hr - 8} ${headY + hr + 10} ${cx - hr - 4} ${headY + hr + 24}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          opacity={0.45}
          strokeLinecap="round"
        />
        <path
          d={`M${cx + hr + 6} ${headY + 4} Q${cx + hr + 8} ${headY + hr + 10} ${cx + hr + 4} ${headY + hr + 24}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          opacity={0.45}
          strokeLinecap="round"
        />
        {/* Cel shadows inner tails */}
        <path
          d={`M${cx - hr} ${headY + 2} Q${cx - hr - 2} ${headY + hr + 8} ${cx - hr + 2} ${headY + hr + 20}`}
          stroke={sh}
          strokeWidth="2.2"
          fill="none"
          opacity={0.25}
          strokeLinecap="round"
        />
        {/* Top crown connector */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 2} Q${cx} ${headY - hr - 12} ${cx + hr + 2} ${headY - hr + 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Crown bangs */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx - hr + 4} ${headY - hr - 4} ${cx - 6} ${headY - 6} Q${cx - 2} ${headY - hr - 2} ${cx + 2} ${headY - 6} Q${cx + hr - 4} ${headY - hr - 4} ${cx + hr + 2} ${headY - hr + 4} Q${cx} ${headY - hr - 10} ${cx - hr - 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Hair ties (small circles) */}
        <ellipse
          cx={cx - hr - 1}
          cy={headY - hr + 4}
          rx={3}
          ry={2.5}
          fill={p.accent}
          stroke={outline}
          strokeWidth="0.8"
        />
        <ellipse
          cx={cx + hr + 1}
          cy={headY - hr + 4}
          rx={3}
          ry={2.5}
          fill={p.accent}
          stroke={outline}
          strokeWidth="0.8"
        />
        {/* Cel highlight on bangs */}
        <path
          d={`M${cx - 6} ${headY - hr + 1} Q${cx} ${headY - hr - 4} ${cx + 6} ${headY - hr + 1}`}
          stroke={hi}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Cel shadow under bangs */}
        <path
          d={`M${cx - 6} ${headY - 6} Q${cx} ${headY - 4} ${cx + 2} ${headY - 6}`}
          fill={sh}
          opacity={0.25}
        />
      </>
    );
  },
};

const hairCurlyVoluminous: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Big voluminous curly mass */}
        <path
          d={`M${cx - hr - 10} ${headY - 4} Q${cx - hr - 14} ${headY - hr - 6} ${cx - hr - 4} ${headY - hr - 14} Q${cx - 4} ${headY - hr - 22} ${cx + 4} ${headY - hr - 20} Q${cx + hr + 4} ${headY - hr - 18} ${cx + hr + 10} ${headY - hr - 8} Q${cx + hr + 16} ${headY - 4} ${cx + hr + 12} ${headY + 10} Q${cx + hr + 14} ${headY + hr + 8} ${cx + hr + 10} ${headY + hr + 22} Q${cx + hr + 8} ${headY + hr + 32} ${cx + hr + 4} ${headY + hr + 36} L${cx - hr - 4} ${headY + hr + 32} Q${cx - hr - 10} ${headY + hr + 24} ${cx - hr - 12} ${headY + hr + 12} Q${cx - hr - 14} ${headY + 8} ${cx - hr - 10} ${headY - 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Curl texture on back */}
        {[
          [cx - hr - 6, headY + 4, 6],
          [cx + hr + 6, headY + 6, 5],
          [cx - hr - 4, headY + hr + 10, 5],
          [cx + hr + 4, headY + hr + 14, 4],
          [cx - hr, headY + hr + 24, 4],
          [cx + hr, headY + hr + 26, 3],
        ].map(([x, y, r], i) => (
          <path
            key={`bc${i}`}
            d={`M${x - r} ${y} Q${x - r} ${y - r * 1.2} ${x} ${y - r} Q${x + r} ${y - r * 0.8} ${x + r} ${y} Q${x + r} ${y + r * 1.2} ${x} ${y + r * 0.8}`}
            stroke={i % 2 === 0 ? hi : sh}
            strokeWidth="1.0"
            fill="none"
            opacity={i % 2 === 0 ? 0.35 : 0.25}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Voluminous bangs with curl shapes */}
        <path
          d={`M${cx - hr - 8} ${headY - hr + 6} Q${cx - hr - 4} ${headY - hr - 8} ${cx - hr + 4} ${headY - 4} Q${cx - hr + 2} ${headY - hr - 2} ${cx - 4} ${headY - 6} Q${cx - 2} ${headY - hr - 6} ${cx + 4} ${headY - 8} Q${cx + 6} ${headY - hr - 4} ${cx + hr - 4} ${headY - 4} Q${cx + hr} ${headY - hr - 6} ${cx + hr + 6} ${headY - hr + 4} Q${cx + hr + 8} ${headY - hr + 8} ${cx + hr + 8} ${headY - hr + 6} Q${cx + 4} ${headY - hr - 16} ${cx - hr - 8} ${headY - hr + 6}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Side curls left */}
        <path
          d={`M${cx - hr - 8} ${headY - hr + 8} Q${cx - hr - 12} ${headY + 2} ${cx - hr - 8} ${headY + hr} Q${cx - hr - 6} ${headY + hr + 8} ${cx - hr - 2} ${headY + hr + 14} Q${cx - hr} ${headY + hr + 10} ${cx - hr - 4} ${headY + hr + 4} Q${cx - hr - 8} ${headY + 4} ${cx - hr - 6} ${headY - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Side curls right */}
        <path
          d={`M${cx + hr + 8} ${headY - hr + 8} Q${cx + hr + 12} ${headY + 2} ${cx + hr + 8} ${headY + hr} Q${cx + hr + 6} ${headY + hr + 8} ${cx + hr + 2} ${headY + hr + 14} Q${cx + hr} ${headY + hr + 10} ${cx + hr + 4} ${headY + hr + 4} Q${cx + hr + 8} ${headY + 4} ${cx + hr + 6} ${headY - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight swoops on bangs */}
        <path
          d={`M${cx - 4} ${headY - hr} Q${cx + 2} ${headY - hr - 4} ${cx + hr - 4} ${headY - 3}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Cel shadow under curl volume */}
        <path
          d={`M${cx - hr - 6} ${headY + hr} Q${cx - hr - 4} ${headY + hr + 6} ${cx - hr - 2} ${headY + hr + 10}`}
          stroke={sh}
          strokeWidth="2.5"
          fill="none"
          opacity={0.25}
          strokeLinecap="round"
        />
        {/* Curl detail lines */}
        {[
          [cx - hr - 4, headY + 2, 4],
          [cx + hr + 4, headY + 4, 3],
          [cx - hr - 2, headY + hr + 2, 3],
          [cx + hr + 2, headY + hr + 4, 3],
        ].map(([x, y, r], i) => (
          <path
            key={`fc${i}`}
            d={`M${x - r} ${y} Q${x} ${y - r} ${x + r} ${y}`}
            stroke={i % 2 === 0 ? hi : outline}
            strokeWidth={i % 2 === 0 ? "1.0" : "0.5"}
            fill="none"
            opacity={i % 2 === 0 ? 0.4 : 0.2}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  },
};

const hairLongStraight: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Sleek straight curtain */}
        <path
          d={`M${cx - hr - 4} ${headY - 4} Q${cx - hr - 6} ${headY - hr - 4} ${cx - hr + 2} ${headY - hr - 10} Q${cx - 4} ${headY - hr - 16} ${cx + 4} ${headY - hr - 14} Q${cx + hr - 2} ${headY - hr - 12} ${cx + hr + 4} ${headY - hr - 4} Q${cx + hr + 8} ${headY - 2} ${cx + hr + 6} ${headY + 6} L${cx + hr + 6} ${headY + hr + 36} Q${cx + hr + 4} ${headY + hr + 44} ${cx + hr} ${headY + hr + 46} L${cx - hr} ${headY + hr + 44} Q${cx - hr - 4} ${headY + hr + 42} ${cx - hr - 6} ${headY + hr + 34} L${cx - hr - 6} ${headY + 4} Q${cx - hr - 8} ${headY - 2} ${cx - hr - 4} ${headY - 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Vertical strand lines for straight texture */}
        {[-4, 0, 4, 8].map((xo, i) => (
          <line
            key={`sv${i}`}
            x1={cx + hr + xo}
            y1={headY + 4}
            x2={cx + hr + xo - 1}
            y2={headY + hr + 36}
            stroke={i % 2 === 0 ? hi : sh}
            strokeWidth={i % 2 === 0 ? "1.0" : "0.8"}
            opacity={i % 2 === 0 ? 0.35 : 0.2}
            strokeLinecap="round"
          />
        ))}
        {[-8, -4, 0, 4].map((xo, i) => (
          <line
            key={`svl${i}`}
            x1={cx - hr + xo}
            y1={headY + 2}
            x2={cx - hr + xo + 1}
            y2={headY + hr + 34}
            stroke={i % 2 === 0 ? hi : sh}
            strokeWidth={i % 2 === 0 ? "0.8" : "0.7"}
            opacity={i % 2 === 0 ? 0.3 : 0.18}
            strokeLinecap="round"
          />
        ))}
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Flat hime cut bangs — perfectly straight */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx} ${headY - hr - 10} ${cx + hr + 2} ${headY - hr + 4} L${cx + hr} ${headY - 3} L${cx - hr} ${headY - 3} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Clean horizontal bang bottom */}
        <line
          x1={cx - hr}
          y1={headY - 3}
          x2={cx + hr}
          y2={headY - 3}
          stroke={outline}
          strokeWidth={ow * 0.6}
          strokeLinecap="round"
        />
        {/* Cel highlight band across bangs */}
        <path
          d={`M${cx - hr + 4} ${headY - hr + 2} Q${cx} ${headY - hr - 4} ${cx + hr - 4} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Cel shadow at bang edge */}
        <rect x={cx - hr} y={headY - 6} width={hr * 2} height={3} fill={sh} opacity={0.2} />
        {/* Section lines */}
        <line
          x1={cx - 8}
          y1={headY - hr + 2}
          x2={cx - 8}
          y2={headY - 3}
          stroke={outline}
          strokeWidth="0.4"
          opacity={0.25}
        />
        <line
          x1={cx}
          y1={headY - hr}
          x2={cx}
          y2={headY - 3}
          stroke={outline}
          strokeWidth="0.4"
          opacity={0.2}
        />
        <line
          x1={cx + 8}
          y1={headY - hr + 2}
          x2={cx + 8}
          y2={headY - 3}
          stroke={outline}
          strokeWidth="0.4"
          opacity={0.25}
        />
        {/* Side panels */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 6} L${cx - hr - 4} ${headY + 4} L${cx - hr - 4} ${headY + hr + 20} Q${cx - hr - 2} ${headY + hr + 28} ${cx - hr + 2} ${headY + hr + 30}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx + hr + 2} ${headY - hr + 6} L${cx + hr + 4} ${headY + 4} L${cx + hr + 4} ${headY + hr + 20} Q${cx + hr + 2} ${headY + hr + 28} ${cx + hr - 2} ${headY + hr + 30}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        {/* Cel highlights on side panels */}
        <line
          x1={cx + hr + 3}
          y1={headY + 2}
          x2={cx + hr + 3}
          y2={headY + hr + 16}
          stroke={hi}
          strokeWidth="1.2"
          opacity={0.4}
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairMessyBun: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Bun sphere on top of head */}
        <ellipse
          cx={cx + 2}
          cy={headY - hr - 12}
          rx={hr * 0.7}
          ry={hr * 0.65}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
        />
        {/* Cel shadow on bun */}
        <path
          d={`M${cx - hr * 0.4} ${headY - hr - 8} Q${cx} ${headY - hr - 6} ${cx + hr * 0.5} ${headY - hr - 10}`}
          fill={sh}
          opacity={0.3}
        />
        {/* Cel highlight on bun top */}
        <path
          d={`M${cx - 2} ${headY - hr - 16} Q${cx + 4} ${headY - hr - 18} ${cx + hr * 0.5} ${headY - hr - 14}`}
          stroke={hi}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Messy wrap lines */}
        <path
          d={`M${cx - hr * 0.5} ${headY - hr - 10} Q${cx} ${headY - hr - 16} ${cx + hr * 0.6} ${headY - hr - 10}`}
          stroke={outline}
          strokeWidth="0.6"
          fill="none"
          opacity={0.3}
        />
        <path
          d={`M${cx - hr * 0.3} ${headY - hr - 14} Q${cx + 4} ${headY - hr - 18} ${cx + hr * 0.5} ${headY - hr - 12}`}
          stroke={outline}
          strokeWidth="0.5"
          fill="none"
          opacity={0.25}
        />
        {/* Hair gathered at back of head */}
        <path
          d={`M${cx - hr - 2} ${headY - 2} Q${cx - hr - 4} ${headY - hr + 2} ${cx - 4} ${headY - hr - 4} L${cx + 4} ${headY - hr - 6} Q${cx + hr + 4} ${headY - hr + 2} ${cx + hr + 2} ${headY - 2} L${cx + hr + 2} ${headY + hr * 0.3} L${cx - hr - 2} ${headY + hr * 0.3} Z`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi } = celColors(p);
    return (
      <>
        {/* Pulled-back top with loose wispy bangs */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 6} Q${cx - hr} ${headY - hr - 2} ${cx} ${headY - hr - 6} Q${cx + hr} ${headY - hr - 2} ${cx + hr + 2} ${headY - hr + 6} Q${cx} ${headY - hr - 4} ${cx - hr - 2} ${headY - hr + 6}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on crown */}
        <path
          d={`M${cx - 4} ${headY - hr + 2} Q${cx} ${headY - hr - 3} ${cx + 4} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Loose wispy strands */}
        <path
          d={`M${cx - hr + 4} ${headY - hr + 2} Q${cx - hr} ${headY - 4} ${cx - hr + 2} ${headY + 6}`}
          stroke={p.hair}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + hr - 4} ${headY - hr + 2} Q${cx + hr} ${headY - 4} ${cx + hr - 2} ${headY + 6}`}
          stroke={p.hair}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - 2} ${headY - hr + 2} Q${cx - 4} ${headY - 6} ${cx - 6} ${headY + 2}`}
          stroke={p.hair}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + 6} ${headY - hr + 4} Q${cx + 4} ${headY - 4} ${cx + 8} ${headY + 4}`}
          stroke={p.hair}
          strokeWidth="1.0"
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  },
};

const hairBraidedSide: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Hair mass at back */}
        <path
          d={`M${cx - hr - 4} ${headY - 4} Q${cx - hr - 6} ${headY - hr - 4} ${cx - hr + 2} ${headY - hr - 10} Q${cx - 4} ${headY - hr - 14} ${cx + 4} ${headY - hr - 12} Q${cx + hr - 2} ${headY - hr - 10} ${cx + hr + 4} ${headY - hr - 2} Q${cx + hr + 6} ${headY + 2} ${cx + hr + 4} ${headY + 4} L${cx + hr + 4} ${headY + hr * 0.5} L${cx - hr - 4} ${headY + hr * 0.5} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 4} ${headY - 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel shadow on back */}
        <path
          d={`M${cx - hr - 4} ${headY + hr * 0.5} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 4} ${headY - 2} L${cx - hr + 2} ${headY + hr * 0.3} Z`}
          fill={sh}
          opacity={0.3}
        />
        {/* Cel highlight on crown */}
        <path
          d={`M${cx - 2} ${headY - hr - 8} Q${cx + 6} ${headY - hr - 10} ${cx + hr + 2} ${headY - hr}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.4}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Bangs parted to side */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx - hr + 4} ${headY - hr - 6} ${cx - 4} ${headY - 6} Q${cx - 2} ${headY - hr - 4} ${cx + 4} ${headY - 4} Q${cx + hr - 4} ${headY - hr - 2} ${cx + hr + 2} ${headY - hr + 4} Q${cx} ${headY - hr - 12} ${cx - hr - 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on side part */}
        <path
          d={`M${cx - 2} ${headY - hr - 2} Q${cx + 4} ${headY - hr - 6} ${cx + hr} ${headY - hr + 2}`}
          stroke={hi}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Braid over right shoulder — woven segments */}
        {[0, 8, 16, 24, 32, 40].map((dy, i) => {
          const y = headY + hr + 2 + dy;
          const bx = cx + hr + 2 - i * 0.3;
          const w = Math.max(3, 6 - i * 0.4);
          const isLeft = i % 2 === 0;
          return (
            <path
              key={`br${i}`}
              d={`M${bx - w} ${y} Q${bx + (isLeft ? -2 : 2)} ${y - 3} ${bx + w} ${y} Q${bx + (isLeft ? 2 : -2)} ${y + 3} ${bx - w} ${y + 6}`}
              fill={p.hair}
              stroke={outline}
              strokeWidth={ow * 0.6}
              strokeLinejoin="round"
            />
          );
        })}
        {/* Cel highlights on braid segments */}
        {[0, 16, 32].map((dy, i) => {
          const y = headY + hr + 3 + dy;
          const bx = cx + hr + 2 - (dy / 8) * 0.3;
          return (
            <path
              key={`brh${i}`}
              d={`M${bx - 2} ${y} Q${bx} ${y - 2} ${bx + 3} ${y}`}
              stroke={hi}
              strokeWidth="1.0"
              fill="none"
              opacity={0.4}
              strokeLinecap="round"
            />
          );
        })}
        {/* Braid tie at bottom */}
        <ellipse
          cx={cx + hr + 0.2}
          cy={headY + hr + 48}
          rx={3.5}
          ry={2}
          fill={p.accent}
          stroke={outline}
          strokeWidth="0.6"
        />
        {/* Side panel left */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 6} Q${cx - hr - 4} ${headY + 2} ${cx - hr} ${headY + 6}`}
          stroke={outline}
          strokeWidth={ow}
          fill={p.hair}
          strokeLinejoin="round"
        />
        {/* Cel shadow under side panel */}
        <path
          d={`M${cx - hr - 2} ${headY + 2} Q${cx - hr - 2} ${headY + 4} ${cx - hr} ${headY + 6}`}
          fill={sh}
          opacity={0.25}
        />
      </>
    );
  },
};

const hairAhogeShort: HairRenderers = {
  back: ({ cx, headY, hr, ow, outline, p }) => {
    const { sh } = celColors(p);
    return (
      <>
        {/* Short neat back hair */}
        <path
          d={`M${cx - hr - 4} ${headY - 2} Q${cx - hr - 6} ${headY - hr - 2} ${cx - hr + 2} ${headY - hr - 8} Q${cx - 2} ${headY - hr - 12} ${cx + 4} ${headY - hr - 10} Q${cx + hr} ${headY - hr - 8} ${cx + hr + 4} ${headY - hr - 2} Q${cx + hr + 6} ${headY + 2} ${cx + hr + 4} ${headY + 4} L${cx + hr + 4} ${headY + hr * 0.4} L${cx - hr - 4} ${headY + hr * 0.4} Q${cx - hr - 6} ${headY + 2} ${cx - hr - 4} ${headY - 2}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        <path
          d={`M${cx - hr - 4} ${headY + hr * 0.4} Q${cx - hr - 4} ${headY + 2} ${cx - hr - 2} ${headY - 2} L${cx - hr + 2} ${headY + hr * 0.2} Z`}
          fill={sh}
          opacity={0.3}
        />
      </>
    );
  },
  front: ({ cx, headY, hr, ow, outline, p }) => {
    const { hi, sh } = celColors(p);
    return (
      <>
        {/* Short neat bangs */}
        <path
          d={`M${cx - hr - 2} ${headY - hr + 4} Q${cx - hr + 4} ${headY - hr - 4} ${cx - 4} ${headY - 6} Q${cx - 2} ${headY - hr - 2} ${cx + 4} ${headY - 6} Q${cx + hr - 4} ${headY - hr - 4} ${cx + hr + 2} ${headY - hr + 4} Q${cx} ${headY - hr - 8} ${cx - hr - 2} ${headY - hr + 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on short bangs */}
        <path
          d={`M${cx - 6} ${headY - hr + 1} Q${cx} ${headY - hr - 3} ${cx + 6} ${headY - hr + 1}`}
          stroke={hi}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* Cel shadow under bangs */}
        <path
          d={`M${cx - 4} ${headY - 6} Q${cx} ${headY - 4} ${cx + 4} ${headY - 6}`}
          fill={sh}
          opacity={0.25}
        />
        {/* THE AHOGE — prominent antenna cowlick */}
        <path
          d={`M${cx - 2} ${headY - hr - 4} Q${cx - 6} ${headY - hr - 18} ${cx + 2} ${headY - hr - 26} Q${cx + 8} ${headY - hr - 22} ${cx + 4} ${headY - hr - 14} Q${cx + 2} ${headY - hr - 8} ${cx + 2} ${headY - hr - 4}`}
          fill={p.hair}
          stroke={outline}
          strokeWidth={ow}
          strokeLinejoin="round"
        />
        {/* Cel highlight on ahoge */}
        <path
          d={`M${cx - 1} ${headY - hr - 10} Q${cx + 2} ${headY - hr - 18} ${cx + 4} ${headY - hr - 20}`}
          stroke={hi}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
      </>
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// FACE DETAILS — eyebrows, nose, mouth, optional blush/lips
// ═══════════════════════════════════════════════════════════════════════════

function faceMaleStandard({ cx, headY, outline, p }: PortraitContext) {
  return (
    <>
      {/* Thick eyebrows */}
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
      {/* Nose bridge + tip */}
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
      {/* Firm mouth */}
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
    </>
  );
}

function faceFemaleStandard({ cx, headY, outline, p }: PortraitContext) {
  const blush = p.blush ?? "#e8a0a0";
  const lipTint = p.lipTint ?? "#d4a0a0";
  return (
    <>
      {/* Blush */}
      <ellipse cx={cx - 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />
      <ellipse cx={cx + 14} cy={headY + 8} rx={5} ry={3} fill={blush} opacity={0.3} />
      {/* Thin elegant eyebrows */}
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
      {/* Subtle nose */}
      <path
        d={`M${cx - 0.5} ${headY + 10} L${cx + 0.5} ${headY + 11.5}`}
        stroke={p.skinShadow}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tinted lips */}
      <path
        d={`M${cx - 3.5} ${headY + 15} Q${cx} ${headY + 16.5} ${cx + 3.5} ${headY + 15}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - 3} ${headY + 15.2} Q${cx} ${headY + 17} ${cx + 3} ${headY + 15.2} Q${cx} ${headY + 16} ${cx - 3} ${headY + 15.2}`}
        fill={lipTint}
        opacity={0.35}
      />
    </>
  );
}

function faceNeutralStandard({ cx, headY, outline, p }: PortraitContext) {
  return (
    <>
      {/* Medium eyebrows */}
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
      {/* Small L-nose */}
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
      {/* Simple mouth */}
      <path
        d={`M${cx - 4} ${headY + 16} Q${cx} ${headY + 17} ${cx + 4} ${headY + 16}`}
        stroke={outline}
        strokeWidth="1.0"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BODY SILHOUETTES — neck, shoulders, torso, clothing
// ═══════════════════════════════════════════════════════════════════════════

function bodyArmoredStructured({ cx, headY, hr, ow, outline, p, d }: PortraitContext) {
  return (
    <>
      {/* Neck */}
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
      {/* Body — structured with armor */}
      <path
        d={`M${cx - d.shoulderW / 2} ${headY + hr + 20} Q${cx - d.shoulderW / 2 - 4} ${headY + hr + 16} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 14} L${cx + d.shoulderW / 2 - 6} ${headY + hr + 14} Q${cx + d.shoulderW / 2 + 4} ${headY + hr + 16} ${cx + d.shoulderW / 2} ${headY + hr + 20} L${cx + d.bodyW / 2 + 2} 160 L${cx - d.bodyW / 2 - 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2} ${headY + hr + 20} L${cx - d.bodyW / 2 - 2} 160 L${cx - d.bodyW / 2 + 16} 160 L${cx - d.shoulderW / 2 + 20} ${headY + hr + 24} Z`}
        fill={p.clothingLight}
        opacity={0.35}
      />
      {/* Collar */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 14} L${cx - d.neckW / 2 - 2} ${headY + hr + 7} L${cx - d.neckW / 2 + 2} ${headY + hr + 14}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="1.0"
      />
      <path
        d={`M${cx + d.neckW / 2 + 4} ${headY + hr + 14} L${cx + d.neckW / 2 + 2} ${headY + hr + 7} L${cx + d.neckW / 2 - 2} ${headY + hr + 14}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="1.0"
      />
      <path
        d={`M${cx - 6} ${headY + hr + 14} L${cx} ${headY + hr + 30} L${cx + 6} ${headY + hr + 14}`}
        stroke={p.accent}
        strokeWidth="1.5"
        fill="none"
        opacity={0.7}
      />
      {/* Shoulder plates */}
      <path
        d={`M${cx - d.shoulderW / 2 + 6} ${headY + hr + 14} L${cx - d.shoulderW / 2} ${headY + hr + 20} L${cx - d.shoulderW / 2 + 4} ${headY + hr + 28} L${cx - d.shoulderW / 2 + 14} ${headY + hr + 22} Z`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
        opacity={0.5}
      />
      <path
        d={`M${cx + d.shoulderW / 2 - 6} ${headY + hr + 14} L${cx + d.shoulderW / 2} ${headY + hr + 20} L${cx + d.shoulderW / 2 - 4} ${headY + hr + 28} L${cx + d.shoulderW / 2 - 14} ${headY + hr + 22} Z`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
        opacity={0.5}
      />
      {/* Seam lines */}
      <path
        d={`M${cx} ${headY + hr + 30} L${cx} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        opacity={0.25}
      />
    </>
  );
}

function bodyElegantLight({ cx, headY, hr, ow, outline, p, d }: PortraitContext) {
  return (
    <>
      {/* Neck */}
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
      {/* Body — elegant clothing */}
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12} Q${cx - d.shoulderW / 2} ${headY + hr + 10} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 8} L${cx + d.shoulderW / 2 - 6} ${headY + hr + 8} Q${cx + d.shoulderW / 2} ${headY + hr + 10} ${cx + d.shoulderW / 2 - 2} ${headY + hr + 12} L${cx + d.bodyW / 2} 160 L${cx - d.bodyW / 2} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2 + 2} ${headY + hr + 12} L${cx - d.bodyW / 2} 160 L${cx - d.bodyW / 2 + 10} 160 L${cx - d.shoulderW / 2 + 12} ${headY + hr + 16} Z`}
        fill={p.clothingLight}
        opacity={0.2}
      />
      {/* Curved neckline */}
      <path
        d={`M${cx - d.neckW / 2 - 6} ${headY + hr + 8} Q${cx} ${headY + hr + 18} ${cx + d.neckW / 2 + 6} ${headY + hr + 8}`}
        stroke={outline}
        strokeWidth="0.8"
        fill="none"
      />
      {/* Gem clasp */}
      <path
        d={`M${cx} ${headY + hr + 10} L${cx + 3} ${headY + hr + 13} L${cx} ${headY + hr + 16} L${cx - 3} ${headY + hr + 13} Z`}
        fill={p.accent}
        stroke={outline}
        strokeWidth="0.6"
      />
      <path
        d={`M${cx - 1} ${headY + hr + 11} L${cx + 1} ${headY + hr + 12.5} L${cx} ${headY + hr + 13} Z`}
        fill="#ffffff"
        opacity={0.6}
      />
      {/* Accent trim */}
      <path
        d={`M${cx - d.neckW / 2 - 4} ${headY + hr + 9} Q${cx} ${headY + hr + 17.5} ${cx + d.neckW / 2 + 4} ${headY + hr + 9}`}
        stroke={p.accent}
        strokeWidth="0.6"
        fill="none"
        opacity={0.5}
      />
      <path
        d={`M${cx} ${headY + hr + 16} L${cx} 158`}
        stroke={p.accent}
        strokeWidth="0.5"
        fill="none"
        opacity={0.3}
        strokeDasharray="3 4"
      />
    </>
  );
}

function bodyCleanSimple({ cx, headY, hr, ow, outline, p, d }: PortraitContext) {
  return (
    <>
      {/* Neck */}
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={12}
        fill={p.skin}
        stroke={outline}
        strokeWidth={ow}
      />
      <rect
        x={cx - (d.neckW - 1) / 2}
        y={headY + hr + 5}
        width={d.neckW - 1}
        height={5}
        fill={p.skinShadow}
        opacity={0.3}
      />
      {/* Body — clean clothing */}
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18} Q${cx - d.shoulderW / 2 - 2} ${headY + hr + 14} ${cx - d.shoulderW / 2 + 6} ${headY + hr + 12} L${cx + d.shoulderW / 2 - 6} ${headY + hr + 12} Q${cx + d.shoulderW / 2 + 2} ${headY + hr + 14} ${cx + d.shoulderW / 2 - 1} ${headY + hr + 18} L${cx + d.bodyW / 2 + 1} 160 L${cx - d.bodyW / 2 - 1} 160 Z`}
        fill={p.clothing}
        stroke={outline}
        strokeWidth={ow}
        strokeLinejoin="round"
      />
      <path
        d={`M${cx - d.shoulderW / 2 + 1} ${headY + hr + 18} L${cx - d.bodyW / 2 - 1} 160 L${cx - d.bodyW / 2 + 12} 160 L${cx - d.shoulderW / 2 + 14} ${headY + hr + 22} Z`}
        fill={p.clothingLight}
        opacity={0.25}
      />
      {/* Mandarin collar */}
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 3} ${headY + hr + 12} L${cx - (d.neckW - 1) / 2 - 1} ${headY + hr + 6} L${cx - (d.neckW - 1) / 2 + 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />
      <path
        d={`M${cx + (d.neckW - 1) / 2 + 3} ${headY + hr + 12} L${cx + (d.neckW - 1) / 2 + 1} ${headY + hr + 6} L${cx + (d.neckW - 1) / 2 - 3} ${headY + hr + 12}`}
        fill={p.clothingLight}
        stroke={outline}
        strokeWidth="0.8"
      />
      <path
        d={`M${cx - (d.neckW - 1) / 2 - 2} ${headY + hr + 12} L${cx} ${headY + hr + 14} L${cx + (d.neckW - 1) / 2 + 2} ${headY + hr + 12}`}
        stroke={p.accent}
        strokeWidth="0.8"
        fill="none"
        opacity={0.6}
      />
      <path
        d={`M${cx} ${headY + hr + 14} L${cx} 158`}
        stroke={p.clothingLight}
        strokeWidth="0.5"
        fill="none"
        opacity={0.25}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PART REGISTRIES
// ═══════════════════════════════════════════════════════════════════════════

export const HEAD_SHAPES: Record<string, PartRenderer> = {
  "angular-jaw": headAngularJaw,
  "soft-oval": headSoftOval,
  "moderate-jaw": headModerateJaw,
};

export const EYES: Record<string, PartRenderer> = {
  "narrow-almond": eyesNarrowAlmond,
  "angular-cat": eyesAngularCat,
  "round-open": eyesRoundOpen,
  "sparkle-ornate": eyesSparkleOrnate,
  "sharp-elegant": eyesSharpElegant,
  "warm-round": eyesWarmRound,
  "balanced-almond": eyesBalancedAlmond,
  "angular-sharp": eyesAngularSharp,
};

export const HAIR: Record<string, HairRenderers> = {
  "swept-bangs": hairSweptBangs,
  "wild-spikes": hairWildSpikes,
  undercut: hairUndercut,
  "flowing-long": hairFlowingLong,
  "geometric-bob": hairGeometricBob,
  "high-ponytail": hairHighPonytail,
  tousled: hairTousled,
  sideshave: hairSideshave,
  "twin-tails": hairTwinTails,
  "curly-voluminous": hairCurlyVoluminous,
  "long-straight": hairLongStraight,
  "messy-bun": hairMessyBun,
  "braided-side": hairBraidedSide,
  "ahoge-short": hairAhogeShort,
};

export const FACE_DETAILS: Record<string, PartRenderer> = {
  "male-standard": faceMaleStandard,
  "female-standard": faceFemaleStandard,
  "neutral-standard": faceNeutralStandard,
};

export const BODIES: Record<string, PartRenderer> = {
  "armored-structured": bodyArmoredStructured,
  "elegant-light": bodyElegantLight,
  "clean-simple": bodyCleanSimple,
};

// ═══════════════════════════════════════════════════════════════════════════
// RECIPE INTERFACE AND ASSEMBLER
// ═══════════════════════════════════════════════════════════════════════════

export interface AppearanceRecipe {
  id: string;
  name: string;
  headShape: string;
  hair: string;
  eyes: string;
  faceDetail: string;
  bodySilhouette: string;
  palette: string;
  skinTone: string;
}

export function validateRecipe(recipe: AppearanceRecipe): string[] {
  const errors: string[] = [];
  if (!HEAD_SHAPES[recipe.headShape]) errors.push(`Unknown head shape: ${recipe.headShape}`);
  if (!HAIR[recipe.hair]) errors.push(`Unknown hair: ${recipe.hair}`);
  if (!EYES[recipe.eyes]) errors.push(`Unknown eyes: ${recipe.eyes}`);
  if (!FACE_DETAILS[recipe.faceDetail]) errors.push(`Unknown face detail: ${recipe.faceDetail}`);
  if (!BODIES[recipe.bodySilhouette]) errors.push(`Unknown body: ${recipe.bodySilhouette}`);
  if (!PORTRAIT_PALETTES[recipe.palette]) errors.push(`Unknown palette: ${recipe.palette}`);
  if (!SKIN_TONES[recipe.skinTone]) errors.push(`Unknown skin tone: ${recipe.skinTone}`);
  return errors;
}

interface PortraitFromRecipeProps {
  recipe: AppearanceRecipe;
  build: BuildType;
  label?: string;
}

export function PortraitFromRecipe({ recipe, build, label }: PortraitFromRecipeProps) {
  const palette = PORTRAIT_PALETTES[recipe.palette] ?? PORTRAIT_PALETTES["warm-earth"];
  const skinTone = SKIN_TONES[recipe.skinTone] ?? SKIN_TONES["medium-warm"];
  const ctx = buildPortraitContext(recipe.headShape, palette, skinTone, build);

  const renderHead = HEAD_SHAPES[recipe.headShape] ?? HEAD_SHAPES["angular-jaw"];
  const renderEyes = EYES[recipe.eyes] ?? EYES["narrow-almond"];
  const hairPair = HAIR[recipe.hair] ?? HAIR["swept-bangs"];
  const renderFace = FACE_DETAILS[recipe.faceDetail] ?? FACE_DETAILS["male-standard"];
  const renderBody = BODIES[recipe.bodySilhouette] ?? BODIES["armored-structured"];

  return (
    <svg
      viewBox="0 0 120 160"
      className="h-full w-full"
      role="img"
      aria-label={label ?? `${recipe.name} portrait`}
    >
      {hairPair.back(ctx)}
      {renderHead(ctx)}
      {renderFace(ctx)}
      {renderEyes(ctx)}
      {hairPair.front(ctx)}
      {renderBody(ctx)}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HQ ACTOR MARKER DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ActorMarkerColors {
  hairColor: string;
  clothingColor: string;
  accentColor: string;
  skinColor: string;
  build: BuildType;
}

/**
 * Derive HQ in-world actor marker colors from the same appearance recipe.
 * Proves that HQ actor-markers and full portraits share one identity source.
 */
export function deriveActorMarker(recipe: AppearanceRecipe, build: BuildType): ActorMarkerColors {
  const palette = PORTRAIT_PALETTES[recipe.palette] ?? PORTRAIT_PALETTES["warm-earth"];
  const skinTone = SKIN_TONES[recipe.skinTone] ?? SKIN_TONES["medium-warm"];
  return {
    hairColor: palette.hair,
    clothingColor: palette.clothing,
    accentColor: palette.accent,
    skinColor: skinTone.skin,
    build,
  };
}
