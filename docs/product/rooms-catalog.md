# Rooms Catalog

The canonical room list. Owns mechanical features, click behavior, and tier upgrade gates per room. Visual identity (theme + visual progression per tier) lives in [Room Themes](./room-themes.md). Floor stack, prerequisites, and the Progression-Tier backbone live in [Floors Catalog](./floors-catalog.md).

Read [Content Taxonomy](./content-taxonomy.md) for room ID format.

## Index

| Floor | Rooms |
|---|---|
| Foundations | Lobby + Progression-Tier (split) |
| Recruitment | Recruitment (full) |
| Operations | Operations Management + Team Staging (split) |
| Workshop | Market + Armory (split) |
| HR | HR (full) |
| Medical | Medical (full) |
| Training | Training (full) |
| Memorial | Hall of Honor + Raid Archive + Tribute Hall (3-room split) |
| Scouting | Scouting Room (full) |
| War | War Room (full) |
| Elite Recruitment | Unique Operator (full) |
| Elite Workshop | Unique Weapon (full) |
| Penthouse | Penthouse (full) |

**18 rooms across 13 floors.** Floor numbers/positions are mutable — see [Floors Catalog](./floors-catalog.md) for the floor-insertion rule.

## Per-Room Entries

### Foundations Floor

#### Lobby

- **ID:** `room/lobby`
- **Floor:** Foundations
- **Unlock:** pre-built day 1
- **Tier count:** 0 (no upgrades — comedic anchor, stays small)
- **Owned feature:** lifetime campaign summary
- **Click behavior:** opens summary panel showing cumulative campaign stats — total cash earned, operators hired, operators died, dungeons cleared, dungeons failed, raids run, weapons sold, narrative events resolved, etc.
- **Notes:** Mara (assistant presenter) is visible here. Save / settings / pause are NOT in the lobby — those are on the cog button. Lobby never tiers up.

#### Progression-Tier

- **ID:** `room/progression-tier`
- **Floor:** Foundations
- **Unlock:** pre-built day 1 (T1 base)
- **Tier count:** 6 (T1–T6, one per PT level)
- **Owned feature:** meta-progression gate. Spends cash + reputation to raise the PT level.
- **Click behavior:** PT panel showing current level, cost of next level (cash + reputation), and what next level unlocks across the building.
- **Tier mechanics:**
  - T1 (free, day 1): cap = 3. Rank bands: F dungeons; F visitors with rare E; F market with rare E.
  - T2 (cash + rep): cap = 6. Rank bands: E dungeons; F-E visitors with rare D; F-E-D market. Unlocks Recruitment T2, Market T2, Armory T2, Operations T2, HR floor purchase.
  - T3: cap = 9. Rank bands: D dungeons; E-D visitors with rare C; E-D-C market. Unlocks HR T2, Medical floor, Training floor, Memorial floor.
  - T4: cap = 12 (unique-goal visibility milestone). Rank bands: C dungeons; D-C visitors with rare B; D-C-B market. Unlocks Recruitment T3, Market T3, Armory T3, Medical T2, Training T2, Tribute Hall (within Memorial), HR T3, Scouting Room floor, Unique Operator floor, Penthouse floor.
  - T5: cap = 15. Rank bands: B dungeons; C-B visitors with rare A; C-B-A market. Unlocks War Room floor (also requires Raid Archive built), Medical T3, Training T3, Hall of Honor T2, Tribute Hall T2, Raid Archive T2 (rival history surface).
  - T6: cap = 18 (endgame max). Rank bands: A dungeons + Unique dungeon eligibility; B-A visitors; B-A market + unique systems. Unlocks Unique Weapon floor, War Room T2/T3, Hall of Honor T3, Tribute Hall T3, Unique Operator T2.
- **Notes:** This room is the meta-progression spine. PT owns hard rank-band access. Other rooms' tier upgrades cost cash only and improve queue size, cooldowns, reveal quality, stock breadth, convenience, and odds of rolling the highest currently unlocked rank inside the PT band.

### Recruitment Floor

#### Recruitment

- **ID:** `room/recruitment`
- **Floor:** Recruitment
- **Unlock:** pre-built day 1
- **Tier count:** 4
- **Owned feature:** visiting (non-unique) operator pool. Recruit visitors into the roster.
- **Click behavior:**
  - Click an individual chibi visitor → recruit panel for that visitor (operator detail + recruit action).
  - Click the room → visitor list panel; clicking a row opens the same recruit panel cascaded.
