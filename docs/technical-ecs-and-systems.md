# Ascension ECS and Systems

## Runtime Model

The engine should work like a standard entity-component-system:

- entities are runtime things in the world
- components are pure data
- systems run over entities matching component sets

Examples of runtime entities:

- the guild HQ
- placed rooms
- operators
- staff
- raid instances

Authored templates outside ECS include:

- building templates
- room templates
- upgrade templates
- resource templates
- trait and ability definitions

Those templates are referenced by ids from runtime components. They are not themselves ECS entities by default.

## Authoritative Singletons

Certain world-level concepts should use explicit singleton-style entities rather than being smeared across unrelated state:

- guild or headquarters state
- world time and calendar state
- active building or relocation state
- global resource balances if they are guild-owned

Recommended rule:

- one authoritative entity per singleton concern
- components on that entity own the mutable data
- other systems read from queries, not duplicated mirrors

## Layer Split

Use three layers:

- `Templates`: authored content such as buildings, rooms, upgrades, resources, and effects
- `Instances`: actual ECS runtime state referencing those templates
- `Systems`: logic that interprets runtime data and templates

UI should talk to the simulation through typed intents or commands rather than arbitrary direct mutation.

## Template Authoring

TypeScript-authored definitions are the default.

Benefits:

- compile-time safety
- easier refactors
- IDE autocomplete
- simpler validation while abstractions are still moving

Recommended template categories:

- `resourceTemplates`
- `buildingTemplates`
- `buildingUpgradeTemplates`
- `roomTemplates`
- `roomUpgradeTemplates`
- `traitDefs`
- `abilityDefs`
- `dungeonDefs`
- `missionDefs`
- `eventDefs`

Registry composition rule:

- keep template files split by domain
- compose them through one validated aggregate registry
- keep validation deterministic so startup failures are obvious

## Generic Upgrade Model

Upgrades should be generic configurable effect bundles.

Recommended style:

- explicit effect types for core gameplay behavior
- limited typed generic modifiers where needed
- no loose script-like payloads

### First-pass requirement taxonomy

- `resource_min`
- `building_tier_min`
- `room_count_min`
- `room_tier_min`
- `staff_role_min`
- `operator_count_min`
- `template_tag_required`

### First-pass effect taxonomy

- `add_room_slot`
- `unlock_room_template`
- `unlock_room_tier`
- `modify_room_capacity`
- `modify_need_rate`
- `modify_attraction_weight`
- `modify_recovery_rate`
- `modify_training_rate`
- `modify_morale`
- `modify_resource_income`
- `modify_resource_cost`
- `grant_operator_slot`
- `modify_loyalty`
- optional `modify_scalar` for tightly typed known paths

Every requirement and effect type used by templates must have:

- one canonical interpreter
- one validation path
- one documented payload shape

## Buildings as Progression

Buildings are top-level progression entities, but still use the generic requirement/effect machinery.

Rules:

- building upgrades gate room families, room tier ceilings, floor counts, and capacity
- relocation is always player-chosen
- failure to sustain the current building is a loss state, not a forced move
- destination buildings load from fixed prebuilt initial layouts
- the new building is fully operational immediately
- active raids continue under the state they launched with, but return into the new HQ state

Prebuilt office-phase layouts should be fixed, not parameterized by variation at this stage.

## Simulation Components Worth Having Early

- `Position`
- `Velocity` or path state
- `Renderable`
- `Guild`
- `ResourceBalances`
- `BuildingInstance`
- `RoomInstance`
- `Visitor`
- `Operator`
- `Staff`
- `Needs`
- `Preferences`
- `ScheduleState`
- `AbilityLoadout`
- `Cooldowns`
- `Morale`
- `Loyalty`
- `Salary`
- `RoomOccupancy`
- `Assignment`
- `RaidParticipant`
- `Injury`
- `EventState`
- `RecentOutcomeMemory`
- equipment slots and equipped item references

Avoid component sprawl by preferring:

- one component per coherent runtime concern
- ids and scalar data in components
- external templates for authored meaning

Do not create new components just to mirror UI labels or template-derived facts.

Training and advancement rules:

- stat growth is hard-capped
- some attributes should progress very slowly
- recruitment remains the main path to stronger rosters

Morale and loyalty rule:

- morale handles short-term condition swings
- loyalty handles longer-term trust and relational memory
- the two systems may influence each other, but they are not the same component or the same tuning problem

## System Design

Recommended tick groups:

1. Time and scheduling
2. Spawning and despawning
3. Requirement evaluation and unlock checks
4. Room operational status
5. Schedule block planning
6. Needs and utility scoring with interrupt checks
7. Path request generation
8. Movement resolution
9. Raid timers and outcome resolution
10. Economy and payroll
11. Event pacing and event dispatch
12. Reputation, morale, and loyalty
13. Animation bookkeeping
14. Rendering

Pathfinding should use queued requests and cached floor walkability, not full A* every frame for everyone.

Command boundary rule:

- systems own simulation consequences
- command handlers or app/sim glue may validate and enqueue actions
- command handlers should not become alternate gameplay rule engines

## Early Pressure Model

For the first playable, external escalation should be driven primarily by reputation.

That means:

- better performance and visibility attract harder work and greater scrutiny
- the guild feels pressure because it is becoming known
- cash pressure still matters, but reputation is the cleaner first-pass driver

The event layer should exist from the first playable:

- hardcoded event definitions are acceptable initially
- event selection should still be driven by world state
- event pacing should be able to look at reputation, cash pressure, recent casualties, and similar pressure signals
- runtime AI narration is not required for this layer

## Mission And Event Schema

Mission architecture should stay small but extensible.

Recommended first-pass mission definitions:

- `mission/clearance`
- `mission/containment`
- `mission/extraction`

These should be normal template definitions with typed fields for:

- objective type
- expected threat tags
- reward shape
- intel configuration
- duration or pacing assumptions

The storyteller or event system should also use normal definitions rather than hardcoded one-off branching in random files.

Recommended early event categories:

- breach emergency
- personnel conflict
- contract deadline
- economic pressure
- public or regulatory scrutiny

## Core Implementation Now vs Later

Must exist now:

- ECS runtime structure
- template registries
- generic requirements and effects
- building progression state
- morale and loyalty as distinct runtime concerns
- event or storyteller skeleton with hardcoded definitions
- mission definitions for the first small mission set
- equipment slots in runtime data
- context-aware appearance resolution hooks
- singleton ownership for guild/time/building state
- deterministic registry validation
- typed command or intent boundaries between UI and simulation

Can wait as later content depth:

- more gear categories
- richer rival guild simulation
- broader intel-improvement systems
- more building variation within the same phase
- AI-generated event narration
- AI-generated portraits and scene art
