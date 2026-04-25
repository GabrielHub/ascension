# 21. Raid Minimap

Status: not started
Plan ID: rewrite/raid-minimap
Implementation order: 21
Depends on: rewrite/operations-loop

## Scope

Implement raid transcript playback, minimap state, fog reveal, and backdrop reveal.

Owns:

- Minimap presentation model.
- Exploration percentage display.
- Fog-of-war reveal cadence.
- Transcript event playback.
- Thin skirmish/hazard/loot notification stack.

Does not own:

- Raid outcome simulation.
- Boss live-card encounter UI.
- Dungeon content authoring.

## Checklist

- [ ] Read [Dungeon Rank Requirements](../../product/dungeon-ranks.md), [Asset Pipeline Contract](../../product/asset-pipeline.md)
- [ ] Design minimap read model from operations transcript data.
- [ ] Implement fog reveal tied to exploration percentage and raid event playback.
- [ ] Paint raid backdrop image into revealed map areas.
- [ ] Implement skirmish/hazard/loot notification summaries.
- [ ] Add click-through hooks to team detail, raid detail, and event log entries.
- [ ] Add tests for reveal progression, boss-ready display, and transcript playback ordering.

## Acceptance Criteria

- [ ] Non-boss raid events never pause the sim.
- [ ] Skirmishes do not use full card-style playback.
- [ ] The minimap does not own simulation results.
- [ ] Backdrop reveal works with AI-disabled/offline play because assets are authored files.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks playback authority boundaries and reveal behavior.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
