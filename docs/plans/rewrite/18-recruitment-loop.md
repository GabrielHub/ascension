# 18. Recruitment Loop

Status: not started
Plan ID: rewrite/recruitment-loop
Implementation order: 18
Depends on: rewrite/operator-model, rewrite/rooms-catalog

## Scope

Implement regular operator recruitment through the Recruitment room.

Owns:

- Deterministic starter visitor seed.
- Visitor queue, cooldowns, leave timers, recruit costs, and role bias.
- Rank distribution bounded by Progression-Tier.
- Bad-state recovery visitor reseeding.
- Visitor chibi click-to-recruit intent.

Does not own:

- Unique operator recruitment.
- Operator identity AI schemas beyond calling the approved surface.
- Room panel visual design beyond data and intents.

## Checklist

- [ ] Read [Operator Rank Requirements](../../product/operator-ranks.md), [Rooms Catalog](../../product/rooms-catalog.md#recruitment), [Guide Event Requirements](../../product/guide-events.md)
- [ ] Author the three fixed starter visitors, one per role, with rank-F starter weapons.
- [ ] Implement visitor queue capacity, cooldown, and leave timer rules from room tier data.
- [ ] Implement role-bias generation for random visitors.
- [ ] Implement Progression-Tier rank caps and tier-weighted rank distribution hooks.
- [ ] Implement bad-state recovery detection and free or near-free lower-rank visitor reseeding.
- [ ] Emit typed recruit, dismiss, and visitor-expired events.
- [ ] Add tests for starter seed, rank cap, role bias, cap respecting roster space, and bad-state recovery.

## Acceptance Criteria

- [ ] Unique operators never appear as regular visitors.
- [ ] Recruitment cannot roll above the current Progression-Tier band.
- [ ] The first guide chain can recruit all three starters deterministically.
- [ ] AI-disabled mode uses authored fallback identity packets.

## Review Gate

- [ ] Set status to `waiting review` after verification.
- [ ] Reviewer checks starter flow, bad-state recovery, and rank distribution boundaries.
- [ ] After review, set status to `completed` and move this file to `docs/plans/graveyard/`.
