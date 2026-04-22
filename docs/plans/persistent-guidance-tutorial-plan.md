# Persistent Guidance And Rewarded Tutorial Plan

Agent-actionable checklist for replacing one-off onboarding copy with a persistent, rewarded, narrative guidance layer that runs from the bodega opening through Porter's and into the first stable skyscraper endgame.

This plan is the single source of truth for the guidance refactor. It does not re-litigate the HQ or Operations shell refactors, but it must integrate cleanly with both.

---

## 1. Ground Rules (read before any phase)

Treat this section as pre-flight. Violating any of these invalidates later phases.

### 1.1 Product Intent

- [ ] Build a modern idle-game-style guidance system that is always on before the repeatable skyscraper endgame.
- [ ] Every meaningful system introduction attaches to an objective; every player-facing upgrade unlock attaches to an objective (or an explicit follow-up objective step).
- [ ] Every room unlock and every room upgrade the player is expected to buy for progression is explicitly tutorialized as part of the balance rail.
- [ ] Every objective explains why the system matters now in plain language, not just what to click next.
- [ ] When multiple valid options exist, the guide tells the player which room unlock, room upgrade, or systems investment should come next.
- [ ] Objectives pay out meaningful rewards on completion; rewards frequently tee up the next recommendation so the campaign keeps an idle-game push-forward rhythm.
- [ ] The "next step" may be small (equip a weapon, sell loot, finish a raid) or large (relocation, new floor). It must always exist before skyscraper endgame.
- [ ] Guidance tapers only after the player reaches the authored `freeform established` chain at the skyscraper's intended `A-rank` endgame band.

### 1.2 Architecture Rules

- [ ] ECS owns authoritative mutable gameplay state. Objective completion is driven by authoritative gameplay state or typed gameplay events, never by UI guesswork.
- [ ] Reward grants must route through authoritative systems and be save-safe and deterministic.
- [ ] UI owns presentation and typed intents only. No gameplay authority in React components.
- [ ] Save code handles serialization and migration, not gameplay repair.
- [ ] The guidance layer is UI-presented, but its state (progress, completion, claim, chain advancement) is not purely local component state.

### 1.3 Non-Regression

Do not delete or hollow out the current focused guidance and interruption framing until the persistent system has explicit replacements for:

- [ ] Spotlight / coachmark beats.
- [ ] Blocking narrative briefings.
- [ ] Save-safe objective progress.
- [ ] Presenter-driven framing.
- [ ] Preview-mode suppression rules where still appropriate.

### 1.4 Resolved Contract Decisions

These were previously open questions. They are now fixed decisions for this refactor. Do not re-open them mid-implementation.

- [ ] **Zero-state opening is canonical.** A new campaign starts with zero pre-existing operators and zero gameplay-functional rooms or purchased room upgrades.
- [ ] **Physical bodega spaces remain visible on day one as unfitted / inactive shells.** Their room art and room-dependent UI stay hidden or locked until the guided chain unlocks them into their authored slots. No arbitrary starter-room placement.
- [ ] **Staff hiring is part of the mandatory opening rail, not a hidden baseline.**
- [ ] **Recommendation authority is hybrid.** Authored milestone order defines the canonical teaching rail; runtime picks the best concrete action from each milestone's bounded allowed-action set. Runtime may never skip past an uncompleted authored milestone or replace authored order with a different progression.
- [ ] **Authored teaching order wins when it disagrees with live-state urgency.** Runtime may auto-complete already-satisfied substeps and may concretize the current authored milestone against live state, but it may not silently become the design authority.
- [ ] **Screen-layout compatibility is a hard requirement.** HQ, Operations, and boss-commitment layouts must preserve guide visibility, drag interaction, click interaction, and modal priority (blocking / interruption surfaces only render above the card).

### 1.5 Forbidden Mistakes (guidance-specific)

- [ ] Do not infer objective completion from UI state.
- [ ] Do not let React components mutate authoritative gameplay state to "grant" rewards.
- [ ] Do not replay already-earned tutorial rewards on save load.
- [ ] Do not maintain a second authored coverage artifact parallel to the objective data. Objective data is the single source of truth; any coverage table is derived from it.
- [ ] Do not stuff explanation back into steady-state room / management panels after the guidance layer takes over.
- [ ] Do not fire long-form campaign tutorial chains in sandbox / preview mode.

