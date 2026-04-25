# Weapon Tier Requirements

The pattern contract for weapon authoring across the F → A tiers, plus the dungeon-bound weapon model.

Unique (`U`) weapons are authored individually and paired with specific unique operators; their roster lives in a separate product doc (depends on the unique operators roster).

Read [Content Rules](../world/content-rules.md) for naming and tone climb.

## Stat Model

- **Weapons add flat stat bonuses** to the operator who wields them.
- **Operator's effective stat = base + trained + weapon.** Combat packages scale off the effective stat.
- **Anyone can equip any weapon.** No rank-locking on equip. A Field Lead carrying a sniper-style weapon (high SPD) just gets less benefit on their STR-scaling basic chain than they would with a STR weapon. Mismatch is allowed and intentional.
- **Stat distribution is per-weapon flavor**, not per-type. A bat distributes mostly to STR; a tactical rifle distributes mostly to SPD; a riot shield distributes to RES + END. There are **no weapon-type categories** at the gameplay level — agents have free creative range, the stat distribution and visual identity carry the weapon's character.

## Stat Budget Per Tier

| Tier | Total stat bonus across weapon |
|---|---|
| F | +1 to +5 |
| E | +5 to +10 |
| D | +10 to +18 |
| C | +18 to +25 |
| B | +25 to +35 (plus 1 mystical effect) |
| A | +35 to +45 (plus 1 mystical effect) |
| U | authored, ~+45 + signature effect |

These are starting balance numbers. Final tuning lives in `rewrite/economy` and the seeded simulation harness.

Stat distribution is per-weapon — the budget can be allocated across STR/SPD/END/RES however the weapon's flavor suggests. A weapon's flavor → stat distribution mapping is locked at authoring time and doesn't change at runtime.

## No Rarity Tiers Within Rank

**There is no common / uncommon / rare distinction within a tier.** Rank IS the rarity. An F weapon is an F weapon. The only mechanical differentiators are stat distribution and (at B+) the mystical effect.

This explicitly drops the old "common / uncommon / rare" language. Treat rank as the only weapon rarity axis.

## Mystical Effects

- **F, E, D, C:** stat bonuses only. No mystical effects.
- **B and A:** **exactly 1 mystical effect** per weapon, beyond stat bonus. Effect drawn from an approved effect-kind list (status applications, on-kill heal, on-hit damage bonus, crit-on-first-attack, etc.). Reuses the same effect kinds as operator kits.
- **U:** **exactly 1 signature effect**, often authored uniquely. May be more powerful or thematically tied to the paired unique operator. Lives in the unique weapons roster product doc, not here.

Effect count stays at 1 to prevent stacking complexity. Start simple.

## Weapon Categories (Three Tiers Of Specialness)

The full weapon set in the game splits across three categories. They use the same authoring contract above, but differ in how they enter the game.

### Base Weapons

- **Per-rank authored catalog.** F → A. The bulk of the weapon pool.
- Drop from dungeon encounters/bosses at appropriate rates per loot tables. Buyable from the Market room inside the current Progression-Tier market band.
- Initial pool sizing:

  | Tier | Initial base weapon count |
  |---|---|
  | F | 6–8 |
  | E | 6–8 |
  | D | 8–10 |
  | C | 8–10 |
  | B | 8–12 (each with a mystical effect) |
  | A | 8–12 (each with a mystical effect) |

  Initial total: ~45–60 base weapons. Expansion via parallel content sub-plans.

### Dungeon-Bound Weapons

- **Every authored dungeon contributes 1–2 weapons unique to that dungeon.** Themed to the dungeon's concept (an aquarium dungeon's weapon should evoke the aquarium; a parking-garage dungeon's weapon should evoke the garage).
- **Drop only from that dungeon's boss.** Not in regular enemy loot. Not in the Market.
- **Same tier as the dungeon's rank.** F-rank dungeons drop F-tier dungeon-bound weapons; A-rank dungeons drop A-tier dungeon-bound weapons (with the mystical effect rules above).
- **Authored alongside the dungeon** as a content packet, not in isolation. The dungeons-catalog sub-plan owns this work.
- Mechanically these are regular weapons (not "unique weapons" in the §10 sense). The "boss-locked drop" + "themed" combination is what makes them distinct.

