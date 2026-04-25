# 40. Headless Sim Harness

Status: not started
Plan ID: rewrite/headless-sim-harness
Implementation order: 40
Depends on: rewrite/repo-setup, rewrite/operator-model

## Scope

Build the browser-free simulation harness used for balance iteration and debugging.

Owns:

- Importable sim core with no browser dependency at gameplay layer.
- Batch seeded campaign runner.
- Interactive REPL runner.
- Default decision policies.
- Machine-readable metric output.

Does not own:

- Final balance values.
- Browser UI phase skip implementation except shared primitives.
- Real runtime AI execution during sim runs.

## Checklist

- [ ] Review this plan's scope, blockers, checklist, and acceptance criteria.
- [ ] Extract sim core so ECS, systems, templates, saves, and command dispatch run in Node.
- [ ] Implement batch mode with seed, target event, policy config, and JSON metrics output.
- [ ] Implement interactive mode for stepping ticks, inspecting state, firing commands, and advancing to conditions.
- [ ] Stub AI surfaces with authored fallbacks in headless mode.
- [ ] Share fast-forward primitives with dev menu phase skips where practical.
- [ ] Add deterministic tests for same seed and same policies producing same milestone output.

## Acceptance Criteria

- [ ] Harness can run from new game to first Unique recruit target once content exists.
- [ ] Output includes milestone times for contracts, boss kills, weapons, floors, room tiers, deaths, and unique recruitment.
- [ ] Harness has no rendering/browser dependency.
- [ ] Same seed and policy produce same results.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks determinism, browser independence, and metric usefulness.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
