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

1. [Opening Campaign Remediation Plan](./opening-campaign-remediation-plan.md)
   Lock the canonical new-campaign path, seed envelope, and runtime-owned opening beats.
   - Phase 1 spec: [Opening Campaign Spec](./opening-campaign-spec.md) — starter envelope, 8-contract arc, 13 beats, acceptance criteria, gap analysis.
2. [Management Policy Surfaces Plan](./management-policy-surfaces-plan.md)
   Add the first standing management decisions on top of the locked opening path.
   - Phase 1 spec: [Management Policy Contract](./management-policy-contract.md) — 5 policy families, runtime shapes, defaults, effects, tradeoffs, owner systems.
3. [Economy And Balance Harness Plan](./economy-and-balance-harness-plan.md)
   Build the ledgers, direct simulation, and browser verification needed to tune the early campaign.
   - Phase 2 spec: [Economy Target Envelope](./economy-target-envelope.md) — 8 metrics with pass/fail thresholds, trajectory projections, out-of-band observations.
4. [Bodega Closure Plan](./bodega-closure-plan.md)
   Finish the bodega building arc, support rooms, roster pressure, relocation gate, and content breadth.
5. [Audio Remediation Plan](./audio-remediation-plan.md)
   Expand audio once the player-facing state model is stable enough to score cleanly.
6. [AI Content Layer Plan](./ai-content-layer-plan.md)
   Add optional generative variety only after the deterministic base game is accepted.

## Sequencing Notes

- `opening-campaign-remediation` is the root dependency for the current stack.
- `management-policy-surfaces` and the static ledger portion of `economy-and-balance-harness` can overlap.
- `bodega-closure` is an integration milestone, not a substitute for the earlier plans.
- `audio-remediation` depends on stable state naming and stable boss-flow hooks.
- `ai-content-layer` is intentionally last.
