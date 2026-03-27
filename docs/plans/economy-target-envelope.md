# Early-Game Economy Target Envelope

Phase 2 deliverable for `economy-and-balance-harness-plan.md`. Defines the target economy shape, metric definitions, and explicit pass/fail thresholds for the canonical opening campaign.

These envelopes are promotion gates for Phase 3 deterministic simulation. A seeded run that falls outside the defined bands is a balance regression.

## Canon Inputs

- Starting state: `docs/plans/opening-campaign-spec.md`
- Static ledger: `reports/economy/early-campaign-ledger.v1.json`
- Economy constants: `sim/systems/economy-constants.ts`, `sim/systems/contract-economy.ts`

## Design Principles

1. **One bad contract hurts but usually does not end the run.** A single failure should cost roughly 15–20% of starting treasury in direct loss plus opportunity cost. The player is set back, not stuck.
2. **Two bad contracts force adaptation.** Two consecutive failures should consume 30–40% of starting treasury and delay upgrades or recruitment. The player must reprioritize, not continue on autopilot.
3. **Successful runs relocate in the intended time band.** The early economy trajectory must sustain long-term growth toward relocation readiness without requiring perfect play.

## Reference State

| Parameter                | Value                                       |
| ------------------------ | ------------------------------------------- |
| Treasury                 | $400                                        |
| Reputation               | 0                                           |
| Active operators         | 4                                           |
| Active staff             | 2                                           |
| Daily storefront income  | $50                                         |
| Daily payroll            | $81 (4 ops × $12 + $18 Aina + $15 Boris)    |
| Daily net (no contracts) | -$31                                        |
| Mission base durations   | 4h Containment, 5h Extraction, 6h Clearance |

## Contract Cycle Model

One contract cycle: board → bid → deploy → raid(s) → result → board.

| Parameter                    | Value         | Rationale                                                                                                             |
| ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Reference cycle length       | 1.0 game-day  | Min ~0.75 days (fast clean run), max ~2.0 days (moderate injury + rest). 1.0 is the modeling baseline.                |
| Raids per contract (typical) | 1             | Opening-arc contracts primarily resolve through a single deployment. Some may produce 2. Envelope uses 1 as baseline. |
| Boss encounter window        | Contracts 7–8 | Boss contact requires cumulative contract progression. Boss completion bonus applies once per contract clear.         |

## Outcome Distribution Scenarios

Three reference distributions for trajectory analysis. These are design targets for Phase 3 validation, not predictions.

| Scenario   | Success      | Mixed  | Failure | Profile                                       |
| ---------- | ------------ | ------ | ------- | --------------------------------------------- |
| Skilled    | 6 of 8 (75%) | 1 of 8 | 1 of 8  | Good team comp, well-equipped, upgrades early |
| Average    | 4 of 8 (50%) | 2 of 8 | 2 of 8  | Learning curve, occasional mistakes           |
| Struggling | 2 of 8 (25%) | 3 of 8 | 3 of 8  | Poor preparation, repeated setbacks           |

## Per-Cycle Cash Flow

Derived from Phase 1 ledger, averaged across the three F-rank missions (Clearance, Containment, Extraction).

| Source                              | Success   | Mixed    | Failure  |
| ----------------------------------- | --------- | -------- | -------- |
| Contract raid reward (avg midpoint) | +$119     | +$65     | -$29     |
| Loot sell value (expected)          | +$59      | +$22     | $0       |
| Bid cost (avg)                      | -$9       | -$9      | -$9      |
| Storefront income (1 day)           | +$50      | +$50     | +$50     |
| Payroll (1 day, base roster)        | -$81      | -$81     | -$81     |
| **Net per cycle**                   | **+$138** | **+$47** | **-$69** |

Boss completion bonus: $138–$212 (avg $175), applied once during contracts 7–8 on top of the normal cycle.

## Trajectory Projections

### 8-Contract Opening Arc (Treasury After Contract 8)

| Scenario              | Contract Income | Boss Bonus | Incident Cost | 1 Upgrade | Final Treasury |
| --------------------- | --------------- | ---------- | ------------- | --------- | -------------- |
| Skilled (6S/1M/1F)    | +$831           | +$175      | -$50          | -$90      | ~$1,266        |
| Average (4S/2M/2F)    | +$508           | +$175      | -$50          | -$90      | ~$943          |
| Struggling (2S/3M/3F) | +$69            | +$0        | -$40          | $0        | ~$429          |

