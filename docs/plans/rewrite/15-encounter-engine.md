# 15. Encounter Engine

Status: not started
Plan ID: rewrite/encounter-engine
Implementation order: 15
Depends on: rewrite/operator-model

## Scope

Implement autonomous boss encounter simulation.

Owns:

- Pure-speed initiative.
- Operator 3-stage basic chain and ultimate loop.
- Boss combat package shape.
- Encounter time freeze and write-back.
- Morale-adjusted combat multipliers at encounter start.
- Boss win, loss, and wipe outcomes.

Does not own:

- Boss prep screen UI.
- Regular skirmish transcript system.
- Visual effect assets or SFX inventory.
- Mid-fight player interventions.

## Checklist

- [ ] Read [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Visual Effects Pool](../../product/visual-effects-pool.md)
- [ ] Implement deterministic initiative sorted by speed with actor-id tiebreakers.
- [ ] Remove RNG initiative jitter from the new implementation.
- [ ] Implement operator and boss action loops.
- [ ] Apply morale damage and speed modifiers once at encounter start.
- [ ] Implement phase hooks simple enough for regular bosses and extensible enough for unique bosses.
- [ ] Persist encounter result back into world time, operator injuries/deaths, contract state, and loot outcomes through systems.
- [ ] Add deterministic tests for initiative, action loop, morale modifier, and wipe handling.

## Acceptance Criteria

- [ ] Encounter combat is autonomous after COMMIT.
- [ ] No mid-fight intervention library exists.
- [ ] Initiative is deterministic for the same seed and actor IDs.
- [ ] Encounter systems do not live in React components.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks encounter determinism, ECS authority, and dropped-intervention removal.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
