# Phase 1 Runtime and Content

This plan covers the non-design gameplay track for the first playable bodega slice.

## Scope

Primary ownership:

- `content/`
- `sim/`
- non-visual runtime adapters needed to expose stable selectors or view models

Explicitly out of scope:

- `app/ui`
- route presentation
- `app/app.css`
- `render/`
- SVG composition and design-led presentation work

## Goal

Build the authoritative gameplay layer for the first playable loop without leaking behavior into UI.

## 2026-03-20 Autonomy Pivot

The first Wave A pass assumed manual raid dispatch. That is now superseded.

Correct Phase 1 target:

- raid opportunities are generated and tracked by runtime systems
- operators decide whether to pursue them
- operators form groups through runtime logic
- the player influences outcomes indirectly through guild management rather than direct raid launch
- operator metadata, schedules, and relationship state drive both HQ behavior and raid behavior

## Execution Status

### File Locks

- none; runtime polish locks released after verification

### In Progress

- none

### Blocked

- none

### Done

- reviewed `AGENTS.md`
- reviewed [plans index](./index.md)
- reviewed [Planning Conventions](./planning-conventions.md)
- reviewed [Phase 1 Bodega Manager Plan](./phase-1-bodega-manager.md)
- reviewed [Phase 1 Contract Lock](./phase-1-bodega-contract-lock.md)
- reviewed [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
- reviewed [Architecture Rules](../architecture-rules.md)
- reviewed `app/features/runtime/session.ts`
- reviewed `app/features/runtime/use-runtime-session.ts`
- reviewed `app/features/runtime/index.ts`
- reviewed [Technical ECS and Systems](../technical-ecs-and-systems.md)
- inventoried current `content/`, `sim/`, and `app/features/runtime/` ownership surfaces
- stabilized the locked public sim command names in `sim/commands.ts`
- stabilized the non-visual runtime selector surface through `simulation.getPhase1View()` and `RuntimeSession.phase1View`
- implemented authoritative Phase 1 runtime components for visitors, operators, staff, needs, schedule, assignment, raid participation, injury, and events
- implemented building progression, room activation, room upgrades, recruitment visitors, staffing, needs, raid resolution, economy pressure, event pressure, morale, and loyalty systems
- expanded the bootstrap scenario to seed the first playable bodega loop with operators, staff, and a recruit visitor
- added authored room-upgrade content for front desk, recruitment space, and infirmary
- added runtime tests for command stability, upgrades, recruitment, staffing, and raid resolution
- ran `vp check`
- ran `vp test`
- ran `vp build`
- released unused lock `app/features/runtime/session.test.ts` without editing it
- removed the superseded public `sim/dispatch-raid` command and the manual-dispatch command handler path
- added authoritative runtime ECS state for `PreferenceState`, `RelationshipState`, and `RaidOpportunityState`
- extended runtime snapshots and bootstrap data for operator preferences, operator schedules, relationship history tags, and raid opportunities
- made operator HQ intent selection and raid willingness/team formation deterministic from needs, schedule pressure, morale, loyalty, preferences, relationships, and recent shared outcomes
- moved raid opportunity generation, interest calculation, claim selection, raid launch, and post-raid relationship memory updates into runtime systems
- stabilized runtime-owned selectors for operator intent/readiness, relationship cohesion/friction, raid opportunities, and active raids in `simulation.getPhase1View()`
- replaced manual-dispatch raid tests with deterministic autonomous raid opportunity and team-formation coverage
- ran final verification after the correction pass: `vp check`, `vp test`, and `vp build`
- reviewed the runtime slice for lingering manual-dispatch paths; none remained inside `sim/**`, `content/**`, or `app/features/runtime/**`
- fixed raid-return scheduling so resolved operators are re-planned in the same tick instead of remaining stuck in the `raid` schedule block until a later update
- added runtime coverage for deterministic aged-opportunity claiming, formed-team launch, post-return schedule integrity, and relationship memory updates
- ran the runtime review verification pass: `vp check`, `vp test`, and `vp build`
- exposed a session-owned UI-facing integration surface in `app/features/runtime/session.ts` with typed command callbacks, derived runtime state, persistence state, and lifecycle controls
- refreshed `worldSnapshot`, `phase1View`, and `worldRenderSnapshot` after runtime commands and ticks inside the session layer instead of leaving the shell to pull ad hoc snapshots
- persisted updated save-backed runtime sessions after state-changing commands and autonomous ticks while keeping preview sessions non-destructive
- wired `useRuntimeSession` to subscribe to session updates, start autonomous ticking in the shell, and dispose cleanly on request changes
- ran the runtime integration verification pass: `vp check`, `vp test`, and `vp build`
- ran a narrow runtime polish pass in `app/features/runtime/**` for queued command teardown and save writeback correctness
- fixed session disposal so already-queued runtime mutations drain instead of being silently dropped during request changes or teardown
- fixed save-backed session disposal so queued follow-up writeback still persists after an in-flight save completes
- added runtime session tests covering queued-command drain on dispose and save writeback flush during dispose
- ran the runtime polish verification pass: `vp check`, `vp test`, and `vp build`
- made operator appearance a runtime-owned preset-id contract instead of a UI-only hash concern
- seeded the bootstrap roster with explicit locked operator appearance preset ids and assigned recruited operators explicit preset ids at acceptance time
- removed deprecated preview-session SVG catalog and operator-detail recipe state from `app/features/runtime/session.ts`
- added runtime and session coverage for the operator appearance contract

## Workstreams

### Workstream A: Building, room, and upgrade gameplay

Targets:

- generic room unlock and upgrade flow for the bodega slice
- room operational state and staffing dependencies
- building progression hooks that stay generic for later buildings

Likely ownership surface:

- `content/templates/buildings.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `content/effects.ts`
- `content/requirements.ts`
- `sim/components/building-authority.ts`
- `sim/components/room-instance.ts`
- new building and room systems

### Workstream B: People simulation

Targets:

- visitor or recruitment-pool state
- operator roster state
- staff dependencies
- needs, morale, and loyalty pressure
- deterministic relationship and compatibility state
- room usage and simple schedule behavior
- shared metadata driving both HQ routines and raid willingness or grouping

Likely ownership surface:

- new people-focused component files under `sim/components/`
- new systems under `sim/systems/`
- any typed runtime selectors required by other tracks

### Workstream C: Mission, raid, economy, and event pressure

Targets:

- autonomous raid opportunity generation and group-formation path
- deterministic early raid outcome logic
- deterministic social-fit and schedule-fit scoring for team formation
- first hardcoded event pool driven by world state
- early economy and reputation pressure that can produce failure

Likely ownership surface:

- `content/templates/missions.ts`
- `content/templates/events.ts`
- mission, raid, economy, and event systems
- typed runtime command handling once the contract lock is complete

## Parallelization Notes

- split by file ownership, not by vague feature labels
- do not put multiple agents in one large system file
- any selector surface promised to the design track should be stabilized early and then changed only through manager approval

## Review Pass Guidance

Use a runtime review agent only when a runtime workstream is locally complete or blocked and its file locks have been released.

Review scope should stay inside the runtime/content ownership slice:

- `content/`
- `sim/`
- runtime tests

Review targets:

- regressions in critical gameplay paths
- gameplay logic leaking into adapters meant only for selectors or view models
- component or system sprawl that should be split before integration gets harder
- missing validation around ids, references, or command handling
- test gaps around morale, loyalty, relationship state, room rules, staffing dependencies, raid opportunity logic, team formation, or raid outcomes
- safe optimizations that do not change design or save ownership

Review rules:

- do not launch a runtime reviewer on files an implementation agent is still actively editing
- assign exact file locks before review starts
- keep fixes bounded to the reviewed surface rather than widening the workstream
- if the review finds cross-track issues, report them back through the manager instead of patching outside runtime ownership
- if the reviewer lands fixes, update this plan's execution status and mark the review task done explicitly

## Required Tests

- registry validation for new ids and references
- system-level tests for the first critical rule paths
- tests that keep morale and loyalty separate as runtime concerns
- tests that keep operator compatibility and team-formation logic deterministic and runtime-owned
- tests that prove room and upgrade rules stay outside UI

## Exit Criteria

- the simulation owns the first playable bodega loop
- gameplay rules live in systems, requirements, effects, and templates
- command names are stable enough for UI and app glue
- runtime selectors are usable by the design track without direct ECS mutation
