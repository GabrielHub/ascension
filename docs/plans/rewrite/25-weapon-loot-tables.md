# 25. Weapon Loot Tables

Status: not started
Plan ID: rewrite/weapon-loot-tables
Implementation order: 25
Depends on: rewrite/weapon-asset-family

## Scope

Implement regular weapon templates, dungeon-bound weapons, and loot table rules.

Owns:

- F through A base weapon templates.
- Dungeon-bound weapon entries from dungeon packets.
- Drop table structure and validation.
- Rank-appropriate mystical effect usage.

Does not own:

- Market refresh behavior.
- Unique weapons.
- Final economy tuning.

## Checklist

- [ ] Read [Weapon Tier Requirements](../../product/weapon-tiers.md), [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Content Taxonomy](../../product/content-taxonomy.md)
- [ ] Create weapon template schema for rank, stat budget, stat distribution, effect, sell value, and asset reference.
- [ ] Author initial base weapon pools per rank.
- [ ] Ensure B and A weapons have exactly one mystical effect.
- [ ] Ensure F through C weapons have stat bonuses only.
- [ ] Implement drop table schema for regular encounter, boss, and dungeon-bound drops.
- [ ] Add validation for budget, rank, effect count, asset reference, and unique unsellability flags.

## Acceptance Criteria

- [ ] Weapons are the only loot item family.
- [ ] No material, crafting component, outfit, or accessory drops exist.
- [ ] Drop tables can support dungeon-bound boss weapons.
- [ ] `vp check` and template tests pass.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks item-family boundaries and stat/effect rules.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
