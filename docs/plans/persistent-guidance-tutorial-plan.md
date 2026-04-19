# Persistent Guidance And Rewarded Tutorial Plan

Scope: define the follow-up system that replaces one-off onboarding copy with a persistent, rewarded, narrative guidance layer. This plan covers the guidance product and UI architecture. It does not re-litigate the HQ or Operations shell refactors, but it must integrate cleanly with both.

## Goal

Build a modern idle-game-style guidance system that:

- is always present during early and midgame
- always offers the next meaningful goal
- explains every player-facing upgrade, room, and feature introduction through rewarded objectives instead of stuffing permanent prose into steady-state panels
- uses narrative framing so the guidance feels like an authored hand, not just a checklist
- continues across the full headquarters arc until the repeatable skyscraper endgame is firmly established
- tapers only once the player has reached the repeatable skyscraper loop and no longer needs constant hand-holding

This is not “tutorials, but more.” It is a persistent progression layer that teaches, motivates, rewards, and keeps the player moving.

## Product Direction

The intended model is closer to modern idle and incremental games than to a short front-loaded tutorial:

- every meaningful system introduction is attached to an objective
- every player-facing upgrade unlock is attached to an objective or explicit follow-up objective step
- every objective explains why the system matters in plain language
- objectives pay out meaningful rewards on completion
- objective chains continue as new rooms, upgrades, mechanics, and buildings unlock
- the player should rarely be without a recommended next step before the repeatable skyscraper endgame

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

## Current State

- `app/ui/guidance-host.tsx` supports focused coachmarks with spotlight anchoring and a centered fallback.
- `app/ui/interruption-host.tsx` supports blocking narrative delivery.
- Opening guidance, narrative presenters, and save-safe authored beats already exist.
- The current system is still closer to authored onboarding beats than to a persistent objective rail.
- “Why this room matters” style explanation is still partially carried by steady-state management UI and room surfaces.

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
- show progress when progress is measurable
- allow expansion into a richer detail panel when needed
- coexist with the new HQ and Operations cascade shell instead of fighting for the same space
- be movable or intentionally placeable if that is the cleanest long-term answer

This is the replacement home for much of the “why this matters” explanation that should leave room panels.

### Objective Chains

The system should support long-form authored chains, not isolated tutorial flags.

Examples:

- open first room -> staff it -> use its feature -> buy its first upgrade
- meet recruiting -> recruit first operator -> fill roster pressure -> resolve first replacement tension
- relocate to Porter's -> learn floor switching -> place / activate new room types -> use new management pressure
- reach skyscraper -> unlock first new floor -> learn expansion cadence -> learn floor-specific consequences -> stabilize repeatable endgame loop

Every chain should have:

- a narrative frame
- explicit completion conditions
- reward rules
- next-step handoff

### Endgame Taper

The system should remain active through the skyscraper climb, but its tone and density should change once the player reaches the repeatable endgame.

Rules:

- the player still gets new-goal guidance for fresh systems and major expansion milestones
- the system stops feeling like constant hand-holding once the repeatable skyscraper loop is established
- strategic reminders, optional longer-term goals, and prestige-scale suggestions can remain, but the player should not feel tutorial-led forever

## What Guidance Should Explain

The guidance layer should become the main explanation surface for:

- why a newly unlocked room matters
- why an upgrade matters now
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
- every room family the player is expected to use
- every room upgrade path the player can purchase
- floor expansion milestones
- room-specific first-use expectations

### Roster And Staffing

The system must be able to introduce:

- first recruit
- first staff hire
- first replacement pressure
- first assignment / staffing shortage decision
- meaningful later roster-management systems as they unlock

### Operations

The system must be able to introduce:

- posted-contract bidding
- active-operation monitoring
- opportunity surfaces
- result review and consequence understanding
- newer operational systems added after the HQ shell is stable

### Economy And Crafting

The system must be able to introduce:

- market use
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
- building / progression stage gating
- presenter / narrative voice
- short title
- concise player-facing explanation
- reward payload
- completion condition contract
- optional focus target / anchor target
- escalation mode rules: persistent, focused, blocking
- retirement / skip / replacement rules

### Coverage Matrix

The implementation must maintain an explicit coverage matrix mapping shipped player-facing upgrades and feature unlocks to guidance objectives.

