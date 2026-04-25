# 31. Rival Loop

Status: not started
Plan ID: rewrite/rival-loop
Implementation order: 31
Depends on: rewrite/operations-loop

## Scope

Implement the late-game rival leaderboard and current-rival pressure loop.

Owns:

- Rival leaderboard state.
- Current rival selection.
- Rival HP and defeat.
- Leaderboard movement on victory.
- Non-current rival random event eligibility.
- War Room activation hook.

Does not own:

- Individual rival content packets.
- Direct rival battles.
- Rival HQs.
- Public/civic pressure systems.

## Checklist

- [ ] Read [Rival Guild Creation](../../product/rival-guilds.md), [Rooms Catalog](../../product/rooms-catalog.md#war-floor)
- [ ] Implement leaderboard seeding when Scouting/War prerequisites are met.
- [ ] Implement player starting position at the bottom.
- [ ] Implement current rival as the undefeated rival immediately above the player.
- [ ] Implement HP damage sources from contracts, dungeons, and event choices.
- [ ] Implement defeat flagging, defeated-rival placement below the player, and next-rival promotion.
- [ ] Implement non-current rival random event eligibility.
- [ ] Add tests for seeding, victory movement, all-rivals-defeated state, and adding new rivals later.

## Acceptance Criteria

- [ ] Always exactly one current rival while undefeated rivals exist.
- [ ] Defeated rivals never become current again.
- [ ] Leaderboard position exposes order only, not numeric scoring.
- [ ] No direct rival battle or rival HQ system exists.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks leaderboard rules and dropped public-pressure boundaries.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
