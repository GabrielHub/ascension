# 02. World Doc Rewrite

Status: not started
Plan ID: rewrite/world-doc-rewrite
Implementation order: 02
Depends on: rewrite/master-plan

## Scope

Ensure `docs/world/` contains only the new game's tone, voice, lore, naming, and content-feel canon.

Owns:

- Premise and tone cleanup for one skyscraper HQ.
- Attunement and rank canon.
- Guild and dungeon world rules.
- Operator, staff, and presenter voice canon.
- Copy and naming boundaries.

Does not own:

- Room lists, weapon tables, dungeon rosters, or other product content tables.
- Implementation steps or code behavior.
- Old Ascension bodega, Porter's, districts, factions, public pressure, or Tauri references.

## Checklist

- [ ] Review every file in `docs/world/` against this plan's scope and the active product docs.
- [ ] Remove or rewrite old-HQ canon, relocation arcs, public/civic pressure, and dropped-system assumptions.
- [ ] Keep world docs focused on how the game should read and feel.
- [ ] Move any enumerated content into `docs/product/` or link to the product doc that owns it.
- [ ] Check presenter voice canon against [Presenters Catalog](../../product/presenters-catalog.md).
- [ ] Record any contradiction that requires human decision instead of silently resolving it.

## Acceptance Criteria

- [ ] World docs can be read without implying the old Ascension campaign still exists.
- [ ] No world doc owns product tables or implementation sequence.
- [ ] World docs describe the comedy-tragedy tone and player-as-management premise clearly.
- [ ] Cross-links to product docs are valid.

## Review Gate

- [ ] Set status to `waiting review` after cleanup.
- [ ] Reviewer checks for stale Ascension canon and product/world ownership drift.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
