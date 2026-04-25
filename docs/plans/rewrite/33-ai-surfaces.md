# 33. AI Surfaces

Status: not started
Plan ID: rewrite/ai-surfaces
Implementation order: 33
Depends on: none

## Scope

Implement optional local-first runtime AI surfaces.

Owns:

- AI-disabled mode.
- Local OpenAI-compatible/Ollama transport.
- `incident-framing` surface.
- `operator-identity` surface.
- Pre-generation queue.
- Authored fallback copy and validation.

Does not own:

- Runtime image generation.
- AI-generated dungeon content.
- Rival event AI framing beyond roadmap notes.
- Weapon flavor AI beyond roadmap notes.

## Checklist

- [ ] Read [Narrative Event Requirements](../../product/narrative-events.md), [Operator Rank Requirements](../../product/operator-ranks.md), [Guide Event Requirements](../../product/guide-events.md)
- [ ] Implement AI settings with disabled as first-class mode.
- [ ] Implement local OpenAI-compatible transport and connection test.
- [ ] Implement pre-generation queue with deterministic payload ownership.
- [ ] Implement `incident-framing` payload schema, validation, fallback, and presenter voice brief.
- [ ] Implement `operator-identity` payload schema, approved-pool constraints, validation, and fallback.
- [ ] Ensure AI can never mutate rank, role, stats, effects, choices, or hidden gameplay state.
- [ ] Add tests for disabled mode, fallback, schema rejection, and queue persistence.

## Acceptance Criteria

- [ ] The game is fully playable offline with AI disabled.
- [ ] AI only writes prose or assembles approved identity fields after deterministic systems choose structure.
- [ ] Dungeons and raid results are authored/deterministic, not AI-generated.
- [ ] No runtime image generation exists.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks AI authority boundaries and fallback quality.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
