# Phase 4 Midgame Social And Incident Plan

This plan deepens the consequences layer after city pressure, Porter's content remediation, and crafting exist. It turns faction pressure, operator death, contract fallout, and room culture into richer incident and social outcomes with real ECS-owned consequences. This execution slice is shipped.

## Goal

Make the human cost of midgame visible and actionable:

- district and faction pressure produce higher-stakes incidents
- operator death and contract failure ripple through morale, loyalty, room culture, and retention
- existing placeholder incident effect kinds become real gameplay consequences
- the event log and interruption layer explain that fallout cleanly

## Depends On

- `docs/plans/phase-4-midgame-contract-lock-plan.md`
- `docs/plans/phase-4-midgame-city-pressure-plan.md`
- `docs/plans/phase-4-midgame-content-remediation-plan.md`
- `docs/plans/phase-4-midgame-crafting-plan.md`

## Locked Decisions

- Incident triggers remain simulation-owned and deterministic.
- Incident authoring expands the existing library in `sim/systems/incidents.ts`.
- The currently stubbed effect kinds must become real before new effect kinds are added:
  - `team_cohesion_delta`
  - `injury_progression`
  - `departure_risk`
  - `contract_pressure_delta`
- New Phase 4 incidents bind to real district ids, faction ids, contract site ids, team ids, and room ids when relevant.
- Death and catastrophic failure incidents do not use comedy framing.

## Planned File Targets

- `sim/systems/events.ts`
- `sim/systems/incidents.ts`
- `sim/systems/social.ts`
- `sim/systems/raids.ts`
- `sim/systems/interruptions.ts`
- `sim/runtime.ts`
- `save/types.ts`
- `save/codec.ts`
- `save/codec.test.ts`
- `app/ui/interruption-host.tsx`
- `app/ui/event-log.tsx`
- `app/ui/management-panel.tsx`
- `app/ui/view-models.ts`
- `app/ui/_glossary.ts`
- `app/features/runtime/session.ts`

## New Incident Coverage

Ship these categories in Phase 4:

- licensing audit
- labor safety inspection
- emergency containment demand
- borough contract hearing
- rival interference
- memorial and grief fallout
- team fracture after casualty
- district backlash after messy cleanup
- workshop shortage or theft
- sponsor ultimatum on an overdue contract

## Implementation Sequence

### 1. Make Existing Effect Kinds Real

- Implement real ECS behavior for the currently placeholder consequence kinds.
- Wire team cohesion into recurring-team state.
- Wire injury progression into operator injury state.
- Wire departure risk into retention calculations.
- Wire contract-pressure deltas into active city and contract pressure state.

### 2. Expand Incident Binding And Template Fields

- Extend incident bound context to support:
  - `districtId`
  - `factionId`
  - `contractSiteId`
  - `teamId`
- Add required-context rules and binders for those subjects.
- Add author-time validation so an incident that requires a district or faction cannot materialize without one.

### 3. Author The Midgame Incident Library

- Add the locked incident categories with at least two authored templates per category.
- Ensure the new templates draw from:
  - district attention
  - faction scrutiny
  - casualty history
  - room tension
  - damaged recurring teams
  - workshop shortages

### 4. Deepen Social Fallout

- Extend social-state updates after:
  - operator death
  - contract loss
  - public scandal or licensing hit
  - successful district recovery
- Add room-culture changes when a district or faction incident resolves through a given room domain.
- Surface stronger retention pressure on operators tied to repeated deaths, poor recovery decisions, or bad faction standing.

### 5. Update Interruption And Event Presentation

- Extend interruption payloads and the event log to summarize:
  - which district is involved
  - which faction is applying pressure
  - which team or room is affected
- Keep the copy dry, bureaucratic, and world-consistent.

## Rules

- Do not add flavor incidents that have no gameplay consequences.
- Do not treat faction pressure as only a number change with no interruptive surface.
- Do not let the new incident pool ignore the existing opening safety gates.
- Do not use AI to decide incident outcomes or available choices.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- institutional, district, and grief fallout produce meaningful incidents
- existing incident effect kinds have real gameplay application
- social state, room culture, and retention all react to midgame failure patterns

## Execution Status

### File Locks

- None.

### In Progress

- None.

### Blocked

- None.

### Done

- Dependencies resolved: contract lock, city pressure, content remediation, and crafting are already shipped in code.
- Step 1: existing effect kinds (`team_cohesion_delta`, `injury_progression`, `departure_risk`, `contract_pressure_delta`) now apply real ECS state changes.
- Step 2: `IncidentBoundContext` expanded with `districtId` and `factionId`; `bindIncidentSubjects` resolves them from active contracts or highest-pressure city state; `hasRequiredIncidentContext` gates on district/faction/contract_site/team availability.
- Step 3: 20 new midgame incident templates authored across 10 categories (licensing audit, labor safety, containment demand, borough hearing, rival interference, grief memorial, team fracture, district backlash, workshop disruption, sponsor ultimatum).
- Step 4: social fallout functions added for operator death, contract loss, scandal, district recovery, room culture shifts, and retention pressure patterns.
- Step 5: event presentation updated with `incident_resolved` and `social_fallout` event log kinds; interruption payloads now include district/faction names in subject summary and briefing copy.
- Step 6: glossary updated with all 10 new incident categories.
- Verification: `vp check`, `vp test`, and `vp build` all pass.
