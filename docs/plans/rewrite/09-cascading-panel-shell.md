# 09. Cascading Panel Shell

Status: not started
Plan ID: rewrite/cascading-panel-shell
Implementation order: 09
Depends on: none

## Scope

Implement the right-anchored cascading panel stack used by room and entity surfaces.

Owns:

- Panel-stack state and presentation.
- FIFO collapse behavior.
- Click-outside collapse.
- Panel categorization rules.
- Shared animation pattern.

Does not own:

- Feature-specific panel contents.
- Narrative event modals.
- Boss prep screen pattern.

## Checklist

- [ ] Read [Visual / UI Direction](../../product/ui-direction.md) and the `rewrite/visual-language-audit` output.
- [ ] Implement the panel-stack component and typed panel descriptor model.
- [ ] Implement category replacement behavior when the user changes room/feature category.
- [ ] Implement click-outside collapse and keyboard-safe focus behavior.
- [ ] Add motion transitions that are smooth but not gameplay-authoritative.
- [ ] Add tests for FIFO behavior, category replacement, and nested detail panel reuse.

## Acceptance Criteria

- [ ] Room clicks and entity clicks can open panels through typed intents.
- [ ] UI state does not mutate gameplay state directly.
- [ ] Old-style modals are not used for room or feature panels.
- [ ] Panel text never uses sizes below `text-xs`.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks UI authority boundaries and visual-direction compliance.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
