import { Link } from "react-router";

import { type OperatorVariant, VARIANTS } from "./_svg-shared";
import { FemaleFlowing, FemaleBob, FemalePonytail } from "./_unified-female";
import { MaleSwept, MaleSpiky, MaleUndercut } from "./_unified-male";
import { NeutralTousled, NeutralSideshave } from "./_unified-neutral";

/* ═══════════════════════════════════════════════════════════════════════════
   Operator SVG — Unified Anime Style
   E2 (Seinen) → male   ·   E3 (Shoujo) → female   ·   blend → neutral
   Hair & eyes as primary character differentiators.
   ═══════════════════════════════════════════════════════════════════════════ */

interface VariantMeta {
  id: string;
  label: string;
  hair: string;
  eyes: string;
  Renderer: React.ComponentType<{ variant: OperatorVariant }>;
}

const MALE_VARIANTS: VariantMeta[] = [
  {
    id: "m-swept",
    label: "Swept + Narrow",
    hair: "Layered swept bangs, strand across forehead, textured short back",
    eyes: "Narrow intense almond, slit pupils, heavy 2.8px upper lid",
    Renderer: MaleSwept,
  },
  {
    id: "m-spiky",
    label: "Spiky + Sharp",
    hair: "Wild upward spikes, 5-6 flame points, bold triangular bang shapes",
    eyes: "Angular cat-eye angled up, round pupil, diamond highlight",
    Renderer: MaleSpiky,
  },
  {
    id: "m-undercut",
    label: "Undercut + Round",
    hair: "Buzzed sides, long swept-back top, one strand falling over eye",
    eyes: "Round open shape, gentle expression, double highlights",
    Renderer: MaleUndercut,
  },
];

const FEMALE_VARIANTS: VariantMeta[] = [
  {
    id: "f-flowing",
    label: "Flowing + Ornate",
    hair: "Long S-curves past shoulders, side locks, flowing waves with highlight streaks",
    eyes: "3-ring iris, 6 sparkle highlights, star shape, 5 individual lash strokes",
    Renderer: FemaleFlowing,
  },
  {
    id: "f-bob",
    label: "Bob + Sharp",
    hair: "Short geometric bob at jaw, thick straight sectioned bangs",
    eyes: "Sharp elegant angle-up, single-ring iris, winged lid, 3 lash strokes",
    Renderer: FemaleBob,
  },
  {
    id: "f-ponytail",
    label: "Ponytail + Round",
    hair: "High ponytail from crown, clean forehead, wispy temple strands",
    eyes: "Round warm shape, 2-ring iris, soft circular highlights, minimal lashes",
    Renderer: FemalePonytail,
  },
];

