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
- The template registry covers resources, buildings, rooms, upgrades, items, missions, and events with deterministic validation.
- The playable bodega slice exists with seeded rooms, operators, staff, visitors, inventory, and headquarters state.
- The ECS runtime owns guild, time, building, room, operator, staff, visitor, raid, social, inventory, and event state.
- The stable gameplay command surface includes ticking time, placing rooms, toggling room activation, buying upgrades, recruiting, hiring staff, assigning staff, equipping gear, and trading on the market.
- Room progression is data-driven through building and room upgrades plus generic requirement and effect evaluation.
- Operators have needs, morale, loyalty, injury, schedule, preference, and relationship state, and those stats now drive readiness, refusal, quitting, recovery, and staffing pressure.
- The shipped social layer uses operator disposition, sparse notable ties, recurring-team memory, and room culture instead of relying on the old dense pairwise relationship model alone.
- Recurring teams persist as social units with cohesion, shared history, and damaged-state repair-or-disband behavior.
- Operators autonomously evaluate raid opportunities, form teams, launch raids, return with persistent summaries, and can permanently die or depart the guild.
- Active raid packets, hidden resolution data, collapsed raid history, and operator lifecycle changes persist through saves.
- Permanent operator death, operator departure, and roster replacement pressure are implemented.
- Pressure events are generated from runtime state rather than hand-authored UI triggers.
- The shipped interruption layer is runtime-owned: settings, incidents, and boss-commitment beats can freeze the simulation, persist when gameplay-authoritative, and restore cleanly through save/load.
- Interactive incidents now bind to runtime subjects, surface authored choices through blocking modals, resolve deterministic consequence bundles in simulation code, and persist through refresh/load.
- Operator portraits use the shipped modular recipe-based SVG pipeline, including visible gear overlays where present.
- The bodega now renders in a world-first HQ view with overlay UI, zoom/pan camera rules, and in-world operator, staff, and visitor markers.
- The operations view now presents the secured active contract site as a full-screen raid map with fog of war, team goals, focus overlays, and persisted raid presentation state.
- HQ and raid overlays use glass-card presentation, focused bottom-card inspection, compact category switching, and a persistent right-side event log.
- The event log is the always-on notice surface for departures, returns, injuries, deaths, morale and loyalty thresholds, staffing changes, resource swings, active-event changes, raid-result updates, team status, and room-culture updates.
- The UI exposes first-pass explanations for raid acceptance, refusal, regrouping, quitting, team damage, and accessory assignment.
- Shared uncertainty now influences raid resolution, damaged-team outcomes, operator departure checks, loot generation, and runtime event pressure.
- Stackable shared inventory, loot drops, the market, and automatic accessory selection are implemented for weapons, outfit overlays, accessories, and monster-part loot.
- Phase 2 content breadth is in place through authored gear families, loot families, additional room families for later tiers, and expanded operator/staff/runtime content definitions.
- The bodega uses the four bodega-native room identities from the world foundation, and training rooms remain gated to later headquarters tiers.
- The Phase 2 asset-production contract is documented and locked around canon-first briefs, recipe previews, modular production, props-only room scenes, controlled item variants, and viewer/playground review.
- HQ environment metadata, raid environment metadata, and visual review tooling are shipped; the current runtime presentation intentionally mixes asset-backed data with localized hand-authored composition where that keeps the slice stable and readable.
- The HQ exterior day-night pass is live in hybrid form: the simulation clock drives canonical `sunrise` / `day` / `sunset` / `night` phases, the HQ environment manifest owns the per-phase tint/fog/shadow values plus shell-relative backdrop zones, and the bodega still mixes in renderer-authored exterior scenery while the backdrop package system fills out.
- Phase 1: Bodega World Rendering is implemented. Its accepted slice includes world-first HQ presentation, authored compositional HQ and raid-map assets, locked camera/framing rules, first-pass lighting/effects, autonomous contract-site raid behavior, first-pass taxonomy remediation, seeded uncertainty, and generalized SVG review tooling.
- Operators now carry a permanent combat identity contract: rank, attunement, traits, fixed kit references, and six base combat stats (strength, speed, endurance, resilience, perception, intelligence) that persist through saves and migrations.
- First-class operator kit templates are implemented for regular attacks, skills, ultimates, and passives, with deterministic runtime execution rules shared by encounter simulation and player-facing combat identity surfaces.
- A shared simulation-owned derived-stat layer computes effective operator stats from base stats, equipped gear stat effects, and injury penalties, and exposes a single combat-power aggregate for raid resolution.
- Gear stat effects are now first-class gameplay inputs: weapons contribute to offensive stats, outfits to defensive stats, and accessories to utility stats, with those contributions flowing through the derived-stat layer into raid outcomes.
- Raid resolution is stat-driven and boss-aware: missions carry explicit enemy group profiles and boss combat profiles with tags, weaknesses, and threat values that modify challenge and team scores during autonomous resolution.
- Boss tags (area-damage, summon-pressure, resilience-pierce, recovery-suppress, speed-drain, intel-resist) raise challenge difficulty, while boss weaknesses reward matching team composition.
- Loot distribution is now driven by mission combat profiles: enemy groups and bosses each reference specific drop tables, with guaranteed boss loot on successful raids.
- Boss commitment now escalates into a blocking interruption beat, and committed confrontations can hand off into a save-safe runtime-owned encounter surface with phase state, interventions, debug pause/step controls, and authoritative writeback into raid, roster, and contract outcomes.
- The HQ exterior supports a four-state day-night cycle (sunrise, day, sunset, night) derived from the existing simulation clock, with manifest-driven backdrop profiles, per-phase lighting, and a future-building-ready schema.

