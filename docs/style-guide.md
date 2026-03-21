# Ascension Style Guide

Selected during preproduction Track B on 2026-03-20 after three rounds of design exploration. Based on the "Constellation" direction.

## Core Colors

| Token         | Value                   | Usage                                   |
| ------------- | ----------------------- | --------------------------------------- |
| void          | `#060608`               | primary background, deepest layer       |
| star-gold     | `#c8a84c`               | primary accent, title, active elements  |
| dim-gold      | `#8a7040`               | secondary accent, muted labels, borders |
| silver-body   | `#e0ddd6`               | body text                               |
| silver-bright | `#f0ece4`               | headings, emphasized text               |
| card-bg       | `rgba(15,14,18,0.4)`    | glass card surfaces                     |
| card-border   | `rgba(200,168,76,0.06)` | card borders at rest                    |
| card-hover    | `rgba(200,168,76,0.18)` | card borders on hover                   |
| delete-red    | `#8a3030`               | destructive actions                     |

Gold is the primary chromatic accent throughout the shell. Volcanic and navy colors extend the palette for gameplay contexts.

## Volcanic Accents (Fire Theme)

| Token   | Value     | Usage                                            |
| ------- | --------- | ------------------------------------------------ |
| ember   | `#d4541e` | warm alerts, active combat, raid intensity       |
| magma   | `#b42c1a` | critical warnings, health loss, danger states    |
| smolder | `#ff7b3a` | hot glow highlights, urgent notifications        |
| ash     | `#3d2c20` | burned-earth surface tint, dark warm backgrounds |

The volcanic palette extends the gold-and-black foundation with fire energy. Use for gameplay intensity moments: active raids, damage indicators, overheated economy, operator injuries. Volcanic accents should feel like embers glowing within the dark — never overwhelming the gold-dominant visual language.

## Navy Offset

| Token    | Value     | Usage                                               |
| -------- | --------- | --------------------------------------------------- |
| midnight | `#0d1225` | alternative deep surface, info panels, cool context |
| steel    | `#1a2440` | navy card surfaces, secondary panels                |
| slate    | `#2a3555` | navy borders, lighter navy accents                  |

The navy offset provides a cooler surface alternative for contexts that need visual separation from the main void-black surfaces. Use for: settings panels, informational displays, stat breakdowns, intel briefings, city map overlays — anywhere the UI needs a distinct "zone" without breaking the overall dark premium feel.

## Font Choices

| Role    | Family | Weights used       | Source       |
| ------- | ------ | ------------------ | ------------ |
| Display | Outfit | 200, 300, 400, 600 | Google Fonts |
| Body    | Inter  | 400, 500           | Google Fonts |

No serif fonts. The display face is geometric and ultralight. The body face is neutral and highly readable at small sizes.

## Title and Logo Treatment

- Text: `ascension` in lowercase
- Font: Outfit weight 200
- Size: `clamp(3.5rem, 10vw, 7.5rem)` responsive
- Letter-spacing: `0.4em`
- Color: star-gold `#c8a84c`
- Text-indent: `0.4em` to visually center the letter-spaced text
- Entrance animation: fades in while letter-spacing contracts from 0.6em to 0.4em

The title should feel weightless and expansive. The extreme lightness against vast dark space is the drama.

## Card and Button Feel

### Cards

- Glass-morphism: translucent dark surface with `backdrop-blur(30px) saturate(1.2)`
- Background: `rgba(15,14,18,0.4)`
- Border: `1px solid rgba(200,168,76,0.06)` at rest, brightens to `0.18` on hover
- Border-radius: `0.75rem` (rounded-xl)
- Shadow: `0 8px 40px rgba(0,0,0,0.6)` at rest, deeper on hover
- Faint gold top-edge glow line (linear-gradient, 6% opacity, increases on hover)
- Cards should feel like looking through frosted glass into deep space

### Primary buttons (Load, Continue)

- Background: `rgba(200,168,76,0.08)` at rest, solid `#c8a84c` on hover
- Border: `1px solid rgba(200,168,76,0.15)` at rest, solid gold on hover
- Text: silver-bright at rest, void-black on hover (inverts)
- Font: Inter 500, uppercase, 0.12em letter-spacing, 0.75rem
- Gold glow shadow on hover

### Destructive buttons (Delete)

- Text-only, no background or border
- Color: dim-gold at 85% opacity, shifts to delete-red on hover
- Underline appears on hover

### Ghost buttons (footer, settings)

