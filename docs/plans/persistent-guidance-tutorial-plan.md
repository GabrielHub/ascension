# Persistent Guidance And Rewarded Tutorial Plan

Scope: define the follow-up system that replaces one-off onboarding copy with a persistent, rewarded, narrative guidance layer. This plan covers the guidance product and UI architecture. It does not re-litigate the HQ or Operations shell refactors, but it must integrate cleanly with both. The intended player-facing scope is the full hand-held campaign from the opening bodega through Porter's and into the first stable skyscraper handoff.

## Goal

Build a modern idle-game-style guidance system that:

- is always present during early and midgame
- always offers the next meaningful goal
- behaves like a modern idle-game guide rail where the player is continually pointed at the next useful action, spend, or payoff until the skyscraper HQ establishes the repeatable endgame
- acts as a constant recommendation rail through the full bodega and Porter's playthrough instead of fading after the opening
- explains every player-facing upgrade, room, and feature introduction through rewarded objectives instead of stuffing permanent prose into steady-state panels
- starts a new campaign from a true zero-state onboarding baseline with no prebuilt gameplay rooms, no pre-existing operators, and a fast first-use bootstrap
- tells the player which room unlock, room upgrade, or systems investment should come next when multiple valid options exist
- uses narrative framing so the guidance feels like an authored hand, not just a checklist
- continues across the full headquarters arc until the repeatable skyscraper endgame is firmly established
- tapers only once the player has reached the repeatable skyscraper loop and no longer needs constant hand-holding

This is not “tutorials, but more.” It is a persistent progression layer that teaches, motivates, rewards, and keeps the player moving.

## Product Direction

The intended model is closer to modern idle and incremental games than to a short front-loaded tutorial:

- every meaningful system introduction is attached to an objective
- every player-facing upgrade unlock is attached to an objective or explicit follow-up objective step
- every major room and room-upgrade band has a recommended first-purchase path rather than leaving new players to infer build order from static UI text
- every room unlock and every room upgrade the player is expected to buy for progression is explicitly tutorialized as part of the intended balance rail
- every objective explains why the system matters in plain language
- objectives pay out meaningful rewards on completion
- objective rewards should often tee up the next recommendation so the player feels a continuous push forward
- objective chains continue as new rooms, upgrades, mechanics, and buildings unlock
- the player should rarely be without a recommended next step before the repeatable skyscraper endgame
- the "next step" can be small or large: finish a raid, secure the next contract, unlock a room, buy an upgrade, equip a weapon, sell excess gear, or make the next balance-critical spend

The guidance layer should carry the long-form explanation currently leaking into room panels, room culture blurbs, and other steady-state UI surfaces.

## Non-Regression Rule

Do not delete or hollow out the current focused guidance and interruption framing until the persistent system has explicit replacements for:

- spotlight / coachmark beats
- blocking narrative briefings
- save-safe objective progress
- presenter-driven framing
- preview-mode suppression rules where still appropriate

Minimalism in the core UI depends on this system actually carrying explanation load. If the guidance layer is weak, the product will regress into confusion even if the panels look cleaner.

## Design Intent

The game should feel like it always has a live narrative operator in the player’s ear:

- introducing the next room
- telling the player why a new upgrade matters
- framing new pressure and opportunity
- rewarding forward motion
- connecting isolated systems into a coherent campaign arc

That guidance should begin in the opening HQ, continue through Porter's, continue through the skyscraper climb, and only relax once the player has reached the repeatable skyscraper endgame loop.

The tutorial is therefore not just an opener. It is the campaign guide layer through the entire climb into the skyscraper headquarters, where it can finally taper from prescriptive tutoring into long-run strategic nudges for the endless-style endgame.

The system exists so that steady-state UI can stay lean:

- room panels explain current state and available actions
- the guidance layer explains why this matters now, what to do next, and what the reward is

## Core Principles

1. **Always-on before endgame.** Before the repeatable skyscraper loop, the player should almost never be without a current guided objective.
2. **Reward every major teachable step.** Upgrades, room unlocks, new systems, and major first-use actions should pay out something meaningful.
3. **Narrative, not spreadsheet.** Objectives should sound like an authored guide, superior, fixer, mentor, or house voice, not an enterprise task tracker.
4. **Use the right intensity.** Some beats are passive and persistent, some spotlight a control, and some interrupt. One system should own the ladder of intensity.
5. **Lean steady-state UI.** Explanatory prose should migrate out of permanent room and category panels whenever guidance can carry it better.
6. **Save-safe and stage-aware.** Objective progress, reward claims, retirements, and chain advancement must survive save/load, relocation, and building changes.
7. **Do not over-hand-hold forever.** Guidance stays strong through the climb, then relaxes once the player is established in the repeatable skyscraper endgame.
8. **Start blank, bootstrap fast.** A new campaign should not begin with already-solved room or roster state; the opening chain must build the first room, first operator, and first workable loop quickly enough that "from scratch" feels motivating rather than stalled.

## Current State

