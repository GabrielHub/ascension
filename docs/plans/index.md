# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Current State

The active checked-in execution queue is now the remaining Phase 4 midgame plan set:

- `phase-4-midgame-manager-plan`
- `phase-4-midgame-encounter-plan`

The completed contract-lock, city-pressure, content-remediation, crafting, and social/incident slices are already reflected in code and in the roadmap. They remain checked in as concrete scope references for the remaining work, but they are no longer the active queue.
The next ready plan to start is `phase-4-midgame-encounter-plan`.

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
- a later narrow AI content-breadth pass on top of the shipped optional runtime layer

Do not add another broad Phase 4 plan doc unless the current ordered plan set is materially superseded.

## Active Order

Run the current midgame plans in this order:

1. `phase-4-midgame-encounter-plan`

Use `phase-4-midgame-manager-plan` to coordinate locks, merge order, and scope control across that queue.

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
- the Phase 4 contract-lock pass is shipped; districts, factions, city-pressure save state, craft-recipe contracts, workshop ids, and `rankTone` metadata now belong to code, tests, and the roadmap instead of the active queue
- the Phase 4 city-pressure pass is shipped; district/sponsor contract generation, city-pressure writeback, management summary surfaces, and dev-console controls now belong to code, tests, and the roadmap instead of the active queue
- the Phase 4 content-remediation pass is shipped; Porter's-era site, boss, recruit, item, event, and runtime-asset-parity breadth now belong to code, tests, and the roadmap instead of the active queue
- the Phase 4 crafting pass is shipped; craft-time cash sinks, workshop execution, recipe blockers, and the midgame economy ledger now belong to code, tests, and the roadmap instead of the active queue
- the Phase 4 social-and-incident pass is shipped; real incident consequence application, district/faction-bound incident breadth, social fallout writeback, and event-log/interruption presentation now belong to code, tests, and the roadmap instead of the active queue
