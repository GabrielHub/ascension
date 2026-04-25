# 34. Audio Inventory

Status: not started
Plan ID: rewrite/audio-inventory
Implementation order: 34
Depends on: none

## Scope

Audit and define the new game's audio and UI SFX inventory.

Owns:

- Existing music carry-forward list.
- UI SFX audit.
- Combat SFX missing-asset list.
- Trigger map for audio cues.
- Audio settings integration requirements.

Does not own:

- Music expansion.
- Per-room or per-floor ambient audio.
- Encounter SFX implementation details owned by `rewrite/encounter-sfx`.

## Checklist

- [ ] Review this plan's scope and current audio code as reference.
- [ ] Inventory existing music and cues that carry forward.
- [ ] Audit UI sound effects for consistency and missing cases.
- [ ] Define a single UI SFX pattern for clicks, confirms, warnings, modal events, and badges.
- [ ] Cross-reference combat cue needs from `rewrite/encounter-sfx`.
- [ ] Record missing assets and whether they are required for initial scope or roadmap.
- [ ] Add validation or tests for cue IDs referenced by UI and encounter code.

## Acceptance Criteria

- [ ] Existing music can carry forward without new per-room ambience.
- [ ] UI cue usage is consistent and documented.
- [ ] Missing combat SFX are visible to implementation agents.
- [ ] No audio plan introduces room/floor ambience as initial scope.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks audio scope and missing-asset list.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
