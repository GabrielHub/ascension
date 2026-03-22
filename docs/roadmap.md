# Ascension Roadmap

The product plan owns future gameplay and system decisions.
The world foundation owns future-facing content, tone, and copy reference.
This roadmap owns rollout order, transitional scope, and the explicit difference between a lighter current implementation and a deeper intended future one.

## Roadmap Rules

- The roadmap is a living source document. If the intended product direction changes, update this roadmap in the same pass as the product plan and any affected world-foundation framing.
- If a system exists in data before it fully affects gameplay, the roadmap should state what is already active, what is only a lightweight foundation, and what deeper behavior is still deferred.
- Phase plans should point back here when they stage lighter-now implementation that is meant to deepen later.

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
- The current runtime relationship model is dense pairwise operator state; that is now known transitional debt against the intended hybrid social model.
- Operators autonomously evaluate raid opportunities, form teams, launch raids, and return with persistent summaries.
- Active raid packets, hidden resolution data, and collapsed raid history persist through saves.
- Permanent operator death and roster replacement pressure are already implemented.
- Pressure events are generated from runtime state rather than hand-authored UI triggers.
- Operator portraits use the shipped modular recipe-based SVG pipeline, including visible gear overlays where present.
- The bodega now renders in a world-first HQ view with overlay UI, zoom/pan camera rules, and in-world operator, staff, and visitor markers.
- The operations view now presents the secured active contract site as a full-screen raid map with fog of war, team goals, focus overlays, and persisted raid presentation state.
- HQ environment metadata, raid environment metadata, and visual review tooling are shipped; the current runtime presentation intentionally mixes asset-backed data with localized hand-authored composition where that keeps the slice stable and readable.

## Phase 1: Bodega World Rendering

Goal: finish the first playable slice visually before deepening or expanding it.

Status as of 2026-03-22:

- The slice is playable, visually present, and internally green.
- HQ world rendering and the current raid map presentation are accepted as sufficient completion for Phase 1.
- Remaining presentation cleanup belongs in Phase 2 only where it materially supports new gameplay or removes a concrete maintenance problem.

Deliverables:

- the bodega headquarters is rendered as the actual game world, not just abstract room cards plus a schematic canvas
- authored HQ environment assets exist for the bodega shell, tileable angled/isometric room modules, structure pieces, props, background elements, and interior composition rules
- HQ environment composition is layered as shell/perimeter assets, structural kits, room recipes, prop kits, and building-theme specs rather than monolithic room scenes
- headquarters play is world-first and full screen, with UI layered over the rendered world instead of boxing the world into a secondary panel
- rooms read as real spaces in the world view, not only as labeled rectangles
- the approved HQ environment language is an angled/isometric interior presentation with visible floor and wall planes, and the approved HQ room contract is tileable shared-grid modules rather than standalone room dioramas
- the approved HQ asset model is compositional: room definitions do not each own their own full wall/floor box when they are intended to assemble into one connected building
- operators render inside the headquarters world in a way that matches the current operator portrait/style language
- the operator asset pipeline is upgraded from fixed portrait presets to authored modular parts for at least head shape, hair, eyes, face details, and body silhouette, with deterministic assembly and seeded default operators for the initial roster
- initial operators and default seeded recruits are deliberately authored and locked so the slice proves real character identity, not only hashed placeholder variation
- raid-facing map assets exist for the first playable raid presentation layer as flat top-down minimap tiles, fog, features, and markers, even if raid presentation remains lighter than HQ
- the headquarters renderer consumes simulation state and room/building templates without inventing gameplay rules
- camera, framing, zoom, and panning rules are locked for the bodega slice so later UI work builds on the right presentation model, including a full-floor max zoom, a restrictive room-scale close zoom, and focus highlighting that does not recenter the camera
- first-pass lighting is present only as a pragmatic presentation layer such as baked shading, a light shared shadow pass, emissive props, or simple masks; do not begin a full custom lighting shader until the environment art, camera, and composition rules are stable
- room inspection, roster, and operations overlays remain legible on top of the world-first presentation
- raids support autonomous goal-driven team behavior such as looting, exploring, intel gathering, hunting, or boss attempts within the guild's one secured active contract site, rather than a single always-clear-everything flow
- the active dungeon is the currently secured government contract; it only closes when its boss is defeated or the contract is lost, while ordinary enemies continue to respawn
- early contract failure should be survivable in the opening slice, with harsher organizational consequences layered in later phases
- the runtime stops behaving like a rotating multi-opportunity board and instead reflects one secured active contract site
- the tag taxonomy is remediated enough that `role:`, `staff:`, `room:`, `focus:`, and `archetype:` no longer blur together in current-facing Phase 1 surfaces
- a first-pass shared seeded uncertainty utility exists for current autonomous decisions and weighted resolution, even if richer system use comes later
- SVG asset experimentation tooling is generalized beyond operators so any shipped SVG asset class can be iterated and reviewed
- the Phase 1 slice establishes the compositional HQ asset contract and leaves deeper renderer cleanup for later only if future work proves it necessary
- the slice ends with a narrative-and-content remediation pass that locks world rules, copy direction, and document boundaries against the actual implemented game direction

