# Ascension

Ascension is a local-first management sim about running a dungeon-clearing guild in near-future New York City.

## Project Context

- genre: management sim
- setting: near-future NYC with dungeon breaches
- player role: guildmaster, not direct combatant
- technical architecture: ECS simulation with authored templates outside ECS
- current phase: Phase 1 bodega world rendering

## Source Of Truth

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- `docs/` is reserved for roadmap, future-facing design questions, and research.
- Repo workflow rules live in [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md).

## Current App Stack

- `Vite+` for the unified toolchain
- React + TypeScript
- React Router 7 for app-shell routing
- Tailwind CSS for styling
- `bitECS` for simulation runtime
- IndexedDB-backed local save slots

## Documentation

Start with:

- [Documentation Index](./docs/index.md)
- [Roadmap](./docs/roadmap.md)
- [Product Plan](./docs/product-plan.md)
- [Product Plan Index](./docs/product/index.md)
- [World Foundation Reference](./docs/world-foundation.md)
- [World Foundation Index](./docs/world/index.md)
- [Plans Index](./docs/plans/index.md)

## Commands

Preferred workflow:

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

## Notes

- this is a local-first personal project in a public repository
- keep secrets in local environment files and out of version control
