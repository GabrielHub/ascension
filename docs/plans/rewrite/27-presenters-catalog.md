# 27. Presenters Catalog

Status: not started
Plan ID: rewrite/presenters-catalog
Implementation order: 27
Depends on: rewrite/rooms-catalog

## Scope

Implement presenter data and room/domain binding.

Owns:

- Six presenter records.
- Presenter unlock rooms.
- Room-to-presenter matrix.
- Expression references.
- Fallback presenter rule.

Does not own:

- Presenter portrait generation.
- Narrative event implementation.
- Presenter domain redesign beyond catalog consistency.

## Checklist

- [ ] Read [Presenters Catalog](../../product/presenters-catalog.md), [Operators And Staff](../../world/operators-and-staff.md)
- [ ] Create presenter template schema and records.
- [ ] Bind presenter unlocks to their first associated rooms.
- [ ] Implement room-to-presenter lookup and Mara fallback.
- [ ] Validate expression asset references.
- [ ] Add tests for every room's presenter coverage and fallback behavior.

## Acceptance Criteria

- [ ] Every narrative or guide beat can resolve to exactly one presenter.
- [ ] Presenters are narrative/presentation anchors, not gameplay authority.
- [ ] No anonymous narrator is required for implemented event surfaces.
- [ ] Presenter records match world voice canon.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks room matrix and voice-canon alignment.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
