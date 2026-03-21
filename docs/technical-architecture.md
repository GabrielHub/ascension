# Ascension Technical Overview

This file is the technical entry point for the project. It should stay high-level and point to the more detailed technical documents.

## Technical Doc Map

- [ECS and Systems](./technical-ecs-and-systems.md)
- [Rendering and Assets](./technical-rendering-and-assets.md)
- [Save and Data Model](./technical-save-and-data.md)
- [Architecture Rules](./architecture-rules.md)

## Core Technical Stance

- The runtime engine is a conventional ECS built around entities, components, and systems.
- Authored templates live outside ECS and are referenced by ids from runtime state.
- React and UI state remain separate from simulation state.
- Rendering is hybrid:
  - Canvas 2D for world-scale views
  - live SVG for focused operator detail views
- The project is local-first and client-side.
- Saves use IndexedDB with manual `.json` export/import.
- AI is optional for core gameplay and should not block the simulation loop.

## Recommended Stack

| Area | Decision | Notes |
| --- | --- | --- |
| Toolchain | Vite 8 | Current stable release. |
| UI | React + TypeScript | Start screen, shell UI, overlays, profiles, dev menu. |
| Simulation | `bitECS` | ECS runtime for world state and systems. |
| UI state | `zustand` | Selection, shell state, view state, interaction intent. |
| Rendering | Canvas 2D + live SVG | World-scale rendering stays lightweight; detail views stay rich. |
| Pathfinding | `easystarjs` behind a wrapper | Queue path requests; do not recalc for everyone every tick. |
| Persistence | `idb` | Better fit than `idb-keyval` once slots and metadata exist. |
| Content authoring | TypeScript definitions | Strong refactors, compiler support, easy iteration. |
| AI SDK | Vercel AI SDK + AI Gateway | Valid for local tools and optional runtime features. |

## Project Structure

```text
ascension/
├── README.md
├── docs/
├── package.json
├── vite.config.ts
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
└── src/
    ├── app/
    ├── sim/
    ├── render/
    ├── content/
    ├── features/
    └── lib/
```

## What This Split Is For

- [ECS and Systems](./technical-ecs-and-systems.md) owns runtime simulation structure, templates, requirements, effects, and progression mechanics.
- [Rendering and Assets](./technical-rendering-and-assets.md) owns SVG parts, asset search, composition, rendering contexts, and gear visibility.
- [Save and Data Model](./technical-save-and-data.md) owns slot metadata, save storage, raid summaries, hidden resolution packets, and persistence rules.

## Implementation Rule

This overview should not become another long-form dumping ground. New detailed technical decisions should usually land in one of the split docs above.
