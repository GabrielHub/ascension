# Ascension Product Plan

## Premise

Ascension is a management sim about building a dungeon-clearing guild in near-future New York City. The player starts with a shabby, improvised headquarters and gradually becomes a major civic and commercial power. The fantasy is not direct combat. The fantasy is recognition, leverage, logistics, and upward mobility.

## Product Constraint

The project should not be designed around a fixed list of buildings, rooms, resources, or upgrade paths. It should be designed around a reusable content model that makes those things easy to add, modify, and rebalance later.

The runtime engine should still follow normal ECS conventions. The reusable content model is authoring data consumed by ECS systems, not a replacement for ECS.

## Core Fantasy

The player should feel all of the following:

- I found talent before richer guilds did.
- I turned an embarrassing little operation into a serious institution.
- My building reflects my ambition.
- I send autonomous people into danger and live with the consequences.
- New York feels like a real place distorted by a new supernatural economy.

## Design Pillars

### 1. Management over action

The player does not control raids in moment-to-moment combat. They build systems, assess risk, and live with outcomes.

### 2. Place matters

This should feel like New York, not a generic fantasy city with modern props. Neighborhood identity, rent pressure, commute logic, and status signaling all matter.

### 3. Social recruitment is gameplay

The lounge or recruitment space is not decoration. It is the social funnel where talent appears, evaluates the guild, and decides whether the place feels worth joining.

### 4. Upward mobility is visual

The move from bodega to office to building to tower should be a visible, emotional progression, not just a bigger spreadsheet.

### 5. Autonomy creates stories

Operators, visitors, and staff should be understandable but not fully controllable. The game is stronger if good and bad outcomes emerge from systems instead of scripted scenes.

### 6. People remember how they are treated

Short-term morale is not enough. The guild should accumulate a longer-term relationship state with operators over time. If the player treats people as disposable, that should eventually become a strategic liability.

## Setting and Tone

Near-future NYC, roughly 2035. Familiar infrastructure remains intact, but dungeon breaches, ranked superhumans, and guild branding have become normalized. Early game should feel improvised, underfunded, and gritty. Late game should feel glossy, politically connected, and faintly unsettling.

The style direction remains bold, flat, and slightly stylized. Gameplay readability matters more than proving an AI-art pipeline from day one.

## Visual Generation Direction

Do not rely on the runtime model to invent full character SVGs on demand. That makes visual consistency, validation, and cost control harder than they need to be.

Instead, use a modular character kit:

- pre-generated SVG parts for hair
- body bases and silhouettes
- faces and facial details
- clothing layers
- accessories
- class or role signifiers
- color and palette variants
- a small set of animation-ready pose templates

The game can then assemble operators from those parts while the cheaper runtime model focuses on easier outputs:

- names
- stats
- traits
- short backstories
- structured personality tags
- optional part-selection suggestions

The intended runtime flow is:

1. The model generates operator metadata first.
2. The model or orchestration layer searches the local SVG-part library through a tool.
3. Search results return tagged candidate parts such as hair, face details, clothing, weapons, and accessories.
4. The model selects from those candidates instead of drawing raw SVG.
5. The client assembles the final operator visual from the selected parts.

This requires the part library to be heavily tagged so search is useful. Example tags:

- `red-hair`
- `female`
- `scar`
- `formal-jacket`
- `streetwear`
- `medic`
- `heavy-weapon`
- `gold-accessory`

The search/tool layer should be cached so repeated metadata or search combinations do not cause unnecessary repeated work.

## Content Model First

The plan should treat these as content categories, not hardcoded game rules:

- building types
- building upgrades
- room types
- room upgrades
- resources
- operator traits
- dungeon types
- unlock conditions
- gameplay effects

The initial content slice may be:

- one building type: `bodega`
- one active resource: `cash`
- a small set of room families

But those are only the first authored entries. They should not define the architecture.

## ECS Convention

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

Examples of authored templates outside ECS:

- building templates such as `bodega`
- room family templates such as `recruitment_space`
- upgrade templates
- resource templates such as `cash`

Those templates are referenced by ids from runtime components. They are not themselves ECS entities by default.

## Terminology

