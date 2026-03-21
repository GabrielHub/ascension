# Ascension Architecture Rules

## Purpose

This file exists to prevent architectural sprawl, orphaned gameplay code, and inconsistent feature implementation. It is especially important because this project is intended to be worked on incrementally and with AI assistance.

The rule is simple:

- gameplay behavior belongs in ECS systems
- gameplay configuration belongs in authored templates
- everything else is glue, presentation, or tooling

If a change does not fit one of those buckets, it needs justification before it is added.

## Source Of Truth Hierarchy

When documents overlap, use this order:

1. [Architecture Rules](./architecture-rules.md)
2. split technical docs
3. [Product Plan](./product-plan.md)
4. [Roadmap](./roadmap.md)
5. research and supporting docs

Research and supporting docs are not implementation authority. If a supporting doc conflicts with the core docs, the core docs win until explicitly revised.

## Hard Rules

### 1. No gameplay rules in UI

React and UI code may:

- display state
- dispatch intents
- map ECS state to view models
- open and close panels or modals

React and UI code may not:

- decide upgrade costs
- decide room unlock rules
- apply economy changes
- contain hardcoded resource or building logic
- compute raid outcomes

UI and plan documents may define:

- information architecture
- interaction states
- required surfaced data
- major presentation constraints needed by gameplay readability

UI and plan documents should not hard-lock:

- final styling
- spacing systems
- exact visual hierarchy details
- final component composition when multiple valid implementations would satisfy the same gameplay need

Those should be decided by the implementation pass that actually builds the interface, while still respecting the project's established visual language and gameplay constraints.

### 1.1 No direct gameplay mutation from UI

UI should not mutate ECS state ad hoc.

Preferred boundary:

- UI dispatches typed intents or commands
- app/sim glue translates those intents into ECS-safe mutations
- systems remain the long-term owners of gameplay consequences

This keeps parallel UI work from quietly becoming a second gameplay layer.

### 2. No named-content branching in systems unless unavoidable

Systems should not say:

- `if (buildingId === 'bodega')`
- `if (resourceId === 'cash')`
- `if (roomId === 'bar')`

Systems should instead operate on:

- component state
- template ids
- tags
- requirements
- effects
- generic capability flags

If a named-content branch is ever required, it should be treated as a deliberate exception and documented.

### 3. Templates are data, not logic containers

Templates can contain:

- ids
- tags
- requirements
- costs
- effect payloads
- presentation metadata

Templates should not contain executable business logic.

### 3.1 Stable id and naming conventions are mandatory

All authored ids should follow predictable lowercase conventions.

Recommended patterns:

- templates: `domain/name` or `domain/name:tier`
- tags: `domain:value`
- effect types: `verb_target`
- requirement types: `subject_constraint`

Examples:

- `building/bodega`
- `room/recruitment_space:tier_2`
- `tag:role/medic`
- `unlock_room_tier`
- `building_tier_min`

Do not invent one-off id styles per feature.

### 4. Save/load does not own game rules

Save and load code may:

- serialize runtime state
- deserialize runtime state
- migrate save versions

Save and load code may not:

- apply progression rules
- repair missing gameplay outcomes with ad hoc logic
- reinterpret content behavior

### 4.1 Save versioning is required from day one

Every save must carry:

- schema version
- build or content compatibility marker if needed

Migration rules:

- migrations transform stored data only
- migrations do not silently invent gameplay outcomes
- failed incompatible loads should fail clearly, not half-load

### 5. Tooling does not own runtime behavior

Scripts for SVG generation, validation, bundling, or operator generation may prepare assets and data, but they must not become the only place where runtime gameplay meaning exists.

Tool-assisted runtime asset search is acceptable, but:

- search tools return tagged candidates
- gameplay meaning still comes from ECS state and templates
- the tool should not become a hidden second rule engine

### 6. ECS owns authoritative gameplay state

For gameplay state, there must be one clear owner.

Rules:

- ECS world is authoritative for mutable simulation state
- UI stores may cache view state, selection, and presentation filters
- authored templates are authoritative for static gameplay configuration
- save files are snapshots, not alternate sources of truth

If the same gameplay fact exists in multiple writable places, that is a design bug unless the ownership and sync rule is explicitly documented.

## Allowed Dependency Flow

The intended dependency flow is:

1. `content/templates`
2. `content/requirements` and `content/effects`
3. `sim/components`
4. `sim/systems`
5. `app` and `ui`

Practical interpretation:

