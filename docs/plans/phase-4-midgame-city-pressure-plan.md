# Phase 4 Midgame City Pressure Plan

This plan turns districts, institutions, and rival response into a deterministic gameplay layer. It is the first real implementation slice after the contract lock because every other midgame feature needs a stable external-pressure model.

## Goal

Replace the current mostly reputation-driven contract board with a city-pressure model where districts and factions shape:

- which jobs appear
- who is sponsoring or contesting them
- what pressure follows success, casualties, and failure
- what kinds of incidents and oversight the guild attracts

## Depends On

- `docs/plans/phase-4-midgame-contract-lock-plan.md`

## Planned File Targets

- `content/templates/districts.ts`
- `content/templates/factions.ts`
- `content/templates/site-concepts.ts`
- `sim/components/city-state.ts`
- `sim/systems/raids.ts`
- `sim/systems/events.ts`
- `sim/systems/contract-economy.ts`
- `sim/systems/commands.ts`
- `sim/systems/index.ts`
- `sim/runtime.ts`
- `save/types.ts`
- `save/codec.ts`
- `save/codec.test.ts`
- `app/ui/view-models.ts`
- `app/ui/opportunity-board.tsx`
- `app/ui/management-panel.tsx`
- `app/ui/event-log.tsx`
- `app/ui/dev-console-commands.ts`

## Locked Runtime Rules

- Every posted contract has exactly one district owner and one sponsor faction.
- District state is persistent and affects future postings; it is not recomputed fresh every board refresh.
- Faction state is persistent and affects contract modifiers, incidents, and enforcement pressure.
- Contract results feed district and faction state directly. Do not route those consequences through flavor-only event logs.
- Emergency-management scrutiny rises on contract loss, uncontrolled casualty spikes, and repeated boss failures.
- Labor-safety scrutiny rises on operator deaths, repeat injuries, and aggressive recovery choices.
- Licensing pressure rises with visibility, compliance incidents, and failed paperwork responses.
- Borough-contract pressure rises when the guild neglects districts it already destabilized.
- Rival-guild pressure rises when the player keeps winning in the same high-value districts.

## Implementation Sequence

### 1. Add City Pressure System Authority

- Create `sim/systems/city-pressure.ts` and register it in the sim schedule.
- Initialize default district and faction state from the new template registries.
- Add typed helpers for resolving and mutating district and faction state.

### 2. Upgrade Contract Generation

- Update posted-contract generation in `sim/systems/raids.ts` to select:
  - district
  - sponsor faction
  - district-weighted site concepts
  - modified `minReputation`, `reward`, and `risk`
- Extend posted and active contract state to carry:
  - `districtId`
  - `sponsorFactionId`
  - `pressureTags`

### 3. Feed Results Back Into The City

- Apply deterministic district and faction deltas on:
  - successful ordinary raid
  - successful boss defeat
  - mixed outcome
  - contract loss
  - operator death
  - repeated withdrawals
- Use this baseline table:
  - boss defeat:
    - district trust `+8`
    - district attention `-6`
    - containment debt `-12`
    - sponsor standing `+6`
  - mixed outcome:
    - district attention `+4`
    - containment debt `+5`
    - sponsor standing `-2`
  - contract loss:
    - district trust `-10`
    - district attention `+12`
    - containment debt `+14`
    - emergency-management scrutiny `+10`
    - borough-contract standing `-8`
  - operator death:
    - labor-safety scrutiny `+8`
    - district attention `+5`
    - rival-guild leverage `+4`

### 4. Surface City Pressure In UI

- Extend operations view models with district and sponsor summaries.
- Update `app/ui/opportunity-board.tsx` so contract cards show district and sponsor.
- Extend `app/ui/management-panel.tsx` with a city-pressure summary block.
- Add event-log entries for major city-pressure shifts.

### 5. Add Dev And Regression Support

- Add dev-console commands to set district and faction state directly.
- Add tests covering:
  - contract generation under different district states
  - city-state save/load round-trip
  - contract-result writeback into district and faction state

## Rules

- Do not add a separate world map route in Phase 4.
- Do not make factions another hidden number with no downstream effect.
- Do not simulate rival HQ interiors or rival rosters.
- Do not put city-pressure authority in UI selectors.

## Verification

- `vp check`
- `vp test`
- `vp build`

## Exit Criteria

- district and faction state materially alter contract generation and post-contract fallout
- city institutions can push back through deterministic rules before the incident library expands on top
- the operations UI exposes district and sponsor pressure clearly enough for player planning

## Execution Status

### File Locks

- `sim/systems/city-pressure.ts`
- `sim/systems/city-pressure.test.ts`
- `sim/systems/raids.ts` (contract generation and result writeback)
- `sim/systems/commands.ts` (dev-set-district, dev-set-faction handlers)
- `sim/systems/index.ts` (city-pressure system registration)
- `sim/components/building-authority.ts` (PostedContract, ContractSiteState, ContractResultSummary)
- `sim/commands.ts` (dev-set-district, dev-set-faction command types)
- `save/types.ts` (PostedContractSnapshot, ContractSiteSnapshot, ContractResultSnapshot)
- `save/codec.ts` (city-pressure field parsing)
- `sim/runtime.ts` (posted contract and contract site restoration defaults)
- `app/ui/view-models.ts` (PostedContractViewModel, CityPressureView, EventLogKind)
- `app/ui/raid-panel.tsx` (PostedContractCard district/sponsor display)
- `app/ui/management-panel.tsx` (CityPressureSummaryCard)
- `app/ui/event-log.tsx` (city_pressure event kind)
- `app/ui/dev-console-commands.ts` (city district, city faction, city dump commands)

### In Progress

- None.

### Blocked

- None.

### Done

- Created `sim/systems/city-pressure.ts` with system authority, delta table, writeback, contract modifiers, district/faction selection, passive decay, and event emission.
- Extended `PostedContract`, `ContractSiteState`, and `ContractResultSummary` with `districtId`, `sponsorFactionId`, and `pressureTags`.
- Extended save types and codec to persist and restore city-pressure fields on contracts.
- Updated contract board generation to select district and sponsor per concept, apply city-pressure modifiers to reward, risk, and minReputation.
- Added contract-result writeback into district and faction state on resolution (boss_defeated, contract_lost, success) and per-raid mixed outcomes and operator deaths.
- Registered city-pressure system in the simulation schedule.
- Extended operations view models with district name, sponsor name, and pressure tags.
- Updated contract cards with district and sponsor display.
- Added `CityPressureSummaryCard` to the management panel.
- Added `city_pressure` event kind to the event log.
- Added dev-console commands for setting district fields, faction fields, and dumping city state.
- Added 19 tests covering save/load round-trip, contract generation helpers, city contract modifiers, contract-result writeback, clamping, threshold events, and passive decay.
- Passed `vp check`, `vp test` (799 tests), and `vp build`.
