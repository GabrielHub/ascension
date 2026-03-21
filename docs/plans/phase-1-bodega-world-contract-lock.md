# Phase 1 Contract Lock Plan

This plan must complete before broad parallel implementation starts.

## Goal

Lock the shared contracts for Phase 1 so HQ rendering, raid rendering, assets, audio, and overlays can be built in parallel without drift.

## Required Decisions

- Full-screen canvas route composition for HQ and raids
- Render snapshot shapes for HQ world view and raid world view
- Actor marker contract for HQ operators, staff, raid teams, and enemies
- Focus/selection contract for clicking actors and teams into overlay detail mode
- Camera contract: pan and zoom in Phase 1, no static-only camera
- HQ movement presentation contract: room anchors, connector anchors, token scale bands, and focus handoff rules
- Asset directory contract for HQ environment assets, raid assets, enemies, operator parts, and approved references
- SVG playground approval workflow for visual assets
- Audio playground workflow for SFX and ambience review
- Stable audio cue ids and payload rules
- Save/runtime boundary for render-only and audio-only transient state

## Contract Outputs

- Documented target route structure and screen composition
- Render snapshot interfaces and ownership boundaries
- Directory structure for approved assets
- Minimal naming rules for assets and recipes
- Stable click/focus behavior for HQ and raids
- Stable HQ token-to-focus behavior for operators and staff
- Stable fog-of-war ownership rules
- Stable single-dungeon, multi-team raid rules for Phase 1

## File Ownership

Owns:

- `docs/plans/phase-1-bodega-world-contract-lock.md`
- any new future-facing doc that records Phase 1 shared contracts

May propose edits for later implementation owners to land in:

- `docs/roadmap.md`
- `docs/product-plan.md`
- `app/routes.ts`
- `render/types.ts`
- `sim/runtime.ts`
- `app/ui/game-shell.tsx`

Does not own broad code implementation.

## Execution Status

### File Locks

- `docs/plans/phase-1-bodega-world-contract-lock.md`

### In Progress

- None yet.

### Blocked

- None.

### Done

- None yet.

## Deliverables

- Contract notes for:
  - HQ world snapshot
  - raid world snapshot
  - actor marker schema
  - focus overlay schema
  - camera input model
  - fog-of-war state ownership
  - audio cue ids and payloads
  - asset approval flow

## Explicit Locked Decisions

- SVG is the source asset format.
- Canvas is the world renderer.
- Live SVG remains the asset-preview and focus-detail renderer.
- HQ and raid base views are full-screen canvas scenes under React overlays.
- HQ in-world actors are simple chibi/tokens, not full portraits.
- HQ operators and staff resolve from in-world chibi/tokens into portrait/detail overlays on focus.
- Raid base teams are dots or lightweight markers; portraits appear only in focus mode.
- Asset work must be reviewed in the SVG playground before being promoted.
- SFX work must be reviewed in an audio playground before being promoted.

## Prompt Template

```text
Own the Phase 1 contract-lock pass.

You only own:
- docs/plans/phase-1-bodega-world-contract-lock.md

Your task:
- lock the shared contracts for HQ world rendering, raid rendering, camera, actor markers, focus mode, asset directories, SVG playground approval, audio playground approval, and transient audio/render state boundaries
- update the plan doc directly as you work
- do not implement broad code changes
- if a code edit is necessary to illustrate a contract, stop and hand it back to the manager as a required follow-up
```
