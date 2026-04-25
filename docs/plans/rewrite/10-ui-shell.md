# 10. UI Shell

Status: not started
Plan ID: rewrite/ui-shell
Implementation order: 10
Depends on: rewrite/cascading-panel-shell

## Scope

Build the main desktop-only game shell around the HQ canvas.

Owns:

- Top bar with cash, reputation, and cog menu.
- Event log rail.
- Tooltip primitive.
- Narrative-modal host.
- Panel-stack integration.
- Viewport rules for desktop-only play.

Does not own:

- Room feature panels beyond shell mounting points.
- Bottom-bar shortcut registry.
- Mobile/responsive support.

## Checklist

- [ ] Read [Visual / UI Direction](../../product/ui-direction.md)
- [ ] Implement top-level shell layout with the HQ canvas as the primary surface.
- [ ] Implement cash and reputation readouts as subscribed presentation state.
- [ ] Implement cog menu shell for save/settings/pause entries.
- [ ] Implement one tooltip primitive and remove competing patterns from the new repo.
- [ ] Implement persistent event log rail with click-through hooks.
- [ ] Mount cascading panel stack and narrative modal host.
- [ ] Add viewport guard or documented minimum desktop size.

## Acceptance Criteria

- [ ] Shell navigation remains React Router only; no gameplay authority lives in routes.
- [ ] Tooltip, modal, panel, badge, and event-log patterns are single-source UI primitives.
- [ ] No top-level menu duplicates room-owned features.
- [ ] `vp check`, `vp test`, and `vp build` pass.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks shell authority boundaries, visual consistency, and desktop-only scope.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
