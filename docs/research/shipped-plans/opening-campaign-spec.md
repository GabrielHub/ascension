# Canonical Opening Campaign Specification

Phase 1 deliverable for `opening-campaign-remediation-plan.md`. This document defines the complete player-facing opening path for a real new-game campaign. It replaces implicit preview-mode assumptions with an explicit authored arc.

Status: implemented. This spec remains as a reference input for the shipped opening path and early-economy tooling.

Read before implementing: `docs/world/premise-and-tone.md`, `docs/world/headquarters-and-rooms.md`, `docs/product/gameplay-systems.md`, `docs/product/presentation.md`.

## Starter State Envelope

This is the canonical new-game state. Preview and sandbox modes keep their own denser seed data and skip guidance entirely.

### Operators (4)

| ID                   | Name        | Role       | Attunement | Traits              | Morale  | Loyalty | Notes                                                              |
| -------------------- | ----------- | ---------- | ---------- | ------------------- | ------- | ------- | ------------------------------------------------------------------ |
| operator/rose-vega   | Rose Vega   | Field Lead | Kinetic    | steady, resolute    | 67 / 67 | 62 / 62 | Anchor. Steady under pressure.                                     |
| operator/milo-hart   | Milo Hart   | Scout      | Void       | alert, evasive      | 63 / 63 | 58 / 58 | Explorer. Rose's field partner.                                    |
| operator/jin-tanaka  | Jin Tanaka  | Medic      | Vital      | resilient, composed | 60 / 60 | 55 / 55 | Only medic. The most precious operator on the roster.              |
| operator/vera-santos | Vera Santos | Field Lead | Kinetic    | aggressive, steady  | 70 / 65 | 65 / 65 | Backup muscle. Aggressive preference creates early social texture. |

Rationale: one balanced team of three (Field Lead + Scout + Medic) plus one backup Field Lead. The single medic is irreplaceable — any injury to Jin creates real roster pressure. The bodega operator cap is 7, leaving three recruitment slots across the opening arc.

All operators start at F-rank with light needs (hunger 5–16, fatigue 10–22, stress 8–18) and zero injury. They are worn but healthy — a new guild that hasn't earned anyone's full trust yet.

#### Changes from shipped bootstrap

- **Remove Ash Okafor** (second Scout) and **Lena Park** (second Medic). Both may appear later as recruit prospects or visitors.
- **Remove Jin's preferredPartnerIds reference to Lena Park** — Jin starts without a preferred partner since Lena is not on the roster.
- **Remove Vera's preferredPartnerIds reference to Ash Okafor** — same reason.
- Net: 6 → 4 operators.

### Social Bonds (1)

| Pair                  | Bond       | Trust | Familiarity |
| --------------------- | ---------- | ----- | ----------- |
| Rose Vega ↔ Milo Hart | field_pair | 61    | 44          |

Rationale: one existing bond demonstrates the relationship system without front-loading social complexity. The player observes one working pair before the game introduces more relationships organically.

#### Changes from shipped bootstrap

- **Remove Jin ↔ Lena medic_pair** and **Vera ↔ Ash field_pair**. Both pairs reference removed operators.
- Net: 3 → 1 bond.

### Staff (2)

| ID          | Name         | Function  | Status   | Wage | Assignment |
| ----------- | ------------ | --------- | -------- | ---- | ---------- |
| staff/aina  | Aina Solis   | Reception | Assigned | 18   | Register   |
| staff/boris | Boris Petrov | Logistics | Idle     | 15   | —          |

Rationale: one assigned staff member keeps the bodega running. One idle staff member is an immediate management lesson — Boris needs a job. The absence of maintenance staff creates a future hire target.

#### Changes from shipped bootstrap

- **Remove Carmen Liu** (Maintenance). She can appear later as a hire option.
- Net: 3 → 2 staff.

### Visitors (1)

| ID           | Name      | Desired Role | Quality | Patience | Expected Loyalty |
| ------------ | --------- | ------------ | ------- | -------- | ---------------- |
| visitor/nika | Nika Voss | Medic        | 61      | 18 hrs   | 53               |

Rationale: one visitor shows the recruitment pipeline exists. She is a medic — the scarcest role on the starting roster. Patient enough that the player does not need to act immediately, limited enough that the opportunity will not wait forever.

#### Changes from shipped bootstrap

- **Remove Dax Moreno** and **Quinn Reyes**. Three immediate recruitment options eliminates early labor-market scarcity.
- **Rename visitor ID** from `visitor/preview-1` to `visitor/nika` since this is canonical, not a preview artifact.
- Net: 3 → 1 visitor.

### Rooms (4 total, 3 active)

| Instance ID                 | Template                  | Status       | Staff      | Notes                       |
| --------------------------- | ------------------------- | ------------ | ---------- | --------------------------- |
| room-instance/register      | room/register:tier_1      | Active       | Aina Solis | Contracts, intake, walk-ins |
| room-instance/counter       | room/counter:tier_1       | Active       | —          | Recruitment surface         |
| room-instance/dining_area   | room/dining_area:tier_1   | Active       | —          | Recovery, social, medical   |
| room-instance/supply_closet | room/supply_closet:tier_1 | **Inactive** | —          | Gear storage, activatable   |