---

## 2. Presentation Ladder (one system, four modes)

The game has exactly one authored objective framework with four delivery intensities. These are not separate systems.

- [ ] `persistent` — always-on objective card with current goal, reward, and short narrative framing.
- [ ] `focused` — anchored coachmark / spotlight for precise teachable interactions.
- [ ] `blocking` — interruption-backed narrative briefings for major transitions, warnings, or irreversible steps.
- [ ] `completed` — claim / payoff / next-objective handoff state.

### 2.1 Persistent Guide Card

- [ ] Stays visible during ordinary play.
- [ ] Steady-state scope stays lean: show the current objective only, or the current objective plus at most one queued next objective.
- [ ] Shows current objective title, concise explanation, reward, and (when measurable) progress.
- [ ] Shows the recommended next spend / unlock / upgrade / action when multiple plausible choices exist.
- [ ] Allows expansion into a richer detail panel.
- [ ] Spawns at top-center of the screen by default.
- [ ] Is user-draggable anywhere on the screen; player-chosen placement persists.
- [ ] Remains present on headquarters, operations, and boss-commitment combat surfaces.
- [ ] Renders above ordinary shell UI (HQ cascades, Operations surfaces, event log, combat HUD) but yields to blocking narrative and interruption modals.

### 2.2 Focused Guidance

- [ ] Reuse existing spotlight / coachmark delivery.
- [ ] Launched from the current objective record (not from separate ad hoc tutorial logic).
- [ ] On completion, hand cleanly back to the persistent card.

### 2.3 Blocking Guidance

Use only for: relocation, major new building phases, irreversible milestone transitions, and major newly unlocked systems that require explicit framing.

- [ ] Keep rare and high-value.
- [ ] Transition back into the persistent objective chain — never act as an isolated cutscene.

---

## 3. Objective Data Contract

### 3.1 Objective Record Fields

Each objective must define:

- [ ] Stable id.
- [ ] Chain / chapter membership.
- [ ] Objective kind: `tutorial` or `guide`.
- [ ] Building / progression stage gating.
- [ ] Presenter / narrative voice (explicit or inherited fallback — never anonymous).
- [ ] Short title.
- [ ] Concise player-facing explanation.
- [ ] Reward payload.
- [ ] Completion condition contract (gameplay-authoritative predicate or typed gameplay event).
- [ ] Recommended next investment or action when the objective teaches prioritization rather than only first use.
- [ ] Optional focus target / anchor target.
- [ ] Escalation mode rules: `persistent`, `focused`, `blocking`.
- [ ] Retirement / skip / replacement rules.
- [ ] Declared coverage: which player-facing room, upgrade, feature intro, or system milestone this objective covers.

### 3.2 Objective Kinds And Claim Flow

#### Tutorial Events

One-time teaching moments (first recruit of a rank, first unlock/upgrade of a specific room, first staff hire of a role, one-time building milestone).

- [ ] If the condition is already satisfied when the event becomes current, auto-complete immediately.
- [ ] Auto-complete does NOT auto-claim the reward.
- [ ] Player claims the reward manually; claiming advances the chain.
- [ ] If the next objective is also a tutorial event that is already satisfied, it also auto-completes, so the player can claim forward through stale tutorial events until hitting an unfinished tutorial event or an active guide event.

#### Guide Events

Active goals that progress the game through live player action while the step is active (defeat enemies, clear boss dungeon, earn target cash while active, recruit from the live queue, finish the active raid).

- [ ] Do NOT auto-complete from historical progress.
- [ ] Required action must happen while the guide event is the active step.
- [ ] On completion, player claims the reward and the chain advances.

#### Reward Claim Contract

- [ ] Completion and claiming are separate states.
- [ ] Tutorial events may complete automatically but still wait in a claimable state until the player collects the reward.
- [ ] Claiming the reward is what advances the chain.
- [ ] Chain progression continues through already-satisfied tutorial events without forcing the player to replay obsolete actions.

### 3.3 Recommendation Authority (Hybrid Model)

