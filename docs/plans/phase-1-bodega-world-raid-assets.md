# Phase 1 Raid World And Assets Plan

This plan owns the raid-side visual slice: dungeon map presentation, enemy/world assets, team markers, and focus-mode visual support.

## Goal

Restore and implement the intended raid presentation: a full-screen dungeon map in the Towns-like minimap spirit, with fog-of-war discovery, multiple operator teams, focus-mode portraits/logs, and lighter presentation than HQ.

## Scope

- authored raid environment assets and tiles
- raid map visual language
- enemy marker and enemy focus visuals
- fog-of-war presentation assets
- focus-mode visual support for portraits, enemies, and log framing

## Locked Raid Direction

- one active raid dungeon at a time
- multiple operator teams may exist in that dungeon
- base raid screen is a full-screen dungeon map
- operator teams are lightweight dots or markers in the base view
- explored space reveals over time through fog of war
- once the dungeon is fully explored, it is no longer raidable
- clicking a team enters focus mode
- focus mode reveals operator portraits, enemy visuals when fighting, and the readable event log
- raid rendering is intentionally lighter and more abstract than HQ

## File Ownership

Owns:

- `docs/plans/phase-1-bodega-world-raid-assets.md`
- raid environment assets and manifests
- raid asset-viewer additions if needed
- raid-focused presentation files once the runtime contract is locked

Likely files:

- `app/ui/raid-watch.tsx`
- `app/ui/raid-log.tsx`
- `public/data/...` raid assets
- any raid asset manifests and recipes

Does not own:

- HQ asset pipeline
- camera/runtime core movement logic
- audio runtime

## Execution Status

### File Locks

- None yet. Manager assigns exact raid asset and UI files.

### In Progress

- None yet.

### Blocked

- Waiting on contract lock for final raid snapshot schema if needed.

### Done

- None yet.

## Work Breakdown

### Track A: Raid map language

- establish the dungeon-map look in a lighter presentation style than HQ
- design fog-of-war reveal treatment
- define marker readability at zoomed-out scale

### Track B: Team and enemy markers

- create operator-team markers for the base map
- create enemy/boss markers as needed

### Track C: Focus mode support

- define visual framing for focused team inspection
- integrate portraits and enemy visuals without making the base map heavy

### Track D: Asset promotion

- route all new visual assets through review before canonical promotion

## Human Review Rule

Raid assets must also pass human review before promotion. If the SVG playground is the best path for raid asset review, use it. If the asset viewer is enough for the lighter raid kit, document that in this plan as work lands.

## Review-Agent Guidance

Once a first raid-map slice lands, launch a review agent on:

- readability at base zoom
- fog-of-war clarity
- focus-mode drift into overly heavy presentation
- missing enemy/marker affordances

## Prompt Template

```text
Own the Phase 1 raid world and asset pass.

You own:
- docs/plans/phase-1-bodega-world-raid-assets.md
- raid environment assets
- raid presentation files assigned by the manager

You do not own:
- HQ asset production
- runtime movement/camera core
- audio runtime

Rules:
- keep raid lighter than HQ
- preserve the locked Towns-like minimap direction
- support one dungeon, multiple teams, and fog-of-war discovery
- keep focus mode rich while base map stays abstract
- update the plan doc as each visual layer lands
```
