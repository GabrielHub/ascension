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
- room usage and simple schedule behavior

Likely ownership surface:

- new people-focused component files under `sim/components/`
- new systems under `sim/systems/`
- any typed runtime selectors required by other tracks

### Workstream C: Mission, raid, economy, and event pressure

Targets:

- first mission-driven dispatch path
- deterministic early raid outcome logic
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

## Required Tests

- registry validation for new ids and references
- system-level tests for the first critical rule paths
- tests that keep morale and loyalty separate as runtime concerns
- tests that prove room and upgrade rules stay outside UI

## Exit Criteria

- the simulation owns the first playable bodega loop
- gameplay rules live in systems, requirements, effects, and templates
- command names are stable enough for UI and app glue
- runtime selectors are usable by the design track without direct ECS mutation
