# 29. Narrative Events

Status: not started
Plan ID: rewrite/narrative-events
Implementation order: 29
Depends on: rewrite/rooms-catalog

## Scope

Implement the narrative event framework and initial event families.

Owns:

- Event trigger contracts.
- Presenter binding.
- Authored choices and deterministic effect bundles.
- Pending-event save safety.
- Operator-death event handling.
- AI framing payload shape for `incident-framing`.

Does not own:

- Rival move system.
- Persistent guide chain.
- Runtime AI transport infrastructure.

## Checklist

- [ ] Read [Narrative Event Requirements](../../product/narrative-events.md), [Presenters Catalog](../../product/presenters-catalog.md)
- [ ] Implement event family schema and validation.
- [ ] Implement trigger contracts from ECS/system events.
- [ ] Implement pending-event save/restore.
- [ ] Implement choice resolution through deterministic systems.
- [ ] Implement operator-death event flow after cheat-death resolution.
- [ ] Implement AI framing payload assembly with authored fallback copy.
- [ ] Add tests for trigger eligibility, save restore, choice effects, presenter binding, and death-event batching/sequencing.

## Acceptance Criteria

- [ ] Narrative events are owned by systems and HR cadence, not UI.
- [ ] Generic public/civic/institutional pressure events do not exist outside rival-driven contexts.
- [ ] Operator deaths pause progression until acknowledged.
- [ ] AI framing never invents gameplay choices, subjects, or effects.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks event authority, save safety, and dropped pressure systems.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
