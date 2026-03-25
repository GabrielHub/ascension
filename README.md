# Ascension

Ascension is a web-first management sim about running a dungeon-clearing guild in near-future New York City. The shipped playtest host is now a Windows Tauri desktop app, while the gameplay runtime, ECS simulation, rendering, UI intents, and save codec remain web-owned.

## Current Posture

- Browser mode remains the fastest development surface through `vp dev`.
- Browser mode keeps browser-backed save slots for day-to-day feature work.
- The Tauri desktop host uses file-backed JSON saves under app-local storage for playtesting.
- Save validation, migration, and compatibility still flow through the shared `PersistedSaveGame` codec.
- Browser automation remains the primary fast regression loop for gameplay and UI work.
- Tauri desktop automation covers desktop host behavior, file saves, import/export, and installer-facing integration.

## Stack

- `Vite+`
- React 19 + TypeScript
- React Router 7 for shell routing
- `bitECS` for mutable gameplay state
- IndexedDB via `idb` for browser-mode saves
- Tauri 2 for the Windows desktop host
- Tailwind CSS 4 for styling
- Vitest for unit and browser-surface tests
- WebdriverIO + `tauri-driver` harness code for desktop integration validation

## Workflows

Preferred commands:

```bash
vp install
vp dev
pnpm tauri:dev
vp check
vp test
pnpm test:tauri
vp build
pnpm tauri:build
pnpm mcp:tauri-test
```

Use `vp dev` for ordinary gameplay and UI iteration. Use `pnpm tauri:dev` when the change touches the desktop host, file-backed saves, import/export, or installed-app behavior.

## Repo Map

- `app/` React Router entry points, UI, desktop bridge wiring, and app-facing feature hooks
- `content/` authored templates, requirements, effects, and bootstrap data
- `sim/` ECS components, commands, systems, and runtime assembly
- `render/` world rendering, camera logic, and SVG/world presentation helpers
- `save/` snapshot codec, types, browser and desktop storage backends, and migration logic
- `src-tauri/` Tauri desktop host, native save bridge commands, and Windows packaging config
- `playwright/` browser automation screenshots, logs, and artifacts
- `tauri-test/` desktop automation harness, MCP wrapper, screenshots, logs, and artifacts
- `public/data/` environment, portrait, and other runtime-loaded asset data
- `docs/` roadmap, product-plan, world-foundation, and execution-plan references

## Documentation

- [Documentation Index](./docs/index.md)
- [Roadmap](./docs/roadmap.md)
- [Product Plan](./docs/product-plan.md)
- [World Foundation](./docs/world-foundation.md)
- [Plans Index](./docs/plans/index.md)

## Notes

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- The web engine remains authoritative; Tauri is a thin desktop host.
- Desktop save files are normalized JSON, written atomically with backup recovery.
