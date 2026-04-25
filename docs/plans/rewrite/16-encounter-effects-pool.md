# 16. Encounter Effects Pool

Status: not started
Plan ID: rewrite/encounter-effects-pool
Implementation order: 16
Depends on: rewrite/encounter-engine

## Scope

Implement the small reusable visual-effect and effect-kind pool for combat.

Owns:

- Five authored VFX patterns.
- Attack-type-to-effect mapping.
- Rank scaling and color override rules.
- Effect-kind execution hooks shared by operators, bosses, and mystical weapons.

Does not own:

- Sound effects.
- Individual operator kit content.
- Weapon loot table content.
- Boss SVG or portrait assets.

## Checklist

- [ ] Read [Visual Effects Pool](../../product/visual-effects-pool.md), [Operator Rank Requirements](../../product/operator-ranks.md), [Weapon Tier Requirements](../../product/weapon-tiers.md)
- [ ] Implement five reusable effect components using CSS, motion, and React.
- [ ] Add attack-type mappings for operator basics, ultimates, boss attacks, and weapon effects.
- [ ] Add rank scaling and optional per-kit/per-weapon color override support.
- [ ] Wire effect triggers to encounter events without giving UI gameplay authority.
- [ ] Add visual smoke tests or component tests for every effect.

## Acceptance Criteria

- [ ] The pool contains exactly the initial five effects unless product docs are updated.
- [ ] VFX is code-driven, not an asset family.
- [ ] Effects render on encounter portrait/card surfaces only.
- [ ] `vp check` and relevant UI tests pass.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks effect reuse and no parallel combat-rule engine in rendering code.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
