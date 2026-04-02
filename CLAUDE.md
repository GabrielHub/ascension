# CLAUDE.md

Repo-specific correctional guidance only. Assume normal engineering competence.

## Agent Autonomy

- Challenge requests you believe are wrong, suboptimal, or improvable — offer alternatives before executing
- Think before acting: read the relevant code, understand context, and form a plan before making changes
- The user is not always right — pushback grounded in evidence or engineering judgment is expected

## Coding Discipline

- Read code before modifying it — do not propose changes to files you have not read
- Do not add features, refactor, or make improvements beyond what was asked
- Do not create helpers, utilities, or abstractions for one-time operations — prefer inline simplicity
- Do not add error handling or validation for scenarios that cannot occur — validate only at system boundaries
- Do not add backwards-compatibility shims, re-exports, or placeholder comments for removed code
- Prefer editing existing files over creating new ones
- Do not introduce security vulnerabilities (command injection, XSS, SQL injection, etc.)

## Toolchain

- Use `Vite+`.
- Prefer `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, and `vp preview` for standard web workflows.
- Do not assume standard Vite-only workflows unless explicitly documented.
- Use package scripts only when there is no `vp` equivalent, such as `pnpm tauri:dev`, `pnpm tauri:build`, `pnpm test:tauri`, and `pnpm mcp:tauri-test`.

## Architecture

- ECS owns authoritative mutable gameplay state.
- Templates own static gameplay definitions.
- Systems own gameplay consequences.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code owns serialization and migration, not gameplay repair.
- Render and SVG code must not become alternate rule engines.

## Content Generation

- Consult `docs/world/` before generating any content: design, visual assets, copy, narrative, SFX, or naming
- The world foundation is the canonical tone and content reference for all authored material
- The product plan owns mechanics and systems; `docs/world/` owns what things look, sound, read, and feel like

## Documentation Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Do not write docs that duplicate behavior already explained by the implementation.
- Keep `docs/` for roadmap, future-facing questions, and research only.
- Keep repo workflow rules in `AGENTS.md` and `CLAUDE.md`.

## Room Scene SVG Rules

- HQ room interiors use pre-composed scene SVGs containing props only (furniture, fixtures, decorations)
- Scene SVGs must never include walls, floors, tile grids, or structural elements — those are engine-rendered
- All props inside scene SVGs must be isometric — flat camera-facing rectangles are never valid
- Reference fixtures (full room with walls/floors) are exploration/preview artifacts only, not production output
- See `docs/product/asset-production.md` HQ Isometric Contract for the full production pipeline

## Forbidden Mistakes

- gameplay logic in React components
- direct UI-owned gameplay mutation
- router-owned gameplay state
- named-content branches without documentation
- treat scaffold defaults or stale docs as stronger than code-level contracts
- `as any`
- walls, floors, or structural elements inside room scene SVGs
- flat camera-facing props (non-isometric rectangles) in any HQ asset
- font sizes below `text-xs` (0.75rem / 12px)

## UI Rule

- Always use the `/frontend-design` skill when creating or heavily refactoring UI components or screens
- Preserve and extend the established visual language already present in `app/ui`, `app/app.css`, and the shipped SVG assets
- Minimum font size is `text-xs` (0.75rem / 12px) — never use arbitrary values below this (`text-[0.6875rem]`, `text-[0.625rem]`, etc.)
- Use `text-xs` for labels, badges, and secondary metadata; use `text-sm` or larger for body text and descriptions

## Verification

- Do not present code changes as complete without running `vp check`
- Also run `vp test` and `vp build` when the change affects behavior or integration
- Fix failing checks instead of dismissing them as unrelated

## Workflow

- Do not autonomously continue into extra cleanup or follow-up tasks after completing the asked work
- If the user points to a likely cause for a bug, investigate that first
- Keep commits atomic when asked to prepare commits

## Host Split

- Ascension is a web-first game engine with a Windows Tauri desktop host
- Browser mode remains the primary fast development surface
- Browser mode keeps browser-backed saves for development work
- Tauri desktop mode uses file-backed saves for playtesting and integration validation
- Do not move gameplay authority into Rust or the Tauri shell
- Use the host that actually owns the behavior you are validating

## Playwright

- Browser automation is the primary fast regression surface for gameplay and UI work
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

## Tauri Automation

- Use Tauri automation for desktop-host validation, file-backed saves, import/export, packaging, and installer behavior
- Desktop automation artifacts live under `tauri-test/`
- Put screenshots in `tauri-test/screenshots/`
- Put logs in `tauri-test/logs/`
- Put traces and other artifacts in `tauri-test/artifacts/`
- Prefer the checked-in `tauri-test/` harness and `pnpm mcp:tauri-test` server over separate one-off desktop drivers; there is no `vp` equivalent for that desktop harness

## References

- `docs/index.md`
- `docs/roadmap.md`
- `docs/product-plan.md`
- `docs/product/index.md`
- `docs/world-foundation.md`
- `docs/world/index.md`
- `docs/plans/index.md`
- `README.md`
