# 03. Product Doc Cleanup

Status: not started
Plan ID: rewrite/product-doc-cleanup
Implementation order: 03
Depends on: rewrite/world-doc-rewrite

## Scope

Ensure `docs/product/` owns only new-game content tables, content requirements, asset contracts, and UI direction.

Owns:

- Product index cleanup.
- Content taxonomy and ID conventions.
- Room, floor, presenter, asset, UI, operator, weapon, dungeon, rival, event, guide, and effects requirements.
- Removal or rewrite of Ascension-only product docs.

Does not own:

- Runtime implementation.
- World voice canon.
- Completed-plan archive policy.

## Checklist

- [ ] Review every file in `docs/product/` against this plan's scope and the active world docs.
- [ ] Remove references that make old Ascension systems active requirements.
- [ ] Ensure each product doc states what it owns and what it does not own.
- [ ] Ensure product docs link to `docs/world/` for tone instead of restating lore.
- [ ] Ensure product docs link to active `rewrite/*` plans for implementation.
- [ ] Move deferred ideas to roadmap wording instead of actionable product requirements.

## Acceptance Criteria

- [ ] Product docs describe only Hazard-Pay initial scope or explicit roadmap.
- [ ] No active product doc requires Tauri, multi-HQ progression, crafting, outfits, accessories, public pressure, districts, factions, hunger, rank advancement, or mobile support.
- [ ] Product docs are agent-parseable and table-driven where content is enumerated.
- [ ] Cross-links to world docs and rewrite plans are valid.

## Review Gate

- [ ] Set status to `waiting review` after cleanup.
- [ ] Reviewer checks for stale active requirements and content ownership drift.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
