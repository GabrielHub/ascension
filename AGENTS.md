# AGENTS.md

Repo-specific correctional guidance only. Assume normal engineering competence.

## Toolchain

- Use `Vite+` entry points, not plain Vite defaults.
- Prefer `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`.
- Prefer `vp` workflows over raw package-manager commands unless there is a concrete reason not to.

## Architecture

- ECS owns mutable gameplay state.
- Templates own static gameplay configuration.
- Systems own gameplay behavior.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code serializes and migrates state, but does not invent gameplay outcomes.
- Rendering and SVG code must not become hidden gameplay engines.

## Documentation Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Do not add docs that restate behavior already made clear by the implementation.
- Keep `docs/` for roadmap, future-facing questions, and research only.
- Keep repo workflow rules in `AGENTS.md` and `CLAUDE.md`.

## Do Not

- put gameplay rules in React components
- mutate gameplay state directly from UI
- make the router a gameplay-state owner
- add named-content branches unless documented
- treat scaffold defaults or stale docs as stronger than code-level contracts
- use `as any`

## Current Phase

- Current phase: Phase 1 bodega world rendering
- Finish the bodega slice visually before expanding or deepening it

## Verification

- If you change code, run `vp check` before calling the work complete
- Run `vp test` and `vp build` when the change touches runtime behavior, saved data, or app integration
- Do not hand-wave lint, type, or test failures as unrelated

## Workflow

- Do not autonomously launch follow-up tasks after finishing the requested work
- Keep commits atomic when asked to prepare commits

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
