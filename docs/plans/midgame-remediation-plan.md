# Midgame Remediation Plan

This plan is the immediate follow-through after the shipped Phase 4 Porter's-era expansion work. The goal is not to add another breadth-first feature slice. The goal is to verify, balance, and tune the shipped midgame until it behaves like a stable production band instead of a first-pass accumulation of systems.

## Goal

Treat the Porter's-era D-rank layer as the current product baseline and tighten it through:

- deeper browser verification of the canonical midgame loop
- deterministic balance and economy inspection
- readability and usability remediation where the management layer is hard to parse
- balance-table tuning for rewards, blockers, pacing, and pressure

Midgame is considered remediated when the shipped Porter's loop is covered by meaningful regression surfaces and its core D-rank economy and pacing sit inside an explicit tuned envelope.

## Canon Inputs

- `docs/roadmap.md`
- `docs/product/index.md`
- `docs/product/gameplay-systems.md`
- `docs/product/presentation.md`
- `docs/world/index.md`
- `AGENTS.md`

## Existing Verification Surface

- `playwright/porters-upgrade-campaign.browser.test.ts`
- `sim/tools/midgame-economy-ledger.ts`
- `sim/tools/midgame-economy-ledger.test.ts`
- encounter and incident runtime/system tests already in `sim/systems/*`
- the typed dev command console for browser-safe setup

## Planned File Targets

- `playwright/porters-upgrade-campaign.browser.test.ts`
- `sim/tools/midgame-economy-ledger.ts`
- `sim/tools/midgame-economy-ledger.test.ts`
- focused runtime/system tests under `sim/systems/`
- UI/runtime files only where a verified midgame readability or behavior defect requires a fix

## Required Remediation Work

### 1. Expand Canonical Browser Coverage

- Cover the player-facing Porter's contract loop, not just isolated commands:
  - upgrade path and room unlocks
  - contract bidding into active contract
  - briefing/staging effects
  - workshop/crafting interaction
  - incident/interruption handling
  - encounter handoff and at least one intervention use
- Prefer one or two strong browser scenarios over many brittle narrow scripts.
- Use the dev command console only as a setup accelerator where the browser flow would otherwise be too slow or too noisy.

### 2. Tighten Deterministic Midgame Reporting

- Extend the midgame economy ledger or add nearby deterministic reporting so the remediation pass can inspect:
  - craft-time cash sinks
  - material sourcing pressure
  - raid reward output
  - market fallback value versus crafted output
  - any obvious D-rank payout spikes or starvation pockets
- Keep the output machine-checkable and suitable for checked-in tests.

### 3. Tune The D-rank Envelope

- Review and tune balance-owned authored tables rather than adding new systems:
  - contract payout and reward pacing
  - drop-table output and rare-material flow
  - recipe cash costs and blockers
  - recovery/training/staging payoff where it affects the Porter's loop
  - recruit quality or contract pressure weights if deterministic reports show midgame collapse or runaway
- Keep tuning inside the shipped Porter's D-rank era. Do not pull in later-tier progression to compensate for unresolved midgame pacing.

### 4. Fix Midgame Readability Debt

- Remediate verified UX issues that make the management layer hard to read in browser play:
  - contract-board readability
  - workshop blocker clarity
  - interruption/event-log legibility
  - encounter-to-operations handoff clarity
  - management summaries that hide too much of the real state
- Fix only issues demonstrated by browser/runtime verification. Do not reopen broad UI redesign work.

## Verification

- `vp check`
- `vp test`
- `vp build`
- browser coverage for the canonical Porter's loop, assuming the dev server is already running
- rerun deterministic midgame report tests after any balance-table changes

## Exit Criteria

- the Porter's-era loop has meaningful browser regression coverage across contracts, workshop use, incidents, and encounter handoff
- deterministic reports make the D-rank economy envelope inspectable instead of implicit
- the tuned midgame no longer shows obvious reward starvation, runaway payouts, or workshop irrelevance in its first-pass reports
- the shipped management surfaces are legible enough that the next headquarters tier does not have to solve unresolved Porter's-era UX debt
- no new mechanics or later-tier content were introduced as a substitute for remediation
