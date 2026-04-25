# 05. Raid Backdrop Pipeline

Status: not started
Plan ID: rewrite/raid-backdrop-pipeline
Implementation order: 05
Depends on: rewrite/asset-pipeline

## Scope

Define how authored raid backdrop images are generated, stored, revealed, and validated.

Owns:

- Raid backdrop asset contract.
- Directory and manifest entries for dungeon backdrops.
- Reveal-mask assumptions for minimap playback.
- Production-time AI generation workflow for dungeon backdrops.
- Human review and background/masking handoff when needed.

Does not own:

- Dungeon content packets.
- Raid minimap UI implementation.
- Runtime AI image generation.
- Boss or enemy visual assets.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Image Generation Prompting Guide](../../product/image-generation-prompting-guide.md), [Dungeon Rank Requirements](../../product/dungeon-ranks.md)
- [ ] Define raid backdrop target dimensions, format, and naming convention.
- [ ] Add raid backdrop manifest entries keyed by dungeon ID.
- [ ] Define how minimap reveal masks paint or crop the backdrop into explored tile areas.
- [ ] Document production-time generation and human review steps.
- [ ] Add validation for missing backdrop assets and manifest/dungeon mismatches.
- [ ] Create one placeholder or approved seed backdrop to prove registry wiring.

## Acceptance Criteria

- [ ] Every authored dungeon can reference one raid backdrop.
- [ ] Backdrops are checked-in production assets, not runtime-generated images.
- [ ] Reveal requirements are clear enough for `rewrite/raid-minimap` to implement without inventing a second contract.
- [ ] The pipeline supports future per-dungeon asset plans in parallel.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks asset ownership and minimap handoff clarity.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
