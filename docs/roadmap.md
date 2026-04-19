# Ascension Roadmap

The product plan owns future gameplay and system decisions.
The world foundation owns future-facing content, tone, and copy reference.
This roadmap owns rollout order, transitional scope, and the explicit difference between a lighter current implementation and a deeper intended future one.

## Roadmap Rules

- The roadmap is a living source document. If the intended product direction changes, update this roadmap in the same pass as the product plan and any affected world-foundation framing.
- If a system exists in data before it fully affects gameplay, the roadmap should state what is already active, what is only a lightweight foundation, and what deeper behavior is still deferred.
- Phase plans should point back here when they stage lighter-now implementation that is meant to deepen later.

## Already Implemented

The implementation itself is the source of truth. This section is organized by system so that agents and contributors can orient quickly.

### Platform & Hosting

- `Vite+`, React, and React Router are in place for the local-first client shell.
- The start screen supports new game, load, delete, preview/dev access, and SVG tooling entry points.
- Browser mode is the primary fast development and regression surface.
- Tauri desktop mode owns playtest hosting, file-backed saves, desktop import/export, and desktop integration automation.

### Save & Persistence

- Browser-backed save slots, slot metadata, schema migration, and strict save validation are implemented for development mode.
- The Windows Tauri host uses file-backed desktop saves with primary+backup JSON pattern and per-slot directories for playtesting.
- Posted contracts, the active contract site, and the previous contract result persist as separate save-safe state.
- Active raid packets, hidden resolution data, collapsed raid history, and operator lifecycle changes persist through saves.

### Content Infrastructure

- The template registry covers resources, buildings, rooms, upgrades, items, missions, events, bosses, enemies, and kits with deterministic validation.
- Phase 2 content breadth is in place through authored gear families, loot families, additional room families for later tiers, and expanded operator/staff/runtime content definitions.
- Phase 4 shared midgame contracts are now locked in data: districts, factions, city-pressure save state, craft recipes, workshop ids, and explicit `rankTone` escalation metadata.
- Porter's-era content remediation is shipped through additional D-rank site packets, expanded boss and enemy coverage, promoted recruit identities, non-gear item visual contracts, and runtime asset-parity validation.
- The Phase 2 asset-production contract is documented and locked around canon-first briefs, recipe previews, modular production, props-only room scenes, controlled item variants, and viewer/playground review.

### ECS & Simulation

- The ECS runtime owns guild, time, building, room, operator, staff, visitor, raid, social, inventory, and event state across ~52 system files.
- The stable gameplay command surface includes ticking time, placing rooms, toggling room activation, buying upgrades, recruiting, hiring staff, assigning staff, equipping gear, and trading on the market.
- A shared simulation-owned derived-stat layer computes effective operator stats from base stats, equipped gear stat effects, and injury penalties, and exposes a single combat-power aggregate for raid resolution.
- Shared uncertainty influences raid resolution, damaged-team outcomes, operator departure checks, loot generation, and runtime event pressure.

### Headquarters & Buildings