Struggling scenario assumes no boss clear and defers upgrade.

### Critical Moment: Two Consecutive Failures From Start

| After                | Treasury | Status                                                     |
| -------------------- | -------- | ---------------------------------------------------------- |
| Contract 1 (fail)    | $331     | Hurt. First upgrade deferred.                              |
| Contract 2 (fail)    | $262     | Cannot afford cheapest upgrade. Must prioritize contracts. |
| Contract 3 (success) | $400     | Recovered to starting level. Still behind on progression.  |
| Contract 3 (mixed)   | $309     | Viable but tight. Upgrade still deferred.                  |

Treasury stays above the critical floor ($50) through 5 consecutive failures ($400 → $331 → $262 → $193 → $124 → $55). Matches design principle 1.

---

## Metric Definitions and Thresholds

### M1: Treasury Flow

**Definition:** Net treasury delta per contract cycle: `treasury_after - treasury_before`.

| Condition                                     | Pass    | Fail    |
| --------------------------------------------- | ------- | ------- |
| Success cycle net                             | ≥ +$100 | < +$70  |
| Mixed cycle net                               | ≥ +$20  | < -$10  |
| Failure cycle net                             | ≥ -$90  | < -$120 |
| Mean cycle net, Average scenario, 8 contracts | ≥ +$40  | < $0    |

A success cycle must always produce positive net cash flow. A failure cycle must not exceed one day of full-roster payroll in total loss. If the Average scenario trends negative over the opening arc, the economy is fundamentally broken.

### M2: Payroll Burden

**Definition:** `daily_payroll / daily_gross_income` as a percentage. Gross income is storefront plus upgrade-driven income.

| Phase                                                 | Target Band | Fail             |
| ----------------------------------------------------- | ----------- | ---------------- |
| Opening (contracts 1–3, no upgrades)                  | 130%–180%   | > 200% or < 100% |
| Mid-arc (contracts 4–6, 1+ income upgrade)            | 110%–165%   | > 185%           |
| Late arc (contracts 7–8, 2+ income upgrades possible) | 100%–155%   | > 175%           |

The guild must always be contract-dependent. Payroll should always exceed passive income during the bodega phase. If payroll burden drops below 100%, the player has no urgency to run contracts. If it exceeds 200%, the daily bleed is too fast for players to manage between contracts.

### M3: Upgrade Timing

**Definition:** Contract number when treasury first reaches the cost of the cheapest available upgrade.

| Metric                                             | Target Band    | Fail                                                          |
| -------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| First upgrade affordable, Average scenario         | Contracts 2–4  | Not affordable by contract 5                                  |
| First upgrade purchased, Average scenario          | Contracts 3–5  | Not purchased by contract 6                                   |
| All 3 income upgrades affordable, Skilled scenario | Contracts 8–15 | Before contract 6 (too cheap) or after contract 20 (too slow) |

Records Wall ($90) is the cheapest income upgrade. After 1 success from the start ($400 + $138 = $538), the player can comfortably afford it. After 1 mixed result ($400 + $47 = $447), it is still affordable. The upgrade timing matches the guidance beat (beat 11, contracts 3–5).

Income upgrade payback periods are long relative to the opening arc (15–27 days). This is acceptable — upgrades teach investment thinking during the opening, and their payback falls within the broader bodega arc.

### M4: Recruit Acceptance

**Definition:** Whether recruiting a visitor is economically viable without pushing treasury below the critical floor ($50) within 2 subsequent contract cycles.

| Metric                                        | Target                       | Fail                     |
| --------------------------------------------- | ---------------------------- | ------------------------ |
| First recruit affordable, Average scenario    | By contract 3                | Not viable by contract 4 |
| Payroll increase per recruit                  | $12/day (+15% of base gross) | > 20% of gross income    |
| Post-recruit treasury floor after 2 contracts | > $50                        | < $50                    |

Recruitment has no signing cost — the expense is ongoing payroll (+$12/day per operator). Recruiting 1 operator raises payroll from $81 to $93, moving the daily net from -$31 to -$43. This tightens the margin but remains viable if the player is completing contracts.

At the starting roster of 4, the medic (Jin) is irreplaceable. Recruiting Nika (visiting medic, available from start) should be a viable early decision, not an unaffordable luxury.

