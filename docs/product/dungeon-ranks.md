# Dungeon Rank Requirements

The pattern contract for **regular (non-unique) dungeon authoring** across the F → A rank ladder. Defines structure, contract loop, stat envelopes, boss complexity, enemy roster, loot model, theme bands, and visual escalation per rank.

Unique (`U`) dungeons are authored individually and tied to specific unique operators / unique bosses; their roster lives in a separate product doc (gated on the unique operators roster).

Read [Content Taxonomy](./content-taxonomy.md) for tag/id formats. Read [Guilds And Dungeons](../world/guilds-and-dungeons.md) for canon (geography, rift logic, dungeon character).

## Dungeon Structure

A dungeon is **not a navigable map** at the gameplay layer. It's an abstraction:

- A team enters the dungeon via the active contract.
- They face a stream of transcript-driven encounters: skirmishes with regular enemies, hazards, exploration beats, and loot pickups. Implementation lives in `rewrite/operations-loop` and `rewrite/raid-minimap`.
- Each non-boss encounter contributes to the dungeon's **exploration percentage** — a contract-level value persistent across all teams that raid it.
- When a team encounters the boss, the player is prompted: engage now or skip and keep raiding. Engage triggers the boss commitment prep screen. Skip returns the team with accumulated loot.
- At 100% exploration, the boss is "ready" — every subsequent raid offers the engagement prompt until the player commits. A bottom-bar Operations Management `!` badge and event log entry surface the boss-ready state.
- Contract closes only when the boss is beaten.

## Contract Loop

