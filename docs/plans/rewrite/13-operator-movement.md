# 13. Operator Movement

Status: not started
Plan ID: rewrite/operator-movement
Implementation order: 13
Depends on: rewrite/floor-model, rewrite/rooms-catalog, rewrite/hq-environment-index

## Scope

Implement chibi token occupancy and room-to-room visual movement inside the skyscraper HQ.

Owns:

- Room occupancy derivation.
- Chibi idle movement inside room footprints.
- Visual room transitions.
- Floor traversal presentation.
- Unique-operator room visibility restrictions.

Does not own:

- Operator gameplay state beyond reading authoritative room/need/activity state.
- Pathfinding through corridors.
- Room footprint data owned by `rewrite/hq-environment-index`.
- Chibi asset composition owned by asset plans.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Rooms Catalog](../../product/rooms-catalog.md), [Operators And Staff](../../world/operators-and-staff.md)
- [ ] Define how systems determine an operator's current room intent from activity, injury, recruitment, training, staging, recovery, and unique state.
- [ ] Implement idle movement constrained to each room's walkable footprint.
- [ ] Implement simple room transition presentation when an operator changes room or floor.
- [ ] Enforce unique-operator visibility: Unique Operator room, Unique Weapon room, and Penthouse only.
- [ ] Make visitor chibis clickable for recruitment and roster chibis clickable for operator detail.
- [ ] Add tests for room intent derivation and unique visibility restrictions.

## Acceptance Criteria

- [ ] No pathfinding system is introduced.
- [ ] Movement reads authoritative sim state and does not become gameplay authority.
- [ ] Chibis stay inside room footprints.
- [ ] Unique operators never visually wander into regular rooms.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks movement authority boundaries and unique behavior.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
