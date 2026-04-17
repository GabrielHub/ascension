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
- Phase 4 is complete. Contract lock, city pressure, Porter's content remediation, durable crafting, social/incident fallout, and encounter breadth are all shipped.
- Midgame remediation is complete. The shipped Porter's-era baseline now has stronger browser coverage, deterministic D-rank economy reporting, workshop tuning, and the verified UX fixes needed by that loop.

## Planned Work

- The next product work is the third and final headquarters: an expandable skyscraper that becomes the campaign's long-tail endgame home.
- The first skyscraper slice should establish the HQ baseline and endgame-entry band, not attempt the full forever loop in one pass.
- Continue HQ environment cleanup only where it supports the shipped cross-building runtime contract and skyscraper floor reuse.
- Active execution should stay split into narrow checked-in slices under `docs/plans/` rather than another umbrella phase doc.
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
  There is no active checked-in plan right now; completed work should already be reflected back into the roadmap and product docs.

### Research

- No active research docs or shipped-plan archives are checked in right now. If a future design question needs preserved research context, add it deliberately instead of treating old plan files as standing canon.

## How To Use

- Start with [Roadmap](./roadmap.md) to see what is already shipped and what comes next.
- Keep the browser-versus-desktop split in mind while reading: the web engine stays authoritative, and Tauri owns desktop hosting and file persistence.
- Use [Product Plan Hub](./product-plan.md) if you want the stable entry point, or jump straight to [Product Plan Index](./product/index.md) for the split docs.
- Use [World Foundation Hub](./world-foundation.md) if you want the stable entry point, or jump straight to [World Foundation Index](./world/index.md) for the split docs.
- Use [Plans Index](./plans/index.md) when coordinating concrete skyscraper and endgame-entry slices.
- Add research docs only when a future design question actually needs outside context and the answer is worth preserving.
