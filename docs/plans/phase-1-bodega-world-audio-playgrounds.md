# Phase 1 Audio And Playgrounds Plan

This plan folds the existing audio foundation work into the broader Phase 1 slice and adds the required playground workflow for human review.

## Goal

Add the Phase 1 audio foundation and the two review playgrounds:

- SVG playground and asset viewer remain the gate for visual asset approval
- a new audio playground becomes the gate for SFX and ambience approval

The audio layer should improve the current slice while staying runtime-only and ECS-driven.

## Locked Audio Direction

- ECS emits transient cue requests at authoritative state-change points
- Tone.js is the long-term audio runtime
- first pass is SFX-first, with only minimal restrained ambience
- audio playback state is never serialized into save data
- audio review must happen in an audio playground before wide rollout

## Phase 1 Additions Over The Old Audio Plan

- audio work is explicitly part of the visual-completion phase, not a detached side plan
- the audio playground is required, not optional
- cue authoring should support both HQ and raid presentation work
- visual and audio approval loops should be parallel but human-gated

## Scope

- transient audio cue contracts
- Tone runtime wiring
- first-pass cue catalog
- audio playground route and UI
- SVG playground / asset viewer support updates if needed

## Cue Categories For Phase 1

- HQ management cues
- room/placement/state cues
- recruit/staff cues
- raid launch/return/failure/death cues
- pressure-event cues
- restrained HQ ambient bed
- restrained raid ambient layer if it materially helps readability

## File Ownership

Owns:

- `docs/plans/phase-1-bodega-world-audio-playgrounds.md`
- `app/features/audio/`
- audio playground route and UI
- session/audio integration files

Likely files:

- `app/routes/` audio playground route
- `app/ui/` audio playground page
- `app/features/runtime/session.ts`
- `sim/` transient cue emission surfaces

Does not own:

- HQ asset production
- raid asset production
- core camera/world render implementation beyond required handoff wiring

## Execution Status

### File Locks

- None yet. Manager assigns exact audio/runtime files.

### In Progress

- None yet.

### Blocked

- Waiting on contract lock for final cue ids and payload rules if needed.

### Done

- None yet.

## Work Breakdown

### Track A: Audio playground

- create an audio playground route
- let a human audition cues, ambience layers, and gain staging
- make it easy to compare variations before approval

### Track B: Runtime audio foundation

- add Tone
- add audio engine, buses, unlock flow, and runtime-only playback path

### Track C: ECS cue emission

- emit cues from commands and autonomous systems
- drain cues through the runtime session

### Track D: First cue set

- implement the first approved SFX catalog
- keep ambience restrained and secondary

## Review-Agent Guidance

Once the audio playground and first runtime path land, launch a review agent on:

- cue duplication
- no-op or failed-command sound leakage
- save/runtime boundary correctness
- audio playground usability for rapid review

## Retained Audio Foundations

This integrated Phase 1 plan keeps the earlier audio-direction decisions:

- ECS-driven transient cue emission
- Tone.js runtime
- SFX-first rollout
- no save persistence for playback state

## Prompt Template

```text
Own the Phase 1 audio and playground pass.

You own:
- docs/plans/phase-1-bodega-world-audio-playgrounds.md
- app/features/audio/
- audio playground route/UI
- runtime cue handoff wiring assigned by the manager

You do not own:
- HQ or raid asset production
- broad world-render implementation

Rules:
- keep audio runtime-only
- build the audio playground early so sounds can be human-reviewed
- keep the first rollout SFX-first with restrained ambience
- update the plan doc as the playground, runtime, cues, and review loop land
```
