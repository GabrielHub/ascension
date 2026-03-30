# HQ Scene Builder Plan

Create a dedicated engine/editor route for HQ scene authoring. The builder must edit the same canonical static-scene data used by runtime rendering, starting with exterior and room-scene placement review and expanding into shell and room-layout authoring for future headquarters.

## Status

Not implemented. This is a new active execution plan.

This plan depends on the shipped HQ unified static-scene contract in:

- `render/types.ts`
- `render/hq-scene-data.ts`
- `render/hq-world.ts`

Do not start implementation by redefining HQ placement semantics. The builder must consume the shipped runtime contract as-is unless the same execution pass explicitly updates runtime and builder together.

## Canon Inputs

Read before implementing:

- `docs/roadmap.md`
- `docs/product/presentation.md`
- `docs/product/asset-production.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/content-rules.md`
- `AGENTS.md`
- `content/building-layouts.ts`
- `content/data/hq-environment-index.json`
- `content/data/svg-asset-catalog.json`
- `app/routes/svg-playground.tsx`
- `app/ui/svg-playground-page.tsx`
- `app/ui/environment-parts.ts`
- `app/ui/svg-file-catalog.ts`
- `render/hq-world.ts`
- `render/world-canvas.tsx`
- `render/types.ts`

## Goal

Ship a dedicated HQ scene-builder route where a human can:

- inspect the live HQ shell, room-slot layout, and canonical grid
- load the same static scene graph the runtime uses
- place and edit approved HQ SVG assets without touching renderer code
- validate layering and alignment in-context
- eventually author future building shells and room-slot layouts after assets are generated

The builder is an engine tool. It is not a player-facing gameplay feature and it does not own gameplay authority.

## Locked Decisions

- This is a dedicated route, not an added tab in the current SVG playground.
- The builder edits canonical runtime scene data, not an editor-only shadow format.
- The builder starts with static HQ SVG placement, not actor editing.
- The builder must support all non-actor HQ SVG placements that use the unified static scene system.
- The builder must surface invalid placements and invalid assets clearly.
- The builder must make stale assets harder to keep around, not easier.
- Future shell and room-layout authoring must also export readable repo data, not opaque serialized blobs.
- Creating or editing HQ assets is not complete until the asset has been verified in the SVG playground or the approved builder/review surface and iterated on if issues are found.

## Scope

### In Scope

- new dedicated route for HQ scene building
- read-only inspection of building shell, perimeter, and room slots
- loading and visualizing canonical static scene data
- asset browser filtered to canonical or explicitly exploratory HQ assets
- placement editing for static HQ SVGs
- selection, duplication, deletion, reordering, scale, opacity, anchor, and fine offset editing
- export or save of canonical scene data
- later shell and room-layout authoring surfaces

### Out Of Scope For The First Pass

- actor editing
- gameplay simulation editing
- SVG path editing
- image generation orchestration
- save-slot editing
- replacing the normal HQ gameplay route

## Builder Contract

The builder must operate on the real HQ world model:

- canonical grid
- canonical shell footprint
- canonical room-slot overlays when present
- canonical static scene graph

No approximate mock artboard is acceptable for the main editing surface.

## Required Route Capabilities

The builder route must provide at minimum:

- building selector
- floor or elevation-band selector when relevant
- shell toggle
- perimeter toggle
- room-slot toggle
- placement anchor markers
- asset browser
- placement list
- selection inspector
- warnings panel
- export or save action

## Required Editing Operations

Phase 1 editing operations for static scene placements must support:

- add placement from approved asset browser
- select placement
- move placement by anchor coordinate
- nudge placement
- duplicate placement
- delete placement
- reorder placement
- edit opacity
- edit scale
- edit anchor mode
- edit fine offset

If an asset is not valid for canonical runtime use, the builder must not silently offer it as a normal approved option.

## Asset Verification Workflow

The builder and SVG playground together are part of the required asset workflow.

Any agent creating or editing HQ assets must:

1. create or edit the asset
2. open it in the SVG playground or the current approved review surface
3. inspect it against the grid and neighboring scene context
4. identify visual issues such as:
   - incorrect slopes
   - bad overlaps
   - bad anchors
   - bad scale
   - silhouette or readability problems
   - generally poor-looking output
5. iterate on the asset until those issues are fixed or the asset is rejected

The builder should eventually become the preferred in-context verification surface, but the SVG playground remains a required review tool during the transition and for focused asset inspection.

## Data Flow

The builder must follow this data flow:

