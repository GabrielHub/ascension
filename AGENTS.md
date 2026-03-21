# AGENTS.md

Repo-specific correctional guidance only. Assume normal engineering competence.

## Toolchain

- Use `Vite+` entry points, not plain Vite defaults.
- Prefer `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`.
- Prefer `vp` package workflows over raw package-manager commands unless there is a concrete reason not to.

## Architecture

- ECS owns mutable gameplay state.
- Templates own static gameplay configuration.
- Systems own gameplay behavior.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code serializes and migrates state, but does not invent gameplay outcomes.
- Rendering and SVG code must not become hidden gameplay engines.

## Do Not

- put gameplay rules in React components
- mutate gameplay state directly from UI
- make the router a gameplay-state owner
- add named-content branches unless documented
- treat scaffold defaults as stronger than project docs
- add architecture without updating docs
- use `as any`

## Current Phase

- Current phase: Phase 1 bodega vertical slice
- Build toward the first playable bodega loop, not a generic prototype

## Verification

- If you change code, run `vp check` before calling the work complete
- Run `vp test` and `vp build` when the change touches runtime behavior, saved data, or app integration
- Do not hand-wave lint, type, or test failures as unrelated

## Workflow

- Do not autonomously launch follow-up tasks after finishing the requested work
- Keep commits atomic when asked to prepare commits

## Deeper Detail

- `docs/architecture-rules.md`
- `docs/technical-architecture.md`
- `docs/technical-ecs-and-systems.md`
- `docs/technical-rendering-and-assets.md`
- `docs/technical-save-and-data.md`
- `docs/product-plan.md`
- `docs/style-guide.md`
- `docs/plans/index.md`
