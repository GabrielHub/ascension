# 28. Presenter Domain Rework

Status: not started
Plan ID: rewrite/presenter-domain-rework
Implementation order: 28
Depends on: rewrite/rooms-catalog, rewrite/presenters-catalog

## Scope

Review and tighten presenter domain ownership after the room catalog is locked.

Owns:

- Rafi, Laura, and Vicente scope cleanup after the room and presenter catalogs are reviewed.
- Overlap rules for two-presenter candidate beats.
- Consistency between world canon and product presenter matrix.

Does not own:

- New presenter creation.
- Narrative event system implementation.
- Room feature design.

## Checklist

- [ ] Read [Operators And Staff](../../world/operators-and-staff.md), [Presenters Catalog](../../product/presenters-catalog.md), [Rooms Catalog](../../product/rooms-catalog.md)
- [ ] Audit every presenter domain against the final room catalog.
- [ ] Remove or rewrite kitchen/compliance/quartermaster wording that implies dropped or missing systems.
- [ ] Preserve presenter identity where the domain still has a valid room surface.
- [ ] Update product and world docs together so they do not drift.
- [ ] Add validation or tests that every event family has a valid presenter owner.

## Acceptance Criteria

- [ ] Rafi's people-care scope does not require a separate kitchen system.
- [ ] Laura's institutional scope does not reintroduce public/civic pressure as a system.
- [ ] Vicente's workshop scope stays weapons/gear-only and does not imply crafting.
- [ ] Presenter ownership is clear enough for AI-framed copy payloads.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks for domain contradictions and dropped-system leakage.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