- The bodega ships the full three-step building arc (Frontage, Annex, Backyard Extension), four bodega-native room identities from the world foundation, bodega-native support rooms (Back Office, Backstock, Alley), and hard roster-cap overflow handling.
- The second headquarters tier (Porter's) is shipped with multi-floor layouts, explicit floor switching, starter room placement, and a D-rank contract ceiling.
- The third and final headquarters (Ascension Tower, the midtown skyscraper) is shipped with a five-floor starter stack, ops/recovery/training/logistics/rooftop floors, relocation from Porter's, HQ environment wiring, and a C-rank contract ceiling.
- The skyscraper expansion arc ships a four-step floor upgrade ladder (Nightlife, Specialist Training, Executive, Penthouse) that grows the tower from its baseline five-floor stack to the canonical nine-floor endgame footprint, with authored starter rooms per floor, layout-stage swaps following the Porter's upgrade idiom, and a Skyscraper Floor Arc card in the management panel.
- Porter's now exposes 12 room templates at the HQ contract level: Floor, Bar, Office, Stockroom, Infirmary, Gym, Prep Room, Break Room, Briefing Room, Dock, Deck, and Workshop.
- Porter's upgrade arc is a real player-facing campaign through Kitchen Overhaul, Upstairs Conversion, The Remodel, and The Waterfront, with upgrade-gated room unlocks for Break Room, Briefing Room, Dock, and Deck.
- Porter's specialized rooms change management decisions: gym drives bounded training readiness, Office and Briefing Room change contract reading and raid preparation, Infirmary/Break Room/Dock/Deck change recovery/morale/decompression/staging outcomes through simulation-owned room effects.
- The Phase 4 machine-shop upgrade path and durable crafting loop are shipped through recipe execution, craft-time cash sinks, workshop blocker surfaces, and the midgame economy ledger.
- The Porter's remediation pass is shipped through workshop blocker-summary UX, corrected Machine Shop workshop placement, and focused-room/build-surface interaction cleanup proven against browser coverage.
- Room progression is data-driven through building and room upgrades plus generic requirement and effect evaluation.
- Relocation from bodega to Porter's is runtime-owned and save-safe with carryover/reset rules, readiness/blocker surfaces, and an interruption-backed relocation flow.
- The HQ exterior day-night pass drives canonical sunrise/day/sunset/night phases from the simulation clock, with manifest-driven per-phase tint/fog/shadow values and elevation-band support for both headquarters.
- The HQ backdrop system supports bodega and Porter's across all four time-of-day states with hybrid renderer-authored dressing where package coverage is still intentionally partial.

### Operators & Roster

- Operators have needs, morale, loyalty, injury, schedule, preference, and relationship state that drive readiness, refusal, quitting, recovery, and staffing pressure.
- Operators carry a permanent combat identity: rank, attunement, traits, fixed kit references, and six base combat stats (strength, speed, endurance, resilience, perception, intelligence).
- Recruit generation is rank-aware: the bodega still produces F-rank operators, Porter's spreads F/E/D based on visitor quality, and the skyscraper spreads E/D/C. Combat base stats scale with rank while attunement, traits, and kit identity stay role-deterministic.
- First-class operator kit templates are implemented for regular attacks, skills, ultimates, and passives, with deterministic runtime execution rules.
- Gear stat effects are first-class gameplay inputs: weapons contribute to offensive stats, outfits to defensive stats, and accessories to utility stats, flowing through the derived-stat layer into raid outcomes.
- Porter's training is a bounded readiness loop: operational `room:training` space accrues save-safe physical readiness, feeds derived stats and raid readiness, decays through neglect and raid wear, and stays absent from bodega runs.
- Permanent operator death, operator departure, and roster replacement pressure are implemented.
- Starter roster portrait assignment is deliberate for all six bootstrap operators, and deterministic recruitment now draws from a promoted recruit identity pool instead of treating the SVG-playground recipe catalog as live content.
- Operator portraits use the shipped modular recipe-based SVG pipeline, including visible gear overlays where present.

### Social & Teams

- The social layer uses operator disposition, sparse notable ties, recurring-team memory, and room culture.
- Recurring teams persist as social units with cohesion, shared history, and damaged-state repair-or-disband behavior.

### Raids & Contracts

- The operations view supports the full contract loop: a resolved-contract review beat, a posted-contract bidding board, and the secured active contract site as the live raid map.
- New game boots into a generated posted-contract bidding state; preview/dev mode seeds an active contract for in-media-res tooling.
- Posted contracts now carry persistent `districtId`, `sponsorFactionId`, and `pressureTags`; city-pressure writeback changes future postings and contract fallout instead of living only in flavor text.
- Operators autonomously evaluate raid opportunities, form teams, launch raids, return with persistent summaries, and can permanently die or depart.
- Raid resolution is stat-driven and boss-aware: missions carry explicit enemy group profiles and boss combat profiles with tags, weaknesses, and threat values.
- Boss tags (area-damage, summon-pressure, resilience-pierce, recovery-suppress, speed-drain, intel-resist) raise challenge difficulty; boss weaknesses reward matching team composition.
- Loot distribution is driven by mission combat profiles: enemy groups and bosses each reference specific drop tables, with guaranteed boss loot on successful raids.
- Boss commitment escalates into a blocking interruption beat and can hand off into a save-safe encounter surface with phase state, interventions, debug pause/step controls, and authoritative writeback into raid, roster, and contract outcomes.
- Boss art and raid-surface visual coverage now extend across the shipped Porter's-era content slice instead of stopping at the original bodega boss set.
- Browser regression now covers the canonical Porter's path through contract bidding, briefing, workshop use, incident resolution, dock/deck staging payoff, and boss-commitment encounter handoff.
- The skyscraper surfaces a first C-rank content packet — six authored sites, six bosses, six enemy families, and matching drop tables — gating postings to the skyscraper contract ceiling once guild reputation clears the C threshold.

### Economy & Gear

- Stackable shared inventory, loot drops, the market, automatic accessory selection, and runtime-owned loot filtering are implemented for weapons, outfit overlays, accessories, and monster-part loot.
- The optional loot filter auto-sells junk monster parts and obsolete gear once the guild has outgrown them.
- Durable crafting is shipped through the machine-shop upgrade, workshop room template, craft-recipe registry, protected crafting inputs, district/faction recipe requirements, craft-time cash sinks, workshop recipe UX, and the midgame economy ledger.
- The economy harness is shipped at first pass through authored ledgers, direct simulation tooling, and checked-in economy reports for the early campaign.
- The D-rank economy remediation pass is shipped through a machine-checkable `midgame-economy.v2` ledger covering contract posting envelopes, payout envelopes, loot-sale envelopes, source coverage, and workshop-vs-market comparisons, plus tuned D-rank recipe and loot authored data.
- The skyscraper endgame-entry economy envelope is shipped through a new C-rank craft family authored against the Fabrication Bay, C-rank gear (weapons, outfits, accessories, consumables), boss- and family-specific C-rank drop tables, and a deterministic test harness that compares C-rank postings, payouts, and craft costs against the D-rank baseline.
- First standing management policy surfaces are shipped through the runtime policy contract and the HQ management panel.

### Events & Incidents

- Pressure events are generated from runtime state rather than hand-authored UI triggers.
- Interactive incidents bind to runtime subjects, surface authored choices through blocking modals, resolve deterministic consequence bundles in simulation code, and persist through refresh/load.
- City-pressure changes emit runtime events and management summaries, and the richer incident consequence kinds now write through into ECS-owned pressure, injury, cohesion, retention, and social fallout state.
- The interruption layer is runtime-owned: settings, incidents, and boss-commitment beats can freeze the simulation, persist when gameplay-authoritative, and restore cleanly through save/load.

### Onboarding & Narrative

- Save-safe opening guidance state, authored opening beats, focused coachmarks/spotlights, blocking narrative briefings, and interruption-backed delivery are shipped (suppressed in preview mode).
- The canonical opening path is a real player-facing baseline: new game uses a controlled seed, opening guidance beats teach the intended loop, and browser verification exists for the opening run.
- The narrative presenter system is shipped across guidance, interruptions, relocation framing, and Porter's-specific incident surfaces.

### UI & Presentation

- The bodega renders in a world-first HQ view with overlay UI, zoom/pan camera rules, and in-world operator, staff, and visitor markers.
- HQ and raid overlays use glass-card presentation, focused bottom-card inspection, compact category switching, and a persistent right-side event log.
- The event log is the always-on notice surface for departures, returns, injuries, deaths, morale/loyalty thresholds, staffing changes, resource swings, active-event changes, raid-result updates, team status, and room-culture updates.
- The UI exposes first-pass explanations for raid acceptance, refusal, regrouping, quitting, team damage, and accessory assignment.
- The management panel surfaces relocation readiness, blockers, building name, floor zone badges, atmospheric floor descriptions, and building-aware "Why This Room Matters" copy for all 18 shipped rooms.
- Staffing pressure cards use room-specific language explaining what each room needs staff for.
- The Porter's remediation pass is shipped through narrower readability fixes for workshop blockers and overlay interaction debt instead of a broad UI redesign.
- HQ environment metadata, raid environment metadata, and visual review tooling are shipped.

### Audio

- The audio layer is state-owned and save-safe: shell, runtime-session, and simulation cue ownership is explicit.
- HQ, operations, raid, boss, and decompression music states are derived from runtime state.
- Ambience beds and promoted cues are validated through the audio playground.

### AI Layer

- The optional local-first AI layer ships host-local settings, OpenAI-compatible localhost transport, browser and desktop adapters, and runtime request tracking with probe/reuse/regenerate behavior.
- Two live generation surfaces are shipped: `incident-framing` for interruption presentation and `operator-identity` for recruit identity packets.
- Dev-console, settings-modal, and start-screen control surfaces are implemented.
- Prompt grounding assembles world-foundation context for generation requests.
- Simulation still owns triggers, legal choices, numeric effects, role identity, and save-safe state transitions; AI only rewrites allowed presentation or constrained structured identity packets inside project-owned validation and fallback rules.

### Dev Tooling

- The backtick-opened dev command console exposes a typed command registry, `/help` and `/list` discovery, structured command output, history, browser-test-friendly selectors, and runtime-safe setup paths.
- Scene builder, SVG playground, audio playground, and AI playground are shipped as dev/review routes.
- Browser and desktop test drivers support QA automation.

## Status Snapshot

- The deterministic base game is no longer blocked on Porter's differentiation or AI transport bring-up. Both are shipped.
- The current shipped baseline is a playable bodega-to-Porter's-to-skyscraper management game with browser and desktop hosts, onboarding, interruptions, encounters, audio, and optional local-first AI variation.
- Phase 4 is complete. Shared contract lock, city pressure, Porter's content remediation, durable crafting, deeper social/incident fallout, and encounter breadth expansion are all shipped in code.
- Midgame remediation is complete. The Porter's-era D-rank band now has browser regression coverage across contracts, workshop use, incidents, and encounter handoff; deterministic D-rank economy reporting; tuned workshop authored data; and the narrow management-surface fixes that verification exposed.
- The skyscraper HQ baseline and the first C-rank endgame-entry band are shipped. The tower exposes a bounded starter floor stack, C-rank contracts once reputation clears the threshold, a C-rank craft family in the Fabrication Bay, and rank-aware recruit generation that stops flattening new hires to F at every building.
- The skyscraper floor expansion arc is shipped. The tower now grows from its baseline five-floor stack into the canonical nine-floor endgame footprint through the Nightlife, Specialist Training, Executive, and Penthouse upgrades, each delivering authored starter rooms ready for consequence wiring.
- Executive Floor institutional pressure is shipped. Executive Office, Compliance Office, and War Room each carry distinct mechanical consequences — standing multipliers on contract outcomes, bounded per-tick scrutiny decay, and a war-room intel stack on top of the briefing-room bonus. Five skyscraper-gated incident templates (licensing audit, sponsor prestige demand, rival poaching, borough hearing, press exposure) compose new pressure tags over existing trigger families, `faction_standing_delta` and `faction_scrutiny_delta` consequence kinds write faction state through incident choices, and a Visible Institution summary section in the management panel makes skyscraper-scale pressure legible.

## Next Steps

1. Wire consequences for the remaining expansion-floor rooms as separate narrow slices: Nightlife recruitment (Club, Green Room), Specialist Training role-specific training (Drill Floor, Recon Course, Trauma Bay), and Penthouse A-rank recruitment (Sky Lounge, Private Cellar).
2. Stage additional endgame pressure inside the skyscraper now that institutional pressure is shipped: bigger raid envelopes, and the first B-rank content packet when the C-rank band proves itself.
3. Continue HQ environment cleanup where it supports the shipped cross-building runtime contract and skyscraper floor reuse.
4. Keep AI work narrow and layered: better prompt grounding, more eval fixtures, broader incident framing coverage, and later recap or description surfaces only when their deterministic payloads are already stable.

## Later: AI Content Breadth

Goal: extend the already-shipped optional AI layer only where it adds narrative variety without taking gameplay authority.

Deliverables:

- broader AI incident framing coverage layered on top of deterministic triggers, subject bindings, and consequence bundles
- AI-generated event briefings, interruption copy, and recaps that consume structured simulation payloads and world-grounded tone guidance
- AI-generated operator identity packets that assemble approved prefab appearance parts and authored personality/social tags through structured output
- AI-authored skill, item, and operator descriptive text that binds to locked numeric payloads and schema-valid deterministic runtime definitions
- explicit validation and fallback paths so failed or low-quality AI output falls back to approved authored copy, approved prefab operator assemblies, or no-op event generation without breaking the run
- AI features exposed as opt-in settings, available from the start screen before campaign launch and from in-game settings during a live run
- AI features can be toggled on or off mid-campaign without corrupting saves or making the run unplayable
- the game remains fully playable offline, with AI-disabled behavior treated as a first-class supported path rather than a degraded emergency mode
- operator-generation guardrails that keep gameplay-affecting stats, rank, kit slots, and numeric effect payloads inside deterministic authored envelopes unless a later product update explicitly introduces a bounded exception system

Exit criteria:

- the game remains fully playable without model access and with AI toggled off
- AI output changes presentation, identity, and variation more than it changes hidden gameplay authority
- incident triggers, hidden modifiers, resolution rolls, and consequence application remain simulation-owned
- operator generation remains schema-valid, save-safe, and compatible with the existing prefab part pipeline
- narrative variety improves without making balance, progression, or debugging unreadable

## Deferred Until Proven Necessary

- the full B/A/S prestige ladder beyond the first skyscraper-entry band
- literal tower-scale 20+ floor simultaneous management if reusable floor bands and staged expansion solve the need sooner
- live premium operator generation
- FAL-style AI image generation for portraits and scene art as core systems; if external image generation is explored later, constrain portraits to S-rank operators so cost stays bounded and those operators get a uniquely prestigious presentation layer
- heavy procedural narrative systems
- fully simulated rival headquarters interiors

## Practical Build Order

1. Completed: content infrastructure, playable bodega, bodega visuals, bodega endgame, Porter's baseline, Porter's functional differentiation, Phase 4 external-pressure work, Porter's-era midgame remediation, skyscraper HQ baseline, the first C-rank endgame-entry content/economy/recruit band, the skyscraper floor expansion arc (Nightlife, Specialist Training, Executive, Penthouse), and the Executive Floor institutional-pressure slice.
2. Fan out to the remaining expansion-floor consequence slices (Nightlife recruitment, Specialist Training role training, Penthouse A-rank recruitment).
3. Stage additional endgame pressure — bigger raid envelopes, the first B-rank content packet — on top of the shipped institutional-pressure surface.
4. Continue HQ environment cleanup where it supports the shipped cross-building runtime contract and skyscraper floor reuse.
5. Broaden optional AI content only after the next deterministic systems pass stabilizes the structured payloads worth varying.

That order matters more than any specific library choice.
