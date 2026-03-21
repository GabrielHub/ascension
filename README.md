# Ascension

Ascension is a local-first management sim about running a dungeon-clearing guild in near-future New York City.

This repository is currently in preproduction. The scaffold exists, but the primary source of truth is still the documentation under [`docs/`](./docs/).

## Project Context

- genre: management sim
- setting: near-future NYC with dungeon breaches
- player role: guildmaster, not direct combatant
- technical architecture: ECS simulation with authored templates outside ECS
- current phase: preproduction

## Current App Stack

- `Vite+` for the unified toolchain
- React + TypeScript
- React Router 7 for app-shell routing
- Tailwind CSS for styling
- `bitECS` scaffolding for simulation runtime
- IndexedDB-backed local save slots

Important constraint:

- this repo is intended to use `Vite+`, not plain standalone Vite, as the normal toolchain
- `Vite+` is the intended entry point for runtime, package management, install/add/remove flows, and check/build workflows
- routing is only for shell navigation
- gameplay state must remain in the simulation layer, not in the router or React component tree

## Documentation

Start with:

- [Documentation Index](./docs/index.md)
- [Plans Index](./docs/plans/index.md)
- [Preproduction Plan](./docs/plans/preproduction.md)

The docs define:

- architecture rules
- technical boundaries
- roadmap sequencing
- execution plans for implementation work

## Current Commands

Intended Vite+ workflow:

```bash
vp install
vp dev
vp check
vp test
vp build
```

Package scripts mirror the same toolchain:

```bash
pnpm check
pnpm dev
pnpm build
pnpm test
pnpm typecheck
```

## Development Expectations

- do not add gameplay rules in UI components
- do not add named-content special cases in systems unless explicitly documented
- do not treat generated scaffold conventions as architectural authority over the docs
- update the docs when architecture decisions change

## Notes

- this is a local-first personal project in a public repository
- keep secrets in local environment files and out of version control
- the current scaffold has been normalized around the documented app-shell, save, render, and ECS boundaries
