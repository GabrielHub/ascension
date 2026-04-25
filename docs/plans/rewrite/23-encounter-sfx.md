# 23. Encounter SFX

Status: not started
Plan ID: rewrite/encounter-sfx
Implementation order: 23
Depends on: rewrite/encounter-engine

## Scope

Implement combat sound cue inventory and triggering rules.

Owns:

- SFX cue definitions for operator basics, ultimates, boss attacks, and VFX families.
- Trigger mapping from encounter events.
- Volume/mute integration with existing audio settings.

Does not own:

- Music expansion.
- Per-room ambience.
- VFX implementation.

## Checklist

- [ ] Read [Visual Effects Pool](../../product/visual-effects-pool.md) and current audio cue patterns as reference.
- [ ] Inventory reusable existing audio code patterns.
- [ ] Define one cue per VFX family plus any needed boss/operator variants.
- [ ] Trigger SFX from encounter events, not UI animation lifecycle.
- [ ] Respect global audio settings.
- [ ] Add tests for cue lookup and disabled-audio behavior.

## Acceptance Criteria

- [ ] Every combat VFX family has a matching SFX cue.
- [ ] No per-room or per-floor ambient layers are introduced.
- [ ] Audio cues are code-defined, not unmanaged loose behavior.
- [ ] `vp check` passes.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks cue coverage and audio-setting integration.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
