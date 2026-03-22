# Product Gameplay Systems

This file owns future-facing gameplay-system direction for operators, raids, resources, rooms, and deferred constraints.

## Current Gameplay Direction

- Recruitment is the core progression loop. The game should not be about grinding a weak operator into a fundamentally different one.
- Attunement and field role are fixed at recruitment. Training improves the operator you already have; it does not redefine what their attunement is.
- Rank advancement is possible but rare, dramatic, and not a standard progression path.
- The first post-bodega building should unlock systems and room families that do not fit in a bodega, not just increase capacity.
- Early external pressure should come primarily from the dungeon economy and the operator labor market, with city institutions layered in later.
- Visual variety should split by domain: authored breadth for dungeon concepts, composition rules for operators.

## Shared Uncertainty Resolution

- Gameplay uncertainty must be resolved by a shared seeded simulation utility, not by ad hoc per-system randomness and not by LLM-driven resolution.
- The utility should support weighted choice, bounded rolls, deterministic seeded replay, and debug-visible contributing modifiers.
- Autonomous decisions, event resolution, recruitment variance, team repair versus disband outcomes, and other chance-driven gameplay systems should route through that shared utility.
- The first shipped implementation can stay lightweight, but the core contract is that uncertainty remains simulation-owned, seeded, inspectable, and extensible.

## Operator Systems

Roles describe what an operator does in the field. They should read like in-world operational assignments, not imported RPG classes.

| Role       | Tag               | Description                                                                                   |
| ---------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Field Lead | `role:field_lead` | Pushes the run forward, holds tactical authority under pressure, and anchors the team's pace. |
| Scout      | `role:scout`      | Explores ahead, identifies hazards, gathers intel, and creates safer openings for the team.   |
| Medic      | `role:medic`      | Stabilizes injuries, preserves readiness, and keeps a bad run from turning into a collapse.   |

Expand this roster only with additional field-role language that sounds native to the setting, not with generic genre class terms.

Every operator has a fixed, permanent combat kit defined by their attunement:

| Slot           | Count | Description                                                                             |
| -------------- | ----- | --------------------------------------------------------------------------------------- |
| Regular Attack | 1     | Basic combat action. Always available.                                                  |
| Skill          | 1     | Signature ability. Cooldown-based. Defines the operator's tactical identity.            |
| Ultimate       | 1     | High-impact ability. Long cooldown or conditional trigger. Raid-defining when it lands. |
| Passives       | 0+    | Always-on effects. Modify stats, team dynamics, or situational behavior.                |

These never change. The kit an operator has when Boss recruits them is the kit they will always have.

Current operator-system direction:

- Physical stats are trainable and rank-capped: Strength, Speed, Endurance, Resilience.
- Intelligence and Perception are fixed at recruitment.
- Operators carry needs over time: Hunger, Fatigue, Stress.
- Operators carry emotional state over time: Morale (current + baseline), Loyalty (current + baseline).
- Operators express personality through preferences such as risk tolerance, reward focus, recovery bias, social bias, training bias, and comfort bias.
- Injury state should track severity, treatment state, and recovery time.
- Operators can be active, injured, recovering, or dead. Death is permanent.

Social memory and team dynamics use a hybrid model:

- Base social state is per-operator disposition, not a dense all-to-all relationship matrix.
- Persistent pair ties should be sparse and notable. They exist only when the relationship matters enough to remember.
- Trust is symmetric. Persistent trust or distrust ties should update both participants together rather than being stored as separate one-way values.
- Persistent ties should carry stance and strength, such as trusted, preferred, resented, rival, mentorship, or grief-linked bonds.
- Recurring raid teams are persistent social units with their own shared history, cohesion, and eventual lock-in. They can later develop names as part of that identity.
- Team damage is individual as well as collective. An operator can die without a full team wipe, and that death should affect surviving members, the team's future cohesion, room culture, morale, loyalty, and reputation.
- The default damaged-team rule is to attempt autorepair unless weighted conditions push the team toward disbanding.
- Damaged-team outcomes should be resolved through the shared uncertainty utility using factors such as morale, loyalty, grief, field-lead presence, replacement availability, room culture, and recent contract outcomes.
- Room culture is a persistent system. Rooms and shifts can accumulate tone, tension, comfort, and history that affect HQ behavior, recovery, socialization, and future autonomy.
- Recurring teams should first exist as persistent but mostly implicit social units. They gain explicit names and player-visible lock-in only after later progression proves that the team identity has actually held together.
- Phase 1 may ship a lighter foundation for these systems, but the roadmap must explicitly record what depth is deferred rather than implying the first implementation is final.

Rank advancement is technically possible but represents a rare, dramatic event:

- Requires surviving through many raids at the operator's current rank ceiling
- Only happens under extreme stress or breakthrough moments
- Is a late-game event, not a standard progression
- Should feel like a story moment, not a level-up
- Most operators never advance in rank. This is normal and expected.

Staff are hired, assigned to rooms, and provide gameplay bonuses, but they should still read as authored people rather than faceless modifiers. They are the infrastructure that lets operators focus on the dangerous work.

| Function       | Tag                 | Description                                                                                                  |
| -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Reception      | `staff:reception`   | Front desk, visitor management, public-facing operations. Affects recruitment pool quality and visitor flow. |
| Logistics      | `staff:logistics`   | Supply management, equipment maintenance, resource efficiency. Reduces operational costs.                    |
| Maintenance    | `staff:maintenance` | Building upkeep, room repairs, facility management. Affects room effectiveness and upgrade speed.            |
| Medical        | `staff:medical`     | Non-field medical care. Recovery support, injury treatment. Reduces recovery time.                           |
| Administrative | `staff:admin`       | Paperwork, compliance, scheduling. Reduces pressure events and regulatory problems.                          |

