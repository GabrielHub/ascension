# Management Policy Contract

Phase 1 deliverable for `management-policy-surfaces-plan.md`. This document defines the five required policy families, their runtime data shapes, gameplay effects, tradeoffs, and integration rules. It is the implementation spec for Phase 2 (wiring into runtime systems) and Phase 3 (HQ management surfaces).

Status: implemented. This contract remains as a reference input for the shipped management-policy surface.

Read before implementing: `docs/roadmap.md`, `docs/product/gameplay-systems.md`, `docs/product/presentation.md`, `docs/world/headquarters-and-rooms.md`.

---

## Runtime Data Shape

```typescript
export type ContractPostureOption = "conservative" | "balanced" | "aggressive";
export type ObjectiveBiasOption = "thorough_sweep" | "standard_clearance" | "boss_rush";
export type RecoveryTriageOption = "field_first" | "balanced_rotation" | "full_recovery";
export type StaffingPriorityOption = "operations_focus" | "balanced_schedule" | "welfare_priority";
export type RosterFlowOption = "selective_intake" | "open_doors" | "retention_focus";

export interface PolicyState {
  contractPosture: ContractPostureOption;
  objectiveBias: ObjectiveBiasOption;
  recoveryTriage: RecoveryTriageOption;
  staffingPriority: StaffingPriorityOption;
  rosterFlow: RosterFlowOption;
}
```

## New-Campaign Defaults

```typescript
const DEFAULT_POLICY_STATE: PolicyState = {
  contractPosture: "balanced",
  objectiveBias: "standard_clearance",
  recoveryTriage: "balanced_rotation",
  staffingPriority: "balanced_schedule",
  rosterFlow: "open_doors",
};
```

All five defaults are the current autonomous behavior. A new player who never touches policies gets the same game the current systems already produce.

## Persistence Rules

- **Location**: `PolicyState` is a new field on `BuildingAuthority`. It persists through `WorldSnapshot` as `policies?: PolicyStateSnapshot`.
- **Save/load**: Serialized and restored like other `BuildingAuthority` fields. Missing `policies` in older saves defaults to `DEFAULT_POLICY_STATE` (migration-safe).
- **Preview/sandbox**: Uses `DEFAULT_POLICY_STATE` unless manually changed in-session.
- **Schema version**: Bump `schemaVersion` when adding the field. The migration handler populates the default when the field is absent.

## Timing, Commitment, And Gating

- **All five policies are available from the start of a new campaign.** They are standing management decisions, not progression unlocks. The opening campaign teaches each one through authored guidance beats.
- **No per-change cooldown at bodega tier.** The bodega is the learning phase. Let the player experiment freely.
- **Contract Objective Bias cannot change mid-contract.** The active raid objectives are already in-flight. The player may change this policy during the `bidding` or `resolved` lifecycle phases, not during `active`. The UI should disable the control and explain why when a contract is active.
- **All other policies take effect on the next system tick after the change.** There is no deferred-application queue.
- **Later building tiers may add minimum commitment periods.** That is a bodega-closure or union-hall concern, not a bodega-tier rule.

---

## Policy 1: Contract Posture

**Player-facing label**: Contract Posture
**Player-facing question**: How cautious should the guild be about sending teams into the field?

### Options

| Option         | Label      | Player-facing explanation                                                                                                                    |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `conservative` | Cautious   | Teams only deploy when they're well-rested and confident. Fewer raids, but the ones that happen go better. Operators appreciate the caution. |
| `balanced`     | Standard   | Teams use their own judgment about when they're ready. The default guild posture.                                                            |
| `aggressive`   | Aggressive | Teams deploy even when conditions aren't ideal. More raids, more loot, more injuries. Operators notice the pressure.                         |

### Owner System

`sim/systems/raids.ts` — affects `planOpportunityTeam()`, `computeOperatorRaidReadiness()`, and refusal-check logic.

### Concrete Runtime Effects

