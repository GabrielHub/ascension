# 42. Unique Operators Catalog

Status: not started
Plan ID: rewrite/unique-operators-catalog
Implementation order: 42
Depends on: rewrite/operator-model, rewrite/dungeons-catalog

## Scope

Author and validate the initial Unique operator roster.

Owns:

- Unique operator identity packets.
- Unique combat kits.
- Unlock prerequisites.
- Portrait asset references and glow treatment.
- Behavior constraints in content data.

Does not own:

- Unique weapon roster.
- Unique dungeon implementation beyond referenced prerequisites.
- Penthouse room behavior outside unique constraints.

## Checklist

- [ ] Read [Unique Operator Requirements](../../product/unique-operators.md), [Operators And Staff](../../world/operators-and-staff.md), [Content Rules](../../world/content-rules.md)
- [ ] Decide initial unique roster size for the first playable endgame.
- [ ] Author one content packet per Unique operator.
- [ ] Define each operator's paired dungeon/boss requirement and currency requirement.
- [ ] Author unique kit data and validate it against encounter engine capabilities.
- [ ] Add portrait asset references or approved placeholders using the shared glow rule.
- [ ] Validate behavior constraints: no training, limited room presence, Penthouse required to deploy/recover.

## Acceptance Criteria

- [ ] Unique operators are deterministic goal unlocks, not random visitors.
- [ ] Each unique reads as a famous authored person, not a rarity pull.
- [ ] Unique recruitment can be displayed in the Unique Operator room.
- [ ] Custom logic is isolated and justified per operator when needed.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks unique identity, unlock chain, and behavior constraints.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
