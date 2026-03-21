# Ascension Save and Data Model

## Local-First Save Model

The save system is:

- IndexedDB for normal runtime saves
- autosave
- manual save
- manual `.json` export/import

Do not describe this as browser cookies.

## Save Ownership Rules

- saves are snapshots of authoritative runtime state
- saves do not become alternate business-logic sources
- derived view data should not be persisted unless regeneration is too expensive or lossy

## Save Slot Metadata

For MVP, keep slot metadata minimal:

- guild name
- created at
- last played

## Save Shape

Recommended durable save contents:

- metadata
- world snapshot
- building layout
- roster data
- pending raid data
- raid outcome summaries
- resource balances
- applied upgrade state
- authored template references
- generated asset references
- optional embedded generated asset payloads
- version

Every save should also carry:

- schema version
- compatibility marker if content compatibility ever becomes relevant

## Raid Resolution Model

For MVP, raids can be pre-resolved when dispatched.

Recommended model:

- generate a hidden raid resolution packet when the raid starts
- store that packet for active raids so reloads remain consistent
- reveal readable action and status information from that packet over time while a raid is being watched
- persist only durable summaries and consequences once the raid is complete

This works because raids are observational only. The player does not intervene mid-run.

## Durable Raid Summary Contract

Persisted raid summaries should include:

- raid identity and location
- mission type
- start and end time
- final result
- objective completion state
- cash and loot outcomes
- reputation delta
- per-operator outcomes
- narrative tags
- key intel mismatch or anomaly facts when materially relevant

Do not persist:

- every attack
- every movement step
- every temporary focused-view event
- a full combat replay log

## Active Raid Transient Data

Active raid-only transient data can include:

- hidden resolution packet
- focused-view reveal progress
- short-lived action/log buffers

These do not need to live forever in saves once the raid is finished.

Rule:

- active raid packets may be stored only as long as the raid is active
- completed raids should collapse into durable summaries
- migration code must preserve this distinction

## Operator History

Operator history should retain all raid summaries as long as the summary records remain compact and durable-result-oriented.

That supports:

- operator history views
- memorialization
- weekly AI narrative reports later
- progression/debugging analysis

Operator history should store structured summaries, not presentation strings.

## Intel Data Rules

Pre-raid intel should expose:

- estimated threat rank
- likely threat tags
- a player-facing confidence label such as `low`, `medium`, or `high`

That label should map from a real underlying value.

Post-raid intel mismatch should only be surfaced when it materially explains the outcome.

Deeper intel-improvement systems are deferred until the post-bodega phase.

## Data Principles

- keep durable saves compact
- save authoritative outcomes, not every temporary reveal event
- prefer structured fields over derived prose
- let future narrative systems consume summaries and tags instead of raw combat transcripts

## Validation Requirements

The save layer should have mandatory checks for:

- serialize -> deserialize round trips
- schema version presence
- migration correctness when version changes
- active-raid persistence correctness
- rejection of malformed or incompatible save payloads
