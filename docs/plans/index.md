# Phase Plans Index

These plans are execution documents for future work. They are written for parallel agent execution with one manager agent owning orchestration, prompts, file locks, and merge order.

## Active Plan Set

- [Phase 1 Manager](./phase-1-bodega-world-manager.md)
- [Phase 1 Contract Lock](./phase-1-bodega-world-contract-lock.md)
- [Phase 1 HQ World And Assets](./phase-1-bodega-world-hq-assets.md)
- [Phase 1 Runtime And Camera](./phase-1-bodega-world-runtime-camera.md)
- [Phase 1 Raid World And Assets](./phase-1-bodega-world-raid-assets.md)
- [Phase 1 Audio And Playgrounds](./phase-1-bodega-world-audio-playgrounds.md)

## Plan Rules

- Code, tests, templates, and shipped assets remain the source of truth for implemented behavior.
- These plans exist to coordinate future implementation work, not to restate current code.
- One manager agent owns orchestration and gives the user the subagent prompts.
- Asset production must pass through human review in the SVG playground or audio playground before being locked into canonical asset locations.
- Review agents are expected throughout the phase, but only on surfaces whose implementation owner has finished or released the lock.
