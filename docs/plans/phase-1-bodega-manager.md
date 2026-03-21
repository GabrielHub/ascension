# Phase 1 Bodega Vertical Slice Manager Plan

This replaces the completed preproduction plan.

Preproduction was verified complete on 2026-03-20 against:

- the completion state recorded in the former preproduction plan
- passing `vp check`
- passing `vp test`
- passing `vp build`

## Manager Role

The manager owns:

- sequencing
- contract lock before parallel work
- agent assignment
- merge order
- join-point review
- scope control against roadmap drift

Execution rule:

- agents do not invent new architecture during Phase 1
- the manager must stop work that crosses ownership boundaries without an explicit handoff

## Design-Agent Ownership Rule

Design agents own all design-facing work, including code work when the task is design-led.

Design-owned areas:

- `app/ui`
- route presentation in `app/routes`
- `app/app.css`
- `render/`
- SVG part search, composition, tagging, and focused-detail presentation
- canvas readability, world-surface layout, motion, and styling
- mixed visual-code tasks where splitting would cause churn

Non-design agents own:

- `sim/`
- `content/`
- `save/`
- non-visual validation and tests

Boundary rule:

- UI, SVG, and design work should be separated from runtime and save work whenever practical
- if a task cannot be split cleanly, the whole task should be assigned to a design agent and the required runtime or save interface should be locked first

## Execution Order

### 1. Serial gate: contract lock

No broad parallel work starts until [Phase 1 Contract Lock](./phase-1-bodega-contract-lock.md) is complete.

### 2. Parallel Wave A

Run these in parallel once the lock step is signed off:

- [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
- [Phase 1 Save and Outcomes](./phase-1-bodega-save.md)
- [Phase 1 Design](./phase-1-bodega-design.md)

### 3. Join point

Manager review before the next wave:

- commands are stable
- selectors and view-model contracts are stable enough for design work
- save fields cover new authoritative runtime state
- no gameplay rules leaked into UI or render code

### 4. Integration wave

After the join point, the manager can assign narrower integration tasks for:

- playable loop wiring
- test hardening
- balance-safe content adjustments
- bug fixing from cross-track integration

## Phase 1 Target

The next shipped milestone is the first playable bodega management loop from the roadmap, not a generic systems demo.

Minimum outcome:

- one playable bodega building instance
- room and upgrade progression through generic templates
- visitors, recruitment, staffing, and room activation
- lightweight morale and loyalty pressure
- a small mission and event pool
- raid dispatch, saved outcomes, and readable watch surfaces

## Manager Checklist

- do not start parallel implementation before lock approval
- keep design agents on all UI, SVG, and broader design-facing work
- prefer narrow file ownership and avoid giant shared registries or system files
- require tests or validation whenever new runtime owners or save fields are introduced
- route any ownership dispute back through architecture docs before code continues
