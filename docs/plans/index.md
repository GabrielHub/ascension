# Plans Index

This folder is reserved for Hazard-Pay rewrite implementation plans. The old Ascension/Porter's/skyscraper work queue is not active canon.

## Plan Sources

- [Numbered Rewrite Plans](./rewrite/index.md) — active implementation queue.
- [Plan Graveyard](./graveyard/index.md) — completed plans after review, kept out of the active context path.
- [Full Rewrite Source](../reference/fullrewrite-source.md) — decision archive only. Consult when active plans or product/world docs are ambiguous or contradictory.

## Required Plan Lifecycle

Every implementation plan uses exactly one status value at the top:

- `not started`
- `in progress`
- `waiting review`
- `completed`

Status discipline:

- A plan starts as `not started`.
- The implementing agent changes it to `in progress` before editing code, content, or assets.
- When the checklist and verification pass, the implementing agent changes it to `waiting review`.
- A separate review pass checks the plan against active product docs, world docs, code changes, tests, and the dropped-feature list.
- Only after review does the plan become `completed`.
- Completed plans move to `docs/plans/graveyard/` and are removed from the active queue.

There is no separate `blocked` status. If a plan cannot proceed, keep its current lifecycle status and record the blocker in the plan's blocker section.

## Shared Execution Contract

Before working any active plan:

- Read the plan's referenced product docs and world docs.
- Consult [Full Rewrite Source](../reference/fullrewrite-source.md) only if the numbered plan or active docs are ambiguous.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Do not reintroduce dropped Ascension systems: multi-HQ progression, Tauri, file-backed saves, districts/factions/public pressure, crafting, outfits, accessories, consumables, hunger, rank advancement, or mobile support.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, systems, templates, app integration, or user-facing workflows.
- For docs-only changes, review links and cross-doc references relevant to the edit.

## Review Rule

Do not mark a plan `completed` in the same pass that implemented it. Move through `waiting review`, then review. This is deliberately slower than ad hoc implementation because the rewrite is trying to prevent incorrect foundational code from blocking later parallel work.