| Parameter                     | Conservative          | Balanced                  | Aggressive            |
| ----------------------------- | --------------------- | ------------------------- | --------------------- |
| Minimum willingness threshold | 62 (+8)               | 54 (current)              | 46 (-8)               |
| Risk-gap penalty multiplier   | ×1.5 (riskGap × 0.60) | ×1.0 (riskGap × 0.40)     | ×0.6 (riskGap × 0.24) |
| Refusal-risk morale floor     | 38 (morale < 38)      | 30 (morale < 30, current) | 22 (morale < 22)      |
| Morale drift per tick         | +0.04/hr passive      | 0 (current)               | -0.06/hr passive      |

The morale drift is the tradeoff signal. Conservative posture improves morale because operators feel respected. Aggressive posture erodes morale because operators feel pushed.

### Observable Gameplay Effects

- **Conservative**: Fewer raid launches. Higher average success rate. Healthier roster over time. Slower income. The guild plays safe but may fall behind on contracts.
- **Balanced**: Current behavior. No change.
- **Aggressive**: More frequent raids. Lower average success rate. More injuries and departures. Faster income when things go well. The guild pushes hard but the roster frays under pressure.

### Tradeoff Summary

Safety vs. throughput. Conservative protects operators but slows progression. Aggressive maximizes raid volume but grinds the roster.

---

## Policy 2: Contract Objective Bias

**Player-facing label**: Field Objectives
**Player-facing question**: What should teams prioritize once they're inside a contract site?

### Options

| Option               | Label              | Player-facing explanation                                                                                          |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `thorough_sweep`     | Thorough Sweep     | Teams clear methodically. More loot and intel, but longer deployments and more total exposure.                     |
| `standard_clearance` | Standard Clearance | Teams balance exploration with progress toward the contract target. The default approach.                          |
| `boss_rush`          | Boss Rush          | Teams push straight for the boss. Faster contract completion, less exploration loot, higher single-encounter risk. |

### Owner System

`sim/systems/raids.ts` — affects `simulateRaidRun()` exploration depth, loot multipliers, duration modifiers, and boss-engagement threshold logic.

### Concrete Runtime Effects

| Parameter                  | Thorough Sweep                                             | Standard Clearance | Boss Rush                                                |
| -------------------------- | ---------------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| Raid duration modifier     | ×1.25                                                      | ×1.0 (current)     | ×0.80                                                    |
| Exploration cell coverage  | +30% cells explored                                        | Current            | -40% cells explored                                      |
| Loot drop multiplier       | ×1.20                                                      | ×1.0 (current)     | ×0.65                                                    |
| Intel gathered per raid    | ×1.35                                                      | ×1.0 (current)     | ×0.50                                                    |
| Boss engagement threshold  | Higher (teams need more site progress before boss attempt) | Current            | Lower (teams attempt boss earlier with less preparation) |
| Cumulative injury exposure | Higher (more encounters total)                             | Current            | Lower total but higher per-encounter                     |

### Observable Gameplay Effects

- **Thorough Sweep**: Raids take longer. Teams come back with more loot and better intel. But longer deployments mean more cumulative injury risk, more fatigue, more stress. Good for building resources, bad when the roster is thin.
- **Standard Clearance**: Current behavior.
- **Boss Rush**: Contracts close faster. Less exploration loot, but boss loot on success. Higher variance — the team either wins the boss quickly or gets hammered without preparation advantage. Good for racing through contracts, bad when teams are underleveled.

### Commitment Rule

Cannot change during an active contract. The bias applies to all raids launched under the current contract. Changeable during `bidding` or `resolved` lifecycle phases only.

### Tradeoff Summary

Thoroughness vs. speed. Thorough Sweep maximizes per-contract value extraction. Boss Rush maximizes contract completion rate. The right choice depends on whether the guild needs resources or reputation.

---

## Policy 3: Recovery Triage

**Player-facing label**: Recovery Standards
**Player-facing question**: How healthy should operators be before they're cleared for field work?

### Options

