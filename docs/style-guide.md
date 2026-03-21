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
- Font: Inter 500, uppercase, 0.12em letter-spacing, ~0.72rem
- Gold glow shadow on hover

### Destructive buttons (Delete)

- Text-only, no background or border
- Color: dim-gold at 60% opacity, shifts to delete-red on hover
- Underline appears on hover

### Ghost buttons (footer, settings)

- Nearly invisible at rest (dim-gold at 30-40% opacity)
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

## Constraints

- This guide constrains later UI work without over-specifying layout or composition details
- Feature UI should follow these tokens and conventions but can adapt layout to gameplay needs
- The void + gold + glass vocabulary should carry through all shell surfaces
- Volcanic accents are reserved for gameplay intensity — do not use them decoratively on calm surfaces
- Navy offset is reserved for informational or secondary contexts — do not mix navy and void arbitrarily
- All three palettes (core, volcanic, navy) are defined in app.css as Tailwind theme tokens
