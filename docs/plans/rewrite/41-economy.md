# 41. Economy

Status: not started
Plan ID: rewrite/economy
Implementation order: 41
Depends on: rewrite/floor-model, rewrite/rooms-catalog, rewrite/operations-loop, rewrite/headless-sim-harness

## Scope

Implement and tune resources, costs, rewards, salaries, and pacing.

Owns:

- Cash and Reputation resource tables.
- Source/sink ledger.
- Floor purchase costs.
- Room tier upgrade costs.
- Progression-Tier costs.
- Recruit costs and salary curve.
- Contract, loot, guide, event, and rival reward tuning.
- Simulation-driven balance iteration.

Does not own:

- Adding new resource types.
- Gameplay feature implementation outside balance hooks.
- Tauri/file-backed save economy behavior.

## Checklist

- [ ] Read [Floors Catalog](../../product/floors-catalog.md), [Rooms Catalog](../../product/rooms-catalog.md), [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Weapon Tier Requirements](../../product/weapon-tiers.md), [Guide Event Requirements](../../product/guide-events.md)
- [ ] Implement Cash and Reputation only.
- [ ] Create source/sink ledger and balance table files.
- [ ] Set initial floor, room tier, Progression-Tier, recruit, salary, market, and reward values.
- [ ] Wire non-boss cash, boss reputation, guide rewards, event payouts, and weapon sale values.
- [ ] Run seeded headless campaigns and collect milestone metrics.
- [ ] Iterate toward 1.5 hour target and 1-2 hour band from new game to first Unique recruit.
- [ ] Add regression tests for no-stuck-state and bad-state recovery interaction.

## Acceptance Criteria

- [ ] Intel does not exist as a resource.
- [ ] Game is not cash-starved before the chosen guide grind transition.
- [ ] Operator salaries begin around C-rank pressure as intended.
- [ ] Headless metrics show the target band or document the remaining blocker.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks resource scope, sim evidence, and bad-state recovery.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