| Option              | Label             | Player-facing explanation                                                                                                                         |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field_first`       | Field First       | Operators return to the raid pool sooner. They'll go out with lingering injuries and fatigue. Fast turnaround, but the roster accumulates damage. |
| `balanced_rotation` | Balanced Rotation | Operators recover at a reasonable pace. They won't raid while seriously hurt, but they don't need to be at 100%.                                  |
| `full_recovery`     | Full Recovery     | Operators stay in recovery until they're genuinely healthy. Slower turnaround, but operators come back stronger and morale stays higher.          |

### Owner System

`sim/systems/needs.ts` — affects recovery advancement and injury-threshold checks.
`sim/systems/assignment.ts` — affects recovery block score weighting in `chooseOperatorBlock()`.
`sim/systems/raids.ts` — affects the `injuryPreventsRaid` threshold in readiness checks.

### Concrete Runtime Effects

| Parameter                        | Field First                     | Balanced Rotation | Full Recovery                                            |
| -------------------------------- | ------------------------------- | ----------------- | -------------------------------------------------------- |
| Injury raid threshold (severity) | 40 (down from 60)               | 60 (current)      | 80 (up from 60)                                          |
| Recovery block score modifier    | -15                             | 0 (current)       | +20                                                      |
| Recovery rate multiplier         | ×1.0 (current)                  | ×1.0 (current)    | ×1.15                                                    |
| Fatigue raid penalty threshold   | 90 (up from 80)                 | 80 (current)      | 70 (down from 80)                                        |
| Stress morale contribution       | ×1.2 (stress hurts morale more) | ×1.0 (current)    | ×0.85 (stress hurts morale less when recovery is better) |

### Observable Gameplay Effects

- **Field First**: Operators cycle into raids faster. More raids launched per cycle. But operators carry lingering injuries, fatigue accumulates, morale decays faster because the roster never truly rests. Risk of cascading injuries leading to roster collapse.
- **Balanced Rotation**: Current behavior.
- **Full Recovery**: Operators are healthier when they deploy. Higher morale, lower cumulative injury. But the raid-available pool is smaller at any given moment. Fewer simultaneous teams.

### Tradeoff Summary

Availability vs. sustainability. Field First maximizes the number of operators available for raids at any moment. Full Recovery maximizes the quality and longevity of each operator. The right choice depends on roster size — a thin roster can't afford Field First, a deep roster can't afford Full Recovery's idle time.

---

## Policy 4: Staffing Priority

**Player-facing label**: Daily Routine
**Player-facing question**: What should operators focus on when they're not in the field?

### Options

| Option              | Label             | Player-facing explanation                                                                                                 |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `operations_focus`  | Operations Focus  | Operators spend more time working and less time socializing or resting. The guild runs tighter, but people get worn down. |
| `balanced_schedule` | Balanced Schedule | Operators divide their time naturally between work, rest, and social time. The default routine.                           |
| `welfare_priority`  | Welfare Priority  | Operators rest and socialize more. Morale stays high, but the guild gets less daily operational output.                   |

### Owner System

`sim/systems/assignment.ts` — affects block score weights in `chooseOperatorBlock()`.

### Concrete Runtime Effects

| Parameter                     | Operations Focus                                  | Balanced Schedule | Welfare Priority |
| ----------------------------- | ------------------------------------------------- | ----------------- | ---------------- |
| Work block score modifier     | +12                                               | 0 (current)       | -10              |
| Social block score modifier   | -8                                                | 0 (current)       | +12              |
| Recovery block score modifier | -6 (non-critical only; critical injury overrides) | 0 (current)       | +8               |
| Rest block score modifier     | -4                                                | 0 (current)       | +6               |
| Passive loyalty drift         | +0.03/hr                                          | 0 (current)       | +0.06/hr         |
| Passive morale drift          | -0.05/hr                                          | 0 (current)       | +0.08/hr         |

Critical injury override: If `injurySeverity > 60`, the recovery block score modifier is forced to 0 regardless of policy. The guild doesn't push seriously wounded operators to work.

### Observable Gameplay Effects

- **Operations Focus**: Operators spend more time at their posts. Room output is higher (more work ticks). Loyalty drifts up slightly (diligent culture). But morale decays because operators never get a real break. Risk of morale-driven refusals and departures over time.
- **Balanced Schedule**: Current behavior.
- **Welfare Priority**: Operators are happier and healthier. Morale and loyalty trend up. But operational output is lower — fewer work ticks means rooms produce less, and the guild feels slower day-to-day.

### Tradeoff Summary

Productivity vs. morale. Operations Focus is tempting for short-term output but unsustainable. Welfare Priority is comfortable but slow. The right choice shifts as the guild grows — a new bodega with no upgrades needs the output, while a stable guild can afford to invest in people.

---

## Policy 5: Roster Flow

**Player-facing label**: Recruitment Policy
**Player-facing question**: How should the guild approach hiring and keeping operators?

### Options

| Option             | Label            | Player-facing explanation                                                                                                     |
| ------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `selective_intake` | Selective Intake | The guild is pickier about who walks in. Fewer visitors, but the ones who show up are better qualified.                       |
| `open_doors`       | Open Doors       | The guild takes whoever shows up. The standard approach — cast a wide net.                                                    |
| `retention_focus`  | Retention Focus  | The guild invests in keeping the operators it has. Departure checks are easier to pass, but the recruitment pipeline narrows. |

### Owner System

`sim/systems/visitors.ts` — affects visitor spawn interval, quality generation, and patience.
`sim/systems/raids.ts` — affects departure check DC in `getDepartureCheck()`.

### Concrete Runtime Effects

| Parameter                  | Selective Intake           | Open Doors              | Retention Focus        |
| -------------------------- | -------------------------- | ----------------------- | ---------------------- |
| Visitor spawn interval     | ×1.5 (270 min)             | ×1.0 (180 min, current) | ×1.3 (234 min)         |
| Visitor base quality       | +10 (60 base)              | +0 (50 base, current)   | +0 (50 base, current)  |
| Visitor patience modifier  | ×0.75                      | ×1.0 (current)          | ×1.0 (current)         |
| Departure check DC penalty | 0                          | 0 (current)             | -10 (harder to depart) |
| Loyalty passive bonus      | 0                          | 0 (current)             | +0.08/hr               |
| Reputation cost on reject  | -2 (harsher market signal) | -1 (current)            | -1 (current)           |

### Observable Gameplay Effects

- **Selective Intake**: Visitors arrive less often, but arrive with higher quality and expected loyalty. The visitor patience is shorter — better prospects expect faster decisions. Rejecting visitors costs more reputation because the market sees the guild as picky. Good for a guild that can afford to wait for the right person.
- **Open Doors**: Current behavior. Wide pipeline, average quality, steady flow.
- **Retention Focus**: The guild is harder to leave. Departure checks have a lower DC, and loyalty drifts up passively. But the visitor pipeline slows because guild resources shift toward retention rather than attraction. Good for protecting a strong roster, bad for filling gaps after losses.

### Tradeoff Summary

Quality vs. volume vs. stability. Selective Intake builds a better roster slowly. Open Doors fills gaps fast. Retention Focus protects what you have but makes replacement harder if someone dies.

---

## Social Lever Decision

**Deferred.** A social management policy (team assignment, social climate, forced rotation) is not needed for the bodega tier. Rationale:

1. The five required policies already create enough decision surface for early-game management.
2. The social system's emergent autonomy (team formation, disposition, notable ties, room culture) is one of the game's differentiating features. Adding management control before playtesting risks turning social dynamics into direct control.
3. The existing operator preference system already gives the player indirect social influence through staffing, room assignment, and roster composition decisions.
4. A social policy should be added at union-hall tier if playtesting reveals that players want more influence over team formation, relationship dynamics, or room culture. The right lever depends on what players actually try to control.

The five shipped policies influence social outcomes indirectly: Welfare Priority raises morale which improves sociability. Operations Focus reduces social time which weakens bonds. Retention Focus keeps established relationships intact. These indirect effects are the bodega-tier social layer.

---

## Owner System Summary

| Policy                  | Primary Owner               | Secondary Owners                                    |
| ----------------------- | --------------------------- | --------------------------------------------------- |
| Contract Posture        | `sim/systems/raids.ts`      | `sim/systems/morale.ts` (drift)                     |
| Contract Objective Bias | `sim/systems/raids.ts`      | —                                                   |
| Recovery Triage         | `sim/systems/needs.ts`      | `sim/systems/assignment.ts`, `sim/systems/raids.ts` |
| Staffing Priority       | `sim/systems/assignment.ts` | `sim/systems/morale.ts` (drift)                     |
| Roster Flow             | `sim/systems/visitors.ts`   | `sim/systems/raids.ts` (departure)                  |

All policy reads happen in simulation systems. UI reads the policy for display but never writes gameplay state.

## UI Surface

Policies belong in the HQ management overlay under a dedicated **Management** category tab. This tab sits alongside the existing Roster, Rooms, and other category tabs in the top nav.

Each policy renders as a card in the bottom panel:

- Current selection highlighted
- Each option shows its label, one-sentence explanation, and the key tradeoff
- Contract Objective Bias card shows a disabled state with explanation when a contract is active
- Changing a policy is a typed intent command (`sim/set-policy`) that writes to `BuildingAuthority.policies`

The event log should record policy changes using the chosen player and guild identity, for example: "{playerName} changed {guildName}'s recovery standards to Full Recovery."

## Command Shape

```typescript
interface SetPolicyCommand {
  type: "sim/set-policy";
  policyId: keyof PolicyState;
  value: string; // union of the relevant option type
}
```

The command handler validates:

1. The `policyId` is a valid policy key.
2. The `value` is a valid option for that policy.
3. If `policyId === "objectiveBias"`, the contract lifecycle is not `"active"`.

On success, writes the new value to `BuildingAuthority.policies[policyId]` and emits a runtime event.

---

## Opening-Campaign Dependencies

The opening campaign spec (`opening-campaign-spec.md`) already satisfies the following dependencies:

| Dependency                                      | Status    | Notes                                           |
| ----------------------------------------------- | --------- | ----------------------------------------------- |
| Starter roster exists with morale/loyalty state | Satisfied | 4 operators with explicit morale/loyalty values |
| Contract lifecycle and bidding board exist      | Satisfied | 3 F-rank contracts on first tick                |
| Autonomous raid team formation exists           | Satisfied | `planOpportunityTeam()` is shipped              |
| Injury and recovery systems exist               | Satisfied | `InjuryState`, `advanceEntityNeeds()` shipped   |
| Operator departure checks exist                 | Satisfied | `getDepartureCheck()` shipped                   |
| Visitor/recruitment pipeline exists             | Satisfied | `advanceVisitorPoolSystem()` shipped            |
| Schedule block assignment exists                | Satisfied | `chooseOperatorBlock()` shipped                 |
| Event log exists                                | Satisfied | Runtime event surface is shipped                |
| Interruption/incident layer exists              | Satisfied | Blocking modals shipped                         |
| Guidance framework exists                       | Satisfied | Opening beats and coachmarks shipped            |

The opening campaign should add authored guidance beats that introduce each policy at a natural moment:

- **Contract Posture**: After the first raid returns (the player now has raid outcome context)
- **Recovery Triage**: After the first operator injury (the player now understands recovery pressure)
- **Staffing Priority**: After assigning Boris (the player has made a staffing decision)
- **Contract Objective Bias**: Before the second contract bid (the player has seen one contract through)
- **Roster Flow**: After the first visitor arrives or departs (the player understands the recruitment pipeline)

These beat timings are recommendations for the opening-campaign guidance sequence, not hard gates on policy availability. The policies themselves are always accessible.
