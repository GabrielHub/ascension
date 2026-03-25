# Raid Rank And Dungeon Pool

Execution brief for making raid pacing, reward quality, and dungeon breadth match the intended rank-based loop.

## Why This Exists

The current slice has enough raid runtime to prove the loop, but not enough progression logic to carry expansion:

- all shipped mission combat profiles are F-rank
- there are only three mission templates
- site completion speed is effectively fixed by mission duration
- stronger operators can improve outcomes, but they do not clear weak dungeons much faster
- rewards are better than before, but they are not yet clearly anchored to contract rank progression

Before adding more buildings or broader systems, the raid backbone needs explicit rank pacing and a wider early contract pool.

## Current Implementation Snapshot

- Mission duration is fixed by `baseDurationHours`.
- Raid reveal progress is derived from elapsed time, not team power.
- Contract threat, intel, and reward are scalar values generated from mission plus guild state.
- Boss defeat is still coupled to generic raid success plus high site reveal rather than purely to real boss clearance.
- Loot uses mission combat profiles and drop tables, which is a solid base to build on.
- Intel and risk exist, but they are still relatively flat scalar inputs rather than a legible planning layer the player can act on.

## Target Slice

Make dungeon progression obey three player-facing truths:

1. Equal-rank operators should clear equal-rank dungeons at a steady expected pace.
2. Overqualified operators should clear weak dungeons much faster.
3. Better dungeons should give clearly better rewards.

## Product Rules For This Plan

- Dungeon difficulty should be owned by runtime data, not implied only by copy.
- Rank should matter to pace as well as success chance.
- Boss defeat should ultimately mean the boss was actually cleared.
- Reward scaling should stay legible and data-backed.
- Early breadth should come from authored content, not procedural placeholders.

## Scope To Implement Now

### 1. Add explicit contract/site rank

Introduce an explicit rank field on posted contracts and active contract sites.

- Start with F and E for the bodega slice.
- Derive threat, reward, and recommended team expectations from that rank band.
- Keep numeric threat as a finer-grained sub-value inside the rank band, not as the only progression signal.

### 2. Make pace team-power-sensitive

Replace purely fixed clear pacing with a rank-aware duration model.

Recommended approach:

- keep authored `baseDurationHours` as the neutral baseline for an equal-rank team
- compute a site challenge score from contract rank, mission profile, and boss profile
- compute a team pressure score from derived combat power, readiness, cohesion, and key weakness matches
- convert that ratio into:
  - travel/exploration pace
  - reveal gain per hour
  - chance to escalate into a boss attempt earlier

This should produce the intended feel:

- F team vs F site: usually 2-3 runs before the dungeon closes
- E or D team vs F site: often 1-2 runs
- A or S operator anchored into an F site: usually one fast decisive run

The exact numbers can move during tuning, but the relative pacing should hold.

### 3. Separate site progress from generic raid result

The current loop needs a clearer model for "raid succeeded" versus "dungeon got cleared."

Add site-level progress values such as:

- `explorationProgress`
- `bossIntelProgress`
- `bossPressureProgress`
- `bossAvailable`

Then tighten closure rules:

- ordinary raid success advances site progress and yields loot/cash
- committed boss victory clears the dungeon
- non-boss success should not claim boss defeat by default

### 4. Expand the early contract pool

Increase early-game breadth without waiting for full Phase 3 content.

Minimum recommended first pass:

- 6-8 early site concepts
- at least 2 objective variants per common early rank band
- multiple neighborhoods so the board does not feel recycled immediately

Use authored site concepts backed by `docs/world/` and reuse the current objective families where helpful:

- clearance
- containment
- extraction

This should expand the board primarily through different site concepts, rank bands, threat mixes, and reward tables rather than by inventing many new mechanics at once.

### 5. Make reward quality rank-sensitive and theme-sensitive

Reward scaling should move through both contract payout and loot tables.

Add:

- contract-rank cash multipliers
- contract-rank reputation multipliers
- rank-filtered or rank-weighted drop tables
- better gear quality and rarer part bundles on higher-rank sites
- dungeon-concept-themed monster-part families
- dungeon-concept-themed gear families or affix groups where appropriate

The player should be able to see the progression:

- weak sites are safer, cheaper, and less lucrative
- stronger sites are riskier but materially better for growth
- different sites at the same rank still feel worth choosing because their rewards point toward different loot families and gear identities

### 6. Turn intel and risk into real gameplay levers

Intel and risk should matter before, during, and after contract selection.

Add first-pass rules such as:

- higher intel narrows uncertainty on contract reward, enemy profile, and boss tags
- low intel increases hidden variance and ambush/hazard pressure
- scouts and intel-oriented teams can accelerate site understanding during raids
- contract risk should affect expected injuries, retreat pressure, and contract-loss pressure
- some bosses or site traits should resist intel, reducing those planning advantages

The first implementation does not need a huge planning minigame. It does need enough mechanical effect that choosing a high-risk low-intel site feels different from choosing a safer better-understood one.

## Suggested Data Changes

- Add site concept templates separate from mission objective templates
- Add rank metadata to contract postings and active sites
- Add reward-tier or drop-table bands keyed by rank
- Add intel-surface fields to site templates, such as visible-known traits versus hidden traits
- Keep mission templates for objective behavior; use site templates for dungeon identity and progression rewards

## Suggested Implementation Order

1. Add explicit rank to contract posting and active contract data.
2. Remove unconditional boss-defeat tagging from generic successful raid resolution.
3. Add site-progress state and make boss clearance depend on real boss victory.
4. Convert reveal/return pacing from fixed-time only to challenge-versus-team scaling.
5. Expand authored early site templates, themed reward bands, and concept-linked loot families.
6. Make intel and risk alter expected outcomes in debug-visible ways.
7. Tune the first pass with deterministic tests and debug-visible balance outputs.

## Deliberately Deferred

- C-S rank live content breadth
- fully simulated rival demand on specific dungeon concepts
- elite/miniboss ecosystems beyond the current boss encounter model
- market/crafting rework tied to rare materials

## Acceptance Criteria

- The active contract has an explicit rank.
- Equal-rank teams clear equal-rank sites at a predictable average pace.
- Stronger teams clear weak sites materially faster than weak teams do.
- A dungeon closes because the boss is actually cleared or the contract is lost.
- Higher-rank contracts produce clearly better cash and loot outcomes.
- Site theme materially affects the loot families and gear families offered by that contract.
- Intel and risk influence outcomes enough that contract choice is a real planning decision.
- The early board has enough site variety that repeated bidding does not immediately feel identical.

## Test Coverage Needed

- Team-power advantage reduces expected completion time
- Weak teams on stronger sites progress slowly and fail more often
- Generic successful raids no longer mark the boss defeated automatically
- Boss victory closes the dungeon
- Higher-rank contracts roll better reward bands and drop pools
- Different site concepts roll different loot families
- Intel and risk materially change projected and actual outcomes
- Early contract generation can produce multiple distinct authored site concepts
