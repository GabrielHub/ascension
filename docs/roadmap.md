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
- Browser-backed save slots, slot metadata, schema migration, and strict save validation are implemented for development mode, and the Windows Tauri host now uses file-backed desktop saves for playtesting.
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
- The shipped audio layer is state-owned and save-safe: shell, runtime-session, and simulation cue ownership is explicit; HQ, operations, raid, boss, and decompression music states are derived from runtime state; and ambience beds plus promoted cues are validated through the audio playground.
- Interactive incidents now bind to runtime subjects, surface authored choices through blocking modals, resolve deterministic consequence bundles in simulation code, and persist through refresh/load.
- Operator portraits use the shipped modular recipe-based SVG pipeline, including visible gear overlays where present.
- The bodega now renders in a world-first HQ view with overlay UI, zoom/pan camera rules, and in-world operator, staff, and visitor markers.
- The operations view now supports the full contract loop: a resolved-contract review beat, a posted-contract bidding board, and the secured active contract site as the live raid map.
- Posted contracts, the active contract site, and the previous contract result now persist as separate save-safe state instead of collapsing into one implicit contract handoff.
- New game now boots into a generated posted-contract bidding state, while preview/dev mode intentionally seeds an active contract so raid-map tooling and runtime verification can start in-media-res.
- A first-pass gameplay-owned onboarding layer is shipped: save-safe opening guidance state, authored opening beats, focused coachmarks/spotlights, blocking narrative briefings, and interruption-backed delivery that is suppressed in preview mode.
- The canonical opening path is now remediated enough to be a real player-facing baseline instead of a bootstrap/dev slice: new game uses a lighter controlled seed, opening guidance beats teach the intended loop, and direct/browser verification exists for the opening run.
- HQ and raid overlays use glass-card presentation, focused bottom-card inspection, compact category switching, and a persistent right-side event log.
- The event log is the always-on notice surface for departures, returns, injuries, deaths, morale and loyalty thresholds, staffing changes, resource swings, active-event changes, raid-result updates, team status, and room-culture updates.
- The UI exposes first-pass explanations for raid acceptance, refusal, regrouping, quitting, team damage, and accessory assignment.
- Shared uncertainty now influences raid resolution, damaged-team outcomes, operator departure checks, loot generation, and runtime event pressure.
- Stackable shared inventory, loot drops, the market, automatic accessory selection, and runtime-owned loot filtering are implemented for weapons, outfit overlays, accessories, and monster-part loot.
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
- Porter's training is now a shipped bounded readiness loop: operational `room:training` space accrues save-safe physical readiness (strength, speed, endurance, resilience), feeds derived stats and raid readiness, decays through neglect and raid wear, and stays absent from bodega runs.
- Raid resolution is stat-driven and boss-aware: missions carry explicit enemy group profiles and boss combat profiles with tags, weaknesses, and threat values that modify challenge and team scores during autonomous resolution.
- Boss tags (area-damage, summon-pressure, resilience-pierce, recovery-suppress, speed-drain, intel-resist) raise challenge difficulty, while boss weaknesses reward matching team composition.
- Loot distribution is now driven by mission combat profiles: enemy groups and bosses each reference specific drop tables, with guaranteed boss loot on successful raids.
- Boss commitment now escalates into a blocking interruption beat, and committed confrontations can hand off into a save-safe runtime-owned encounter surface with phase state, interventions, debug pause/step controls, and authoritative writeback into raid, roster, and contract outcomes.
- First standing management policy surfaces are shipped through the runtime policy contract and the HQ management panel.
- The economy harness is shipped at first pass through authored ledgers, direct simulation tooling, and checked-in economy reports for the early campaign.
- The bodega now ships the full three-step building arc (Frontage, Annex, Backyard Extension), bodega-native support rooms (Back Office, Backstock, Alley), hard roster-cap overflow handling, and authored encounter portraits for the three shipped bodega-era bosses.
- The management UI now surfaces relocation readiness, blockers, carryover and reset rules, and the runtime entry point into the relocation interruption flow.
- The second headquarters tier is shipped at first pass: relocation into Porter's is runtime-owned and save-safe; Porter's has multi-floor layouts, explicit floor switching, starter room placement, upgrade definitions, waterfront stage data, higher recruitment and income tuning, and a D-rank contract ceiling.
- Porter's room and progression breadth now exist beyond the relocation landing state: the runtime/template layer supports the Floor, Bar, Office, Stockroom, Infirmary, Gym, Prep Room, Break Room, Briefing Room, Dock, and Deck catalogs, plus lightweight consumable prep from monster drops.
- Porter's upgrade arc is now a real player-facing campaign: guidance and management surfaces point the player through Kitchen Overhaul, Upstairs Conversion, The Remodel, and The Waterfront, while deterministic and browser regression coverage prove those unlocks are actually used in Porter's play.
- The optional runtime-owned loot filter auto-sells junk monster parts and obsolete gear once the guild has already outgrown them.
- The HQ backdrop system now supports bodega and Porter's across sunrise, day, sunset, and night states with simulation-clock-derived phases, manifest-driven presentation data, elevation-band support, and hybrid renderer-authored dressing where package coverage is still intentionally partial.
- The shipped host split is in place: browser mode remains the primary fast development and regression surface, while Tauri desktop mode owns playtest hosting, file-backed saves, desktop import/export, and desktop integration automation.
- The dev-only command console is shipped in place of the old button sheet: the backtick-opened modal exposes a typed command registry, shared `/help` and `/list` discovery, structured command output, history, browser-test-friendly selectors, and runtime-safe setup paths instead of ad hoc snapshot mutation.

