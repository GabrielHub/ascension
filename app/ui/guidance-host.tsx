/**
 * Guidance presentation host — spotlight, coachmark, centered fallback,
 * progress indicator, and keyboard navigation for the guidance system.
 *
 * Styled as an in-world operational briefing system, not a SaaS product tour.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GuidanceActiveBeatView } from "sim/systems/guidance";
import { glassPanelClass } from "./styles";
import { PresenterPanel } from "./presenter-panel";

// ── Types ────────────────────────────────────────────────────────────

export type GuidanceBeatView = GuidanceActiveBeatView;

export interface GuidanceAnchorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GuidanceProgress {
  current: number;
  total: number;
}

export interface GuidanceHostProps {
  activeBeat: GuidanceBeatView | null;
  anchorBounds: GuidanceAnchorBounds | null;
  onComplete: (beatId: string, signal: string) => void;
  onDismiss: (beatId: string) => void;
  progress: GuidanceProgress;
}

// ── Geometry helpers ─────────────────────────────────────────────────

const SPOTLIGHT_PADDING = 12;
const SPOTLIGHT_RADIUS = 12;
const COACHMARK_GAP = 16;
const COACHMARK_MAX_WIDTH = 380;

type CoachmarkPlacement = "top" | "bottom" | "left" | "right";

function requiresExplicitCompletion(beat: GuidanceBeatView): boolean {
  return beat.requiresManualCompletion === true || beat.completionKind === "acknowledged";
}

function pickPlacement(
  anchor: GuidanceAnchorBounds,
  viewportWidth: number,
  viewportHeight: number,
): CoachmarkPlacement {
  const spaceBelow = viewportHeight - (anchor.y + anchor.height + SPOTLIGHT_PADDING);
  const spaceAbove = anchor.y - SPOTLIGHT_PADDING;
  const spaceRight = viewportWidth - (anchor.x + anchor.width + SPOTLIGHT_PADDING);
  const spaceLeft = anchor.x - SPOTLIGHT_PADDING;
  const minVertical = 200;
  const minHorizontal = COACHMARK_MAX_WIDTH + COACHMARK_GAP;

  if (spaceBelow >= minVertical) return "bottom";
  if (spaceAbove >= minVertical) return "top";
  if (spaceRight >= minHorizontal) return "right";
  if (spaceLeft >= minHorizontal) return "left";
  return "bottom";
}

function getCoachmarkStyle(
  anchor: GuidanceAnchorBounds,
  placement: CoachmarkPlacement,
): React.CSSProperties {
  const sx = anchor.x - SPOTLIGHT_PADDING;
  const sy = anchor.y - SPOTLIGHT_PADDING;
  const sw = anchor.width + SPOTLIGHT_PADDING * 2;
  const sh = anchor.height + SPOTLIGHT_PADDING * 2;

  switch (placement) {
    case "bottom":
      return {
        top: sy + sh + COACHMARK_GAP,
        left: Math.max(16, Math.min(sx, window.innerWidth - COACHMARK_MAX_WIDTH - 16)),
        maxWidth: COACHMARK_MAX_WIDTH,
      };
    case "top":
      return {
        bottom: window.innerHeight - sy + COACHMARK_GAP,
        left: Math.max(16, Math.min(sx, window.innerWidth - COACHMARK_MAX_WIDTH - 16)),
        maxWidth: COACHMARK_MAX_WIDTH,
      };
    case "right":
      return {
        top: Math.max(16, sy),
        left: sx + sw + COACHMARK_GAP,
        maxWidth: COACHMARK_MAX_WIDTH,
      };
    case "left":
      return {
        top: Math.max(16, sy),
        right: window.innerWidth - sx + COACHMARK_GAP,
        maxWidth: COACHMARK_MAX_WIDTH,
      };
  }
}

// ── Spotlight SVG mask ───────────────────────────────────────────────

function SpotlightMask({ anchor }: { anchor: GuidanceAnchorBounds }) {
  const x = anchor.x - SPOTLIGHT_PADDING;
  const y = anchor.y - SPOTLIGHT_PADDING;
  const w = anchor.width + SPOTLIGHT_PADDING * 2;
  const h = anchor.height + SPOTLIGHT_PADDING * 2;
  const r = SPOTLIGHT_RADIUS;

  return (
    <svg
      className="guidance-mask-enter pointer-events-none fixed inset-0 z-[65]"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <mask id="guidance-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} ry={r} fill="black" />
        </mask>
      </defs>
      {/* Darkened overlay with cutout */}
      <rect
        width="100%"
        height="100%"
        fill="rgba(3, 3, 5, 0.68)"
        mask="url(#guidance-spotlight-mask)"
      />
      {/* Subtle gold border around the cutout */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="none"
        stroke="rgba(200, 168, 76, 0.18)"
        strokeWidth="1"
        className="guidance-ring-pulse"
      />
    </svg>
  );
}

