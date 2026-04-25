# Hazard-Pay: Dungeon Management — Full Rewrite Source

Reference status: decision archive
Original plan ID: rewrite/master-plan
Implementation order: none
Review state: reference only; do not use as the default implementation entry point.

This is the large source document that produced the active product docs, world docs, and numbered implementation plans. It is kept for rationale and archaeology. Implementation agents should start from `docs/plans/rewrite/index.md`, one numbered plan, and that plan's referenced product/world docs. Consult this archive only when active docs are ambiguous or contradictory.

This document is the master plan for a clean rewrite of the game currently shipping as Ascension. The game has accumulated too many features added without a clear north star. The rewrite reuses assets, world ideas, and the existing codebase as a reference, but writes fresh code against a much smaller, simpler scope.

This file is an index and a contract. It does not contain content. Content (every floor, room, rival, presenter, dungeon, weapon family, etc.) lives in domain sub-plans and content tables, structured as markdown tables so both humans and AI agents can parse them.

---

## 0. Plan Authoring Conventions

Read this section before authoring or executing any sub-plan.

### 0.1 Plan File Shape

Every sub-plan must declare:

- `id` — stable plan id, e.g. `rewrite/rooms-catalog`.
- `status` — one of `not started`, `in progress`, `waiting review`, `completed`.
- `blockers` — list of plan ids this plan depends on. Empty for parallelizable plans.
- `owner` — agent or human responsible (optional during draft).
- An actionable checklist with concrete acceptance criteria.

### 0.2 Plan Size And Granularity

- **Plans should be small.** Each plan covers a single feature. Long, multi-feature plans are split.
- It must be easy at a glance for an agent to read which plans are in progress, which are done, and which are unblocked.
- **Granularity rules of thumb:**
  - One plan per room.
  - One plan per **rank** of dungeon (not per dungeon). Unique dungeons get their own plan.
  - One plan per tier of weapon.
  - One plan per unique operator.
  - One plan per unique weapon.
- **Asset work is split out.** Anything that requires creative back-and-forth (room backdrops, dungeon backdrops, weapon art, unique portraits) gets its own asset plan that runs in parallel with engineering work. Style, reference image, and pipeline get locked first — the same way presenter and rival assets were already done. Then individual asset plans can fan out.

### 0.3 Docs Taxonomy

The new repo enforces a strict three-layer documentation split. Drift between layers is what created the Ascension mess.

| Layer | Owns | When To Use |
|---|---|---|
| **World docs** (`docs/world/`) | Tone, voice, lore, premise, naming conventions, presenter canon, atmosphere, comedy-tragedy axis | When **writing** anything player-facing — copy, narrative, briefings, story beats, event flavor |
| **Product docs** (`docs/product/`) | Content tables and content requirements | When **creating content or assets** — what to build, in what order, with what requirements |
| **Plans** (`docs/plans/`) | Implementation steps, blockers, acceptance criteria | When **engineering** something, before code |
| **Code** | Gameplay logic, math, state shapes, behavior | Source of truth for **how the game behaves** once written |

**Product docs further split by content shape:**

- **Enumerated tables.** Strict, named-entry tables for finite content: presenters, rooms, floors, unique operators, unique weapons, unique dungeons, individual rivals, visual effects pool, key guide events.
- **Pattern requirements.** Per-tier/per-rank requirement docs for content that expands infinitely following a pattern: regular operators by rank, regular weapons by tier, regular dungeons by rank, regular bosses, narrative event families.
- **Hybrid (both).** Operators, weapons, dungeons, and rivals get BOTH a roster table (uniques + currently-authored entries) AND a requirements doc (the pattern for adding more). Rivals are a hybrid because each individual rival is canonically authored, but the system is infinitely expandable.

**Cross-layer rules:**

- No layer duplicates content owned by another. If world docs describe what something feels like, product docs link to that — they do not redescribe.
- Information that lives in code is not re-stated in docs or plans. They reference code instead.
- When content moves between layers (e.g., a content table currently in world docs migrates to product docs), it moves cleanly — old location is updated to point to the new home, not duplicated.

**Agent table-update rule.** Agents working on a sub-plan update the relevant content table. A row can be `TBD` for a not-yet-built dependency, `in progress` once an agent picks it up, `waiting review` when the implementation is ready to audit, and `completed` when shipped. This is how blockers and progress stay visible at a glance.

### 0.4 Reuse Rules

- **Asset reuse:** encouraged. Operator portraits, chibi tokens, presenter portraits, rival portraits/insignia — all carry over.
- **World docs reuse:** allowed only after they are rewritten to match the new game (see §3).
- **Code reuse:** agents reference the existing repo for patterns and prior decisions, but write fresh code in the new repo. The existing Ascension code is sometimes wrong, sometimes messy. **If an agent thinks a better solution exists, take the better solution** — don't copy a bad pattern forward just because it's there.
- **ECS library:** the existing ECS library is reused unless an agent identifies a real problem with it.
- **`CLAUDE.md` and `AGENTS.md` rules** that still apply should be ported to the new repo.
- **Active doc footprint:** keep the new game's active canon small. World docs, product docs, and actionable plans are the only implementation-facing sources of truth. Reference material from the current game can travel for context, but it must not be treated as active canon.

### 0.5 Plan Lifecycle In This Repo

- Existing checked-in plans under `docs/plans/` are folded into the new actionable rewrite plans before handoff. Current-game plans can be used as source material, but the new repo should execute only the rewritten `rewrite/*` plans.
- Plans referenced by this document (presenter remediation, persistent guidance, rival state, current HQ work) are pulled into the new repo as rewritten plans, not copied verbatim as active work.
- Active implementation plans live under `docs/plans/rewrite/` and are numbered by implementation order.
- Completed plans move to `docs/plans/graveyard/` after review so they stay out of the active context path for future agents.

### 0.6 Decisions

- **Folder location:** the new game lives in a **new repo**, in a new folder on disk. Agents working in the new repo can reference this repo by absolute path on the local machine.
- **Doc handover:** the entire `docs/` folder is copied from this repo to the new repo as context, but only after the plan rewrite converts the current checked-in plans into actionable new-game plans. In the new repo, active canon is the rewritten world docs, product docs, and `rewrite/*` plans; any current-game reference material is reference only.
- **First sub-plan:** repo setup. Vite Plus, React Router, Tailwind v4, ECS library, save infrastructure, and any other base scaffolding to get a runnable shell. Authored before any feature plan starts.

### 0.7 Open Questions

- (None outstanding. The handoff copies `docs/` for context after the plan rewrite; active canon is still limited to the rewritten world docs, product docs, and actionable `rewrite/*` plans.)

### 0.8 Roadmap Discipline

- **Sub-plans cover only what we're building.** When authoring a sub-plan, do not include roadmap features, "someday" extensions, or deferred ideas in the actionable checklist. Actionable plans stay focused.
- **Roadmap material goes to `docs/roadmap.md`** (create if not present). When a roadmap-shaped idea surfaces during sub-plan authoring — a feature worth remembering but out of scope — append it to the roadmap document with enough context to act on later. Do not bury it in the sub-plan.
- The §21 list below is the master plan's starting roadmap set. Sub-plan authors augment it via `docs/roadmap.md` rather than editing §21 directly.

---

## 1. Vision And Identity

### 1.1 Decisions

- **Game name:** Hazard-Pay: Dungeon Management. Drop "Ascension" from all surfaces.
- **Genre:** Management + idle game. Player runs a dungeon-clearance guild in near-future New York. Not a direct-control combat game. The idle-game framing is deliberate — many of the loops (cooldowns, recruit pools, room tier upgrades, persistent objective rewards) are idle-game mechanics.
- **Reference:** *Towns* (indie game, Steam, ~2014 — shut down). The structural inspiration for the game.
- **Tone:** Workplace humor, in the lineage of *The Office* and *Dispatch*. Grounded. Supernatural is a labor-market problem, not a fantasy power trip.
- **Pillars:** Recognition, leverage, logistics, upward mobility. Operators are autonomous and remember things. The player is management.
- **Scope rule:** Smaller than Ascension. One HQ. No crafting. Items are weapons only. Drop anything that does not directly serve the management loop.
- **Endgame:** No win condition. Infinite freeform after the guidance taper. The endgame goals are beating rivals and collecting unique operators (and unique weapons). The player feels "done" when they've collected most uniques and unlocked all features and rooms.
- **No difficulty modes.** One curated curve.

### 1.2 Decisions (continued)

- **Target playthrough length:** **wall-clock time, 1.5 hours target with a 1–2 hour band**, from new-game-click to first Unique recruit. Wall-clock is what the player perceives as "how long it took"; idle-game lineage means players keep the tab open while raids play out. The 1–2 hour band gives the balance executor room to land on either side. This is the metric the `rewrite/economy` plan validates against and the success criterion for AI-agent balance iteration (§2.5).

### 1.3 Open Questions

- (None outstanding.)

---

## 2. Tech Stack And Infrastructure

### 2.1 Decisions