- `app/ui/guidance-host.tsx` supports focused coachmarks with spotlight anchoring and a centered fallback.
- `app/ui/interruption-host.tsx` supports blocking narrative delivery.
- Opening guidance, narrative presenters, and save-safe authored beats already exist.
- The current system is still closer to authored onboarding beats than to a persistent objective rail.
- The current system does not yet act like a full-campaign recommendation engine for room order, upgrade order, or relocation readiness.
- "Why this room matters" style explanation is still partially carried by steady-state management UI and room surfaces.

## Target End State

### One Guidance Ladder

The game should have one coherent guidance ladder with four presentation modes:

- `persistent`: always-on objective card with current goal, reward, and short narrative framing
- `focused`: anchored coachmark / spotlight for precise teachable interactions
- `blocking`: interruption-backed narrative briefings for major transitions, warnings, or irreversible steps
- `completed`: claim / payoff / next-objective handoff state

These are not four separate systems. They are one authored objective framework with different delivery intensities.

### Persistent Guide Card

The persistent guide card is the steady-state home of the system.

It should:

- stay visible during ordinary play
- show the current objective title, concise explanation, and reward
- show the recommended next spend, unlock, upgrade, or action when the player has multiple plausible choices
- show progress when progress is measurable
- allow expansion into a richer detail panel when needed
- start at the top-center of the screen by default
- be user-draggable so the player can move it wherever they want on the screen
- remain present on headquarters, operations, and boss-commitment combat surfaces
- render above ordinary shell UI and play surfaces while still yielding to blocking narrative and interruption modals

This is the replacement home for much of the “why this matters” explanation that should leave room panels.

### Blank-Slate Opening Contract

The opening of a new campaign should be treated as part of the authored guidance rail, not as a pre-solved baseline.

Rules:

- the canonical player-facing start state has no pre-existing operators
- the canonical player-facing start state has no prebuilt gameplay-functional rooms or purchased room upgrades
- the canonical player-facing start state may still show the building's physical spaces and designated room slots, but those spaces are not gameplay-live rooms until unlocked through the guide rail
- the tutorial owns the bootstrap order for the first room unlock, first operator recruit, first staffed capability, and first upgrade purchase
- the opening must still get the player to meaningful action quickly; "start from scratch" is a pacing rule, not permission for a slow cold open
- early objective rewards, starting currency, and unlock costs should be tuned together so the tutorial sequence doubles as an intentional balance pass instead of a separate teaching layer
- if the fiction still needs the bodega's physical spaces to exist on day one, they should read as unfitted or inactive shells until the guided chain makes them gameplay-live rather than appearing as already-solved room progression
- starter spaces should stay visually present while their room art and room-dependent UI remain hidden or locked until the relevant guide milestone unlocks them
- designated authored slots should remain canonical. When a layout slot names a starter room identity, the opening guide should unlock that room into its intended slot rather than allowing arbitrary starter-room placement across the shell
- staff hiring is part of the mandatory opening rail, not a hidden baseline. Staff-gated rooms should introduce the hiring and assignment flow through explicit objectives before those rooms are expected to carry core progression
- opening pacing may seed one-time starter candidate pools when the first recruitment room or first staff-gated room becomes gameplay-live, but the guide should still make the player perform the actual hire rather than granting free staff invisibly

### Objective Chains

The system should support long-form authored chains, not isolated tutorial flags.

Examples:

- start with an unfitted bodega shell -> unlock first room -> recruit first operator -> staff the first workable loop -> buy the first room upgrade
- stabilize the bodega -> unlock the next support room -> buy the first high-leverage upgrade -> use the newly enabled loop
- meet recruiting -> recruit first operator -> fill first roster pressure -> resolve first replacement tension
- relocate to Porter's -> learn floor switching -> unlock the first recommended Porter's room upgrade path -> use the new management and staging pressure correctly
- reach skyscraper -> unlock first new floor -> learn expansion cadence -> learn floor-specific consequences -> stabilize repeatable endgame loop

Every chain should have:

- a narrative frame
- explicit completion conditions
- reward rules
- next-step handoff

#### Canonical Bodega Opening Rail

The bodega opening should be authored around the first stable loop, not merely the first technically legal sequence of actions. The guide must explicitly weave room unlocks, recruiting, contracts, raids, recovery, staffing, and the first upgrade into one continuous bootstrap chain.

Recommended canonical order:

1. unlock the `Counter` in its authored starter slot
2. when the first recruitment room becomes gameplay-live, seed a one-time starter recruit candidate pool so the player does not wait on normal visitor cadence
3. recruit the first operator
4. recruit the second operator
5. secure the first contract
6. prepare and launch the first raid
7. resolve the first raid return and use that payoff to introduce recovery pressure
8. unlock the `Dining Area` in its authored starter slot so the loop becomes sustainable
9. introduce the first staff-gated room through a hireable staff candidate seed, not a free invisible grant
10. hire and assign the first reception staff member
11. unlock and activate the `Register` in its authored starter slot
12. introduce the first guided upgrade purchase
13. unlock `Supply Closet` later as the next logistics-support step rather than part of the minimum first loop

Design rules for this opening rail:

