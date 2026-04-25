# 37. Scene Builder

Status: not started
Plan ID: rewrite/scene-builder
Implementation order: 37
Depends on: rewrite/asset-pipeline, rewrite/hq-environment-index

## Scope

Build the room backdrop placement tool for the new raster-room HQ model.

Owns:

- Loading room backdrop images into room footprints.
- Scale and offset adjustment.
- Placement metadata save/export.
- Preview against floor and room registry data.

Does not own:

- Game-state preview.
- Chibi movement logic.
- SVG room-scene editing.
- Asset generation itself.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Room Themes](../../product/room-themes.md)
- [ ] Implement builder route/tool gated for development.
- [ ] Load floor, room, and placement data from the new environment registry.
- [ ] Load a raster backdrop into a selected room/tier.
- [ ] Support scale, offset, and fit adjustments inside the reserved footprint.
- [ ] Save/export placement metadata in the canonical registry format.
- [ ] Add validation for missing assets and invalid placement bounds.

## Acceptance Criteria

- [ ] Builder works with raster room backdrops, not old SVG scenes.
- [ ] Builder does not define gameplay room state.
- [ ] Placement metadata can be consumed by runtime rendering.
- [ ] At least one non-canonical room footprint can be previewed.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks registry compatibility and old-pipeline removal.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
