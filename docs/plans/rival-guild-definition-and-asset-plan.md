# Rival Guild Definition And Asset Plan

Scope: define rival guilds as authored content and produce the first-pass rival-facing asset packages before the broader skyscraper rival-pressure refactor depends on that content. This plan covers rival identity, writing, and asset production only. It does not implement the rival-pressure gameplay systems themselves, and it does not wire rivals into runtime systems.

## Goal

Create rival guild definitions early enough that systems, UI, and event work can build against real rivals instead of placeholder ids.

The output of this plan should give the project:

- a growing library of production-credible rival guilds
- stable rival identities that future gameplay systems can reference
- first-pass leader and guild-facing art direction
- asset references and content contracts ready to plug into ECS-backed rival entities later

This plan should begin producing usable rivals before the main rival-pressure implementation starts depending on rival content. Each rival should move independently through a repeatable metadata-first pipeline without waiting for a fixed set size.

## Why Split This Out

The rival-pressure refactor now treats rivals as the main dramatic carrier of skyscraper-end pressure. That makes rival content a prerequisite, not an optional garnish.

If systems work starts before rival content exists, the implementation will drift toward:

- placeholder rival ids
- generic event wrappers
- weak UI language
- asset backfill that does not match the final rivalry contract

This narrower plan lets rival definition work proceed in parallel with broader pressure-system work while still establishing the content those systems depend on. Asset production then follows as a separate pass after the rival metadata is approved.

## Design Rules

1. **Produce rivals independently.** There is no fixed target count in this plan; each rival should be completable on its own.
2. **Make each rival legible at a glance.** Leader, guild identity, and pressure style should read immediately.
3. **Author metadata first.** The system needs stable rival definitions before it needs assets.
4. **Favor repeatable identity over plot twists.** Rival assets and copy should support recurring pressure beats, not one-off reveals.
5. **Stay inside world tone.** Rivals are licensed NYC guild businesses, not villain factions, anime teams, or fantasy houses.
6. **Design for future escalation.** The first-pass rival contract should support later leaderboard, interruption, and rival-battle features without requiring them now.
7. **Keep phases separate.** Metadata definition, asset generation, and gameplay wiring are separate phases with separate completion rules.

## Repeatable Per-Rival Process

Use this loop for every rival guild:

1. metadata discussion and revision
2. metadata approval
3. asset briefing from approved metadata
4. asset generation
5. ready-to-wire handoff

Rules:

- do not start asset generation before the rival's metadata is approved
- do not mark a rival ready to wire until both metadata and asset requirements are complete
- process one rival at a time or several in parallel, but evaluate each rival against the same completion contract

## Rival Status Model

Every rival should carry one explicit status:

- `concept-draft`
- `metadata-in-progress`
- `metadata-approved`
- `assets-in-progress`
- `ready-to-wire`

Status meanings:

- the rival is **not** wired into ECS, events, UI, or saves yet
- `metadata-approved` means the rival's authored identity and ready-to-wire copy surfaces are stable, but asset production is not yet done
- `ready-to-wire` means both metadata and asset requirements are complete, but gameplay integration still has not happened

This prevents a common failure mode where a rival with good writing but missing assets gets treated as implementation-ready.

## Rival Completion Contract

A rival guild is ready to wire only when every required field in this section exists and is stable.

### Required Definition Fields

Each rival must include:

- stable rival content id
- leader full name
- guild name
- one-sentence public pitch
- short internal design summary
- pressure style
- move-family affinities
- favored contract lane, district, or sponsor angle when useful
- rivalry fantasy summary: why this guild is irritating, dangerous, or memorable as a competitor
- tone / voice notes for rival-facing copy
- visual branding notes
- leader portrait brief
- guild presentation / logo brief
- interruption copy tone notes

### Required Ready-To-Wire Copy Surfaces

Each rival must include enough authored copy to support future gameplay wiring without placeholder text.

Minimum required copy:

- short leaderboard display name
- one-sentence dossier summary
- one-sentence current-rival summary
- interruption / challenge tone sample
- public-facing guild blurb
- internal author note describing what kinds of repeatable move framing this rival supports

These do not need to be final production strings for every event. They do need to be enough to keep the gameplay refactor from inventing generic rival language later.

### Required Asset And Visual Fields

Each rival must include:

- stable portrait asset id or portrait brief id
- stable branding / insignia asset id or branding brief id
- leader portrait brief or final portrait asset
- guild mark / insignia brief or final branding asset
- dossier / interruption motif notes
- color direction
- typography direction when useful for later UI treatment

For this plan:

- `metadata-approved` does not require final assets
- `ready-to-wire` does require either final assets or explicitly approved first-pass runtime assets
- do not mark a rival `ready-to-wire` on briefs alone

## First-Pass Asset Set

The first-pass gameplay and UI refactor does not need a full presenter-style expression family for each rival.
The insignia should also be treated as a raster asset in the first pass, not an SVG target.

Required first-pass asset set per rival:

- one canonical leader portrait used for current-rival reads, interruption surfaces, and dossier surfaces
- one guild insignia / logo mark as a PNG
- one simple rival dossier / interruption motif direction that can be expressed in UI styling later

