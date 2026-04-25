# 35. Dev Menu

Status: not started
Plan ID: rewrite/dev-menu
Implementation order: 35
Depends on: rewrite/repo-setup

## Scope

Implement the in-game dev menu that replaces the old sandbox preview entry point.

Owns:

- Dev-only menu shell.
- Named phase skip targets.
- Fast-forward primitive shared with the headless harness.
- Non-persistent preview helpers inside the main app.

Does not own:

- Dev console command language.
- Production gameplay shortcuts.
- Starting a separate sandbox route.

## Checklist

- [ ] Review this plan's scope, blockers, checklist, and acceptance criteria.
- [ ] Define named phase skip targets covering starter, recruitment, first contract, workshop, midgame, rival, and endgame surfaces.
- [ ] Implement dev-only gating.
- [ ] Implement phase seed/skip commands using authoritative systems.
- [ ] Share fast-forward primitives with the future headless harness where practical.
- [ ] Add tests for dev gating and phase setup determinism.

## Acceptance Criteria

- [ ] No top-level sandbox preview route exists.
- [ ] Phase skips create valid ECS state rather than UI-only shortcuts.
- [ ] Dev menu cannot ship as a player-facing production feature accidentally.
- [ ] Agents can reach feature test states quickly.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks state validity and dev-only gating.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
