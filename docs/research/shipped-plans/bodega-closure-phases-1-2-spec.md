# Bodega Closure: Phases 1-2 Execution Spec

Phase 1 and Phase 2 deliverable for the now-shipped bodega closure work. This document locks the building upgrade order, names the management problem each upgrade solves, defines slot and capacity changes, and specifies the first bodega-native support room rollout.

Status: implemented. This spec remains checked in as historical implementation context for the shipped bodega baseline.

## Canon Inputs

Read before implementing:

- `docs/roadmap.md`
- `docs/plans/opening-campaign-spec.md`
- `docs/plans/economy-target-envelope.md`
- `docs/plans/management-policy-contract.md`
- `docs/product/gameplay-systems.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/content-rules.md`
- `content/templates/buildings.ts`
- `content/templates/upgrades.ts`
- `content/templates/rooms.ts`
- `content/building-layouts.ts`
- `content/effects.ts`
- `content/requirements.ts`

## Locked Constraints

Inherited from the shipped bodega baseline and the roadmap:

- The bodega stays a bodega. Upgrades make it better, not different.
- No training rooms in the bodega.
- No second-headquarters room identities (infirmary, lounge, break room, gym, sparring room, recruitment office) in the bodega.
- Intel/admin room comes before any consumable-prep work.
- Consumable-prep is optional and narrow if it ships at all.
- Room names and copy follow bodega canon from `docs/world/headquarters-and-rooms.md`.
- Copy tone is workplace comedy under supernatural pressure. Upgrades read as small wins, not power-ups.

---

## Phase 1: The Building Upgrade Arc

### Upgrade Order

The three bodega building upgrades ship in this fixed order. Each requires the previous one. The chain is enforced by `building_tier_min` requirements on later upgrades.

| Order | Upgrade ID                          | Building Tier After | Named Management Problem               |
| ----- | ----------------------------------- | ------------------- | -------------------------------------- |
| 1     | `upgrade/building/bodega:frontage`  | 2                   | The guild looks accidental             |
| 2     | `upgrade/building/bodega:annex`     | 3                   | There is no room for anything new      |
| 3     | `upgrade/building/bodega:extension` | 4                   | Operations still overflow into nowhere |

The building template `building/bodega` must list all three in `upgradeIds`:

```
upgradeIds: [
  "upgrade/building/bodega:frontage",
  "upgrade/building/bodega:annex",
  "upgrade/building/bodega:extension",
]
```

Each building upgrade advances the building tier by 1. The effects array captures additional gameplay changes.

---

### Upgrade 1: Street-Facing Frontage

**ID:** `upgrade/building/bodega:frontage`

**Management problem:** The guild looks like an accident. The sign is faded, the awning drips, the storefront tells every walk-in and every prospect that nobody is running this place on purpose. Foot traffic quality is low because the building itself is a negative signal. Cash flow from the storefront is anemic because the storefront is embarrassing.

**What changes:**

The player cleans up the exterior. A real sign goes up. The awning stops dripping. The deli case stops fogging up. The bodega starts looking like a place that does something on purpose instead of a place that is happening by accident.

**What does NOT change:**

No new room slots. No new operator slots. The bodega is the same size. It just looks and runs better.

**Requirements:**

| Requirement | Value | Rationale                                                                         |
| ----------- | ----- | --------------------------------------------------------------------------------- |
| Cash        | $200  | Affordable by contracts 5-8 for the average scenario. First real investment.      |
| Reputation  | 12    | Achievable by contracts 3-5 (2 successes from start). Proves the guild functions. |

**Correction:** The current shipped value for reputation (140) is a placeholder artifact. At +7 rep per success and +2 per mixed result, 140 rep is unreachable during the bodega phase. The target is 12.

**Effects:**

| Effect                     | Value                                                  | Rationale                                                 |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `modify_resource_income`   | cash +$6/day                                           | The storefront earns more because it looks professional.  |
| `modify_morale`            | +1                                                     | Operators notice the place stopped looking condemned.     |
| `modify_attraction_weight` | `role:medic` +1, `role:scout` +1, `role:field_lead` +1 | Better storefront means better foot traffic across roles. |

**Pacing target:** Contracts 5-8 for average scenario. Matches beat 11 (upgrade decision) from opening-campaign-spec.md. The player should be deciding on Frontage vs. Records Wall vs. Hot Coffee around the same window — a real resource-allocation decision, not a predetermined queue.

---

### Upgrade 2: The Annex

**ID:** `upgrade/building/bodega:annex`

