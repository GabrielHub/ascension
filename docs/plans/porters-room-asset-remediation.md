# Porter's Room Asset Remediation

## Why This Plan Exists

The shipped HQ room-asset pipeline is still effectively bodega-only, and Porter's is the first building where that gap should be closed with a real authored package.

- `public/data/svg-environments/hq/` currently contains only the `bodega` package.
- `content/data/svg-asset-catalog.json` therefore exposes HQ room scenes only for bodega.
- `content/data/hq-environment-index.json` still points `building/porters` at bodega `parts`, `reference`, and `recipes` roots.
- `building/porters` has metadata for some backdrop parts, but those entries still resolve to bodega-rooted files.
- the scene builder already supports Porter's as a selectable building, so Porter's is the right first non-bodega package to make real now.

This is not only a viewer problem. The SVG asset viewer is surfacing a real shipped asset-gap in the Porter's HQ environment package.

## Existing Plan Check

There is no checked-in Porter's room-asset remediation plan before this file.

What already exists:

- broad roadmap references to "continue HQ environment cleanup"
- world and product docs defining what Porter's should be
- runtime room templates and building layouts for Porter's

What does not exist:

- a concrete Porter's room-scene remediation plan
- a checked-in Porter's asset checklist covering roots, scenes, shell, structure, and backdrop coverage

## Canonical Scope Already Defined

The desired Porter's room catalog already exists in canon and runtime definitions.

Defined in runtime/templates:

- `room/floor:tier_1`
- `room/bar:tier_1`
- `room/office:tier_1`
- `room/stockroom:tier_1`
- `room/infirmary:tier_1`
- `room/gym:tier_1`
- `room/prep_room:tier_1`
- `room/break_room:tier_1`
- `room/briefing_room:tier_1`
- `room/dock:tier_1`
- `room/deck:tier_1`
- `room/workshop:tier_1`

Important clarification:

- Porter's room progression is currently unlock-gated, not multi-tiered. Every shipped Porter's room template is a `tier_1` template today.
- Unlike the bodega's authored room-state swaps, Porter's does not yet have explicit per-room scene-state variants or higher room-template tiers.
- The asset package should therefore target one approved baseline scene per Porter's room template unless runtime room-state contracts are added later on purpose.

Defined in world/product docs:

- Porter's is a waterfront bar-and-restaurant HQ with a public ground floor and semi-private operational upstairs
- recovery and training first become dedicated spaces here
- Porter's should ship a harbor-tied exterior package for `sunrise`, `day`, `sunset`, and `night`

Document drift to resolve:

- the roadmap and room templates include `Workshop`
- `docs/world/headquarters-and-rooms.md` lists 11 Porter's rooms and omits `Workshop`

### Porter's Floor-Presentation Contract Already Exists

Porter's does not need skyscraper-style foundation work to define its basic floor behavior. The runtime floor model already exists and should be treated as the asset target.

- Floor `0` is the ground-floor public interior
- Floor `1` is the upstairs operational interior
- Floors `0` and `1` share the `main-interior` stack group and render together as one stacked low-rise view
- Floor `2` is the waterfront group and renders as its own presented view once unlocked
- the machine-shop stage extends the waterfront view rather than introducing a fourth presentation mode

This means the Porter's remediation work is primarily a package-completion task, not a foundation-definition task like the skyscraper plan.

## Current Shipped Asset State

### Catalog Reality

Current HQ asset-catalog coverage:

- bodega `hq-parts`: 76
- bodega `hq-rooms`: 12
- bodega `reference`: 10
- porters `hq-parts`: 0
- porters `hq-rooms`: 0
- porters `reference`: 0

### Environment Index Reality

`content/data/hq-environment-index.json` currently resolves as:

- `building/bodega`: real bodega package roots with shipped scene coverage for the current bodega room catalog, including Back Office, Backstock, and Alley
- `building/porters`: bodega package roots, 23 registered background entries, no shell, no structure, no props, no scenes, no reference assets

### Filesystem Reality

Current `public/data/svg-environments/hq/` directories:

- `bodega`

Missing Porter's directories:

- `public/data/svg-environments/hq/porters/parts`
- `public/data/svg-environments/hq/porters/reference`
- `public/data/svg-environments/hq/porters/recipes`

## Missing Asset Surface

This plan is about shipped production assets, not placeholder viewer entries.

### Porter's Missing Room Scenes