- the guide should teach the real interaction flow, not skip it with invisible state grants
- one-time candidate seeding is allowed to fix bootstrap pacing, but the player should still perform recruit and hire actions personally
- contract selection, raid launch, raid return, and first recovery should all appear as explicit guide beats, not assumed background systems
- the first stable loop should include enough recruiting, raiding, recovery, and storefront setup that the player understands how the guild actually functions before the guide broadens into recommendation mode
- opening objective rewards should function as a reward ladder: each early payout should materially help fund the next guided action instead of sitting beside it as unrelated bonus currency

#### First Upgrade Contract

The first guided upgrade in the bodega opening should be `upgrade/room/dining_area:first_aid_station`.

Why this is the right first-upgrade contract under the current gameplay rules:

- it matches the new authored opening order, where `Dining Area` is introduced before `Register`
- it is the cheapest early room upgrade on the opening path at `130 cash / 4 reputation` in `content/templates/upgrades.ts`
- it reinforces the first real pain point the player experiences after the first raid return: recovery pressure
- it improves recovery directly instead of teaching a more abstract economy or attraction modifier before the player has felt the need for it
- it does not require staff to become meaningful, so it remains compatible with the zero-staff opening rail

The early income-upgrade band should still exist, but it should follow this first recovery upgrade rather than replacing it. After the player understands recovery and has staffed the `Register`, the next guided upgrade band can move into:

- `upgrade/room/counter:hot_coffee`
- `upgrade/room/register:records_wall`
- `upgrade/building/bodega:frontage`

Those later upgrades are better treated as the first explicit income-and-attraction recommendation band, not as the first upgrade the player ever buys.

#### Opening Reward Ladder

Opening rewards should be derived deterministically from the next guided goal rather than authored as disconnected bounty amounts.

Rules:

- each opening objective should ask: "what does the player need in order to credibly start or complete the next guided step?"
- rewards may fully fund the next action when the design wants an idle-game-style instant payoff beat
- rewards may also provide only the next meaningful tranche when the design wants the player to combine the reward with contract income, loot sales, or another guided action
- early rewards should be tuned so players feel continuous forward motion even if they make one or two reasonable side spends between milestones
- the reward ladder should be derived from current unlock costs, staffing costs, contract entry pressure, and the intended first-upgrade timing window rather than from arbitrary round numbers
- when the next milestone is blocked by a specific missing requirement, the reward should usually cover that requirement directly or bring the player visibly within reach of it

Recommended opening-floor targets under the current bodega rules:

- the opening treasury floor only needs to cover the first contract filing buffer, because `Counter` placement and recruit acceptance are currently free actions
- the first staff-hire floor should account for `staff:reception` hiring cost, which is currently `33 cash`
- the first-upgrade floor should account for `upgrade/room/dining_area:first_aid_station`, which is currently `130 cash` and `4 reputation`
- the first-raid-return objective should therefore normalize the player toward a treasury floor high enough to reach `First-Aid Station` immediately or after one small additional spend, even if the contract outcome was merely acceptable rather than ideal
- early reward logic should top the player up to these floor targets rather than paying a single flat amount regardless of current treasury, outcome variance, or already-completed side gains

Recommended initial numeric targets for the first implementation pass:

- opening / inheritance start: normalize to roughly `30 cash` so the player can afford an opening contract filing without the rail feeling brittle
- after first raid return: normalize to at least `100 cash` and `4 reputation` so the player can unlock recovery, hire reception, and stay within visible reach of the first upgrade
- after first reception hire or `Register` activation: normalize to roughly `145 cash` so the player can buy `First-Aid Station` immediately while retaining a small treasury buffer

These are opening-balance starter targets, not immutable forever numbers. They should move only if the underlying costs, bid envelope, or early-upgrade ordering changes.

#### Cold-Start Pacing Contract

The early game should move the player through bodega and Porter's quickly because the long-run strategic game lives in the skyscraper. The goal is not to stretch the opening for its own sake. The goal is to keep the player continuously acting, continuously learning, and continuously unlocking the next useful thing without tipping into informational overload.

Initial pacing targets for implementation and playtest:

- first guided action available immediately on new game
- first recruit candidate visible within the first `2-3` objectives
- first recruit accepted within roughly the first `5` minutes of active play
- first contract secured within roughly the first `10` minutes of active play
- first raid launched within roughly the first `15` minutes of active play
- first meaningful stable loop established within roughly the first `20-30` minutes of active play
- bodega campaign completed quickly enough that a successful first-session player can reasonably expect to reach Porter's without the opening feeling like the whole game
- Porter's should expand the player's understanding of staffing, training, recovery, staging, and room specialization, but it should still feel like a guided ramp into skyscraper freeform rather than a second long tutorial campaign

Evaluation rules:

- early and midgame should feel like a continuous chain of actions, not long idle waits between teachable moments
- if players are stalling because the next room, hire, contract, or upgrade is too far away, pacing has failed
- if players are receiving multiple new systems before they have used the previous one at least once, pacing has also failed
- these targets are a starting envelope for playtesting and iteration, not a permanent balance truth

#### Early Narrative Event Seeding

The early campaign should not rely on the persistent card alone. A small number of seeded narrative events should be used to frame the bootstrap and teach new consequence categories.

