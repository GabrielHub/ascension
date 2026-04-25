# Floors Catalog

The canonical floor stack for the skyscraper, with unlock prerequisites and the Progression-Tier backbone that gates everything. Pairs with [Rooms Catalog](./rooms-catalog.md) (which rooms live on each floor) and [Room Themes](./room-themes.md) (visual identity per room).

## Floor Stack

13 floors total at the current authored set. **Floor numbers are visual-stack labels, not fixed sequence** — see [Floor Insertion Rule](#floor-insertion-rule) below.

| # | Floor ID | Display Name | Rooms | Day-1 / Unlock |
|---|---|---|---|---|
| 1 | `floor/foundations` | Foundations | Lobby + Progression-Tier (split) | Pre-built day 1 |
| 2 | `floor/recruitment` | Recruitment | Recruitment (full) | Pre-built day 1 |
| 3 | `floor/operations` | Operations | Operations Management + Team Staging (split) | Floor purchase, opening guide step 3 (after recruiting 3 starters) |
| 4 | `floor/workshop` | Workshop | Market + Armory (split) | Floor purchase, opening guide step 5 (after first raid) |
| 5 | `floor/hr` | HR | HR (full) | Floor purchase, requires PT T2 |
| 6 | `floor/medical` | Medical | Medical (full) | Floor purchase, requires PT T3 |
| 7 | `floor/training` | Training | Training (full) | Floor purchase, requires PT T3 |
| 8 | `floor/memorial` | Memorial | Hall of Honor + Raid Archive + Tribute Hall (3-room split, Tribute later) | Floor purchase, requires PT T3. Tribute Hall (within) requires PT T4. |
| 9 | `floor/scouting` | Scouting | Scouting Room (full, small footprint) | Floor purchase, requires PT T4 + Memorial floor built |
| 10 | `floor/war` | War | War Room (full) | Floor purchase, requires PT T5 + Scouting Room built + Raid Archive built |
| 11 | `floor/elite-recruitment` | Elite Recruitment | Unique Operator (full) | Floor purchase, requires PT T4 |
| 12 | `floor/elite-workshop` | Elite Workshop | Unique Weapon (full) | Floor purchase, requires PT T6 |
| 13 | `floor/penthouse` | Penthouse | Penthouse (full) | Floor purchase, requires PT T4 |

## Day-1 State

A new game opens with floors 1 and 2 pre-built and visible. Recruitment ships with 3 deterministic starter visitors (1 Field Lead + 1 Scout + 1 Support, pre-equipped with rank-F starter weapons). Progression-Tier ships at level T1 (operator cap = 3).

All other floors require a floor purchase. The opening guide chain leads the player to floors 3 and 4 in mandatory beats; floors 5 onward are gated by Progression-Tier and other prerequisites.

## Progression-Tier Backbone

Progression-Tier (`room/progression-tier`) is the meta-progression spine. Six levels (T1–T6). Costs cash + reputation per level. Other room tier upgrades cost cash only but require the corresponding PT level as a prerequisite. Floor purchases also gate on PT level.

Progression-Tier also owns the strict rank-band cap. Other rooms improve throughput, reveal quality, refresh speed, queue size, and the odds of rolling the highest currently unlocked rank inside the current PT band; they do not independently unlock ranks above PT.

| PT Level | Regular Dungeon Band | Recruitment Band | Market Band | Notes |
|---|---|---|---|---|
| **T1** | F | F, rare E | F, rare E | Starter loop. |
| **T2** | E | F-E, rare D | F-E-D | Early expansion with controlled overlap. |
| **T3** | D | E-D, rare C | E-D-C | Midgame stabilizer. |
| **T4** | C | D-C, rare B | D-C-B | Unique Operator room and Penthouse become visible goals, not instant unique recruits. |
| **T5** | B | C-B, rare A | C-B-A | Rival/endgame pressure band. |
| **T6** | A + Unique dungeon eligibility | B-A | B-A + unique systems | Repeatable endgame and unique weapon chase. |

| PT Level | Op Cap | Cost To Reach | Unlocks (rooms / room-tiers / floor-purchases) |
|---|---|---|---|
| **T1** (free, day 1) | 3 | — | Base game. Lobby + Progression-Tier + Recruitment T1 + Operations T1 + Market T1 + Armory T1 (the last 4 require their respective floor purchases). |
| **T2** | 6 | cash + reputation | Recruitment T2, Market T2, Armory T2, Operations T2, **HR floor purchase**. |
| **T3** | 9 | cash + reputation (more) | HR T2, **Medical floor purchase**, **Training floor purchase**, **Memorial floor purchase** (Hall of Honor + Raid Archive built). |
| **T4** | 12 (= unique-unlock milestone) | cash + reputation | Recruitment T3, Market T3, Armory T3, Medical T2, Training T2, **Tribute Hall** unlock (within Memorial floor), HR T3, **Scouting Room floor purchase**, **Unique Operator floor purchase**, **Penthouse floor purchase**. |
| **T5** | 15 | cash + reputation | **War Room floor purchase** (also requires Raid Archive built), Medical T3, Training T3, Hall of Honor T2, Tribute Hall T2, Raid Archive T2 (rival history surface). |
| **T6** | 18 (endgame max) | cash + reputation | **Unique Weapon floor purchase**, War Room T2/T3, Hall of Honor T3, Tribute Hall T3, Unique Operator T2, Recruitment T4. |

PT levels also raise the operator roster cap. Cap progression: **3 → 6 → 9 → 12 → 15 → 18**.

## Build Order (Recommended Guide-Driven Path)

The persistent guidance system steers the player through the building in a narrative order. The mandatory opening locks the first sequence; the rest is recommended order, gated by prerequisites.

| Step | Floor / PT Action | Why |
|---|---|---|
| 1 | (already built) Lobby + Progression-Tier + Recruitment | Day-1 state. |
| 2 | Recruit all 3 starter operators | Forms the first team. |
| 3 | Buy `floor/operations` | First contract pickup. |
| 4 | Run first raid (unloseable) | Teaches the operations loop. |
| 5 | Buy `floor/workshop` | Equip flow + market access. |
| 6 | Upgrade PT to T2 | Unlocks early-game room T2s + HR floor. |
| 7 | Buy `floor/hr` | Narrative events go live. |
| 8 | Upgrade PT to T3 | Unlocks Medical, Training, Memorial floor purchases. |
| 9 | Buy `floor/medical`, `floor/training`, `floor/memorial` | Mid-game stabilizes. |
| 10 | Upgrade PT to T4 | Unlocks Scouting, Unique Operator, Penthouse, Tribute Hall. Many room T3s. |
| 11 | Buy `floor/scouting` | Foreshadows rivals. Rival roster seeds onto leaderboard. |
| 12 | Buy `floor/elite-recruitment` and `floor/penthouse` | Enables unique recruitment + deployment. |
| 13 | Upgrade PT to T5 | Unlocks War Room, Raid Archive T2, late room tiers. |
| 14 | Buy `floor/war` | Activates rival events. Player at bottom of leaderboard, current rival is whoever's directly above. |
| 15 | Upgrade PT to T6 | Unlocks Unique Weapon, max room tiers. |
| 16 | Buy `floor/elite-workshop` | Endgame unique weapon chase. |
| 17+ | Freeform endgame | Recruit all uniques, beat all rivals, complete unique weapons. |

The persistent guide system can deviate from this exact sequence based on the player's runtime state, but the dependency chain (PT levels + floor prerequisites) is authoritative. See `rewrite/guidance-system` for the live decision logic.

## Floor Insertion Rule

Floors are identified by **stable ids**, not by fixed numeric position in the stack. The `#` column above is a visual stack label for the current authored set, not a fixed sequence.

When future features add new floors, they can insert between existing floors at any position. A new feature floor between Workshop and HR, for example, gets a new stable id and slots into the visual stack at that height. Existing floors do not renumber and do not break their prerequisite chains.

The authoritative ordering is the per-floor prerequisite chain (PT level + required rooms/floors built). Visual stack labels are presentation. This rule exists so post-launch features (rooftop helicopter for international expansion, future endgame floors) can extend the building without breaking the rest of the catalog.

## Cross-Doc References

- Per-room mechanical entries: [Rooms Catalog](./rooms-catalog.md)
- Visual identity per room: [Room Themes](./room-themes.md)
- Floor model implementation: `rewrite/floor-model`
- Economy and PT cost balancing: `rewrite/economy`