- **One contract at a time.** A contract = a single dungeon locked in. The player cannot hold multiple contracts simultaneously.
- **All teams raid the same dungeon concurrently.** Teams run independent raid timelines but share the contract's exploration %. Multi-team coordination is implicit — every team is pushing into the same dungeon.
- **Teams auto-dispatch** based on Field Lead INT/PERC + team HP/morale readiness. Smart Field Leads wait for full readiness; low-INT/PERC Field Leads may push unprepared teams into raids. Player can manually override and push a team — penalty scales by how unready the team is. A fully-ready team has no override penalty (supports the first guide-event raid being clean).
- **Forfeit available with heavy penalty:** cash penalty scaled by contract rank (~one full successful clear's worth), reputation hit ~equal to what would have been earned (net-zero rep on forfeit), Operations Management cooldown of 2-3 in-game hours before next contract pool refresh.
- **Contracts refresh only on completion or forfeit.** Player picks from the available pool; cannot reroll without completing or forfeiting current.
- **Same dungeon can return** as a future contract on cooldown after completion.
- **Progression-Tier gates contract rank availability.** Operations Management room tier controls contract-offer weighting toward the highest currently unlocked rank, contract presentation, threat hints, boss reveals, and convenience inside the current PT rank band. See [Rooms Catalog](./rooms-catalog.md#operations-management).

> **Legacy cleanup follow-up:** any leftover "operational contracts within a dungeon" logic from the base game should be flagged for removal in a cleanup sub-plan. The new model is one contract = one dungeon, no nested contract structure.

## Boss Engagement

- **Single team only** for boss attempts. Even with multiple teams in the dungeon, only one team commits to a boss fight.
- **Boss commit prep screen** owns team selection, action order info, qualitative + numeric combat power estimate, and boss threat reveal. Implementation lives in `rewrite/boss-commitment-prep-screen`.
- **Live-card encounter mode** kicks in once committed. Boss event milestones (heavy attack triggered, phase gate crossed, mechanic resolved) log to the event log. No special boss-specific UI surfaces beyond the prep screen and live-card encounter.
- **Boss-skip flow:** on encountering the boss mid-raid, the player is prompted to engage or skip. Skip → team withdraws with loot to date; contract stays open. Rebuild the new-game implementation against the rewrite's ECS shape.
- **Auto-withdraw does not apply to boss fights.** Once committed, the boss fight resolves to a clear or a wipe.

## Stat Envelopes Per Rank

Stat envelopes use the same banded model as operator ranks (see [Operator Rank Requirements](./operator-ranks.md)) with intentional overlap.

### Boss Stats

| Rank | HP | Damage | Speed |
|---|---|---|---|
| F | low | low | mid (interleaves naturally with operators) |
| E | ↑ | ↑ | mid |
| D | ↑↑ | ↑↑ | mid |
| C | ↑↑↑ | ↑↑↑ | mid–high |
| B | ↑↑↑↑ | ↑↑↑↑ | mid–high |
| A | ↑↑↑↑↑ | ↑↑↑↑↑ | high |
| U | authored | authored | authored |

These are starting balance shapes. Specific numbers live in `rewrite/economy` and the seeded simulation harness.

### Stat Archetype

Each boss has an authored archetype — **tanky / fast / balanced / glassy** — telegraphed in the prep screen. Lets team comp choice matter against the boss's expected play style.

### Enemy Stats

Regular enemies sit ~30% below their dungeon's boss in HP/damage. Single-attack pattern, base speed, no chains, no ults.

Enemies inherit their dungeon's rank — F dungeon = F-tier enemies. No separate enemy rank tracking.

## Boss Complexity Per Rank

Combat package complexity climbs with rank, paralleling weapon mystical-effect gating.

| Rank | Boss profile |
|---|---|
| F | Stat scaling + 1 telegraphed heavy wind-up. Visible signature moment, no mechanic effect — just a clearly readable wind-up that gives the boss character. |
| E | 1 simple mechanic (status application or small AoE). |
| D | 1–2 mechanics. |
| C | Up to 2 mechanics. |
| B | Up to 2 mechanics + 1 phase gate at 50% HP. Phase gate shifts mechanic profile. |
| A | Up to 3 mechanics + 1 phase gate. Phase 2 swaps mechanic set. |
| U | Signature authored mechanic, possibly multi-phase. Authored individually per unique boss. |

### Mechanic Pool

Bosses pull from the same effect-kind pool as operator kits and weapon mystical effects, plus boss-only kinds:

- Phase transition (HP-gated)
- Summon (spawns minion encounter cards mid-fight)
- AoE (hits multiple operators)
- Vulnerability window (after big attack, takes increased damage briefly)
- Enrage (damage scales as HP drops)
- Self-mitigation aura
- Status field

Reuses the effect engine to keep implementation simple. Boss-only kinds carry the "epic encounter" feel without inventing a parallel mechanic system.

### Authoring Model

Mechanics are pulled from the rank-bucket pool with **parameter tuning** (e.g., "AoE attack — damage X, cooldown Y") rather than fully-authored per boss. Aligns with kit construction. Full authoring is reserved for U bosses.

## Enemy Roster Requirements

Each dungeon authors **3 enemy types** drawn from a fixed archetype pattern:

| Slot | Archetype | Stat-leveling guidance |
|---|---|---|
| 1 | Tanky | high HP, low damage, low speed |
| 2 | Ranged + fast | low HP, mid damage, high speed, attack range |
| 3 | Balanced | mid HP, mid damage, mid speed |

Authors can lean on `tanky / fast / balanced / glassy` archetype templates as suggestions for stat distribution. The 3-slot pattern is fixed; the templates are authoring hints.

Each encounter randomly samples from the dungeon's 3-enemy roster. Multiples of the same type allowed in one encounter; no forced composition rules.

**No enemy assets in initial scope.** Enemy authoring is text-only (name, stats, single-attack flavor). Visual asset authoring is roadmap content.

## Hazards

- **Per-dungeon authored.** 2–3 hazards per dungeon, themed to the dungeon concept (sewer mains = methane flare; parking garage = concrete collapse; Olympus = lightning strike).
- **Damage roll modulated by Scout perception.** Higher Scout perception = higher chance of mitigated damage. This follows Scout's locked hazard-detection role.
- **Mechanically simple.** Hazards are perception-vs-RNG damage rolls; no decision surface, no timing minigames. Roadmap-expandable; future content sub-plans can layer richer hazard kinds.

## Loot Model

- **Cash drops always per encounter.** Scaled per rank — A-rank dungeons pay ~12–15× F-rank.
- **Weapon drop rate is low outside boss.** Most weapons come from boss kills or the Market room.
- **Boss kill: guaranteed cash bonus + guaranteed dungeon-bound weapon + reputation gain.** Boss always drops 1 of the dungeon's 1–2 dungeon-bound weapons (random selection from the authored set per raid).
- **Drop quality stays at dungeon rank.** F dungeon: regular enemies drop F (rarely E). Never multi-rank skip.
- **Reputation only from boss clears.** Scaled by rank (F: small, A: significant, U: massive). Non-boss encounters yield no reputation. Boss clears are the leaderboard-climb milestone.
- **Failed raid (any operator death) = full forfeit of that team's accumulated loot.** Successful withdraw with no deaths = full carry of pre-withdraw loot. Boss clear = full loot + boss drops + rep.
- **Perception multiplies cash drops.** Team-average Perception × small % bonus per encounter. Specific formula in `rewrite/economy`.
- **No materials / crafting components.** Cash + weapons only. Crafting is dropped entirely.

Final tuning numbers live in `rewrite/economy` and the seeded simulation harness.

## Withdraw Mechanic (Regular Raids Only)

- **Auto-triggered for regular raids.** Team auto-withdraws based on Field Lead INT/PERC + team HP signals. Smart teams tolerate more risk before bailing; rookie teams flee earlier.
- **Does not apply to boss fights.** Once committed via the prep screen, the boss fight resolves to a clear or a wipe.
- **Successful withdraw with no deaths** = team returns with accumulated loot, contract stays open.
- Specific thresholds and formulas in `rewrite/economy`.

## Exploration Rate Scaling

Each non-boss raid contribution to exploration % scales with rank delta between operators and dungeon:

| Rank delta (ops vs dungeon) | Multiplier |
|---|---|
| Ops 2+ ranks above | ×1.5 |
| 1 rank above | ×1.25 |
| Matched | baseline |
| 1 rank below | ×0.75 |
| 2+ ranks below | ×0.5 |

Rough resulting raid counts to 100%: F dungeon ~5–10 raids, A dungeon ~30–50 raids. Final tuning in `rewrite/economy`.

## Theme Bands Per Rank

| Rank | Theme band | Example settings | Boss flavor + visual identity |
|---|---|---|---|
| F | Mundane NYC, grounded | parking garages, decommissioned subway stations, shuttered diners, rundown warehouses | Mutated common urban wildlife — subway pizza-rat warped, corner-store cat rift-touched, alley raccoons mutated, restaurant roach swarms, deli pigeons gone hostile. NYC-specific weirdness. |
| E | Mundane NYC, slightly off | wrong-feeling community pool, derelict department store, abandoned office floor | Apex feral beasts — pack-alpha mutated wolves, brute boars, oversized rabid predators. Larger animal forms. |
| D | NYC infrastructure, gritty | subway maintenance tunnels, sanitation depots, sewer mains, back-alley dumpster zones | Animated urban detritus — garbage-truck golems, living sewage masses, concrete-chunk constructs. The city's discarded matter turned hostile. |
| C | Heightened venues, can extend past NYC | corporate tower floors, off-Broadway theaters, museum back-rooms | Possessed infrastructure — electrical-grid phantoms, animate machinery, possessed elevator/HVAC systems, animate signage. Working city systems gone alive. |
| B | Edging into otherworldly | cathedrals, opera houses, monasteries — clearly attunement-touched | Attuned hybrid chimeras — creature+object fusions, half-recognizable rift-warped beings, biology breaks down. Smoothest transition slot — bridges D-C objects with A's pure otherworldly. |
| A | Fully otherworldly | rifted pocket dimensions, attuned ruin sites, non-Euclidean spaces | Otherworldly entities — daimons, spirit-forms, abstract embodiments. Non-Earth biology, fully alien. |
| U | Entirely mythical | Empire in the sky (Olympus-tier), underworld realms, primordial cosmic landscapes | Mythical beings — titans, god-figures, primordials. Freeform creative authority. |

**Progression read:**
- F-E: animal scale (wildlife → apex)
- D-C: object scale (junk → working systems)
- B: hybrid bridge (animal + object + attunement fusion)
- A: pure otherworldly
- U: pure myth

Each rank owns a distinct visual category with one thematic neighbor for smooth transition (F-E both animals, D-C both objects, B bridges, A-U both fantastical).

**Human-vs-human conflict is handled by rival gameplay loops, not raid bosses.** No cult leaders, ex-attuners, or rogue regulator captains as dungeon bosses. F-C is grounded superpower fiction — operators take on mutated wildlife and warped urban detritus. B-U opens the creative range to fantastical and mythical.

## Pool Sizing — Initial Minimum

Start with the minimum dungeon coverage that doesn't break recruitment / progression variety. Expand later via parallel content sub-plans (`rewrite/dungeons-c-rank-expansion`, etc.).

| Rank | Initial dungeon count |
|---|---|
| F | 1 |
| E | 1 |
| D | 1 |
| C | 1 |
| B | 1 |
| A | 1 |
| U | authored individually per unique operator unlock chain |

Initial total: 6 base dungeons. This is the baseline exit criterion: enough content to keep the game playable without blocking feature work. Expansion via parallel content sub-plans can add more dungeons per rank later.

## Generation Path

- **Pre-authored catalog only for initial scope.** No procedural dungeon generation. Each base dungeon is hand-built as a content packet:
  - Theme + setting
  - 3-enemy roster (text-only)
  - Authored boss with archetype + mechanics
  - 1–2 dungeon-bound weapons (per [Weapon Tier Requirements](./weapon-tiers.md))
  - 2–3 themed hazards
- **Random selection per contract.** When a contract slot opens, the system randomly pulls a dungeon from the available rank pool (gated by Progression-Tier).
- **Each raid attempt is fresh** — encounter stream regenerates per raid; exploration % persists at the contract level.
- **AI dungeon generation is roadmap**, not initial scope.

## Visual Escalation Per Rank

Boss visual authoring climbs with rank, paralleling the operator and weapon ladders.

| Rank | Visual authoring path |
|---|---|
| F | Simple SVG. Few layers, minimal detail. |
| E | SVG, modest complexity. Recognizable creature anatomy. |
| D | SVG, more elaborate. Detail in object/golem construction. |
| C | SVG, signature elements visible. Possessed-system detail. |
| B | SVG, complex. Multiple layers, attunement effects, hybrid forms. |
| A | SVG, peak complexity. Signature otherworldly elements, multi-layer. |
| U | **Production-time AI-agent raster.** Matches unique operator / unique weapon asset treatment per [Asset Pipeline Contract](./asset-pipeline.md), with shared glow border treatment. Not runtime AI. |

**Regular enemies have no visual assets in initial scope.** Text-only authoring; visual asset expansion is roadmap content.

## Naming Conventions

- **F-D dungeons:** setting-named. *"Old Parking Garage on 49th," "Decommissioned 7-Train Yard," "The Empty Diner on Lex," "Sewer Main C-Drift."* Functional, descriptive, NYC-rooted.
- **C-A dungeons:** proper-noun atmosphere. *"The Bullpen," "Sanctum of the Quiet Watch," "Marigold Memorial Theater."* Branded operations naming, can extend past NYC.
- **U dungeons:** full proper authored names tied to mythic landmarks. *"Olympus Aerie," "The Tartarus Vault."* Authored individually.

Mirrors the weapon tier naming ladder (functional → evocative → proper). Workplace-humor tone preserved at low ranks.

## What This Doc Doesn't Cover

- **Specific authored dungeons.** That's content; lives in dungeon templates and runtime data. Each base dungeon has its own content sub-plan.
- **Drop rates, encounter weights, and stat tuning numbers.** Lives in `rewrite/economy`.
- **Live-card boss encounter UI.** Lives in `rewrite/encounter-engine` and `rewrite/boss-commitment-prep-screen`.
- **Operations Management offer-weighting / reveal / convenience tier mechanics.** Lives in [Rooms Catalog](./rooms-catalog.md#operations-management). Contract rank access lives in [Floors Catalog](./floors-catalog.md#progression-tier-backbone).
- **Unique dungeons roster.** Separate product doc (gated on unique operators roster).
- **Hazard / mechanic effect engine implementation.** Code-side; reuses operator-kit effect engine.

## Cross-Doc References

- Archived decision source: [Full Rewrite Source](../reference/fullrewrite-source.md) §8 (encounters), §9 (boss encounters), §6 (Scout role / hazards)
- World tone, geography, rift logic: [Guilds And Dungeons](../world/guilds-and-dungeons.md), [Content Rules](../world/content-rules.md)
- Stat envelope pattern: [Operator Rank Requirements](./operator-ranks.md)
- Dungeon-bound weapon contract: [Weapon Tier Requirements](./weapon-tiers.md)
- Boss commitment prep screen: `rewrite/boss-commitment-prep-screen`
- Asset pipeline: [Asset Pipeline Contract](./asset-pipeline.md)
- Operations Management room: [Rooms Catalog](./rooms-catalog.md#operations-management)
- Loot tables and balance: `rewrite/economy` (engineering sub-plan)