Required early beats:

- inheritance / desperate-start framing for the handed-down bodega and the decision to form the guild
- first-contract briefing
- first meaningful setback or consequence event after the player has enough context to understand it
- first raid return payoff / fallout framing

Rules:

- these beats should use the same authored guidance ladder rather than living as disconnected one-off interruptions
- the bodega presenter anchor should default to `presenter/assistant` unless a more specific domain presenter is deliberately introduced
- seeded narrative events should be deterministic in the opening path so the guide teaches a stable sequence before the sandbox of later systems opens up
- incidents that teach a new category of risk should be surfaced as explicit guide beats, not left to feel like random punishment

#### AI Feature Gating During Guided Progression

Optional AI-generated surfaces should stay disabled during the strict opening rail until the player is far enough along that generated variety cannot undermine the guide's authored teaching sequence.

Rules:

- the game must remain fully playable with authored content only
- opening-path guidance should assume authored copy and deterministic identity surfaces, not generated output
- if the player manually enables AI generation from the start, the opening rail should still override that toggle and suppress optional AI-generated visitor identities and incident framing until the opening bootstrap is complete and the player has reached the first stable bodega loop
- once AI surfaces are allowed, they should vary presentation only; they must not replace gameplay-authoritative completion checks, objective ordering, or reward logic
- when AI is disabled or unavailable, the runtime should fall back cleanly to authored copy rather than changing progression behavior

The chain design should treat the bodega and Porter's bands as one continuous hand-held campaign, not as separate tutorial eras. The skyscraper handoff is the final payoff of that campaign, not the point where guidance first becomes strategic.

### Endgame Taper

The system should remain active through the skyscraper climb, but its tone and density should change once the player reaches the repeatable endgame.

Rules:

- before the skyscraper endgame is established, the player should always have a recommended next goal, even when that goal is as small as equipping a new weapon or selling recovered loot
- the player still gets new-goal guidance for fresh systems and major expansion milestones
- the system stops feeling like constant hand-holding once the player reaches the authored `freeform established` chain at the skyscraper's intended `A-rank` endgame band
- strategic reminders, optional longer-term goals, and prestige-scale suggestions can remain, but the player should not feel tutorial-led forever

Implementation target:

- this guidance plan is intended to ship against a fuller skyscraper package that extends through `A-rank` content
- the guide rail should therefore complete when the player reaches the skyscraper `A-rank` band and satisfies the authored freeform-establishment chain
- the current repo ceiling is lower today, but the plan should still define the intended final target rather than the temporary shipped limit

## What Guidance Should Explain

The guidance layer should become the main explanation surface for:

- why a newly unlocked room matters
- why an upgrade matters now
- why this upgrade should come before the other currently available upgrades
- why a new system was unlocked
- what changed after relocation or building advancement
- why the player should care about a newly surfaced pressure, opportunity, or management tool

The guidance layer should not become the permanent home for:

- full encyclopedic rules text
- static glossary definitions
- large uninterrupted lore dumps

## Feature Coverage Contract

This map is the safety contract. The persistent system is not done unless it can cover these categories.

### Building And Room Progression

The system must be able to introduce:

- every new headquarters phase
- every first-time room unlock required to turn an empty starting headquarters into a functioning guild
- every room family the player is expected to use
- every room upgrade path the player can purchase
- the recommended order of first purchases within the bodega and Porter's room / upgrade ladders
- the fact that room unlock order and room-upgrade order are part of balance, not optional flavor copy
- floor expansion milestones
- room-specific first-use expectations
- relocation readiness and the reason the next building move is worth making now

### Roster And Staffing

The system must be able to introduce:

- zero-roster startup and first operator acquisition
- first recruit
- first staff hire
- first replacement pressure
- first assignment / staffing shortage decision
- meaningful later roster-management systems as they unlock

### Operations

The system must be able to introduce:

- posted-contract bidding
- active-operation monitoring
- finishing the current raid and converting it into the next recommended operational step
- securing the next contract when the active operation resolves
- opportunity surfaces
- result review and consequence understanding
- newer operational systems added after the HQ shell is stable

### Economy And Crafting

The system must be able to introduce:

- equipping newly acquired gear when that is the best immediate progression step
- market use
- one-time manual item selling so the player learns how liquidation works at all
- one-time loot-filter introduction so the player understands how repetitive junk cleanup can be automated
- selling obsolete gear or loot when that is the recommended economy action, using the same source-of-truth filter the runtime uses for loot automation rather than a separate tutorial heuristic
- workshop / fabrication use
- recipe unlocks
- spending tradeoffs
- later skyscraper economy loops

### Pressure And Management

The system must be able to introduce:

- room blockers
- city / faction / institutional pressure
- management policy surfaces
- incidents that represent a new category of consequence rather than just a one-off event

## Content Architecture

### Objective Record

Each objective should define:

- stable id
- chain / chapter membership
- objective kind: `tutorial` or `guide`
- building / progression stage gating
- presenter / narrative voice
- short title
- concise player-facing explanation
- reward payload
- completion condition contract
- recommended next investment or action, when the objective is teaching prioritization rather than only first use
- optional focus target / anchor target
- escalation mode rules: persistent, focused, blocking
- retirement / skip / replacement rules