### M5: Casualty Pressure

**Definition:** Economic cost of operator injury, measured as lost cycle productivity during recovery downtime.

| Injury Severity  | Recovery Time    | Economic Cost (opportunity) | Notes                                            |
| ---------------- | ---------------- | --------------------------- | ------------------------------------------------ |
| Minor (1–25)     | 4–8 game-hours   | < 0.5 cycles (~$69)         | Absorbable within normal rhythm                  |
| Moderate (26–50) | 12–24 game-hours | 0.5–1.0 cycles (~$69–$138)  | Benches operator for a full cycle                |
| Severe (51+)     | 24–48 game-hours | 1.0–2.0 cycles (~$138–$276) | Real roster crisis with 4-person starting roster |

| Condition                            | Pass                                        | Fail                     |
| ------------------------------------ | ------------------------------------------- | ------------------------ |
| Minor injury recovery                | < 1 full contract cycle                     | > 1 cycle                |
| 1 moderate injury, 4-operator roster | Team can still deploy (min viable team = 2) | Team cannot deploy       |
| 2 concurrent moderate injuries       | Forces 2-person team at higher risk         | Complete deployment lock |

The current economy has no per-injury treasury sink — recovery is purely time-based. If a direct treatment cost is added later, the failure penalty effectively increases and this metric must be re-evaluated.

### M6: Deadlock Rate

**Definition:** Percentage of simulated runs reaching an unwinnable state: `treasury < minimum_bid_cost ($7) AND no sellable inventory AND daily_net < 0`.

| Scenario   | Maximum Deadlock Rate |
| ---------- | --------------------- |
| Skilled    | 0%                    |
| Average    | < 2%                  |
| Struggling | < 10%                 |

| Condition                                         | Pass  | Fail  |
| ------------------------------------------------- | ----- | ----- |
| Consecutive failures to reach deadlock from start | ≥ 5   | < 4   |
| Average-scenario deadlock in first 4 contracts    | 0%    | > 0%  |
| Sellable starting inventory buffer                | ≥ $40 | < $20 |

**Current safety analysis:** Starting treasury ($400) survives 5 consecutive failures ($400 → $331 → $262 → $193 → $124 → $55). Starting inventory (5 items, est. $54 sell value) provides additional buffer. The current values are robust against deadlock.

### M7: Opening Stability

**Definition:** Probability that the run is viable after the first 3 contracts. Viable means treasury > $50 and roster ≥ 2 deployable operators.

| Metric                                                | Pass          | Fail  |
| ----------------------------------------------------- | ------------- | ----- |
| Treasury > $50 after 3 contracts, Average scenario    | > 95% of runs | < 90% |
| Treasury > $50 after 3 contracts, Struggling scenario | > 80% of runs | < 70% |
| Roster ≥ 2 deployable after 3 contracts               | > 99% of runs | < 95% |

**Trajectory validation:**

| First 3 outcomes              | Final treasury | Status                      |
| ----------------------------- | -------------- | --------------------------- |
| 3 success                     | $814           | Comfortable                 |
| 2 success, 1 failure          | $607           | Solid                       |
| 1 success, 1 mixed, 1 failure | $516           | Viable                      |
| 1 mixed, 2 failure            | $309           | Tight but above floor       |
| 3 failure                     | $193           | Stressed but not deadlocked |

All scenarios stay above the $50 critical floor through 3 contracts. The first 3 contracts appear robust.

### M8: Relocation Pacing

**Definition:** Contract count at which a run reaches relocation-readiness. Relocation prerequisites are proposed pending final gate design.

**Proposed relocation prerequisites:**

| Requirement        | Threshold           | Rationale                                             |
| ------------------ | ------------------- | ----------------------------------------------------- |
| Reputation         | ≥ 40                | Unlocks C-rank contracts, proves sustained competence |
| Upgrades purchased | ≥ 3 income upgrades | Bodega is "improved"                                  |
| Active roster      | ≥ 6 operators       | Staffing has grown beyond the starting skeleton       |
| Treasury           | ≥ $300              | Relocation fund                                       |

**Pacing thresholds:**

| Scenario   | Relocation-ready by contract | Fail                          |
| ---------- | ---------------------------- | ----------------------------- |
| Skilled    | 15–20                        | < 12 (trivial) or > 25 (drag) |
| Average    | 20–30                        | > 35                          |
| Struggling | 30–40 (if viable)            | > 50                          |