## Phase 3: Union Hall Expansion

Goal: prove that scale changes gameplay, not just numbers.

Deliverables:

- second building definition and upgrade path
- relocation event framed as a systemic milestone, not just a map swap
- prebuilt initial layouts for new building phases
- multi-floor support
- floor-indexed HQ presentation state so the active floor is explicit in the runtime view rather than implied by one flat map
- a first floor-navigation/view contract that supports moving between floors without rewriting the entire HQ interaction model
- floor-aware exterior/background selection that can reuse shared elevation bands across similar floors
- room families that were combined in the bodega split into dedicated union-hall rooms as documented in the world foundation, including infirmary, break room, lounge, gym, sparring room, and a proper recruitment office
- training rooms unlock for the first time — no training exists in the bodega phase
- office-tier rooms and role-specific room variants for later progression
- recurring teams deepen into stronger lock-in, more persistent identity, and explicit player-visible naming once a team's identity has proven stable
- established teams and rooms develop recognizable culture that affects new-hire integration and staffing choices
- deeper intel gathering and intel-improvement systems
- better recruitment expectations
- broader dungeon pool
- more complex staffing demands

Exit criteria:

- moving to the next building changes how the player allocates space, labor, and money
- moving between floors is a real part of understanding and managing the headquarters, not just a cosmetic label
- the second building does not require bespoke exterior art for every single floor when adjacent floors share the same outside read
- the second building tier mostly feels like added content, not rewritten infrastructure

## Cross-Building HQ Day-Night Presentation Pass

Goal: make headquarters exteriors feel lived-in across the existing bodega and every future building tier without turning lighting into hidden gameplay logic.

Deliverables:

- derive HQ time-of-day presentation from the existing simulation clock instead of introducing a separate presentation timer
- standardize four canonical HQ exterior states: sunrise, day, sunset, and night
- apply those states only to the background and exterior decorative dressing around the HQ shell in the first pass
- give each building theme its own authored exterior backdrop package for all four states rather than recoloring one universal background
- define those backdrop packages in shell-relative zones so the same system can later serve ground-floor buildings, multi-floor HQs, and tower-scale headquarters
- keep the future verticality path open through reusable elevation bands, so similar floors can share exterior packages instead of requiring bespoke art for every floor
- replace the remaining hardcoded bodega exterior dressing with fully package-driven building-specific exterior variants

Exit criteria:

- the bodega visibly changes across the four day-night states when the existing clock advances
- adding a new building now includes a clear requirement to ship four exterior backdrop variants as part of its environment package
- the first implementation does not block future floor-aware backgrounds for multi-floor or skyscraper headquarters
- the feature remains presentation-only unless the product plan is explicitly updated later

## Phase 4: Midgame Systems

Goal: add the features that create external pressure.

Deliverables:

- reputation-based threat escalation
- better district-level city map logic
- richer gear and crafting built around authored recipe families, resource families, and rare site-specific materials
- additional economic resources beyond the current cash, reputation, intel, and Phase 2 loot-market baseline if needed
- faction or contract pressure
- city institutions begin pushing through licensing/compliance, labor and worker-safety oversight, emergency-response containment, and borough-level political or contract pressure
- richer social fallout from guild reputation, contract performance, operator death, and room/team culture
- expand the shipped incident library with more authored subject bindings, consequence bundles, and higher-pressure institutional scenarios
- deepen boss-encounter content breadth with additional bosses, mixed enemy rosters, phase behaviors, and longer-form intervention design
- expand encounter debug tooling and authored boss/incident content beyond the initial shipped slice
- optional later AI incident framing layered on top of deterministic authored triggers and consequence bundles, not as the gameplay authority
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
3. Completed: finish the bodega visually.
4. Completed: make the bodega good.
5. Expand the building scale.
6. Add systemic competitors.
7. Add prestige content.

That order matters more than any specific library choice.