const NEUTRAL_VARIANTS: VariantMeta[] = [
  {
    id: "n-tousled",
    label: "Tousled + Almond",
    hair: "Medium messy tousled, covers ears, overlapping strands at forehead",
    eyes: "Balanced almond, 2-ring iris, clean highlights, no lash strokes",
    Renderer: NeutralTousled,
  },
  {
    id: "n-sideshave",
    label: "Sideshave + Sharp",
    hair: "Left buzzed stubble, right long flowing asymmetric, dramatic contrast",
    eyes: "Angular sharp, accent-colored liner detail, diamond + circle highlights",
    Renderer: NeutralSideshave,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Variant row — one hair/eye combo shown across all 3 roles
// ──────────────────────────────────────────────────────────────────────────

function VariantRow({ meta, index }: { meta: VariantMeta; index: number }) {
  const { Renderer } = meta;

  return (
    <div
      className="animate-enter rounded-xl border border-[rgba(200,168,76,0.04)] bg-[rgba(15,14,18,0.25)] p-5"
      style={{ animationDelay: `${100 + index * 50}ms` }}
    >
      {/* Label */}
      <div className="mb-4 flex items-baseline gap-3">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-light tracking-wide text-silver-bright">
          {meta.label}
        </h3>
        <span className="badge badge-gold text-[0.6rem]">{meta.id}</span>
      </div>

      {/* Description */}
      <div className="mb-5 grid gap-1 sm:grid-cols-2">
        <p className="flex items-start gap-2 text-[0.6875rem] text-silver/60">
          <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold/30" />
          <span>
            <strong className="text-silver/80">Hair:</strong> {meta.hair}
          </span>
        </p>
        <p className="flex items-start gap-2 text-[0.6875rem] text-silver/60">
          <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold/30" />
          <span>
            <strong className="text-silver/80">Eyes:</strong> {meta.eyes}
          </span>
        </p>
      </div>

      {/* Detail size row */}
      <p className="mb-2 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-gold/50">
        Detail
      </p>
      <div className="flex items-end justify-center gap-5">
        {VARIANTS.map((v) => (
          <div key={v.name} className="flex flex-col items-center gap-1.5">
            <div className="h-52 w-[calc(120*13rem/160)] rounded-lg border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
              <Renderer variant={v} />
            </div>
            <p className="text-[0.6875rem] text-silver/60">
              {v.name} <span className="text-gold/50">· {v.role}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Roster size row */}
      <p className="mt-5 mb-2 text-[0.625rem] font-medium uppercase tracking-[0.2em] text-gold/50">
        Roster
      </p>
      <div className="flex items-end justify-center gap-4">
        {VARIANTS.map((v) => (
          <div key={v.name} className="flex flex-col items-center gap-1">
            <div className="h-14 w-[calc(120*3.5rem/160)] rounded border border-[rgba(200,168,76,0.04)] bg-[rgba(6,6,8,0.5)]">
              <Renderer variant={v} />
            </div>
            <p className="text-[0.6rem] text-silver/40">{v.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Gender presentation section
// ──────────────────────────────────────────────────────────────────────────

function PresentationSection({
  title,
  subtitle,
  baseDescription,
  variants,
  startIndex,
}: {
  title: string;
  subtitle: string;
  baseDescription: string;
  variants: VariantMeta[];
  startIndex: number;
}) {
  return (
    <section className="glass-card overflow-hidden">
      {/* Section header */}
      <div className="border-b border-[rgba(200,168,76,0.06)] px-6 py-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-light tracking-wide text-silver-bright">
          {title}
        </h2>
        <p className="mt-1 text-xs text-silver/60">{subtitle}</p>
        <p className="mt-3 text-[0.6875rem] leading-relaxed text-silver/50">{baseDescription}</p>
      </div>

      {/* Variant rows */}
      <div className="space-y-6 px-6 py-6">
        {variants.map((v, i) => (
          <VariantRow key={v.id} meta={v} index={startIndex + i} />
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Page component
// ──────────────────────────────────────────────────────────────────────────

export function SvgPlaygroundPage() {
  return (
    <div className="min-h-dvh bg-void">
      {/* Header */}
      <header className="animate-enter border-b border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link to="/" className="btn-ghost text-xs">
            &larr; back
          </Link>
          <div className="h-4 w-px bg-[rgba(200,168,76,0.08)]" />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-sm font-light tracking-[0.15em] text-gold">
              SVG Playground &mdash; Operator Style
            </h1>
            <p className="mt-0.5 text-[0.6875rem] text-silver/60">
              Locked style: Unified Anime (Seinen male + Shoujo female + neutral blend) &mdash; hair
              &amp; eyes as character differentiators
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Style system explainer */}
        <section
          className="glass-card animate-enter overflow-hidden px-6 py-5"
          style={{ animationDelay: "60ms" }}
        >
          <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
            Style System
          </h2>
          <div className="mt-3 space-y-2 text-xs leading-relaxed text-silver/70">
            <p>
              Face structure and body define the gender presentation &mdash;{" "}
              <strong className="text-gold/80">angular jaw, heavy outlines, armor</strong> for male,{" "}
              <strong className="text-gold/80">soft oval, delicate lines, elegant details</strong>{" "}
              for female, <strong className="text-gold/80">moderate blend</strong> for neutral.
            </p>
            <p>
              <strong className="text-silver-bright">Hair and eyes</strong> are the primary
              differentiators between individual operators. Same face structure, wildly different
              silhouettes through hair shape and eye style &mdash; the way anime and manhwa create
              character variety.
            </p>
          </div>
        </section>

        {/* Male presentation */}
        <PresentationSection
          title="Male Presentation"
          subtitle="Based on E2 Seinen — angular jaw, heavy cel-shadows, structured armor clothing"
          baseDescription="Angular jaw with chin point · 2.0px outline in #0a0a0c · 0.45 opacity face shadow · defined nose bridge · thick 3.0 eyebrows · shoulder armor plates and high collar"
          variants={MALE_VARIANTS}
          startIndex={0}
        />

        {/* Female presentation */}
        <PresentationSection
          title="Female Presentation"
          subtitle="Based on E3 Shoujo — soft oval head, delicate warm-brown outline, elegant clothing"
          baseDescription="Soft ellipse head · 1.3px outline in #2a2228 · 0.2 opacity face shadow · blush marks · tiny nose · tinted lips · gem clasp collar · thin elegant eyebrows"
          variants={FEMALE_VARIANTS}
          startIndex={3}
        />

        {/* Neutral presentation */}
        <PresentationSection
          title="Neutral Presentation"
          subtitle="Blended — moderate jaw, medium proportions, clean collar"
          baseDescription="Rounded V-chin (between angular and oval) · 1.6px outline in #151318 · 0.3 opacity shadow · small L-shape nose · simple mouth · mandarin collar with accent piping"
          variants={NEUTRAL_VARIANTS}
          startIndex={6}
        />

        {/* Assessment */}
        <section className="glass-card-navy p-6">
          <h2 className="font-[family-name:var(--font-display)] text-base font-light tracking-wide text-silver-bright">
            Assessment
          </h2>

          <div className="mt-4 space-y-3 text-xs leading-relaxed text-silver">
            <p>
              <strong className="text-gold">Hair as silhouette:</strong> Each hair style creates a
              distinctly different head silhouette. At roster size, operators are identifiable by
              hair outline alone &mdash; swept vs spiky vs undercut, flowing vs bob vs ponytail.
            </p>
            <p>
              <strong className="text-gold">Eyes as expression:</strong> Eye style defines
              personality. Narrow slit pupils feel intense, ornate sparkle eyes feel beautiful,
              sharp angled eyes feel fierce, round eyes feel warm. Combined with hair, each operator
              reads as a unique individual.
            </p>
            <p>
              <strong className="text-gold">Gender presentation range:</strong> Male, female, and
              neutral bases share enough visual DNA to feel like one style family, while the
              structural differences (jaw shape, outline weight, shadow intensity, clothing detail)
              give each presentation its own character.
            </p>
            <p>
              <strong className="text-gold">Scalability:</strong> New operators only need a new hair
              style and eye style paired with an existing presentation base. The system can produce
              dozens of distinct-looking characters without new face or body structures.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="badge badge-gold">style locked</span>
            <span className="text-xs text-silver/60">
              Canonical references in public/data/svg-parts/operators/reference/
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