#### Objective Kinds And Claim Flow

The guide chain should not break just because the player gets ahead of it. Objective behavior should follow idle-game guide conventions.

##### Tutorial Events

Tutorial events are one-time teaching moments. They exist to teach a feature, milestone, or system introduction once over the life of the campaign.

Examples:

- recruit an operator of a given rank for the first time
- unlock or upgrade a specific room
- hire the first staff member of a given role
- complete a one-time building progression milestone

Rules:

- if a tutorial event's condition is already satisfied when it becomes current, it should auto-complete immediately
- auto-complete does not auto-claim the reward
- the player should be able to claim the reward manually
- after the reward is claimed, the chain should advance to the next objective
- if the next objective is also already satisfied and is also a tutorial event, it should auto-complete in turn so the player can keep claiming forward until the chain reaches an unfinished tutorial event or an active guide event

##### Guide Events

Guide events are active goals that progress the game through live player action while that guide step is active.

Examples:

- defeat enemies
- clear the current boss dungeon
- make a target amount of cash while the event is active
- recruit a new operator from the current live queue
- finish the currently active raid

Rules:

- guide events do not auto-complete from historical progress
- the required action must happen while the guide event is the active step
- once completed, the player claims the reward and the chain advances normally

##### Reward Claim Contract

Rewards are manually claimed even when the underlying objective auto-completes.

Rules:

- completion and claiming are separate states
- tutorial events may complete automatically, but they still wait in a claimable state until the player collects the reward
- claiming the reward is what advances the chain to the next objective
- chain progression should continue through already-satisfied tutorial events without forcing the player to replay obsolete actions

### Recommendation Authority

Recommendation authority is hybrid.

The system must not rely on pure authored priority metadata alone, and it must not let runtime heuristics freely choose the campaign order. The intended model is:

- authored milestone order defines the canonical teaching rail
- runtime completion signals determine whether the current milestone is already satisfied
- runtime recommendation logic chooses the best concrete action inside the current milestone's allowed recommendation set

#### Authored Milestone Rail

The campaign owns an explicit ordered rail of milestone objectives such as:

- first contract
- first recruit
- first staffed workable loop
- first upgrade
- relocation readiness
- first Porter's investment band
- skyscraper arrival and first stable expansion loop

These milestones define what the game is teaching now. Runtime logic may not skip ahead to teach a later system unless the current milestone has already been satisfied and advanced.

#### Completion Predicate Contract

Each milestone must have an authoritative completion predicate driven by gameplay state or typed gameplay events.

Rules:

- if the player has already satisfied the milestone, the guide should auto-complete or supersede it instead of forcing a replay of the expected action
- completion checks must be gameplay-authoritative, not inferred from local UI state
- the milestone rail should tolerate out-of-order player action without losing the authored campaign sequence

#### Dynamic Recommendation Slots

A milestone may expose a bounded allowed action set rather than one single hardcoded button path.

Examples:

- `secure_contract`
- `finish_active_raid`
- `equip_operator`
- `sell_loot`
- `buy_recommended_upgrade`
- `assign_staff`
- `activate_room`

Runtime recommendation logic may choose the best currently valid action from that bounded set based on live state. Runtime recommendation logic may not recommend arbitrary actions outside the current milestone's authored allowance.

#### Arbitration Rule

The tie-break rule is:

- authored milestone order decides which campaign phase is currently active
- runtime decides which exact actionable recommendation to surface within that active milestone
- runtime urgency may auto-complete, skip, or collapse already-satisfied substeps
- runtime urgency may not silently replace the authored milestone rail with a different progression order

In short:

- authoring owns what the player is being taught now
- runtime owns how the current teachable step is concretized against live state

#### Auto-Completion And Skip Behavior

The guide should behave like an exact authored rail that tolerates players getting ahead of it.

Rules:

- if a key milestone is already complete when it becomes current, mark it complete immediately and hand off to the next milestone
- if a player partially satisfies a later recommendation early, preserve that state and avoid re-teaching it as mandatory busywork
- the system may narrate an auto-completion or use a lightweight handoff, but it should not force the player backward into already-solved tutorial work

This model keeps campaign order authored while still allowing the runtime to behave intelligently when the player front-runs the guide.

### Coverage Matrix

The implementation must maintain explicit coverage mapping from shipped player-facing upgrades and feature unlocks to guidance objectives, but that mapping should not live as a second authored artifact.

Single-source-of-truth rule:

- objective data is the source of truth
- each tutorial event or guide event should declare which player-facing room, upgrade, feature intro, or system milestone it covers
- any coverage table used in docs or tooling should be generated or derived from the objective data rather than maintained separately

At minimum, the derived coverage view should answer:

- which objective introduces this upgrade or feature
- which reward is attached to that teaching step
- what the intended recommendation order is relative to sibling upgrades or unlocks
- what opening-state assumption the step depends on, including whether it is part of the mandatory bootstrap path from zero rooms / zero operators
- what progression stage gates it
- whether the step is persistent-only, focused, or blocking
- whether the step has already been superseded by a later chain

