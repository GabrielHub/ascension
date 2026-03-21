# Ascension Roadmap

## Phase 0: Preproduction

Goal: prove the stack and lock the production shape of the first playable slice.

Deliverables:

- public GitHub repository is initialized with the baseline project structure so roadmap work can be committed incrementally
- repository setup instructions exist for the few manual steps that must happen before agent-driven code work
- Vite 8 app boots reliably with React and TypeScript
- linting, formatting, and typechecking are installed and runnable before broader feature work starts
- Start screen exists with new game, load save, and delete save flows
- Start screen includes the save-slot shell and a dev-menu entry point, while feature-specific dev tools remain deferred until each feature exists
- local save infrastructure exists with IndexedDB plus manual import/export
- Canvas floor view mounts inside the app shell
- Hybrid rendering boundaries are documented and tested at a prototype level
- Basic camera, selection, and grid rendering work
- Save/load round-trip works
- Typed template registries exist for resources, buildings, rooms, and upgrades
- Template registries also cover missions and early event definitions
- Generic requirement and effect evaluation works on at least one simple path
- Architecture rules are documented and reflected in folder structure
- Stable id conventions, command boundaries, and singleton ownership rules are documented before broader feature work begins
- One content bundle can be loaded from disk
- The first modular SVG parts bundle can be validated and assembled into an operator visual
- Tagged SVG-part search works through a cached local tool path
- Event or storyteller scaffolding exists with hardcoded event definitions and deterministic validation
- Morale and loyalty are both represented in the baseline runtime model

Exit criteria:

- no critical build instability from the toolchain
- lint, format, and typecheck can run as baseline quality gates
- no unresolved decision about ECS vs non-ECS state boundaries
- adding a second room or upgrade definition does not require architectural changes
- the project has a stable shell for normal play and development entry points
- the repository workflow is in place early enough that roadmap milestones can be committed cleanly as they land
- registry validation and save round-trip validation are part of the baseline infrastructure

## Phase 1: Bodega Vertical Slice

Goal: prove the management loop.

Deliverables:

- one playable building instance built from generic building templates
- one playable floor
- room placement and upgrades driven by generic room and upgrade templates
- visitor arrival logic
- operator recruitment flow
- staff hiring and room activation
- needs-driven schedules and movement
- morale and loyalty both affect the early management loop
- a small event pool applies external pressure through the storyteller skeleton
- operator profiles with richer SVG detail presentation
- raid watch mode with zoomed-out tactical readability and click-to-focus team inspection
- metadata-to-part-search-to-assembly operator generation works in-game
- short breach assignments
- a small mission set built from generic mission definitions
- raid results and economy loop using the generic resource system with `cash`
- operator visuals assembled from shipped SVG parts, not live raw SVG generation
- permanent operator death and roster replacement pressure are present in the loop
- equipment changes can update both operator data and visible composed visuals
- headquarters views keep operators in casual/base appearance while raid-focused views can resolve visible raid gear
- pre-raid intel uses confidence labels, while deeper intel systems remain deferred beyond the bodega phase

Exit criteria:

- the player can lose due to bad management
- the player can stabilize and grow through good decisions
- the loop is fun without office or tower content

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
- AI-generated portraits and scene art as core systems
- heavy procedural narrative systems
- fully simulated rival headquarters interiors

## Practical Build Order

1. Get the content-definition infrastructure working.
2. Get the bodega playable on top of that infrastructure.
3. Make the bodega good.
4. Expand the building scale.
5. Add systemic competitors.
6. Add prestige content.

That order matters more than any specific library choice.