| Term          | Definition                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Superhuman    | A powered person in the general population.                                                       |
| Operator      | A superhuman signed to the guild and available for raid assignment.                               |
| Staff         | Non-powered workers who keep the guild operating.                                                 |
| Guild         | An organization that recruits and deploys operators for dungeon work.                             |
| Breach        | A small-scale early-game dungeon incident.                                                        |
| Raid          | A team deployment resolved by simulation, not direct control.                                     |
| Resource      | A tracked currency or material used by systems such as payroll, upgrades, crafting, or contracts. |
| Cash          | Conventional money used for wages, rent, upkeep, and contracts in the MVP.                        |
| Mana crystals | A later resource used for magical tech, crafting, and high-end upgrades.                          |
| Rank          | E through S. Applies to people, dungeons, and guild reputation tiers.                             |

## Economy Direction

The key requirement is not "one resource" or "two resources." The key requirement is that the resource system is generic.

For MVP:

- ship with `cash` only
- make all costs and rewards flow through a generic resource ledger
- allow later resources to be added without rewriting room, upgrade, or reward systems

That means the real architecture should support:

- any number of resources
- multiple resource costs on one action
- resource-gated unlocks
- future resource production and consumption chains

For ECS purposes, the default assumption should be:

- resources are tracked as balances on guild-level runtime data
- physical world pickups or nodes can become separate entities later if needed

## Core Loop

1. Improve the guild's public-facing spaces so better talent visits.
2. Recruit operators whose expectations match the guild's current status.
3. Hire enough staff to keep facilities functional and morale stable.
4. Assign raid teams to breaches and dungeons on the city map.
5. Resolve raids through simulation based on rank fit, composition, traits, gear, intel, and randomness.
6. Convert success into resources, experience, and reputation.
7. Spend those gains on capacity, better conditions, and better odds.
8. Repeat until the current building is operationally and socially outgrown.

## Early Pressure Model

For the first playable, threat escalation should be tied primarily to reputation rather than to a broad multi-resource simulation.

That means:

- better performance and higher visibility should attract harder opportunities and greater scrutiny
- the guild should feel pressure because it is becoming known, not just because numbers are going up
- cash pressure still matters, but reputation is the cleaner first-pass driver of external escalation

The world should also have a lightweight event-pressure layer from the start:

- hardcoded story events are acceptable for MVP
- event pacing should still be systematic rather than purely random
- events should be able to react to reputation, cash pressure, recent losses, and roster health
- this is infrastructure now, not a late flavor system

## Building Progression

Buildings should be treated as a top-level progression type with their own definition data, upgrade tracks, capabilities, limits, and unlock conditions.

The important architectural point is:

- a building is not just a backdrop
- a building has its own progression state
- building upgrades can unlock new room slots, room tiers, room caps, and facility rules
- room upgrades can also be constrained by building tier

This matches the intended example:

- a low-tier recruitment space might begin as a message board or waiting area
- upgrading the room can improve it only to its current building ceiling
- upgrading the building can unlock a higher room tier such as a bar
- a later building can unlock a further tier such as a club

That relationship should be expressed through generic unlock and requirement systems, not handwritten code for each named room.

Building progression should work in two stages:

1. In-place building tier upgrades that expand the current building's capabilities.
2. Relocation to a new building entity once the current building reaches its maximum potential.

Relocation should feel like a systemic milestone with higher difficulty, broader systems, and a meaningful jump in the game world.

It should not be treated as a pure layout swap. A relocation should carry operational disruption and world-state consequences such as:

- changed neighborhood pressure and opportunities
- operator and staff reactions to the new location
- new social and economic expectations

Relocation should always be player-chosen, never forced. If the guild cannot sustain its current building obligations and hits a lease, rent, or eviction failure state, that should be treated as a loss condition rather than as an automatic move to the next building.

When the player relocates, they should move into a prebuilt initial layout rather than copying the old floorplan tile-for-tile or rebuilding from a blank shell. The new building should arrive with a curated starting configuration that reflects the new tier and the systems already unlocked.

The new building should be fully operational immediately. Ongoing raids are not rewritten mid-run by the move, but returning teams should come back into the new building state and absorb any resulting social or operational consequences there.

In ECS terms:

- the player's current headquarters is a runtime entity
- its components hold current tier, unlocked upgrades, capacity state, and references to a building template id

## View Model

The floor-by-floor top-down view is the right primary view. It keeps the simulation legible and avoids the clutter of always rendering a full tower cutaway.

Recommended supporting views:

