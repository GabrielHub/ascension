# 43. Unique Weapons Catalog

Status: not started
Plan ID: rewrite/unique-weapons-catalog
Implementation order: 43
Depends on: rewrite/workshop-market, rewrite/unique-operators-catalog

## Scope

Author and validate Unique weapons paired with Unique operators.

Owns:

- Unique weapon identity packets.
- Paired-operator references.
- Signature effect rules.
- Goal-driven unlock chains after operator recruitment.
- Unique weapon portrait references and glow treatment.

Does not own:

- Regular weapon loot tables.
- Unique operator recruitment.
- Market stock generation.

## Checklist

- [ ] Read [Unique Weapon Requirements](../../product/unique-weapons.md), [Weapon Tier Requirements](../../product/weapon-tiers.md), [Asset Pipeline Contract](../../product/asset-pipeline.md)
- [ ] Decide which initial Unique operators have paired Unique weapons.
- [ ] Author one weapon packet per Unique weapon.
- [ ] Define stat budget and exactly one signature effect per weapon.
- [ ] Define unlock chain that starts only after the paired operator has joined.
- [ ] Add portrait asset references or approved placeholders using the shared glow rule.
- [ ] Validate single-copy, unsellable, never-lost behavior.

## Acceptance Criteria

- [ ] Every Unique weapon belongs to exactly one Unique operator.
- [ ] Unique weapons are not random drops and do not appear in the regular Market.
- [ ] Unique Weapon room can display locked, hinted, and unlocked states.
- [ ] Custom logic is isolated and justified per weapon when needed.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks paired-operator references, unlock chains, and signature effects.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
