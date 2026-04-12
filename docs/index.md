# Ascension Documentation Index

Documentation is intentionally narrow.

## Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Docs should cover roadmap, future-facing product direction, and research only.
- Repo workflow and development rules live in [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md), not under `docs/`.
- Ascension now has two runtime surfaces with different jobs: browser mode for fast development and regression, Tauri desktop mode for shipped-host validation.

## Status Snapshot

- The shipped baseline now includes the full bodega arc, relocation into Porter's, multi-floor HQ support, runtime-owned incidents and encounter handoff, onboarding, audio, browser and desktop save hosts, and optional local-first AI generation infrastructure.
- The AI content layer is no longer an active bring-up plan. The shipped baseline already includes settings storage, localhost transport, browser and desktop adapters, runtime request tracking, dev-console hooks, and the first two narrow generation surfaces: `incident-framing` and `operator-identity`.
- Phase 4 is underway. Contract lock, city pressure, Porter's content remediation, durable crafting, and social/incident fallout are already implemented; the remaining active plan queue is encounter breadth.

## Planned Work

- Continue Phase 4 by landing broader encounter depth on top of the shipped district, faction, content-remediation, crafting, and social/incident baseline.
- Continue HQ environment cleanup only where it supports the shipped cross-building runtime contract and later-building reuse.
- Treat future AI work as content breadth and quality on top of shipped infrastructure: stronger grounding, better eval fixtures, wider incident coverage, and later narrow surfaces only when deterministic payloads are already stable.

## Current Docs

### Core Canon

- [Roadmap](./roadmap.md)
- [Product Plan Hub](./product-plan.md)
- [Product Plan Index](./product/index.md)
- [World Foundation Hub](./world-foundation.md)
- [World Foundation Index](./world/index.md)

### Execution Plans

- [Plans Index](./plans/index.md)
  The current active queue is the remaining Phase 4 encounter set coordinated by the manager plan.

### Research

- No active research docs or shipped-plan archives are checked in right now. If a future design question needs preserved research context, add it deliberately instead of treating old plan files as standing canon.

## How To Use

- Start with [Roadmap](./roadmap.md) to see what is already shipped and what comes next.
- Keep the browser-versus-desktop split in mind while reading: the web engine stays authoritative, and Tauri owns desktop hosting and file persistence.
- Use [Product Plan Hub](./product-plan.md) if you want the stable entry point, or jump straight to [Product Plan Index](./product/index.md) for the split docs.
- Use [World Foundation Hub](./world-foundation.md) if you want the stable entry point, or jump straight to [World Foundation Index](./world/index.md) for the split docs.
- Use [Plans Index](./plans/index.md) when coordinating execution across multiple agents.
- Add research docs only when a future design question actually needs outside context and the answer is worth preserving.