- **Build/dev:** Vite Plus (`vp`) toolchain. `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, `vp preview`.
- **Routing:** React Router shell only. No gameplay authority in routing layer.
- **State:** ECS-first authoritative gameplay state. Templates own static definitions. Systems own consequences. UI owns presentation and typed intents.
- **ECS library:** reuse the existing ECS library unless a concrete problem is identified.
- **Styling:** Tailwind v4. Use `className` everywhere. No more sprawling custom CSS. Minimum font size `text-xs`.
- **AI:** Local-first, Ollama-compatible. Narrow generation surfaces only. Game must remain fully playable offline with AI disabled.
- **Audio:** Existing audio system survives intact.
- **Workflow rules:** copy over `CLAUDE.md` and `AGENTS.md` rules that still apply to the new game.
- **No Tauri / no desktop.** Desktop is a feature-complete-day decision. Drop the Tauri shell, file-backed saves, desktop adapters, and `tauri-test/` infrastructure.

### 2.2 Save System

- **Browser storage only.** No file-backed saves until the game is feature-complete and Tauri returns.
- **Save mechanics stay the same as the current game** in shape (slots, autosave behavior). Just browser-only.
- **No save migration from Ascension.** Greenfield schema. The rewrite is a new game.

### 2.3 Dev Tooling

- **Sandbox preview is dropped** as a top-level entry point. Its functionality rolls into the dev menu.
- **Dev menu must let agents and humans skip into named phases of the game.** New features should benchmark which phase they need to be testable from. The named phase list is part of the dev menu design.
- **Dev console** is rebuilt against the new ECS shape. It must include autocomplete and easy ways to seed and skip into different parts of the game.

### 2.4 Open Questions

- **Phase list for dev-menu skip targets.** What named phases (e.g. "starter floor only", "recruitment unlocked", "first contract complete", "C-rank band", "endgame") cover the testing surface? Authored alongside `rewrite/dev-menu`.

### 2.5 Headless Simulation Harness

The wall-clock playthrough target (§1.2) and the iterative balance pass (§17) both depend on being able to run the sim **without rendering** at maximum speed.

- **Sim core is built as a runnable library.** Importable in Node with no browser dependencies at the gameplay layer. ECS components, systems, templates, save/load — all runnable headless.
- **CLI harness ships in two modes:**
  - **Scripted (batch).** Run a seeded campaign from new-game to a target event (e.g. first Unique recruit). Output machine-readable JSON metrics.
  - **Interactive (REPL).** Step through ticks, inspect ECS state, fire commands, advance until conditions are met. For human-in-the-loop debugging.
- **Default-decision policies auto-handle blocking surfaces:**
  - Boss commitment prep screen → COMMIT with the team that reached the boss (or the strongest available; configurable).
  - Narrative events → first authored choice (or configurable choice strategy).
  - Guide steps → auto-claim and auto-progress.
- **Metric output:** time-to-event for every meaningful milestone (first contract, first boss kill, first weapon equipped, first floor purchase, first room tier upgrade, first death, first Unique recruit, etc.). Output is machine-readable so AI agents can iterate.
- **AI generation is stubbed** in headless runs — uses authored fallback copy for incidents and operator identities. Real AI surfaces are tested separately. This keeps balance runs fast.
- **Deterministic from seed.** Same seed + same default-decision policies = same outcome in both browser and headless contexts.
- **Shares infrastructure with the dev-menu phase-skip feature** (§2.3). Same fast-forward primitive.
- **Used by AI-driven balance iteration** (§17). Agents run seeded campaigns, read metrics, adjust balance tables, re-run.

---

## 3. World And Lore

### 3.1 Decisions

- The world is still near-future New York City with a supernatural labor market.
- The player is not attuned. The player is management.
- Workplace humor tone is preserved.
- Rank ladder F → E → D → C → B → A → U is preserved.
- Attunements remain innate, fixed, and permanent.

### 3.2 Changes

- **Drop the bodega and Porter's.** The player starts in the skyscraper. World docs that describe the bodega or Porter's go out of canon.
- **Single HQ.** The skyscraper is the only headquarters. Floor acquisition is the progression axis. Drop the relocation arc entirely.
- **Drop districts, factions, and public/civic pressure entirely.** Rivals are the only pressure source. No City Licensing Bureau, no Labor & Safety Board, no Emergency Management Office. No district-driven contract sites. No public pressure track at all.
- **Day-night cycle is kept as backdrop swapping only:** 4 stages, 4 backdrop images. Do **not** add a canvas-wide filter over the HQ scene.

### 3.3 Decisions On Doc Rewrite

- **World docs are pure tone/voice/lore.** Per the docs taxonomy (§0.3), world docs do not own content tables, room lists, weapon lists, dungeon catalogs, or any enumerated content. Those move to product docs.
- **World docs must be rewritten to match the new game before they are copied to the new repo.** This runs **after** this master document is locked, and before any content sub-plan starts.
- The world-doc rewrite is the single source of truth for setting, tone, and content-identity reference in the new repo. No drift, no parallel canon.
- **Product-doc cleanup has an initial new-game pass.** Obsolete current-game docs were removed or replaced, conventions were refreshed, and product contracts now exist for rooms, floors, presenters, assets, UI direction, rank requirements, unique requirements, event requirements, and effects.
- **Remaining product-doc work lives in the product index backlog.** If a product design question is still unresolved, track it in `docs/product/index.md` instead of scattering open questions across implementation plans.
- **Presenter remediation specifically waits until rooms are reviewed.** Presenter domain reworks (e.g. resolving Rafi's people-care scope, Laura's institutional scope, Vicente's narrowed workshop scope) cannot lock until the room catalog has survived review — presenter domains are scoped by which rooms they serve.

### 3.4 Sub-Plans Needed

- `rewrite/world-doc-rewrite` — rewrites `docs/world/` for the new scope. Pure tone/voice/lore output. Initial pass exists in this repo; review before copying forward.
- `rewrite/product-doc-cleanup` — keeps `docs/product/` limited to new-game content tables and content requirements. Initial pass exists in this repo; review before copying forward.
- `rewrite/presenter-domain-rework` — adjusts presenter canon (Rafi, Laura, Vicente specifically) once the room catalog is defined. Blocks on `rewrite/rooms-catalog`.

---

## 4. Assets

The asset strategy is the single biggest production-cost change in the rewrite.

### 4.1 Kept

- Operator portraits (AI-assisted generation pipeline).
- Operator chibi tokens for HQ presence. **Chibi tokens stay flat 2D** to contrast the isometric view.
- Presenter portraits.
- Rival leader portraits and insignia.

### 4.2 Changed

- **HQ rooms move from SVG scenes to a raster backdrop + floating floor scene.** Each room ships as one painted backdrop image plus a floating layer that hosts chibi token movement. The current skyscraper has this halfway done — that work is the reference.
- **The grid system on the canvas is kept.** Highlightable, hoverable. It is required for clicking individual rooms and for hover effects.
- **Items collapse to weapons only.** Drop accessory and outfit asset families and their associated systems entirely. The only item assets the rewrite generates are weapon assets.
- **Unique operators get authored portraits with a glowing border treatment.** These are production-time assets generated or revised by AI agents, manually reviewed and approved by the human. They are not runtime AI output.
- **Unique weapons get authored portraits with their own unique glowing border** treatment. Same production-time AI-agent + human-approval workflow; no runtime image generation.
- **Raid backdrops are production-time AI-generated images per dungeon**, revealed slowly through exploration. The tactical map, fog reveal, and operations interaction stay the same. The basic blue tiling is replaced by the backdrop image painted into the tile squares.

### 4.3 Dropped

- Existing HQ room SVG scenes.
- The SVG decorative backdrop production pipeline for rooms.
- **Existing boss SVG assets.** Dungeons need a content rewrite anyway, so current boss assets are not copied forward. Bosses still use newly authored SVG assets generated as part of the new dungeon content packets.
- Outfit and accessory asset families.
- Per-room iso-2:1 contract authoring overhead. (Backdrops are painted; the projection contract only applies to chibi tokens and the floating floor layer.)

### 4.4 Asset Production Notes

- **Background removal is a manual step.** Image assets that need transparent backgrounds (presenters, rivals, room backdrops where relevant) are run through a background remover by the human after generation. Plans must call this out explicitly.
- **AI image generation is content-authoring time only.** No runtime AI image generation. Iteration is back-and-forth between human and agent until the asset is satisfying.
- **Asset playground.** The current SVG playground is rebuilt as a **general asset playground**. It must be able to preview image assets, SFX, attack effects (operator and boss), weapons, and chibi tokens. Optionally combined with the AI playground into one general playground.
- **Room asset shells start small and grow with tier upgrades.** Early-game and mid-game rooms ship visual assets that do not fill the full canvas grid footprint. The grid footprint reserves the full space; tier upgrades replace the asset with a larger version that fills more of the reserved space. This applies to the asset only — the canvas grid footprint stays constant from T1 onward. Late-game rooms may ship near-full assets at T1 if they are visual-feature rooms (e.g. Penthouse).

### 4.5 Sub-Plans Needed

- `rewrite/asset-pipeline` — defines the raster backdrop + floating floor scene contract: layer ordering, projection rules, chibi placement, background-removal step, and how asset plans hook into the scene builder.
- `rewrite/scene-builder` — rebuilt to match how the current skyscraper canvas works. Owns scale, position, and on-canvas placement of room backdrops.
- `rewrite/asset-playground` — replaces the SVG playground. Previews images, SFX, effects, weapons, tokens.
- `rewrite/weapon-asset-family` — defines weapon asset shape, naming, ranks, and per-rank visual escalation.
- `rewrite/raid-backdrop-pipeline` — defines how raid backdrops are generated, revealed, and stored.
- `rewrite/svg-asset-audit` — agent investigation of `content/data/svg-asset-catalog.json` to determine what is actually in use today. Output: keep/drop list. Chibi tokens and operator portraits stay; AI must still be able to construct portraits.
- `rewrite/hq-environment-index` — authors the new repo's single-building HQ environment registry. The current `content/data/hq-environment-index.json` is reference only and must be remediated or regenerated; do not copy the multi-building / SVG-scene contract forward verbatim.

### 4.6 Open Questions

- **Raster backdrop resolution and aspect ratio.** Depends on the room being filled. Less critical than expected because the scene builder handles scale and positioning. But each asset plan needs to declare its target dimensions.

---

## 5. HQ Gameplay

This is where most Ascension problems originated. The rewrite locks the model down before any rooms are authored.

### 5.1 Decisions

- **One building.** The skyscraper. No bodega, no Porter's.
- **Floors and room tiers are both progression axes.** Floors unlock new rooms and entirely new features. Room tier upgrades extend the room's existing feature (raise caps, lower cooldowns, unlock related features — e.g. recruitment room tier raises max recruit rank).
- **Rooms live inside floors.** A floor may be one full-floor room or a small split. Empty floors (a floor with no room) are forbidden.
- **Floor stack is mutable.** Floors are identified by stable ids, not by fixed numeric position. New floors can be inserted between existing ones as future features are added (e.g. the roadmap rooftop helicopter, or any post-launch feature that needs its own floor). Floor "numbers" used in catalogs and docs are visual stack labels for the current authored set, not authoritative sequence. The authoritative ordering is each floor's prerequisite chain (PT level + required room/floor prerequisites).
- **Tier upgrades only.** Each room upgrades by full tier. No incremental sub-upgrades. Every tier upgrade has a real gameplay purpose.
- **Click-to-panel contract.** Every room is a click target. Clicking a room opens the panel for that room's feature. Visual entities inside the room (visiting operators, hurt operators, etc.) are also click targets that open their own sub-panels.
- **No top-level menus that duplicate room features.** If a feature is owned by a room, the only way in is by clicking that room. The bottom bar may carry quick-access shortcut icons that map 1:1 to room panels. The bottom bar never owns a feature.
- **Bottom-bar shortcuts must support badges.** When new operators show up in recruitment, when a contract result needs review, when a narrative event fires — the relevant shortcut shows a `!` badge so the player knows to look. Every shortcut that draws player input must support this.
- **Event log is kept** in the UI shell.
- **Cascading panel system** is the canonical UI shape for in-room/in-feature panels. Right-anchored stack.
- **Old-style modals are kept for narrative events only.** Everything else uses the cascading panel.
- **Resource readouts (cash, reputation) live in the top bar**, always visible.
- **Floor switching** uses hovering up/down arrow buttons in the UI, with a dropdown between them for jumping directly to a named floor.
- **Floor acquisition is cash only**, with one exception: progression beyond certain bands (e.g. unlocking the unique-operator tier) requires a dedicated **Progression-Tier room** that uses cash + reputation to unlock higher tiers. Cash alone does not unlock everything.

### 5.2 Operator Movement

- Operators physically move between rooms and between floors as they live their lives in HQ.
- This is partly implemented today and needs explicit redesign for the new floor-stack model.
- Movement intent is tied to the room a need is being satisfied in (training rooms, medical rooms, recruitment room visitor, etc.).

### 5.3 Sub-Plans Needed

- `rewrite/floor-model` — the floor stack, what each floor unlocks, and the order of floor acquisition. Includes the starter floor's bare minimum content.
- `rewrite/rooms-catalog` — every room: name, owning floor, owned feature, tier-upgrade ladder, what each tier raises/unlocks, when the room first becomes available. One sub-plan **per room** branches off this.
- `rewrite/cascading-panel-shell` — defines the panel stack contract, animation, focus rules, and the click-to-open contract from rooms and entities.
- `rewrite/operator-movement` — pathing, room-occupancy, and floor traversal for chibi tokens in HQ. Tied to the new floor-stack model.
- `rewrite/bottom-bar-shortcuts` — shortcut icons, badge model, and which rooms qualify.

### 5.4 Identified Feature Surfaces That Need Rooms

The canonical room list now lives in [Rooms Catalog](../product/rooms-catalog.md). This summary is for orientation only:

- Lobby.
- Progression-Tier.
- Recruitment.
- Operations Management.
- Team Staging.
- Market.
- Armory.
- HR.
- Medical.
- Training.
- Hall of Honor.
- Raid Archive.
- Tribute Hall.
- Scouting Room.
- War Room.
- Unique Operator.
- Unique Weapon.
- Penthouse.

### 5.5 Open Questions

- (None outstanding. Day-1 state is locked to Lobby + Progression-Tier + Recruitment, with 3 deterministic starter visitors. Pointer/indicator implementation lives in `rewrite/guidance-system`.)

---

## 6. Operators

### 6.1 Decisions

- **Combat package model is kept.** Each operator has a fixed combat package: 3-stage basic skill chain → ultimate. Combat package is permanent at recruitment.
- **Existing combat package content is rewritten, not copied.** New visual effects integration is part of the rewrite.
- **Three roles, locked:** Field Lead, Scout, Support. (Support is the renamed Medic role — the role covers any combat package that keeps the team in the fight: heal, mitigate, buff, cleanse. Not just healing.)
- **Role definitions** (combined traversal job + combat flavor range):

  | Role | Traversal Job | Combat Flavor Range |
  |---|---|---|
  | Field Lead | Tactical authority. Sets push/regroup pace. Affects team cohesion. | Damage-dealer, frontline absorber, or rally-buffer kits. Sub-flavor variation comes from the kit. |
  | Scout | Map reveal, hazard detection, and threat information before encounters. Drives the withdraw decision via Intelligence/Perception. | Speed-burst striker, debuffer/setup, or hazard-control kits. |
  | Support | Mid-raid attrition control, stabilizes injuries between fights. | Healer, damage mitigator, buffer, status cleanser kits. |

- **Skill kits are role-tagged.** Each authored combat package belongs to exactly one role. Within a role, kits vary by sub-flavor (e.g. Support has heal-leaning, mitigation-leaning, and buff-leaning kits). Recruitment picks role first, then rank, then a kit from the matching pool.
- **Attunement and field role are fixed at recruitment.** Training improves the operator you have; it does not redefine attunement or role.
- **No leveling up.** Training only affects trainable stats, capped per rank. **Stats range 1–99.** Unique-rank cap is 99. The new sim balances inside the 1–99 envelope.
- **Operators are autonomous.** They form raid teams on their own and run dungeons on their own. The player is management.
- **Operator roster cap progression:**
  - Start: 3 operators (exactly one team).
  - At Unique-operator unlock milestone: 12 operators (4 teams).
  - Endgame max: 18 operators (6 teams). Uniques count against this cap — there is no separate unique-operator cap.
  - The mechanism for raising the cap is Progression-Tier. The locked ramp is **3 → 6 → 9 → 12 → 15 → 18**.
- **Death is permanent**, but a mid-game **Hall of Honor room** can be upgraded to introduce a chance for an operator to cheat death. Death is more frequent at the start and slower toward the end.
- **Death is processed at end-of-raid, not at the moment of falling.** When an operator goes down mid-raid (skirmish or boss encounter), the raid keeps running. After the raid resolves, the **cheat-death roll** happens for every fallen operator (Hall of Honor gives a real chance; otherwise auto-fail). Cheat-death survivors come back injured/recovering. True deaths trigger an authored **operator-death narrative event** (§11) before the player can move on.
- **Unique operators are authored, not runtime-AI-generated**, with glow-bordered portraits. Their portrait assets can be produced by AI agents during content authoring and manually approved before check-in.
- **Unique operator behavior rules:**
  - **Unique operators do not train.** They never appear in the Training room, regardless of tier. Balance reason: their stats are authored, not trained up. Other operators climb to them; uniques don't climb.
  - **Unique operators only walk in three rooms:** the Unique Operator room, the Unique Weapon room, and the Penthouse. They never appear visually in Recruitment, Team Staging, Medical, Training, Workshop, or any other room.
  - **Without the Penthouse, unique operators cannot recover or deploy.** They can be recruited (via Unique Operator room) but they idle in the Unique Operator/Weapon rooms with no recovery capacity and cannot be assigned to teams. The player can chase unique recruitment goals early, but uniques become combat-ready only once the Penthouse is built.
  - **With the Penthouse, uniques recover there and stage there.** When a unique deploys with non-unique teammates, the unique stages from the Penthouse while teammates stage from Team Staging. Pure-unique teams stage entirely from the Penthouse.
  - **Uniques still appear in the Team Staging panel's roster list** for management visibility, even though they don't visually walk there.
- **Trainable stats:** Strength, Speed, Endurance, Resilience. Fixed-at-recruitment stats: Intelligence, Perception.
- **Needs:** Fatigue and Stress only. **Hunger is dropped.**
- **Emotional state:** Morale and Loyalty (each with current + baseline) are kept.
- **Personality preferences** are kept: risk tolerance, reward focus, recovery bias, social bias, training bias, comfort bias.
- **Injury states** are kept: active / injured / recovering / dead.
- **Social memory** (sparse persistent ties: trusted, preferred, resented, rival, mentorship, grief-linked) is kept.
- **Recurring teams** are kept. Persistent social units that develop names. With the 1-of-each-role team rule, a recurring team is a fixed three-operator unit (1 Field Lead + 1 Scout + 1 Support).
- **Passives** are kept (C+ rank only).
- **Rank advancement is dropped entirely.** Operators stay at the rank they were recruited at.

### 6.2 Open Questions

- (None outstanding. Operator cap is locked to the Progression-Tier ramp defined in Rooms/Floors Catalog.)

### 6.3 Sub-Plans Needed

- `rewrite/operator-model` — the locked operator data shape (stats, needs, morale, social ties, package, role).
- `rewrite/combat-package-content-rewrite` — rewrites existing combat package content for the new game. Each kit declares a role tag and a sub-flavor (heal/mitigate/buff for Support, damage/frontline/rally for Field Lead, burst/debuff/hazard for Scout). Authors must ship enough kits per `(role × rank)` combo for recruitment variety. Integrates with the new visual effects pool.
- `rewrite/unique-operators-catalog` — every authored unique operator: name, dungeon-bound unlock requirement, currency requirement, portrait, and combat package. One sub-plan **per unique operator** branches off this.

---

## 6a. Morale And Loyalty

Morale and loyalty are the two emotional axes per operator. The existing system's state shape, drift-toward-target loop, and threshold flagging carry over. Everything tied to dropped systems (HR policies, Porter's-era rooms, RoomCulture, grievanceLevel) is removed.

### 6a.1 Decisions

- **State shape kept.** `MoraleState` and `LoyaltyState` each carry `current` + `baseline` in 0–100. Drift toward a per-tick computed target with smoothing.
- **Baselines:** new operator baseline morale = **100**, baseline loyalty = **50**. Morale degrades from a maxed start; loyalty grows or erodes from neutral.
- **Morale's role: combat performance + raid refusal.**
  - Damage modifier: `0.75 + morale × 0.0025`. Morale 0 → 75%. Morale 100 → 100%.
  - Speed modifier: `0.80 + morale × 0.0020`. Morale 0 → 80%. Morale 100 → 100%.
  - Both modifiers are computed once at encounter start (when the sim freezes per §9.1) against `baseSpeed` and base damage. Initiative remains pure speed with no RNG — morale-adjusted speed is still deterministic.
  - Refusal threshold: below morale 25 the operator declines deployment. Team formation skips them.
- **Loyalty's role: a "leave the guild" health bar.** Loyalty does not affect combat. When loyalty hits **0**, the operator leaves the guild. Default exit is an event log line (`X has left the guild`); rival-driven exits name the rival (`X has left for Y Guild`). Higher-rank or unique departures may be promoted to a narrative event — decided in `rewrite/narrative-events`.
- **Loyalty=0 leave applies to uniques too.** Penthouse + authored stats make their loyalty hard to crash, but neglecting a unique still loses them.
- **Team morale = average of members' morale.** Emergent, no separate state. Encounter math reads the team average for per-team multipliers where simpler is fine.
- **No pre-raid morale tax.** Raids do not deduct morale on launch — only on bad outcomes.
- **Morale inputs (decrease):**
  - `NeedState.stress`, `NeedState.fatigue`, `InjuryState.severity` (kept).
  - Active narrative event severity + active rival event severity. Replaces the dropped generic event-penalty source.
  - Post-raid outcomes: HOLD at boss prep = small. Mid-raid retreat = medium. Single operator death = large. Full team wipe = largest.
  - Bad team chemistry on raid resolution: `RecurringTeam.cohesion < 40` adds a penalty; `resented` / `rival` / `grief` `NotableTie` stances on the team add more.
  - Existing grief penalty from `NotableTie` (kept).
- **Morale inputs (recovery):**
  - Operational room count (small steady boost, kept).
  - **HR room** owns the main morale recovery rate. Tier upgrades raise both narrative dampening and morale recovery.
  - **Hall of Honor** contributes a morale-target bonus proportional to recorded dead operators, scaled by tier — honoring the dead is the mechanic.
  - **Penthouse** owns morale recovery for unique operators. Uniques never use HR/Memorial paths since they don't walk those rooms.
  - Successful contract completion: small per-team morale bump.
- **Loyalty inputs (decrease):**
  - Rival events targeting the operator or team. Low loyalty → poaching event eligibility.
  - Morale spillover: chronic low morale erodes loyalty via the existing `(morale - 50) × 0.15` term (kept).
  - Operator deaths witnessed: smaller hit than morale, but persistent.
- **Loyalty inputs (recovery):**
  - HR room T2+ adds passive loyalty repair.
  - Successful contract completion: small per-team loyalty bump.
  - Morale spillover (the same term, applied symmetrically when morale > 50).
- **Satisfaction display kept, simplified.** `OperatorDisposition.satisfactionLevel = (morale + loyalty) / 2` survives as the visible aggregate on operator detail panels. No separate state — derived render value only.

### 6a.2 Dropped From The Existing System

- HR policy levers (`contractPosture`, `recoveryTriage`, `staffingPriority`, `rosterFlow`) and their drift contributions. The player's lever is HR-room tier upgrades, not policy dropdowns.
- `RoomCulture` (`comfort` / `tension` / `camaraderie` / `tone`).
- `OperatorDisposition.grievanceLevel`. Collapses into morale duration + threshold checks.
- Porter's-era room template hooks: `room/infirmary:tier_1`, `room/break_room:tier_1`, `room/deck:tier_1`. Replaced by Medical, HR, Memorial, Penthouse depending on role.
- `quitRisk` autonomy flag. Replaced by the loyalty-hits-0 leave rule.
- Field Lead "holds team morale" buff. Team morale is the average.

### 6a.3 Sub-Plans Needed

- `rewrite/operator-model` extends to spec the morale/loyalty data shape, baselines, threshold values, and combat modifier curves.
- `rewrite/rooms-catalog` updates HR and Hall of Honor entries.
- `rewrite/rival-loop` defines rival event templates that target loyalty (poaching is a rival lane).
- `rewrite/encounter-engine` reads the team morale average and applies the damage + speed multipliers at encounter start.
- `rewrite/narrative-events` decides which operator departures are promoted from event-log lines to authored narrative events.

---

## 7. Recruitment

### 7.1 Decisions

- **Recruitment is a room.** Visiting (non-unique) operators hang out in the recruitment room as **chibi tokens walking around**. Click an operator to see their panel and recruit them. Click the room to open the room panel: upgrade, cooldown, visitor cap, max rank.
- **Tier upgrades shape the recruitment funnel.** Each tier raises visitor cap, lowers cooldown, and improves the odds of visitors rolling near the top of the currently unlocked PT rank band, but **Progression-Tier owns the hard rank band cap**. Recruitment cannot roll above the current PT band.
- **Multiple visitors at once, queued.** First-come-first-leaves. A visitor leaves on a timer if not recruited — leave time is roughly the cooldown duration multiplied by the max visitor count.
- **Recruit cost is flat cash** to recruit. Operators have no per-day salary at the start, but salary scales up as you climb ranks (kicks in around C rank — see §17 Economy).
- **Cooldown floor is bounded by AI generation time.** The base cooldown is the shortest time a new visitor can be generated even with AI features turned off; tier upgrades reduce the time added on top of that base.
- **Starter visitor seed is deterministic.** A new game seeds **3 fixed starter visitors** in the recruitment room — exactly one Field Lead, one Scout, one Support. Same operators every new game (same names, same kits, same portraits). After the player recruits or dismisses these 3, the room switches to randomly generated/cycled visitors.
- **Starter operators ship pre-equipped with rank-F starter weapons** so the unloseable first raid (§13) does not require a Workshop unlock first.
- **Recruitment role bias.** Random visitors after the starter seed should bias toward whichever role the player is short on (or rotate evenly), so the player can always form full 3-op teams.
- **Visitor cap respects the operator roster cap.** The recruitment room never holds more visitors than the player has remaining roster space for. (Visitor cap from tier upgrades is the in-room queue cap, not a roster cap.)
- **Bad-state recovery.** If the player ends up unable to progress (no operators left + insufficient cash to recruit), the recruitment room re-seeds **free or near-free lower-rank visitors** so the player can grind their way back up. Detection is automatic; the player does not have to ask. The game should not be permanently lose-able before the Unique tier.
- **Unique operators are not visitors in the regular recruitment room.** The Unique Operator room is a goal catalog: each unique has authored requirements (e.g. defeat dungeon X + hold Y currency), visible progress, and a recruit action only after the requirements are met. Unlocking the room does not make unique operators start showing up randomly.
- **Unique weapons follow a related catalog pattern in a separate Unique Weapon room** that unlocks **after** the Unique Operator room. A unique weapon becomes actionable only after its paired unique operator has joined the guild.
- **Presenters surface on room panels** as upper-body crops, absolutely positioned to pop outside the panel border. Small tag, not the focus.

### 7.2 Open Questions

- **Visitor rank distribution per room tier.** A weighted percentage system like {tier 1: 80% F / 20% E}, climbing toward {top tier: mostly A and B}. Exact ladder is decided when the rooms catalog locks.
- **Runtime AI generation workflow per rank.** Rank is decided in code first; then the local LLM is called with rank-appropriate system prompts (skill list per rank, operator-part examples per rank). Operators visually escalate with rank — bland early, cooler hair/color/clothing later. Workflow detail lives in `rewrite/ai-surfaces`.

### 7.3 Sub-Plans Needed

- `rewrite/recruitment-loop` — visitor generation, cooldowns, costs, queue rules, presenter integration.

---

## 8. Operations (Contracts, Raids, Dungeons)

### 8.1 Decisions

- **Operations are the core gameplay loop.** Operators auto-team and auto-enter dungeons.
- **Dungeons are strictly authored.** Every dungeon ships with: a boss, an enemy roster, a loot table (weapons), a map, a generated backdrop image revealed by exploration, and a theme.
- **Existing dungeons are not copied.** They are rewritten.
- **Weapons are the only loot.** Drop tables are weapon tables, by rank.
- **Contract pickup is owned by an Operations Management room.** Progression-Tier unlocks higher dungeon rank bands; Operations Management tier upgrades improve the odds that the contract pool offers the highest currently unlocked rank, plus contract UI, enemy/boss reveals, and convenience (replacing the old intel resource).
- **No bidding board as a separate top-level surface.** Picking up a contract is rolled into the Operations Management room. The first contract is part of the early guide chain, immediately after recruitment.
- **Active contract limit:** one contract at a time. Multiple teams can raid the same dungeon simultaneously; the next dungeon is picked after the boss is cleared. A later room upgrade can toggle "auto-pick next dungeon" so clearing never stops.
- **Team composition rule:** every team is exactly **3 operators: 1 Field Lead + 1 Scout + 1 Support**. Hard rule. A team cannot form without all three roles present.
- **Team formation is fully autonomous and lives in a Team Staging room.** Player has no veto, lock, or seed input. The room shows formed teams. Tier upgrades are intentionally simple.
- **No manual mid-raid withdraw.** Whether a team retreats from a difficult dungeon is decided by the team's collective intelligence (or the highest intelligence on the team, or a combined intelligence + speed value, against dungeon difficulty). High intelligence + speed lets the team escape with survivors when they're losing; low intelligence keeps pushing and dies more. The boss-commitment HOLD button (§9.2) is a different decision point — that's a planned stop *before* committing to the boss fight, not a panic retreat *during* combat.
- **Raid time is tick-based.** Uses the same world tick the existing game uses (one tick = one in-game hour/minute or whatever the existing constant is — confirm against current code).
- **Failure consequences:** boss-fight failure usually wipes the team. Hall of Honor cheat-death roll applies if the room is built. Unique operators have a base chance (~50%) of not dying permanently. Full-team wipe loses all weapons; a single survivor brings the weapons back. Reputation hit on failure. **Unique weapons are never lost on death** — they're one-offs and that complicates how they're earned.
- **Threat hints on the contract surface are kept** (likely enemy families, boss hints).
- **One dungeon per rank to start** (F through A in one plan; Unique gets its own plan). Built so additional dungeons per rank can be added in parallel later.
- **Non-boss combat is transcript-driven, not live.** Skirmishes with regular enemies, hazards, exploration, and loot pickups all resolve as deterministic transcript events. The minimap plays the transcript back as the raid unfolds. Only boss encounters become live card-style fights (preceded by the §9.2 prep screen).
- **Regular enemy combat shape is intentionally lightweight.** Each regular enemy ships with: 1 attack pattern (no 3-stage chain, no ult), base speed, HP, and basic defense values. Skirmishes still use speed-interleaved initiative — just with much simpler enemy actions than boss encounters.
- **Skirmish presentation = brief side notification.** A one-line summary like *"Team Alpha vs. 3 Hollow Walkers — won, 1 injury"* surfaces on the minimap or in a thin notification stack. Detail accessible by clicking the team or scrolling the event log. No flat marker (too easy to miss); no full card-style playback (too heavy).
- **Sim never pauses for non-boss raid events.** No pause on skirmish start, enemy kill, loot drop, or operator falling. Player reads the event log if they missed something. The only mid-raid pauses are the boss commitment prep screen (§9.2) and the post-raid death narrative event (§11).

### 8.2 Open Questions

- **Withdraw stat formula.** Intelligence vs. dungeon difficulty, a combined intelligence + perception roll, or a new dungeon attribute? Locked in `rewrite/operations-loop`.
- **Tick constant confirmation.** Confirm the existing tick-to-game-time constant before building raid duration tables.

### 8.3 Sub-Plans Needed

- `rewrite/operations-loop` — contract lifecycle, team formation, raid abstraction, withdraw formula, failure consequences.
- `rewrite/dungeons-catalog` — the master catalog. One sub-plan **per dungeon rank** (F, E, D, C, B, A) branches off this. **Unique dungeons get their own plan each.**
- `rewrite/raid-minimap` — minimap rules, fog-of-war / reveal mechanic, backdrop reveal cadence.

---

## 9. Boss Encounters

### 9.1 Decisions

- **Card-based encounter UI is kept.** The general layout works.
- **Operators execute the 3-block basic → ultimate loop.** Stage 1 → Stage 2 → Stage 3 → auto-ult at 3 blocks → reset.
- **Bosses use the same combat package shape** as operators: 3-stage basic chain + ultimate. Attacks either hit one operator or AoE all of them.
- **Phase system is greatly simplified.** Boss fights are autonomous — only enough simulation to be interesting.
- **Unique interactions are reserved for unique bosses.** Mechanics like blocking healing (which would push the player toward different team comps) only show up in unique-rank dungeons.
- **Encounter time freeze is kept.** The broader sim freezes during boss encounters; elapsed encounter time writes back to world progression on resolution.
- **Visual effects are pooled and reused.** Author **5 distinct effects** up front and map operator/boss attack types to them.
- **Combat SFX is added.** Every visual effect tied to a boss attack, operator basic, or operator ultimate gets a matching SFX.
- **Unique bosses are not unique operators.** Unique bosses are dungeon goals used to unlock unique operator recruitment (e.g. "Unique Operator X requires Y cash and defeating Z dungeon"). They are not recruitable themselves.
- **Combat is fully autonomous.** No mid-fight player input. Operators target, time their basics, and fire ults on their own. **The mid-fight intervention library is dropped entirely** — see §9.2 for the prep-screen replacement.
- **Initiative is pure speed.** All actors share one initiative queue, sorted by `baseSpeed` high-to-low. **No RNG jitter** on initiative (the current `+0–5` randomization is removed). Tiebreaker is deterministic (actor id). Initiative is computed once at encounter start.
- **Operators and the boss interleave in the queue.** The boss takes its turn whenever its speed slot comes up — there are no separate "team turns" and "boss turns."
- **Each round, every alive actor takes one turn.** Round ends when the queue empties; cooldowns tick; new round starts.

### 9.2 Boss Commitment Prep Screen

When a team reaches a boss in a dungeon, the sim freezes and a **prep screen** opens. This is the player's only strategic input on the encounter — the fight itself is autonomous.

- **Triggers on boss reach.** Replaces the current "boss confrontation interruption" pattern.
- **Shows the boss:** portrait, name, HP, speed, and **special tags** (e.g. "Reverses Healing" on unique bosses). Special tags are why the player would want to swap teams.
- **Shows the team that reached the boss:** each operator surfaced as a card with portrait, role, rank, speed, current HP, equipped weapon.
- **Hover or click an operator to see full detail.** Hover = compact tooltip with attacks, passive, and weapon. Click = full operator panel via the cascading panel pattern.
- **Read-only round preview.** Displays the interleaved turn sequence based on pure speed, e.g. `Scout (sp 80) → Boss (sp 70) → Field Lead (sp 60) → Support (sp 50)`. The player cannot reorder — speed determines everything. Player strategy is choosing the right team, not micro-managing the order.
- **Team swap.** Player can swap to **any team** in the guild — currently in a regular raid timeline for the active dungeon, idle at HQ, or otherwise available. Swapping a team that is mid-raid pulls it out of that regular raid timeline; the implementation plan decides whether that timeline aborts, recalls cleanly, or preserves already-earned loot.
- **Combat power estimate.** Qualitative headline (`Likely Win` / `Even Match` / `Risky` / `Suicide Mission`) backed by a hidden numeric calculation factoring team stats + weapons + kit power vs. boss difficulty + special tags. Numeric value visible on hover.
- **COMMIT** kicks off the autonomous fight.
- **HOLD** retreats the team from the boss room. Dungeon stays open. Contract stays active. No death risk on a HOLD. Player can re-attempt later, optionally with a different team.
- **Boss completion rewards are intentionally large** to push the player to commit instead of perpetually holding.

### 9.3 Open Questions

- **Prep screen presentation pattern.** Centered blocking overlay, full-takeover panel-stack, or some new pattern? Decided in `rewrite/boss-commitment-prep-screen`. The `§16` rule that "old-style modals stay only for narrative events" still applies — this is a new pattern, not a legacy modal.
- **Cross-raid team-swap tech model.** When a team mid-raid is swapped to a different boss, what happens to the raid they left? Pause until reassigned, continue with remaining teams, or auto-recall? Decided in `rewrite/operations-loop` and `rewrite/boss-commitment-prep-screen`.
- **Team wipe handling.** If everyone dies in an encounter, is there anyone left to "bring back" cheat-death survivors? Edge case for `rewrite/operations-loop`.

### 9.4 Sub-Plans Needed

- `rewrite/encounter-engine` — the encounter sim shape, pure-speed initiative, simplified phase rules, freeze rules. Drops intervention machinery from the current code.
- `rewrite/encounter-effects-pool` — the authored effects library (5 effects) and the attack-to-effect mapping rules.
- `rewrite/encounter-sfx` — combat sound effect inventory and triggering rules.
- `rewrite/boss-commitment-prep-screen` — the prep screen UI, team-swap behavior, hover/click operator detail, combat power estimate calculation, COMMIT/HOLD behavior.

---

## 10. Items / Weapons

### 10.1 Decisions

- **Items collapse to weapons only.** No accessories, no outfits.
- **Weapons are the only drop.** They drop from raids and are sold/bought on the market.
- **The Workshop room owns the market.** Clicking the workshop opens the market screen. Buying and selling are workshop actions. Workshop tier controls market quality and the loot filter.
- **Weapons have generic per-rank loot tables.** F starts grounded (scissors, broken knife). C–A become real weapons (swords, guns). B–A can become mystical / attunement-powered.
- **Mystical weapons (B, A, and unique) can carry additional effects** beyond stat boosts. Start simple.
- **Unique weapons exist** and pair with specific unique operators. Not every unique operator has a unique weapon, but every unique weapon has an associated unique operator. They live in the Unique Weapon room and have their own goal-driven unlock chain after the paired operator is recruited. Authored portraits use their own unique glow border.
- **Crafting is dropped completely.**
- **Equip flow:** manual by default. There is an **auto-equip button** that fills loadouts from the highest-rank stack.
- **Inventory:** stack-based. Unique weapons are single-copy.
- **No rank cap on equip.** Anyone can use any weapon. Keep it simple.
- **Drop on death:** weapons stay if at least one team member returns (even injured). Full-team wipe loses non-unique weapons. **Unique weapons never lost.**
- **Market refresh:** runs on its own cooldown controlled by the workshop room.
- **Loot filter is kept.** Auto-sells junk. The threshold matches the workshop's current minimum rank (set by tier). The top two highest ranks the workshop can sell are excluded from auto-sell. **Unique weapons are unsellable.**

### 10.2 Open Questions

- (None outstanding — see §10.1.)

### 10.3 Sub-Plans Needed

- `rewrite/weapon-loot-tables` — per-rank loot tables: F/E/D grounded, C/B real, B/A mystical. Drop rates by enemy/elite/boss source. One sub-plan **per weapon tier** branches off this.
- `rewrite/workshop-market` — market UI, refresh rules, selling rules, equip flow, loot filter integration.
- `rewrite/unique-weapons-catalog` — every authored unique weapon. One sub-plan **per unique weapon** branches off this.

---

## 11. Narrative Events And Presenters

### 11.1 Decisions

- **Narrative events are kept.** They remain the early- and mid-game variety layer, and continue in the endgame at lower frequency mixed with rival events.
- **They follow the existing presenter ownership model** (every beat resolves to a domain-correct presenter).
- **Presenters survive intact.** Assistant, cook, bartender, quartermaster, doctor, compliance officer.
- **Presenters unlock when their first associated room is built.** They appear in panels for rooms they relate to.
- **Pressure events that are not rival-driven are dropped.** Generic city / public / institutional pressure events go away. Pressure as a system survives only as a rival lane.
- **Narrative events are owned by an HR room.** The HR room unlocks early. Tier upgrades to the HR room reduce negative event frequency — this is the natural frequency taper as the player moves into rival-driven endgame.
- **Cadence is bounded by AI generation time** (same model as recruitment cooldowns). Existing cadence values are a fine starting point.
- **The choices model is kept** (authored choices with deterministic effect bundles), but a lot of existing event content needs to be rewritten because the underlying systems have been simplified. Plug gaps with new authored events. Update AI system prompts accordingly.
- **Pending events are save-safe.** Refreshing or reloading restores the same unresolved event with the same choices.
- **Operator deaths are a narrative event type.** When an operator truly dies (cheat-death roll failed at end of raid), an authored operator-death event fires — sim pauses, modal opens with the dead operator's portrait and a final beat. Doctor or compliance officer presenter depending on context. Multiple deaths from the same raid can batch into one event with multiple subjects, or fire sequentially — decided in `rewrite/narrative-events`. No choice mechanic required for these events; "acknowledge and continue" is the minimum interaction.
- **AI framing is kept for all narrative events**, including operator-death events. The AI takes a deterministic payload (subjects, family, tags, presenter, choices, effect bundles) and writes the prose wrapper: `title`, `briefing` (2–4 sentence narrative setup), and per-choice `label`/`description`/`consequenceSummary`/`resolutionSummary`. The AI never invents operators, rooms, choices, outcomes, or hidden state — it only writes prose around fixed structure. Presenter voice (cook, bartender, doctor, compliance officer, etc.) shapes the tone via a `voiceBrief` block in the payload.
- **Operator-death events reuse the same `incident-framing` AI surface.** No separate AI surface is authored for deaths — they're just another incident family from the AI's perspective.

### 11.2 Open Questions

- (None outstanding.)

### 11.3 Sub-Plans Needed

- `rewrite/narrative-events` — incident framework shape, cadence, room gating, AI framing rules, content rewrite.
- `rewrite/presenters-catalog` — the canonical presenter roster, their domains, their unlock rooms, and their voice rules.

---

## 12. Rivals

### 12.1 Decisions

- **Rivals are the late-game pressure system.** Public/civic pressure events are dropped except where they come from rivals.
- **The guild leaderboard is implemented.** Position-only display — no exposed metric, no numeric score. Player sees an ordered list of guild names and that's it.
- **All rivals in the game ship onto the leaderboard at random positions** when the rival room unlocks. There is no fixed leaderboard count — the system must accommodate growing the rival roster over time as new rivals are authored.
- **Player always starts at the bottom of the leaderboard.** The player's "current rival" is always the rival immediately above them.
- **Each rival has an HP bar.** All sources damage it: completing contracts that intersect their lane, defeating their associated dungeons, narrative-event choices.
- **Defeated rivals are flagged.** Once defeated, a rival is permanently flagged and always stays below the player on the leaderboard. They never appear as the current rival again. (They can still send random non-current rival events — see below.)
- **Leaderboard updates fire only on player rival-victory events.** No autonomous tick or background drift. On each victory:
  - The newly defeated rival drops to a **random position somewhere below the player**.
  - All non-defeated rivals (above the player) shuffle randomly within bounds.
  - Defeated rivals below the player shuffle randomly within their half.
  - The player's position advances one slot.
  - The rival now immediately above the player is the new current rival.
- **Always exactly one current rival at a time.** The player can also receive **random events from non-current rival guilds** (including defeated ones) that affect both the player and the current rival. This keeps the world feeling alive.
- **Rival move templates are authored as repeatable events.** A defeated rival can still surface a passing move (press hit, contract challenge, sponsor poaching) as a random non-current rival event affecting the player and current rival.
- **Rival narrative profiles and move templates from the current game are reference material.** `rewrite/rival-loop` and `rewrite/rivals-catalog` define the new-game contracts; do not carry current public-pressure-specific surfaces forward as active requirements.
- **End-state behavior.** When the player has defeated every rival on the leaderboard, the current-rival surface is empty until new authored rivals are added. New rivals slotted into the catalog later seed at random positions above the player and become eligible current rivals.
- **Direct rival battles are deferred** to the new game's roadmap.
- **Rival HQs are dropped entirely.** No plan to ever build them.

### 12.2 Open Questions

- (None outstanding.)

### 12.3 Sub-Plans Needed

- `rewrite/rival-loop` — HP, defeat, leaderboard movement, current-rival selection, non-current rival random events.
- `rewrite/rivals-catalog` — every authored rival: id, lane, narrative profile, move templates, portrait/insignia. Move templates rewritten as repeatable events.

---

## 13. Guidance And Tutorial

### 13.1 Decisions

- **Adopt the persistent guidance plan** (rewritten for the new game) as the canonical onboarding/tutorial layer.
- **Every room unlock, floor unlock, and feature unlock is guided.** The player always has a next goal.
- **Guidance tapers at Unique rank** (items, dungeons, operators). After the taper, the long-tail goals are recruiting unique operators and beating rivals.
- **Persistent guide card is an always-on free-floating UI element**, not a room. Mostly a small panel; for big steps (unlocking a room, using a new feature for the first time) it expands with a different border to mark importance.
- **Two presentation modes:**
  - Small persistent card for everyday next-step nudges.
  - Larger blocking-tutorial mode for the first few mandatory steps and any moment that genuinely blocks progression. Anything that blocks progress gets a forced tutorial — the player physically can't do other things until they complete the bare minimum.
- **Hovering pointer indicator on rooms with active blocked-tutorial steps.** The canvas highlights the room the player needs to click next.
- **Zero-state opening.** New game starts with no operators and no functional features beyond what's required to begin the guide. The first floor is unlocked with the lobby (presenter + guide) and the recruitment room with **3 deterministic starter visitor operators** already present (one Field Lead, one Scout, one Support — same operators every new game).
- **Mandatory opening beats (locked):**
  1. Welcome / guide intro (auto on new game, grants starting cash sized for the next required step).
  2. Recruit all 3 starter operators (single multi-action step with `0/3` progress).
  3. Buy the floor that unlocks Operations Management + Team Staging rooms.
  4. Pick first contract, run first raid, reach boss, COMMIT, win.
  5. Buy the floor that unlocks the Workshop (so equipping becomes possible post-raid).
- **First raid is unloseable.** The starter operators ship pre-equipped with rank-F starter weapons (see §7), the dungeon is tuned to guarantee a win, and the boss prep screen shows a confident outcome read.
- **Step granularity: multi-action where it teaches a verb.** Steps like "recruit 3 operators" / "kill 5 enemies" / "equip 3 weapons" are single steps with progress counters (`0/N`). **No consecutive same-type events** — chain related actions into one step instead of stretching them across multiple.
- **Reward sizing principle: each step's reward almost exactly covers the next required spend.** Player feels constant forward motion, never sits on excess cash. The `rewrite/guidance-system` executor picks the **mid-to-late game transition point** where rewards stop fully covering the next spend and the player has to grind for the gap. Game must not feel harsh before that transition.
- **Reward currency rules.** Cash on every guide step. Reputation **only on steps where the next step requires significant reputation** (safeguard against the player having spent it down). Gameplay (contracts, raids) continuously generates reputation independent of the guide.
- **Sequence after the mandatory opening is narrative-driven.** Order of subsequent room unlocks (HR, Medical, Training, Hall of Honor, Progression-Tier, Unique Operator room, Unique Weapon room, etc.) is decided in `rewrite/guidance-system`. The only hard constraint: a room must be unlocked before the guide can reference its feature.
- **Guide always runs**, even on new games after a previous completion. The reward system and the guide are symbiotic — the guide unlocks features, the rewards pay for the next step.
- **Mid-to-late game grind expectation.** After the executor's chosen transition point, the guide stops fully funding the next step. Player must complete contracts to bridge the gap. Pacing target: 1–2 hours to first Unique recruit (see §1).

### 13.2 Open Questions

- (None outstanding here. The mandatory opening beats and reward principles are locked above; the full step list past the opening is delegated to `rewrite/guidance-system`, including the executor's choice of mid-to-late grind transition point.)

### 13.3 Sub-Plans Needed

- `rewrite/guidance-system` — port and re-scope the persistent-guidance plan to the rewrite's smaller surface area. Includes the room-pointer indicator and the big-step expanded card variant.
- `rewrite/unique-unlock-goals` — every unique operator's authored unlock chain. Lives alongside `rewrite/unique-operators-catalog`. One sub-plan per unique operator (combined with the operator's own plan or split — TBD).

---

## 14. AI Features

### 14.1 Decisions

- **Local-first, Ollama-compatible.** Same architecture posture as Ascension's shipped AI layer.
- **Game must be fully playable with AI off.** No core loop depends on live model access.
- **AI-disabled mode is first-class.** Toggleable from start screen and in-game settings.
- **AI never owns gameplay authority.** Triggers, hidden modifiers, choice availability, and outcome logic stay deterministic. AI may phrase, contextualize, vary copy, and assemble approved-prefab content.
- **Surfaces kept from Ascension:** `incident-framing`, `operator-identity`. Both carry over. `incident-framing` is reused for operator-death events (no new surface needed).
- **Surface dropped from Ascension:** raid result summaries (the AI-authored one-line raid recap). Raid results render from authored data only.
- **Dungeons are handmade.** No AI-generated dungeon flavor copy, descriptions, or environmental text. All authored.
- **Roadmap (future, not initial scope):** AI-generated rival event framing (uses the same prose-wrapper pattern as `incident-framing`), AI-generated weapon flavor.
- **AI image generation is content-authoring time only.** Engineering/content agents may generate, revise, and place raster or SVG assets while executing plans, with iterative human approval and manual steps like background removal. This is separate from runtime local AI. No runtime image generation ships in the game.
- **Pre-generation queue** is the latency model. Game-side cooldowns (recruitment, narrative events) are sized to give the queue time to keep up.

### 14.2 Open Questions

- (None outstanding for the locked surfaces. Roadmap surfaces need their own plans when added.)

### 14.3 Sub-Plans Needed

- `rewrite/ai-surfaces` — the locked list of generation surfaces, their schemas, fallback authored copy, and the pre-generation queue contract.

---

## 15. Audio And SFX

### 15.1 Decisions

- **Existing audio system is kept.** Existing music carries over; expansion is roadmap, not initial scope.
- **Combat SFX is added.** Every visual effect tied to a boss attack, operator basic, or operator ultimate gets a matching SFX.
- **No per-room or per-floor ambient layers.** The current game uses ambient music as ambience (Minecraft-style); that stays.
- **UI sound effects need a full audit.** Some exist today and are inconsistent. The audit produces a single pattern.

### 15.2 Open Questions

- (None outstanding. UI audit findings shape `rewrite/audio-inventory`.)

### 15.3 Sub-Plans Needed

- `rewrite/audio-inventory` — every audio asset family, where it plays, what triggers it. Locks the budget and the missing-asset list. Includes the UI SFX audit.

---

## 16. UI / UX

### 16.1 Decisions

- **Cascading right-anchored panel stack** is the canonical UI shape for room/feature panels.
- **Old-style modals stay only for narrative events.**
- **No top-level button menus that duplicate room features.** Click rooms to open panels. Bottom bar is shortcut-icons only (with `!` badges — see §5.1).
- **Tailwind v4 + className.** Replace custom CSS where it duplicates Tailwind utility coverage. **Hard rule for agents:** never copy over CSS the new repo isn't using; never write custom CSS that could be done with Tailwind utilities. Custom CSS survives only for project-specific color variables, glass-panel `backdrop-filter` blur, complex multi-surface effects, and animation keyframes that don't express as utility classes. See [Visual / UI Direction](../product/ui-direction.md) for the full migration rules.
- **Single tooltip pattern** across the entire UI. The current game has multiple tooltip patterns and it shows. The rewrite ships exactly one.
- **Minimum font size `text-xs`.** Never below.
- **Lean into the existing visual language** in `app/ui`, `app/app.css`, and shipped assets — but reuse asset patterns, not code.
- **Panel stack:** FIFO collapse rule, no hard cap. Clicking outside the panel stack collapses everything. Panels must be categorized correctly — clicking a different room collapses the previous room's panels and opens the new room's category. (Recruitment panels are not part of operations panels, etc.)
- **Panel reuse principle.** Detail panels (operator detail, weapon detail, recruit panel, leaderboard panel, raid detail, etc.) are **reusable components** that open from any entry point that references the underlying entity. Examples:
  - Operator detail opens from: clicking a chibi anywhere in HQ, clicking an operator row in the Team Staging list, clicking an operator row in Medical/Training/Penthouse, clicking an operator inside a team detail panel.
  - Weapon detail opens from: clicking a weapon in Workshop/Armory inventory, clicking the equipped-weapon slot inside an operator detail panel, clicking a weapon row in any list.
  - Bidirectional equip: from operator detail, click their weapon (or "no weapon equipped") → opens weapon list / detail panel for swap. From Armory, click a weapon → opens an equip target list (operators without that weapon class equipped) for quick equip.
  - Recruit panel opens from: clicking a chibi visitor in Recruitment, clicking a row in the visitor list panel.
  - Leaderboard panel opens from: clicking the Scouting Room, clicking the leaderboard row inside the War Room.
- **Desktop-only.** No responsive / mobile support. Don't waste effort on it.
- **Animations are open to design pass.** Goal: smooth modern animations everywhere without overdoing it. Clean.
- **Keyboard shortcuts:** roadmap, not initial scope.

### 16.2 Open Questions

- (None outstanding.)

### 16.3 Sub-Plans Needed

- `rewrite/ui-shell` — panel stack contract, tooltip pattern, badge model, viewport rules.
- `rewrite/visual-language-audit` — surveys what survives from `app/ui`, what is restyled, what is dropped.

---

## 17. Resources And Economy

### 17.1 Decisions

- **Resources:** Cash and Reputation only. **Intel is dropped.**
- **Cash sources:** operations (contract payouts), weapon sales, narrative event payouts, guide rewards.
- **Cash sinks:** floor purchase, room tier upgrade, weapon purchase, recruit signing, **operator salaries** (kicks in around C rank — higher-rank operators require ongoing salary).
- **Reputation** continues as a tracked resource. Required (with cash) for the Progression-Tier room to unlock higher progression tiers.
- **Balance pass is iterative.** AI agents run seeded campaigns through the headless simulation harness (§2.5), read time-to-event metrics, adjust balance tables, and re-run. The harness must be fast enough to run many iterations per session.
- **Target reach time to Unique rank: 1.5 hours wall-clock, 1–2 hour band.** See §1.2. The economy is balanced toward this target.
- **Existing balance values are a starting reference, not authority.** Re-derive against the new room/floor/dungeon shape.
- **Game should not feel harsh before the Unique tier.** Operator deaths happen and should happen often early, but cash starvation, permanent loss spirals, and stuck states should be recoverable through the bad-state safety net (§7) and the guide reward system (§13). Difficulty bites starting at Unique-tier content.

### 17.2 Open Questions

- (None outstanding for shape. Specific numeric tables are decided in `rewrite/economy`.)

### 17.3 Sub-Plans Needed

- `rewrite/economy` — locked resource list, source/sink ledger, balance tables, starter currency, per-rank floor cost curve, salary curve, agent-driven balance iteration harness.

---

## 18. Dropped Features (Confirmation List)

Removed entirely from scope unless re-justified by a future decision:

- Tauri desktop host, file-backed saves, desktop adapters, `tauri-test/`.
- Bodega and Porter's HQs and their relocation arc.
- Districts, factions, and public/civic pressure as systems.
- Crafting system (rooms, recipes, materials, fabrication-bay-as-crafting).
- **Consumables and the prep system** (Porter's-era prep room, raid consumable items, consumable-burn intervention).
- Outfits and accessories (item families, asset families, equip/auto-equip rules).
- **Mid-fight player intervention library in boss encounters** (replaced by pre-encounter prep screen — see §9.2).
- **RNG jitter on encounter initiative** (initiative is now pure speed).
- **AI-authored raid result summaries.** Raid results render from authored data only.
- Generic / civic / institutional pressure events outside of rivals.
- HQ room SVG scenes and the SVG decorative backdrop pipeline.
- Per-room bespoke iso-2:1 SVG asset contracts (replaced by raster backdrops).
- Current boss SVG assets (new boss SVGs are authored as part of new dungeon packets).
- Multi-HQ progression (the rewrite drops the bodega and Porter's tiers and never adds a fourth HQ).
- Intel as a resource.
- Hunger as an operator need.
- Rank advancement.
- Sandbox preview as a top-level entry point (rolled into dev menu).
- Top-level bidding board as a separate surface (rolled into Operations Management room).
- Direct rival battles (deferred to roadmap).
- Rival HQs.
- Manual mid-raid withdraw.
- Mobile / responsive UI.
- Keyboard shortcuts (deferred to roadmap).
- Rival HQ visibility.

---

## 19. Sub-Plan Index

These are the sub-plans this master document spawns. Each becomes its own file with the shape from §0.1.

| Plan ID                              | Domain      | Blockers                                                                  |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------- |
| `rewrite/repo-setup`                 | Tech        | —                                                                         |
| `rewrite/world-doc-rewrite`          | World/Docs  | This document locked                                                      |
| `rewrite/product-doc-cleanup`        | World/Docs  | `rewrite/world-doc-rewrite`                                               |
| `rewrite/presenter-domain-rework`    | World/Docs  | `rewrite/rooms-catalog`                                                   |
| `rewrite/dev-menu`                   | Tech        | `rewrite/repo-setup`                                                      |
| `rewrite/dev-console`                | Tech        | `rewrite/repo-setup`                                                      |
| `rewrite/headless-sim-harness`       | Tech        | `rewrite/repo-setup`, `rewrite/operator-model`                            |
| `rewrite/asset-pipeline`             | Assets      | —                                                                         |
| `rewrite/scene-builder`              | Assets      | `rewrite/asset-pipeline`                                                  |
| `rewrite/asset-playground`           | Assets      | `rewrite/asset-pipeline`                                                  |
| `rewrite/svg-asset-audit`            | Assets      | —                                                                         |
| `rewrite/weapon-asset-family`        | Assets      | `rewrite/asset-pipeline`                                                  |
| `rewrite/raid-backdrop-pipeline`     | Assets      | `rewrite/asset-pipeline`                                                  |
| `rewrite/hq-environment-index`       | HQ          | `rewrite/asset-pipeline`, `rewrite/floor-model`, `rewrite/rooms-catalog`  |
| `rewrite/floor-model`                | HQ          | —                                                                         |
| `rewrite/rooms-catalog`              | HQ          | `rewrite/floor-model`                                                     |
| `rewrite/operator-movement`          | HQ          | `rewrite/rooms-catalog`, `rewrite/floor-model`                            |
| `rewrite/bottom-bar-shortcuts`       | HQ          | `rewrite/rooms-catalog`                                                   |
| `rewrite/cascading-panel-shell`      | UI          | —                                                                         |
| `rewrite/ui-shell`                   | UI          | `rewrite/cascading-panel-shell`                                           |
| `rewrite/visual-language-audit`      | UI          | —                                                                         |
| `rewrite/operator-model`             | Operators   | —                                                                         |
| `rewrite/combat-package-content-rewrite` | Operators | `rewrite/operator-model`, `rewrite/encounter-effects-pool`              |
| `rewrite/unique-operators-catalog`   | Operators   | `rewrite/operator-model`, `rewrite/dungeons-catalog`                      |
| `rewrite/recruitment-loop`           | Recruitment | `rewrite/operator-model`, `rewrite/rooms-catalog`                         |
| `rewrite/operations-loop`            | Operations  | `rewrite/operator-model`                                                  |
| `rewrite/dungeons-catalog`           | Operations  | `rewrite/operations-loop`                                                 |
| `rewrite/raid-minimap`               | Operations  | `rewrite/operations-loop`                                                 |
| `rewrite/encounter-engine`           | Combat      | `rewrite/operator-model`                                                  |
| `rewrite/encounter-effects-pool`     | Combat      | `rewrite/encounter-engine`                                                |
| `rewrite/encounter-sfx`              | Combat      | `rewrite/encounter-engine`                                                |
| `rewrite/boss-commitment-prep-screen` | Combat     | `rewrite/encounter-engine`, `rewrite/operations-loop`                     |
| `rewrite/weapon-loot-tables`         | Items       | `rewrite/weapon-asset-family`                                             |
| `rewrite/workshop-market`            | Items       | `rewrite/weapon-loot-tables`, `rewrite/rooms-catalog`                     |
| `rewrite/unique-weapons-catalog`     | Items       | `rewrite/workshop-market`, `rewrite/unique-operators-catalog`             |
| `rewrite/narrative-events`           | Narrative   | `rewrite/rooms-catalog`                                                   |
| `rewrite/presenters-catalog`         | Narrative   | `rewrite/rooms-catalog`                                                   |
| `rewrite/rival-loop`                 | Rivals      | `rewrite/operations-loop`                                                 |
| `rewrite/rivals-catalog`             | Rivals      | `rewrite/rival-loop`                                                      |
| `rewrite/guidance-system`            | Tutorial    | `rewrite/rooms-catalog`, `rewrite/operations-loop`                        |
| `rewrite/unique-unlock-goals`        | Tutorial    | `rewrite/unique-operators-catalog`, `rewrite/dungeons-catalog`            |
| `rewrite/ai-surfaces`                | AI          | —                                                                         |
| `rewrite/audio-inventory`            | Audio       | —                                                                         |
| `rewrite/economy`                    | Resources   | `rewrite/floor-model`, `rewrite/rooms-catalog`, `rewrite/operations-loop`, `rewrite/headless-sim-harness` |

---

## 20. Outstanding Questions Requiring Back-And-Forth

All cross-cutting questions are resolved. Remaining design detail belongs inside individual sub-plans, scoped by the decisions in this document.

If a sub-plan author surfaces a question that genuinely contradicts or extends a §-locked decision, bring it back to this document before answering — do not silently re-litigate inside a sub-plan.

---

## 21. Roadmap (Deferred Beyond Initial Scope)

These ideas are deliberately out of scope for the initial rewrite. Capture them so they aren't lost; do not author content or plans for them yet. Per §0.8, sub-plan authors who surface additional deferred material during authoring append it to `docs/roadmap.md` rather than this section.

- **Direct rival battles.** Currently dropped (§12). Future post-rivals expansion may add a system where the player's team raids a rival's site directly.
- **Rival HQ visibility / rival rosters.** Dropped (§12). Future expansion may render rival guild HQs as visitable side surfaces.
- **Tauri desktop host.** Dropped (§2). Reconsider once the web build is feature-complete.
- **Rooftop helicopter pad / international expansion.** Decorative-feature-room idea for post-NYC content. The visual is an actual rooftop helicopter that becomes the player's transport to international dungeon sites in a future expansion. Lives above the Penthouse on the tower stack when added. No current implementation; the world model already supports international dungeons (per `docs/world/premise-and-tone.md` — *was* documented as future scope, now lives here).
- **Mobile / responsive UI.** Dropped (§16). Reconsider only after a desktop release proves out.
- **Keyboard shortcuts.** Dropped (§16). Add when the player base asks for them.
- **Music expansion.** Existing music carries; broader track library is roadmap (§15).
- **AI rival event framing surface.** Surface listed in §14 roadmap. Same prose-wrapper pattern as `incident-framing` when added.
- **AI weapon flavor framing surface.** Same pattern.
