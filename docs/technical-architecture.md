# Ascension Technical Overview

This file is the technical entry point for the project. It should stay high-level and point to the more detailed technical documents.

## Technical Doc Map

- [ECS and Systems](./technical-ecs-and-systems.md)
- [Rendering and Assets](./technical-rendering-and-assets.md)
- [Save and Data Model](./technical-save-and-data.md)
- [Architecture Rules](./architecture-rules.md)

## Core Technical Stance

- This project is using `Vite+` as the intended toolchain, not plain standalone Vite.
- Do not default to standard Vite-only workflow assumptions unless the docs explicitly call for fallback or rollback.
- The runtime engine is a conventional ECS built around entities, components, and systems.
- Authored templates live outside ECS and are referenced by ids from runtime state.
- React and UI state remain separate from simulation state.
- React Router owns app-shell navigation only and does not own gameplay state.
- Rendering is hybrid:
  - Canvas 2D for world-scale views
  - live SVG for focused operator detail views
- The project is local-first and client-side.
- Saves use IndexedDB for runtime slots and metadata. Manual `.json` import/export remains later roadmap work.
- AI is optional for core gameplay and should not block the simulation loop.

## Recommended Stack

| Area              | Decision                      | Notes                                                                                                 |
| ----------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Toolchain         | `Vite+`                       | Unified toolchain (Vite 8, Oxlint, Oxfmt, tsgolint, Vitest). Fallback to standalone Vite 8 if needed. |
| UI                | React + TypeScript            | Start screen, shell UI, overlays, profiles, dev menu.                                                 |
| Routing           | React Router 7                | Client-side shell routing only. Do not adopt heavier framework/server modes for the game client.      |
| Simulation        | `bitECS`                      | ECS runtime for world state and systems.                                                              |
| UI state          | App-layer React hooks         | Selection, shell state, save-slot queries, and route-to-runtime glue during preproduction.            |
| Rendering         | Canvas 2D + live SVG          | World-scale rendering stays lightweight; detail views stay rich.                                      |
| Pathfinding       | `easystarjs` behind a wrapper | Queue path requests; do not recalc for everyone every tick.                                           |
| Persistence       | `idb`                         | Better fit than `idb-keyval` once slots and metadata exist.                                           |
| Content authoring | TypeScript definitions        | Strong refactors, compiler support, easy iteration.                                                   |
| AI SDK            | Vercel AI SDK + AI Gateway    | Valid for local tools and optional runtime features.                                                  |

## Project Structure

```text
ascension/
├── README.md
├── docs/
├── package.json
├── react-router.config.ts
├── vite.config.ts
├── app/
│   ├── root.tsx
│   ├── routes.ts
│   └── routes/
├── sim/
├── render/
├── content/
├── save/
├── lib/
├── scripts/
│   ├── generate-svg-parts.ts
│   ├── validate-svg-parts.ts
│   ├── assemble-operator-sprites.ts
│   ├── generate-operators.ts
│   └── build-content-bundle.ts
├── public/
│   └── data/
│       ├── operator-pool.json
│       └── svg-parts/
│           └── operators/
│               ├── reference/
│               ├── recipes/
│               └── parts/
└── build/
```

## What This Split Is For

- [ECS and Systems](./technical-ecs-and-systems.md) owns runtime simulation structure, templates, requirements, effects, and progression mechanics.
- [Rendering and Assets](./technical-rendering-and-assets.md) owns SVG parts, asset search, composition, rendering contexts, and gear visibility.
- [Save and Data Model](./technical-save-and-data.md) owns slot metadata, save storage, raid summaries, hidden resolution packets, and persistence rules.

## Current Bootstrap Reality

The repo is now using a React Router scaffold that has been migrated onto local `Vite+`.

That means:

- keep React Router constrained to shell navigation
- keep the app in SPA mode for the local-first client
- do not let scaffold defaults override the documented ECS and template architecture

## SVG Reference Rule

The SVG Playground is for exploration, comparison, and future iteration.

It is not the canonical storage location for approved SVG examples.

Approved category examples should live in data-bearing asset locations such as:

- `public/data/svg-parts/operators/reference/`
- `public/data/svg-parts/operators/recipes/`
- `public/data/svg-parts/operators/parts/`

Use that split deliberately:

- `reference/` stores locked exemplar SVGs and manifests that define the chosen category language
- `recipes/` stores composed presets or reference compositions that can be used by the game
- `parts/` stores reusable modular production pieces

This keeps the playground disposable for iteration while preserving approved examples as durable project assets.

## Implementation Rule

This overview should not become another long-form dumping ground. New detailed technical decisions should usually land in one of the split docs above.
