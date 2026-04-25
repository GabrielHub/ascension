# 19. Combat Package Content Rewrite

Status: not started
Plan ID: rewrite/combat-package-content-rewrite
Implementation order: 19
Depends on: rewrite/operator-model, rewrite/encounter-effects-pool

## Scope

Author the initial regular operator combat kit pool for F through A ranks.

Owns:

- Role-tagged combat package templates.
- Sub-flavor coverage for Field Lead, Scout, and Support.
- Rank-appropriate basic chains, ultimates, and optional C+ passives.
- VFX mapping and effect-kind usage.

Does not own:

- Unique operator kits.
- Encounter engine behavior.
- Recruitment probability tuning.

## Checklist

- [ ] Read [Operator Rank Requirements](../../product/operator-ranks.md), [Visual Effects Pool](../../product/visual-effects-pool.md)
- [ ] Define kit schema validation for role, rank, sub-flavor, basic chain, ultimate, effect hooks, and optional passive.
- [ ] Author minimum coverage: one kit per rank, role, and sub-flavor.
- [ ] Ensure F through D regular kits have no passive.
- [ ] Ensure C through A passives are optional and data-declared.
- [ ] Map every kit action to an approved VFX and effect kind.
- [ ] Add template validation and tests for coverage completeness.

## Acceptance Criteria

- [ ] Recruitment can always pick a valid kit for any unlocked regular rank and role.
- [ ] Support is broader than healer and includes mitigate/buff options.
- [ ] Kits do not introduce player-directed combat controls.
- [ ] VFX/effect mappings use the shared pool.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks kit coverage, rank escalation, and effect reuse.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