## Completed: Opening Campaign Remediation

Status: shipped.

The opening-campaign remediation pass is no longer an active roadmap milestone. The important result is that a canonical player-facing new-game path now exists: runtime-owned opening guidance beats, controlled new-game seed data separated from preview/dev bootstrap data, interruption-backed narrative delivery, and verification for the opening run.

Future onboarding work can still deepen later as new systems and headquarters tiers land, but the "close the opening path" milestone itself is complete.

## Completed: Bodega Endgame And Promotion Review

Status: shipped.

The bodega closeout milestone is no longer active. The early-game campaign now has a verified end state: the full bodega arc, the relocation gate, the real browser relocation handoff into Porter's, and a save-safe post-move baseline. The promotion review did not expose any remaining defect that blocks closure, and it did not justify mandatory new F/E/D breadth work before moving on.

Shipped baseline:

- the full bodega building arc is implemented
- bodega-native support rooms are implemented
- hard roster-cap overflow handling is implemented
- the early balance harness exists through ledgers, simulation, and reports
- the shipped bodega-era bosses now have authored encounter portraits
- the relocation trigger, blockers, carryover/reset rules, and save-safe handoff contract are implemented
- relocation readiness, blockers, and the relocation interruption entry flow are surfaced in the player-facing management/UI layer
- the narrative presenter system is shipped across guidance, interruptions, relocation framing, and Porter's-specific incident surfaces
- Porter's is implemented as the first post-bodega headquarters tier, including:
  - multi-floor HQ support
  - starter landing state and upgrade path
  - building-aware HQ environment data
  - prep-room consumables
  - Porter's-specific recruitment, income, and contract-rank tuning

Exit criteria:

- the bodega has a clean and credible end state instead of feeling like an open-ended sandbox
- relocation has a concrete runtime target and a save-safe handoff
- the second headquarters tier starts from a closed early-game baseline and a shipped Porter's target

## Completed: Porter's Baseline

Status: shipped.

The second headquarters is no longer just a future placeholder. The relocation handoff into Porter's, the starter multi-floor building state, the second-building room catalog, the higher contract ceiling, the prep-room consumable loop, and the first Porter's upgrade track are all in the repo now. What remains is not "ship Porter's at all"; it is to deepen why Porter's feels different once the player is there.

Shipped baseline:

- relocation into Porter's is a player-facing runtime milestone with save-safe carryover and reset rules
- Porter's starts from a multi-floor HQ with explicit floor-aware presentation state
- Porter's starter rooms are implemented and split bodega functions into public, operational, recovery, training, and prep spaces
- Porter's building upgrades and waterfront expansion definitions are implemented, including upgrade-gated room unlocks for Break Room, Briefing Room, Dock, and Deck
- Porter's raises the recruitment/income baseline, supports D-rank contract progression, and adds lightweight consumable prep from monster drops
- the optional loot filter is implemented as runtime-owned automation rather than player-maintained per-item rules

## Completed: HQ Day-Night Foundation

Status: shipped foundation.

