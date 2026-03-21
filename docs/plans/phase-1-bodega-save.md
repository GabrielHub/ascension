# Phase 1 Save and Outcomes

This plan covers persistence, migrations, and durable outcome contracts for the first playable bodega slice.

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

## Workstreams

### Workstream A: Durable world snapshot growth

Targets:

- persist any new runtime owners added during Phase 1
- keep world snapshots compact and structured
- avoid storing derived presentation state unless regeneration would be lossy or too expensive

Priority additions once locked:

- roster and operator records
- staff state
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

## Required Tests

- serialize and deserialize round-trip coverage
- active-raid persistence coverage
- migration coverage when schema changes
- failure coverage for incompatible or malformed saves

## Exit Criteria

- the playable bodega slice can be saved and reloaded without losing authoritative state
- active raid state survives reload consistently
- completed raid history collapses into durable summaries
- save code remains a persistence layer, not a gameplay owner