- Muted at rest (star-gold at 70% opacity) — must meet 4.5:1 contrast
- Brightens to full star-gold on hover
- Subtle gold background tint on hover
- Lowercase, letter-spaced

## Motion Tone

- **Gentle and atmospheric**, never sharp or aggressive
- Stars drift slowly upward at varying speeds (20-80s cycles), creating soft parallax
- Stars pulse in brightness (smooth sinusoidal, 3-8s cycles)
- UI elements entrance with `cubic-bezier(0.22, 1, 0.36, 1)` easing — fast start, gentle settle
- Hover transitions: 300-500ms duration, ease timing
- Background vignette breathes slowly (10s cycle)
- No snapping, no bouncing, no glitching

## Overall Mood Keywords

- Cosmic
- Vast
- Aspirational
- Serene
- Premium
- Modern
- Weightless
- Expansive

The start screen should feel like standing at the threshold of something immense — looking up at a living sky before stepping into a world of ambition and consequence.

## Palette Hierarchy

1. **Primary**: void black + star gold — the dominant visual language everywhere
2. **Volcanic accents**: ember, magma, smolder, ash — for gameplay intensity, danger, combat, urgency
3. **Navy offset**: midnight, steel, slate — for cool informational surfaces, settings, secondary panels
4. **Silver text**: silver-body and silver-bright — all readable content

The volcanic and navy palettes are EXTENSIONS. They do not replace gold as the primary accent. Gold remains the anchor of the visual identity. Volcanic and navy introduce mood variation within the same dark premium frame.

## Accessibility and Readability

Baseline: **WCAG 2.2 AA**. All readable text must meet 4.5:1 contrast ratio against its background. Large text (18pt regular or 14pt bold) may use 3:1.

### Contrast-safe text tiers on void/card backgrounds

| Tier             | Tailwind             | Contrast | Use for                           |
| ---------------- | -------------------- | -------- | --------------------------------- |
| Body text        | `text-silver`        | 14.5:1   | primary readable content          |
| Headings         | `text-silver-bright` | ~16:1    | card titles, emphasized text      |
| Primary accent   | `text-gold`          | 8.7:1    | active elements, gold labels      |
| Secondary accent | `text-gold/80`       | 5.8:1    | section headers, uppercase labels |
| Muted accent     | `text-gold/70`       | 4.5:1    | secondary gold metadata           |
| Muted body       | `text-silver/60`     | 5.6:1    | subtle metadata, timestamps       |
| Danger accent    | `text-ember`         | 4.7:1    | injury, risk, warnings            |

### Colors that fail AA and must not be used for text

- `text-gold-dim` at any opacity on void (max 4.23:1 at 100% — fails small text threshold)
- `text-silver/50` or lower (4.1:1 at 50%, drops steeply below)
- `text-ember` below 100% opacity (4.7:1 at 100%, fails below)
- Any `text-gold-dim/XX` opacity variant — all fail badly (1.3:1 to 2.6:1)

`dim-gold` remains valid for borders, backgrounds, and non-text decorative elements.

### Minimum font sizes

| Context                              | Minimum | Tailwind                                       |
| ------------------------------------ | ------- | ---------------------------------------------- |
| Body text, descriptions, labels      | 12px    | `text-xs`                                      |
| Dense metadata, stat labels, tags    | 11px    | `text-[0.6875rem]`                             |
| Buttons, controls, interactive text  | 12px    | `text-xs` or inherited from `.btn-*` (0.75rem) |
| Badges                               | 11px    | `text-[0.6875rem]` (set in `.badge` class)     |
| Section headers (uppercase tracking) | 12px    | `text-xs`                                      |

Do not use `text-[0.5rem]` through `text-[0.65rem]` for any readable content.

### Rules for muted and subtle text

- The floor for readable muted text is `text-silver/60` (5.6:1) — use this instead of gold-dim at low opacity
- Do not stack `opacity-XX` classes on already-muted text colors — it compounds below readable thresholds
- Decorative separators (pipes, dots) may use `opacity-40` to `opacity-60` on a passing base color
- If text carries information, it must meet contrast. "Subtle" is not an excuse to be invisible

### Dense management panels and sidebars

- The roster panel, room detail panel, and operations panel contain dense data — use `text-[0.6875rem]` (11px) for the densest stat labels and metadata, `text-xs` (12px) for everything else
- Maintain hierarchy through color and weight, not by making text smaller
- Gold accent tiers (`text-gold/80` for headers, `text-gold/70` for metadata) replace dim-gold for accessible contrast
- Ember accent (`text-ember` at 100%) for danger/risk states — no reduced opacity on small ember text