**Management problem:** The bodega is physically full. Four rooms occupy every usable square foot. The guild cannot add new capabilities because there is literally nowhere to put them. Every new operational need — intel work, proper inventory staging, administrative paperwork — gets crammed into whatever room has a free corner. The guild's growing ambitions do not fit inside the building's current footprint.

**What changes:**

The player absorbs the empty unit next door. Construction dust everywhere. Operators complain about the noise. When it clears, the bodega has two new usable spaces and room for a larger roster. The annexed space is not glamorous — bare walls, patchy wiring, a radiator that clanks — but it is new square footage that the guild did not have before.

**What changes (gameplay):**

- 2 new room slots (4 usable → 6 usable)
- 2 new operator slots (7 cap → 9 cap)
- Unlocks the Back Office and Backstock room templates

**Requirements:**

| Requirement   | Value | Rationale                                                                                       |
| ------------- | ----- | ----------------------------------------------------------------------------------------------- |
| Cash          | $350  | A real investment. Requires sustained contract success, not a single windfall.                  |
| Reputation    | 25    | The guild has proven itself across multiple contracts. The landlord takes the player seriously. |
| Building tier | ≥ 2   | Frontage must be purchased first. The guild must look legitimate before expanding.              |

**Effects:**

| Effect                   | Value                     | Rationale                                                |
| ------------------------ | ------------------------- | -------------------------------------------------------- |
| `add_room_slot`          | +2                        | Two new usable positions in the annexed space.           |
| `grant_operator_slot`    | +2                        | Larger space supports a bigger roster.                   |
| `unlock_room_template`   | `room/back_office:tier_1` | Intel/admin surface becomes available.                   |
| `unlock_room_template`   | `room/backstock:tier_1`   | Expanded logistics surface becomes available.            |
| `modify_resource_income` | cash +$4/day              | Larger footprint means slightly more storefront traffic. |

**Pacing target:** Contracts 10-15 for average scenario. By this point the player has Frontage, at least one room upgrade, and is managing a 5-6 operator roster. The Annex is the mid-bodega investment that changes what rooms are available. The player should feel the before-and-after: "I used to have four rooms. Now I have decisions about what rooms to build."

---

### Upgrade 3: Backyard Extension

**ID:** `upgrade/building/bodega:extension`

**Management problem:** Even with the annex, the guild has no outdoor staging or overflow space. Teams form and depart from wherever they happen to be standing. There is no place to stage equipment before a contract, no overflow area when the interior rooms are full, no space that says "this is where the work actually starts." The back alley is dead square footage that the guild needs.

**What changes:**

The back alley or yard becomes usable space. Concrete, a corrugated canopy, a drainage problem that somebody will eventually fix. Not glamorous. But it is new square footage, and the player is not paying Manhattan rent for it. By the time this upgrade lands, the bodega is fully expanded: a proper neighborhood deli with a respected guild operation running out of the back.

**What changes (gameplay):**

- 1 new room slot (6 usable → 7 usable, all layout positions now available)
- 1 new operator slot (9 cap → 10 cap)
- Unlocks the Alley Staging room template

**Requirements:**

| Requirement   | Value | Rationale                                                                                      |
| ------------- | ----- | ---------------------------------------------------------------------------------------------- |
| Cash          | $500  | The largest bodega investment. Comparable to several contracts' net income.                    |
| Reputation    | 35    | Close to the relocation gate (proposed ≥ 40). The guild is nearly ready to outgrow the bodega. |
| Building tier | ≥ 3   | Annex must be purchased first. The guild fills inside space before expanding outside.          |

**Effects:**

| Effect                 | Value                       | Rationale                                                        |
| ---------------------- | --------------------------- | ---------------------------------------------------------------- |
| `add_room_slot`        | +1                          | Final room position in the bodega layout.                        |
| `grant_operator_slot`  | +1                          | Modest roster growth. The bodega tops out at 10.                 |
| `unlock_room_template` | `room/alley_staging:tier_1` | Staging and operations overflow surface becomes available.       |
| `modify_morale`        | +1                          | Outdoor space. People can breathe. The place feels less trapped. |

**Pacing target:** Contracts 18-25 for average scenario. The Extension is the final bodega upgrade. It should land a few contracts before the relocation gate (proposed at contracts 20-30). The player should feel "the bodega is maxed out" shortly before "it's time to move."

---

### Capacity Progression Summary

