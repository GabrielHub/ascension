# Phase 1 Save and Outcomes

This plan covers persistence, migrations, and durable outcome contracts for the first playable bodega slice.

## Execution Status

### File Locks

- none; relationship-memory save fix locks released after `vp check`, `vp test`, and `vp build`

### In Progress

- none

### Blocked

- none

### Done

- reviewed `AGENTS.md`
- reviewed `docs/plans/index.md`
- reviewed `docs/plans/phase-1-bodega-manager.md`
- reviewed `docs/plans/phase-1-bodega-contract-lock.md`
- reviewed `docs/plans/phase-1-bodega-save.md`
- reviewed `docs/architecture-rules.md`
- reviewed `docs/technical-save-and-data.md`
- added this plan's `Execution Status` section and kept the lock/status buckets current
- expanded the durable world snapshot for locked Phase 1 groups in `save/types.ts`
- added save codec validation and schema migration coverage in `save/codec.ts`
- routed save storage reads and writes through codec normalization in `save/storage.ts`
- added save-focused tests for world snapshot normalization, migration, malformed payload rejection, and raid durability in `save/codec.test.ts`
- corrected the save schema to include operator `preferences` and `schedule`, `operatorRelationships`, and `raidOpportunities`
- corrected raid summary outcome persistence so operator outcome state stays direct, structured, and compact instead of being dropped into a nested wrapper
- corrected active raid packet hydration so authoritative runtime timing and resolution fields survive save round trips instead of being stripped
- removed the unsafe legacy migration behavior that fabricated missing active-raid state; irrecoverable dispatch-era packets now fail clearly instead
- added compatibility-version rejection so incompatible content snapshots do not half-load
- added migration coverage for operator-assignment-derived raid membership, legacy summary outcome flattening, relationship/opportunity round trips, and malformed payload rejection
- ran `vp check --fix save/codec.ts save/codec.test.ts`
- ran `vp test save/codec.test.ts` and it passed
- ran `vp build` and it passed
- confirmed the full repo now passes `vp check`, `vp test`, and `vp build`
- cleared the stale blocker notes after runtime surfaced the locked operator, relationship, opportunity, event, and command contracts
- reviewed `save/codec.ts`, `save/codec.test.ts`, `save/storage.ts`, and `sim/runtime.ts` against the locked Phase 1 save contract
- hardened raid-summary normalization so current-schema saves with legacy nested `operatorOutcomes[].outcome` wrappers are marked changed and rewritten in normalized storage
- kept top-level raid operator outcome fields authoritative when flattening legacy nested outcome payloads during hydration
- recorded a manager handoff: runtime relationship fields `familiarity` and `recentSharedOutcome` are currently outside the locked save contract and are dropped by save normalization unless the contract is expanded
- reran `vp check`, `vp test`, and `vp build` after the save review fix and they all passed
- preserved `operatorRelationships[].familiarity` and `operatorRelationships[].recentSharedOutcome` in the save contract, normalization, hydration, and round-trip coverage
- bumped the save schema version to `4` so the relationship-memory contract change is versioned
- added migration coverage proving schema `3` relationship snapshots missing those fields hydrate to `0` defaults and normalize forward without regressing existing payloads
- ran `vp check --fix save/types.ts save/codec.ts save/codec.test.ts`
- ran `vp check`, `vp test`, and `vp build` for the repo after the relationship-memory fix and they all passed
- manager handoff still needed: `docs/plans/phase-1-bodega-contract-lock.md` should be updated to include `operatorRelationships[].familiarity` and `operatorRelationships[].recentSharedOutcome`, but that contract doc was not edited under this lock
- added durable operator appearance preset ids to the save contract and normalization path
- bumped the save schema version to `5` for the operator appearance contract update
- added migration coverage for legacy operator appearance records that did not yet store locked preset ids

## Scope

Primary ownership:

- `save/`
- serialization and deserialization glue for newly authoritative runtime state
- persistence validation and migration tests

Explicitly out of scope:

- UI presentation
- SVG or render work
- gameplay rule ownership

## Goal

Make the first playable loop durable without turning save code into a second rule engine.

## 2026-03-20 Autonomy Pivot

The save layer should no longer assume manual raid dispatch as the way raids start.

Correction target:

- persist raid opportunities if they survive across reloads
- persist active raids launched by autonomous operator groups
- persist operator relationship and compatibility state if it is authoritative runtime state
- remove any dispatch-shaped assumptions that imply the player must relaunch or restage raids manually after reload

## Workstreams

### Workstream A: Durable world snapshot growth

Targets:

- persist any new runtime owners added during Phase 1
- keep world snapshots compact and structured
- avoid storing derived presentation state unless regeneration would be lossy or too expensive

Priority additions once locked:

- roster and operator records
- operator relationship data
- staff state
- raid opportunity state if opportunities persist across reloads
- room operational state that matters after reload
- applied upgrade state
- building progression state beyond the current baseline

### Workstream B: Active raid packet and summary contract

Targets:

- durable active raid packet support
- readable but structured raid summaries
- per-operator outcomes where they materially affect progression
- clear separation between transient reveal state and durable result state

### Workstream C: Migration and validation hardening

Targets:

- schema-version discipline as save fields expand
- clear rejection of malformed or incompatible payloads
- migration coverage for any version bump required by Phase 1 work

## Coordination Rules

- save fields must be locked before multiple agents add them
- save code serializes outcomes but does not invent them
- if a field exists only to help UI presentation, challenge it before persisting it

## Review Pass Guidance

Use a save review agent only when the active save implementation owner is finished with a locked slice or is blocked waiting on another track.

Review scope should stay inside save ownership:

- `save/`
- save-focused tests

Review targets:

- storing derived or presentation-only state that should be regenerated
- malformed-save handling gaps
- migration fragility or missing schema-discipline coverage
- active-raid durability issues
- relationship-history fields drifting into prose blobs instead of structured state
- dispatch-shaped save assumptions that should now be autonomous-opportunity state instead
- raid summary contracts that are too lossy or too presentation-shaped
- serializer or loader code drifting into gameplay ownership

Review rules:

- do not review files that still have an active implementation owner
- use exact file locks and keep changes narrow
- prefer hardening validation, migration coverage, and snapshot structure over broad refactors
- any issue that requires changing authoritative gameplay state shape must go back through the manager and owning implementation track
- if the reviewer lands fixes, update this plan's execution status and mark the review task done explicitly

Current review readiness:

- the save slice is released and safe for a bounded save review agent

## Required Tests

- serialize and deserialize round-trip coverage
- active-raid persistence coverage
- migration coverage when schema changes
- failure coverage for incompatible or malformed saves

## Exit Criteria

- the playable bodega slice can be saved and reloaded without losing authoritative state
- operator relationship and compatibility state survives reload if it is authoritative runtime state
- raid opportunity state survives reload if it is authoritative runtime state
- active raid state survives reload consistently
- completed raid history collapses into durable summaries
- save code remains a persistence layer, not a gameplay owner
