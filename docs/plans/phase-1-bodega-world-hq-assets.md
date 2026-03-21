# Phase 1 HQ World And Assets Plan

This plan owns the visual construction of the bodega headquarters and its approved asset pipeline.

## Goal

Create the real authored HQ visual slice: the bodega shell, room kits, props, fixtures, in-world operator markers, and SVG playground approval workflow.

## Scope

- Bodega shell and cross-section language
- Room kit visuals for the current playable room families
- Props and fixtures needed to make those rooms read as places
- In-world operator/staff chibi or token style for HQ
- Visual language that makes room-to-room movement readable at zoomed-out and zoomed-in scales
- Canonical asset locations and recipes for approved HQ visuals
- SVG playground review loop for all new HQ assets

## Human Review Rule

No new HQ asset is considered approved until:

1. it is added to the SVG playground or asset viewer flow
2. it is reviewed by a human
3. it is then promoted into canonical asset locations

Exploration assets may be temporary. Approved assets must move out of the playground.

## Required Asset Categories

- Bodega exterior/interior shell pieces
- Wall, floor, ceiling, threshold, window, and signage pieces
- Room kits for front desk, recruitment space, infirmary, and empty shell states
- Prop kits such as desks, seating, counters, cabinets, lights, posters, plants, medical fixtures, and clutter
- HQ actor marker kit for operators and staff

## Directory Targets

- `public/data/svg-environments/hq/bodega/reference/`
- `public/data/svg-environments/hq/bodega/recipes/`
- `public/data/svg-environments/hq/bodega/parts/`
- any associated manifest files required by the loader/viewer

The exact structure may be refined by contract lock, but the approved asset split must distinguish reference, recipes, and reusable parts.

## File Ownership

Owns:

- `docs/plans/phase-1-bodega-world-hq-assets.md`
- `public/data/...` HQ environment assets and manifests
- SVG playground and asset-viewer files needed for HQ asset review

Likely code surfaces:

- `app/routes/svg-assets.tsx`
- `app/routes/svg-playground.tsx`
- `app/ui/svg-asset-viewer-page.tsx`
- `app/ui/svg-playground-page.tsx`

Does not own:

- camera/runtime movement systems
- raid world systems
- audio runtime

## Execution Status

### File Locks

- None yet. Manager assigns exact asset directories and playground files.

### In Progress

- None yet.

### Blocked

- Waiting on contract lock for final asset directory names if needed.

### Done

- None yet.

## Work Breakdown

### Track A: Visual language lock

- build the bodega shell language in the playground
- compare multiple cross-section and interior treatments
- lock one consistent style

### Track B: Room kits

- build each current room family as a reusable kit
- define empty, active, and operational visual states where needed

### Track C: HQ actor markers

- design simple in-world operator/staff markers that read clearly at zoomed-out scale
- ensure they can visually map to the portrait language without becoming full portraits in-world
- define selected, hovered, busy, injured, and idle variants only if they remain readable and restrained
- support click-to-focus handoff where the marker identity clearly matches the portrait/detail overlay

### Track D: Promotion

- move approved assets into canonical directories
- ensure the asset viewer can browse them

## Review-Agent Guidance

Once the first approved HQ assets are promoted, launch a review agent on:

- naming consistency
- missing canonical examples
- broken loader references
- low-quality tagging or recipe drift

## Prompt Template

```text
Own the Phase 1 HQ world and asset pass.

You own:
- docs/plans/phase-1-bodega-world-hq-assets.md
- the HQ environment asset directories
- the SVG playground and SVG asset viewer surfaces needed for HQ asset review

You do not own:
- runtime movement/camera systems
- raid rendering
- audio runtime

Rules:
- use the SVG playground as a human approval gate
- do not treat playground explorations as approved assets
- promote approved work into canonical asset directories
- update the plan doc as assets move from exploration to approved
- stop and hand off if code changes cross into runtime/camera ownership
```