| State           | Room Slots | Operator Cap | Available Room Templates                      |
| --------------- | ---------- | ------------ | --------------------------------------------- |
| New game        | 4          | 7            | Register, Counter, Dining Area, Supply Closet |
| After Frontage  | 4          | 7            | Same (no new rooms from Frontage)             |
| After Annex     | 6          | 9            | + Back Office, Backstock                      |
| After Extension | 7          | 10           | + Alley Staging                               |

### Layout Stage Mapping

The building layout (`content/building-layouts.ts`) needs three stages corresponding to the building tiers:

| Stage ID           | Minimum Tier | Shell Change                                                            |
| ------------------ | ------------ | ----------------------------------------------------------------------- |
| `bodega/starter`   | 1            | Current bodega footprint. 7 slot positions, 4 usable at base.           |
| `bodega/annex`     | 3            | Expanded shell incorporating adjacent unit. Same 7 positions, 6 usable. |
| `bodega/extension` | 4            | Full shell with backyard area. Same 7 positions, all 7 usable.          |

Tier 2 (Frontage) does not change the physical layout — the shell stays the same. The visual change is exterior-only (signage, awning, storefront quality) handled by the HQ environment presentation layer, not by a layout stage change.

The exact grid coordinates and shell dimensions for the annex and extension stages are implementation concerns. The spec locks the slot count and narrative intent, not the pixel geometry.

---

## Phase 2: Bodega-Native Support Room Rollout

### Rollout Order

| Order | Room ID                     | Name            | Gated By  | Management Loop Served                  |
| ----- | --------------------------- | --------------- | --------- | --------------------------------------- |
| 1     | `room/back_office:tier_1`   | The Back Office | Annex     | Intel, compliance, admin                |
| 2     | `room/backstock:tier_1`     | The Backstock   | Annex     | Inventory, logistics, equipment staging |
| 3     | `room/alley_staging:tier_1` | The Alley       | Extension | Raid prep, team staging, overflow       |

The Back Office must be available first. The roadmap requires an intel/admin surface before any other support room work.

The Backstock and Back Office unlock together when the Annex is purchased, but the Back Office is the recommended first placement for authored guidance purposes.

The Alley unlocks when the Backyard Extension is purchased. It is the final bodega room.

### Deferred: Gear Bench

The roadmap mentions "optionally add a narrow consumable-prep layer later in the bodega as a lightweight precursor to crafting, without turning the bodega into a workshop tier." That room is **not included** in this rollout. Reasons:

- The three shipped rooms already fill every new slot the bodega upgrades provide.
- The intel/admin and logistics rooms are higher priority per the roadmap.
- Adding a crafting precursor before the management loops around the first three rooms are proven risks diluting the bodega's identity.
- If consumable-prep is added later, it would replace a player's room-placement decision (one of the three slots) rather than adding a fourth expansion. That placement tradeoff is the right design — room slots are scarce in the bodega.

---

### Room 1: The Back Office

**ID:** `room/back_office:tier_1`

**Canon:**

A windowless room in the annexed space, separated from the main store by a door that actually closes. A desk, a lamp, a filing cabinet that predates the building, and a corkboard where the player tracks contract paperwork, pending permits, and whatever the city just asked for this week. It smells like instant coffee and administrative anxiety. This is where the guild stops pretending the register is a functional operations center.

The register still handles intake and walk-ins. The Back Office handles everything that needs a closed door and a flat surface that is not also a deli counter.

**Tags:** `room:operations`, `ops:intel`

**Base capacity:** 2

**Available in:** `building/bodega`

**Unlocked by:** `upgrade/building/bodega:annex` via `unlock_room_template`

**Management problem solved:**

Contract preparation is invisible. The player has no facility that improves intel quality, buffers compliance pressure, or gives administrative work a real location. Intel arrives at the same confidence floor regardless of guild investment. Compliance incidents hit at full severity because nobody is doing the paperwork. Staffing administration — payroll, scheduling, permit renewals — happens at the register between selling loose cigarettes, which is not a sustainable operations model.

**Systems integration:**

| System Hook                     | Effect                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Intel confidence                | Active Back Office raises the intel-confidence floor on posted contracts by one tier (low → medium). |
| Compliance/regulatory incidents | Reduces severity or DC of compliance-category incident consequences when staffed.                    |
| Contract bidding surface        | The Back Office is the authored facility surface for contract research and bid evaluation.           |
| Event log feedback              | Room activity generates admin-themed event-log entries (permits filed, intel reviewed, etc.).        |

