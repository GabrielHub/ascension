# Ascension

Ascension is a web-first management sim about running a dungeon-clearing guild in near-future New York City. The gameplay runtime, ECS simulation, rendering, UI intents, and save codec remain web-owned; the shipped playtest host is a Windows Tauri desktop app.

## Status Snapshot

- The current shipped baseline covers the full bodega arc, relocation into Porter's, multi-floor HQ support, onboarding, runtime-owned incidents and encounter handoff, browser and desktop save hosts, and optional local-first AI generation.
- The AI content layer is not an active bring-up plan anymore. The shipped baseline already includes localhost transport, settings, browser and desktop adapters, runtime request tracking, dev-console commands, and two live surfaces: `incident-framing` and `operator-identity`.
- Phase 4 midgame breadth is complete: contract lock, city pressure, Porter's content remediation, durable crafting, social/incident fallout, and encounter expansion are all shipped.
- Midgame remediation is complete: the shipped Porter's-era baseline now has stronger browser coverage, deterministic D-rank economy reporting, tuned workshop economics, and the verified UX fixes needed by that loop.
- The skyscraper HQ baseline, first C-rank endgame-entry band, floor expansion arc, and Executive Floor institutional-pressure slice are all shipped. Next candidate slices are the remaining Executive-stage consequence wiring (Nightlife recruitment, Specialist Training role training, Penthouse A-rank recruitment) and, on top of shipped institutional pressure, the first B-rank content packet.

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

## Local AI Setup

Ascension's AI features are local-first. The current runtime contract is an OpenAI-compatible localhost endpoint, with `Ollama` as the primary supported runtime.

Current checked-in defaults:

- runtime: `ollama`
- base URL: `http://127.0.0.1:11434/v1`
- model: `gemma4:e4b`

If you have a high-end local GPU such as an RTX 5090, prefer `gemma4:26b` instead of the smaller checked-in default.

### 1. Install Ollama

Install Ollama for Windows from the official docs:

- [Ollama Windows Install](https://docs.ollama.com/windows)

Open a new PowerShell window and verify the CLI is available:

```powershell
ollama --version
```

### 2. Pull a model

Default low-friction model:

```powershell
ollama pull gemma4:e4b
```

Recommended on stronger hardware such as RTX 5090:

```powershell
ollama pull gemma4:26b
```

### 3. Smoke-test the model locally

You can run these commands from any directory; they do not need the repo root.

```powershell
ollama run gemma4:e4b
```

Or, if you are using the larger local model:

```powershell
ollama run gemma4:26b
```

The local API should also respond at:

- [http://127.0.0.1:11434](http://127.0.0.1:11434)

Optional API check:

```powershell
curl http://127.0.0.1:11434/v1/models
```

### 4. Start Ascension

Run the web app from the repo root:

```bash
vp dev
```

### 5. Configure AI in-game

Open `Settings` in the running app and set:

- runtime: `Ollama`
- base URL: `http://127.0.0.1:11434/v1`
- model: `gemma4:e4b` or `gemma4:26b`

Then:

- enable `AI generation`
- click `test connection`

### 6. Verify from the dev console

In dev builds, press the backtick key to open the in-game command console.

Useful AI commands:

```text
/ai status
/ai probe
/ai generate incident-framing
/ai generate operator-identity
/ai inspect
```

Current active generation surfaces:

- `incident-framing`
- `operator-identity`

`incident-framing` rewrites interruption copy on top of deterministic incident payloads.
`operator-identity` rewrites recruit identity packets on top of deterministic role, recipe, gear, and preference constraints.

The operator path is constrained by the shipped portrait source of truth:

- `content/data/operator-recipes.json`
- `content/data/operator-parts-index.json`

The model does not invent arbitrary portrait structure. It must return approved recipe ids, approved compatible gear ids, approved specialty tags, bounded preferences, and short persona text.

### 7. Troubleshooting

- If `ollama --version` fails, the install or PATH setup is incomplete.
- If `test connection` fails, confirm Ollama is still running and that the model tag in settings exactly matches the pulled model.
- If `curl http://127.0.0.1:11434/v1/models` fails, the local runtime is not reachable yet.
- If the browser blocks localhost requests, capture the exact error and treat that as an environment issue to fix before debugging app code.

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
- `docs/` roadmap, future-facing product docs, world canon, and any active execution plans

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