// ── Progress indicator ───────────────────────────────────────────────

function GuidanceProgress({ current, total }: GuidanceProgress) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i < current
                ? "w-3 bg-gold/70"
                : i === current
                  ? "w-5 bg-gold guidance-dot-pulse"
                  : "w-2 bg-[rgba(200,168,76,0.15)]"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        ))}
      </div>
      <span className="text-xs uppercase tracking-[0.18em] text-gold-dim">
        {current + 1}/{total}
      </span>
    </div>
  );
}

// ── Anchored coachmark ───────────────────────────────────────────────

function AnchoredCoachmark({
  beat,
  anchor,
  progress,
  onComplete,
  onDismiss,
}: {
  beat: GuidanceBeatView;
  anchor: GuidanceAnchorBounds;
  progress: GuidanceProgress;
  onComplete: (beatId: string, signal: string) => void;
  onDismiss: (beatId: string) => void;
}) {
  const placement = pickPlacement(anchor, window.innerWidth, window.innerHeight);
  const style = getCoachmarkStyle(anchor, placement);
  const panelRef = useRef<HTMLDivElement>(null);
  const requiresManualCompletion = requiresExplicitCompletion(beat);

  useEffect(() => {
    panelRef.current?.focus();
  }, [beat.beatId]);

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={beat.copy.title}
      className="guidance-coachmark-enter fixed z-[66] outline-none"
      style={style}
    >
      <div className="glass-card overflow-hidden border-[rgba(200,168,76,0.12)] shadow-[0_16px_64px_rgba(0,0,0,0.7)]">
        {/* Top accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(200,168,76,0.3)] to-transparent" />

        <div className="px-5 pt-4 pb-5">
          {beat.presenterId && (
            <div className="mb-3">
              <PresenterPanel
                presenterId={beat.presenterId}
                presenterExpression={beat.presenterExpression}
                variant="compact"
              />
            </div>
          )}

          {/* Header */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {beat.copy.subtitle && (
                <p className="mb-0.5 text-xs font-medium uppercase tracking-[0.2em] text-gold-dim">
                  {beat.copy.subtitle}
                </p>
              )}
              <h3 className="font-[family-name:var(--font-display)] text-base font-light tracking-[0.1em] text-gold">
                {beat.copy.title}
              </h3>
            </div>
            <GuidanceProgress {...progress} />
          </div>

          {/* Body */}
          <p className="mb-4 text-[0.8125rem] leading-relaxed text-silver/75">{beat.copy.body}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <div>
              {beat.allowSkip && beat.copy.ctaDismissLabel && (
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  onClick={() => onDismiss(beat.beatId)}
                >
                  {beat.copy.ctaDismissLabel}
                </button>
              )}
            </div>
            {requiresManualCompletion && (
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => onComplete(beat.beatId, beat.completionKind)}
              >
                {beat.copy.ctaLabel}
              </button>
            )}
            {!requiresManualCompletion && (
              <p className="text-sm italic text-gold-dim/70">{beat.copy.ctaLabel}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Centered fallback shell ──────────────────────────────────────────

function CenteredFallbackShell({
  beat,
  progress,
  onComplete,
  onDismiss,
}: {
  beat: GuidanceBeatView;
  progress: GuidanceProgress;
  onComplete: (beatId: string, signal: string) => void;
  onDismiss: (beatId: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, [beat.beatId]);

  const displayBody = beat.copy.fallbackBody || beat.copy.body;
  const requiresManualCompletion = requiresExplicitCompletion(beat);

  return (
    <>
      {/* Backdrop — only for acknowledged beats that require explicit dismissal */}
      {requiresManualCompletion && (
        <div
          className="guidance-mask-enter fixed inset-0 z-[65] bg-[rgba(3,3,5,0.72)] backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Panel — centered for acknowledged, top-anchored for action-completion beats */}
      <div
        className={`fixed z-[66] pointer-events-none ${
          requiresManualCompletion
            ? "inset-0 flex items-center justify-center p-5 sm:p-8"
            : "left-1/2 top-24 -translate-x-1/2 px-5"
        }`}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal={requiresManualCompletion}
          aria-label={beat.copy.title}
          className="guidance-coachmark-enter pointer-events-auto w-full max-w-md outline-none"
        >
          <div
            className={`${glassPanelClass} overflow-hidden rounded-2xl shadow-[0_28px_96px_rgba(0,0,0,0.68)]`}
            style={{ borderColor: "rgba(200,168,76,0.12)" }}
          >
            {/* Top accent — double-line like a classified document */}
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(200,168,76,0.3)] to-transparent" />
            <div className="mt-px h-px bg-gradient-to-r from-transparent via-[rgba(200,168,76,0.12)] to-transparent" />

            <div className="px-6 pt-5 pb-6">
              {beat.presenterId && (
                <div className="mb-4">
                  <PresenterPanel
                    presenterId={beat.presenterId}
                    presenterExpression={beat.presenterExpression}
                    variant="compact"
                  />
                </div>
              )}

              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {beat.copy.subtitle && (
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-gold-dim">
                      {beat.copy.subtitle}
                    </p>
                  )}
                  <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-[0.14em] text-gold">
                    {beat.copy.title}
                  </h2>
                </div>
                <GuidanceProgress {...progress} />
              </div>

              {/* Body */}
              <p className="mb-5 text-sm leading-relaxed text-silver/80">{displayBody}</p>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  {beat.allowSkip && beat.copy.ctaDismissLabel && (
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      onClick={() => onDismiss(beat.beatId)}
                    >
                      {beat.copy.ctaDismissLabel}
                    </button>
                  )}
                </div>
                {requiresManualCompletion && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onComplete(beat.beatId, beat.completionKind)}
                  >
                    {beat.copy.ctaLabel}
                  </button>
                )}
                {!requiresManualCompletion && (
                  <p className="text-xs italic text-gold-dim/70">{beat.copy.ctaLabel}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Host component ───────────────────────────────────────────────────

export function GuidanceHost({
  activeBeat,
  anchorBounds,
  onComplete,
  onDismiss,
  progress,
}: GuidanceHostProps) {
  const [, setRenderTick] = useState(0);
  const beatIdRef = useRef<string | null>(null);

  // Force re-render on resize so spotlight/placement updates
  useLayoutEffect(() => {
    if (!activeBeat) return;
    const onResize = () => setRenderTick((v) => v + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeBeat]);

  // Track beat changes for animation reset
  useEffect(() => {
    beatIdRef.current = activeBeat?.beatId ?? null;
  }, [activeBeat?.beatId]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!activeBeat) return;

      if (e.key === "Enter" && requiresExplicitCompletion(activeBeat)) {
        e.preventDefault();
        onComplete(activeBeat.beatId, activeBeat.completionKind);
      }

      if (e.key === "Escape" && activeBeat.allowSkip) {
        e.preventDefault();
        onDismiss(activeBeat.beatId);
      }
    },
    [activeBeat, onComplete, onDismiss],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!activeBeat) return null;

  // Blocking beats delivered through the interruption queue render
  // via InterruptionHost, not here. This host handles focused + passive.
  if (activeBeat.deliveryMode === "blocking") return null;

  // Focused beat with resolved anchor → spotlight + coachmark
  if (anchorBounds) {
    return (
      <>
        <SpotlightMask anchor={anchorBounds} />
        <AnchoredCoachmark
          beat={activeBeat}
          anchor={anchorBounds}
          progress={progress}
          onComplete={onComplete}
          onDismiss={onDismiss}
        />
      </>
    );
  }

  // Focused beat without anchor → centered fallback
  return (
    <CenteredFallbackShell
      beat={activeBeat}
      progress={progress}
      onComplete={onComplete}
      onDismiss={onDismiss}
    />
  );
}