Decision:

- start with **one portrait per rival guild leader**
- start with **one PNG insignia per rival guild**
- do **not** require `neutral / concerned / serious / amused` variants in the first pass
- add expression variants only later if rival events become frequent enough that one static portrait starts feeling dead
- do **not** target SVG insignias in the first pass; the current generation quality is not reliable enough

Why this is the right first cut:

- rivals are recurring antagonists, but they are not broad domain presenters like the support cast
- the first gameplay need is rival recognition, not a full acting-performance set
- one strong canonical portrait per rival keeps production lighter and reduces style drift while the system is still being built
- PNG insignias avoid the quality failures currently showing up in generated SVG logo output

If later expansion needs more variation, the likely next step is:

- `neutral` as the canonical anchor
- one optional escalation variant such as `serious` or `taunting`

That is enough for future growth without forcing presenter-family scope now.

## Asset Usage Contract

The first-pass rival asset set is expected to support these uses:

- `leader portrait`
  - current-rival summary
  - interruption or challenge surface
  - leaderboard / dossier card
- `guild insignia`
  - leaderboard row
  - dossier header
  - rivalry UI accents
- `dossier / interruption motif`
  - panel accents, color logic, or lightweight background treatment for rival-facing UI

The system should not require unique art per event. The same core portrait and insignia should be reusable across repeated rival beats.

## Storage Layout Recommendation

Follow the same broad public-asset pattern already used by presenters: ship runtime-facing raster assets from `public/data/`.

Recommended path shape:

- `public/data/rivals/<rival-id>/leader-neutral.png`
- `public/data/rivals/<rival-id>/insignia.png`

Optional later additions if needed:

- `public/data/rivals/<rival-id>/leader-serious.png`
- `public/data/rivals/<rival-id>/leader-taunting.png`
- `public/data/rivals/<rival-id>/motif.png`

Rules:

- use one folder per rival id
- keep asset naming literal and stable
- do not scatter rival assets across several unrelated public folders
- keep the rival's authored metadata and the rival's runtime-facing assets keyed by the same stable rival id
- do not invent extra per-rival files unless an implementation phase actually needs them

Recommended ownership split:

- `content/templates/rivals.ts` is the current source-of-truth file for rival metadata and asset-path references
- `public/data/rivals/<rival-id>/` owns the runtime-facing portrait and insignia files

This keeps the rival asset contract aligned with the existing presenter pattern while still staying narrower than the presenter family.

### Required Structural Readiness Fields

Each rival must also include:

- stable file / record location for authored metadata
- for the current slice, that location is the rival's entry inside `content/templates/rivals.ts`
- named move-family affinities compatible with the main rival-pressure plan
- clear differentiation notes from other completed rivals
- explicit approval that the rival is ready for later ECS/template wiring

### Recommended Rival Variety

The overall library should eventually include sharply different rivalry shapes such as:

- one prestige / media rival
- one labor-market / recruitment rival
- one sponsor / political-network rival

These do not need to be literal final labels in player-facing copy. They are content-production anchors to prevent the rival library from collapsing into several visually different versions of the same guild.

## Asset Production Target

The first-pass asset target should stay focused on surfaces that the gameplay refactor will actually need soon.

Required first-pass assets per rival:

- one approved leader portrait brief
- one final runtime-facing leader portrait
- one approved guild insignia brief
- one final runtime-facing insignia PNG
- one interruption / dossier-ready visual treatment direction

Allowed first-pass deliverables:

- final production portraits
- approved portrait briefs
- logo / insignia concepts
- dossier-card motifs
- color and typography guidance for rival-facing UI surfaces

Do not expand this plan into:

- full rival headquarters environments
- floor plans
- battle sprites
- combat VFX
- broad faction encyclopedias

## Authoring Rules

Use the world canon in `docs/world/` as the authority for tone, naming, and institutional framing.

Specific constraints:

- rival leaders must have believable New York full names
- rival guilds should read as licensed businesses with strong branding, not comic-book supervillain cells
- humor should come from workplace and commercial absurdity, not parody naming
- higher-rank rival presentation can feel expensive, famous, and polished, but it should still belong to the same 2026 city and guild industry as the player
- rivals should feel threatening because they are competent, visible, and irritatingly professional, not because they are evil for its own sake

## Deliverables

- one checked-in rival record in `content/templates/rivals.ts` for each rival
- one approved metadata package for each `metadata-approved` rival
- first-pass portrait / branding briefs for each rival that has entered asset production
- final runtime-facing rival art assets for each `ready-to-wire` rival
- stable content ids and asset-reference names that the gameplay refactor can target
- a clear per-rival status showing whether that rival is:
  - `concept-draft`
  - `metadata-in-progress`
  - `metadata-approved`
  - `assets-in-progress`
  - `ready-to-wire`

## Implementation Checklist

### Phase 0 — Canon And Surface Audit

