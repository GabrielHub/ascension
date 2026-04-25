# 11. Bottom Bar Shortcuts

Status: not started
Plan ID: rewrite/bottom-bar-shortcuts
Implementation order: 11
Depends on: rewrite/rooms-catalog

## Scope

Implement the room shortcut bar and attention badge model.

Owns:

- Shortcut eligibility.
- Room-to-shortcut mapping.
- `!` badge source model.
- Shortcut click intent routing into the panel stack.

Does not own:

- Feature behavior behind the room panels.
- Event generation.
- Top-level menus.

## Checklist

- [ ] Read [Rooms Catalog](../../product/rooms-catalog.md), [Visual / UI Direction](../../product/ui-direction.md)
- [ ] Define which room surfaces qualify for bottom-bar shortcuts.
- [ ] Implement shortcut metadata from room registry data.
- [ ] Implement badge sources for recruitment visitors, contract review, boss-ready state, narrative events, guide attention, and rival attention.
- [ ] Route shortcut clicks through typed room-panel intents.
- [ ] Add tests for badge visibility, locked-room hiding/disabled state, and click routing.

## Acceptance Criteria

- [ ] Bottom bar shortcuts map one-to-one to room-owned surfaces.
- [ ] The bottom bar never owns a gameplay feature directly.
- [ ] Badges are data-driven and do not scrape UI state.
- [ ] `vp check` passes.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks that shortcut behavior does not bypass room ownership.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