- floor view for most play
- compact building overview for alerts and occupancy
- city map overlay for raid selection and travel context
- raid watch view for observing active fights in a zoomed-out tactical style
- operator profile/detail view for richer character presentation

## Start Screen

The project should begin with a real start screen, not just an in-game prototype dropped directly into the sim.

This screen should establish the visual language of the project and provide the top-level entry points for:

- new game
- load save
- delete save
- data management
- development tools or dev menu access

Why this matters:

- it creates a stable first impression and design anchor
- it forces save-slot structure to be defined early
- it gives development features a deliberate home instead of scattering debug affordances through the game UI
- it gives the project a usable shell before the full simulation exists

The start screen should feel like part of the game, not an afterthought utility menu.

For MVP, save-slot metadata should stay minimal and practical:

- guild name
- created at
- last played

## Raid Watch Mode

Ascension should include a "watch" mode for raids.

The intent is:

- no direct control
- no full action-combat presentation
- a zoomed-out, highly legible tactical view
- something closer to an expanded minimap than a traditional combat screen
- teams and enemy groups should read as abstract map markers first, such as colored dots with lightweight labels or status marks
- richer data should only appear when the player clicks a team marker to inspect that team
- detailed portraits, logs, and focused action context belong to the inspection layer, not the base raid-watch layer

When the player clicks into a team, the raid view should shift into a focused inspection state rather than just opening a detached side panel. That focus state is the right place for:

- operator portraits
- enemy portraits or threat cards
- live action logs
- HP, status, and cooldown context
- more detailed part-by-part animation

The player should still remain a pure observer in this state. Focus mode reveals more information, but it does not unlock mid-raid commands or tactical intervention.

Enemy presentation should stay grouped even when focused. A boss encounter is still a threat group, just with one member.

This plan is intentionally defining behavior and information exposure, not final visual styling. The implementation pass can decide exact composition, spacing, and look as long as the raid watch view stays minimal by default and the clicked-team state becomes a focused richer inspection mode.

## Rooms

Rooms should be data-driven facilities that reference:

- a room type definition
- a room tier or upgrade level
- a set of requirements
- a set of effects
- optional staffing rules
- optional building-tier constraints

That lets the same room family evolve over time without special-case code.

Example:

- `recruitment_space:tier_1` -> message board
- `recruitment_space:tier_2` -> bar
- `recruitment_space:tier_3` -> club

Each tier can have different:

- visuals
- costs
- staffing requirements
- visitor attraction weights
- morale bonuses
- unlock requirements

In ECS terms:

- each placed room is a runtime entity
- it stores room family id, current tier, staffing state, occupancy, and operational state in components
- systems evaluate requirements and apply effects each tick or on state changes

## Operators and Staff

Operators should have:

- rank
- role or archetype
- a basic attack
- a skill
- an ultimate
- passive abilities
- core stats
- trait
- salary expectations
- morale
- loyalty
- injury state
- lightweight backstory and visual identity

Their visual identity should come from a compositional asset recipe rather than a fully generated one-off SVG. An operator record can store selected part ids, palette ids, animation set ids, and currently equipped visual gear ids.

Part selection should use a hybrid approach:

- core silhouette-defining choices should be deterministic from metadata
- secondary accessories, accents, or variants can be chosen from constrained pools

Equipment changes should be able to update both:

- runtime metadata such as equipped weapon or gear records
- visible SVG composition so new weapons, armor, or accessories actually appear on the operator

Operators should effectively have two presentation contexts:

- a default or casual appearance used in headquarters and other non-raid contexts
- a raid appearance assembled from equipped visible gear when deployed

This reduces everyday rendering complexity while still letting raid preparation and progression show up visually where it matters.

Staff should stay simpler than operators. They are operational dependencies, not co-equal tactical units.

Operators in the MVP should already behave as autonomous needs-driven agents. The player does not micromanage them. The player provides spaces, upgrades, incentives, and conditions that shape their behavior.

Morale and loyalty should stay distinct:

- morale is the short-term condition layer
- loyalty is the longer-term memory and trust layer

Loyalty should accumulate through patterns of treatment such as:

- pay consistency
- recovery time
- overwork or repeated high-risk assignments
- visible investment in facilities and safety
- favoritism or disregard for specific operators

It does not need full balance complexity on day one, but it should exist in the architecture now so it can influence retention, performance, and recruitment reputation later without being bolted on.

Examples:

