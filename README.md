# Ascension

Ascension is a local-first management sim about running a dungeon-clearing guild in near-future New York City. The player builds and operates a headquarters, recruits operators, assigns raids, and grows from a bodega-scale operation into a much larger institution.

This repository is documentation-first during preproduction. The real source of truth for design, architecture, and execution lives under [`docs/`](./docs/).

## Repository Purpose

This repo exists to:

- define the project architecture before broad implementation starts
- keep the ECS/content/template boundaries explicit
- support incremental solo development with parallel AI assistance
- turn roadmap phases into execution plans instead of loose notes

## Documentation

Start here:

- [Documentation Index](./docs/index.md)
- [Plans Index](./docs/plans/index.md)

Most implementation questions should be answered by the docs before new architecture is introduced in code.

## Expected Stack

- Vite 8
- React + TypeScript
- `bitECS`
- Canvas 2D for world-scale views
- live SVG for focused detail views
- IndexedDB for runtime saves

This is a local-first personal project in a public repo. Keep secrets in local environment files and out of version control.

## Development Status

Current phase:

- preproduction

Current priority:

- establish project scaffolding, quality gates, and execution plans before feature implementation

## Setup

The repo is still in preproduction, so setup is intentionally minimal until the project scaffold is in place.

Planned baseline setup includes:

- formatter
- linter
- TypeScript typecheck
- app shell bootstrap
- save and registry scaffolding

Use the preproduction execution plan for the current build order:

- [Preproduction Plan](./docs/plans/preproduction.md)
