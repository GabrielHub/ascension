# Economy And Balance Harness Plan

This is the third active implementation plan. It makes the early campaign economy inspectable, tunable, and cheap to verify before content expansion accelerates.

## Start In Parallel, Finish After The Opening Path Locks

Static ledger work can start immediately. Target envelopes, deterministic campaign runs, and browser verification should use the canonical opening path from `opening-campaign-remediation-plan.md`.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/content-taxonomy.md`
- `docs/plans/opening-campaign-remediation-plan.md`

## Locked Decisions

- Balance is owned by authored tables plus deterministic simulation.
- Browser autoplay is the verification layer, not a second gameplay engine.
- AI may summarize metrics later; it must not become hidden balancing authority.

## Phase 1: Build Static Ledgers

Owner: systems/tools

Tasks:

1. Export current early-game sources and sinks into inspectable machine-readable ledgers.
2. Cover at least:
   - storefront income
   - contract payouts
   - loot-sale conversion
   - payroll
   - bid costs
   - upgrade costs
   - treatment or repair costs
   - incident treasury deltas
3. Add a human-readable report for quick review.

Done when:

- A reviewer can inspect the early-game economy without reading scattered templates by hand.

## Phase 2: Lock Target Envelopes

Owner: design/systems

Deliverable: [Economy Target Envelope](./economy-target-envelope.md)

Tasks:

1. Define the target early-game economy shape:
   - one bad contract hurts but usually does not end the run
   - two bad contracts force adaptation
   - successful runs relocate in the intended time band
2. Define metrics for treasury flow, payroll burden, upgrade timing, recruit acceptance, casualty pressure, and deadlock rate.
3. Define explicit pass or fail thresholds for opening stability and relocation pacing.

Done when:

- The harness has promotion thresholds instead of vague expectations.

## Phase 3: Add Direct Deterministic Simulation

Owner: systems/test infrastructure

Tasks:

1. Add seeded campaign simulation against ECS and command surfaces.
2. Capture metrics for treasury flow, contract outcomes, roster pressure, upgrade timing, and collapse rate.
3. Make large sample sizes cheap enough to run during routine iteration.

Done when:

- Balance changes can be evaluated across many seeds without relying on full browser sessions.

## Phase 4: Add Browser Verification

Owner: QA/automation

Tasks:

1. Add seeded browser scenarios for the canonical early campaign path.
2. Capture the same broad metrics the direct simulation reports.
3. Compare browser results against the direct-simulation envelope and investigate major drift.

Done when:

- The team can tell whether a balance change broke the actual player path rather than only the direct simulation.

## Parallel Rules

- Phase 1 can start before management policies are complete.
- Phase 2 should use the canonical opening path, not the preview bootstrap.
- Do not freeze final percentages in prose. Freeze the envelope and the table schema first.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.
- Store browser automation artifacts under `playwright/`.
