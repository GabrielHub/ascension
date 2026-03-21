# Ascension Plans Index

These docs turn roadmap phases into execution plans that AI agents can follow without improvising architecture.

## Active Phase Plans

- [Phase 1 Manager Plan](./phase-1-bodega-manager.md)
- [Phase 1 Contract Lock](./phase-1-bodega-contract-lock.md)
- [Phase 1 Runtime and Content](./phase-1-bodega-runtime.md)
- [Phase 1 Save and Outcomes](./phase-1-bodega-save.md)
- [Phase 1 Design](./phase-1-bodega-design.md)

## Planning Conventions

- [Planning Conventions](./planning-conventions.md)

## How To Use These Plans

- Treat these as execution docs, not vision docs.
- Start from the relevant roadmap phase, then use the matching plan here.
- Complete manual prerequisites before agent-driven implementation starts.
- Keep these plans aligned with the core docs whenever the architecture changes.
- Completed phase plans should be removed once their exit criteria are verified. Use the roadmap and git history for historical context.

## Agent Execution Notes

This section is for agents working directly from the plans folder. It is planning-layer guidance, not general repo guidance.

- Use the manager plan as the orchestration source when a phase is split across multiple agents or workstreams.
- Do not start broad parallel implementation until the required contracts are locked.
- Lock first:
  - component names
  - template ids
  - save fields
  - command names
  - validation expectations
- Keep gameplay ownership boundaries intact while implementing plan tasks:
  - ECS owns mutable gameplay state
  - templates own static gameplay configuration
  - UI owns presentation and intents only
  - save code serializes and migrates state, but does not invent gameplay outcomes
- Prefer narrow file ownership when splitting work across agents.
- UI, SVG, styling, canvas readability, user-facing writing, copy, narrative phrasing, and other design-led work should be assigned to design agents when practical.
- Before real SVG asset production starts for a category, run a temporary-route style exploration with multiple variations and lock the chosen visual language first.
- If a task mixes design and code and cannot be cleanly separated, keep it with the design-oriented workstream rather than splitting ownership badly.
- Review agents are allowed when a workstream has little safe parallel implementation left or is blocked on another track.
- Review agents must not be launched into files that still have an active implementation owner.
- Use review agents by locked surface, not as broad repo-wide sweepers.
- Review agents should focus on regressions, ownership leaks, code smell, validation gaps, and bounded optimizations within the assigned workstream.
- A review agent may either:
  - produce findings for the manager or implementation owner to address, or
  - land narrow fixes inside an explicitly released file lock
- Do not let review work create a second broad editing wave across the same files.
