# 44. Unique Unlock Goals

Status: not started
Plan ID: rewrite/unique-unlock-goals
Implementation order: 44
Depends on: rewrite/unique-operators-catalog, rewrite/dungeons-catalog

## Scope

Implement and author the goal chains that unlock Unique operators and Unique weapons.

Owns:

- Goal schema.
- Progress tracking.
- Unique Operator room catalog states.
- Unique Weapon room catalog states.
- Guide-system integration for long-tail goals.

Does not own:

- Unique operator or weapon identity packets.
- Economy final tuning.
- Random recruitment.

## Checklist

- [ ] Read [Unique Operator Requirements](../../product/unique-operators.md), [Unique Weapon Requirements](../../product/unique-weapons.md), [Guide Event Requirements](../../product/guide-events.md), [Rooms Catalog](../../product/rooms-catalog.md#elite-recruitment-floor)
- [ ] Define goal predicate schema for dungeon defeat, currency threshold, room ownership, boss defeat, rival state, and other deterministic conditions.
- [ ] Implement progress tracking and save/load behavior.
- [ ] Implement Unique Operator room display states: hidden, locked, visible, complete, recruitable, recruited.
- [ ] Implement Unique Weapon room display states tied to paired operator recruitment.
- [ ] Connect guide long-tail objectives to unique goal progress without making the guide own the goals.
- [ ] Add tests for progress persistence, already-satisfied goals, recruit action unlock, and weapon unlock gating.

## Acceptance Criteria

- [ ] Unique unlocks are deterministic and inspectable.
- [ ] The player can pursue unique goals before every prerequisite is complete, but cannot deploy/recover uniques without Penthouse.
- [ ] Unique weapon goals cannot become actionable before the paired operator joins.
- [ ] Goal logic lives in systems/templates, not UI.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks goal ownership, save safety, and unique-room display states.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
