# 14. Operator Model

Status: not started
Plan ID: rewrite/operator-model
Implementation order: 14
Depends on: none

## Scope

Implement the authoritative operator state model.

Owns:

- Operator identity, rank, role, stats, fixed combat package, needs, morale, loyalty, injury, death, social ties, preferences, and recurring-team membership.
- Trainable vs fixed stat distinction.
- Unique-operator behavioral constraints in state.
- Derived satisfaction display value.

Does not own:

- Recruitment visitor queue.
- Combat package content authoring.
- Unique operator catalog content.
- Encounter resolution.

## Checklist

- [ ] Read [Operator Rank Requirements](../../product/operator-ranks.md), [Operators And Staff](../../world/operators-and-staff.md)
- [ ] Define ECS components and template shape for regular operators.
- [ ] Implement stats in the 1-99 envelope with trainable and fixed categories.
- [ ] Implement morale and loyalty state, baselines, thresholds, and derived satisfaction.
- [ ] Implement injury states and permanent death state.
- [ ] Implement unique-operator flags and room-visibility constraints.
- [ ] Add tests for rank caps, morale/loyalty thresholds, satisfaction derivation, and unique restrictions.

## Acceptance Criteria

- [ ] Rank advancement does not exist.
- [ ] Hunger does not exist.
- [ ] Role is one of Field Lead, Scout, or Support and is fixed at recruitment.
- [ ] Gameplay state is ECS-owned; UI consumes read models and typed intents only.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks data model against product docs and dropped operator-system rules.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
