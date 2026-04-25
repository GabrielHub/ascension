# 12. HQ Environment Index

Status: not started
Plan ID: rewrite/hq-environment-index
Implementation order: 12
Depends on: rewrite/asset-pipeline, rewrite/floor-model, rewrite/rooms-catalog

## Scope

Author the new repo's single-building HQ environment registry.

Owns:

- Single skyscraper building registry.
- Floor and room footprint metadata.
- Room backdrop placement metadata.
- Outdoor backdrop phase references.
- Walkable room footprints for chibi tokens.

Does not own:

- Multi-building compatibility.
- Old SVG room-scene placement contract.
- Chibi movement behavior.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Floors Catalog](../../product/floors-catalog.md), [Rooms Catalog](../../product/rooms-catalog.md)
- [ ] Design the single-building environment data shape.
- [ ] Encode floor stack and room footprints from product docs.
- [ ] Add room backdrop placement slots without requiring final assets.
- [ ] Add outdoor backdrop references for sunrise, day, sunset, and night.
- [ ] Add walkable room footprints for chibi idling.
- [ ] Validate registry references against floor, room, and asset registries.

## Acceptance Criteria

- [ ] Registry has no bodega, Porter's, relocation, or multi-building fields.
- [ ] Runtime rendering can consume registry data without inventing camera or footprint rules per room.
- [ ] Chibi movement receives room footprint data from this registry or derived room state.
- [ ] Validation fails on missing room/floor/asset references.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks environment data against asset pipeline and room/floor catalogs.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
