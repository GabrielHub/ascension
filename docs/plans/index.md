# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Current State

The active checked-in execution queue is:

- `midgame-remediation-plan`

The completed Phase 4 contract-lock, city-pressure, content-remediation, crafting, social/incident, and encounter slices are already reflected in code and in the roadmap. They are no longer kept here as active plans.
The next ready plan to run is `midgame-remediation-plan`.

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Next Planning Trigger

Check in a new plan only when a concrete execution slice is ready to start, for example:

- HQ backdrop-package cleanup tied to a specific building or asset contract
- later-building baseline tied to a concrete third-headquarters implementation slice
- a later narrow AI content-breadth pass on top of the shipped optional runtime layer

Do not add another broad umbrella plan when a narrower active execution slice is enough.

## Active Order

Run the current remediation queue in this order:

1. `midgame-remediation-plan`

## Sequencing Notes

- Phase 4 midgame breadth is shipped and should now be treated as the baseline under test, not as an open-ended content queue.
- The active remediation pass should prefer verification depth, readability fixes, and balance-table tuning over adding new mechanics or broad new content.
- Use browser automation as the primary fast regression surface for the canonical Porter's loop.
- Use deterministic reports and focused harnesses where browser coverage is too coarse to prove economy or reward-envelope stability.
