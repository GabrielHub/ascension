# Unique Dungeon Requirements

The pattern contract for **unique (`U`-rank) dungeon authoring**. Defines authoring packet shape, structure, contract loop divergences, theme, boss complexity, loot model, re-raidability, access gating, visual authoring path, and custom-logic allowances.

This doc is **the contract for authoring a unique dungeon**. The actual unique dungeons **roster** lives separately and is populated as individual sub-plans ship — see `rewrite/unique-dungeons-catalog`.

Read [Dungeon Rank Requirements](./dungeon-ranks.md) for the regular dungeon contract — this doc inherits everything from it unless explicitly overridden. Read [Unique Operator Requirements](./unique-operators.md) for the paired unique-operator authoring model.

## Initial Scope

**1 unique dungeon at first** — paired with the starter unique operator + their unique boss. Minimum to unblock the system end-to-end (mythical theme authoring, unique boss mechanics, unlock chain integration, post-defeat re-raid behavior).

Additional uniques are authored in parallel via individual sub-plans under `rewrite/unique-dungeons-catalog`.

## Authoring Packet

A unique dungeon is **never authored alone.** It ships as part of the core unique-operator packet defined in [Unique Operator Requirements](./unique-operators.md):

1. The paired unique operator
2. The paired unique boss (sits inside this dungeon)
3. **The unique dungeon** (this doc's contract)

A paired unique weapon may later reference this dungeon or boss in its unlock chain, but the unique dungeon does not require a unique weapon to be valid.

## Inherits From Dungeon-Ranks

Unique dungeons reuse the regular dungeon system unless explicitly overridden:

- Encounter stream + exploration % model
- Transcript-driven non-boss combat
- Boss commit prep screen + live-card boss encounter
- Auto-withdraw on regular raids (Field Lead INT/PERC + HP)
- Multi-team concurrent raid behavior
- 3-enemy roster slot pattern (tanky / ranged+fast / balanced) — themed mythically
- Hazards (Scout perception check, 2-3 per dungeon)

Overrides and divergences are listed below.

## Theme

**Entirely mythical**, per the U band in [dungeon-ranks theme table](./dungeon-ranks.md#theme-bands-per-rank):

- Empire in the sky (Olympus-tier)
- Underworld realms
- Primordial cosmic landscapes
- Authored individually per unique

Each unique dungeon has its own mythic identity, tied to the paired unique operator's lore where it strengthens the packet.

## Boss Complexity

The unique boss carries a **signature authored mechanic**, possibly multi-phase. Substantially more complex than A-rank bosses:

- Custom mechanics allowed beyond the shared effect pool
- Multi-phase encounters allowed
- Phase-specific mechanic profiles allowed
- Boss is the climax of an entire content packet — design weight is on it

Boss stats authored beyond the U band ceiling (typically 90+ across the board, higher where flavor demands).

## Stat Envelopes

Final tuning in `rewrite/economy`. Authored at U-tier with intentional headroom for the boss to feel mythic.

## Loot Model

Inherits the regular dungeon loot model with these specifics:

- **Cash drops apply** — at U-tier rates, well above A. Helps fund endgame unlock chains for other uniques.
- **Reputation drops on boss kill** — U-tier reputation payout (significant leaderboard climb).
- **Dungeon-bound non-unique weapons may drop.** Authored alongside the dungeon at a high non-unique tier (typically A-tier, themed to the dungeon). These are regular weapons in the inventory pool, not unique weapons.
- **Unique weapons do NOT drop here.** Unique weapons have their own separate unlock chains via the [Unique Weapon Requirements](./unique-weapons.md) system. The unique dungeon's loot stream is regular high-tier loot only.
- **Boss kill behavior:**
  - **First defeat:** triggers the paired unique operator's unlock chain progression. Standard high-tier boss loot also drops.
  - **Subsequent defeats:** standard high-tier boss loot only — no further unlock progression on the paired operator (already unlocked). May still satisfy gates for *other* unique unlock chains (e.g., a different unique whose chain requires "defeat any unique boss N times").

## Re-Raidability

**Unique dungeons can be re-raided after the first boss defeat.** The contract closes on boss defeat (matching the regular contract loop), but the unique dungeon **returns to the Operations Management contract pool with no cooldown** — player can pick it up again immediately as a fresh contract.

This makes unique dungeons function as **endgame farming spots** post-clear. Re-raid drops fund:
- Cash gates for other unique operator unlocks
- Cash gates for unique weapon unlocks
- General endgame purchases (room upgrades, etc.)
- Other unique unlock chains that gate on "defeat unique boss N times" or similar

## Access Gating

- **Progression-Tier controls unique dungeon eligibility.** Unique dungeons become dispatchable at PT T6, subject to any authored requirements on the paired unique operator chain.
- **No separate "Unique Dungeon Room."** Operations Management is the dispatch surface for unique dungeons, same as for regular dungeons. The dungeon's specialness is in its content, not in a separate UI.
- **Goal visibility comes from the Unique Operator room.** A paired unique dungeon can appear as a locked requirement in that unique operator's catalog entry before it is dispatchable. It does not need to appear in the Operations contract pool until PT T6 eligibility is reached.

## Custom Logic Allowance

**Uniques may carry one-off code** — same as unique operators / weapons. A unique dungeon may include:

- Custom boss mechanics outside the shared effect pool
- Custom hazards specific to the mythical theme
- Custom encounter compositions (e.g. authored set-piece encounters)
- Custom integration with paired unique operator/weapon unlock chains
- Custom interactions with specific game state

Each unique dungeon's sub-plan defines the custom-logic surface needed.

## Visual Authoring

| Asset | Authoring path |
|---|---|
| Boss portrait | Production-time AI-agent asset work within an authored prompt, manually approved, with shared unique-boss glow treatment per [Asset Pipeline Contract](./asset-pipeline.md). Not runtime AI. |
| Raid backdrop | Production-time AI-generated image per dungeon, revealed slowly through exploration. Mythical-themed. Not runtime AI. |
| Enemy roster | Text-only authoring for initial scope (no enemy assets), matching [dungeon-ranks](./dungeon-ranks.md#enemy-roster-requirements). Visual asset authoring is roadmap. |

## Naming

Full proper authored names tied to mythic landmarks. Examples (placeholder): *"Olympus Aerie," "The Tartarus Vault," "The Marigold Cosm."* Authored individually per unique dungeon, often referencing the paired unique operator's lore.

## Generation Path

- **Pre-authored only.** No procedural generation. Each unique dungeon is hand-built as a content packet:
  - Mythical theme + setting + raid backdrop prompt
  - 3-enemy text-only roster (themed mythically)
  - Authored unique boss with signature mechanic + custom logic as needed
  - 1-2 dungeon-bound non-unique weapons (high-tier, themed to the dungeon)
  - 2-3 themed hazards
  - Unlock chain integration with paired unique operator
- **Sub-plan per unique dungeon** under `rewrite/unique-dungeons-catalog`, owning all of the above plus any custom logic.

## What This Doc Doesn't Cover

- **Specific unique dungeon content.** Lives in individual sub-plans + the future enumerated unique dungeons roster doc.
- **Unique operator / weapon authoring.** Separate product docs.
- **Boss mechanic effect engine implementation.** Code-side.
- **Operations Management dispatch surface.** Lives in [Rooms Catalog](./rooms-catalog.md). Unique dungeon eligibility lives in [Floors Catalog](./floors-catalog.md#progression-tier-backbone).
- **Asset pipeline specifics.** Lives in [Asset Pipeline Contract](./asset-pipeline.md).

## Cross-Doc References

- Unique dungeon implementation: `rewrite/dungeons-catalog` and unique content plans
- Regular dungeon contract (inherited): [Dungeon Rank Requirements](./dungeon-ranks.md)
- Paired unique operator: [Unique Operator Requirements](./unique-operators.md)
- Optional paired unique weapon follow-on: [Unique Weapon Requirements](./unique-weapons.md)
- Asset pipeline (boss images + raid backdrop): [Asset Pipeline Contract](./asset-pipeline.md)
- Operations Management room: [Rooms Catalog](./rooms-catalog.md)
- Visual effects pool (boss mechanic integration): [Visual Effects Pool](./visual-effects-pool.md)
- Per-unique-dungeon sub-plan parent: `rewrite/unique-dungeons-catalog`
