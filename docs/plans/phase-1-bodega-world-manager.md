# Phase 1 Manager Plan: Bodega World Rendering

This plan is the orchestration source for the Phase 1 visual-completion pass. The manager owns sequencing, active ownership, prompt writing for subagents, merge order, and join-point review. The manager should not take broad implementation ownership inside any feature slice.

## Goal

Finish the first playable slice visually before Phase 2 depth work begins.

Locked presentation model:

- HQ is a full-screen canvas world view.
- Raids are a full-screen canvas world/minimap view.
- React renders glass overlays on top of those canvases.
- SVG is the source asset format and the focused-detail format.
- World scenes are not live SVG scene graphs.
- HQ and raid actors are simple in-world tokens or chibi markers.
- Clicking an actor or team enters a focused overlay state with portraits, stats, needs, and logs.
- HQ operators and staff visibly move room to room in the world view according to existing schedules, needs, and assignments.

## Restored Raid Direction

The raid presentation target for this phase is:

- one active raid dungeon at a time
- multiple operator teams may exist in that dungeon at the same time
- the base raid screen is a full-screen dungeon map in the Towns-like minimap spirit
- operator teams read as simple dots or lightweight actor markers in the base raid view
- explored space reveals through fog-of-war discovery
- once a raid dungeon is fully explored, it is no longer raidable
- clicking a team enters focus mode
- focus mode renders full portraits, enemy visuals when in combat, and the readable event log
- raid rendering remains lighter and more abstract than HQ rendering

## Ownership Tracks

- Contract lock: shared contracts, route shape, render snapshot shape, asset directories, audio cues, and playground workflow
- HQ world and assets: environment art, room kits, prop kits, SVG playground approval loop, canonical HQ assets
- Runtime and camera: world snapshots, actor staging, navigation graph, room-to-room movement, camera, selection, overlay integration
- Raid world and assets: raid map presentation, fog of war, team markers, combat focus assets, enemy visual kit
- Audio and playgrounds: audio runtime, cues, audio playground, SVG loader integration, review loop support

## Manager Workflow

1. Lock contracts first.
2. Launch design-heavy asset work and runtime work in parallel once contracts are stable.
3. Keep SVG playground as the human review gate for visual assets.
4. Add an audio playground before broad SFX authoring starts.
5. Launch review agents continuously on released surfaces.
6. Do not open Phase 2 work until this phase's exit criteria are met.

## Execution Status

### File Locks

- None yet. Manager must assign locks before implementation begins.

### In Progress

- Drafting and publishing the plan set.

### Blocked

- None.

### Done

- Presentation model locked in planning docs.
- Raid presentation direction restored in planning docs.

## Manager Prompt Template

Use this when spawning the manager agent for execution:

```text
You are the Phase 1 manager for Ascension's bodega world-rendering pass.

You own:
- sequencing
- file-lock tracking
- prompt writing for all subagents
- merge order
- review-agent timing
- keeping the work aligned with the roadmap and plan docs

You do not own broad implementation inside feature slices.

Required working rules:
- read docs/plans/index.md and the full Phase 1 plan set first
- declare file locks before assigning work
- update the relevant plan docs as work starts, blocks, and completes
- keep SVG asset work behind a human approval loop in the SVG playground
- require an audio playground before broad SFX authoring
- do not advance to Phase 2 concerns
- use review agents on released surfaces throughout the phase
- ensure final verification uses vp check, plus vp test and vp build where runtime or integration changes land

Your job is to tell the user exactly which subagent prompts to run next and why.
```

## Subagent Prompt Policy

The manager should give the user prompts that:

- name the assigned plan file
- name the owned files and forbidden files
- tell the agent to update the plan doc while working
- tell the agent to stop on cross-ownership changes
- tell the agent whether a review agent can work in parallel yet

## Suggested Launch Order

1. Contract lock owner
2. HQ/world asset owner
3. Runtime/camera owner
4. Audio/playground owner
5. Raid/world asset owner
6. Review agents on released surfaces

## Review-Agent Rhythm

- Start review agents once a workstream lands its first coherent released surface.
- Prefer one review agent per released slice instead of repo-wide review sweeps.
- Review agents may either produce findings or land narrow fixes in explicitly released files.

## User-Facing Prompt Pack

The manager should be ready to hand the user prompts for:

- Contract lock agent
- HQ/world assets agent
- Runtime/camera agent
- Raid/assets agent
- Audio/playgrounds agent
- HQ review agent
- Runtime review agent
- Raid review agent
- Audio review agent
