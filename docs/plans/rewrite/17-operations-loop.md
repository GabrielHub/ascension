# 17. Operations Loop

Status: not started
Plan ID: rewrite/operations-loop
Implementation order: 17
Depends on: rewrite/operator-model

## Scope

Implement the contract, team, raid, withdraw, and failure-consequence systems.

Owns:

- One active contract at a time.
- Autonomous 1 Field Lead, 1 Scout, 1 Support team formation.
- Regular raid transcript model.
- Auto-dispatch and auto-withdraw rules.
- Contract completion, forfeit, failure, and boss-ready state.

Does not own:

- Dungeons catalog content.
- Raid minimap UI playback.
- Boss encounter internals after COMMIT.
- Market/equip behavior.

## Checklist

- [ ] Read [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Rooms Catalog](../../product/rooms-catalog.md)
- [ ] Implement contract lifecycle: offer, accept, active, boss-ready, complete, forfeit.
- [ ] Implement autonomous team formation with exactly one operator per role.
- [ ] Implement auto-dispatch readiness and manual push penalty rules.
- [ ] Choose and document the withdraw formula from the options summarized in this plan and [Dungeon Rank Requirements](../../product/dungeon-ranks.md).
- [ ] Implement raid transcript events for skirmish, hazard, exploration, loot, retreat, and boss reach.
- [ ] Implement failure consequences, loot retention/loss, reputation loss, and Hall of Honor cheat-death handoff.
- [ ] Add tests for team formation, contract lifecycle, withdraw, forfeit, wipe, and boss-ready state.

## Acceptance Criteria

- [ ] No separate top-level bidding board exists.
- [ ] Manual mid-raid withdraw does not exist.
- [ ] Multiple teams can raid the same active dungeon concurrently.
- [ ] Operations systems own gameplay consequences, not UI.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks operations authority boundaries and withdraw/failure edge cases.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
