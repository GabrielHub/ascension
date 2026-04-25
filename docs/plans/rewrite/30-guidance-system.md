# 30. Guidance System

Status: not started
Plan ID: rewrite/guidance-system
Implementation order: 30
Depends on: rewrite/rooms-catalog, rewrite/operations-loop

## Scope

Implement the persistent guidance and rewarded tutorial system.

Owns:

- Always-on guide card.
- Blocking tutorial mode for required opening steps.
- Room pointer indicator.
- Guide event registry and completion detectors.
- Reward grants.
- Full authored guide sequence through the Unique-tier taper.

Does not own:

- Unique operator content goals except as referenced by `rewrite/unique-unlock-goals`.
- Economy final tuning beyond guide reward hooks.
- Narrative event random cadence.

## Checklist

- [ ] Read [Guide Event Requirements](../../product/guide-events.md), [Floors Catalog](../../product/floors-catalog.md), [Rooms Catalog](../../product/rooms-catalog.md)
- [ ] Implement guide event schema and validation.
- [ ] Implement persistent and blocking presentation modes.
- [ ] Implement room pointer indicator for blocking steps.
- [ ] Author the five locked mandatory opening beats.
- [ ] Implement completion detectors from typed simulation events.
- [ ] Implement reward grants through authoritative systems.
- [ ] Author the post-opening guide sequence and choose the mid-to-late grind transition point.
- [ ] Add tests for opening flow, already-satisfied conditions, save reload, rewards, and no consecutive same-type steps.

## Acceptance Criteria

- [ ] The first raid is unloseable and teaches COMMIT.
- [ ] Guide rewards fund the next required spend until the chosen transition point.
- [ ] The guide runs on every new campaign, even after prior completion.
- [ ] UI does not grant rewards directly.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks guide sequence, reward authority, and pacing assumptions.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