- systems may import templates and generic effect or requirement interpreters
- UI may read selectors or derived state built from ECS data
- UI should not import gameplay templates directly unless only for presentation metadata
- templates must not import systems
- save/load must not import UI

Registry rule:

- domain registries may stay split by file
- one validated aggregate registry may compose them
- do not turn that aggregate registry into a dumping ground for business logic

## Directory Ownership

### `sim/components`

- runtime data only
- no business logic
- no UI concerns
- no derived/cached presentation state unless it is truly simulation-relevant

### `sim/systems`

- all gameplay behavior lives here
- systems mutate ECS runtime state
- systems interpret requirements and effects
- systems should be narrow and named by responsibility, not by phase milestone

### `content/templates`

- authored content catalogs
- no runtime mutation logic
- no UI logic
- ids, tags, and payload shapes must validate before use

### `content/requirements.ts`

- generic requirement evaluation only
- examples: resource thresholds, building tier checks, staffing checks, room tag unlocks

### `content/effects.ts`

- generic effect application only
- examples: add capacity, unlock room tier, modify attraction, change payroll multiplier

### `app/` and `app/ui`

- presentation, interaction, and view-state only
- may dispatch intents
- may not implement gameplay rules
- the start screen, save-slot shell, and dev menu live here rather than leaking into simulation code
- no direct template mutation
- no direct save-schema mutation logic

### `save/`

- serialization, deserialization, migrations
- no content-specific gameplay branching
- round-trip tests belong near this layer

### `app/features`

- features should compose existing contracts
- a feature folder should not become a shadow architecture with its own rules
- feature code should still respect sim/content/app/save ownership

## Feature Slice Contract

Every gameplay feature should be implemented as a slice with the same checklist:

1. Runtime components
2. Systems
3. Templates
4. Requirement and effect support if needed
5. UI adapters and presentation
6. Save/load support if new runtime state is introduced
7. Validation or tests

Required review question for every slice:

- what is the authoritative owner of each new piece of state?

Example: building upgrades

- components: `BuildingInstance`, maybe `Upgradeable`
- systems: upgrade application, unlock reevaluation
- templates: building upgrade templates
- requirements: resource and tier checks
- effects: room unlocks, caps, capacity changes
- UI: upgrade buttons and requirement display
- save/load: persist current building tier and unlocked upgrades

## Parallel Agent Workflow

To support parallel AI work safely:

- split work by folder ownership
- minimize shared-file edits
- prefer many narrow files over god files
- establish stable contracts first: component names, template ids, effect payload shapes

Before parallel work starts on a feature, lock:

- runtime component names
- template ids or id prefixes
- command or intent names
- save fields if new persistent state is introduced
- validation expectations

Recommended parallel slices:

- one agent on components and system scaffolding
- one agent on templates and registries
- one agent on UI and selectors
- one agent on tests or validation

Avoid parallel work when the write surface overlaps heavily in:

- one giant registry file
- one giant system file
- a still-unstable component schema

## Anti-Sprawl Safeguards

The project should add lightweight guardrails early:

- linter baseline
- formatter baseline
- typecheck command in normal workflow
- central template registry
- template validation pass
- effect type registry
- requirement type registry
- tests that fail on unknown ids
- tests that fail on invalid template references
- save round-trip tests
- migration tests when save schema changes
- registry bootstrap test so content loads in a deterministic order
- tests that enforce command/intention boundaries where practical

Optional but recommended:

- lint rule or grep-based check for forbidden hardcoded content branching
- architecture review checklist for major feature additions
- validation for duplicate or low-quality SVG part tags
- cache tests for asset-search tooling
- grep or lint checks for forbidden direct ECS mutation in UI-facing code

## Orphaned Code Definition

Code is considered orphaned if it:

- implements gameplay behavior but is not called by any ECS system
- defines templates that are never registered or referenced
- adds UI logic for a feature with no runtime support
- adds save fields with no runtime owner
- adds one-off feature logic outside the standard feature slice

Orphaned code should be removed or integrated immediately. Do not let it accumulate.

## Preferred Implementation Style

- narrow systems
- explicit component ownership
- typed templates
- generic effects
- generic requirements
- stable ids
- small feature-focused files
- explicit ownership comments only where the boundary would otherwise be unclear

## Decision Rule

When adding new code, ask:

1. Is this runtime state?
2. Is this authored content?
3. Is this generic gameplay interpretation?
4. Is this presentation?
5. Is this tooling?

If the answer is unclear, do not implement yet. Resolve the ownership first.
