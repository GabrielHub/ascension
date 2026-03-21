# Phase 1 Contract Lock

This is the required serial gate for the Phase 1 bodega slice.

Runtime, save, and design work may start only inside the locked contracts below.

## 2026-03-20 Autonomy Pivot

Manual raid dispatch is not part of the intended Phase 1 loop.

From this point forward:

- operators choose whether to claim raid opportunities
- operators form raid groups through simulation state
- no player-facing raid-launch command is part of the Phase 1 target

## Execution Status

- File Locks: `docs/plans/phase-1-bodega-contract-lock.md`
- In Progress: none
- Blocked: none
- Done:
  - Read the manager plan, current contract doc, current commands and save types, current ECS components, and current template ids.
  - Locked Phase 1 component names, ids and id prefixes, typed commands, save-field groups, and validation gates.
  - Published the serial gate note. Runtime, save, and design can start within this contract.

## Lock Note

### Approved runtime component names

Existing locked names stay unchanged:

- `GuildState`
- `WorldTimeState`
- `BuildingAuthority`
- `RoomInstance`
- `MoraleState`
- `LoyaltyState`
- `Renderable`

New Phase 1 names approved:

- `VisitorState`
- `OperatorIdentity`
- `PreferenceState`
- `RelationshipState`
- `StaffState`
- `NeedState`
- `ScheduleState`
- `AssignmentState`
- `RaidOpportunityState`
- `RaidParticipationState`
- `InjuryState`
- `EventState`

Rejected in this pass:

- UI-owned mirrors of gameplay state
- render-owned gameplay state
- authored operator or staff template registries unless separately locked later

### Approved ids and id prefixes

Existing in-slice ids approved now:

- building: `building/bodega`
- rooms: `room/front_desk:tier_1`, `room/recruitment_space:tier_1`, `room/infirmary:tier_1`
- building upgrades: `upgrade/building/bodega:frontage`, `upgrade/building/bodega:annex`
- missions: `mission/clearance`, `mission/containment`, `mission/extraction`
- events: `event/breach_emergency`, `event/personnel_conflict`, `event/contract_deadline`, `event/economic_pressure`, `event/regulatory_scrutiny`

Existing but out of the Phase 1 bodega slice:

- `building/union_hall`

Approved Phase 1 prefix rules for additional authored entries:

- rooms: `room/<family>:tier_<n>`
- building upgrades: `upgrade/building/bodega:<slug>`
- room upgrades: `upgrade/room/<family>:<slug>`
- missions: `mission/<slug>`
- events: `event/<slug>`

Not approved by this serial gate:

- new building ids beyond `building/bodega`
- authored operator or staff template ids

### Approved command names

- `sim/tick` remains the only public time-advance command for Phase 1
- `sim/place-room`
- `sim/set-room-active`
- `sim/purchase-building-upgrade`
- `sim/purchase-room-upgrade`
- `sim/accept-recruit`
- `sim/reject-recruit`
- `sim/hire-staff`
- `sim/assign-staff`

No additional public `sim/*` gameplay command names are approved without a follow-up lock.

Explicitly not approved for Phase 1:

- `sim/dispatch-raid`

### Approved save fields

Keep the existing world-level names:

- `guild`
- `time`
- `building`
- `rooms`
- `activeRaidPackets`
- `raidSummaries`
- `appliedUpgradeIds`

Add these world-level groups for Phase 1:

- `operators`
- `operatorRelationships`
- `staff`
- `visitors`
- `raidOpportunities`
- `activeEvents`

Nested durable groups approved for Phase 1:

- `rooms[]`: `isActive`
- `operators[]`: `identity`, `preferences`, `schedule`, `needs`, `morale`, `loyalty`, `injury`, `assignment`, `appearance`
- `operatorRelationships[]`: `operatorAId`, `operatorBId`, `trust`, `friction`, `familiarity`, `recentSharedOutcome`, `historyTags`
- `staff[]`: `assignment`, `status`
- `raidOpportunities[]`: `missionId`, `location`, `threat`, `intel`, `status`, `interestedOperatorIds`, `claimedOperatorIds`
- `activeRaidPackets[]`: `operatorIds`, `resolutionPacket`, `revealProgress`
- `raidSummaries[]`: `operatorOutcomes`, `narrativeTags`, `intelMismatchTags`

Boundary rules:

- keep room operational state in `rooms[]`, not a second room-state mirror
- keep operator relationship state in `operatorRelationships[]` or another single runtime-owned structure, not in UI-local team heuristics
- keep raid opportunities in `raidOpportunities[]`, not a UI-owned mission board mirror
- keep active raid reveal data in `activeRaidPackets[]`; completed raids collapse into `raidSummaries[]`
- save code persists outcomes and references only; it does not invent gameplay outcomes or store UI-only fields

### Required validation and test gates

- template registry validation fails on duplicate ids, unknown ids, and bad cross-references for any new room, upgrade, mission, or event content
- the command surface remains typed, and UI may dispatch only approved command names
- no player-facing raid-dispatch command may be introduced in Phase 1 without a new contract lock
- save loads fail clearly on missing `schemaVersion`, missing `compatibilityVersion`, malformed payloads, and incompatible content versions
- serialize and deserialize round-trip tests cover `operators`, `operatorRelationships`, `staff`, `visitors`, `activeEvents`, raid opportunity fields, and active raid packet fields
- active raid persistence tests prove `resolutionPacket` survives reload while active and is removed from active storage once collapsed into a summary
- migration tests transform stored data only and do not invent gameplay outcomes
- deterministic tests or equivalent review gates must prove operator compatibility and team formation are driven by runtime state rather than UI heuristics
- boundary tests or equivalent review gates keep room rules, autonomous raid choice, raid outcomes, and event selection out of UI, render, and save layers

## Serial Gate Result

- This serial gate is complete.
- Runtime, save, and design may start against the contracts above.
- Any new component name, public command name, save-field group, or out-of-slice authored id needs manager approval before parallel work adds it.