Room scene SVGs missing for all 12 runtime room templates:

- Floor
- Bar
- Office
- Stockroom
- Infirmary
- Gym
- Prep Room
- Break Room
- Briefing Room
- Dock
- Deck
- Workshop

### Porter's Missing Non-Room Assets

- Porter's package roots under `public/data/svg-environments/hq/porters/`
- Porter's shell asset family
- Porter's structure asset family
- Porter's room reference fixtures
- Porter's approved room-scene metadata in `hq-environment-index.json`
- Porter's non-bodega backdrop modules and shell-relative zoning
- Porter's four time-of-day exterior packages as a real package rather than bodega-root reuse

## Out-Of-Scope But Relevant Drift

This plan stays focused on Porter's.

Relevant drift that should not be silently folded into this slice:

- skyscraper remediation is now tracked separately because the building footprint, scene-builder support, and elevation-band package contract still need definition
- some renderer wiring still uses bodega-era scene filename conventions and will need follow-through once new building packages are real

## Execution Plan

### Phase 1: Package And Metadata Grounding

Deliverables:

- create `public/data/svg-environments/hq/porters/`
- add real `parts`, `reference`, and `recipes` roots for Porter's
- stop pointing the Porter's manifest at bodega paths
- register every approved Porter's scene asset in `content/data/hq-environment-index.json`

Exit criteria:

- Porter's asset roots are building-correct
- viewer/catalog discovery can distinguish bodega and Porter's packages
- there are no Porter's runtime roots still aliasing bodega files except where explicitly intended and documented

### Phase 2: Porter's Room Package

Deliverables:

- one reference fixture plus one approved props-only baseline scene SVG per Porter's room template
- Porter's shell/structure assets required to present the building as Porter's rather than a bodega reuse
- if Porter's later gains explicit room-state contracts, add those scene variants as a follow-on slice instead of assuming them now

Priority order:

Starter interior rooms:

1. Floor
2. Bar
3. Office
4. Stockroom
5. Infirmary
6. Gym
7. Prep Room

Unlock-gated follow-up rooms:

8. Break Room
9. Briefing Room
10. Dock
11. Deck
12. Workshop

Rationale:

- this follows the actual runtime room catalog: seven starter rooms plus five building-upgrade unlocks

### Phase 3: Porter's Exterior Package

Deliverables:

- shell-relative waterfront backdrop package for `sunrise`, `day`, `sunset`, and `night`
- Porter's shell-relative zone metadata in `hq-environment-index.json`
- removal of any remaining false implication that Porter's backdrop coverage is "real" when it is still bodega-rooted reuse

Rationale:

- Porter's room scenes should not ship against a fake building package

### Phase 4: Viewer And Runtime Wiring Cleanup

Deliverables:

- ensure the SVG asset viewer discovers the new Porter's files through the existing catalog generator
- validate `hq-environment-index.json` scene entries against real files
- follow through on room-scene selection where runtime still assumes bodega-only filename sets

Exit criteria:

- viewer shows a real Porter's HQ room group without manual per-asset registration
- runtime resolves building-correct Porter's room scenes from building-correct asset roots

## Verification

1. Generate or refresh the SVG asset catalog.
2. Confirm the SVG asset viewer shows Porter's as its own HQ room group.
3. Confirm the expected Porter's room count is visible.
4. Confirm Porter's room scene SVGs are props-only and contain no walls, floors, or structural elements.
5. Confirm Porter's runtime paths resolve through `hq-environment-index.json` without bodega fallbacks.
6. Confirm Porter's time-of-day exterior packages exist for the intended backdrop surface.

## Recommended First Slice

The first slice should be Porter's package grounding plus the seven starter-room scenes. The second slice should add the five building-upgrade unlock rooms.

Why:

- Porter's is smaller than the skyscraper and has a clearer missing-room surface
- the scene builder already supports Porter's today
- it closes the most obvious gap between shipped runtime room templates and shipped HQ room assets
- it gives the viewer a second real HQ building group quickly
- it proves the cross-building package contract before skyscraper elevation-band reuse is tackled
- it keeps HQ asset sequencing aligned with the current priority: finish Porter's before continuing skyscraper HQ asset production

## Open Questions

- Should `Workshop` be added to `docs/world/headquarters-and-rooms.md` so world docs match runtime and roadmap scope?
- Which runtime file should own the long-term mapping between room templates and scene filenames once we are no longer effectively bodega-only?
