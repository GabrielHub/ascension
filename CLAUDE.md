# CLAUDE.md

Repo-specific correctional guidance only.

## Toolchain

- Use `Vite+`.
- Prefer `vp dev`, `vp check`, `vp test`, `vp build`.
- Do not assume standard Vite-only workflows unless explicitly documented.

## Architecture

- ECS owns authoritative mutable gameplay state.
- Templates own static gameplay definitions.
- Systems own gameplay consequences.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code owns serialization and migration, not gameplay repair.
- Render and SVG code must not become alternate rule engines.

## Forbidden Mistakes

- gameplay logic in React components
- direct UI-owned gameplay mutation
- router-owned gameplay state
- named-content branches without documentation
- architecture changes without doc updates
- `as any`

## Phase Target

- Current phase: Phase 1 bodega vertical slice
- Aim at the first playable bodega loop

## UI Rule

- Always use the `/frontend-design` skill when creating or heavily refactoring UI components or screens
- Always check `docs/style-guide.md` so UI work stays consistent with the project style guide

## Verification

- Do not present code changes as complete without running `vp check`
- Also run `vp test` and `vp build` when the change affects behavior or integration
- Fix failing checks instead of dismissing them as unrelated

## Workflow

- Do not autonomously continue into extra cleanup or follow-up tasks after completing the asked work
- If the user points to a likely cause for a bug, investigate that first

## References

- `docs/architecture-rules.md`
- `docs/technical-architecture.md`
- `docs/technical-ecs-and-systems.md`
- `docs/technical-rendering-and-assets.md`
- `docs/technical-save-and-data.md`
- `docs/product-plan.md`
- `docs/style-guide.md`
- `docs/plans/index.md`
