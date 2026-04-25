# 07. Floor Model

Status: not started
Plan ID: rewrite/floor-model
Implementation order: 07
Depends on: none

## Scope

Define and implement the single-building floor stack and Progression-Tier backbone.

Owns:

- Stable floor IDs.
- Floor prerequisites and purchase rules.
- Day-1 visible floors.
- Progression-Tier level gates and operator cap ramp.
- Floor insertion rule for future floors.

Does not own:

- Room feature behavior beyond floor placement and unlocks.
- Economy final numbers.
- Rendering placement metadata.

## Checklist

- [ ] Read [Floors Catalog](../../product/floors-catalog.md), [Rooms Catalog](../../product/rooms-catalog.md)
- [ ] Create floor template/data shape using stable IDs, not numeric authority.
- [ ] Implement day-1 state with Foundations and Recruitment available.
- [ ] Implement Progression-Tier levels T1 through T6 and the roster cap ramp `3, 6, 9, 12, 15, 18`.
- [ ] Implement floor purchase prerequisites from the floor catalog.
- [ ] Add validation for empty floors and invalid prerequisite references.
- [ ] Add tests for floor insertion behavior and prerequisite gating.

## Acceptance Criteria

- [ ] Floor numbers are presentation labels only.
- [ ] No bodega, Porter's, relocation arc, or multi-HQ state exists.
- [ ] Progression-Tier gates rank-band access without duplicating room-tier logic.
- [ ] Floor validation fails on empty floors and broken dependencies.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks floor behavior against product docs and the dropped multi-HQ rule.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