- **Tier mechanics:**
  - T1: 3 visitors max, base cooldown, starter distribution.
  - T2 (req PT T2): 4 visitors, shorter cooldown, better odds of rolling the highest currently unlocked visitor rank.
  - T3 (req PT T4): 5 visitors, shorter cooldown, stronger odds of rolling the highest currently unlocked visitor rank.
  - T4 (req PT T6): 5 visitors, shortest cooldown, strongest A-rank odds inside the PT T6 band. (T4 is presentation more than capacity — see room-themes for the nightclub.)
- **Notes:** Day-1 seed = 3 deterministic starter visitors (1 Field Lead + 1 Scout + 1 Support, pre-equipped with rank-F starter weapons). Random visitors after starters bias toward whichever role the player is short on. Recruitment tier never exceeds the current Progression-Tier rank band.

### Operations Floor

#### Operations Management

- **ID:** `room/operations-management`
- **Floor:** Operations
- **Unlock:** Floor purchase (opening guide step 3, after recruiting 3 starters)
- **Tier count:** 3
- **Owned feature:** contract bidding board, active contract status, threat hints.
- **Click behavior:**
  - Click room → contract overview panel (bidding board if no active, active status if running).
  - Click active contract → cascading raid minimap panel.
- **Tier mechanics:**
  - T1: contract pickup + active status, no enemy/boss reveals. Contract ranks are capped by current PT.
  - T2 (req PT T2): better odds that contract offers include the highest currently unlocked dungeon rank, plus enemy-family hints and better contract threat reads.
  - T3 (req PT T4): strongest odds that contract offers include the highest currently unlocked dungeon rank, plus boss hints, clearer danger reads, and "auto-pick next dungeon" toggle.
- **Notes:** Replaces the dropped intel resource — rank availability comes from Progression-Tier; Operations upgrades affect contract-offer odds and reveal quality.

#### Team Staging

- **ID:** `room/team-staging`
- **Floor:** Operations
- **Unlock:** same floor purchase as Operations Management
- **Tier count:** 3
- **Owned feature:** auto-formed team list, idle operator list, full roster overview.
- **Click behavior:**
  - Click room → team list panel.
  - Click team row → team detail panel.
  - Click an operator (in any list) → operator detail panel (reused, same as direct chibi click).
- **Tier mechanics:**
  - T1: see formed teams.
  - T2 (req PT T2): see all team stats inline.
  - T3 (req PT T4): cohesion / preferred-pair indicators.
- **Notes:** Team comp is locked at 1 Field Lead + 1 Scout + 1 Support. Auto-formed; player has no veto.

### Workshop Floor

#### Market

- **ID:** `room/market`
- **Floor:** Workshop
- **Unlock:** Floor purchase (opening guide step 5, after first raid)
- **Tier count:** 3
- **Owned feature:** weapon market — buy + sell. Loot filter cooldown control.
- **Click behavior:** click room → market panel. Refresh cooldown shown. Click weapon entry → weapon detail (reused).
- **Tier mechanics:**
  - T1: starter stock, base refresh, loot filter available. Stock ranks are capped by current PT.
  - T2 (req PT T2): broader stock, faster refresh, stronger odds for the highest currently unlocked market rank.
  - T3 (req PT T4): broadest regular stock, fastest refresh, best odds for top-band weapons inside the current PT band.
- **Notes:** Top 2 unlocked PT market tiers are exempt from auto-sell. Unique weapons unsellable. Vicente (presenter) is bound here.

#### Armory

- **ID:** `room/armory`
- **Floor:** Workshop
- **Unlock:** same floor purchase as Market
- **Tier count:** 3
- **Owned feature:** weapon inventory + bidirectional equip flow.
- **Click behavior:**
  - Click room → weapon list panel (current inventory).
  - Click a weapon → operators eligible to equip (those without a weapon, or with a weaker one) → quick equip.
  - From operator detail panel: clicking the equipped-weapon slot opens the same weapon list panel for swap.
  - All reused panel components.
- **Tier mechanics:**
  - T1: see inventory + equip.
  - T2 (req PT T2): sortable / filterable inventory.
  - T3 (req PT T4): equipped-vs-unequipped unified view, weapon-tier-aware suggestions.

### HR Floor

#### HR

