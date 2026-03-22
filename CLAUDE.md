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

## Documentation Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Do not write docs that duplicate behavior already explained by the implementation.
- Keep `docs/` for roadmap, future-facing questions, and research only.
- Keep repo workflow rules in `AGENTS.md` and `CLAUDE.md`.

## Forbidden Mistakes

- gameplay logic in React components
- direct UI-owned gameplay mutation
- router-owned gameplay state
- named-content branches without documentation
- `as any`

## Phase Target

- Current phase: Phase 1 bodega world rendering
- Finish the bodega slice visually before expanding or deepening it

## UI Rule

- Always use the `/frontend-design` skill when creating or heavily refactoring UI components or screens
- Preserve and extend the established visual language already present in `app/ui`, `app/app.css`, and the shipped SVG assets

## Verification

- Do not present code changes as complete without running `vp check`
- Also run `vp test` and `vp build` when the change affects behavior or integration
- Fix failing checks instead of dismissing them as unrelated

## Workflow

- Do not autonomously continue into extra cleanup or follow-up tasks after completing the asked work
- If the user points to a likely cause for a bug, investigate that first

## Playwright

- Assume any required dev server is already running when using Playwright
- If the required dev server is not running, stop and ask the user to start it
- Never start dev servers autonomously for Playwright work
- Treat Playwright as a single-owner shared resource by default
- Do not run concurrent Playwright sessions or parallel Playwright agents unless the user explicitly wants that coordination and the active owner releases the browser first
- Prefer the existing sandbox and dev menu entrypoints during browser testing when they help reach relevant game states faster
- Use the dev menu deliberately as a testing aid, not as an excuse to bypass the real user flow when the flow itself is what needs validation
- The dev menu (backtick key in-game, dev builds only) provides cheat actions; the sandbox is the non-persistent preview session
- Store Playwright artifacts under `playwright/`, not in the repo root
- Put screenshots in `playwright/screenshots/`
- Put logs and network captures in `playwright/logs/`
- Put traces or other browser artifacts in `playwright/artifacts/`
- If a Playwright tool accepts a filename, always target those folders explicitly

## References

- `docs/index.md`
- `docs/roadmap.md`
- `docs/product-plan.md`
- `docs/product/index.md`
- `docs/world-foundation.md`
- `docs/world/index.md`
- `docs/plans/index.md`
- `README.md`
