# Ascension Roadmap

## Already Implemented

This section is intentionally summary-level. The implementation itself is the source of truth.

- `Vite+`, React, and React Router are in place for the local-first client shell.
- The start screen supports new game, load, delete, preview/dev access, and SVG tooling entry points.
- IndexedDB-backed save slots, slot metadata, schema migration, and strict save validation are implemented.
- The template registry covers resources, buildings, rooms, upgrades, missions, and events with deterministic validation.
- The playable bodega slice exists with seeded rooms, operators, staff, visitors, and headquarters state.
- The ECS runtime owns guild, time, building, room, operator, staff, visitor, raid, relationship, and event state.
- The stable gameplay command surface includes ticking time, placing rooms, toggling room activation, buying upgrades, recruiting, hiring staff, and assigning staff.
- Room progression is data-driven through building and room upgrades plus generic requirement and effect evaluation.
- Operators already have needs, morale, loyalty, injury, schedule, preference, and relationship state.
- Operators autonomously evaluate raid opportunities, form teams, launch raids, and return with persistent summaries.
- Active raid packets, hidden resolution data, and collapsed raid history persist through saves.
- Permanent operator death and roster replacement pressure are already implemented.
- Pressure events are generated from runtime state rather than hand-authored UI triggers.
- Operator portraits use the shipped preset-based SVG pipeline, including visible gear overlays where present.

## Phase 1: Bodega World Rendering

Goal: finish the first playable slice visually before deepening or expanding it.

Deliverables:

- the bodega headquarters is rendered as the actual game world, not just abstract room cards plus a schematic canvas
- authored environment assets exist for the bodega shell, room cross-sections, room kits, props, fixtures, and interior composition rules
- headquarters play is world-first and full screen, with UI layered over the rendered world instead of boxing the world into a secondary panel
- rooms read as real spaces in the world view, not only as labeled rectangles
- operators render inside the headquarters world in a way that matches the current operator portrait/style language
- the operator asset pipeline is upgraded from fixed portrait presets to authored modular parts for at least head shape, hair, eyes, face details, and body silhouette, with deterministic assembly and seeded default operators for the initial roster
- initial operators and default seeded recruits are deliberately authored and locked so the slice proves real character identity, not only hashed placeholder variation
- raid-facing environment assets exist for the first playable raid presentation layer, even if raid presentation remains lighter than HQ
- the headquarters renderer consumes simulation state and room/building templates without inventing gameplay rules
- camera, framing, zoom, and panning rules are locked for the bodega slice so later UI work builds on the right presentation model
- first-pass lighting is present only as a pragmatic presentation layer such as baked shading, layered shadows, emissive props, or simple masks; do not begin a full custom lighting shader until the environment art, camera, and composition rules are stable
- room inspection, roster, and operations overlays remain legible on top of the world-first presentation

Exit criteria:

- the player can understand the bodega as a place, not just as a set of management panels
- the initial operator roster looks intentionally authored and visually distinct in-world, not like temporary stand-ins
- the environment kit is broad enough to build the full bodega slice and the first raid spaces without returning to abstract placeholder blocks
- the world view is strong enough that further slice improvements build on the intended visual direction instead of a placeholder shell
- the slice proves the intended relationship between simulation, rendering, and overlay UI before Phase 2 balancing and depth work begins

## Phase 2: Bodega Depth

Goal: make the first phase replayable and legible.

Deliverables:

- improved operator traits and morale
- loyalty starts to matter through retention and behavioral pressure, not just as dormant data
- injuries and recovery
- better notifications and event log
- better raid composition logic
- first pass balance tuning
- more operator and staff content variety
- at least one additional room family tier added through content definitions

Exit criteria:

- the game supports multiple viable early strategies
- failure states are understandable, not arbitrary

## Phase 3: Office Expansion

Goal: prove that scale changes gameplay, not just numbers.

Deliverables:

- second building definition and upgrade path
- relocation event framed as a systemic milestone, not just a map swap
- prebuilt initial layouts for new building phases
- multi-floor support
- office-tier rooms
- deeper intel gathering and intel-improvement systems
- better recruitment expectations
- broader dungeon pool
- more complex staffing demands

Exit criteria:

- moving to the next building changes how the player allocates space, labor, and money
- the second building tier mostly feels like added content, not rewritten infrastructure

## Phase 4: Midgame Systems

Goal: add the features that create external pressure.

Deliverables:

- reputation-based threat escalation
- better district-level city map logic
- richer gear and crafting
- additional resources beyond `cash` if needed
- faction or contract pressure
- optional weekly AI-generated narrative reports built from saved raid summaries and guild state

Exit criteria:

- the world pushes back instead of acting like a passive mission board

## Deferred Until Proven Necessary

- S-rank endgame content
- tower-scale 20+ floor management
- live premium operator generation
- FAL-style AI image generation for portraits and scene art as core systems; if external image generation is explored later, constrain portraits to S-rank operators so cost stays bounded and those operators get a uniquely prestigious presentation layer
- heavy procedural narrative systems
- fully simulated rival headquarters interiors

## Practical Build Order

1. Completed: get the content-definition infrastructure working.
2. Completed: get the bodega playable on top of that infrastructure.
3. Finish the bodega visually.
4. Make the bodega good.
5. Expand the building scale.
6. Add systemic competitors.
7. Add prestige content.

That order matters more than any specific library choice.