## Constraints

- This guide constrains later UI work without over-specifying layout or composition details
- Feature UI should follow these tokens and conventions but can adapt layout to gameplay needs
- The void + gold + glass vocabulary should carry through all shell surfaces
- Volcanic accents are reserved for gameplay intensity — do not use them decoratively on calm surfaces
- Navy offset is reserved for informational or secondary contexts — do not mix navy and void arbitrarily
- All three palettes (core, volcanic, navy) are defined in app.css as Tailwind theme tokens

## Operator SVG Style (Locked)

The operator SVG style was locked on 2026-03-21 after three rounds of exploration. The chosen direction is **Unified Anime** — combining E2 Anime Seinen (male presentation) with E3 Anime Shoujo (female presentation) and a blended neutral option.

### Style Identity

Anime cel-shade portraits in a 120×160 viewBox. Hard-edged flat shadow polygons, consistent outline strokes, no gradients for shading. Face and body structure define gender presentation. Hair and eyes define individual character identity.

### Three Presentation Bases

| Presentation | Head Shape                | Outline         | Shadow       | Clothing                  | Reference |
| ------------ | ------------------------- | --------------- | ------------ | ------------------------- | --------- |
| Male         | Angular jaw, pointed chin | 2.0px `#0a0a0c` | 0.45 opacity | Armor plates, high collar | E2 Seinen |
| Female       | Soft ellipse              | 1.3px `#2a2228` | 0.2 opacity  | Elegant, gem clasp        | E3 Shoujo |
| Neutral      | Rounded V-chin            | 1.6px `#151318` | 0.3 opacity  | Mandarin collar, piping   | Blend     |

### Hair and Eyes — Creative Territory

Hair and eyes are intentionally unconstrained in specific style. They are the primary differentiators between operators — the way anime and manhwa create character variety from shared base structures.

Rules for hair:

- Must define a distinct head silhouette readable at roster size (~56px tall)
- Render as layered paths: back layer behind head, front layer overlapping forehead
- Stroke outlines match the presentation base weight
- Hair color typically comes from the palette but creative variation is welcome

Rules for eyes:

- Must include visible iris with at least one white highlight
- Upper eyelid is the heaviest eye stroke
- Eye style conveys personality (narrow = intense, round = warm, sharp = fierce, ornate = beautiful)
- Iris color and detail are creative decisions, not constrained by the palette

New operators should have unique hair and eye combinations. Contributors (human or LLM) are encouraged to invent new hair styles, eye shapes, and colors that fit the overall anime cel-shade language.

### Build Proportions

| Build  | Body Width | Shoulder Width | Head Radius | Neck Width |
| ------ | ---------- | -------------- | ----------- | ---------- |
| broad  | 76         | 92             | 26          | 22         |
| lean   | 52         | 64             | 22          | 16         |
| medium | 64         | 78             | 24          | 18         |

### Role Palettes

| Role        | Skin      | Hair      | Clothing  | Accent    |
| ----------- | --------- | --------- | --------- | --------- |
| Bruiser     | `#d4b896` | `#2a1f18` | `#3d2c20` | `#c8a84c` |
| Infiltrator | `#c4a882` | `#1a1a20` | `#1a2440` | `#2a3555` |
| Strategist  | `#e0c8a8` | `#4a3628` | `#2a3555` | `#c8a84c` |

These palettes are the current set. Future roles may add new palettes. Hair and eye colors may deviate from the palette for special or distinctive operators.

### Canonical References

- Exemplar SVGs: `public/data/svg-parts/operators/reference/`
- Style spec: `public/data/svg-parts/operators/recipes/operator-style-spec.json`
- Preset manifest: `public/data/svg-parts/operators/presets.json`
- React renderers: `app/ui/_unified-male.tsx`, `_unified-female.tsx`, `_unified-neutral.tsx`
- Portrait component: `app/ui/operator-portrait.tsx`
- Shared types: `app/ui/_svg-shared.ts`
- SVG Playground: `/svg-playground`

The game uses `OperatorPortrait` to render operators with the locked style. Each operator gets a deterministic visual preset from its runtime-owned `appearance.seed`. The preset manifest lists all 8 available presets.

The playground is for comparison, iteration, and validation. The canonical reference set is the baseline for future operator SVG work.

- All text must meet WCAG 2.2 AA contrast minimums — readability over aesthetics when they conflict
