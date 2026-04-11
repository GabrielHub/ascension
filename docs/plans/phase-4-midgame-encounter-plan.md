# Phase 4 Midgame Encounter Plan

This plan closes the phase by expanding boss and encounter breadth on top of the new city-pressure, content, crafting, and fallout loops. It should land after the earlier slices so loot, district materials, sponsor pressure, and escalation tone are already stable.

## Goal

Deepen the actual work of clearing contracts:

- more midgame bosses and mixed enemy groups
- longer-form encounter patterns with stronger intervention variety
- contract-site authoring tied to the final district and crafting material model
- better deterministic debug tooling for encounter balance and regression

## Depends On

- `docs/plans/phase-4-midgame-contract-lock-plan.md`
- `docs/plans/phase-4-midgame-city-pressure-plan.md`
- `docs/plans/phase-4-midgame-content-remediation-plan.md`
- `docs/plans/phase-4-midgame-crafting-plan.md`
- `docs/plans/phase-4-midgame-social-incident-plan.md`

## Locked Decisions

- Encounter expansion reuses the existing boss encounter framework. Do not build a second combat system.
- Every new site packet still ships as one content packet:
  - site concept
  - enemy family
  - boss
  - drop tables
  - district linkage
  - rare-material linkage
  - rank tone
- Debug tools must operate on deterministic encounter seeds and transcripts, not presentation-only replays.

## Planned File Targets

- `content/templates/site-concepts.ts`
- `content/templates/enemies.ts`
- `content/templates/bosses.ts`
- `content/templates/items.ts`
- `content/templates/crafting.ts`
- `sim/systems/raid-simulation.ts`
- `sim/systems/raid-simulation.test.ts`
- `sim/systems/encounter.ts`
- `sim/systems/encounter-types.ts`
- `sim/systems/encounter-commands.ts`
- `sim/systems/encounter.test.ts`
- `sim/systems/raids.ts`
- `app/ui/encounter-surface.tsx`
- `app/ui/raid-panel.tsx`
- `app/ui/raid-log.tsx`
- `app/ui/dev-console-commands.ts`

## Required Breadth

Ship all of the following:

- at least 4 new D-rank site packets
- at least 4 new mixed enemy-group compositions for existing D-rank sites
- at least 3 new boss reaction patterns
- at least 3 new managerial interventions that are not consumable reuse
- district-tagged rare-material drops tied into the crafting plan

## Implementation Sequence

### 1. Expand Site And Enemy Packet Authoring

- Add new site packets only after each packet has:
  - district pool
  - faction pressure relevance
  - rare-material linkage
  - boss attachment
  - drop tables
- Expand existing D-rank sites with mixed enemy compositions instead of only solo-family repetition.

### 2. Deepen Boss Pattern Variety

- Add new boss reaction hooks and phase transitions that create different managerial problems:
  - pressure spike
  - summon reinforcement
  - anti-recovery phase
  - anti-intel phase
- Reuse existing boss tags where possible before inventing new ones.
- Only add new boss tags if at least two bosses need the same mechanic.

### 3. Expand Managerial Intervention Design

- Add at least three new deterministic intervention actions.
- Keep them manager-scale, for example:
  - call extraction route
  - force defensive posture
  - spend district intel reserve
- Make sure each intervention writes back into encounter state and transcript output explicitly.

### 4. Bind Loot And Materials To The Final Reward Model

- Ensure new bosses and elite groups can drop the district-linked rare materials from the crafting plan.
- Keep drop-table quality bounded to the Porter's D-rank era.
- Make sure the new reward model still surfaces ordinary monster parts and salvage so crafted gear does not become the only reason to care about raids.

### 5. Improve Deterministic Debug Tooling

- Extend dev commands for:
  - forcing a specific site packet
  - forcing a specific boss
  - replaying an encounter seed
  - printing encounter phase transitions and intervention use
- Add tests for:
  - transcript generation
  - boss phase transitions
  - mixed enemy packet stability
  - intervention writeback

## Rules

- Do not create bosses without attached district and loot context.
- Do not bypass the transcript-based raid model.
- Do not let encounter debug tools mutate campaign state outside the established command surface.
- Do not author Phase 4 encounter content against outdated pre-city-pressure reward assumptions.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- D-rank encounter repetition is materially reduced
- boss fights expose more varied deterministic managerial problems
- encounter rewards feed the workshop loop cleanly
- deterministic debug tools cover the new breadth

## Execution Status

### File Locks

- None until earlier slices merge.

### In Progress

- Blocked pending earlier slices.

### Blocked

- `phase-4-midgame-contract-lock-plan`
- `phase-4-midgame-city-pressure-plan`
- `phase-4-midgame-content-remediation-plan`
- `phase-4-midgame-crafting-plan`
- `phase-4-midgame-social-incident-plan`

### Done

- None.
