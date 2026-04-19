# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Current State

The Porter's-era work is complete and folded back into the roadmap. The skyscraper HQ baseline, the first C-rank endgame-entry band, the four-step skyscraper floor expansion arc (Nightlife, Specialist Training, Executive, Penthouse), and the Executive Floor institutional-pressure slice are all shipped and folded back into the roadmap.

There are two active checked-in plans right now:

- [Porter's Room Asset Remediation](./porters-room-asset-remediation.md) — concrete Porter's room-package cleanup for missing roots, scenes, shell, structure, and viewer/runtime parity
- [Skyscraper HQ Asset Foundation](./skyscraper-hq-asset-foundation.md) — prerequisite work for the tower package: scene-builder support, shell sizing, and elevation-band definition before room-scene production

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Next Planning Trigger

Check in a new plan only when a concrete execution slice is ready to start beyond the current skyscraper stack, for example:

- a specific HQ backdrop-package cleanup tied to skyscraper elevation-band reuse
- a concrete B-rank or A-rank content packet after the C-rank bridge is stable
- a later narrow AI content-breadth pass on top of the shipped optional runtime layer

Do not add another broad umbrella plan when a narrower active execution slice is enough.

## Sequencing Notes

- Phase 4 midgame breadth is shipped and should now be treated as the baseline under test, not as an open-ended content queue.
- The retired midgame remediation pass was verification-first work: browser depth, readability fixes, and balance-table tuning rather than new mechanics or broad new content.
- Use browser automation as the primary fast regression surface for the canonical Porter's loop.
- Use deterministic reports and focused harnesses where browser coverage is too coarse to prove economy or reward-envelope stability.
- Treat the skyscraper as the final headquarters. Later planning should deepen that building's floor expansion, rank ladder, and pressure loops rather than introduce a fourth HQ.
