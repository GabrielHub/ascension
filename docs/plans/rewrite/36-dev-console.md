# 36. Dev Console

Status: not started
Plan ID: rewrite/dev-console
Implementation order: 36
Depends on: rewrite/repo-setup

## Scope

Rebuild the runtime dev console against the new ECS state shape.

Owns:

- Dev-only command console.
- Autocomplete.
- Typed runtime-safe command actions.
- Inspect, seed, advance, and feature unlock commands.

Does not own:

- Player-facing cheats.
- Headless REPL harness.
- Browser automation scripts.

## Checklist

- [ ] Review this plan's scope and current dev console as reference.
- [ ] Define command schema and autocomplete model.
- [ ] Implement read-only inspect commands for ECS state, saves, rooms, operators, contracts, and events.
- [ ] Implement safe mutate commands through typed systems.
- [ ] Implement time advance and named setup commands aligned with dev menu phases.
- [ ] Add tests for command validation and rejected malformed commands.

## Acceptance Criteria

- [ ] Console commands never mutate UI state directly.
- [ ] Commands are dev-only and cannot run in production builds.
- [ ] Agents can inspect and set up state without ad hoc browser-console mutation.
- [ ] `vp check` and relevant tests pass.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks command safety and ECS authority.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
