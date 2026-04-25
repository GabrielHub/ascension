# 22. Boss Commitment Prep Screen

Status: not started
Plan ID: rewrite/boss-commitment-prep-screen
Implementation order: 22
Depends on: rewrite/encounter-engine, rewrite/operations-loop

## Scope

Implement the boss-reach decision surface before autonomous combat starts.

Owns:

- Boss prep presentation pattern.
- COMMIT and HOLD flow.
- Read-only speed order preview.
- Team swap behavior and edge cases.
- Combat power estimate.
- Operator hover/click detail hooks.

Does not own:

- Encounter simulation after COMMIT.
- Narrative event modal pattern.
- Regular raid withdraw behavior.

## Checklist

- [ ] Read [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Visual / UI Direction](../../product/ui-direction.md)
- [ ] Choose the prep-screen presentation pattern without using old narrative modal style.
- [ ] Implement boss card, tags, HP, speed, and reveal-quality inputs.
- [ ] Implement current team display and read-only turn order preview.
- [ ] Implement team swap selection across idle and active teams.
- [ ] Decide and document what happens to a mid-raid team pulled into boss prep.
- [ ] Implement combat power estimate with qualitative and hover numeric readout.
- [ ] Wire COMMIT to encounter start and HOLD to safe retreat from boss room.
- [ ] Add tests for COMMIT, HOLD, team swap, and estimate categories.

## Acceptance Criteria

- [ ] This is the only strategic player input before boss combat.
- [ ] HOLD carries no death risk and leaves the contract open.
- [ ] COMMIT starts autonomous combat.
- [ ] The screen does not become a legacy narrative modal.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks boss flow edge cases and UI pattern compliance.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
