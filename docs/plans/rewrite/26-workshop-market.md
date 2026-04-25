# 26. Workshop Market

Status: not started
Plan ID: rewrite/workshop-market
Implementation order: 26
Depends on: rewrite/weapon-loot-tables, rewrite/rooms-catalog

## Scope

Implement Market and Armory room behavior.

Owns:

- Weapon market stock generation and refresh cooldown.
- Buy and sell behavior.
- Stack-based weapon inventory.
- Manual equip, quick equip, and auto-equip.
- Loot filter and auto-sell rules.

Does not own:

- Weapon content authoring.
- Unique weapon unlock chains.
- Operator combat package behavior.

## Checklist

- [ ] Read [Rooms Catalog](../../product/rooms-catalog.md#workshop-floor), [Weapon Tier Requirements](../../product/weapon-tiers.md)
- [ ] Implement stack-based inventory with equipped-copy reservation.
- [ ] Implement Market stock generation bounded by Progression-Tier and room tier.
- [ ] Implement market refresh cooldown from room tier data.
- [ ] Implement buy, sell, unsellable unique behavior, and loot filter thresholds.
- [ ] Implement Armory equip flow and operator-detail bidirectional swap flow.
- [ ] Implement auto-equip from highest-rank eligible stack.
- [ ] Add tests for stacking, equip reservation, sell filter, unique unsellability, and market refresh.

## Acceptance Criteria

- [ ] Anyone can equip any weapon.
- [ ] Unique weapons are single-copy, unsellable, and never lost on death.
- [ ] Full-team wipe loses non-unique weapons only through operations consequences.
- [ ] Market and Armory are room-owned surfaces.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks inventory authority, room ownership, and loot-filter rules.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