Exit criteria:

- the player can understand the bodega as a place, not just as a set of management panels
- the initial operator roster looks intentionally authored and visually distinct in-world, not like temporary stand-ins
- the environment kit is broad enough to build the full bodega slice and the first raid spaces without returning to abstract placeholder blocks
- the world view is strong enough that further slice improvements build on the intended visual direction instead of a placeholder shell
- the slice proves the intended relationship between simulation, rendering, and overlay UI before Phase 2 balancing and depth work begins

## Phase 2: Bodega Depth

Goal: make the first phase replayable and legible.

Deliverables:

- keep HQ presentation cleanup incremental: only extract more runtime composition metadata when Phase 2 work proves the current localized renderer wiring is getting in the way
- keep raid presentation aligned with the accepted React/Tailwind top-down map UI, not a required canvas or manifest-driven renderer
- use shipped HQ and raid asset metadata where it materially helps runtime or tooling, but do not force contract-purity refactors that risk regressions without clear Phase 2 value
- align in-world operator marker silhouettes with authored operator identity/body-language data instead of falling back to a generic build when role tags do not match the portrait-era archetype names
- morale affects willingness, raid performance, and HQ behavior instead of remaining mostly descriptive state
- loyalty affects retention, refusal risk, and tolerance for bad conditions instead of remaining mostly dormant state
- needs and injury affect scheduling, readiness, room use, and staffing pressure in visible ways
- the dense pairwise relationship model is replaced with the first shipped hybrid social model: operator disposition, sparse symmetric notable ties, recurring-team memory, and first-pass room culture
- recurring teams persist as social units with cohesion, shared history, and damaged-state behavior, even before later naming and lock-in depth lands
- damaged teams resolve through the shared uncertainty utility, defaulting toward autorepair unless weighted conditions push disband
- room culture begins affecting recovery, comfort, social behavior, and event tone instead of acting only as flavor
- room culture is surfaced first through summaries, labels, behavior, and events rather than a fully exposed raw-stat UI
- injuries and recovery deepen beyond raw timers into gameplay-visible consequences
- better notifications and event log
- better explanation surfaces for why operators accepted, refused, regrouped, quit, or changed behavior
- better raid composition logic
- the shared uncertainty utility expands beyond first-pass raid behavior into broader operator, event, and HQ decision-making
- first pass balance tuning
- more operator and staff content variety
- at least one additional room family tier added through content definitions

Exit criteria:

- the game supports multiple viable early strategies
- failure states are understandable, not arbitrary
- social and emotional state changes are legible enough that players can explain why autonomy changed

## Phase 3: Office Expansion

Goal: prove that scale changes gameplay, not just numbers.

Deliverables:

- second building definition and upgrade path
- relocation event framed as a systemic milestone, not just a map swap
- prebuilt initial layouts for new building phases
- multi-floor support
- office-tier rooms
- recurring teams deepen into stronger lock-in, more persistent identity, and explicit player-visible naming once a team's identity has proven stable
- established teams and rooms develop recognizable culture that affects new-hire integration and staffing choices
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
- richer gear and crafting built around authored recipe families, resource families, and rare site-specific materials
- additional resources beyond `cash` if needed
- faction or contract pressure
- city institutions begin pushing through licensing/compliance, labor and worker-safety oversight, emergency-response containment, and borough-level political or contract pressure
- richer social fallout from guild reputation, contract performance, operator death, and room/team culture
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