Enforcement rule:

- add a test that compares shipped teachable content against the declared objective coverage
- if a player-facing room, upgrade, feature intro, or required system milestone ships without objective coverage, the test should fail
- agents can use code inspection, playthroughs, economy evaluation, and tuning passes to decide which events should exist, but once decided they must be encoded in the objective data itself

### Reward Contract

Rewards should be a first-class product choice, not an afterthought.

Reward types may include:

- cash
- materials
- intel / reputation / standing where appropriate
- guaranteed items
- authored unlock packets

Rules:

- rewards must be meaningful enough to teach that objectives matter
- rewards must not become the dominant exploit surface
- rewards must scale with progression stage
- rewards should frequently help fund or unlock the next recommended step so the campaign keeps its idle-game push-forward rhythm
- claim / grant behavior must be save-safe and deterministic

### Narrative Voice

Use the existing presenter system as the baseline.

The plan should support:

- building-aware presenters
- system-aware presenters
- recurring guide voices where that helps continuity
- narrative re-framing of mechanical objectives

Named presenter roster assumed by this plan:

- `presenter/assistant` — Mara Cordero
  - default campaign anchor for contracts, staffing, management, and fallback operational briefings
- `presenter/cook` — Rafi Alvarez
  - food quality, hospitality, morale-through-hospitality, and kitchen-adjacent consequence beats
- `presenter/bartender` — Sloane Becker
  - recruitment reads, front-of-house social pressure, and public-facing nightlife or regular-pressure beats
- `presenter/vicente-ortega` — Vicente Ortega
  - gear readiness, loot triage, inventory flow, stock pressure, workshop/fabrication, and practical field-prep beats
- `presenter/dr-june-park` — Dr. June Park
  - injury, recovery, treatment, infirmary/trauma support, and post-mission medical consequence beats

Presenter assignment rule:

- these presenters are not locked to one headquarters
- they should persist across bodega, Porter's, and skyscraper progression wherever their feature domain is the right voice
- every authored tutorial event or guide event should either name one of these presenters explicitly or inherit a clear fallback presenter rather than defaulting to anonymous copy

The result should feel like campaign guidance, not generic live-ops chores.

## UI Architecture

### Persistent Surface

Primary steady-state UI:

- compact persistent guide card
- current objective only, or current objective plus one queued next objective at most
- reward visibility always present
- progress visibility whenever measurable
- click / expand path into richer detail
- top-center default spawn position
- draggable placement that the player can adjust during play
- high ordinary UI stack order so the card remains visible across headquarters, operations, and boss-commitment combat surfaces

### Focused Guidance

Used when the player must learn a specific interaction.

Rules:

- reuse spotlight / coachmark delivery where appropriate
- focused guidance should be launched from the current objective record, not from separate ad hoc tutorial logic
- completion should hand back cleanly to the persistent card

### Blocking Guidance

Used for:

- relocation
- major new building phases
- irreversible milestone transitions
- major newly unlocked systems that need explicit framing

Rules:

- blocking guidance remains rare but high-value
- it should transition back into the persistent objective chain rather than acting as an isolated cutscene

### Shell Coexistence

The persistent guide card must coexist with:

- HQ cascade shell
- Operations cascade shell
- event log
- interruption surfaces

Coexistence contract:

- the card defaults to top-center when first shown
- the player may drag the card anywhere on the screen
- the card should render above ordinary shell UI, including HQ cascades, Operations surfaces, event log surfaces, and boss-commitment combat HUD
- blocking narrative and interruption modals should still render above the card
- shell refactors must not assume permanent ownership of the guide card's default region, because the card is player-positionable rather than fixed-lane shell UI

### Runtime Mode Rules

The guidance system must behave differently across real progression, sandbox preview, and testing/dev states. Those differences should be explicit rather than incidental.

#### New Game

- full tutorial-event and guide-event progression is active
- opening narrative seeds, pacing rewards, and AI suppression rules all apply
- this is the canonical player-facing progression path

#### Load Existing Save

- restore the saved tutorial / guide state exactly when the save already contains it
- loading must never silently replay already-earned tutorial rewards

#### Preview / Sandbox Mode

- persistent tutorial-event and guide-event progression is suppressed
- no opening-chain rewards, tutorial claims, or deterministic narrative seeds should fire
- interruption and incident systems may still appear when the sandbox state itself requires them, but the long-form campaign rail should stay out of the way
- preview exists to inspect and interact with systems, not to represent canonical campaign progression

#### Dev-Console-Forced States

- dev commands may reset or force guidance state for testing
- those commands are test affordances, not player-facing progression rules
- forced dev state should not redefine campaign pacing assumptions or authored ordering
- the dev console should stay usable by AI agents and human testers for rapid iteration, which means keeping a small set of typed guidance commands available instead of building a second bespoke debug UI
- recommended minimum dev-console support:
  - reset the current tutorial / guide chain
  - jump to a named tutorial event or guide event
  - mark the current event complete without changing authored ordering
  - claim the current reward and advance