**Staff hook:** Reception or dedicated admin staff assigned to the Back Office improves intel quality and compliance buffering. An unstaffed Back Office provides the room's base benefit (intel floor upgrade) but not the staffed bonus.

**Room upgrades (future):** A Records Board upgrade (parallel to Register's Records Wall) could improve contract comparison and intel confidence further. Spec deferred until Phase 2 room upgrades are scoped.

---

### Room 2: The Backstock

**ID:** `room/backstock:tier_1`

**Canon:**

The annexed unit's storage space, finally organized into something that is not a literal closet. Shelving that goes to the ceiling, a fold-out staging table, and enough room that gear stops disappearing between raids. The supply closet still exists — it is still a closet — but the heavy inventory and staging work now happens here. Boris has opinions about the labeling system. They are correct.

**Tags:** `room:staffing`, `staff:logistics`

**Base capacity:** 2

**Available in:** `building/bodega`

**Unlocked by:** `upgrade/building/bodega:annex` via `unlock_room_template`

**Management problem solved:**

The supply closet is literally a closet. It cannot handle a growing inventory. Equipment staging for multiple teams happens in the same 4x3 tile space where the mops live. As the roster grows from 4 to 7-9 operators and gear accumulates from successful contracts, the closet becomes a bottleneck. Gear gets misplaced. Pre-raid loadout is chaotic. The guild needs a real logistics room.

**Systems integration:**

| System Hook                  | Effect                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Resource cost modifier       | Active Backstock reduces gear and supply costs (existing `modify_resource_cost` on cash, ×0.92). |
| Equipment readiness          | Staffed Backstock improves the gear-availability check before raid departure.                    |
| Inventory management surface | The Backstock is the authored facility for inventory review and equipment assignment.            |
| Event log feedback           | Room activity generates logistics-themed entries (stock organized, shipment received, etc.).     |

**Staff hook:** Logistics staff assigned to the Backstock improves equipment turnaround and cost efficiency. This is the natural second assignment for Boris once the Supply Closet has Labeled Bins.

**Relationship to Supply Closet:**

The Backstock does not replace the Supply Closet. Both can be active simultaneously. The Supply Closet remains the lightweight gear-storage room; the Backstock adds staging capacity and cost efficiency. A bodega running both has redundant logistics — which is the point. The bodega is small enough that overlapping rooms is a feature, not waste.

---

### Room 3: The Alley

**ID:** `room/alley_staging:tier_1`

**Canon:**

The back alley, paved over, half-covered by a corrugated canopy that leaks when it rains hard. A staging table made from a door laid across two sawhorses. A whiteboard bolted to the fence. Enough space to get a team organized before they leave through the back instead of filing out past customers in the store. Not glamorous. But this is the first time the guild has had a place to actually prepare for a contract instead of just walking out the front door and hoping for the best.

On slow days, operators sit out here. It is technically outside. That counts for something when you spend most of your time in a cramped bodega or a collapsing dungeon.

**Tags:** `room:operations`, `ops:staging`

**Base capacity:** 3

**Available in:** `building/bodega`

**Unlocked by:** `upgrade/building/bodega:extension` via `unlock_room_template`

**Management problem solved:**

Teams form and depart from wherever they happen to be standing. There is no staging discipline, no pre-raid preparation space, no buffer between "hanging around the bodega" and "walking into a dungeon." The guild's operations start and end at the register, which is also the deli counter, which is also the public face of the business. The Alley separates staging from storefront, giving raid teams a real departure point and a place to decompress on return.

**Systems integration:**

| System Hook               | Effect                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Raid preparation modifier | Active Alley applies a small raid-readiness bonus to teams that stage before departure.                 |
| Team formation quality    | Staffed Alley improves autonomous team-composition scoring (teams form with slightly better role fit).  |
| Recovery overflow         | The Alley serves as an overflow recovery/social space when the Dining Area is at capacity.              |
| Morale buffer             | Operators assigned idle or social blocks in the Alley gain a small morale tick (outdoor space benefit). |
| Event log feedback        | Room activity generates staging-themed entries (team staged, equipment checked, departure confirmed).   |

**Staff hook:** Logistics or reception staff can support staging operations. Staffed Alley improves the raid-readiness and team-formation bonuses.

**Capacity rationale:** Base capacity 3 is higher than the other new rooms because the Alley's physical space is larger (outdoor) and it serves a dual staging/social role. It should feel like a relief valve, not another cramped room.

---

## Upgrade Pacing Against The Economy Envelope

The economy target envelope (`docs/plans/economy-target-envelope.md`) defines trajectory projections for three scenarios across 8 opening-arc contracts. The building upgrades must align with those trajectories and extend naturally into the mid-bodega arc beyond contract 8.

### Compatibility Check

| Upgrade   | Cost | Rep Gate | Earliest Affordable (Skilled) | Target Window (Average) | Latest Affordable (Struggling) |
| --------- | ---- | -------- | ----------------------------- | ----------------------- | ------------------------------ |
| Frontage  | $200 | 12       | Contract 3-4                  | Contract 5-8            | Contract 8-12                  |
| Annex     | $350 | 25       | Contract 8-10                 | Contract 10-15          | Contract 15-22                 |
| Extension | $500 | 35       | Contract 14-18                | Contract 18-25          | Contract 25-35                 |

These windows are derived from the envelope's trajectory projections:

- **Skilled** (75% success): Treasury of ~$1,266 after 8 contracts, rep ~105 by contract 20. Frontage affordable early. All three upgrades plus room upgrades complete well before relocation.
- **Average** (50% success): Treasury of ~$943 after 8 contracts, rep ~70 by contract 20. Frontage in the opening arc. Annex mid-bodega. Extension approaching relocation.
- **Struggling** (25% success): Treasury of ~$429 after 8 contracts, rep ~10 by contract 20. Frontage delayed. Annex significantly delayed. Extension may not land before relocation pressure becomes the primary concern.

### Decision Competition

Frontage competes directly with room upgrades (Records Wall at $90, Hot Coffee at $110, Labeled Bins at $100). The player must decide: invest in the storefront (income and legitimacy) or invest in existing rooms (capacity and specialization). This is the first real resource-allocation decision the building arc creates.

The Annex competes with recruitment costs (ongoing payroll of new operators) and any deferred room upgrades. A player who recruits aggressively may delay the Annex because payroll eats into savings. A player who hoards cash for the Annex may fall behind on roster depth. Both paths are intentionally viable.

The Extension competes with relocation savings. A player close to the relocation gate may choose to save for the move instead of buying the Extension. That is a valid decision — the Extension is the final comfort upgrade, not a gate requirement.

---

## Room Upgrade Planning For New Rooms

Each new room should support at least one room-targeted upgrade in the bodega tier. These upgrades are **not defined in this spec** — they belong to a follow-up Phase 2 room-upgrade pass once the base rooms are implemented and playtested. The following notes anchor what those upgrades should target:

| Room          | Upgrade Direction                                                                            |
| ------------- | -------------------------------------------------------------------------------------------- |
| Back Office   | Intel board or records expansion: deeper contract intel, compliance buffering, capacity +1   |
| Backstock     | Staging racks or bulk system: further cost reduction, equipment-readiness speed, capacity +1 |
| Alley Staging | Canopy fix or staging table: raid-prep bonus increase, weather-independent operation, morale |

---

## Verification Requirements

- Run `vp check` after template and layout changes.
- Run `vp test` after wiring effects into runtime systems.
- Run `vp build` after integration is complete.
- Validate upgrade chain with economy harness runs once Phase 3 of `economy-and-balance-harness-plan.md` is in place.
- Verify that each upgrade changes the management loop in a way the player can observe through event-log feedback and facility availability.
- Verify that the Annex and Extension layout stages render correctly in the HQ world view.
- Verify that unlocked room templates appear in the room-placement surface after upgrade purchase.
- Verify save/load round-trips for all building tiers, room placements, and operator cap changes.

## Dependencies

| Dependency                           | Status    | Notes                                                  |
| ------------------------------------ | --------- | ------------------------------------------------------ |
| Opening campaign spec starter state  | Satisfied | 4 ops, 2 staff, 4 rooms, $400 treasury                 |
| Economy target envelope              | Satisfied | Trajectory projections for 3 scenarios                 |
| Management policy contract           | Satisfied | 5 policies shipped, no changes required                |
| `add_room_slot` effect type          | Shipped   | `content/effects.ts`                                   |
| `grant_operator_slot` effect type    | Shipped   | `content/effects.ts`                                   |
| `unlock_room_template` effect type   | Shipped   | `content/effects.ts`                                   |
| `building_tier_min` requirement type | Shipped   | `content/requirements.ts`                              |
| Building layout stage system         | Shipped   | `content/building-layouts.ts`, stage selection by tier |
| Room template registration           | Shipped   | `content/templates/rooms.ts`, template registry        |

No new effect types or requirement types are needed. The existing contract covers every upgrade and room in this spec.
