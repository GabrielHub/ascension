# Hazard-Pay Documentation Index

Documentation is intentionally narrow. This folder is the handoff surface for the
Hazard-Pay: Dungeon Management rewrite, not the shipped Ascension roadmap.

## Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Docs cover the new game's world canon, product/content contracts, and actionable implementation plans.
- Repo workflow and development rules live in [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md), not under `docs/`.

## Status Snapshot

- The rewrite is a new web-first game: one skyscraper HQ, browser saves, ECS-owned gameplay state, weapons-only items, and no Tauri/desktop host in initial scope.
- Active canon is the rewritten world docs, product docs, and numbered `rewrite/*` implementation plans.
- Current Ascension code and assets are reference material only. Do not copy old systems forward when they conflict with the active product docs, world docs, or numbered plans.

## Planned Work

- [Plans Index](./plans/index.md) is the source of truth for implementation order and active plan status.
- Plans are numbered by implementation order, split by ownership scope, and include review gates before completion.

## Current Docs

### Core Canon

- [Product Documentation](./product/index.md)
- [World Foundation Reference](./world/index.md)

### Execution Plans

- [Plans Index](./plans/index.md)
  Use this as the source of truth for the active numbered rewrite plan set.

### Agent Handoff

- [New Repo Agent Guidance Draft](./new-repo-agent-guidance.md)
  Use as the source draft for the new repo's `AGENTS.md` and `CLAUDE.md`.

### Research

- No active research docs are checked in right now. If a future design question needs preserved research context, add it deliberately instead of treating old Ascension material as standing canon.

### Reference

- [Reference Archive](./reference/index.md)
  Decision archive only. Consult when active numbered plans or product/world docs are ambiguous or contradictory.

### Roadmap

- [Roadmap](./roadmap.md)
  Deferred ideas only. Do not execute from this file.

## How To Use

- Start from [Plans Index](./plans/index.md), then read one numbered plan plus its referenced product/world docs.
- Use [Product Documentation](./product/index.md) when implementing content, assets, rooms, dungeons, operators, weapons, rivals, guide beats, and UI direction.
- Use [World Foundation Reference](./world/index.md) when writing player-facing copy, names, narrative beats, or asset briefs.
- Use [Full Rewrite Source](./reference/fullrewrite-source.md) only as a decision archive when active docs conflict or lack context.
- Add research docs only when a future design question actually needs outside context and the answer is worth preserving.
