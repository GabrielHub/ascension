# Bodega Closure: Phases 4-5 Execution Spec

Phase 4 and Phase 5 deliverables for `bodega-closure-plan.md`. This document locks the bodega-era boss presentation set, the content-breadth expansion targets within the F/E/D budget, the explicit relocation trigger, and the handoff contract into the next headquarters tier.

Status:

- The boss-presentation slice from Phase 4 is now shipped.
- The relocation gate surface and player-facing interruption entry flow from Phase 5 are now wired into the shipped runtime/UI.
- The relocation and second-building handoff material in Phase 5 remains active.

## Canon Inputs

Read before implementing:

- `docs/roadmap.md` (Current Milestone: Bodega Endgame, Narrative Presenter Pass, And Porter's Handoff)
- `docs/plans/bodega-closure-plan.md`
- `docs/research/shipped-plans/bodega-closure-phases-1-2-spec.md`
- `docs/research/shipped-plans/economy-target-envelope.md`
- `docs/product/presentation.md`
- `docs/product/asset-production.md`
- `docs/world/headquarters-and-rooms.md` (Building Relocation, Relocation Tone)
- `docs/world/content-rules.md` (Bosses, Boss Design Principles, Copy And Naming Rules)
- `docs/world/premise-and-tone.md`
- `content/templates/missions.ts`
- `app/ui/boss-art.ts`
- `app/ui/encounter-surface.tsx`

## Locked Constraints

Inherited from `bodega-closure-plan.md`, the roadmap, and earlier specs:

- All content stays within F, E, and D rank budgets. No C+ content in the bodega era.
- Bosses are F-rank. Bodega-era contracts do not produce higher-rank bosses.
- Content breadth is authored, not procedurally generated. Every boss, recruit identity, site concept, and gear alternative ships as an explicit template or data entry.
- Site concepts and bosses ship as paired content. A raid site is not valid shipped content until it has an attached `bossId` and a matching boss template.
- Boss encounter art follows the asset production contract: canon grounding, brief, production, review, promotion.
- Relocation is a narrative and systemic milestone, not a silent capacity upgrade.
- The bodega stays a bodega until the moment it is left behind.

---

## Phase 4: Expand Early Content Within Locked Budgets

### 4.1 — Bodega-Era Boss Presentation Set

Three bosses ship in the bodega era. All three are already defined in `content/templates/missions.ts` with full combat profiles and encounter data, and the shipped runtime now resolves them to authored encounter portraits instead of the generic threat sigil.

This section records the locked identity, tone, and asset expectations that produced the shipped boss set. Treat it as the reference contract for future revisions, not as an unstarted production brief.

---

#### Boss 1: Tunneler Brood-Mother

**Boss ID:** `boss/tunneler-brood-mother`

**Mission context:** Clearance contracts. The dungeon is an infested site — something burrowed in beneath a city block and started breeding. The site feels like infrastructure gone wrong: cracked foundations, collapsed utility runs, organic growth pushing through concrete.

**Identity:**

The Tunneler Brood-Mother is not a creature with a personality. It is a biological anchor — the thing that turned a basement or utility corridor into a hive. It does not communicate. It does not negotiate. It produces offspring, defends territory, and escalates when threatened. The encounter is an extermination, not a confrontation.

**Visual direction:**

- Silhouette: massive, low-slung, segmented. Wider than tall. Occupies the chamber floor like it grew there.
- Material read: chitin plates over soft tissue. Cracked exoskeleton showing biological underlayers. Not clean insectoid — damaged, calloused, reinforced by repeated molting in a confined space.
- Color anchor: muted earth tones — clay, rust, ochre — with translucent amber or sickly yellow at joints and egg clusters. No bright accent colors. The threat reads through mass and wrongness, not color.
- Environment integration: partially embedded in the chamber floor or wall. Roots, tendrils, or egg-sac structures connect the Brood-Mother to the surrounding architecture. It looks like part of the site.
- Readable affordances: visible egg clusters or brood sacs somewhere on or near the body. These anchor the "summon-pressure" tag visually. The viewer should understand "this thing makes more things" at a glance.
- Scale cue: the SVG should read as significantly larger than an operator portrait. The Brood-Mother fills its space.

**Forbidden directions:**

- Not a spider. Not an alien queen. Not a clean sci-fi bioform. The design language is urban pest biology scaled up to building-wrecker size, not movie-monster iconography.
- No glowing eyes or obvious "face." The Brood-Mother does not need to look at the viewer. It is not sapient.
- No symmetrical beauty. This thing is scarred, asymmetric, and built for a confined environment.

**Tone in copy:**

Encounter copy should read as pest-control operations gone catastrophically wrong. The operators are not fighting a dragon. They are trying to kill something that should not exist in a utility basement and is much harder to kill than anyone expected. The humor, if any, is in the mundane framing: "The extermination estimate was off by several orders of magnitude."

**Combat tag anchors for art:**

- `boss:area-damage` — the Brood-Mother's attacks affect the whole space. Visual should suggest ground-level shockwaves, tunnel collapses, or brood stampedes.
- `boss:summon-pressure` — broodling spawning should be visually plausible from the design. Egg sacs, brood chambers, or visible offspring in various stages.

---

#### Boss 2: Sewer Warden

**Boss ID:** `boss/sewer-warden`

**Mission context:** Containment contracts. The dungeon is a utility-infrastructure site — a sewer junction, water main hub, or maintenance corridor where the rift turned plumbing into something hostile. The site feels industrial, wet, and oppressively enclosed.

**Identity:**

The Sewer Warden is the rift's distortion of the infrastructure itself. It is not a creature that moved into the sewers. It is what the sewers became when reality folded. Pipes, valves, grating, and drainage hardware fused into something that moves, defends, and maintains. It treats the site like territory to be preserved, not prey to be hunted. The encounter is a struggle against the building itself.

**Visual direction:**

- Silhouette: vertical or semi-upright. Tall, rigid, columnar. Reads like a corrupted utility column or fused pipe cluster that developed limbs or articulation.
- Material read: corroded iron, pitted concrete, industrial brass fittings. Visible pipe segments, valve wheels, grating panels, and drainage grilles incorporated into the body as structural elements. Water stains, mineral deposits, and biological film on metal surfaces.
- Color anchor: industrial greys, verdigris green on copper/brass, rust orange on iron, dark wet concrete. The only "organic" color comes from biofilm, algae, or the faint glow of rift energy in joints or cracks — kept subtle, not neon.
- Environment integration: the Warden's lower body should merge with or emerge from the floor, pipes, or wall infrastructure. It looks like the junction room grew a guardian. Loose pipes or conduits may trail from the body into the surrounding architecture.
- Readable affordances: visible valve or seal mechanism somewhere on the body, anchoring the "maintenance-seal" ability. A pipe-like extension or lashing limb to anchor "pipe-lash." The viewer should read "this is infrastructure that attacks" at a glance.
- Scale cue: taller than an operator. Not massive like the Brood-Mother, but imposing through height and rigidity. It blocks the passage.

**Forbidden directions:**

- Not a golem. Not a robot. Not a humanoid in armor. The Warden has no face, no personality, and no designed-to-fight aesthetic. It is plumbing that became hostile.
- No clean mechanical joints or sci-fi articulation. Movement should look wrong — pipes bending where pipes should not bend, valves rotating to redirect force instead of water.
- No slime-monster or blob aesthetic. The Warden is hard infrastructure, not organic ooze. Any biological elements are surface-level contamination, not the core identity.

**Tone in copy:**

Encounter copy should read as a maintenance emergency that became a combat scenario. The operators are not slaying a monster. They are trying to break something that the city's plumbing system was never supposed to produce. Reports should reference PSI readings, structural integrity, and containment protocol. "The junction's maintenance automaton has exceeded its operational parameters" is closer to the right register than "a beast lurks in the deep."

**Combat tag anchors for art:**

- `boss:resilience-pierce` — the Warden's attacks bypass defenses. Visual should suggest brute hydraulic force or piercing industrial strikes.
- `boss:recovery-suppress` — the Warden makes recovery harder. Visual should suggest contamination, toxic runoff, or environmental hostility (the water is bad, the air is bad, nothing heals clean in here).

---

#### Boss 3: Phantom Stalker

**Boss ID:** `boss/phantom-stalker`

**Mission context:** Extraction contracts. The dungeon is a site where the rift created spatial distortion — a building interior where rooms do not connect correctly, light behaves wrong, and something moves between the gaps. The site feels residential or commercial, but warped: familiar architecture with impossible geometry.

**Identity:**

The Phantom Stalker is the rift's distortion of absence — the thing in the space between rooms, behind walls, inside the gaps that should not exist. It is fast, evasive, and predatory. Unlike the Brood-Mother (which is biological and territorial) or the Warden (which is structural and defensive), the Stalker is spatial and aggressive. It hunts. It chooses targets. It disappears and reappears. The encounter is a pursuit in hostile architecture.

**Visual direction:**

- Silhouette: elongated, angular, predatory. Taller than an operator but narrower. Limbs are long and sharp. The body reads as something that fits through gaps and folds itself into spaces that should not hold anything. More mantis than panther — angular geometry, not smooth curves.
- Material read: the Stalker's surface should suggest the architecture it hides in — plaster textures, wallpaper patterns, wood-grain distortions, or glass-fragment patches that shift as if the body is made of the building's own surfaces improperly reassembled. Semi-transparent or phasing edges at extremities.
- Color anchor: the palette of the interior it haunts. Muted wallpaper colors, institutional beige, apartment-hallway lighting. Accents of spatial distortion: slight chromatic aberration, double-edge rendering, or afterimage trails at limb tips. The "supernatural" read comes from wrongness in familiar colors, not from alien hues.
- Environment integration: the Stalker should look like it could fold back into a wall or doorframe. Edges of the body may blur into architectural elements. Parts of the silhouette can suggest doorframes, window mullions, or baseboard molding distorted into limb shapes.
- Readable affordances: the afterimage or phase-shift quality should be visible in the static portrait, anchoring the speed and evasion identity. The viewer should read "this thing moves wrong and is hard to pin down" at a glance.
- Scale cue: slightly taller than operator scale. The threat is speed and elusiveness, not mass.

**Forbidden directions:**

- Not a ghost. Not a shadow demon. Not a cloaked assassin. The Stalker is a spatial anomaly that happens to be predatory, not an undead or spectral entity.
- No flowing robes, spectral chains, or horror-movie iconography. The uncanny quality comes from architecture-made-wrong, not from genre ghost design.
- No face. No eyes. If the head region has any readable features, they should be architectural — a door-viewer lens, a window mullion crosshair, a light fixture — not biological.

**Tone in copy:**

Encounter copy should read as a spatial anomaly report that escalated into a combat extraction. The operators are not ghost-hunting. They are trying to locate and neutralize something that exists in the building's impossible geometry while extracting a target. Reports should reference spatial readings, phase-shift timestamps, and sightline reliability. "Contact lost at 14:32. Contact reacquired 0.3 seconds later in a room that does not connect to the previous one" is the register.

**Combat tag anchors for art:**

- `boss:speed-drain` — the Stalker makes teams slower. Visual should suggest spatial disorientation, afterimage confusion, or architecture shifting to impede movement.
- `boss:intel-resist` — the Stalker is hard to predict or track. Visual should suggest phase-shifting, transparency, or spatial unreliability.

---

### 4.2 — Boss Art Production Requirements

**Asset family:** Boss encounter portrait SVG

**Canonical file locations:**

Each boss encounter SVG ships to `public/data/svg-environments/raids/bosses/` using the boss ID's slug:

| Boss ID                      | File Path                                                             |
| ---------------------------- | --------------------------------------------------------------------- |
| `boss/tunneler-brood-mother` | `public/data/svg-environments/raids/bosses/tunneler-brood-mother.svg` |
| `boss/sewer-warden`          | `public/data/svg-environments/raids/bosses/sewer-warden.svg`          |
| `boss/phantom-stalker`       | `public/data/svg-environments/raids/bosses/phantom-stalker.svg`       |

**Registration:**

The shipped SVG set should remain mapped in `app/ui/boss-art.ts`:

```ts
const BOSS_ART_MAP: Record<string, string> = {
  "boss/the-dispatcher": "/data/svg-environments/raids/bosses/the-dispatcher.svg",
  "boss/the-superintendent": "/data/svg-environments/raids/bosses/the-superintendent.svg",
  "boss/tunneler-brood-mother": "/data/svg-environments/raids/bosses/tunneler-brood-mother.svg",
  "boss/sewer-warden": "/data/svg-environments/raids/bosses/sewer-warden.svg",
  "boss/phantom-stalker": "/data/svg-environments/raids/bosses/phantom-stalker.svg",
};
```

**Raid environment index:**

Each boss portrait should remain registered in `content/data/raid-environment-index.json` with `category: "enemy"`, `tags: ["boss", "encounter", "portrait"]`, and its current review status.

**SVG requirements:**

- ViewBox: no fixed constraint, but the SVG should render cleanly at the encounter surface's display size (h-40 / ~160px height, auto width). The existing boss portraits use this framing.
- Style: authored SVG with inline styles. No external stylesheet dependencies. No raster images embedded.
- Composition: the boss occupies the center of the viewBox. Negative space around the figure is acceptable and expected — the encounter surface provides its own backdrop glow and framing.
- Color: all fills and strokes should use the palette defined in the visual direction above. The encounter surface adds a `drop-shadow` with ember tones; the SVG itself should not duplicate that glow.

**Production pipeline:**

Each boss follows the asset production contract (Stage 1-6):

1. Canon grounding: locked in section 4.1 above.
2. Asset brief: the visual direction, forbidden directions, and combat tag anchors in section 4.1 constitute the brief.
3. Recipe preview: a rough composition sketch or low-fidelity SVG showing silhouette, scale, and key readable affordances. Review before final production.
4. Module breakdown: not applicable — boss portraits are single authored SVGs, not modular compositions.
5. Asset production: produce the final SVG.
6. Review and promotion: validate in the encounter surface against the shipped encounter flow (boss commitment → encounter modal → boss presence zone). Promote to `status: "approved"` in the raid environment index after human review.

**Shipped baseline for boss art:**

- All three boss IDs in `content/templates/missions.ts` resolve to authored SVGs via `getBossArtPath()`.
- The encounter surface renders authored boss art instead of the generic threat sigil for every shipped bodega-era contract.
- Each SVG passes human review in the encounter surface at runtime display size.

---

### 4.3 — Content Breadth Expansion Targets

Phase 4 also expands recruit identities, site concepts, gear alternatives, and enemy families. This section defines the scope and constraints, not the individual content entries. Individual entries are authored in their respective template files during implementation.

**Recruit breadth:**

- Target: expand the authored recruit pool so repeated bodega campaigns encounter meaningfully different rosters. The shipped starting set is the baseline; the expansion adds variety, not power.
- Rank distribution: F-rank recruits are the most common. E-rank recruits appear with lower probability. D-rank recruits are rare in the bodega era. Exact weights are owned by the balance ledgers from the economy harness plan.
- Identity diversity: new recruit identities must follow the naming rules in `docs/world/content-rules.md`. Names reflect New York's real diversity. No joke names, pun names, or anime-style names. Each recruit is an authored person with role, personality, and social read.
- Portrait recipes: new recruits use the modular portrait assembly pipeline. Recipe variation comes from part combination, not from new part categories.

**Site concept breadth:**

- Target: expand the pool of bodega-era contract site concepts so repeated campaigns do not always raid the same location archetype.
- All site concepts must be grounded in real New York locations that a rift consumed. The dungeon is the warped version of a real place.
- Site concepts must stay within F-rank scale. These are basement-level, utility-level, or single-building incursions. Not subway networks or skyscraper interiors — those belong to higher tiers.
- Each new site concept should suggest a distinct visual read for the raid map, even if the shipped tile set is shared in the first pass.
- Each new site concept must ship with one concrete attached `bossId`, and that boss must already exist as a matching boss template and encounter definition before the site is considered complete.

**Gear breadth:**

- Target: expand viable gear alternatives so teams can be equipped with meaningfully different loadouts.
- New gear stays within F, E, and D rank budgets.
- Gear names follow content rules: functional and descriptive. Higher-rank gear can be slightly more evocative but should still read as equipment.
- New weapons must follow the base weapon SVG recipe and rank-variant derivation rules in the asset production contract.

**Enemy family breadth:**

- Target: expand the pool of enemy groups that appear in bodega-era contracts.
- Enemy design must reflect the dungeon theme. Enemies are products of the rift, not independent creatures.
- Enemy categories (swarm, stalker, brute, hazard, sentinel) from `docs/world/content-rules.md` should be represented across the expanded set.

**Done-when for content breadth:**

- Repeated bodega campaigns no longer collapse into the same few faces, sites, loadouts, and boss presentations.
- New content entries pass template validation (`vp check`) and runtime integration (`vp test`).
- Content stays within the authored balance ledgers from the economy harness plan.

---

## Phase 5: Ship The Relocation Gate

### 5.1 — Relocation Trigger Definition

The relocation gate is the explicit condition that enables the bodega-to-next-headquarters transition. It is not a soft suggestion. When the trigger is met, the relocation event becomes available. Until then, it does not.

**Trigger prerequisites (all must be satisfied simultaneously):**

| Prerequisite              | Threshold | Rationale                                                                                      |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| Building tier             | ≥ 4       | All three bodega upgrades purchased. The bodega is fully expanded.                             |
| Reputation                | ≥ 40      | The guild has earned sustained respect across many contracts. Not achievable by a few wins.    |
| Treasury                  | ≥ $600    | The guild can afford a move. This is a savings gate, not an income gate.                       |
| Contracts completed       | ≥ 20      | The player has experienced the intended management loop repeatedly.                            |
| Active roster size        | ≥ 8       | The guild has a functioning roster, not a skeleton crew. Proves recruitment pressure was felt. |
| Boss encounters completed | ≥ 3       | The guild has faced real threats. Not just contract completions — actual boss encounters.      |

**Why these thresholds:**

- **Building tier ≥ 4** ensures the player has invested in the bodega across all three upgrades. Skipping straight to relocation from a tier-1 bodega is not possible.
- **Reputation ≥ 40** is 5 points above the Extension's gate (35). The economy envelope projects average-scenario rep at ~70 by contract 20, so 40 is achievable for average players around contract 15-20. Struggling players reach it later but still within the bodega window.
- **Treasury ≥ $600** is larger than any single bodega upgrade but achievable through savings discipline. It ensures the player is not relocating from poverty. The treasury is consumed by the relocation event — this is a spend, not a passive gate.
- **Contracts completed ≥ 20** ensures the player has played the loop enough times to have experienced roster management, staffing pressure, gear decisions, room tradeoffs, and multiple boss encounters. This is the proof-of-experience gate.
- **Active roster size ≥ 8** prevents relocation by a player who won contracts with a tiny crew and never engaged with recruitment. Eight operators across 10 cap shows the roster is populated and the player managed arrivals and departures.
- **Boss encounters completed ≥ 3** ensures the player has used the encounter system. Since the bodega has three boss types across three mission types, this gate means the player has seen a meaningful sample of boss content.

**Pacing target:** Contracts 20-30 for average scenario. This overlaps with the late-bodega window where the Extension has just landed or is about to land. The player should feel "the bodega is maxed out, I have done everything this building can support" around the same time the gate becomes available.

---

### 5.2 — Relocation Gate UI Surface

The relocation gate is not hidden. Once any subset of the prerequisites is satisfied, the player should be able to see progress toward the full set. The gate should be discoverable from the management UI or the Back Office room surface.

**Gate visibility rules:**

- The gate is invisible before the first prerequisite is met (no spoiling the relocation concept in the opening arc).
- Once at least one prerequisite is met, the relocation prospect appears as an event-log entry or a Back Office surface element showing a checklist of remaining prerequisites.
- Each prerequisite shows its current value and the target threshold.
- When all prerequisites are satisfied, the relocation event becomes available as a prompted action — not auto-triggered.

**The player chooses when to relocate.** Meeting the gate does not force the move. The player may continue operating the fully upgraded bodega indefinitely. The gate enables the option. The event fires only when the player accepts it.

---

### 5.3 — Relocation Event Definition

The relocation event is a blocking interruption using the shipped interruption layer. It freezes the simulation, presents the narrative beat, and requires an explicit player decision before gameplay resumes.

**Event ID:** `event/relocation/bodega-to-next-hq`

**Event type:** Blocking narrative interruption (same authority path as incidents and boss commitment beats).

**Trigger:** Player activates the relocation action after all prerequisites are met.

**Event structure:**

The relocation event is a multi-beat blocking sequence, not a single confirmation dialog. It should feel like a milestone the player earned, not a menu option they clicked.

**Beat 1 — The Offer**

The city's guild licensing office contacts the player. The guild's performance record, building condition, and reputation score qualify it for a facility upgrade under the city's guild infrastructure program. Translation: the player has outgrown the bodega and someone official noticed.

The offer includes: a lease for a larger licensed headquarters in a better neighborhood, moving assistance from the licensing office, and a transitional operating budget. The cost is the treasury gate ($600), which is framed as the deposit and first-month lease on the new space.

**Framing tone:** Professional but slightly bureaucratic. The licensing officer is doing their job. This is not a dramatic reveal. It is a government program that the player finally qualifies for. The comedy is in the contrast between the official language and the reality of what the guild has been doing out of a bodega.

**Beat 2 — The Decision**

The player can accept or defer. Deferral is free — the offer stays open indefinitely once the gate is met. Acceptance spends the treasury gate, triggers the move, and begins the handoff.

**Player choices:**

- **Accept:** Spend $600. Begin relocation sequence. Irreversible.
- **Defer:** "Not yet." The offer remains available. No cost. No penalty. The bodega continues operating.

**Beat 3 — The Move (on acceptance)**

A short narrative sequence. The simulation is paused. Time does not advance. The sequence covers:

1. **Last day at the bodega.** Brief vignette. Operators react — some are relieved, some are nostalgic, some are already complaining about the new commute. The register closes for the last time. Aina counts out the register one final time.
2. **The handoff.** The licensing officer signs off. The bodega lease terminates. The new headquarters lease activates. The treasury is debited.
3. **First day at the new headquarters.** The new building is bigger, emptier, and unfamiliar. Operators spread out. The rooms feel too large. There is no deli counter. Nobody knows where anything is. It is not home yet.

**Framing tone:** Bittersweet, per the world foundation's relocation tone guidance. The bodega was cramped, loud, and smelled like whatever the microwave just did. It was also home. Some operators liked it. Some hated it. Both reactions are valid and should be represented in the vignette copy.

---

### 5.4 — Handoff Contract Into The Next Headquarters Tier

The relocation event is not just a narrative beat. It is a systemic transition that changes the guild's operating context. This section defines exactly what changes and what carries over.

**What carries over (persistent guild state):**

| State Category   | Carryover Rule                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| Operators        | All active operators carry over with full state: stats, gear, injury, morale, loyalty, relationships, rank. |
| Staff            | All hired staff carry over with current assignments cleared (they need to be reassigned to new rooms).      |
| Recurring teams  | Team definitions and history carry over. Active team state (mid-raid) must be resolved before relocation.   |
| Inventory        | All gear and loot carry over.                                                                               |
| Treasury         | Remaining treasury after the $600 cost carries over.                                                        |
| Reputation       | Carries over in full. The guild's earned reputation is portable.                                            |
| Contract history | Full contract history carries over for recap and reporting surfaces.                                        |
| Guidance state   | Opening guidance flags carry over. Bodega-specific guidance flags are retired.                              |
| Policies         | All management policies carry over at their current settings.                                               |
| Social state     | Operator dispositions, ties, and room-culture memory carry over.                                            |

**What resets (building-bound state):**

| State Category   | Reset Rule                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Building         | Replaces `building/bodega` with the second headquarters building id chosen by the entry spec. Building tier resets to 1 for that new building. |
| Rooms            | All bodega rooms are removed. The next headquarters tier starts with its own initial room set defined by its entry spec.                       |
| Room upgrades    | All bodega room upgrades are removed. The next headquarters rooms start at tier 1.                                                             |
| Room assignments | All staff room assignments clear. Staff must be reassigned to the new headquarters rooms.                                                      |
| Layout           | Building layout switches to the next headquarters layout with that building's initial room slots.                                              |
| Active contract  | Must be resolved (completed or abandoned) before relocation. No mid-contract relocation.                                                       |
| Visitor state    | Resets. The new location attracts different visitors.                                                                                          |

**What is new (next headquarters initial state):**

| New State             | Definition                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Building template     | Defined separately in the second-headquarters entry spec. Not locked in this document.                                       |
| Initial rooms         | The new headquarters ships with its own starter rooms. Room identities should be native to that building, not bodega copies. |
| Room slot count       | Defined by the second-headquarters spec. Expected to be larger than the bodega's 7-slot maximum.                             |
| Operator cap          | Defined by the second-headquarters spec. Expected to be larger than the bodega's 10-cap maximum.                             |
| New room templates    | Dedicated non-bodega room families unlock for the first time per the eventual second-headquarters concept.                   |
| Training availability | Training rooms exist for the first time. This is a new system surface, not a carryover.                                      |
| Exterior presentation | New exterior backdrop package for the successor site. Different neighborhood, skyline, and street dressing.                  |

**Relocation preconditions (must be satisfied before the event can fire):**

- No active contract. The current contract must be completed or abandoned.
- No operators mid-raid. All teams must have returned.
- No unresolved blocking incidents. Any active incident must be resolved first.

If any precondition is not met when the player tries to accept relocation, the event should explain which precondition is blocking and what the player needs to do first. This is a guidance message, not a silent rejection.

---

### 5.5 — Relocation Event Implementation Notes

**Interruption authority:** The relocation event uses the shipped blocking-interruption contract. It freezes the simulation through the shared runtime pause mechanism. The event is gameplay-authoritative — it persists through save/load.

**Save safety:** The relocation event must be save-safe at every beat. If the player saves during the multi-beat sequence, loading that save must resume at the correct beat. If the player saves after acceptance but before the handoff completes, loading must complete the handoff deterministically.

**Migration:** The relocation event creates a building-swap migration. This is a save-schema concern: the save must transition from bodega state to the next headquarters tier without data loss. Operator, inventory, reputation, and contract-history state must survive the migration intact. Building, room, and layout state must reset cleanly.

**No rollback:** Relocation acceptance is irreversible. There is no "go back to the bodega" option. The world foundation is explicit: relocation is a narrative milestone, not a toggleable setting.

---

### 5.6 — Bodega Legacy After Relocation

The bodega should not simply vanish from the game's memory after relocation.

**Persistent bodega references:**

- Operators who were recruited during the bodega era carry that history. The social layer should know they were "bodega-era operators."
- Contract history retains the bodega context. Past contract results still reference bodega-era sites and performance.
- The event log or recap surface should be able to reference the bodega phase as a named era in the guild's history.

**Copy direction for legacy references:**

- Bodega-era veterans should occasionally generate flavor text or event-log entries that reference the old building. "Back at the bodega, we used to..." is a valid sentiment.
- New operators who were not there should only know the bodega as a story. The gap between "I was there" and "I heard about it" is a social texture worth preserving.
- The bodega's legacy should be warm, not mocking. It was a real place where real work happened. The humor is in the contrast with the present, not in dismissing the past.

These references are flavor and social texture. They do not create gameplay consequences. No "bodega nostalgia" stat. No "veteran bonus." The bodega era matters because the player remembers it, not because the math remembers it.

---

## Verification Requirements

- Run `vp check` after any template, data, or content changes.
- Run `vp test` after wiring the relocation gate, relocation event, or boss art into runtime systems.
- Run `vp build` after integration is complete.
- Verify that all three boss IDs resolve to authored art in the encounter surface at runtime.
- Verify that the relocation gate checklist appears in the management UI when at least one prerequisite is met.
- Verify that relocation acceptance transitions cleanly from bodega to the next headquarters state.
- Verify save/load round-trips through every beat of the relocation event sequence.
- Verify that deferred relocation leaves the bodega in a fully playable state with no side effects.
- Verify that carried-over operator, inventory, staff, reputation, and policy state is intact after relocation.
- Verify that building-bound state (rooms, upgrades, layout, assignments) is cleanly reset.

## Dependencies

| Dependency                         | Status      | Notes                                                                                           |
| ---------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| Bodega closure phases 1-2          | Spec locked | Building upgrades and support rooms defined.                                                    |
| Phase 3 (roster/staffing pressure) | Required    | Roster cap and overflow actions must be in place for gate validation.                           |
| Economy target envelope            | Satisfied   | Trajectory projections inform gate thresholds.                                                  |
| Boss encounter system              | Shipped     | Encounter surface, boss commitment, and interruption layer exist.                               |
| Boss art resolver                  | Shipped     | `app/ui/boss-art.ts` needs entries, not new infrastructure.                                     |
| Blocking interruption layer        | Shipped     | Relocation event uses existing interruption contract.                                           |
| Second-headquarters building spec  | NOT shipped | Phase 5 defines the handoff contract. The actual successor building content belongs to Phase 3. |
| Save migration infrastructure      | Shipped     | Schema migration exists. Building-swap migration is a new migration.                            |

The second-headquarters building template, room catalog, layout, and upgrade path are **not defined in this document**. They belong to the Phase 3 successor-headquarters deliverables on the roadmap. This spec defines the exit contract from the bodega side only. The eventual second-building spec must honor the carryover and reset rules defined here.
