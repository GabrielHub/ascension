# Product Content Taxonomy

This file owns IDs, tags, and naming patterns for content data. Implemented runtime behavior is the source of truth in code; this file owns the conventions that authored content data follows.

## Content ID Format

All content uses slash-delimited IDs with lowercase kebab-case segments:

```
operator/{name}
unique-operator/{name}
contract/{name}
dungeon/{name}
unique-dungeon/{name}
event/{type}
guide-event/{slug}
room/{name}
room/{name}:tier_{n}
floor/{name}
upgrade/{scope}/{target}:{feature}
resource/{name}
weapon/{name}
unique-weapon/{name}
loot/{family}/{name}
enemy/{type}/{variant}
boss/{dungeon-slug}/{name}
unique-boss/{name}
rival/{slug}
rival-move/{rival-slug}/{move-slug}
presenter/{slug}
```

## Dungeon And Boss Pairing

Dungeon concepts and bosses are paired content families:

- Every `dungeon/{name}` entry must resolve to exactly one attached `boss/{dungeon-slug}/{name}` via authored data.
- Every `unique-dungeon/{name}` entry must resolve to exactly one attached `unique-boss/{name}` via authored data.
- A dungeon is not a valid authored content unit until that boss attachment exists.
- Content generation and review should treat "dungeon concept + attached boss + enemy family + themed weapons + drop tables" as one content packet, even when they live in separate template files.

## Drop Table Conventions

- Per-dungeon regular encounter fallback: `drop-table/{dungeon-slug}-regular`
- Per-boss: `drop-table/{boss-slug}` (e.g. `drop-table/the-dispatcher`)
- Generic fallbacks: `drop-table/dungeon-{rank}-regular`, `drop-table/dungeon-{rank}-boss`
- Drop tables contain cash and weapons only. No materials, outfits, accessories, monster parts, or sell-only loot.

## Tag Format

Tags use a `prefix:value` format. Current prefixes:

| Prefix         | Domain                      | Examples                                                                           |
| -------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `role:`        | Operator field role         | field_lead, scout, support                                                         |
| `focus:`       | Operator specialty emphasis | containment, extraction                                                            |
| `kit:`         | Combat package sub-flavor   | heal, mitigate, buff, damage, frontline, rally, burst, debuff, hazard              |
| `threat:`      | Enemy behavior              | clustered, hostile, unstable, hazard, mobile, ambush                               |
| `contract:`    | Contract / dungeon loop     | active, completed, forfeited, boss_ready                                           |
| `objective:`   | Raid goal                   | clear, loot, explore, boss                                                         |
| `event:`       | Event category              | response, operations, economy, rival, guide                                        |
| `pressure:`    | Pressure source             | reputation, casualty, morale, loyalty, cash                                        |
| `resource:`    | Resource type               | cash, reputation                                                                   |
| `loot:`        | Loot classification         | weapon, unique_weapon                                                              |
| `boss:`        | Boss encounter modifier     | aoe, single_target                                                                 |
| `economy:`     | Economy classification      | core                                                                               |
| `progression:` | Progression role            | external                                                                           |
| `room:`        | Room function               | recruitment, operations, training, recovery, market, social, narrative             |
| `tier:`        | Progression tier            | starter, midgame, endgame                                                          |
| `rank:`        | Content rank                | f, e, d, c, b, a, u                                                                |
| `concept:`     | Dungeon concept             | (per authored dungeon, see dungeon-rank requirements)                              |
| `archetype:`   | Visual assembly language    | bruiser, infiltrator, strategist                                                   |

## Reservation Rules

- `role:` is reserved for the three operator field roles only: `field_lead`, `scout`, `support`.
- `room:` is reserved for room-function and room-family semantics only.
- `focus:` describes operator specialty emphasis.
- `archetype:` is visual-language only and must not be treated as a gameplay role.
- `kit:` describes combat package sub-flavor (the within-role kit variation; see `rewrite/combat-package-content-rewrite`).

## Inventory And Stacks

- Inventory-tracked item families: `weapon/*`, `unique-weapon/*`.
- All inventory items stack by exact item ID.
- No per-copy uniqueness for non-unique items. Equipping reserves a stack copy; unequipping returns it.
- Unique weapons are single-copy stacks (quantity caps at 1).

## Rarity And Rank

- Operators use rank (F through U). Rank replaces rarity entirely for operators.
- Weapons use rank (F through U). Rank replaces rarity for weapons; there is no common / uncommon / rare distinction inside a rank.
- Reputation is a single tracked resource; there is no separate `pressure:public` axis.
