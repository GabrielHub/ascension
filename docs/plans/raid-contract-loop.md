# Raid Contract Loop

Execution brief for closing the gap between the current autonomous raid runtime and the intended guild-contract loop.

## Why This Exists

The current runtime already supports one active contract site, autonomous raid team formation, repeated runs into the same dungeon, boss commitment, contract loss, and contract closure. What it does not provide is the explicit "raid ends, guild bids the next job" loop the game needs before broader expansion work.

This brief keeps the current one-active-contract scope, but replaces automatic contract replacement with a lightweight post-contract bidding flow.

## Current Implementation Snapshot

- The runtime auto-secures a random contract whenever no active contract exists.
- A contract remains active until `bossDefeated` or `contractLost`.
- Raid opportunities are spawned from the current contract site and claimed autonomously by operators.
- The player currently has no contract-selection action, no post-contract summary state, and no explicit rebid downtime.
- Rival-guild simulation does not exist and should not be introduced here.

## Target Slice

Ship the smallest complete loop that makes contracts feel deliberate:

1. A contract ends.
2. The game surfaces a contract-result state instead of silently swapping to a new site.
3. A small board of replacement contracts is generated.
4. The player chooses one contract to bid on.
5. The selected contract becomes the new active dungeon.

The first shipped bid flow should be explicit, legible, and lightweight. It does not need live rival rosters, multi-round auctions, or borough politics yet.

## Product Rules For This Plan

- Keep one secured contract at a time.
- Preserve simulation ownership of contract state.
- Do not move raid-team launch decisions into the UI.
- Do not add a full rival-guild simulation layer.
- Do not let the router or presentation layer own contract progression.

## Proposed Runtime Shape

Add an explicit contract lifecycle instead of inferring everything from `contractSite`:

- `idle`: no secured contract, waiting for a board.
- `bidding`: replacement contracts are posted and the player must choose one.
- `active`: the current secured contract site is live.
- `resolved`: the prior contract just ended and its summary is available until the player advances.

Add a lightweight posted-contract record:

- `postingId`
- `missionId`
- `siteConceptId`
- `location`
- `rank`
- `threat`
- `intel`
- `reward`
- `bidCost`
- `minReputation`
- `generatedAtTick`

Keep `contractSite` as the authoritative active site only. Posted contracts should live beside it, not inside it.

## Scope To Implement Now

### 1. Contract resolution handoff

- When `bossDefeated` or `contractLost` is set, stop auto-securing the next contract on the following tick.
- Persist the final contract result in a short-lived summary payload.
- Clear or archive site-specific transient state that should not bleed into the next dungeon: fog, active presentation markers, pending raid opportunities, and any site-only counters.
- Enter an explicit inter-contract state instead of hard-cutting straight into the next dungeon.

### 1a. Inter-contract downtime

The game should have downtime between dungeons, but it should be operational downtime rather than a dead screen or forced time skip.

- Recommended: keep HQ simulation running normally while no contract is secured.
- Raids are paused because there is no active contract, not because time itself is frozen.
- This gives the player a natural window to review injuries, inventory, morale, staffing pressure, and the contract board.
- Do not force an automatic multi-day skip in the first pass.

### 2. Contract board generation

- Generate 3 posted contracts when the guild enters `bidding`.
- Bias early boards toward F and E rank work.
- Use current reputation and treasury to gate which contracts can appear, but do not require the player to understand hidden formulas.
- Pull location, mission objective, and site concept from authored data rather than inventing them ad hoc in the system.

### 3. First bid interaction

- Add one player command: "submit bid on posting".
- The first implementation should be deterministic and forgiving:
  - Recommended: choosing a posting always secures it if the guild meets its requirements.
  - Optional: charge a small bid filing cost or reserve a treasury amount.
- Treat deeper contested bids as later follow-up work.

### 4. Operations UI flow

- Replace the current "No secured contract" empty state with a contract board when the guild is in `bidding`.
- Show the previous contract result above the board until the player commits to the next one.
- Keep the panel language operational: contract, site, reward, intel, rank, filing cost.
- Do not present operator raid opportunities until a contract is secured.

### 4a. Required UI stages

The loop needs explicit presentation for each contract stage:

- `active contract`: current site summary, live raid map, raid history within the active contract
- `boss defeated`: victory summary, payout, recovered loot, roster fallout, next-contract call to action
- `contract lost`: failure summary, penalties, roster fallout, next-contract call to action
- `bidding`: posted contracts board with comparison data
- `between contracts`: same board plus HQ-side readiness context

The first pass should reuse the current operations shell and interruption patterns rather than introducing a separate navigation mode.

### 4b. Downtime UI rules

- The end-of-contract summary should feel like a deliberate operational beat, not a toast buried in the event rail.
- Use a blocking modal or a dedicated operations-state surface for boss defeat and contract loss, consistent with the interruption contract already used for boss commitment.
- Once the player dismisses the result, the operations tab should land in the bidding board, not a blank state.

### 5. Save/load and migration

- Save contract lifecycle state, posted contracts, and the pending result summary.
- Migrate existing saves safely:
  - Active contract saves stay active.
  - Saves with no contract site should enter `bidding` with a generated board.

## Deliberately Deferred

- Rival guilds visibly outbidding the player
- Multi-round auctions
- Borough politics and institutional favoritism
- Contract penalties beyond the current early-loss reputation hit
- Negotiation UI or contract clause editing

## Suggested Implementation Order

1. Add runtime state and save schema for contract lifecycle plus posted contracts.
2. Replace `ensureContractSite` auto-replacement with lifecycle-aware generation.
3. Add a simulation command for securing a posted contract.
4. Wire the operations panel to show the contract-result and bidding surfaces.
5. Add tests for end-of-contract transitions, board generation, bid selection, and save/load.

## Acceptance Criteria

- Finishing or losing a contract no longer silently rolls into a random replacement.
- The player must deliberately choose the next contract before raids resume.
- The game still supports only one active secured contract at a time.
- Existing autonomous raid behavior inside an active contract still works.
- Save/load preserves the contract board and pending contract result.

## Test Coverage Needed

- Contract completion enters `resolved` then `bidding`
- Contract loss enters `resolved` then `bidding`
- Selecting a posting creates a fresh `contractSite` and resets site-specific transient state
- No raid opportunities spawn while the guild is in `bidding`
- Runtime snapshots and saves round-trip the new contract state
