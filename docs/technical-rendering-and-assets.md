# Ascension Rendering and Assets

## Rendering Model

Ascension uses a deliberate hybrid renderer:

- Canvas 2D for building floors, city map, and raid watch world-scale views
- live SVG for focused operator detail views and richer inspection contexts

Important constraint:

- the world renderer should not become a DOM-heavy scene graph
- the detail renderer is where richer composition and animation belong

This document defines rendering behavior and information exposure, not final styling, spacing, or exact component composition.

## SVG Asset Strategy

Do not rely on runtime full-character SVG generation.

Before producing a real SVG library for a category, run a style-exploration pass first.

Required sequence:

1. create a temporary exploration route or sandbox
2. generate many controlled style variations for the target category
3. compare them side by side until one visual language is clearly preferred
4. lock that style language for the category
5. promote approved examples into canonical asset locations
6. only then begin real asset-library production, tagging, and composition work

This should be done separately for major categories such as:

- operators — **LOCKED** (Unified Anime style, 2026-03-21)
- environments — not started
- enemies — not started
- rooms — not started
- buildings — not started

Do not jump straight from abstract design intent to production SVG parts. The project should first prove that each category has a coherent visual language that can survive repetition and variation.

After a style is chosen, do not leave the approved examples only inside the exploration route.

Canonical asset locations:

- `public/data/svg-parts/<category>/reference/` for locked exemplar SVGs
- `public/data/svg-parts/<category>/recipes/` for composed reference recipes or presets
- `public/data/svg-parts/<category>/parts/` for reusable modular production pieces

The SVG Playground route (`/svg-playground`) remains available for comparison, iteration, and validation. The approved references must live outside it.

Use a modular parts library:

- hair
- body bases and silhouettes
- faces and facial details
- clothing layers
- accessories
- role signifiers
- palette variants
- pose-ready templates

### Operator Asset Pipeline (Current State)

The operator asset pipeline is bootstrapped but transitional. The locked style is in use in the game via `app/ui/operator-portrait.tsx`, which renders operators using the unified anime renderers.

Current flow:

1. `OperatorPortrait` receives an operator's name, role tag, and `appearanceSeed` from the runtime
2. `deriveAppearance()` deterministically assigns a visual preset from the runtime-owned `appearance.seed`
3. The preset maps to a specific unified renderer (e.g., `MaleSwept`, `FemaleFlowing`)
4. The operator's role determines palette, the role determines build proportions
5. The unified renderer produces inline SVG JSX

Available presets are listed in `public/data/svg-parts/operators/presets.json`.

What is transitional:

- The deprecated `createPreviewSvgCatalog()` / `buildPreviewDetailRecipe()` in `render/index.ts` still exist for session.ts backwards compatibility — these should be removed when session cleanup happens
- The `OperatorDetailSvg` recipe-based renderer still exists for potential non-operator SVG categories

What remains before full production:

- Modular parts library in `public/data/svg-parts/operators/parts/` (split renderers into reusable pieces)
- Tagged asset search for runtime-driven operator visual assembly
- Per-operator appearance state extensions beyond seed (e.g., explicit preset overrides, equipment overlays)
- Equipment visibility layer (weapon, armor overlay, accessory)
- Casual vs raid appearance contexts

Future runtime flow (when parts library is built):

1. generate operator metadata
2. search the local SVG-part library through a tool
3. return tagged candidate parts
4. select from those candidates
5. assemble the final visual locally

## Tagged Asset Search

Each reusable part should store searchable metadata such as:

- `id`
- `category`
- `tags`
- `paletteTags`
- `roleTags`
- `bodyCompatibility`
- `poseCompatibility`
- `rarity`

Caching should exist at two levels:

- part index/search cache
- assembled visual cache

Validation should reject:

- missing required tags
- incompatible body or pose mappings
- duplicate ids
- duplicate low-signal tags that make search noisy

## Operator Visual Selection

Selection is hybrid:

- silhouette-defining core choices are deterministic from metadata
- secondary accents and accessories come from constrained variation pools

This keeps operators recognizable while still allowing variety.

The selected visual recipe should be treated as derived structured data, not hand-built ad hoc in UI code.

## Style Discovery Rule

SVG style discovery should operate like theme and design-language discovery, not like direct production implementation.

Rules:

- explore multiple variants in a temporary route or sandbox first
- keep the exploration intentionally broad enough to reveal silhouette, line-weight, palette, and shape-language differences
- evaluate consistency across repeated examples, not just one attractive frame
- lock a category style before building a reusable catalog for it
- document the chosen style language so later SVG contributors extend it instead of drifting away from it
- preserve a small locked reference set outside the playground so later human or LLM contributors have concrete examples to study

Reference examples are not just inspirational samples. They should become durable exemplars that future category work can validate against, and where practical they should also become real composed presets the game can use.

Production asset work should be blocked until the relevant category has passed this exploration step.

## Canonical Reference Rule

Each locked SVG category keeps a small canonical reference set.

### Operators (locked)

- `public/data/svg-parts/operators/reference/male-bruiser-swept.svg` — male presentation exemplar
- `public/data/svg-parts/operators/reference/female-infiltrator-flowing.svg` — female presentation exemplar
- `public/data/svg-parts/operators/reference/neutral-strategist-tousled.svg` — neutral presentation exemplar
- `public/data/svg-parts/operators/recipes/operator-style-spec.json` — full style specification
- Future reusable operator parts: `public/data/svg-parts/operators/parts/`

These reference examples show the approved style traits across all three gender presentations and three role palettes. They are the baseline for future extension work.

The SVG Playground (`/svg-playground`) renders and compares variants but is not the canonical storage location. The reference assets above are the durable source of truth.

For the full operator SVG style specification, see `docs/style-guide.md` § Operator SVG Style.

## Equipment Visibility Scope

Mechanically, more gear can exist than is shown visually.

Recommended MVP visible equipment scope:

- weapon
- outfit or armor overlay
- one accessory layer

Other equipment slots may exist mechanically without distinct visible representation yet.

## Appearance Contexts

Operators should have two presentation contexts:

- casual/base appearance for HQ and other non-raid contexts
- raid appearance assembled from equipped visible gear when deployed

This keeps everyday world rendering simpler while still letting raid preparation and progression show up visually where it matters.

## Animation Priorities

Animation should prioritize readability and feedback over spectacle.

Priority order:

1. state-change effects
2. raid-watch readability
3. room and UI feedback
4. richer profile/detail animation
5. only then more elaborate world-actor animation

## Raid Watch Rendering

Base raid watch mode should stay minimal:

- teams and enemy groups read as abstract markers first
- dots, markers, lightweight labels, and status marks are enough

Pre-launch raid surfaces should also stay observational:

- show available opportunities, operator interest, readiness, or commitment state
- do not build Phase 1 around a manual dispatch wizard

When the player clicks a team marker:

- the view shifts into a focused inspection state
- richer portraits, grouped threat cards, status details, and readable logs appear
- the player remains a pure observer

Threats stay grouped even when focused. A boss is still a group of one.

Rendering rule:

- raid-watch rendering consumes structured simulation/view data
- it should not invent gameplay state on the rendering side

## World View vs Detail View

Recommended rule:

- HQ/world views use casual/base appearance
- focused raid/detail views resolve visible raid gear

That is enough for MVP and avoids overbuilding the world renderer.
