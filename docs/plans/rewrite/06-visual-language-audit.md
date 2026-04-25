# 06. Visual Language Audit

Status: not started
Plan ID: rewrite/visual-language-audit
Implementation order: 06
Depends on: none

## Scope

Audit the current game's UI patterns and decide what the new repo should reproduce visually.

Owns:

- Kept, restyled, and dropped list for current `app/ui/` components and `app/app.css` patterns.
- Tailwind v4 migration guidance.
- Canonical tooltip, modal, panel, badge, top bar, bottom bar, and event-log patterns.

Does not own:

- Implementing the full UI shell.
- Redesigning the palette unless a human explicitly changes the product direction.
- Mobile or responsive behavior.

## Checklist

- [ ] Read [Visual / UI Direction](../../product/ui-direction.md)
- [ ] Inspect current `app/ui/` and `app/app.css` as visual reference only.
- [ ] Produce a kept/restyled/dropped table for relevant components and CSS patterns.
- [ ] Identify the one canonical tooltip, panel-stack, modal, and badge pattern.
- [ ] List any custom CSS that must survive because Tailwind utilities cannot express it cleanly.
- [ ] Record rejected patterns that agents must not copy.

## Acceptance Criteria

- [ ] The audit gives UI implementers enough direction without requiring them to copy old code.
- [ ] The existing dark/gold/silver/ember visual identity remains the default unless changed by a later decision.
- [ ] The audit explicitly enforces minimum `text-xs` typography.
- [ ] No responsive/mobile requirements are introduced.

## Review Gate

- [ ] Set status to `waiting review` after the audit.
- [ ] Reviewer checks the audit against product UI direction and dropped-feature rules.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
