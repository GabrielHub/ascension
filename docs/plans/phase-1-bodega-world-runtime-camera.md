# Phase 1 Runtime And Camera Plan

This plan owns the runtime-to-render bridge for the full-screen HQ and raid world scenes.

## Goal

Drive the full-screen canvas worlds from ECS state, including actor staging, pathing, camera, focus interactions, and overlay handoff.

## Scope

- full-screen world route composition
- HQ world render snapshot
- raid world render snapshot
- pan and zoom camera behavior
- operator/staff room-to-room movement for HQ
- actor selection and focus handoff to overlay UI
- fog-of-war runtime support for raids

## Movement Model

Phase 1 should use an authored navigation graph, not an open-ended simulation-heavy pathfinding rewrite.

Required model:

- room entry anchors
- room idle/work/social/recovery anchors
- corridor or connector nodes
- deterministic route selection through those nodes
- smooth interpolation for readable movement
- token scale, depth-order, and occlusion rules that keep actor motion legible in the cutaway view

This should make operators visibly move between rooms according to schedule and needs without turning Phase 1 into a pathfinding research project.

## File Ownership

Owns:

- `docs/plans/phase-1-bodega-world-runtime-camera.md`
- render snapshot types and world renderer integration
- route composition for full-screen world-first play
- runtime movement, navigation graph, camera, and selection integration

Likely files:

- `app/routes/game.tsx`
- `app/ui/game-shell.tsx`
- `app/ui/hq-panel.tsx`
- `app/ui/raid-panel.tsx`
- `app/ui/raid-watch.tsx`
- `render/`
- `sim/runtime.ts`
- `sim/systems/assignment.ts`
- any new movement/navigation files

Does not own:

- HQ asset production
- raid asset production
- audio runtime

## Execution Status

### File Locks

- None yet. Manager assigns exact runtime and render files.

### In Progress

- None yet.

### Blocked

- Waiting on contract lock for final snapshot schema if needed.

### Done

- None yet.

## Work Breakdown

### Track A: Full-screen composition

- convert current boxed world view into a full-screen canvas under overlays
- preserve the glass UI overlay style

### Track B: HQ render bridge

- extend render snapshots from room rectangles to actual world scene layers
- include room states, actor markers, highlights, and selection state

### Track C: Movement and actor staging

- add authored navigation graph support
- move operators and staff between rooms based on existing simulation decisions
- keep in-world actors as lightweight chibi/tokens and hand off to portrait/detail overlays on click
- stage actors at meaningful room anchors when they are not transitioning between spaces

### Track D: Camera and interaction

- support panning and zooming in Phase 1
- support click-to-focus for room and actor inspection
- keep camera/input behavior compatible with a full-screen world canvas under glass UI overlays

### Track E: Raid runtime bridge

- support one active dungeon at a time
- support multiple operator teams in that dungeon
- support discovery/fog-of-war ownership in runtime state

## Review-Agent Guidance

Launch a released-surface review agent once:

- full-screen composition lands, or
- movement/pathing lands, or
- raid fog-of-war lands

Review focus:

- ownership leaks between UI and simulation
- drift from the contract-locked snapshot schema
- camera/input regressions
- save/runtime boundary mistakes

## Prompt Template

```text
Own the Phase 1 runtime and camera pass.

You own:
- docs/plans/phase-1-bodega-world-runtime-camera.md
- runtime/render bridge code
- camera, selection, and movement integration

You do not own:
- authored HQ environment assets
- authored raid assets
- audio runtime

Rules:
- keep ECS authoritative
- use an authored navigation graph for Phase 1 movement
- support pan and zoom now
- keep world scenes full-screen under React overlays
- update the plan doc as each runtime surface lands
- stop on cross-ownership asset work instead of improvising it
```
