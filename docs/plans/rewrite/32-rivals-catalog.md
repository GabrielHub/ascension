# 32. Rivals Catalog

Status: not started
Plan ID: rewrite/rivals-catalog
Implementation order: 32
Depends on: rewrite/rival-loop

## Scope

Author and validate the initial rival guild roster.

Owns:

- Rival identity packets.
- Narrative profiles.
- Move templates.
- Leader portrait and insignia asset references.
- Rival content validation.

Does not own:

- Rival loop mechanics.
- Direct battles or rival HQs.
- Public-pressure-specific UI copied from the old game.

## Checklist

- [ ] Read [Rival Guild Creation](../../product/rival-guilds.md), [Guilds And Dungeons](../../world/guilds-and-dungeons.md), [Content Rules](../../world/content-rules.md)
- [ ] Decide initial rival roster size for the first playable endgame band.
- [ ] Author each rival's identity, pressure lane, one-liner, narrative profile, and at least three moves.
- [ ] Ensure move effects use supported deterministic consequence kinds.
- [ ] Add leader portrait and insignia asset references or approved placeholders.
- [ ] Validate every rival packet for required fields and repeated move usability.
- [ ] Add content tests for roster seeding and invalid rival rejection.

## Acceptance Criteria

- [ ] Each rival reads as a specific licensed guild with a clear pressure angle.
- [ ] Rival moves are repeatable and still make sense after defeat as non-current events.
- [ ] No current-game public-pressure surfaces are active requirements.
- [ ] Asset production starts only after non-asset rival identity is reviewed.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks rival tone, move completeness, and dropped-system leakage.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
