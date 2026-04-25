# 20. Dungeons Catalog

Status: not started
Plan ID: rewrite/dungeons-catalog
Implementation order: 20
Depends on: rewrite/operations-loop

## Scope

Author and validate the initial regular dungeon content packets.

Owns:

- One initial dungeon packet per F, E, D, C, B, and A rank.
- Boss, three-enemy roster, hazards, dungeon-bound weapons, loot table links, and raid backdrop reference per dungeon.
- Dungeon/boss pairing validation.

Does not own:

- Unique dungeons.
- Encounter engine behavior.
- Raid minimap rendering.
- Final economy tuning.

## Checklist

- [ ] Read [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Weapon Tier Requirements](../../product/weapon-tiers.md), [Content Taxonomy](../../product/content-taxonomy.md)
- [ ] Author one regular dungeon packet per rank F through A.
- [ ] Author exactly one boss per dungeon with rank-appropriate complexity.
- [ ] Author three regular enemy types per dungeon.
- [ ] Author two to three hazards per dungeon.
- [ ] Author one to two dungeon-bound weapons per dungeon.
- [ ] Link every dungeon to a raid backdrop placeholder or approved asset path.
- [ ] Add validation for boss attachment, enemy count, hazard count, loot references, and ID format.

## Acceptance Criteria

- [ ] The game can offer at least one contract at every regular rank.
- [ ] Every dungeon closes only by boss defeat.
- [ ] No current Ascension dungeon content is copied verbatim as canon.
- [ ] Unique-rank content is deferred to unique content plans.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks dungeon tone, rank escalation, and content packet completeness.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