1. Load approved environment assets and explicit exploration assets.
2. Load building layout metadata.
3. Load canonical static scene data.
4. Edit builder state against the same typed contract.
5. Save or export structured scene data with no lossy translation step.

If save is deferred in the first pass, export must still produce deterministic structured output that can be committed directly by an agent.

## Execution Phases

### Phase 1: Dedicated Route And Read-Only World Inspection

Owner: app/ui

Deliverables:

- create a dedicated HQ scene-builder route
- wire navigation from existing tooling entry points
- render canonical grid, shell, perimeter, and room-slot overlays
- load and display current static scene placements
- show asset and placement sidebars in read-only mode

Likely files touched:

- `app/routes/**`
- `app/ui/**`
- shared styling and tool navigation surfaces

Done when:

- a human can inspect the actual HQ scene composition without reading renderer code or manually opening metadata files

### Phase 2: Canonical Static Scene Editing

Owner: app/ui/render

Deliverables:

- add placement editing for static HQ SVG assets
- support selection, movement, duplication, deletion, and reordering
- support inspector edits for:
  - anchor
  - scale
  - opacity
  - fine offset
- keep viewport interaction practical:
  - pan
  - zoom
  - click-select
  - click-place or equivalent explicit placement interaction
  - keyboard nudging

Required constraints:

- preserve-aspect placement remains the default
- edits must use the unified static-scene schema
- no editor-only screen-coordinate hacks

Done when:

- a human can author canonical bodega static scene placements from the builder instead of editing renderer code

### Phase 3: Validation, Warnings, And Cleanup Support

Owner: app/ui/tools

Deliverables:

- show invalid asset warnings
- show off-grid or malformed placement warnings
- clearly distinguish:
  - approved assets
  - exploration assets
  - invalid/deprecated assets
- add signals for placements that still depend on assets marked for deletion or remediation
- make it easy to identify dead assets that should be removed from the repo
- make it easy to review recently edited assets before they are treated as confirmed

Required outcome:

- the builder becomes a cleanup aid, not just a placement tool
- the builder supports the required asset verification and iteration workflow instead of assuming first-pass asset output is acceptable

Done when:

- agents and humans can use the builder to identify assets that should be remediated, demoted, or deleted

### Phase 4: Save Or Export Canonical Scene Data

Owner: app/ui/content

Deliverables:

- save or export canonical static scene data directly from the builder
- keep output human-readable and repo-friendly
- ensure builder output can be consumed immediately by the runtime without translation

Done when:

- a scene composed in the builder can become the canonical runtime scene with no manual re-entry

### Phase 5: Shell And Room Layout Authoring

Owner: content/app/ui/render

Deliverables:

- shell footprint editing
- room-slot creation and adjustment
- typed export into building-layout data
- room overlay validation against the canonical grid
- support for future HQ buildings after asset generation

Constraints:

- layout output must remain explicit authored data
- no hidden gameplay logic in builder state
- no mutation of live save data

Done when:

- the same builder route can be used to define future HQ shells and room-slot layouts as well as scene placements

## Required UX Bar

The builder should be usable for real content production work.

Must-have UX qualities:

- visible anchor markers
- obvious selected state
- readable inspector controls
- low-friction overlay toggles
- no hidden placement math
- warnings that are specific and actionable
- stable route state suitable for review and iteration

## Validation Rules

The builder must never normalize invalid production behavior into the default workflow.

Specifically:

- do not present deleted assets as normal placement choices
- do not silently accept off-contract placement data
- do not hide invalid slope or asset-status problems
- do not let the builder drift away from runtime data semantics
- do not treat unverified edited assets as implicitly approved

## Verification

When code changes land for this plan:

- run `vp check`
- run `vp test`
- run `vp build`

Browser verification must cover:

- route load
- building selection
- floor or elevation-band selection where applicable
- overlay toggles
- selecting an asset
- placing an asset
- moving and reordering a placement
- exporting or saving canonical scene data
- confirming runtime HQ rendering matches builder-authored output

Asset workflow verification must cover:

- opening edited assets in the SVG playground or approved review surface
- confirming that obvious slope, overlap, and readability defects were fixed before promotion

## Done When

- HQ scene authoring has a dedicated engine/editor route
- the builder edits the same canonical static-scene data as runtime
- humans no longer need renderer code edits to compose HQ scenes
- the builder helps surface stale or invalid HQ assets instead of keeping them alive accidentally
- the route is ready to expand into future shell and room-layout authoring
