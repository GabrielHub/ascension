# Unique Operator Requirements

The pattern contract for **unique (`U`-rank) operator authoring**. Defines the authoring packet shape, identity, stat envelope, kit rules, unlock chain composition, visual authoring path, behavior canon, and custom-logic allowances.

This doc is **the contract for authoring a unique**. The actual unique operators **roster** (enumerated table of specific authored uniques with their unlock chains and identities) lives separately and is populated as individual unique sub-plans ship — see `rewrite/unique-operators-catalog`.

Read [Operator Rank Requirements](./operator-ranks.md) for regular operator stat patterns. Read [Operators And Staff](../world/operators-and-staff.md) for unique operator canon.

## Initial Scope

**1 unique operator at first.** Minimum to unblock the system end-to-end — recruitment surface, Penthouse staging, custom unlock logic, paired unique boss, paired unique dungeon — all wired up around one fully-authored unique.

Additional uniques are authored in parallel via individual sub-plans under `rewrite/unique-operators-catalog`. Each unique is a major content packet, not a templated extrusion.

## Authoring Packet

A unique operator is **never authored alone.** It ships as a core packet:

1. **The unique operator** (this doc's contract)
2. **Paired unique boss** (1:1, sits inside the paired unique dungeon)
3. **Paired unique dungeon** (1:1, see [Unique Dungeon Requirements](./unique-dungeons.md))

A unique operator may also have a paired unique weapon, but it is not mandatory. Every unique weapon is tied to a unique operator; not every unique operator has a unique weapon. Weapon authoring lives in its own follow-on plan and unlock chain after the paired operator is recruited.

## Identity

Each unique operator authors:

- **Name** — proper authored name. Follows [Content Rules](../world/content-rules.md) (natural-sounding, NYC-rooted unless deliberately otherwise).
- **Persona summary** (≤ 220 chars).
- **Persona hooks** — short personality bullets.
- **Background** — 1–2 sentence origin.
- **Voice** — speech patterns, register, diction. Used by presenters when referencing the unique.

## Stat Envelope

Stats authored within the U-rank envelope (80–99 across STR/SPD/END/RES, INT, PERC). No randomization, no recruitment-time roll. Distribution authored per unique's flavor archetype:

| Archetype | Stat lean |
|---|---|
| Tanky | high RES + END |
| Fast / glassy | high SPD, lower effective HP |
| Balanced | even distribution |
| Specialist | one stat dominant per kit signature |

Stats fixed at recruitment. Uniques do not train (per locked behavior canon).

## Combat Package (Unique Kit)

Each unique authors **one signature kit.** Rules:

- **Role-tagged + sub-flavored** like regular kits (Field Lead / Scout / Support × damage / burst / heal / etc.)
- **Signature passive is mandatory** at U
- **Signature mechanic or effect** allowed and encouraged — can interact with the operator's narrative or mechanical identity
- **Cannot be reused** — each unique kit is one-off, never added to the regular kit pool

Reuses the operator-kit effect engine. Uniques may declare effects beyond the standard pool **if** the design pass justifies a new effect kind.

## Custom Logic Allowance

**Uniques may carry one-off code.** Unlike regular operators (purely data-driven from templates), a unique operator may include:

- Custom unlock chain logic (event handlers, predicates beyond the standard set)
- Custom recruitment dialog and presenter beats
- Custom death-narrative event content
- Custom kit effects not in the shared effect pool
- Custom passive interactions with specific game state (e.g. responds to a specific room being built, a specific rival being defeated)

This is **deliberately allowed** to keep uniques feeling singular. Each unique's sub-plan defines the custom-logic surface needed; reviewers weigh complexity vs. content payoff at the sub-plan level.

## Unlock Chain

Each unique has an authored unlock chain. Required components:

- **Defeating the paired unique boss** (in their paired unique dungeon)
- **Cash gate** — regular cash currency, scaled to U-tier (specific values in `rewrite/economy`)

Optional additional gates (cap 4 total ingredients to keep the chain readable):

- Prerequisite unique operator completions
- Reputation gate
- Authored narrative event triggers
- Specific guild milestones (rooms built, contracts cleared, rivals defeated, etc.)

The Unique Operator room shows all unique entries with locked state and visible requirements from game start — player knows what they're chasing.

## Recruitment Surface

- Unlock requirements met → Sloane (front-of-house presenter for unique recruitment) triggers an authored recruitment beat.
- Player accepts → unique joins the guild.
- **Without Penthouse:** unique idles in Unique Operator room. Cannot deploy, cannot recover, cannot be assigned to teams.
- **With Penthouse:** unique is combat-ready. Recovers in Penthouse. Stages from Penthouse when deployed (asymmetric staging — teammates stage from Team Staging).

## Traits

3–5 authored traits per unique. Categories follow [Content Taxonomy](./content-taxonomy.md):

- **Personality / Background / Condition** — authored to fit the unique's identity
- **Aptitude** — high-impact aptitudes allowed (uniques sit above C+ implicitly via U rank)
- **Earned** — uniques may ship with Earned traits already attached, reflecting their narrative pre-history (regulars cannot have Earned traits at recruitment)

## Death Behavior

- **~50% cheat-death survival roll** baseline on operator death. Independent of and additional to Hall of Honor's roll for regulars.
- **True death** (cheat-death roll fails) triggers a **major authored narrative event specific to that unique.** Higher-weight than regular operator-death events.
- Permanent death is meant to feel devastating — uniques are irreplaceable content.

## Visual Authoring

| Asset | Authoring path |
|---|---|
| Portrait | Production-time AI-agent asset work within an authored prompt, manually approved, with **shared glow border treatment** per [Asset Pipeline Contract](./asset-pipeline.md). Not runtime AI. |
| Chibi token | Production-time AI-agent SVG / composable-part work within an authored prompt, manually approved. Not runtime AI. |
| Idle animation | **Not in initial scope.** Roadmap. |

The portrait carries the strongest visual identity — the boldest in the game per the asset pipeline contract.

## Behavior Canon (Restated From Locked Rules)

- **Do not train.** Never appear in Training room regardless of tier.
- **Walk only in three rooms:** Unique Operator room, Unique Weapon room, Penthouse.
- **Recover and stage from Penthouse only.** No HR, no Medical for uniques.
- **Appear in Team Staging panel's roster list** for management visibility, but never visually walk there.

These are locked in [Operators And Staff](../world/operators-and-staff.md). Restated here for ergonomic reference.

## Generation Path

- **Pre-authored only.** No runtime AI generation of unique operator identity / kit / unlock logic. AI agents may help produce portrait and chibi assets during plan execution, but the result is checked-in authored content.
- **Sub-plan per unique.** Every unique operator gets its own sub-plan under `rewrite/unique-operators-catalog`, owning the operator + paired boss + paired dungeon. A paired unique weapon is a separate follow-on sub-plan when that unique has one.
- **No automatic propagation.** Authoring a unique requires a deliberate design pass — uniques are not extruded from a template.

## What This Doc Doesn't Cover

- **Specific unique operator content.** Lives in individual sub-plans + the future enumerated unique operators roster doc.
- **Unique weapon authoring contract.** Separate product doc; unique weapons are optional follow-on content paired to specific unique operators.
- **Unique dungeon authoring contract.** Separate product doc (gated on dungeon-ranks).
- **Penthouse / Unique Operator room mechanics.** Lives in [Rooms Catalog](./rooms-catalog.md).
- **Cheat-death roll math.** Code-side balance.

## Cross-Doc References

- Unique operator implementation: `rewrite/unique-operators-catalog`
- Unique operator behavior canon: [Operators And Staff](../world/operators-and-staff.md) (Unique Operator Canon section)
- Regular operator stat envelope reference: [Operator Rank Requirements](./operator-ranks.md)
- Paired unique dungeon: [Unique Dungeon Requirements](./unique-dungeons.md)
- Asset pipeline (portraits + glow border + chibi): [Asset Pipeline Contract](./asset-pipeline.md)
- Penthouse / Unique Operator / Unique Weapon rooms: [Rooms Catalog](./rooms-catalog.md)
- Visual effects pool (kit effects integration): [Visual Effects Pool](./visual-effects-pool.md)
- Operator data shape: `rewrite/operator-model` sub-plan
- Per-unique sub-plan parent: `rewrite/unique-operators-catalog`