- **ID:** `room/hr`
- **Floor:** HR
- **Unlock:** Floor purchase, requires PT T2
- **Tier count:** 3
- **Owned feature:** narrative event cadence + roster morale recovery + loyalty repair.
- **Click behavior:** click room → event log panel showing pending and recent narrative events. Click an event → event detail. Roster morale/loyalty status visible on the panel header.
- **Tier mechanics:**
  - T1: base narrative event cadence + small passive morale recovery for the regular roster.
  - T2 (req PT T3): reduces negative event frequency + larger passive morale recovery + small passive loyalty repair.
  - T3 (req PT T4): further reduces negatives, raises positive event chance + larger morale recovery + larger loyalty repair.
- **Notes:** Narrative events go live when this floor is built. Operator-death events fire post-raid as a special case. **Unique operators do not benefit from HR's morale/loyalty effects** — their recovery is owned by Penthouse.

### Medical Floor

#### Medical

- **ID:** `room/medical`
- **Floor:** Medical
- **Unlock:** Floor purchase, requires PT T3
- **Tier count:** 3
- **Owned feature:** operator recovery management.
- **Click behavior:** click room → injured roster + recovery time panel. Click operator → operator detail (reused).
- **Tier mechanics:**
  - T1: base recovery rates.
  - T2 (req PT T4): faster recovery, treats severe injuries.
  - T3 (req PT T5): reduces post-raid injury risk.
- **Notes:** Dr. June Park (presenter) is bound here. Injured operators visibly walk in this room. Unique operators do not recover here — they recover in Penthouse (when built).

### Training Floor

#### Training

- **ID:** `room/training`
- **Floor:** Training
- **Unlock:** Floor purchase, requires PT T3
- **Tier count:** 3
- **Owned feature:** trainable stat improvement (STR/SPD/END/RES) within rank caps.
- **Click behavior:** click room → training queue + which stats are being raised. Click operator → operator detail (reused).
- **Tier mechanics:**
  - T1 (Gym): trains STR + SPD only.
  - T2 (req PT T4 — Training Hall): adds END + RES, sparring-driven.
  - T3 (req PT T5 — Drill Pit): role-specific stat efficiency boosts.
- **Notes:** Operators visibly walk here while training. **Unique operators do not train.** They never appear in this room regardless of tier (per operator canon).

### Memorial Floor

#### Hall of Honor

- **ID:** `room/hall-of-honor`
- **Floor:** Memorial
- **Unlock:** Floor purchase, requires PT T3
- **Tier count:** 3
- **Owned feature:** records dead operators (capped, sorted by rank). Source of cheat-death roll at end-of-raid. Honoring the dead contributes a morale-target bonus for the living roster, proportional to recorded death count.
- **Click behavior:** click room → memorial wall sorted by rank descending.
- **Tier mechanics:**
  - T1: cap 5 names, 5% cheat-death roll, small per-recorded-death morale bonus.
  - T2 (req PT T5): cap 10, 15%, medium per-recorded-death morale bonus.
  - T3 (req PT T6): cap 20, 25%, larger per-recorded-death morale bonus.
- **Cap rule:** when a new death occurs and the cap is full, the lowest-ranked recorded operator drops off to make room.
- **Memorial-not-retroactive rule:** deaths before this room was built are NOT recorded. Cap, Tribute Hall contributions, and morale bonus only count from build-time onward.

#### Raid Archive

- **ID:** `room/raid-archive`
- **Floor:** Memorial
- **Unlock:** Floor purchase (same as Hall of Honor), requires PT T3
- **Tier count:** 2
- **Owned feature:** past raid summaries — searchable, browsable.
- **Click behavior:** click room → raid log panel. Click a raid entry → raid detail (which team, outcome, loot, casualties, transcript replay if enabled).
- **Tier mechanics:**
  - T1: raid summaries only.
  - T2 (req PT T5, post-War-Room): rival event detail + history surfaces here.
- **Notes:** Raid Archive is a **prerequisite for War Room floor purchase**. The rival-history feature lives here, not in War Room.

#### Tribute Hall

- **ID:** `room/tribute-hall`
- **Floor:** Memorial
- **Unlock:** within the Memorial floor, requires PT T4 (later than Hall of Honor + Raid Archive)
- **Tier count:** 3
- **Owned feature:** passive cash + reputation income proportional to recorded dead operators' ranks. Caps with Hall of Honor's cap.
- **Click behavior:** click room → contributions panel showing per-recorded-death contribution + total active passive boost.
- **Tier mechanics:**
  - T1: small reputation tick.
  - T2 (req PT T5): rep + small cash trickle.
  - T3 (req PT T6): rep + larger cash trickle.

### Scouting Floor

#### Scouting Room

