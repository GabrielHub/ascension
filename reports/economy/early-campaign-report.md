# Early Campaign Economy Report

Grounded in the canonical opening path, not preview/bootstrap-only assumptions.

## Opening Snapshot

- Starting treasury: $400
- Starting roster payroll: $81/day
- Base storefront income: $50/day
- Net daily cash before upgrades: $-31/day
- Active operators: 4
- Active staff: 2

## Storefront And Payroll

| Surface                               |       Cash | Notes                                                              |
| ------------------------------------- | ---------: | ------------------------------------------------------------------ |
| Operational reception room income     |  $50 / day | Canonical opening path starts with 1 operational reception room.   |
| Street-Facing Frontage                |   $6 / day | Applied through deterministic building authority income modifiers. |
| Records Wall                          |   $6 / day | Applied through deterministic building authority income modifiers. |
| Hot Coffee                            |   $4 / day | Applied through deterministic building authority income modifiers. |
| Aina Solis daily wage                 | -$18 / day | Role: staff:reception.                                             |
| Boris Petrov daily wage               | -$15 / day | Role: staff:logistics.                                             |
| Active operator daily payroll         | -$48 / day | Current implementation charges $12 per active operator per day.    |
| Canonical opening daily payroll total | -$81 / day | 4 active operators and 2 staff in the canonical opening seed.      |

## Contract Board Envelope

| Mission     |       Reward |  Bid Cost |   Threat |    Intel |     Risk |
| ----------- | -----------: | --------: | -------: | -------: | -------: |
| Clearance   | $116 to $141 | $9 to $11 | 65 to 78 | 42 to 58 | 53 to 71 |
| Containment |  $92 to $117 |  $7 to $9 | 53 to 66 | 42 to 58 | 41 to 59 |
| Extraction  | $104 to $129 | $8 to $10 | 59 to 72 | 42 to 58 | 47 to 65 |

## Raid Payout Envelope

| Mission     | Outcome               |   Cash Delta | Reputation |
| ----------- | --------------------- | -----------: | ---------: |
| Clearance   | success               | $108 to $153 |          7 |
| Clearance   | mixed                 |   $59 to $84 |          2 |
| Clearance   | failure               | -$40 to -$24 |         -5 |
| Clearance   | boss completion bonus | $174 to $212 |         15 |
| Containment | success               |  $84 to $129 |          7 |
| Containment | mixed                 |   $46 to $71 |          2 |
| Containment | failure               | -$34 to -$18 |         -5 |
| Containment | boss completion bonus | $138 to $176 |         15 |
| Extraction  | success               |  $96 to $141 |          7 |
| Extraction  | mixed                 |   $53 to $78 |          2 |
| Extraction  | failure               | -$37 to -$21 |         -5 |
| Extraction  | boss completion bonus | $156 to $194 |         15 |

## Loot-Sale Conversion

| Recoverable Item | Sell Price | Drop Tables                                                                         |
| ---------------- | ---------: | ----------------------------------------------------------------------------------- |
| Comm Earpiece    |         $8 | drop-table/dungeon-f-boss                                                           |
| Bone Shard       |        $10 | drop-table/dungeon-f-elite, drop-table/dungeon-f-regular                            |
| Carapace         |        $12 | drop-table/dungeon-f-boss, drop-table/dungeon-f-elite, drop-table/dungeon-f-regular |
| Crystal Eye      |        $18 | drop-table/dungeon-f-boss, drop-table/dungeon-f-elite                               |
| Fang             |         $8 | drop-table/dungeon-f-boss, drop-table/dungeon-f-elite, drop-table/dungeon-f-regular |
| Ichor            |         $6 | drop-table/dungeon-f-regular                                                        |
| Sinew            |         $7 | drop-table/dungeon-f-regular                                                        |
| Threat Gland     |        $15 | drop-table/dungeon-f-elite                                                          |
| Void Residue     |        $25 | drop-table/dungeon-f-boss                                                           |
| Padded Jacket    |        $16 | drop-table/dungeon-f-boss                                                           |
| Kitchen Knife    |        $10 | drop-table/dungeon-f-boss                                                           |
| Pipe Wrench      |        $12 | drop-table/dungeon-f-boss                                                           |

| Mission     | Result  | Sell-Value Range | Expected Sell Value |
| ----------- | ------- | ---------------: | ------------------: |
| Clearance   | success |      $34 to $114 |              $74.14 |
| Clearance   | mixed   |       $20 to $60 |              $39.50 |
| Clearance   | failure |               $0 |               $0.00 |
| Containment | success |       $20 to $72 |              $46.19 |
| Containment | mixed   |        $6 to $18 |              $11.55 |
| Containment | failure |               $0 |               $0.00 |
| Extraction  | success |       $24 to $84 |              $55.89 |
| Extraction  | mixed   |        $8 to $24 |              $16.40 |
| Extraction  | failure |               $0 |               $0.00 |

## Upgrades

| Upgrade                |  Cost | Extra Cash / Day | Recovery Delta | Cost Multiplier |
| ---------------------- | ----: | ---------------: | -------------: | --------------: |
| Street-Facing Frontage | -$150 |                6 |              0 |               1 |
| Records Wall           |  -$90 |                6 |              0 |               1 |
| Hot Coffee             | -$110 |                4 |              0 |               1 |
| First-Aid Station      | -$130 |                0 |              1 |               1 |
| Common Table           | -$160 |                0 |              0 |               1 |
| Labeled Bins           | -$100 |                0 |              0 |            0.95 |

## Treatment, Repair, And Incident Cash

| Surface                                                |  Cash | Coverage |
| ------------------------------------------------------ | ----: | -------- |
| Passive injury recovery                                |    $0 | none     |
| First-Aid Station                                      | -$130 | indirect |
| Recovery Complication Notice - Authorize Extended Rest |    $0 | none     |
| Recovery Complication Notice - Push Through Recovery   |    $0 | none     |
| Supply Pinch - Buy a Restock                           |  -$40 | direct   |

| Incident Choice                                   |  Cash | Opening-Safe Category |
| ------------------------------------------------- | ----: | --------------------- |
| Compliance Review Notice - Full Compliance Push   | -$100 | no                    |
| Compliance Review Notice - Do the Minimum         |  -$25 | no                    |
| Morale Windfall - Authorize Celebration           |  -$50 | yes                   |
| External Recruitment Offer - Make a Counter-Offer | -$150 | no                    |
| Supply Pinch - Buy a Restock                      |  -$40 | yes                   |
| Walk-In Contract Lead - Pay for Details           |  -$25 | yes                   |

## Phase 2 Gaps

- No standalone treatment or repair spend system: Recovery is currently time-based and modifier-driven. Treasury-linked treatment or repair pressure only appears indirectly through upgrades and specific incident choices.
- No target-envelope thresholds yet: Phase 1 now exports the current money surfaces, but Phase 2 still needs explicit pass/fail targets for treasury flow, setback tolerance, and relocation pacing.
- Loot and contract yields still need deterministic run-frequency data: This export captures static sell prices, drop-table values, and payout envelopes, but not how often each outcome occurs across canonical early runs.
