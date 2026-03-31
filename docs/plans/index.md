# Plans Index

This folder is reserved for active execution plans only. Completed work should be folded back into the roadmap, product docs, and world docs instead of remaining here as reference-only plan files.

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Active Plans In Implementation Order

1. [Audio Remediation Plan](./audio-remediation-plan.md)
   Expand audio once the player-facing state model is stable enough to score cleanly.
2. [AI Content Layer Plan](./ai-content-layer-plan.md)
   Add optional generative variety only after the deterministic base game is accepted.

## Sequencing Notes

- the narrative presenter system is shipped and no longer belongs in the active plans queue
- `bodega-closure` is complete and archived under `docs/research/shipped-plans/`; its shipped status now lives in code, tests, and the roadmap instead of this queue.
- the HQ unified static-scene system is shipped; future HQ asset production and the scene builder must reuse that runtime contract instead of adding alternate placement paths
- `audio-remediation` depends on stable state naming and stable boss-flow hooks.
- `ai-content-layer` is intentionally last.