- these commands should drive the same authoritative guidance state machine the game uses normally rather than mutating ad hoc UI-only flags

#### Browser Automation And Deterministic Harnesses

- tests should be able to start with guidance disabled, active at a known event, or completed through a known milestone
- deterministic harnesses should seed the required guidance state explicitly rather than relying on incidental runtime timing
- automation should verify both canonical campaign behavior and sandbox-with-guidance-suppressed behavior where relevant

## State And Simulation Contract

The guidance layer is UI-presented, but it cannot be purely local component state.

Rules:

- progress state must be save-safe
- objective completion must be driven by authoritative gameplay state or typed gameplay events, not by UI guesswork
- reward grants must route through authoritative systems
- the canonical new-game path must start from zero recruited operators and zero gameplay-functional built rooms / purchased room upgrades unless a later product doc explicitly changes that contract
- relocation and building upgrades must be able to retire, replace, or advance objective chains cleanly
- preview / dev / browser-test modes need explicit rules for suppression, seeding, and deterministic advancement

The UI owns presentation and typed intents only. Objective completion and reward grant rules must remain gameplay-authoritative.

## Phased Rollout

### Phase 0 - Product Audit

- Inventory every current "why this matters," onboarding, first-use explanation, and tutorial beat.
- Inventory every shipped player-facing upgrade and feature unlock that needs an explanatory step.
- Inventory every room, upgrade, operator, and resource grant the current start state gives the player for free, and decide which of those should become guided bootstrap beats instead.
- Inventory the intended recommended room and upgrade order for the bodega and Porter's, including where the current product leaves that order implicit.
- Group them into one continuous campaign arc:
  - opening HQ
  - full bodega progression
  - Porter's
  - skyscraper handoff
  - skyscraper climb
  - repeatable skyscraper endgame
- Identify which explanations should move out of room / management UI once the guidance system exists.

Exit criteria:

- a concrete feature-by-feature coverage list exists
- a concrete upgrade-by-upgrade coverage list exists
- the opening zero-state bootstrap path is explicitly defined
- no major system is left without an intended teaching moment

### Phase 1 - Objective Data And Runtime Contract

- Define the objective record schema and progression-chain schema.
- Define authoritative completion signals and reward-grant routing.
- Define the canonical zero-state new-game contract and the bootstrap rewards / costs that move the player from empty HQ plus zero operators into the first stable loop quickly.
- Define objective replacement / retirement rules for relocation and building advancement.
- Define how recommendation-order metadata is authored so the runtime can say "do this upgrade next" without putting gameplay authority in React.
- Own the balance and tuning work required for the guide rail to function, including opening reward ladder values, early upgrade timing, and progression pacing into Porter's and the skyscraper.
- Expect iterative implementation: author the initial rail, play through it, tune rewards / costs / pacing, and repeat until the guidance, economy, and balance feel coherent together.

Exit criteria:

- the system can represent a long-running objective chain without relying on ad hoc per-screen logic

### Phase 2 - Persistent Guide Card Shell

- Build the always-on guide card UI.
- Support compact state, expanded state, reward read, progress read, and a clear "recommended next" read.
- Decide and implement the coexistence lane with the event log and cascade panels.

Exit criteria:

- the player can always see the current objective during steady-state play

### Phase 3 — Unify Focused And Blocking Beats Under One Objective Framework

- Re-thread current spotlight beats through objective definitions.
- Re-thread current blocking narrative briefings through the same authored objective ladder where appropriate.
- Keep the existing good parts of `guidance-host` and `interruption-host`, but stop treating them as isolated onboarding islands.
- Replace the current tutorial guidance structure wholesale wherever the new authored system covers the same player need.

Exit criteria:

- persistent, focused, and blocking guidance all derive from the same authored progression system

### Phase 4 - Bodega And Porter's Coverage

- Convert the bodega and Porter's teaching surface into rewarded objective chains.
- Author the full bodega recommendation rail so a new player is continuously guided from zero rooms and zero operators through the intended room and room-upgrade order.
- Author the Porter's recommendation rail so new rooms, staffing pressure, training, recovery, staging, and workshop investment are introduced in a deliberate order.
- Ensure every room upgrade that is part of the intended progression path is taught, rewarded, and balance-authored through the same chain rather than left as an unguided shop choice.
- Remove duplicated explanation from steady-state UI only after equivalent or better guidance coverage exists.

Exit criteria:

- a new player can move through the full bodega and Porter's campaign with a constant guided next step
- the system can explicitly recommend first upgrade order instead of only describing unlocked options
- the opening tutorial and the early balance envelope are aligned rather than tuned as separate layers
- the guide rail can continuously hand the player from one concrete action to the next, including raid completion, contract selection, equipment changes, and sell / spend decisions

### Phase 5 - Skyscraper Coverage

- Add objective chains for:
  - relocation arrival and handoff payoff
  - first new tower systems
  - floor expansion ladder
  - later management pressure
  - repeatable endgame establishment

Exit criteria:

- guidance carries the player cleanly out of Porter's and into the first stable skyscraper loop without a hand-holding gap
- guidance remains active through the full climb into the repeatable skyscraper loop

