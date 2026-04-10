# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Current State

There are no active checked-in execution plans right now.

The former AI content layer bring-up plan has been removed because its settings, transport, runtime-session, and host-integration work are already shipped. Its current status now belongs in the roadmap, product docs, code, and tests rather than in `docs/plans/`.

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Next Planning Trigger

Check in a new plan only when a concrete execution slice is ready to start, for example:

- a bounded Phase 4 midgame-systems pass
- HQ backdrop-package cleanup tied to a specific building or asset contract
- a later narrow AI content-breadth pass on top of the shipped optional runtime layer

## Sequencing Notes

- the narrative presenter system is shipped and no longer belongs in the active plans queue
- `bodega-closure` is complete; its shipped status now lives in code, tests, and the roadmap instead of this queue.
- `bodega-early-game-balance-followup` is complete; its shipped status now lives in runtime code, deterministic reports, and Playwright coverage instead of this queue.
- the HQ unified static-scene system is shipped; future HQ asset production and the scene builder must reuse that runtime contract instead of adding alternate placement paths
- the state-owned audio contract is shipped; further audio changes should extend the existing shell/session/sim ownership model instead of reopening a broad remediation pass
- Porter's functional differentiation is complete; the design revision pass shipped copy, UI hierarchy, floor-zone badges, and building-aware room descriptions into runtime code, UI, and the roadmap
- `porters-design-revision-plan` is shipped; its copy and UI hierarchy changes now belong to runtime code, tests, and the roadmap instead of the active queue
- the Porter's training-readiness pass is shipped; the remaining Porter's queue now starts with contract prep and recovery/staging differentiation
- the Porter's contract-prep pass is shipped; Office and Briefing Room behavior now belongs to runtime code, UI, tests, and the roadmap instead of the active queue
- the Porter's recovery-and-waterfront pass is shipped; Infirmary, Break Room, Dock, and Deck differentiation now belongs to runtime code, UI, tests, and the roadmap instead of the active queue
- the Porter's upgrade-campaign pass is shipped; management guidance, deterministic harnesses, and browser regression coverage now exercise the canonical Kitchen Overhaul-through-Waterfront arc instead of leaving it mostly in template breadth
- the dev-menu command-console plan is shipped; future browser-testing work should extend the typed command registry instead of reopening button-sheet cheats
- the AI content layer bring-up pass is shipped; future AI work should be staged as narrow content-breadth or quality passes instead of reopening transport/settings/runtime scaffolding
