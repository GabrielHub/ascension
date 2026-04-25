# 24. Weapon Asset Family

Status: not started
Plan ID: rewrite/weapon-asset-family
Implementation order: 24
Depends on: rewrite/asset-pipeline

## Scope

Set up weapon visual asset conventions and initial placeholder coverage.

Owns:

- Weapon icon directory and manifest entries.
- Per-rank visual escalation references.
- Unique weapon portrait/glow treatment hook.
- Asset validation for weapon templates.

Does not own:

- Weapon stat tables.
- Market behavior.
- Unique weapon content roster.

## Checklist

- [ ] Read [Asset Pipeline Contract](../../product/asset-pipeline.md), [Weapon Tier Requirements](../../product/weapon-tiers.md), and [Content Rules](../../world/content-rules.md).
- [ ] Create weapon asset directories for F through A and unique weapons.
- [ ] Add placeholder or approved seed icons sufficient for template validation.
- [ ] Add manifest fields needed by weapon templates.
- [ ] Define per-rank art review checklist.
- [ ] Add validation for missing asset references in weapon templates.

## Acceptance Criteria

- [ ] Every authored weapon can reference a valid icon or approved placeholder.
- [ ] Unique weapon portrait treatment uses the shared unique glow rule.
- [ ] Asset workflow calls out human approval and background removal where applicable.
- [ ] No outfit or accessory asset family is introduced.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks weapon asset family boundaries.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
