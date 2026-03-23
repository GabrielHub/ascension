# Ascension

Ascension is a local-first management sim about running a dungeon-clearing guild in near-future New York City. The current build focuses on a playable bodega-headquarters slice with ECS-driven simulation, browser saves, and world-first presentation.

## Current Status

The shipped slice includes:

- a start screen with new game, load, delete, preview, and tooling entry points
- IndexedDB-backed save slots with validation and schema migration
- a data-driven bodega HQ with rooms, upgrades, staff, visitors, inventory, and market systems
- autonomous operators, raid opportunities, recurring teams, morale and loyalty pressure, injuries, departures, and death
- a full-screen raid view, persistent event log, operator portraits, and authored SVG environment content

This repository is still preproduction-facing, but it is not a placeholder shell. The implementation already contains the main runtime, save, rendering, and content pipelines for the current phase.

## Stack

- `Vite+`
- React 19 + TypeScript
- React Router 7 for shell routing
- `bitECS` for mutable gameplay state
- IndexedDB via `idb` for local saves
- Tailwind CSS 4 for styling
- Vitest for tests

## Architecture

The repo follows a strict split of responsibilities:

- ECS owns mutable gameplay state
- templates own static gameplay configuration
- systems own gameplay behavior
- UI owns presentation and typed intents
- save code owns serialization, validation, and migration
- React Router owns app-shell navigation only

## Getting Started

Preferred workflow:

```bash
vp install
vp dev
vp check
vp test
vp build
```

`package.json` mirrors the same workflow through scripts, but repo conventions prefer `vp`.

## Repo Map

- `app/` React Router entry points, UI, and app-facing feature hooks
- `content/` authored templates, requirements, effects, and bootstrap data
- `sim/` ECS components, commands, systems, and runtime assembly
- `render/` world rendering, camera logic, and SVG/world presentation helpers
- `save/` snapshot codec, types, storage, and migration logic
- `public/data/` environment, portrait, and other runtime-loaded asset data
- `docs/` roadmap, product-plan, and world-foundation references

## Documentation

Use the docs for future-facing direction and reference, not as a duplicate of implementation details:

- [Documentation Index](./docs/index.md)
- [Roadmap](./docs/roadmap.md)
- [Product Plan](./docs/product-plan.md)
- [World Foundation](./docs/world-foundation.md)
- [Plans Index](./docs/plans/index.md)

## Notes

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Keep secrets in local environment files and out of version control.
