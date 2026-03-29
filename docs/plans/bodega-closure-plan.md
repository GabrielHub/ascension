# Bodega Closure Plan

This plan now serves as the early-game closeout and promotion pass. It starts from a shipped opening path, shipped standing management surfaces, a shipped balance harness, and a shipped Porter's handoff target.

## Status

Implemented already:

- Phase 1: the full bodega building arc
- Phase 2: the first bodega-native support rooms
- Phase 3: hard roster-cap overflow handling
- Phase 4 boss-presentation slice: authored runtime boss portraits for the shipped bodega-era bosses
- Phase 5 relocation surfacing slice: management-panel relocation readiness plus player-facing interruption entry and decision copy
- relocation runtime, carryover/reset contract, guidance retirement, and save-safe handoff into Porter's
- Porter's core destination slice: multi-floor landing, starter rooms, upgrade path, prep-room consumables, and first-pass tuning

Still active closeout work:

- promotion-grade relocation and Porter's landing verification on a real late-bodega path, plus any defects exposed by that pass
- promotion review against the closed bodega baseline
- remaining breadth expansion only where the promotion review still shows that repeated bodega campaigns are too narrow

No longer tracked here as active implementation:

- the relocation runtime itself
- the Porter's core entry slice

## Prerequisites

Do not start this plan until these plans have working first passes:

1. the canonical opening campaign path
2. the first standing management policy surfaces
3. the first-pass economy harness

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/presentation.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/content-rules.md`

## Locked Decisions

- The bodega stays a bodega.
- No training rooms in the bodega.
- No dedicated infirmary, lounge, or second-headquarters room identities in the bodega.
- Progression is about recruitment, curation, room support, staff support, and contract choice, not grinding rank-ups.
- Relocation is a narrative and systemic milestone, not a silent capacity upgrade.

## Phase 1: Finish The Building Arc

Owner: gameplay/data

Tasks:

1. Implement the full three-beat bodega upgrade path:
   - Frontage
   - Annex
   - Backyard Extension
2. Define what each upgrade changes in room slots, pressure capacity, and support surfaces.
3. Ensure each upgrade solves a named early-game problem instead of only raising numbers.

Done when:

- A campaign can progress through the full bodega building arc and every beat changes the management loop.

## Phase 2: Add Bodega-Native Support Rooms

Owner: gameplay/content

Tasks:

1. Add the first intel or admin room surface before any consumable-prep work.
2. Choose the next support rooms from bodega-native hybrid roles only:
   - back office
   - backstock room
   - gear bench
   - alley staging
3. Wire each room into existing systems with clear room effects, staffing hooks, and event-log feedback.

Done when:

- Contracts, staffing, gearing, and recovery pressure all have real facility surfaces inside the bodega.

## Phase 3: Close Roster And Staffing Pressure

Owner: gameplay/systems

Tasks:

1. Enforce hard bodega-era roster-cap rules.
2. Ship the required overflow actions:
   - defer
   - reject
   - replace
   - dismiss
3. Add any lightweight reserve state only if active-versus-gone proves too binary in playtest.
4. Ensure staffing assignments create real bottleneck tradeoffs instead of passive bonuses that rarely matter.

Done when:

- Recruit quality and visitor flow improve curation pressure rather than silently inflating roster size.

## Phase 4: Expand Early Content Within Locked Budgets

Owner: content/assets

Tasks:

1. Expand F, E, and D recruits, items, sites, enemy families, and bosses using the balance ledgers from the harness plan.
2. Prioritize the places where repeated campaigns feel repetition first:
   - recruit identities
   - portrait recipes or parts
   - site concepts
   - bosses
   - viable gear alternatives
3. Treat site concepts and bosses as paired content. Do not ship or generate a raid site unless its attached `bossId` and matching boss template are already defined.
4. Ship approved unique encounter portrait SVGs for each shipped bodega-era boss, and wire every shipped `bossId` to authored art so boss commitment and encounter surfaces do not fall back to generic threat sigils.
5. Keep generated flavor inside the world foundation and keep gameplay budgets inside authored tables.

Done when:

- Repeated bodega campaigns no longer collapse into the same few faces, sites, loadouts, and boss presentations.
- Every shipped bodega-era boss resolves to approved encounter art in runtime.

## Phase 5: Ship The Relocation Gate

Owner: gameplay/design

Tasks:

1. Define the explicit relocation trigger.
2. Verify that the trigger requires:
   - the full building arc
   - visible roster and staffing strain
   - sufficient treasury and reputation
   - proof that the player has already experienced the intended management loop
3. Implement the relocation event and handoff contract for the next headquarters tier once that tier is actually locked.

Done when:

- The bodega has a clean end state and no longer feels like an open-ended sandbox.

Status:

- Implemented. The relocation trigger, blockers, handoff sequence, Porter's landing state, and save-safe carryover/reset contract are shipped.
- Remaining work for this area is browser-grade verification and any defects found there, not new relocation design.

## Phase 6: Promotion Review

Owner: cross-discipline review

Tasks:

1. Run direct simulation, browser verification, and manual play against the closed bodega.
2. Check whether the campaign delivers:
   - a sparse readable opening
   - repeated recruit, gear, room, and staffing decisions
   - meaningful setback recovery
   - a credible relocation ending
3. Promote the bodega only when campaign quality is stable, not when raw content counts alone are high enough.

Done when:

- second-headquarters work can start from a closed early-game baseline instead of a moving target.

## Parallel Rules

- Phase 1 and Phase 3 can overlap once prerequisites are met.
- Phase 4 may run in parallel with late Phase 2, but content must consume locked balance tables.
- Do not solve missing management depth by importing second-headquarters room identities into the bodega.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.
