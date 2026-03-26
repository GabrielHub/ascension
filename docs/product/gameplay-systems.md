# Product Gameplay Systems

This file owns future-facing gameplay-system direction for operators, raids, resources, items, rooms, and deferred constraints.

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

## Interactive Incident Direction

- The runtime now ships a second interactive layer on top of passive pressure: incidents bind to concrete runtime subjects, pause the simulation, and demand a player choice.
- Incidents are simulation-owned decision moments, not bespoke UI popups. They are triggered from ECS state, selected through shared seeded uncertainty, and resolved by simulation-owned consequence handlers.
- Pressure is the input pool; incidents are the escalation surface. Not every pressure event should freeze the game, but the game needs a blocking incident path for operator conflict, death fallout, rival poaching, contract ultimatums, boss confrontation commitment, room breakdowns, and similar high-salience moments.
- Incident templates should be authored data with stable ids, tags, required-context rules, authored choices, and deterministic effect bundles. The first complete version should ship from a large static authored library rather than waiting on procedural narrative systems.
- Incident triggers should still feel random. Use runtime pressure, seeded weighted selection, cooldowns, recency suppression, novelty weighting, and concrete-subject binding so authored content does not feel rote.
- Incident consequences should be legible bundles applied through the ECS: morale, loyalty, treasury, reputation, room culture, team cohesion, injury progression, departure risk, and social-tie changes are all valid incident outputs.
- Pending incidents are save-safe. Refreshing or reloading restores the same unresolved incident and the same available choices.
- Raid teams deciding to confront a boss can raise a stop-the-game incident. That moment foregrounds the encounter, presents the stakes, and asks for a player decision instead of always staying inside passive raid-map updates.
- If the player commits to the confrontation, the boss fight hands off into a runtime-owned encounter simulation rather than collapsing immediately back into abstract aggregate raid resolution.
- Future AI support belongs on top of the structured incident payload, not inside the gameplay authority layer. AI may later help phrase the briefing, contextualize the same authored choices, or write a recap after resolution.
- AI must not decide when an incident triggers, which outcomes exist, or what hidden modifiers apply. Core incident resolution must remain deterministic, replayable, and testable without model access.

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

Kits should be first-class structured combat content, not only stored ids. Their effects should execute through deterministic simulation rules that support real encounters, save/load safety, and later content breadth without requiring a schema rewrite.

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

Ordinary raid enemies should be authored content, not anonymous threat bundles:

- Every ordinary enemy family should have a stable id, name, and short description.
- Enemy families should match the dungeon concept and read like corrupted extensions of that site.
- Contract-board threat hints should be able to surface likely enemy families when intel is sufficient.
- Ordinary raids should use those authored enemies in lightweight simulation-owned skirmishes instead of resolving from aggregate threat alone.

Ordinary enemy content should support at least:

- Attack
- Defense
- HP
- Speed
- Threat
- lightweight action profiles
- tags for behaviors such as ambush, suppression, hazard synergy, swarm pressure, armor break, or similar authored traits

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

Boss confrontation direction:

- Contract progression should be explicit: `active` contract, `resolved` result review, `bidding` board, then the next `active` site.
- Closing a dungeon must not silently secure the next contract. The player chooses the next job from posted work after the result beat.
- A fresh player-facing campaign should enter operations on the bidding board with an authored or generated set of posted contracts already available. New game must not start in an empty contract state and must not skip directly to an active site.
- The active contract site is authoritative only while the lifecycle is `active`; posted contracts and the previous contract result persist beside it and round-trip through save/load.
- Preview and verification entry points may seed an `active` contract as a tooling shortcut, but that is a non-canonical fast path for testing, not the player-facing contract progression model.
- Boss fights are real simulation-owned encounters with phases, action timing, hp, statuses, cooldowns, and deterministic operator-kit execution.
- The player remains a manager. Encounter input should be limited to explicit managerial interventions and commitment choices, not direct per-operator tactics control.
- The current shipped encounter includes limited managerial interventions; future expansion should broaden the intervention library without changing simulation ownership.
- Encounter time freezes the broader simulation while the fight is active, then writes the elapsed time back into world progression when the encounter resolves.
- Boss commitment must hand off into a live encounter state. Entering a committed boss fight must not instantly auto-complete or skip directly to summary resolution.
- The combat model should stay general enough that mixed enemy groups, summons, elites, and minibosses can reuse it later.
- Ordinary raid travel and exploration may remain abstract, but committed boss confrontations should not resolve as a one-shot aggregate packet.
- Ordinary raids should produce a deterministic transcript from deployment through resolution. The raid UI should play back that transcript rather than inventing separate presentation events.
- Focused team views should be able to surface the underlying precomputed team event log, including attacks, damage, health changes, and non-combat check results.
- Exploration, looting, intel gathering, regrouping, and withdrawal should all resolve through explicit simulation-owned pass, mixed, or fail checks.
- Boss access should use a hybrid rule: contract progress determines whether boss contact is possible at all, and run-level progression determines whether a specific team reaches that threshold.

Raid contract-surface direction:

- The contract board should surface likely enemy families, boss hints when available, and other intel-gated threat information.
- Those hints should come from authored enemy and site content, not only from generic placeholder labels.

Raid presentation direction:

