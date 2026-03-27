# Early Campaign Deterministic Simulation Report

Canonical opening-path headless simulation across 24 seeds using ECS runtime commands and no browser dependency.

## Run Envelope

- Seeds: 1 to 24
- Contract limit per run: 8
- Tick size: 60 in-game minutes
- Completed runs: 22/24
- Deadlock rate: 0%
- Collapse rate: 0%
- Stall rate: 8.33%
- Mean final treasury: $5543.13

## Outcome Distribution

- Realized cycle mix: 0% success, 85.95% mixed, 14.05% failure
- Inferred scenario buckets: 0% skilled, 4.17% average, 95.83% struggling

## Threshold Summary

- M1 Treasury Flow: 0% pass, 0% out-of-band, 100% fail, 0% n/a
- M2 Payroll Burden: 41.67% pass, 41.67% out-of-band, 16.67% fail, 0% n/a
- M3 Upgrade Timing: 0% pass, 100% out-of-band, 0% fail, 0% n/a
- M4 Recruit Acceptance: 0% pass, 0% out-of-band, 100% fail, 0% n/a
- M5 Casualty Pressure: 0% pass, 0% out-of-band, 100% fail, 0% n/a
- M6 Deadlock Rate: 100% pass, 0% out-of-band, 0% fail, 0% n/a
- M7 Opening Stability: 0% pass, 0% out-of-band, 100% fail, 0% n/a
- M8 Relocation Pacing: 0% pass, 83.33% out-of-band, 0% fail, 16.67% n/a

## Watch Items

- Payroll burden stress: pass (Mean opening payroll burden is 157.96% against a 130%-180% target band.)
- Loot sell variance: pass (Loot variance share proxy is 0.57% of final treasury variance. The watch threshold is 20%.)
- Incident mercy window: pass (No seeded run surfaced a non-opening-safe incident category inside the first three contracts.)
- Injury pressure with no treatment cost: fail (Direct treatment spend remains zero in all runs. Injury pressure is measured through downtime, deployability, and collapse pressure only.)
- Relocation readiness: out_of_band (Relocation readiness was reached inside the Phase 3 window, which is earlier than the Phase 2 pacing table expects.)

## Timing Milestones

- First income upgrade affordable: 0 (out_of_band)
- First income upgrade purchased: 1 (out_of_band)
- First recruit accepted: 0 (pass)
- First boss contact: n/a (not_measurable)
- First boss clear: 1 (pass)

## Scenario Rates

| Scenario Bucket | No Deadlock | Treasury > $50 After 3 Contracts | Deployable >= 2 After 3 Contracts |
| --------------- | ----------: | -------------------------------: | --------------------------------: |
| Skilled         |          0% |                               0% |                                0% |
| Average         |        100% |                             100% |                                0% |
| Struggling      |        100% |                             100% |                                0% |

## Findings

- The cheapest income upgrade is affordable before the contract-2 target window. Starting treasury currently overshoots the Phase 2 pacing assumption.
- The first income upgrade is being purchased earlier than the contract-3 target. Guidance gating delays purchase, but not enough to keep it inside the envelope.