- [ ] Re-read `docs/world/premise-and-tone.md`, `docs/world/guilds-and-dungeons.md`, and `docs/world/content-rules.md` before authoring rival content.
- [ ] Identify the exact near-term UI and narrative surfaces that need rival assets first:
  - current rival summary
  - interruption / event surface
  - leaderboard / dossier surface
- [ ] Confirm what asset forms are actually needed for those surfaces before creating extra art.
- [ ] Lock the first-pass rival asset rule:
  - one canonical leader portrait per rival
  - one PNG guild insignia per rival
  - no full presenter-style expression family required in the first pass
- [ ] Lock the runtime asset storage layout under `public/data/rivals/<rival-id>/`.
- [ ] Lock the per-rival status model:
  - `concept-draft`
  - `metadata-in-progress`
  - `metadata-approved`
  - `assets-in-progress`
  - `ready-to-wire`

Exit criteria:

- the team knows which rival-facing surfaces need assets first
- the rival process is grounded in current world canon and UI needs

### Phase 1 — Metadata Definition

- [ ] Define the completion contract fields once and apply them to every rival created under this plan.
- [ ] Use back-and-forth review to define each rival's metadata before any asset generation starts.
- [ ] Add each rival as a typed record in `content/templates/rivals.ts`.
- [ ] Write a full rival package for each rival against the locked metadata contract:
  - stable id
  - leader name
  - guild name
  - public pitch
  - internal summary
  - pressure style
  - move-family affinities
  - rivalry fantasy
  - branding notes
  - portrait brief
  - ready-to-wire copy surfaces
- [ ] Store runtime-facing asset references in that same `content/templates/rivals.ts` record.
- [ ] Ensure each new rival occupies a distinct competitive fantasy and does not duplicate another rival's tone or role.
- [ ] Lock stable ids and naming conventions that later ECS/template work can reference.
- [ ] Mark a rival `metadata-approved` only when the metadata and copy surfaces are stable enough that later asset work does not need to invent tone or identity.

Exit criteria:

- each `metadata-approved` rival has a stable authored identity and stable ids
- later asset work can proceed without guessing the rival's tone or identity

### Phase 2 — Asset Briefing

- [ ] Turn each `metadata-approved` rival package into a production asset brief for portrait and branding work.
- [ ] Define the minimum visual package each rival needs for first gameplay integration:
  - leader portrait treatment
  - guild mark / insignia
  - dossier or interruption motif
- [ ] Record the expected runtime filenames and public paths for each rival asset.
- [ ] Specify which parts of each asset are final-production targets versus approved temporary first-pass surfaces.
- [ ] Verify that the asset direction reads clearly at likely UI scales and in grayscale / low-saturation contexts where needed.
- [ ] Move the rival to `assets-in-progress` when the asset brief is approved.

Exit criteria:

- each `assets-in-progress` rival has a bounded visual brief package
- the first-pass visual target is scoped to the surfaces that actually ship soon

### Phase 3 — First Rival Asset Production

- [ ] Produce the first-pass rival portrait assets for each `assets-in-progress` rival.
- [ ] Produce the first-pass guild branding assets for the same rivals.
- [ ] Produce any needed interruption or dossier-ready derived treatments.
- [ ] Place each rival's runtime-facing files under `public/data/rivals/<rival-id>/` with stable filenames.
- [ ] Review completed rivals together to ensure they feel like competitors in the same city and industry, not art from different games.
- [ ] Mark a rival `ready-to-wire` only after final runtime-facing portrait and insignia assets exist and the metadata package is already approved.

Exit criteria:

- each `ready-to-wire` rival has usable leader and guild-facing assets
- completed rivals are visually distinct without breaking shared world tone

### Phase 4 — Handoff To Gameplay Refactor

- [ ] Publish the stable rival definitions, ids, asset references, and per-rival status in a form the gameplay refactor can consume.
- [ ] Link the output of this plan from the main skyscraper rival-pressure refactor plan as a prerequisite input.
- [ ] Confirm which rivals are actually `ready-to-wire`.
- [ ] Confirm which later gameplay tasks now have enough authored rival content to proceed in parallel.

Exit criteria:

- the broader rival-pressure refactor can build against real rival content
- any rival marked `ready-to-wire` can be integrated without inventing placeholder ids, copy, or art direction

## Risks

- **Overproducing assets too early.** If asset work starts before metadata approval or tries to solve every future rival surface now, it will sprawl.
- **Weak differentiation.** If rivals do not have clearly distinct pressure styles and branding, the system will still feel generic.
- **Tone drift.** Rival branding can easily slip into comic-book faction design instead of licensed-business competition.
- **Placeholder contamination.** If naming and ids are not stabilized early, later systems will still end up wired to temporary rival content.

## Out Of Scope

- gameplay implementation of rival pressure
- leaderboard logic
- rival ECS systems
- rival battles
- rival HQ environment packages
- broad world-lore expansion beyond what each rival needs

## Sequencing Note

This plan should begin first and should keep producing `ready-to-wire` rivals before the main [Skyscraper Rival Pressure Refactor](./skyscraper-rival-pressure-refactor.md) begins depending on rival definitions, leaderboard-facing rival identities, or rival-facing art assets.