- **ID:** `room/scouting`
- **Floor:** Scouting
- **Unlock:** Floor purchase, requires PT T4 + Memorial floor built
- **Tier count:** 3
- **Owned feature:** rival leaderboard. Position-only display, no exposed metric.
- **Click behavior:** click room → leaderboard panel showing positions only. Hover guild → name + insignia.
- **Tier mechanics:**
  - T1: leaderboard visible. Building this **seeds the rival roster** but does NOT activate rival events (War Room does that).
  - T2 (req PT T5): see rival narrative profiles + recent moves.
  - T3 (req PT T6): see rival lane and pressure style.
- **Notes:** Player at the bottom of the leaderboard until War Room is built. Reused in War Room — clicking the leaderboard row in War Room opens the leaderboard panel from Scouting.

### War Floor

#### War Room

- **ID:** `room/war-room`
- **Floor:** War
- **Unlock:** Floor purchase, requires PT T5 + Scouting Room built + Raid Archive built
- **Tier count:** 3
- **Owned feature:** current rival display + rival HP + rival event activation hookup.
- **Click behavior:** click room → current rival panel. Click leaderboard row → opens leaderboard panel (reused from Scouting).
- **Tier mechanics:**
  - T1: current rival shown, rival events fire, defeated rivals flag-tracked.
  - T2 (req PT T6): see all-rival recent moves + insignia detail.
  - T3 (req PT T6): see rival HP source breakdown (which contracts/dungeons damaged them).
- **Notes:** Building this **activates rival events**. Sets the player's current rival to whoever is directly above on the leaderboard.

### Elite Recruitment Floor

#### Unique Operator

- **ID:** `room/unique-operator`
- **Floor:** Elite Recruitment
- **Unlock:** Floor purchase, requires PT T4
- **Tier count:** 2
- **Owned feature:** authored unique operator goal catalog and recruitment after goals are complete.
- **Click behavior:** click room → unique catalog panel showing all uniques with unlock progress (some hidden until prerequisites met). Click an unlocked unique → recruit panel (reused).
- **Tier mechanics:**
  - T1: unique catalog visible, can recruit unlocked uniques.
  - T2 (req PT T6): unlock chain hints surface for incomplete uniques.
- **Notes:** Unlocking this room does not spawn random unique visitors. It reveals the unique-operator catalog: locked entries, visible requirements, and progress. Once a unique's requirements are complete, the room exposes the recruit action. Without Penthouse built, recruited uniques cannot recover or deploy — they idle in this room (and Unique Weapon room). Player can chase recruitment goals early while working toward Penthouse.

### Elite Workshop Floor

#### Unique Weapon

- **ID:** `room/unique-weapon`
- **Floor:** Elite Workshop
- **Unlock:** Floor purchase, requires PT T6
- **Tier count:** 2
- **Owned feature:** authored unique weapon goal-driven unlocks.
- **Click behavior:** click room → unique weapon catalog with unlock progress. Click an unlocked weapon → weapon detail (reused) showing assigned unique operator.
- **Tier mechanics:**
  - T1: catalog visible.
  - T2 (req PT T6): unlock chain hints surface for incomplete unique weapons.
- **Notes:** Each unique weapon belongs to a specific unique operator. Not every unique operator has a unique weapon, but every unique weapon has an associated operator.

### Penthouse Floor

#### Penthouse

- **ID:** `room/penthouse`
- **Floor:** Penthouse
- **Unlock:** Floor purchase, requires PT T4 (same tier as Unique Operator — player chooses cash priority)
- **Tier count:** 0 (no upgrades — endgame visual is consistent)
- **Owned feature:** unique operator lounge. Recovery + deployment staging for unique operators. Click feature: unique operator roster overview.
- **Click behavior:** click room → unique operator roster panel. Click unique chibi in lounge → operator detail (reused).
- **Notes:**
  - Unique operators only walk in three rooms: Unique Operator, Unique Weapon, Penthouse.
  - Without Penthouse, recruited uniques cannot recover or deploy.
  - When a unique deploys with non-unique teammates, the unique stages from Penthouse while teammates stage from Team Staging.
  - **Morale and loyalty recovery for unique operators is owned by Penthouse**, equivalent to the role HR plays for the regular roster.

## Cross-Doc References

- Visual themes per tier: [Room Themes](./room-themes.md)
- Floor stack, prerequisites, PT backbone: [Floors Catalog](./floors-catalog.md)
- Room implementation: `rewrite/rooms-catalog`
- Operator behavior in rooms: `rewrite/operator-model` and `rewrite/operator-movement`
- Panel reuse principle: `rewrite/cascading-panel-shell` and `rewrite/ui-shell`