- an operator with a training-focused trait will spend disproportionate time in training spaces
- an operator with recovery or comfort preferences will prioritize better lounge, clinic, or quarters access
- operators should move between rooms to satisfy needs and preferences without direct control
- operator growth through training should be real but deliberately capped and slow, so recruiting stronger operators remains strategically important

### Needs Model

For the first playable, operators should have a lightweight but real needs model.

Recommended first-pass needs:

- training
- rest
- recovery
- socialization
- prestige or comfort

Each need should map to room families and upgrades.

Examples:

- training -> training rooms and training upgrades
- rest -> quarters quality and comfort upgrades
- recovery -> clinic tier, medical staff, recovery upgrades
- socialization -> lounge quality, bar tier, entertainment upgrades
- prestige or comfort -> premium amenities and higher-end environment upgrades

### Scheduling Model

The recommended behavior model is a hybrid:

- light schedule blocks provide a baseline daily routine
- needs and urgent conditions can interrupt that routine

This gives operators enough routine to feel believable without turning the sim into a heavy life-management game.

## Raid Resolution

The player should assemble teams, choose where to send them, and read outcomes. The sim should care about:

- rank match
- team composition
- operator traits
- operator abilities
- gear quality
- dungeon intel quality
- fatigue, morale, and injuries

The player should not micromanage combat.

Mission types should stay intentionally small in the first playable, but the schema should be open-ended.

Recommended MVP mission set:

- clearance
- containment
- extraction

Additional mission types should be added as content later without requiring new architectural patterns.

Raid logs in the focused view should use a mixed style: structured and programmatic underneath, but rendered in readable gameplay language rather than as raw debug text.

Pre-raid intel should expose a simplified confidence label to the player, backed by a real underlying confidence value in the simulation or content data.

Recommended early intel presentation:

- estimated threat rank
- likely threat tags
- confidence label such as `low`, `medium`, or `high`

Intel mismatch should only be surfaced after a raid when it materially affected the outcome or meaningfully explains what happened.

The broader intel-improvement system should wait until the next building phase rather than becoming a major bodega subsystem.

For MVP, a raid can be pre-resolved when it starts. The player never controls it mid-run, so the practical requirement is not a full live combat sim. The game can generate a hidden resolution packet at dispatch time and reveal that outcome over time through the raid watch and focused inspection views.

The important constraint is:

- the saved result is durable and authoritative
- the reveal layer is programmatic and derived from that result
- the player only sees the outcome when the raid finishes or as the focused inspection view progressively exposes it

Ascension should treat operator death as permanent. This is part of the intended roguelike pressure and should happen often enough to matter. Roster churn, loss, recovery, and rebuilding are core to the game loop.

Operator progression should not erase that pressure. Stat growth should have hard caps, and some attributes should improve very slowly. The design goal is that investing deeply in one operator feels exceptional and emotional, not routine roster maintenance.

## MVP Scope

The MVP is "Bodega Operations," not "Ascension complete."

It should include:

- one generic building system with a single playable building instance
- one playable floor
- a small room catalog implemented as generic room definitions
- visitors and recruitment
- staffing and room activation
- a simple city map
- a raid watch mode
- click-to-focus raid inspection with grouped threat cards, live mixed-style logs, and no player intervention
- short breach raids
- a generic resource system with `cash` in the early game
- a generic upgrade and effect system
- a lightweight but real morale-plus-loyalty model
- needs-driven autonomous operator schedules
- a hardcoded-but-systematic event or storyteller skeleton
- a stable economy loop
- modular operator visuals assembled from a shipped parts library
- context-aware operator appearance resolution so headquarters views can stay casual while raid-focused views reflect visible equipped gear
- save/load

It should not include:

- rival guild simulation
- full relocation system
- A-rank and S-rank content
- live AI narration as a required system
- AI-generated portraits or scene art as an active runtime dependency
- runtime full-SVG character generation
- tower-scale multi-floor management
- AI-written weekly narrative reports as a required system

## Success Criteria

The project is ready to expand beyond the bodega when these are true:

- adding a new resource or room tier is mostly content work, not architecture work
- building upgrades and room upgrades interact through generic requirement rules
- recruiting feels meaningfully different from just buying units
- staffing mistakes create understandable failure states
- raid assignment has tension but not opacity
- the economy creates pressure without instant death spirals
- the player wants the next building tier for strategic reasons, not just because the doc says it exists