- [ ] Campaign owns an explicit ordered rail of milestone objectives (examples: first contract, first recruit, first staffed workable loop, first upgrade, relocation readiness, first Porter's investment band, skyscraper arrival and first stable expansion loop).
- [ ] Runtime may NOT skip ahead to teach a later milestone unless the current milestone is already satisfied and advanced.
- [ ] Each milestone has an authoritative completion predicate driven by gameplay state or typed gameplay events.
- [ ] A milestone may expose a bounded allowed-action set (examples: `secure_contract`, `finish_active_raid`, `equip_operator`, `sell_loot`, `buy_recommended_upgrade`, `assign_staff`, `activate_room`).
- [ ] Runtime recommendation logic chooses the best currently valid action from that bounded set based on live state.
- [ ] Runtime may NOT recommend actions outside the current milestone's authored allowance.

Arbitration (do these in order):

1. [ ] Authored milestone order decides which campaign phase is currently active.
2. [ ] Runtime decides which exact actionable recommendation to surface within that active milestone.
3. [ ] Runtime may auto-complete, skip, or collapse already-satisfied substeps.
4. [ ] Runtime may NOT silently replace the authored milestone rail with a different progression order.

### 3.4 Auto-Completion And Front-Running

- [ ] If a key milestone is already complete when it becomes current, mark it complete immediately and hand off to the next milestone.
- [ ] If a player partially satisfies a later recommendation early, preserve that state and avoid re-teaching it as mandatory busywork.
- [ ] The system may narrate the auto-completion or use a lightweight handoff, but must not force the player backward into already-solved tutorial work.

### 3.5 Coverage Map (Derived, Not Authored Separately)

- [ ] Objective data is the source of truth for coverage.
- [ ] Any coverage table used in docs or tooling is generated or derived from objective data.
- [ ] The derived coverage view must answer, for each shipped teachable surface: which objective introduces it, which reward is attached, what the intended recommendation order is relative to siblings, what opening-state assumption it depends on (including mandatory bootstrap-path membership), what progression stage gates it, whether it is persistent-only / focused / blocking, and whether it has been superseded by a later chain.
- [ ] Add a test that compares shipped teachable content against declared objective coverage. The test must fail if a player-facing room, upgrade, feature intro, or required system milestone ships without objective coverage.

### 3.6 Reward Contract

- [ ] Reward types may include: cash, materials, intel / reputation / standing where appropriate, guaranteed items, authored unlock packets.
- [ ] Rewards must be meaningful enough to teach that objectives matter.
- [ ] Rewards must not become the dominant exploit surface.
- [ ] Rewards must scale with progression stage.
- [ ] Rewards should frequently help fund or unlock the next recommended step.
- [ ] Claim and grant behavior must be save-safe and deterministic.

---

## 4. Feature Coverage Contract

The persistent system is not done until it can introduce every item below through rewarded objectives.

### 4.1 Building And Room Progression

- [ ] Every new headquarters phase.
- [ ] Every first-time room unlock required to turn an empty starting headquarters into a functioning guild.
- [ ] Every room family the player is expected to use.
- [ ] Every room upgrade path the player can purchase.
- [ ] Recommended order of first purchases within the bodega and Porter's room / upgrade ladders.
- [ ] Explicit statement that room unlock order and room-upgrade order are part of balance, not optional flavor copy.
- [ ] Floor expansion milestones.
- [ ] Room-specific first-use expectations.
- [ ] Relocation readiness and why the next building move is worth making now.

### 4.2 Roster And Staffing

- [ ] Zero-roster startup and first operator acquisition.
- [ ] First recruit.
- [ ] First staff hire.
- [ ] First replacement pressure.
- [ ] First assignment / staffing-shortage decision.
- [ ] Meaningful later roster-management systems as they unlock.

### 4.3 Operations

- [ ] Posted-contract bidding.
- [ ] Active-operation monitoring.
- [ ] Finishing the current raid and converting it into the next recommended operational step.
- [ ] Securing the next contract when the active operation resolves.
- [ ] Opportunity surfaces.
- [ ] Result review and consequence understanding.
- [ ] Newer operational systems added after the HQ shell is stable.

### 4.4 Economy And Crafting

- [ ] Equipping newly acquired gear when it is the best immediate progression step.
- [ ] Market use.
- [ ] One-time manual item selling so the player learns liquidation.
- [ ] One-time loot-filter introduction so the player understands automated junk cleanup.
- [ ] Selling obsolete gear or loot when that is the recommended economy action, using the same source-of-truth filter the runtime uses for loot automation (not a separate tutorial heuristic).
- [ ] Workshop / fabrication use.
- [ ] Recipe unlocks.
- [ ] Spending tradeoffs.
- [ ] Later skyscraper economy loops.

### 4.5 Pressure And Management

- [ ] Room blockers.
- [ ] City / faction / institutional pressure.
- [ ] Management policy surfaces.
- [ ] Incidents that represent a new category of consequence (not just one-off events).

---

## 5. Canonical Bodega Opening Rail

### 5.1 Order (author exactly this sequence)

1. [ ] Unlock the `Counter` in its authored starter slot.
2. [ ] When the first recruitment room becomes gameplay-live, seed a one-time starter recruit candidate pool (so the player does not wait on normal visitor cadence).
3. [ ] Recruit the first operator (player performs the hire action; no invisible grant).
4. [ ] Recruit the second operator.
5. [ ] Secure the first contract.
6. [ ] Prepare and launch the first raid.
7. [ ] Resolve the first raid return and use its payoff to introduce recovery pressure.
8. [ ] Unlock the `Dining Area` in its authored starter slot so the loop becomes sustainable.
9. [ ] Introduce the first staff-gated room via a hireable staff candidate seed (not a free invisible grant).
10. [ ] Hire and assign the first reception staff member.
11. [ ] Unlock and activate the `Register` in its authored starter slot.
12. [ ] Introduce the first guided upgrade purchase (see 5.3).
13. [ ] Unlock `Supply Closet` later as the next logistics-support step (not part of the minimum first loop).

### 5.2 Opening Rail Design Rules

- [ ] Teach the real interaction flow; do not skip it with invisible state grants.
- [ ] One-time candidate seeding is allowed to fix bootstrap pacing, but the player still performs recruit and hire actions personally.
- [ ] Contract selection, raid launch, raid return, and first recovery all appear as explicit guide beats — not assumed background systems.
- [ ] The first stable loop must include enough recruiting, raiding, recovery, and storefront setup that the player understands how the guild functions before the guide broadens into recommendation mode.
- [ ] Opening objective rewards form a reward ladder: each early payout materially helps fund the next guided action instead of sitting beside it as unrelated bonus currency.

### 5.3 First Upgrade Contract

- [ ] The first guided upgrade is `upgrade/room/dining_area:first_aid_station`.
- [ ] Rationale encoded in the objective record: matches the authored opening order (Dining Area before Register), cheapest early room upgrade on the opening path at `130 cash / 4 reputation`, reinforces post-first-raid recovery pressure, works with a zero-staff opening rail.
- [ ] After `First-Aid Station` and Register staffing, the next guided upgrade band introduces the first explicit income-and-attraction recommendation band:
  - [ ] `upgrade/room/counter:hot_coffee`
  - [ ] `upgrade/room/register:records_wall`
  - [ ] `upgrade/building/bodega:frontage`

### 5.4 Opening Reward Ladder

Rules:

- [ ] Each opening objective must ask: "what does the player need to credibly start or complete the next guided step?"
- [ ] Rewards may fully fund the next action (idle-game instant-payoff beat) or provide only the next meaningful tranche (player combines with contract income, loot sales, etc.).
- [ ] Early rewards are tuned so the player feels continuous forward motion even after one or two reasonable side spends between milestones.
- [ ] Reward values are derived from current unlock costs, staffing costs, contract entry pressure, and intended first-upgrade timing — not arbitrary round numbers.
- [ ] When the next milestone is blocked by a specific missing requirement, the reward should cover that requirement directly or bring the player visibly within reach of it.

Initial numeric targets (first implementation pass; move only if underlying costs / bid envelope / early-upgrade ordering change):

- [ ] Opening / inheritance start: normalize to roughly `30 cash` so the player can afford an opening contract filing without the rail feeling brittle.
- [ ] After first raid return: normalize to at least `100 cash` and `4 reputation` so the player can unlock recovery, hire reception (`33 cash`), and stay within visible reach of the first upgrade.
- [ ] After first reception hire or `Register` activation: normalize to roughly `145 cash` so the player can buy `First-Aid Station` (`130 cash / 4 reputation`) immediately while retaining a small treasury buffer.

Reward-top-up rule:

- [ ] Early reward logic tops the player up to these floor targets rather than paying a flat amount regardless of current treasury, outcome variance, or side gains.

### 5.5 Cold-Start Pacing Targets

- [ ] First guided action available immediately on new game.
- [ ] First recruit candidate visible within the first `2–3` objectives.
- [ ] First recruit accepted within roughly the first `5` minutes of active play.
- [ ] First contract secured within roughly the first `10` minutes of active play.
- [ ] First raid launched within roughly the first `15` minutes of active play.
- [ ] First meaningful stable loop established within roughly the first `20–30` minutes of active play.
- [ ] Bodega campaign completes quickly enough that a successful first-session player can reasonably reach Porter's without the opening feeling like the whole game.
- [ ] Porter's expands understanding of staffing, training, recovery, staging, and room specialization but still feels like a guided ramp into skyscraper freeform, not a second long tutorial campaign.

Pacing failure modes to watch during playtest:

- [ ] Players stalling because the next room / hire / contract / upgrade is too far away.
- [ ] Players receiving multiple new systems before using the previous one at least once.

### 5.6 Early Narrative Event Seeding

Required early beats (all delivered via the same authored guidance ladder, not disconnected one-off interruptions):

- [ ] Inheritance / desperate-start framing for the handed-down bodega and the decision to form the guild.
- [ ] First-contract briefing.
- [ ] First meaningful setback or consequence event, after the player has enough context to understand it.
- [ ] First raid return payoff / fallout framing.

Rules:

- [ ] Bodega presenter anchor defaults to `presenter/assistant` unless a more specific domain presenter is deliberately introduced.
- [ ] Seeded narrative events are deterministic in the opening path so the guide teaches a stable sequence before later systems open up.
- [ ] Incidents that teach a new category of risk are surfaced as explicit guide beats, not left to feel like random punishment.

### 5.7 AI Feature Gating During Guided Progression

- [ ] Game must remain fully playable with authored content only.
- [ ] Opening-path guidance assumes authored copy and deterministic identity surfaces (not generated output).
- [ ] If the player manually enables AI generation from the start, the opening rail overrides that toggle and suppresses optional AI-generated visitor identities and incident framing until the opening bootstrap is complete and the player has reached the first stable bodega loop.
- [ ] Once AI surfaces are allowed, they may vary presentation only; they must not replace gameplay-authoritative completion checks, objective ordering, or reward logic.
- [ ] When AI is disabled or unavailable, the runtime falls back cleanly to authored copy rather than changing progression behavior.

---

## 6. Objective Chain Examples (author at least these)

- [ ] Unfitted bodega shell → unlock first room → recruit first operator → staff the first workable loop → buy the first room upgrade.
- [ ] Stabilize the bodega → unlock the next support room → buy the first high-leverage upgrade → use the newly enabled loop.
- [ ] Meet recruiting → recruit first operator → fill first roster pressure → resolve first replacement tension.
- [ ] Relocate to Porter's → learn floor switching → unlock the first recommended Porter's room upgrade path → use the new management and staging pressure correctly.
- [ ] Reach skyscraper → unlock first new floor → learn expansion cadence → learn floor-specific consequences → stabilize repeatable endgame loop.

Each chain must have:

- [ ] A narrative frame.
- [ ] Explicit completion conditions.
- [ ] Reward rules.
- [ ] Next-step handoff.

Treat the bodega and Porter's bands as one continuous hand-held campaign, not separate tutorial eras. The skyscraper handoff is the final payoff, not the point where guidance first becomes strategic.

---

## 7. Narrative Voice

Use the existing presenter system as the baseline. Every authored tutorial event or guide event must either name a presenter explicitly or inherit a clear fallback presenter — never default to anonymous copy.

- [ ] Narrative voice rules support building-aware presenters, system-aware presenters, recurring guide voices where continuity helps, and narrative reframing of mechanical objectives.
- [ ] The result should feel like campaign guidance, not generic live-ops chores.

Named presenter roster assumed by this plan (some must be authored if not already present):

- [ ] `presenter/assistant` — Mara Cordero. Default campaign anchor for contracts, staffing, management, fallback operational briefings.
- [ ] `presenter/cook` — Rafi Alvarez. Food quality, hospitality, morale-through-hospitality, kitchen-adjacent consequence beats.
- [ ] `presenter/bartender` — Sloane Becker. Recruitment reads, front-of-house social pressure, public-facing nightlife / regular-pressure beats.
- [ ] `presenter/quartermaster` — Vicente Ortega, the guild quartermaster. Gear readiness, loot triage, inventory flow, stock pressure, workshop/fabrication, practical field-prep beats.
- [ ] `presenter/doctor` — Dr. June Park. Injury, recovery, treatment, infirmary / trauma support, post-mission medical consequence beats.
- [ ] `presenter/compliance-officer` — Laura Bennett, the guild's compliance officer. Compliance, policy, regulator-facing paperwork, institutional pressure, executive-floor tone, and "the city is watching" consequence beats.

Persistence rule:

- [ ] Presenters are not locked to one headquarters. They persist across bodega, Porter's, and skyscraper wherever their feature domain is the right voice.

---

## 8. Runtime Mode Rules

### 8.1 New Game

- [ ] Full tutorial-event and guide-event progression is active.
- [ ] Opening narrative seeds, pacing rewards, and AI suppression rules all apply.
- [ ] Canonical player-facing progression path.

### 8.2 Load Existing Save

- [ ] Restore the saved tutorial / guide state exactly.
- [ ] Never silently replay already-earned tutorial rewards.

### 8.3 Preview / Sandbox Mode

- [ ] Persistent tutorial-event and guide-event progression is suppressed.
- [ ] No opening-chain rewards, tutorial claims, or deterministic narrative seeds fire.
- [ ] Interruption and incident systems may still appear when sandbox state itself requires them, but the long-form campaign rail stays out of the way.

### 8.4 Dev-Console-Forced States

- [ ] Dev commands may reset or force guidance state for testing.
- [ ] Forced dev state does not redefine campaign pacing assumptions or authored ordering.
- [ ] All dev guidance commands drive the same authoritative guidance state machine (not ad hoc UI-only flags).
- [ ] Minimum dev-console support:
  - [ ] Reset the current tutorial / guide chain.
  - [ ] Jump to a named tutorial event or guide event.
  - [ ] Mark the current event complete without changing authored ordering.
  - [ ] Claim the current reward and advance.

### 8.5 Browser Automation And Deterministic Harnesses

- [ ] Tests can start with guidance disabled, active at a known event, or completed through a known milestone.
- [ ] Deterministic harnesses seed required guidance state explicitly (no reliance on incidental runtime timing).
- [ ] Automation verifies both canonical campaign behavior and sandbox-with-guidance-suppressed behavior where relevant.

---

## 9. What Guidance Should And Should Not Explain

Guidance IS the main explanation surface for:

- [ ] Why a newly unlocked room matters.
- [ ] Why an upgrade matters now.
- [ ] Why this upgrade should come before other currently available upgrades.
- [ ] Why a new system was unlocked.
- [ ] What changed after relocation or building advancement.
- [ ] Why the player should care about a newly surfaced pressure, opportunity, or management tool.

Guidance is NOT the permanent home for:

- [ ] Full encyclopedic rules text.
- [ ] Static glossary definitions.
- [ ] Large uninterrupted lore dumps.

---

## 10. Phased Rollout (Execute In Order)

Each phase has explicit exit criteria. Do not advance to the next phase until the current phase's exit criteria are met. Do not skip `vp check` / `vp test` / `vp build` before reporting phase completion.

### Phase 0 — Product Audit

- [ ] Inventory every current "why this matters," onboarding, first-use explanation, and tutorial beat shipped today.
- [ ] Inventory every shipped player-facing upgrade and feature unlock that needs an explanatory step.
- [ ] Inventory every room, upgrade, operator, and resource grant the current start state gives the player for free; decide which become guided bootstrap beats.
- [ ] Inventory the intended recommended room and upgrade order for the bodega and Porter's; note where current product leaves that order implicit.
- [ ] Group everything into one continuous campaign arc: opening HQ → full bodega → Porter's → skyscraper handoff → skyscraper climb → repeatable skyscraper endgame.
- [ ] Identify which explanations must move out of room / management UI once the guidance system exists.

Exit criteria:

- [ ] Concrete feature-by-feature coverage list exists.
- [ ] Concrete upgrade-by-upgrade coverage list exists.
- [ ] Opening zero-state bootstrap path is explicitly defined.
- [ ] No major system is left without an intended teaching moment.

### Phase 1 — Objective Data And Runtime Contract

- [ ] Define the objective record schema (section 3.1) and progression-chain schema.
- [ ] Define authoritative completion signals and reward-grant routing through ECS / gameplay events.
- [ ] Define the canonical zero-state new-game contract and the bootstrap rewards / costs that move the player from empty HQ + zero operators into the first stable loop quickly.
- [ ] Define objective replacement / retirement rules for relocation and building advancement.
- [ ] Define how recommendation-order metadata is authored so the runtime can say "do this upgrade next" without putting gameplay authority in React.
- [ ] Own the balance and tuning work required for the guide rail to function (opening reward ladder values per 5.4, early upgrade timing per 5.3, progression pacing per 5.5).
- [ ] Expect iterative implementation: author the initial rail, play through it, tune rewards / costs / pacing, repeat until guidance, economy, and balance cohere.

Exit criteria:

- [ ] The system represents a long-running objective chain without relying on ad hoc per-screen logic.

### Phase 2 — Persistent Guide Card Shell

- [ ] Build the always-on guide card UI (see 2.1).
- [ ] Support compact state, expanded state, reward read, progress read, and a clear "recommended next" read.
- [ ] Implement coexistence with the event log and cascade panels per 2.1 stack-order and drag rules.
- [ ] Run `/frontend-design` when creating the card (per project UI rule).
- [ ] Preserve the established visual language in `app/ui`, `app/app.css`, and shipped SVG assets.
- [ ] Minimum font size `text-xs` (0.75rem / 12px). No arbitrary values below that.

Exit criteria:

- [ ] The player can always see the current objective during steady-state play on HQ, Operations, and boss-commitment surfaces.
- [ ] The card is draggable, top-center by default, and placement persists within a session.

### Phase 3 — Unify Focused And Blocking Beats Under One Objective Framework

- [ ] Re-thread current spotlight beats through objective definitions.
- [ ] Re-thread current blocking narrative briefings through the same authored objective ladder where appropriate.
- [ ] Keep the useful parts of `app/ui/guidance-host.tsx` and `app/ui/interruption-host.tsx` but stop treating them as isolated onboarding islands.
- [ ] Replace the current tutorial guidance structure wholesale wherever the new authored system covers the same player need.

Exit criteria:

- [ ] Persistent, focused, and blocking guidance all derive from the same authored progression system.

### Phase 4 — Bodega And Porter's Coverage

- [ ] Convert the bodega teaching surface into rewarded objective chains.
- [ ] Author the full bodega recommendation rail per section 5 so a new player is continuously guided from zero rooms and zero operators through the intended room and room-upgrade order.
- [ ] Convert the Porter's teaching surface into rewarded objective chains.
- [ ] Author the Porter's recommendation rail so new rooms, staffing pressure, training, recovery, staging, and workshop investment are introduced in a deliberate order.
- [ ] Ensure every room upgrade on the intended progression path is taught, rewarded, and balance-authored through the chain (not left as an unguided shop choice).
- [ ] Remove duplicated explanation from steady-state UI only AFTER equivalent or better guidance coverage exists.

Exit criteria:

- [ ] A new player can move through the full bodega and Porter's campaign with a constant guided next step.
- [ ] The system can explicitly recommend first-upgrade order, not only describe unlocked options.
- [ ] Opening tutorial and early balance envelope are aligned (not tuned as separate layers).
- [ ] The guide rail continuously hands the player from one concrete action to the next, including raid completion, contract selection, equipment changes, and sell / spend decisions.

### Phase 5 — Skyscraper Coverage

Add objective chains for:

- [ ] Relocation arrival and handoff payoff.
- [ ] First new tower systems.
- [ ] Floor expansion ladder.
- [ ] Later management pressure.
- [ ] Repeatable endgame establishment.

Exit criteria:

- [ ] Guidance carries the player cleanly out of Porter's into the first stable skyscraper loop without a hand-holding gap.
- [ ] Guidance remains active through the full climb into the repeatable skyscraper loop.

### Phase 6 — Taper And Long-Run Behavior

- [ ] Add reduced-hand-holding behavior once the repeatable skyscraper loop is established (target: authored `freeform established` chain at skyscraper `A-rank` endgame band).
- [ ] Keep optional strategic / expansion guidance without preserving tutorial intensity forever.
- [ ] The guide rail completes when the player reaches skyscraper `A-rank` and satisfies the authored freeform-establishment chain. (Current repo ceiling may be lower today; the plan targets the full intended shipped scope regardless.)

Exit criteria:

- [ ] The player is no longer micromanaged once genuinely established.
- [ ] The system still surfaces useful next-goal behavior for major new milestones.

### Phase 7 — Verification And Stabilization

- [ ] Run `vp check`.
- [ ] Run `vp test`.
- [ ] Run `vp build`.
- [ ] Add or update browser coverage (Playwright per project rules — do not start dev servers autonomously) for:
  - [ ] Persistent objective visibility.
  - [ ] Focused objective spotlight handoff.
  - [ ] Blocking objective briefing handoff.
  - [ ] Reward claim / grant.
  - [ ] Save / load continuity.
  - [ ] Relocation-driven chain advancement.
  - [ ] Chain retirement and replacement.
  - [ ] Endgame taper behavior.
- [ ] Store Playwright artifacts under `playwright/screenshots/`, `playwright/logs/`, and `playwright/artifacts/`.
- [ ] If the change affects desktop-host behavior, run Tauri automation via `pnpm mcp:tauri-test` and store artifacts under `tauri-test/`.

Exit criteria:

- [ ] All project verification commands pass.
- [ ] Browser automation confirms both canonical campaign behavior and sandbox-with-guidance-suppressed behavior.

---

## 11. Shell Coexistence Compatibility (ongoing constraint)

Every current and future HQ, Operations, and boss-commitment layout must preserve:

- [ ] Guide visibility above ordinary UI.
- [ ] Guide drag interaction and click interaction.
- [ ] Modal priority — blocking narrative / interruption surfaces only render above the guide card.
- [ ] No shell refactor may claim permanent ownership of the guide card's default region (the card is player-positionable, not fixed-lane shell UI).

---

## 12. Risks To Actively Manage

- [ ] **Noise fatigue.** Pace rewards and reminders; do not let constant prompts feel spammy.
- [ ] **Cold-start drag.** Zero-state opening cannot feel punitive; enforce 5.5 pacing targets.
- [ ] **Authority drift.** Guard gameplay-authoritative completion signals; never infer from UI state.
- [ ] **Layout collision.** Design guide-card coexistence deliberately; do not let it fight the event log or cascade shell.
- [ ] **Content debt.** Treat the objective catalog as a content deliverable, not an afterthought.
- [ ] **Panel backslide.** Do not let explanation creep back into room / management panels after the guide takes over.

---

## 13. Out Of Scope

- [ ] Rewriting the full world or lore canon.
- [ ] Replacing event-log responsibilities.
- [ ] Changing gameplay authority ownership.
- [ ] Using Operations or HQ steady-state panels as a substitute for the guidance layer.

---

## 14. Deliverables

- [ ] `docs/plans/persistent-guidance-tutorial-plan.md` (this document).
- [ ] Objective data / runtime implementation of a save-safe persistent guidance framework.
- [ ] Persistent guide card plus focused / blocking handoff UI.
- [ ] A checked-in derived coverage map proving every player-facing upgrade and feature can be taught through rewarded guidance through the repeatable skyscraper endgame.
- [ ] Roadmap and product-doc updates once implementation is complete and older onboarding assumptions are retired.

---

## 15. Completion Definition

This refactor is complete when ALL of the following are true:

- [ ] Room-management UI no longer needs permanent "why this matters" essays.
- [ ] The canonical opening begins from zero operators and zero gameplay-functional room progression, while still reaching a meaningful first loop within the 5.5 pacing envelope.
- [ ] The player is rarely without a recommended next objective before the repeatable skyscraper endgame.
- [ ] The player receives explicit recommendations for which room unlocks and room upgrades to do first throughout the bodega and Porter's bands.
- [ ] Every room upgrade on the intended progression path is part of the guidance chain (early tutorial pacing and early balance are authored together).
- [ ] The tutorial reads as a modern idle-game guide rail that always has another useful goal ready until the skyscraper headquarters has become the stable repeatable endgame home.
- [ ] Tutorial logic reads as one campaign-long guidance system — not scattered onboarding patches.