## Enemy, Boss, And Loot Systems

Enemy stats should mirror the operator stat model at a simplified level:

| Stat    | Description                                                             |
| ------- | ----------------------------------------------------------------------- |
| Attack  | Damage output per action                                                |
| Defense | Damage reduction                                                        |
| HP      | Total health before elimination                                         |
| Speed   | Action frequency and positioning                                        |
| Threat  | How aggressively the enemy targets operators (affects who takes damage) |

Bosses use the same stat model as enemies but at significantly higher values, plus:

| Stat     | Description                                                                           |
| -------- | ------------------------------------------------------------------------------------- |
| Phases   | Number of distinct combat phases (stat shifts or behavior changes during the fight)   |
| Weakness | What the boss is vulnerable to (role type, stat type, or specific operator qualities) |

Bosses carry tags that apply persistent effects during the encounter. Current examples:

| Tag                    | Effect                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `boss:frontline_shred` | Breaks defensive posture and ignores a percentage of defense/resilience on operators taking point |
| `boss:recovery_block`  | Reduces stabilization and recovery effectiveness during the encounter                             |
| `boss:speed_drain`     | Reduces operator speed, making the fight longer                                                   |
| `boss:swarm_summon`    | Periodically spawns additional enemies during the fight                                           |
| `boss:intel_resist`    | Intel-based preparation bonuses are reduced                                                       |
| `boss:aoe`             | Deals damage to all operators instead of only the current frontline                               |

Loot and rare resource direction:

- Regular enemies drop common resources.
- Tougher enemies within a dungeon have better drop rates.
- Bosses drop rare resources specific to their dungeon theme and rank.
- Higher-rank dungeons drop rarer and more valuable resources.
- Defeated bosses close the dungeon and remove access to that dungeon's loot table.

## Gear, Resources, And Rooms

Guild-level resources:

| Resource   | Role                                                                                                  | Tags                                        |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Cash       | Primary currency. Pays for everything - staff, gear, upgrades, operator retention.                    | `resource:liquid`, `economy:core`           |
| Reputation | Public-facing credibility. Affects contract access, recruitment pool quality, and political leverage. | `resource:pressure`, `progression:external` |
| Intel      | Operational knowledge. Improves raid planning and reduces mission risk.                               | `resource:knowledge`, `ops:planning`        |

Gear has stat effects. Equipment is not cosmetic.

- Weapons affect offensive stats (Strength, Speed, damage output).
- Outfits affect defensive stats (Resilience, Endurance, damage resistance).
- Accessories affect utility stats (Perception, Speed, situational bonuses).
- Higher-rank gear provides larger stat bonuses.
- Gear stat bonuses stack with an operator's trained stats, but gear does not raise the rank ceiling.

Gear can be purchased or crafted.

- Purchasing is the early-game path. Available gear quality is limited by guild reputation and rank.
- Crafting is a midgame feature. It requires a dedicated room and staff support.
- Crafting should produce gear that is meaningfully better or more specialized than what is available for purchase.

Rooms are the building blocks of the guild's physical space. They determine what the guild can do and how well it can do it.

| Family      | Function                              | Example Rooms                                              |
| ----------- | ------------------------------------- | ---------------------------------------------------------- |
| Operations  | Mission planning, contract management | Front desk, mission board, intel room                      |
| Recovery    | Healing, rest, stress reduction       | Infirmary, break room, sleeping quarters                   |
| Training    | Stat improvement for operators        | Gym, sparring room, firing range, obstacle course          |
| Social      | Morale, recruitment, retention        | Lounge, cafeteria, rec room                                |
| Staffing    | Staff assignment and effectiveness    | Office space, supply closet, server room                   |
| Specialized | Field-role or rank-specific           | Medic clinic, scout briefing room, field lead command room |

Training room direction:

| Training Room   | Primary Outcome | Secondary Outcome |
| --------------- | --------------- | ----------------- |
| Gym             | Strength        | Endurance         |
| Sparring Room   | Speed           | Resilience        |
| Firing Range    | Speed           | Awareness drills  |
| Obstacle Course | Endurance       | Speed             |

Perception remains fixed at recruitment. Training rooms can rehearse awareness-heavy behavior without increasing the underlying stat ceiling.

Later role-specific room variants should include:

- Field Lead Drill Floor - more efficient Strength/Resilience training for field leads
- Scout Recon Course - more efficient Speed training plus better awareness rehearsal for scouts
- Medic Clinic - more efficient Endurance/Resilience training for medics

Staff assigned to rooms improve the room's effectiveness. This should remain a core management loop.

## Future Constraints

- Do not pivot into a direct-control combat game.
- Do not make runtime AI a hard dependency for the core loop.
- Do not treat the bodega slice as the final shape of building progression.
- Do not overbuild tower-scale or prestige content before the midgame proves itself.

## Locked Defaults For Deferred Systems

- Room culture should be surfaced mostly through summaries, room-state labels, behavior, and event writing rather than as a fully exposed raw-stat panel. Players should understand the room's tone without needing to parse an internal spreadsheet.
- When city institutions become real pressure sources, start with licensing and compliance, labor and worker-safety oversight, emergency-response and site-containment pressure, and borough-level contracting or political pressure.
- Crafting should deepen through authored recipe families, resource families, rare site-specific materials, and tag-driven quality rules rather than through an exhaustive part-by-part manufacturing sim.
- Room and staff quality rules should stay legible and tiered. Favor authored packages, tags, thresholds, and a few strong modifiers over sprawling hidden formula stacks.