### Phase 6 — Taper And Long-Run Behavior

- Add reduced-hand-holding behavior once the repeatable skyscraper loop is established.
- Keep optional strategic or expansion guidance without preserving tutorial intensity forever.

Exit criteria:

- the player is no longer micromanaged once genuinely established
- the system still has useful next-goal behavior for major new milestones

### Phase 7 — Verification And Stabilization

- Run `vp check`.
- Run `vp test`.
- Run `vp build`.
- Add or update browser coverage for:
  - persistent objective visibility
  - focused objective spotlight handoff
  - blocking objective briefing handoff
  - reward claim / grant
  - save / load continuity
  - relocation-driven chain advancement
  - chain retirement and replacement
  - endgame taper behavior

## Risks

- **Noise fatigue.** If rewards and reminders are too constant without pacing discipline, the system will feel spammy instead of helpful.
- **Cold-start drag.** A zero-state opening can feel punitive if the first room, first recruit, and first actionable loop take too long to arrive.
- **Authority drift.** If objective completion is inferred from UI state instead of gameplay-authoritative signals, save safety and determinism will degrade.
- **Layout collision.** A persistent guide card can fight the event log or the new cascade shell if coexistence is not designed deliberately.
- **Content debt.** This plan is partly a content-production plan. A weak objective catalog will undermine the architecture.
- **Panel backslide.** If the guidance system slips, teams will be tempted to stuff explanation back into room and management panels.

## Open Questions And Unresolved Decisions

These questions must be resolved before implementation claims can be considered closed. Some are hard product decisions; others are required artifacts or dependencies that the rollout phases must name explicitly.

### Opening Contract

1. **Zero-roster opening vs. bodega baseline.**
   The plan currently proposes a zero-state opening with no pre-existing operators, but the product canon and shipped bootstrap have historically started the player in a working bodega with a small starter roster. If the opening contract changes, world canon, bootstrap data, and pacing targets all need to change together. If the product keeps physical bodega spaces on day one, the plan must state whether those spaces are merely present as shell/slot identity or already gameplay-functional rooms.

2. **Day-one room semantics.**
   If the bodega still physically exists on day one, what does the player actually start with?
   - default room slots only
   - inactive room shells
   - some gameplay-live rooms and some inactive rooms
     The answer affects bootstrap data, room activation rules, art states, and the meaning of the HQ environment contract.

3. **Cold-start pacing target.**
   A blanker opening is only acceptable if the plan defines concrete pacing goals:
   - time or actions to first meaningful loop
   - objectives before first contract
   - objectives before first recruit
   - first actionable spend window
     Phase 4 cannot be evaluated on feel alone.

### Recommendation Authority

4. **Who owns "recommended next."**
   The plan currently mixes authored recommendation order with live-state recommendations such as finishing a raid, selling excess gear, or making a balance-critical spend. It must explicitly choose one of:
   - authored ordering only
   - runtime recommendation only
   - hybrid authored rail plus runtime arbitration

5. **Hybrid arbitration rule.**
   If recommendation authority is hybrid, what wins when authored teaching order and live-state urgency disagree? The plan needs an explicit tie-break rule so the runtime does not silently become the actual design authority.

### UI And Shell Coexistence

6. **Screen-layout compatibility.**
   HQ, Operations, and boss-commitment screen layouts must explicitly support the draggable guide card contract. The plan should name this as a compatibility requirement rather than assuming the guide will naturally survive future layout work. At minimum, those layouts must preserve:
   - guide visibility above ordinary UI
   - guide drag interaction and click interaction
   - modal priority for blocking narrative / interruption surfaces only

### Objective Lifecycle And Endgame Taper

### Coverage, Migration, And Enforcement

### Balance, Content, And Narrative

## Out Of Scope

- rewriting the full world or lore canon
- replacing event-log responsibilities
- changing gameplay authority ownership
- using Operations or HQ steady-state panels as a substitute for the guidance layer

## Deliverables

- `docs/plans/persistent-guidance-tutorial-plan.md`
- objective data / runtime plan for a save-safe persistent guidance framework
- UI plan for a persistent guide card plus focused / blocking handoff
- a checked-in coverage map proving every player-facing upgrade and feature can be taught through rewarded guidance through the repeatable skyscraper endgame
- roadmap and product-doc updates once implementation is complete and older onboarding assumptions are retired

## Completion Notes

When this plan is complete:

- the room-management UI should no longer need permanent "why this matters" essays
- the canonical opening should begin from zero operators and zero gameplay-functional room progression, while still reaching a meaningful first loop quickly
- the player should rarely be without a recommended next objective before the repeatable skyscraper endgame
- the player should receive explicit recommendations for which room unlocks and room upgrades to do first throughout the bodega and Porter's bands
- every room upgrade in the intended progression path should be part of the guidance chain, which means early tutorial pacing and early balance are authored together
- the tutorial should read as a modern idle-game guide rail that always has another useful goal ready until the skyscraper headquarters has become the stable repeatable endgame home
- tutorial logic should read as one campaign-long guidance system rather than scattered onboarding patches