**Reputation trajectory (per-raid deltas: success +7, mixed +2, failure -5, boss clear +15):**

| Scenario                         | Rep after 20 contracts (est.) | 40 rep reached?             |
| -------------------------------- | ----------------------------- | --------------------------- |
| Skilled (75%S, 2 boss clears)    | ~105 + 30 = ~135              | Yes, by contract ~8         |
| Average (50%S, 1 boss clear)     | ~55 + 15 = ~70                | Yes, by contract ~12        |
| Struggling (25%S, 0 boss clears) | ~10                           | No — may need 25+ contracts |

Reputation pacing appears viable for Skilled and Average scenarios. Struggling players may need intervention (boss-clear assistance or adjusted failure penalties) to reach the relocation gate within a reasonable window.

---

## Current Ledger: Out-of-Band Observations

### In Band

1. **Starting treasury ($400).** Provides 5+ failure buffer. Supports first upgrade by contract 2–3. Correctly tuned for the design principles.

2. **Bid costs ($7–$11, 8% of reward).** Negligible relative to other flows. Never become a blocking factor.

3. **Failure penalty direct cash loss (-$18 to -$40).** Modest. Most failure cost comes from lost reward + ongoing payroll, creating asymmetric loss that feels bad without being instantly lethal. Good shape.

4. **Success rewards ($84–$153).** Always exceed one full day of payroll. Every successful contract produces positive net cash flow. Correctly sized.

5. **Mixed results remain profitable.** Net +$47 per mixed cycle means the player can absorb mixed outcomes comfortably. Only outright failures are truly punishing. This matches the "one bad contract hurts" principle — mixed outcomes are setbacks, not disasters.

### Watch Closely

6. **Payroll ratio at 162%.** Daily payroll ($81) exceeds income ($50) by 62%. At the high end of the acceptable band. If combined with a failed mercy-window check (non-opening-safe incident firing early), the compounding daily bleed and treasury hit could create unnecessary frustration. **Lever if needed:** increase base storefront to $55–60 or reduce operator daily wage to $10.

7. **Income upgrade payback (15–27.5 days).** No income upgrade pays back within the 8-contract opening arc (~8 game-days). This is acceptable for teaching investment thinking, but if playtesting shows players perceive upgrades as wasted money, Records Wall payback could tighten (lower cost to $75 or raise income delta to $8).

8. **Loot sell-value variance (3.4× spread on Clearance success: $34–$114).** Loot is ~30% of success-cycle income. High loot variance could create outlier treasury trajectories. Phase 3 should track loot-driven variance separately. **Threshold:** if loot randomness accounts for >20% of total trajectory variance, tighten drop table ranges.

9. **No direct treatment/repair cost.** Recovery is purely time-based. Adding a per-injury treasury sink later will increase the effective failure penalty. Re-evaluate M5 and M6 if treatment costs are implemented.

10. **Incident mercy window is critical.** Compliance audit ($100) and rival poaching counter-offer ($150) are NOT opening-safe. If these fire before beat 8, they consume 25–37% of starting treasury. Phase 3 must verify that non-mercy incidents never fire during the first 3 contracts.

---

## Phase 3 Implementation Requirements

Phase 3 deterministic simulation must capture the following per seeded run to evaluate against these thresholds:

1. **Per-contract treasury snapshots** — treasury at the start and end of each contract cycle.
2. **Per-contract outcome classification** — success, mixed, or failure for each raid.
3. **Actual outcome distributions** — compare realized success/mixed/failure rates against the three reference scenarios.
4. **Loot sell-value per raid** — to compute loot-driven trajectory variance.
5. **Upgrade purchase timestamps** — contract number and treasury level when each upgrade is purchased.
6. **Recruit timestamps** — contract number when each recruitment occurs.
7. **Incident log with treasury deltas** — type, timing, choice, and cash impact of each incident.
8. **Boss encounter timing** — contract number of first boss contact and first boss clear.
9. **Injury log** — severity, recovery time, and deployment impact per injury event.
10. **Deadlock detection** — flag if treasury drops below $7 with no sellable inventory.
11. **Reputation trajectory** — reputation at each contract boundary.

Each metric (M1–M8) should report pass/fail per seed and aggregate pass rates across the sample. A balance change that moves any metric from pass to fail is a regression.
