# Product Content Taxonomy

This file owns future-facing content IDs, tags, and taxonomy reservations that affect runtime-facing structures.

## Narrative And Content Direction

- The project uses the world foundation reference as the future-facing content-definition anchor before broad content generation continues.
- That reference defines the world's narrative structure, how powers and superhuman capability work in-world, the thematic identity of operators, enemies, bosses, factions, gear, rooms, and the related copy and naming rules.
- Future content generation should treat that reference as the canonical thematic and content-design anchor for authored content across operators, enemies, bosses, factions, gear, rooms, and future progression content.
- Content-facing architectural questions that affect runtime behavior still need explicit product-plan answers instead of being left to the content reference.
- Implemented runtime behavior still belongs to code.
- The world foundation is future-facing content guidance, not a second gameplay source of truth.

## Content Data And Taxonomy

All content should continue using slash-delimited IDs with lowercase kebab-case segments:

```
operator/{name}
mission/{type}
event/{type}
building/{name}
room/{name}:tier_{n}
upgrade/{scope}/{target}:{feature}
resource/{name}
staff/{name}
weapon/{name}
outfit-overlay/{name}
accessory/{name}
loot/{family}/{name}
enemy/{type}/{variant}
boss/{dungeon-theme}/{name}
faction/{name}
district/{name}
```

Tags use a `prefix:value` format. Current prefixes:

| Prefix         | Domain                      | Examples                                                                           |
| -------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| `role:`        | Operator field role         | field_lead, scout, medic                                                           |
| `focus:`       | Operator specialty emphasis | containment, extraction                                                            |
| `threat:`      | Enemy behavior              | clustered, hostile, unstable, hazard, mobile, ambush                               |
| `mission:`     | Mission type                | stability, retrieval, combat                                                       |
| `objective:`   | Raid goal                   | hold, escort, clear, loot, explore, intel, hunt, boss                              |
| `event:`       | Event category              | response, staff, operations, economy, external                                     |
| `pressure:`    | Pressure source             | reputation, casualty, morale, loyalty, cash, time                                  |
| `resource:`    | Resource type               | liquid, pressure, knowledge                                                        |
| `loot:`        | Loot classification         | monster_part, dungeon_drop, sell_only                                              |
| `boss:`        | Boss encounter modifier     | frontline_shred, recovery_block, speed_drain                                       |
| `economy:`     | Economy classification      | core                                                                               |
| `progression:` | Progression role            | external                                                                           |
| `ops:`         | Operational use             | planning, recruitment                                                              |
| `room:`        | Room function               | operations, staffing, recovery, training, social                                   |
| `site:`        | Building location           | street, city                                                                       |
| `tier:`        | Progression tier            | starter, midgame                                                                   |
| `rank:`        | Content rank                | f, e, d, c, b, a, s                                                                |
| `concept:`     | Dungeon concept             | abandoned_school, cave_system, infested_aquarium, parking_garage, botanical_garden |
| `staff:`       | Staff function              | reception, logistics, maintenance, medical, admin                                  |
| `archetype:`   | Visual assembly language    | bruiser, infiltrator, strategist                                                   |

Use `common`, `uncommon`, and `rare` as gear-part rarity values. For operators, rank replaces rarity.

Inventory-tracked item families are `weapon/*`, `outfit-overlay/*`, `accessory/*`, and `loot/*`.

Phase 2 defaults all inventory-tracked items to stack by exact item ID. Do not introduce per-copy uniqueness unless the product plan is explicitly updated to require it.

Public-facing sentiment folds into reputation. Do not introduce a separate `pressure:public` axis unless the product plan is explicitly updated.

- `role:` is reserved for operator field roles only.
- `staff:` is reserved for staff functions only.
- `room:` is reserved for room-function and room-family semantics only.
- `focus:` describes operator specialty emphasis.
- `archetype:` is visual-language only and must not be treated as a gameplay role.