At minimum, the matrix should answer:

- which objective introduces this upgrade or feature
- which reward is attached to that teaching step
- what progression stage gates it
- whether the step is persistent-only, focused, or blocking
- whether the step has already been superseded by a later chain

The system is not complete if a player-facing upgrade or feature is live in the product but absent from the coverage matrix.

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
- claim / grant behavior must be save-safe and deterministic

### Narrative Voice

Use the existing presenter system as the baseline.

The plan should support:

- building-aware presenters
- system-aware presenters
- recurring guide voices where that helps continuity
- narrative re-framing of mechanical objectives

The result should feel like campaign guidance, not generic live-ops chores.

## UI Architecture

### Persistent Surface

Primary steady-state UI:

- compact persistent guide card
- current objective only, or current objective plus one queued next objective at most
- reward visibility always present
- progress visibility whenever measurable
- click / expand path into richer detail

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

The guidance plan must not assume it can occupy the same corner already reserved for these systems without a deliberate layout decision.

## State And Simulation Contract

The guidance layer is UI-presented, but it cannot be purely local component state.

Rules:

- progress state must be save-safe
- objective completion must be driven by authoritative gameplay state or typed gameplay events, not by UI guesswork
- reward grants must route through authoritative systems
- relocation and building upgrades must be able to retire, replace, or advance objective chains cleanly
- preview / dev / browser-test modes need explicit rules for suppression, seeding, and deterministic advancement

The UI owns presentation and typed intents only. Objective completion and reward grant rules must remain gameplay-authoritative.

## Phased Rollout

### Phase 0 — Product Audit

- Inventory every current “why this matters,” onboarding, first-use explanation, and tutorial beat.
- Inventory every shipped player-facing upgrade and feature unlock that needs an explanatory step.
- Group them into one continuous campaign arc:
  - opening HQ
  - Porter's
  - skyscraper climb
  - repeatable skyscraper endgame
- Identify which explanations should move out of room / management UI once the guidance system exists.

Exit criteria:

- a concrete feature-by-feature coverage list exists
- a concrete upgrade-by-upgrade coverage list exists
- no major system is left without an intended teaching moment

### Phase 1 — Objective Data And Runtime Contract

- Define the objective record schema and progression-chain schema.
- Define authoritative completion signals and reward-grant routing.
- Define objective replacement / retirement rules for relocation and building advancement.

Exit criteria:

- the system can represent a long-running objective chain without relying on ad hoc per-screen logic

### Phase 2 — Persistent Guide Card Shell

- Build the always-on guide card UI.
- Support compact state, expanded state, reward read, and progress read.
- Decide and implement the coexistence lane with the event log and cascade panels.

Exit criteria:

- the player can always see the current objective during steady-state play

### Phase 3 — Unify Focused And Blocking Beats Under One Objective Framework

- Re-thread current spotlight beats through objective definitions.
- Re-thread current blocking narrative briefings through the same authored objective ladder where appropriate.
- Keep the existing good parts of `guidance-host` and `interruption-host`, but stop treating them as isolated onboarding islands.

Exit criteria:

- persistent, focused, and blocking guidance all derive from the same authored progression system

### Phase 4 — Bodega And Porter's Coverage

- Convert the early and midgame teaching surface into rewarded objective chains.
- Remove duplicated explanation from steady-state UI only after equivalent or better guidance coverage exists.

Exit criteria:

- a new player can move through the early campaign with a constant guided next step

### Phase 5 — Skyscraper Coverage

- Add objective chains for:
  - relocation arrival
  - first new tower systems
  - floor expansion ladder
  - later management pressure
  - repeatable endgame establishment

Exit criteria:

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
- **Authority drift.** If objective completion is inferred from UI state instead of gameplay-authoritative signals, save safety and determinism will degrade.
- **Layout collision.** A persistent guide card can fight the event log or the new cascade shell if coexistence is not designed deliberately.
- **Content debt.** This plan is partly a content-production plan. A weak objective catalog will undermine the architecture.
- **Panel backslide.** If the guidance system slips, teams will be tempted to stuff explanation back into room and management panels.

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

- the room-management UI should no longer need permanent “why this matters” essays
- the player should rarely be without a recommended next objective before the repeatable skyscraper endgame
- tutorial logic should read as one campaign-long guidance system rather than scattered onboarding patches