Rationale: three active rooms are the minimum functional bodega. The inactive Supply Closet is the first room-activation decision — the player learns that rooms can be toggled and that activation has a purpose.

No changes from shipped bootstrap. Room layout is correct as-is.

### Treasury and Resources

| Resource   | Starting Value |
| ---------- | -------------- |
| Cash       | 400            |
| Reputation | 0              |
| Intel      | 1              |

Rationale: 400 cash covers many F-rank contract bids (~$4–8 each), one cheap room upgrade ($90–110), but not both upgrades and heavy gear purchases simultaneously. Forces early prioritization. The shipped value of 500 is reduced to 400 to make the first upgrade decision feel like a real commitment.

#### Change from shipped bootstrap

- Treasury: 500 → 400.

### Starting Inventory

| Item ID                      | Name          | Qty | Type      |
| ---------------------------- | ------------- | --- | --------- |
| weapon/pipe-wrench           | Pipe Wrench   | 2   | Weapon    |
| weapon/kitchen-knife         | Kitchen Knife | 1   | Weapon    |
| outfit-overlay/padded-jacket | Padded Jacket | 1   | Outfit    |
| accessory/comm-earpiece      | Comm Earpiece | 1   | Accessory |

Rationale: 3 weapons for 4 operators (enough for a 3-person raid team, not enough for everyone). 1 outfit and 1 accessory (scarce defensive gear). Forces explicit equip decisions: who gets the jacket? The medic for survivability, or the field lead for tanking?

#### Changes from shipped bootstrap

- **Remove 1x Padded Jacket** (2 → 1).
- **Remove 1x Comm Earpiece** (2 → 1).
- **Remove 1x Tactical Scarf** entirely.
- **Remove 3x Monster Fang** — the player has not cleared any dungeons yet, so pre-raid loot makes no narrative sense.
- Net: 11 item copies → 5.

### Contract Board

3 F-rank contracts generated on the first simulation tick, as the shipped system already does. All F-rank because reputation is 0. Board generation, posting structure, and bidding mechanics are unchanged.

---

## The First Contract Arc

The opening campaign spans **8 contract cycles**. Each cycle is: board → bid → active site → raid(s) → result → board. The 8-contract target is a design pacing guide, not a hard gate — beats fire on game-state conditions, not on contract count. Some players will see all beats in 6 contracts; others may take 10.

### Contract 1: Opening Day

The guild's first contract. Everything is new. The guidance layer introduces the board, the bodega, the roster, equipping, and the concept of autonomous raids.

- **State entering:** Full-health roster, no prior raids, 400 cash, 3 F-rank postings
- **Beats that fire:** board-briefing (1), first-contract-choice (2), bodega-overview (3), roster-and-equip (4), first-team-departure (5)
- **Pacing:** ~4–6 game-hours of active raid time after deployment
- **Outcome constraint:** The first contract must not produce a permanent operator death. If raid resolution would generate a lethal result, downgrade to severe injury. Mixed or success results both teach valid lessons. A failed result that leaves the team alive is acceptable.

### Contract 2: The Morning After

Consequences from contract 1 land. Operators carry fatigue, possible minor injuries, morale shifts. The first incident fires. The player manages people, not just picks contracts.

- **State entering:** 1–2 operators with fatigue or minor injury from contract 1, some loot in inventory, treasury adjusted by contract 1 reward and costs
- **Beats that fire:** first-raid-return (6), roster-condition (7), first-incident (8)
- **Pacing:** Possible rest period before next deployment. Normal raid cycle.
- **Guarantee:** If the incident system has not naturally triggered an incident by the time the contract 2 board phase begins, the guidance system must force-seed one from a low-stakes template (`personnel_conflict`, `team_friction`, or `morale_surge`). The first incident should not be catastrophic — it teaches the mechanic, not the worst-case scenario.

### Contract 3: Making Ends Meet

Treasury pressure builds. Staff wages accumulate. The player decides where limited money goes: gear, upgrades, or savings. First staffing assignment and upgrade decisions become relevant.

- **State entering:** Treasury tighter, operator wear accumulating, Boris likely still idle
- **Beats that fire:** loot-and-market (9), staffing-and-rooms (10), first-upgrade (11)
- **Pacing:** Normal cycle. Upgrade decision point when treasury reaches cheapest upgrade cost.

### Contract 4: When It Goes Wrong

The first realistic setback. A mixed or failed contract result, an injury bad enough to bench someone, or a departure threat. The recovery beat teaches how to bounce back.

- **State entering:** Roster wearing down, possible 1+ injured operators, opening management tools all introduced
- **Beats that fire:** setback-recovery (12) — fires on first qualifying negative outcome
- **Pacing:** May include a forced rest/recovery period while injured operators heal in the dining area

### Contracts 5–6: Finding Your Feet

