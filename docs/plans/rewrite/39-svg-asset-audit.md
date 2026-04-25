# 39. SVG Asset Audit

Status: not started
Plan ID: rewrite/svg-asset-audit
Implementation order: 39
Depends on: none

## Scope

Audit current SVG assets for reuse in the new repo.

Owns:

- Keep/drop list for SVG asset catalog.
- Chibi token/parts reuse decision.
- Boss SVG drop decision confirmation.
- Operator portrait construction dependencies.

Does not own:

- Authoring new SVG bosses.
- Migrating room SVG scenes.
- Runtime rendering implementation.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Operator Rank Requirements](../../product/operator-ranks.md)
- [ ] Inspect current `content/data/svg-asset-catalog.json` and referenced public assets.
- [ ] Identify assets required for chibi token composition and operator portrait construction.
- [ ] Identify SVG room scenes and boss assets that must not copy forward.
- [ ] Produce keep/drop table with reason for each family.
- [ ] Add migration notes for the kept chibi/portrait families.

## Acceptance Criteria

- [ ] Chibi tokens can still be composed from approved kept parts.
- [ ] Existing boss SVGs are not marked as active new-game boss content.
- [ ] Existing room SVG scenes are not marked as active room backdrops.
- [ ] The audit gives asset migration agents exact file families to copy or leave behind.

## Review Gate

- [ ] Set status to `waiting review` after the audit.
- [ ] Reviewer checks keep/drop decisions against asset pipeline and dropped-feature list.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
