# 04. Asset Pipeline

Status: not started
Plan ID: rewrite/asset-pipeline
Implementation order: 04
Depends on: none

## Scope

Implement the asset-family contract for the new repo.

Owns:

- Runtime asset directory conventions under `public/data/`.
- Machine-readable asset registry or per-family manifests.
- Production workflow for room backdrops, outdoor backdrops, portraits, chibi tokens, bosses, weapons, unique assets, and raid backdrops.
- Manual background-removal handoff points.
- Shared unique glow effect decision.

Does not own:

- Individual room, weapon, dungeon, or unique asset production.
- Runtime image generation.
- Old SVG room-scene pipeline.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Image Generation Prompting Guide](../../product/image-generation-prompting-guide.md), and [Room Themes](../../product/room-themes.md).
- [ ] Create canonical asset directories in the new repo.
- [ ] Choose and document the machine-readable asset registry format.
- [ ] Implement registry validation for required fields and missing files.
- [ ] Define the shared unique glow effect in one reusable UI/asset primitive.
- [ ] Document which asset families require human background removal before check-in.
- [ ] Add asset smoke fixtures for one room backdrop, one portrait, one weapon, one boss, and one raid backdrop.

## Acceptance Criteria

- [ ] Runtime code reads asset paths from registry data, not hard-coded component paths.
- [ ] Validation catches missing files and unsupported asset-family values.
- [ ] The workflow distinguishes production-time AI assets from runtime local AI.
- [ ] No old room SVG scene contract is copied forward as the room-art source of truth.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer confirms asset registry and workflow match product docs.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