The first cross-building HQ day-night pass is no longer a standalone future milestone. The simulation clock now drives four canonical exterior phases, backdrop manifests exist for both shipped headquarters identities, and the schema already supports shared elevation bands for multi-floor buildings. Remaining backdrop-package cleanup belongs inside future building-environment work, not as a separate roadmap phase.

## Current Milestone: Porter's Functional Differentiation

Goal: prove that the second headquarters changes management decisions because its specialized rooms matter, not just because Porter's has more slots and bigger numbers.

Status: shipped.

Shipped inside this milestone:

- Porter's gym and shared `room:training` tag now drive a real bounded readiness system instead of placeholder copy or schedule affinity alone.
- Porter's Office and Briefing Room now change contract reading and raid preparation through board intel, briefing state, save-safe writeback, and player-facing contract surfaces.
- Porter's Infirmary, Break Room, Dock, and Deck now change recovery, morale, decompression, and staging outcomes through simulation-owned room effects, post-raid factors, and room-detail feedback.
- Porter's management guidance, deterministic campaign harness, and browser regression now exercise the canonical Kitchen Overhaul-through-Waterfront upgrade path and prove the unlocked rooms are actually used.
- HQ panel now shows building name, floor zone badges (Public/Private/Waterfront), and atmospheric floor descriptions for both Porter's and the bodega.
- All 11 Porter's rooms and all 7 bodega rooms have hardcoded building-aware "Why This Room Matters" copy instead of generic tag-based fallback text.
- Staffing pressure cards use room-specific language explaining what each room needs staff for, instead of generic tag labels.

Active execution plans:

- `docs/plans/ai-content-layer-plan.md`

The Porter's design revision pass is shipped. Copy, UI hierarchy, and floor-zone presentation now match the shipped room differentiation.

AI content layer infrastructure is shipped: settings storage, project-owned AI module with OpenAI-compatible transport, runtime session AI commands with request registry and dedup, dev console AI commands (`/ai status`, `/ai probe`, `/ai generate`, `/ai regenerate`, `/ai inspect`), settings modal with local AI configuration, and a host-aware desktop adapter for the same local AI contract.
The first shipped generation surfaces are now live behind that infrastructure:

- `incident-framing` for interruption presentation
- `operator-identity` for recruit identity packets
  Both surfaces stay non-authoritative. The simulation still owns triggers, legal choices, numeric effects, role identity, and save-safe state transitions; AI only rewrites allowed presentation or constrained structured identity packets inside project-owned validation.

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

## Post-Basegame: AI Content Layer

Goal: add generative narrative and content breadth only after the deterministic game is already stable, enjoyable, and fully playable without model access.

Deliverables:

- AI incident framing layered on top of deterministic triggers, subject bindings, and consequence bundles
- AI-generated event briefings, interruption copy, and recaps that consume structured simulation payloads and world-grounded tone guidance
- AI-generated operator identity packets that assemble approved prefab appearance parts and authored personality/social tags through structured output
- AI-authored skill, item, and operator descriptive text that binds to locked numeric payloads and schema-valid deterministic runtime definitions
- explicit validation and fallback paths so failed or low-quality AI output falls back to approved authored copy, approved prefab operator assemblies, or no-op event generation without breaking the run
- AI features exposed as opt-in settings, available from the start screen before campaign launch and from in-game settings during a live run
- AI features can be toggled on or off mid-campaign without corrupting saves or making the run unplayable
- the game remains fully playable offline, with AI-disabled behavior treated as a first-class supported path rather than a degraded emergency mode
- operator-generation guardrails that keep gameplay-affecting stats, rank, kit slots, and numeric effect payloads inside deterministic authored envelopes unless a later product update explicitly introduces a bounded exception system

Exit criteria:

- the base game is already accepted as content-complete enough to stand on its own without AI
- the game remains fully playable without model access and with AI toggled off
- AI output changes presentation, identity, and variation more than it changes hidden gameplay authority
- incident triggers, hidden modifiers, resolution rolls, and consequence application remain simulation-owned
- operator generation remains schema-valid, save-safe, and compatible with the existing prefab part pipeline
- narrative variety improves without making balance, progression, or debugging unreadable

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
4. Completed: make the first bodega slice good.
5. Completed: close the bodega endgame and promotion review from the shipped Porter's baseline.
6. Deepen Porter's functional differentiation and player-facing upgrade path.
7. Add midgame external pressure.
8. Add later-building and prestige content.

That order matters more than any specific library choice.