### Unique Weapons

- **`U`-tier, paired with specific unique operators.** Authored individually. Lives in the future unique weapons roster product doc and follows [Unique Weapon Requirements](./unique-weapons.md).
- Hand-painted portrait with the shared glow border treatment (see [Asset Pipeline Contract](./asset-pipeline.md)).
- Goal-driven unlock chain — earned via the player completing specific authored conditions, not random drops.
- Always 1 signature effect.
- Live in the Unique Weapon room (museum display).

## Generation Path

- **Pre-authored catalog only for initial scope.** No runtime AI generation of weapons.
- Authoring uses world docs to ground every weapon — the workplace-humor-under-supernatural-pressure tone, the F→U climb (grounded → real → mystical → signature), the no-fantasy-artifact naming rule.
- AI weapon flavor is **roadmap**, not initial scope.

## Naming Conventions

- F/E/D weapons: functional and descriptive. *"Broken kitchen knife," "Tactical rifle," "Combat baton."*
- C: more deliberate flavor, still grounded. *"Field combat knife," "Sidearm with extended magazine."*
- B/A: more evocative as mystical attunement appears. Still equipment names, not fantasy artifacts. *"Riot baton with phase tracing," "Marksman rifle with rift-resonant scope."*
- Unique: proper names. Lives in the unique weapons roster.
- Dungeon-bound weapons: thematically named after the dungeon. *"Floor Manager's Tape Measure" (Department Store dungeon, A-tier), "Conductor's Whistle" (Subway dungeon, D-tier).*

Reinforces the workplace-humor tone: weapons read as repurposed tools and professional equipment, not fantasy gear.

## Visual Escalation Per Tier

| Tier | Visual flavor |
|---|---|
| F | improvised, makeshift. Scissors, broken kitchen knives, bats, pipes. The kind of thing a desperate person grabs. |
| E | improvised but better. Real combat knives, full bats, basic firearms. Still grounded. |
| D | real weapons. Combat knives, sidearms, swords, tactical rifles. Equipment a professional would carry. |
| C | specialized professional gear. Better firearms, tactical melee, signature pieces of professional kit. |
| B | mystical attunement begins. Visibly rift-touched materials, attunement-channeling components, equipment that no longer reads as ordinary. Still recognizable as a weapon. |
| A | mystical attunement obvious. Stronger rift-touch, signature visual elements, unmistakably extraordinary equipment. |
| U | named, signature, paired with operator. The boldest visual identity in the game. |

The asset playground (rebuild scope, see [Asset Pipeline Contract](./asset-pipeline.md)) must let authors compare per-tier examples side by side.

## What This Doc Doesn't Cover

- **Specific authored weapons.** That's content; lives in the weapon templates and runtime data.
- **Drop rates and loot table weighting.** Lives in `rewrite/weapon-loot-tables`.
- **Market refresh cadence and stock rules.** Lives in [Rooms Catalog](./rooms-catalog.md#market) and `rewrite/workshop-market`.
- **Equip flow.** Lives in [Rooms Catalog](./rooms-catalog.md#armory).
- **Unique weapon roster.** Separate product doc (gated on unique operators roster).
- **Effect kinds / effect-execution implementation.** Code-side; reuses operator-kit effect engine.

## Cross-Doc References

- Weapon implementation: `rewrite/weapon-loot-tables` and `rewrite/workshop-market`
- World tone and naming rules: [Content Rules](../world/content-rules.md)
- Asset pipeline (weapon icon family + unique portrait family): [Asset Pipeline Contract](./asset-pipeline.md)
- Workshop / Armory rooms: [Rooms Catalog](./rooms-catalog.md)
- Loot tables and drop rates: `rewrite/weapon-loot-tables` (engineering sub-plan)