- The operations and raid presentation should reflect time of day in the surrounding screen atmosphere, even when the map itself remains an abstract tactical surface.
- Unexplored raid-map space must remain easy to read. Fog, explored cells, ambient background, and tactical markers should maintain clear contrast separation.
- The raid view should not rely on low-contrast palettes that make unexplored space disappear into the background.

Player-facing startup direction:

- New game should begin from the bidding board with posted contracts available.
- Preview and sandbox flows may seed an active contract for tooling and testing only.
- The default player-facing entry path should not silently route players into sandbox preview when they intend to start a real campaign.

Loot and early raid-economy direction:

- Regular enemies can drop stackable loot items. The default early loot family is monster parts.
- Tougher enemies within a dungeon have better drop rates and can more credibly drop usable gear.
- Bosses drop larger or rarer monster-part stacks tied to their dungeon theme and rank, and they can also drop gear.
- Higher-rank dungeons improve both loot value and gear quality.
- Defeated bosses close the dungeon and remove access to that dungeon's drop table.

## Gear, Resources, And Rooms

Guild-level resources:

| Resource   | Role                                                                                                  | Tags                                        |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Cash       | Primary currency. Pays for everything - staff, gear, upgrades, operator retention.                    | `resource:liquid`, `economy:core`           |
| Reputation | Public-facing credibility. Affects contract access, recruitment pool quality, and political leverage. | `resource:pressure`, `progression:external` |
| Intel      | Operational knowledge. Improves raid planning and reduces mission risk.                               | `resource:knowledge`, `ops:planning`        |

Stackable inventory defaults:

- All inventory-tracked items stack by exact item ID.
- Weapons, outfit overlays, accessories, and loot items live in shared guild inventory as quantity-bearing stacks, not as unique per-copy objects.
- Equipping an operator reserves one copy from the relevant stack. Unequipping returns that copy to the stack.
- Phase 2 should not introduce per-copy durability, personalized ownership history, or one-off stat rolls unless the product plan is explicitly updated later.
- Monster parts are inventory items, not a fourth guild-level resource axis. They are the first stackable loot family in the early raid economy.

Gear has stat effects. Equipment is not cosmetic.

- Weapons affect offensive stats (Strength, Speed, damage output).
- Outfits affect defensive stats (Resilience, Endurance, damage resistance).
- Accessories affect utility stats (Perception, Speed, situational bonuses).
- Higher-rank gear provides larger stat bonuses.
- Gear stat bonuses stack with an operator's trained stats, but gear does not raise the rank ceiling.

Gear, inventory, and market defaults:

- Purchasing is the early-game path. Available gear quality is limited by guild reputation and rank.
- Phase 2 should ship a minimal market surface for buying gear and selling excess gear or monster parts for cash.
- That market can be framed in copy as rival-guild demand and supply, but Phase 2 does not require full rival-guild simulation, rival HQs, or persistent rival rosters.
- Monster parts are sellable in Phase 2 and should mainly function as raid-to-cash conversion loot until deeper crafting lands.
- Gear drops can go directly into the shared inventory stack when recovered from raids.
- Accessories should auto-select from eligible inventory stacks using operator role, rank, preferences, and current needs.
- Phase 2 only requires auto-selection for accessories. Broader automated weapon or outfit policy can land later if it proves necessary.
- Crafting is a midgame feature. It requires a dedicated room and staff support.
- Crafting should produce gear that is meaningfully better or more specialized than what is available for purchase.

Rooms are the building blocks of the guild's physical space. They determine what the guild can do and how well it can do it.

Lower headquarters tiers are allowed to combine multiple room families inside one physical room. The room family tags are runtime-facing function tags, not a promise that every building tier gets one dedicated room per family.

Building progression should not assume that every headquarters remains a single-plane layout. Later headquarters tiers should support floor-indexed room placement and floor-aware presentation, with multi-floor buildings changing both space allocation and how the player reads the headquarters at a glance.

| Family      | Function                              | Example Rooms                                              |
| ----------- | ------------------------------------- | ---------------------------------------------------------- |
| Operations  | Mission planning, contract management | Front desk, mission board, intel room                      |
| Recovery    | Healing, rest, stress reduction       | Infirmary, break room, sleeping quarters                   |
| Training    | Stat improvement for operators        | Gym, sparring room, firing range, obstacle course          |
| Social      | Morale, recruitment, retention        | Lounge, cafeteria, rec room                                |
| Staffing    | Staff assignment and effectiveness    | Office space, supply closet, server room                   |
| Specialized | Field-role or rank-specific           | Medic clinic, scout briefing room, field lead command room |

Recruitment is a capability, not a separate room family. Public-facing recruitment can live inside different room families at different building tiers as long as the runtime-facing tags and staffing rules stay explicit.

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

Multi-floor headquarters direction:

- The first post-bodega building should be allowed to span multiple floors rather than only widening the same ground plane.
- Floor identity should be explicit in runtime-facing HQ presentation state once multi-floor buildings arrive; floor selection should not be inferred indirectly from background art alone.
- Exterior surroundings for multi-floor buildings should use reusable elevation bands where possible so adjacent floors with materially similar outside reads can share one backdrop package.
- Exact per-floor bespoke surroundings should be reserved for floors whose exterior context genuinely changes, such as ground-entry floors, sky-lobby floors, penthouse tiers, or tower-top prestige floors.
- Multi-floor support should deepen building strategy, staffing, and readability first. It should not require a full tower-scale simulation before the second building can ship.

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
