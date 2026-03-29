# Plans Index

This folder is reserved for active execution plans only. These plans should be implementable by agents without inventing new canon or re-deciding sequencing that already belongs to the roadmap.

## Shared Execution Contract

Before working any plan:

- Read `docs/roadmap.md`, the relevant product docs, and the relevant world docs.
- Keep gameplay authority in ECS, templates, and systems.
- Keep UI responsible for presentation and typed intents only.
- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.

## Active Plans In Implementation Order

Completed execution passes are folded back into the roadmap and product docs instead of staying checked in here as active plan work. Some completed reference docs may remain in this folder because shipped tools or later specs still point at them, but they are not active implementation plans.

1. [Narrative Character System Plan](./narrative-character-system-plan.md)
   Add authored presenter characters to interruption-backed guidance, incidents, and briefings, starting with the bodega assistant and then Porter's-specific presenters.
2. [Bodega Closure Plan](./bodega-closure-plan.md)
   Finish the remaining bodega closeout work now that relocation and Porter's core implementation are shipped.
   - Active spec: [Bodega Closure Phases 4-5 Spec](./bodega-closure-phases-4-5-spec.md) — remaining breadth-review targets plus the relocation and promotion-verification contract.
3. [Audio Remediation Plan](./audio-remediation-plan.md)
   Expand audio once the player-facing state model is stable enough to score cleanly.
4. [AI Content Layer Plan](./ai-content-layer-plan.md)
   Add optional generative variety only after the deterministic base game is accepted.

## Shipped Core Plan References

These docs remain useful as locked reference for implemented work, but they are no longer the next execution target.

- [Porter's Entry Plan](./porters-entry-plan.md)
  Core Porter's implementation is shipped. Remaining follow-through now lives in the presenter plan and the bodega promotion-verification pass.

## Sequencing Notes

- `bodega-closure` now starts from a shipped opening path, shipped policy surfaces, a shipped balance harness, a shipped relocation contract, and a shipped Porter's runtime target.
- `narrative-character-system` is the next active plan. It is the finishing-touch narrative pass for the bodega and the prerequisite for Porter's-specific presenters.
- `porters-entry` is now reference material for the shipped second-headquarters slice; future Porter's-specific narrative follow-through should reuse the presenter system where building-specific incidents benefit from named faces.
- `audio-remediation` depends on stable state naming and stable boss-flow hooks.
- `ai-content-layer` is intentionally last.
