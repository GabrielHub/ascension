# Unique Weapon Requirements

The pattern contract for **unique (`U`-tier) weapon authoring**. Defines the authoring packet shape, stat budget, signature effect rules, equip behavior, unlock chain composition, visual authoring path, and custom-logic allowances.

This doc is **the contract for authoring a unique weapon**. The actual unique weapons **roster** lives separately and is populated as individual sub-plans ship — see `rewrite/unique-weapons-catalog`.

Read [Weapon Tier Requirements](./weapon-tiers.md) for the regular weapon stat model. Read [Unique Operator Requirements](./unique-operators.md) for the paired-operator authoring model.

## Initial Scope

**1 unique weapon at first** — paired with the starter unique operator. Minimum to unblock the system end-to-end (Unique Weapon room display, paired-wielder signature effect logic, layered unlock chain).

Additional uniques are authored in parallel via individual sub-plans under `rewrite/unique-weapons-catalog`.

## Authoring Packet

A unique weapon is **never authored alone.** It must be paired to an existing or planned unique operator, but it is authored as its own follow-on content packet:

1. The paired unique operator
2. **The unique weapon** (this doc's contract)

Every unique weapon has exactly one associated unique operator. Not every unique operator has a unique weapon. A weapon's unlock chain may reference the paired operator's dungeon, boss, or other endgame milestones, but it does not require a new unique dungeon or boss.

## Stat Budget

~+45 total stat bonus across STR/SPD/END/RES, per [Weapon Tier Requirements](./weapon-tiers.md). Distribution authored per weapon's flavor (a heavy gauntlet leans STR/END; a sharpshooter rifle leans SPD/PERC). Authored at the U-tier ceiling, no randomization.

Specific tuning in `rewrite/economy`.

## Signature Effect

- **Exactly 1 signature effect per unique weapon** — mandatory at U.
- Authored per weapon, often thematically tied to the paired unique operator.
- May use effect kinds beyond the standard kit-effect pool if a design pass justifies.
- **Signature effect fires only when the paired unique operator wields the weapon.** Non-paired wielders gain the stat budget but not the signature effect.

## Equip Rules

- **Anyone can equip** the unique weapon (locked rule from weapon-tiers — no rank-locking on equip).
- Non-paired wielders: get the +45 stat budget. Strong stat-stick.
- Paired unique wielder: stat budget + signature effect activates.

This makes the unique weapon optimal on the paired unique but still useful as a high-stat fallback for any operator. The pairing matters mechanically, not gateways the weapon's basic value.

## Unlock Chain

The unique weapon's unlock chain is **layered after the paired unique operator's unlock.** Sequence:

1. Player completes the unique operator unlock chain → unique operator joins guild.
2. Unique weapon entry in the Unique Weapon room becomes "active" — its requirements become attemptable.
3. Player completes the weapon's separate chain → unique weapon unlocked.

Required components for the weapon chain:

- **Cash gate** — additional U-tier currency cost, scaled separately from the operator's cash gate (specific values in `rewrite/economy`).

Optional additional gates (cap 4 total ingredients to keep readable):

- Defeating an additional specific boss (could be a non-unique high-rank boss or another unique boss already cleared)
- Reputation gate
- Authored narrative event triggers
- Specific guild milestones (rooms built, contracts cleared, rivals defeated, etc.)

Until the paired operator is unlocked, the weapon entry shows in the Unique Weapon room as locked with "Paired operator required" status.

## Visibility

The Unique Weapon room shows all unique weapon entries from game start with locked state and visible requirements. Player can see what they're chasing (matches Unique Operator room visibility pattern).

## Custom Logic Allowance

**Uniques may carry one-off code** — same as unique operators. A unique weapon may include:

- Custom unlock chain logic (predicates beyond the standard set)
- Custom signature effect implementations not in the shared effect pool
- Custom interactions with specific game state (e.g., effect modulates based on which dungeon is active, which rival is alive, etc.)

Each unique weapon's sub-plan defines the custom-logic surface needed; reviewers weigh complexity vs. content payoff at the sub-plan level.

## Visual Authoring

| Asset | Authoring path |
|---|---|
| Portrait | Production-time AI-agent asset work within an authored prompt, manually approved, with **shared glow border treatment** per [Asset Pipeline Contract](./asset-pipeline.md). Visual signature is the boldest in the weapon family. Not runtime AI. |
| Display surface | Lives in the Unique Weapon room (museum-style display). |

## Naming

Proper authored names tied to the paired unique operator's lore or signature. Names follow [Content Rules](../world/content-rules.md) — authored, evocative, signature-class. Examples (placeholder): *"The Marigold Sigil," "Vesper's Edge."*

Each unique weapon's name is locked at authoring time.

## Generation Path

- **Pre-authored only.** No runtime AI generation of unique weapon stats / signature / unlock chain. AI agents may help produce the portrait during plan execution, but the result is checked-in authored content.
- **Sub-plan per unique weapon.** Every unique weapon gets its own sub-plan under `rewrite/unique-weapons-catalog`, owning the stat block, signature effect, unlock chain, visual prompt, and any custom logic.

## What This Doc Doesn't Cover

- **Specific unique weapon content.** Lives in individual sub-plans + the future enumerated unique weapons roster doc.
- **Unique operator authoring.** Separate product doc.
- **Effect engine implementation.** Code-side; reuses operator-kit effect engine.
- **Asset pipeline portrait specifics.** Lives in [Asset Pipeline Contract](./asset-pipeline.md).
- **Unique Weapon room mechanics.** Lives in [Rooms Catalog](./rooms-catalog.md).

## Cross-Doc References

- Unique weapon implementation: `rewrite/unique-weapons-catalog`
- Regular weapon stat model: [Weapon Tier Requirements](./weapon-tiers.md)
- Paired unique operator: [Unique Operator Requirements](./unique-operators.md)
- Asset pipeline (portraits + glow border): [Asset Pipeline Contract](./asset-pipeline.md)
- Unique Weapon room: [Rooms Catalog](./rooms-catalog.md)
- Visual effects pool (signature effect integration): [Visual Effects Pool](./visual-effects-pool.md)
- Per-unique-weapon sub-plan parent: `rewrite/unique-weapons-catalog`