The player has encountered every core management system. The guidance layer has stepped back. Decisions are real trade-offs, not tutorial prompts. Recruitment becomes relevant as the roster wears and the player gains confidence.

- **State entering:** Player has managed at least one incident, purchased at least one upgrade, and seen raid results
- **Beats that fire:** none required; all pre-boss beats should be complete by now
- **Pacing:** Full management rhythm established. Player choosing their own cadence.

### Contracts 7–8: The Boss

Team progression reaches the boss threshold. The first boss commitment fires. This is the opening arc capstone — after this, the player is in the real game.

- **State entering:** Contract progression + raid map progression sufficient for boss contact
- **Beats that fire:** boss-commitment (13)
- **Pacing:** May span 2 contracts if the first attempt does not reach the boss. Boss commitment is a natural capstone, not a forced tutorial moment.

---

## Ordered Beat List

13 beats total. 8 satisfy the required management beats from the remediation plan. 5 are supporting beats that round out the opening. Beats are listed in expected firing order.

The beat ID prefix `guidance/opening/` is assumed throughout. Full IDs in implementation are `guidance/opening/{short-id}`.

### Beat 1: Board Briefing

- **Short ID:** `board-briefing`
- **Satisfies:** supporting (frames required beat #1)
- **Mode:** Blocking (interruption, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** None — fires on first tick when `openingPathState === "active"`
- **Teaches:** The player picks contracts from a government-cleared board. Contracts cost a filing fee. The board shows rank, threat, reward, intel, and risk. This is a guild that bids on regulated clearance work, not a hero choosing adventures.
- **Completion kind:** `acknowledged` (player clicks CTA)
- **Fires during:** Contract 1 start
- **Copy tone:** Workplace briefing. Aina's paperwork energy. The board is bureaucracy, not a quest log.

### Beat 2: First Contract Choice

- **Short ID:** `first-contract-choice`
- **Satisfies:** **Required #1 — first contract choice**
- **Mode:** Focused (target: `ui/ops/contract-board`, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 1 complete
- **Teaches:** The guild handles one government clearance contract at a time. The filing fee is a real treasury cost. Different contracts carry different risk/reward profiles. The player's choice matters.
- **Completion kind:** `contract_secured` (contract lifecycle transitions to `active`)
- **Fires during:** Contract 1

### Beat 3: Bodega Overview

- **Short ID:** `bodega-overview`
- **Satisfies:** **Required #3 — first room explanation**
- **Mode:** Focused (target: `ui/hq/category/rooms`, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 2 complete
- **Teaches:** The four bodega rooms and what each does. The Register handles contracts and walk-in visitors. The Counter is recruitment — sandwiches and job pitches. The Dining Area covers recovery, social, and medical in one space. The Supply Closet stores gear but starts inactive — it can be activated when needed. Rooms can be toggled. Staff assigned to rooms improve those rooms.
- **Completion kind:** `target_opened` with follow-up requirement — rooms category opened AND at least one room detail inspected. (Implementation note: the existing `target_opened` kind needs extension or a new `room_inspected` kind to prevent navigation-only completion.)
- **Fires during:** Contract 1
- **Copy tone:** Tour guide energy. "This is a bodega pretending to be a professional operation."

### Beat 4: Roster and Equip

- **Short ID:** `roster-and-equip`
- **Satisfies:** supporting (introduces roster UI + gear before deployment; bridges to required #2 post-raid)
- **Mode:** Focused (target: `ui/hq/category/roster`, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 3 complete
- **Teaches:** Every operator has morale, loyalty, fatigue, injury, and readiness state. These stats affect willingness to deploy and field performance. Gear can be equipped from guild inventory to improve combat stats. Not everyone has gear — decide who gets what before sending anyone into a rift.
- **Completion kind:** `target_opened` with follow-up requirement — roster category opened AND at least one operator detail inspected. (Same implementation note as beat 3.)
- **Fires during:** Contract 1
- **Copy tone:** Pre-flight checklist. The player reviewing the roster before the first job.

### Beat 5: First Team Departure

- **Short ID:** `first-team-departure`
- **Satisfies:** **Required #4 — first autonomous raid explanation**
- **Mode:** Focused (target: `ui/raid/map`, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 4 complete, `contractLifecycle === "active"`, first team has departed (`hasTeamDeparted`)
- **Teaches:** Operators form teams and deploy autonomously. They explore, fight, loot, and decide when to push deeper or pull out on their own. The player does not control tactics inside the rift. The player controls preparation, conditions, and consequences. Watch the raid map for team movement and the event log for updates.
- **Completion kind:** `team_departed` (first raid packet created)
- **Fires during:** Contract 1
- **Copy tone:** Letting go. The team is in the field and the player can only watch.

### Beat 6: First Raid Return

- **Short ID:** `first-raid-return`
- **Satisfies:** supporting (teaches raid results; sets up required #2)
- **Mode:** Focused (target: result summary or operations view, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 5 complete, first raid summary available (`raidSummaries.length > 0`)
- **Gating kind:** `requireFirstRaidReturn: true` (new gating flag — extends the existing `GuidanceBeatGating` interface)
- **Teaches:** Teams return with results: loot, injuries, morale changes, and a summary of what happened. The result review is where the player learns what the field cost. Loot goes into guild inventory. Injuries and fatigue accumulate on the operators who went in.
- **Completion kind:** `acknowledged` (player reviews result summary and clicks CTA)
- **Fires during:** Contract 1–2 transition (after first team returns)
- **Copy tone:** Debriefing. "They came back. Here's what it cost."

### Beat 7: Roster Condition

- **Short ID:** `roster-condition`
- **Satisfies:** **Required #2 — first roster-condition explanation**
- **Mode:** Focused (target: `ui/hq/category/roster`, focused on a damaged operator, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 6 complete, at least one operator has non-fresh condition (fatigue above 30, or any injury severity > 0, or current morale more than 10 below baseline)
- **Gating kind:** `requireOperatorWorn: true` (new gating flag)
- **Teaches:** Operator condition degrades from field work. Fatigued operators perform worse. Injured operators need recovery time in the dining area. Pushing damaged operators into the next contract risks worse outcomes, refusal, or departure. Rest is management, not passivity. Pacing deployments is part of running a guild.
- **Completion kind:** `acknowledged`
- **Fires during:** Contract 2 preparation phase
- **Copy tone:** Morning-after reality. The fun of the first raid gives way to the cost.

### Beat 8: First Incident

- **Short ID:** `first-incident`
- **Satisfies:** **Required #5 — first incident**
- **Mode:** Blocking (interruption, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 6 complete (not beat 7 — incident can fire before or alongside roster-condition), incident system has triggered a pending incident (`hasActiveIncident`)
- **Teaches:** Incidents freeze the simulation clock and demand a decision from the player. Every choice has real consequences — morale shifts, loyalty changes, treasury hits, relationship fallout. There is no undo. The game will keep generating these from operational pressure. Read the briefing, weigh the options, decide.
- **Completion kind:** `incident_resolved` (player makes an incident choice)
- **Fires during:** Contract 2
- **Incident timing guarantee:** If the incident system has not naturally triggered an incident by 60 game-minutes after beat 6 completes, the guidance system must force-seed one from a low-stakes authored template. Valid seed templates: `personnel_conflict`, `team_friction`, `supply_shortage`, `morale_surge`. The seeded incident must follow the standard incident pipeline (pending → interruption → choice → resolve) so the teaching moment is genuine.
- **Copy tone:** Alarm bell. Something just landed on the player's desk.

### Beat 9: Loot and Market

- **Short ID:** `loot-and-market`
- **Satisfies:** supporting (teaches the raid-to-cash economy loop)
- **Mode:** Focused (target: `ui/hq/category/market`, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 8 complete, at least one raid return with loot (`hasRaidReturnWithLoot`)
- **Teaches:** Operators bring back monster parts and sometimes salvageable gear. Some monster parts are junk for sale, while others are worth holding for prep and later consumable crafting. The market is where the player buys weapons, outfits, and accessories, sells what the guild does not need, and can eventually rely on autosell filters to keep low-value clutter under control. Better gear means better raid outcomes means more loot. That is the loop.
- **Completion kind:** `market_opened` (market UI opened)
- **Fires during:** Contract 2–3
- **Copy tone:** Shopkeeper energy. The bodega is a business.

### Beat 10: Staffing and Rooms

- **Short ID:** `staffing-and-rooms`
- **Satisfies:** **Required #6 — first staffing or roster-pressure decision**
- **Mode:** Focused (target: `ui/hq/category/rooms` or staff management surface, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 7 complete, at least one of: Boris is still idle (`staff/boris` assignment kind is `idle`), OR Supply Closet is still inactive
- **Gating kind:** `requireUnassignedManagementAction: true` (new gating flag — checks for idle staff or inactive activatable rooms)
- **Teaches:** Staff assigned to rooms make those rooms work better. Boris Petrov is idle — he needs a job. The Supply Closet is inactive — activating it gives the guild proper gear storage. Rooms without staff support operate at reduced capacity. Matching staff function to room type matters: logistics staff in the supply closet, reception staff at the register.
- **Completion kind:** `staffing_action_taken` (new completion kind — staff assignment changed OR room activation toggled)
- **Fires during:** Contract 3
- **Fallback:** If the player has already assigned Boris and activated the Supply Closet before this beat would fire, the beat is auto-completed and skipped. The player learned the lesson without the tutorial.
- **Copy tone:** Clipboard energy. "This person is on the payroll and doing nothing."

### Beat 11: First Upgrade

- **Short ID:** `first-upgrade`
- **Satisfies:** **Required #7 — first upgrade decision**
- **Mode:** Focused (target: upgrade panel / room detail upgrade section, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 9 complete (market teaching first, so the player understands the cash loop), treasury >= cost of cheapest available upgrade
- **Gating kind:** `requireUpgradeAffordable: true` (new gating flag — checks treasury against cheapest available upgrade cost in the building + room upgrade pool)
- **Teaches:** Upgrades are physical improvements to the bodega. They cost cash but provide tangible benefits — better room capacity, income, morale, recovery rate. Each upgrade is a small milestone: the player scraping together enough to make the place slightly less terrible. The bodega does not become something it is not. It becomes a better version of what it already is.
- **Completion kind:** `upgrade_purchased` (new completion kind — at least one building or room upgrade has been applied)
- **Fires during:** Contract 3
- **Fallback:** If the player has already purchased an upgrade before this beat would fire, the beat is auto-completed and skipped.
- **Copy tone:** Small win. "The player finally fixed the leak in the ceiling."

### Beat 12: Setback Recovery

- **Short ID:** `setback-recovery`
- **Satisfies:** **Required #8 — first setback recovery path**
- **Mode:** Blocking (interruption, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 5 complete (post-first-deployment), AND at least one of: contract result with `result === "fail"`, OR contract result with `result === "mixed"` and at least one operator casualty, OR any operator injury with `severity >= 40` (moderate+), OR any operator has triggered a departure warning
- **Gating kind:** `requireSignificantSetback: true` (new gating flag)
- **Teaches:** Setbacks are part of running a guild. Injured operators recover in the dining area — give them time. Failed contracts do not end the game — the board always has new work. If you lost someone, recruitment fills the gap over time. The rent is still due and there are still dungeons to clear. The comedy comes back because it has to.
- **Completion kind:** `acknowledged`
- **Fires during:** Contract 4+ (whenever first qualifying setback occurs)
- **Fallback trigger:** If the player reaches contract 5 without triggering a qualifying setback (they have been consistently successful), fire this beat preemptively when any operator's morale drops below 45 or any operator sustains any injury. At that point the player is far enough into the arc that the concept of recovery should be explicitly taught even if nothing catastrophic has happened yet.
- **Copy tone:** Honest and steady. This is where the comedy stops briefly. "They got hurt. Here's what you do about it."

### Beat 13: Boss Commitment

- **Short ID:** `boss-commitment`
- **Satisfies:** supporting (capstone encounter teaching)
- **Mode:** Blocking (interruption, `pauseWorld: true`, `allowSkip: false`)
- **Gate:** Beat 11 complete (upgrades taught), boss commitment event triggered by raid progression (`hasBossCommitment`)
- **Teaches:** A team has reached the floor boss. This is not a passive raid update — it is a stop-the-game decision. Committing sends the team into a live encounter with real stakes: injury, death, contract closure. Retreating pulls them out alive but leaves the boss standing. There is no partial commitment. This is the highest-stakes moment in a contract.
- **Completion kind:** `boss_commitment_resolved` (player commits or retreats)
- **Fires during:** Contract 7–8 (natural progression timing)
- **Copy tone:** Weight. "A team just reached something that can kill them all."

---

## Required Beat Coverage Map

| Required Management Beat                   | Satisfied By            | Beat # |
| ------------------------------------------ | ----------------------- | ------ |
| First contract choice                      | `first-contract-choice` | 2      |
| First roster-condition explanation         | `roster-condition`      | 7      |
| First room explanation                     | `bodega-overview`       | 3      |
| First autonomous raid explanation          | `first-team-departure`  | 5      |
| First incident                             | `first-incident`        | 8      |
| First staffing or roster-pressure decision | `staffing-and-rooms`    | 10     |
| First upgrade decision                     | `first-upgrade`         | 11     |
| First setback recovery path                | `setback-recovery`      | 12     |

---

## Acceptance Criteria

Observable state conditions that prove each beat fired correctly and completed. These are the conditions a reviewer or automated test would verify.

### Beat 1: Board Briefing

| Condition | Observable State                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre       | `guidanceState.openingPathState === "active"`, no beats in `completedBeatIds`                                                                |
| Active    | Blocking interruption visible with `payload.kind === "guidance"` and `payload.beatId` ending in `board-briefing`, `worldTimeFrozen === true` |
| Complete  | `guidanceState.completedBeatIds` includes `guidance/opening/board-briefing`                                                                  |
| Post      | Contract board is interactable, 3 posted contracts visible                                                                                   |

### Beat 2: First Contract Choice

| Condition | Observable State                                                                                |
| --------- | ----------------------------------------------------------------------------------------------- |
| Pre       | Beat 1 in `completedBeatIds`, `contractLifecycle === "bidding"`, `postedContracts.length === 3` |
| Active    | Focused guidance targeting contract board, world paused                                         |
| Complete  | `contractLifecycle === "active"`, `contractSite !== null`, beat 2 in `completedBeatIds`         |
| Post      | Treasury reduced by bid cost, posted contracts cleared, active site established                 |

### Beat 3: Bodega Overview

| Condition | Observable State                                                                       |
| --------- | -------------------------------------------------------------------------------------- |
| Pre       | Beat 2 in `completedBeatIds`                                                           |
| Active    | Focused guidance targeting rooms category                                              |
| Complete  | Rooms UI opened AND at least one room detail card viewed, beat 3 in `completedBeatIds` |
| Post      | Player has navigated to room details (not just opened the category tab)                |

### Beat 4: Roster and Equip

| Condition | Observable State                                                                       |
| --------- | -------------------------------------------------------------------------------------- |
| Pre       | Beat 3 in `completedBeatIds`                                                           |
| Active    | Focused guidance targeting roster category                                             |
| Complete  | Roster UI opened AND at least one operator detail viewed, beat 4 in `completedBeatIds` |
| Post      | Player has seen operator stats and equip interface                                     |

### Beat 5: First Team Departure

| Condition | Observable State                                               |
| --------- | -------------------------------------------------------------- |
| Pre       | Beat 4 in `completedBeatIds`, `contractLifecycle === "active"` |
| Active    | Focused guidance targeting raid map                            |
| Complete  | `activeRaidPackets.length > 0`, beat 5 in `completedBeatIds`   |
| Post      | At least one team is deployed in the active contract site      |

### Beat 6: First Raid Return

| Condition | Observable State                                                                        |
| --------- | --------------------------------------------------------------------------------------- |
| Pre       | Beat 5 in `completedBeatIds`, `raidSummaries.length > 0`                                |
| Active    | Focused guidance showing result summary                                                 |
| Complete  | Player acknowledges result summary, beat 6 in `completedBeatIds`                        |
| Post      | Raid summary visible, loot in inventory (if success/mixed), operator conditions updated |

### Beat 7: Roster Condition

| Condition | Observable State                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre       | Beat 6 in `completedBeatIds`, at least one operator with `fatigue > 30` OR `injury.severity > 0` OR `morale.current < morale.baseline - 10` |
| Active    | Focused guidance targeting roster, highlighting a worn operator                                                                             |
| Complete  | Player acknowledges, beat 7 in `completedBeatIds`                                                                                           |
| Post      | Player has been shown a post-raid operator condition readout                                                                                |

### Beat 8: First Incident

| Condition | Observable State                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Pre       | Beat 6 in `completedBeatIds`, `incidentState.pendingIncident !== null`                                                  |
| Active    | Blocking interruption with `payload.kind === "guidance"` layered over incident interruption, `worldTimeFrozen === true` |
| Complete  | `incidentState.history.length > 0`, beat 8 in `completedBeatIds`                                                        |
| Post      | Incident resolved with player-chosen option, consequences applied to ECS state                                          |

### Beat 9: Loot and Market

| Condition | Observable State                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| Pre       | Beat 8 in `completedBeatIds`, at least one `raidSummary` with `result === "success"` or `result === "mixed"` |
| Active    | Focused guidance targeting market category                                                                   |
| Complete  | Market UI opened, beat 9 in `completedBeatIds`                                                               |
| Post      | Player has accessed buy/sell surface                                                                         |

### Beat 10: Staffing and Rooms

| Condition | Observable State                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Pre       | Beat 7 in `completedBeatIds`, (`staff/boris` assignment is `idle` OR `room-instance/supply_closet` is inactive)                         |
| Active    | Focused guidance targeting rooms/staff management                                                                                       |
| Complete  | Staff assignment changed (Boris assigned to a room) OR room activation toggled (supply closet activated), beat 10 in `completedBeatIds` |
| Post      | Staff or room state differs from bootstrap default                                                                                      |
| Auto-skip | If Boris is already assigned AND supply closet is already active when this beat becomes eligible, mark as auto-completed                |

### Beat 11: First Upgrade

| Condition | Observable State                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------ |
| Pre       | Beat 9 in `completedBeatIds`, `GuildState.treasury >= cheapestAvailableUpgradeCost`              |
| Active    | Focused guidance targeting upgrade interface                                                     |
| Complete  | At least one upgrade applied (building or room upgrade count > 0), beat 11 in `completedBeatIds` |
| Post      | Treasury reduced by upgrade cost, upgrade effect applied to building or room                     |
| Auto-skip | If an upgrade has already been purchased when this beat becomes eligible, mark as auto-completed |

### Beat 12: Setback Recovery

| Condition | Observable State                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre       | Beat 5 in `completedBeatIds`, AND qualifying setback: contract `result === "fail"`, OR mixed result with casualty, OR `operator.injury.severity >= 40`, OR departure warning triggered |
| Active    | Blocking interruption with recovery guidance                                                                                                                                           |
| Complete  | Player acknowledges, beat 12 in `completedBeatIds`                                                                                                                                     |
| Post      | Player has been briefed on recovery options (rest, recruit, regroup)                                                                                                                   |
| Fallback  | If contract 5 begins with no qualifying setback yet, trigger on any `morale.current < 45` or any `injury.severity > 0`                                                                 |

### Beat 13: Boss Commitment

| Condition | Observable State                                                               |
| --------- | ------------------------------------------------------------------------------ |
| Pre       | Beat 11 in `completedBeatIds`, boss commitment interruption in queue or active |
| Active    | Blocking guidance layered over boss commitment interruption                    |
| Complete  | Boss commitment resolved (commit or retreat), beat 13 in `completedBeatIds`    |
| Post      | Encounter started (if committed) or team retreated (if retreated)              |

### Opening Path Completion

| Condition                             | Observable State                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| All 13 beats complete                 | `guidanceState.openingPathState === "completed"`, `guidanceState.completedBeatIds.length >= 13`                |
| Partial completion survives save/load | After save → load, `guidanceState.completedBeatIds` matches pre-save state, next eligible beat fires correctly |

---

## Recovery Floor Guarantees

These prevent the opening campaign from softlocking. They are not guidance beats — they are game-state invariants that the opening arc depends on.

### 1. Board Affordability

The contract board always generates at least one posting with `bidCost <= treasury` when the player's reputation meets the minimum. At F-rank with reputation 0, bid costs are ~$4–8 (8% of ~$54 base reward). The 400 starting treasury provides 50+ contract bids worth of budget before running dry from bids alone.

### 2. No Permadeath on Contract 1

The first contract's raid resolution must not produce a permanent operator death. Implementation: apply a `firstContractShield` modifier that downgrades lethal resolution outcomes to severe injury (high severity, long recovery, but the operator lives). This modifier is active only while `completedBeatIds` does not yet include `first-raid-return` (beat 6). After the first raid return, death risk is real.

### 3. Roster Recovery Pacing

Injured operators recover passively in the dining area. Minor injuries (severity 1–25) should recover in 4–8 game-hours. Moderate injuries (severity 26–50) should recover in 12–24 game-hours. This pacing ensures at least one contract cycle of rest is sufficient to return a minor-injured operator to service.

### 4. Minimum Viable Team

The autonomous team formation system allows teams smaller than the ideal 3-person composition. A 2-person team can deploy at higher risk. This means even with 2 of 4 operators injured, the player can still field a team — the game does not softlock from injuries alone.

### 5. Recruitment Access

The Counter room is active from Day 1. The visitor system generates prospects based on simulation time and room state. At least one visitor (Nika Voss) is present at start. After the first contract, the system should generate additional visitors at a frequency that ensures replacement candidates appear within 1–2 contract cycles of any operator loss.

### 6. Board Refresh

The board always generates 3 new postings when entering bidding phase. The player always has choices. An empty board state is not a valid opening-arc outcome.

### 7. Incident Mercy Window

During the opening arc (contracts 1–3), the incident system should draw from low-stakes template pools: `personnel_conflict`, `team_friction`, `supply_shortage`, `morale_surge`, `contract_opportunity`. High-pressure templates (`breach_emergency`, `rival_poaching`, `departure_warning` with actual departure) should be suppressed until the player has completed at least beat 8 (first incident). This prevents a catastrophic early incident from overwhelming a player who hasn't yet learned the incident mechanic.

---

## Shipped Flow Gap Analysis

### Starter Envelope Problems

| #   | Issue                           | Current State                            | Required State                                                              |
| --- | ------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 1   | **Roster too large**            | 6 operators for 4 rooms                  | 4 operators — one team + one backup. Creates real roster tension.           |
| 2   | **Too many pre-existing bonds** | 3 field_pair/medic_pair bonds            | 1 bond (Rose ↔ Milo). Learn relationships from one example.                 |
| 3   | **Three visitors at start**     | 3 immediate recruitment options          | 1 visitor (Nika Voss, medic). Scarcity drives the labor market lesson.      |
| 4   | **Inventory too generous**      | 11 item copies, near-full equip coverage | 5 item copies. Scarce gear forces equip decisions.                          |
| 5   | **Monster fangs at start**      | 3 fangs in inventory                     | 0. No pre-raid loot — the player hasn't cleared anything yet.               |
| 6   | **Treasury too comfortable**    | 500 cash                                 | 400. Makes the first upgrade a real commitment.                             |
| 7   | **Staff oversupplied**          | 3 staff (one assigned, two idle)         | 2 staff (one assigned, one idle). One idle staff is a lesson; two is noise. |

### Guidance Beat Problems

| #   | Issue                               | Details                                                                                                                                                                                                                                                                                                               |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | **Navigation-only completion**      | Beats 3–5 complete by opening a UI tab (`target_opened`). Teaches navigation but not decision-making. Player clicks a tab and the beat is done without engaging with content. Fix: require at least one interaction within the opened surface (inspect a room, inspect an operator).                                  |
| 9   | **No equip/gear teaching**          | The roster beat (beat 4) shows operators but never teaches gear equipping. Given that gear is scarce and equip decisions matter in the opening, there should be explicit guidance to equip gear before the first raid.                                                                                                |
| 10  | **No room activation teaching**     | The Supply Closet starts inactive, but no beat explains room activation or teaches the player to toggle it.                                                                                                                                                                                                           |
| 11  | **No staff assignment teaching**    | Boris starts idle, but no beat explains where to assign him or why it matters. Staff assignment is a core management loop with zero guidance coverage.                                                                                                                                                                |
| 12  | **No upgrade teaching**             | No shipped beat covers the first upgrade decision. Upgrades are the primary bodega milestone system.                                                                                                                                                                                                                  |
| 13  | **No setback recovery teaching**    | No shipped beat covers failure recovery. If the player's first raid goes badly, there is no guidance on what to do next. The game risks feeling punitive instead of educational.                                                                                                                                      |
| 14  | **No post-raid condition teaching** | The shipped roster-readiness beat (beat 4) fires BEFORE the first raid when all operators are fresh. It cannot teach condition degradation because degradation has not happened yet. A post-raid roster-condition beat is needed.                                                                                     |
| 15  | **No raid-return teaching**         | No beat covers what happens when a team comes back. The transition from "team is in the field" to "team returned with results and consequences" has no explicit teaching moment.                                                                                                                                      |
| 16  | **Incident timing not guaranteed**  | Beat 7 gates on the incident system naturally triggering one, but incident generation is probabilistic and pressure-driven. There is no guarantee an incident fires by contract 2. The guidance system needs a force-seed mechanism for the first incident.                                                           |
| 17  | **Event-log beat is low-value**     | The shipped `event-log-and-world-view` beat (current beat 3) teaches that the event log exists by asking the player to open it. The log is always visible on the right rail and self-teaches through use. This beat consumes a guidance slot without teaching a management decision. Replace with higher-value beats. |

### Missing Mechanisms

| #   | Issue                                  | Details                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 18  | **No first-contract safety net**       | No guarantee that contract 1 doesn't wipe the team. A `firstContractShield` modifier should prevent permadeath on the very first raid.                                                                                                                                                                                                                             |
| 19  | **No incident force-seeding**          | The guidance system cannot guarantee an incident fires when needed. Implementation must add a force-seed path that creates a low-stakes incident through the standard incident pipeline when the first-incident beat's timing guarantee is not met naturally.                                                                                                      |
| 20  | **No auto-skip for proactive players** | Beats 10 and 11 (staffing, upgrade) teach actions the player may have already taken. The guidance system needs auto-completion logic: if the taught action was already performed, skip the beat silently.                                                                                                                                                          |
| 21  | **No incident mercy window**           | The incident system draws from the full template pool from the start. An early `breach_emergency` or `rival_poaching` can overwhelm a player who hasn't learned the incident mechanic yet. Early-game incidents need a template filter.                                                                                                                            |
| 22  | **Opening path binary state**          | `openingPathState` is `active` or `completed` with no intermediate tracking. The opening arc would benefit from tracking which contract the player is on (or how many beats are complete) to gate content like incident mercy and permadeath protection. The existing `completedBeatIds` array may be sufficient for these gates without adding a new state field. |
| 23  | **Completion kinds need extension**    | New beats require new completion kinds: `room_inspected`, `operator_inspected`, `staffing_action_taken`, `upgrade_purchased`. The existing `GuidanceCompletionKind` union and `isCompletionMet` function need these additions.                                                                                                                                     |
| 24  | **Gating flags need extension**        | New beats require new gating flags: `requireFirstRaidReturn`, `requireOperatorWorn`, `requireUnassignedManagementAction`, `requireUpgradeAffordable`, `requireSignificantSetback`. The existing `GuidanceBeatGating` interface needs these additions.                                                                                                              |

---

## Implementation Constraints

Per the remediation plan:

- **No new runtime architecture.** All beats use the existing guidance system, interruption layer, and ECS state.
- **Onboarding authority stays in ECS/runtime.** React and UI code provide anchors and typed intents; they do not own whether a beat is active.
- **Interruption-backed narrative beats stay in the existing interruption layer.** No parallel modal authority path.
- **Preview/sandbox stays separate.** Preview mode continues to skip guidance and use its own denser seed data.
- **Copy stays grounded in world docs.** Every beat's framing should sound like the world: workplace comedy under supernatural pressure, the player as a regular person managing superhumans, the bodega as a real bodega.

## New Completion Kinds Required

| Kind                    | Trigger                                                                     | Notes                              |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `room_inspected`        | UI signals that a room detail card was viewed while the beat is active      | Extends `target_opened` with depth |
| `operator_inspected`    | UI signals that an operator detail card was viewed while the beat is active | Extends `target_opened` with depth |
| `staffing_action_taken` | Staff assignment command or room activation command fired                   | Simulation-detectable              |
| `upgrade_purchased`     | Any building or room upgrade applied                                        | Simulation-detectable              |

## New Gating Flags Required

| Flag                                | Evaluation Logic                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `requireFirstRaidReturn`            | `raidSummaries.length > 0`                                                                          |
| `requireOperatorWorn`               | Any operator has `fatigue > 30` OR `injury.severity > 0` OR `morale.current < morale.baseline - 10` |
| `requireUnassignedManagementAction` | Any staff is idle OR any activatable room is inactive                                               |
| `requireUpgradeAffordable`          | `GuildState.treasury >= cheapestUpgradeCost` across all available building and room upgrades        |
| `requireSignificantSetback`         | Contract result fail, mixed-with-casualty, moderate+ injury, or departure warning                   |
