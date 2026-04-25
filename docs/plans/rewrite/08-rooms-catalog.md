# 08. Rooms Catalog

Status: not started
Plan ID: rewrite/rooms-catalog
Implementation order: 08
Depends on: rewrite/floor-model

## Scope

Define and implement the authoritative room registry for the one-building HQ.

Owns:

- Room IDs, owning floor, feature ownership, click behavior, tier count, and tier gates.
- One-feature-per-room discipline.
- Room status tracking for built, locked, and tier level.
- Validation against the floor model.

Does not own:

- Detailed feature implementation for recruitment, operations, market, medical, etc.
- Room backdrop asset creation.
- Panel-stack implementation.

## Checklist

- [ ] Read [Rooms Catalog](../../product/rooms-catalog.md), [Floors Catalog](../../product/floors-catalog.md), [Room Themes](../../product/room-themes.md)
- [ ] Create room registry data for all 18 authored rooms.
- [ ] Implement tier metadata and prerequisites.
- [ ] Implement room build/unlock status in ECS-owned gameplay state.
- [ ] Add typed room intent events for click-to-panel consumers.
- [ ] Add validation for duplicate room IDs, missing floor references, illegal empty floors, and invalid tier gates.
- [ ] Add tests for day-1 rooms, mandatory opening floor sequence, and Progression-Tier-gated tiers.

## Acceptance Criteria

- [ ] Every room is owned by exactly one floor.
- [ ] Every room owns exactly one feature surface.
- [ ] Room tier upgrades never create incremental sub-upgrades.
- [ ] UI can consume room data without owning gameplay state.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks room registry against product catalog and scope boundaries.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
