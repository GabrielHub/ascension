# Ascension

Ascension is a web-first management sim about running a dungeon-clearing guild in near-future New York City. The gameplay runtime, ECS simulation, rendering, UI intents, and save codec remain web-owned; the shipped playtest host is a Windows Tauri desktop app.

## What This README Is For

This file is the top-level project guide:

- what the project is
- how to run and verify it
- which commands are standard
- where to look next in the codebase and docs

Implementation detail, roadmap depth, world canon, and repo-specific workflow rules live in code, tests, `docs/`, `AGENTS.md`, and `CLAUDE.md`.

## Stack

- `Vite+`
- React 19 + TypeScript
- React Router 7 for shell routing
- `bitECS` for mutable gameplay state
- IndexedDB via `idb` for browser-mode saves
- Tauri 2 for the Windows desktop host
- Tailwind CSS 4 for styling
- Vitest for unit and browser-surface tests
- Playwright for browser regression coverage
- WebdriverIO + `tauri-driver` harness code for desktop integration validation

## Development

Standard web workflows use `vp`:

```bash
vp install
vp dev
vp check
vp test
vp build
vp preview
```

Use `vp dev` for ordinary gameplay and UI iteration. Browser mode remains the fastest development surface and keeps browser-backed saves for day-to-day work.
In dev builds, the backtick key opens the in-game dev command console; use it for runtime-safe browser test setup instead of ad hoc browser-console mutation.

Desktop-host workflows are separate because there is no `vp` equivalent for them:

```bash
pnpm tauri:dev
pnpm test:tauri
pnpm tauri:build
pnpm mcp:tauri-test
```

Use those only when the change touches the Tauri host, file-backed saves, desktop import/export, packaging, or installed-app behavior.

## Project Shape

- `app/` React Router shell, UI, browser/desktop wiring, and app-facing features
- `sim/` ECS components, systems, commands, runtime assembly, and gameplay authority
- `content/` authored templates, bootstrap data, requirements, effects, and generated content manifests
- `render/` world rendering, camera logic, SVG helpers, and presentation-side rendering support
- `save/` save types, codec, migration, and browser/desktop storage backends
- `lib/` shared runtime contracts and helpers consumed across sim, save, render, and UI
- `src-tauri/` Windows desktop host and packaging config
- `playwright/` browser automation artifacts and tests
- `tauri-test/` desktop automation harness and artifacts
- `docs/` roadmap, future-facing product docs, world canon, and active execution plans

## Documentation

- [Documentation Index](./docs/index.md)
- [Roadmap](./docs/roadmap.md)
- [Product Plan](./docs/product-plan.md)
- [World Foundation](./docs/world-foundation.md)
- [Plans Index](./docs/plans/index.md)

## Notes

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- The web engine remains authoritative; Tauri is a thin desktop host.
- Browser automation is the primary fast regression loop for gameplay and UI work.
- Desktop save files are normalized JSON, written atomically with backup recovery.
