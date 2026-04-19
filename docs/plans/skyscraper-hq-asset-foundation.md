# Skyscraper HQ Asset Foundation

## Why This Plan Exists

The skyscraper should not be treated like "Porter's, but with more rooms." The building package contract is still underdefined, so skyscraper work needs a foundation plan before it becomes a room-production plan.

The target is a headquarters that sits extremely high above the city, occupies massive square floor plates, and grows upward through additional owned floors in the same tower. That means the visual contract, shell sizing, backdrop language, and floor-navigation UX all need to be locked before room-scene production starts.

Current blockers:

- `building/skyscraper` has no HQ parts registered in `content/data/hq-environment-index.json`
- the asset roots for `building/skyscraper` still point at bodega paths
- `public/data/svg-environments/hq/skyscraper/` does not exist
- the scene builder does not expose `building/skyscraper` as a selectable building yet; it currently lists only `building/bodega` and `building/porters`
- the tower needs a locked shell, floor-size, and elevation-band package strategy before room-scene production can be scoped cleanly
- the current low-rise floor-view and floor-switching idiom is not yet sufficient for a massive multi-floor tower where the player keeps buying higher floors

This plan is intentionally not a "make all 21 room scenes now" execution plan. It is the prerequisite plan that turns the skyscraper into a coherent asset target first.

## Existing Plan Check

There is no active checked-in skyscraper HQ asset-foundation plan before this file.

What already exists:

- broad roadmap references to continued HQ environment cleanup and skyscraper floor reuse
- world/product docs describing the canonical tower identity and room list
- runtime room templates and building layouts for the canonical nine-floor stack
- a historical, now-deleted skyscraper plan about Executive Floor institutional pressure rather than asset packaging

What does not exist:

- a checked-in plan that locks skyscraper shell sizing and floor-package rules
- a checked-in plan that stages scene-builder support for skyscraper authoring
- a checked-in skyscraper elevation-band package plan

## Canonical Scope Already Defined

The tower's room catalog and floor stack already exist in runtime and docs.

Defined in runtime/templates:

- `room/lobby:tier_1`
- `room/reception:tier_1`
- `room/bullpen:tier_1`
- `room/situation_room:tier_1`
- `room/clinic:tier_1`
- `room/dojo:tier_1`
- `room/crew_lounge:tier_1`
- `room/supply_hall:tier_1`
- `room/fabrication_bay:tier_1`
- `room/rooftop_helipad:tier_1`
- `room/sky_garden:tier_1`
- `room/club:tier_1`
- `room/green_room:tier_1`
- `room/drill_floor:tier_1`
- `room/recon_course:tier_1`
- `room/trauma_bay:tier_1`
- `room/executive_office:tier_1`
- `room/compliance_office:tier_1`
- `room/war_room:tier_1`
- `room/sky_lounge:tier_1`
- `room/private_cellar:tier_1`

Defined in world/product docs:

- the canonical skyscraper stack is five baseline floors plus four acquired floors
- the tower must feel like a real midtown office tower at `sunrise`, `day`, `sunset`, and `night`
- the skyscraper should read as extremely high above the city rather than as a dressed-up street-level building
- the tower floor plates should be massive and square enough that the building itself becomes the focus of the isometric view
- exterior packages should support reusable elevation bands instead of one bespoke backdrop per exact floor number when the outside read is materially the same
- the tower is the final headquarters, so its package rules should support long-tail reuse instead of a one-off narrow slice

## Current Shipped Asset State

### Catalog Reality

Current skyscraper HQ asset-catalog coverage:

- skyscraper `hq-parts`: 0
- skyscraper `hq-rooms`: 0
- skyscraper `reference`: 0

### Environment Index Reality

`content/data/hq-environment-index.json` currently resolves as:

- `building/skyscraper`: bodega package roots, 0 registered parts

### Scene Builder Reality

The scene builder currently exposes:

- `building/bodega`
- `building/porters`

It does not expose:

- `building/skyscraper`

That means skyscraper package authoring is not yet on the same tooling footing as Porter's.

## Missing Definition Surface

Before room-scene production starts, the following need to be explicit.

### Shell And Floor Definition

- final skyscraper shell family and visual language
- whether floor footprints stay uniform across the tower or vary by floor class
- lock the intended gigantic square floor-plate read instead of inheriting bodega/Porter's proportions
- how lobby, mid-tower floors, and rooftop differ structurally
- which structural kit parts are shared across floors and which are floor-class specific
- how much of the on-screen composition should be tower shell versus surrounding skyline dressing

### Elevation-Band Definition

- canonical elevation bands for package reuse
- what counts as `ground-floor`, `mid-tower`, and `rooftop` in art-package terms
- whether any additional band is needed for prestige upper floors such as Penthouse
- how much skyline/neighborhood dressing changes by band and time of day
- define the high-altitude visual language: nearby towers, clouds, haze, rooftop machinery, aircraft/air-traffic reads, and city-glow far below
- explicitly reject street-level filler such as sidewalks, curb clutter, docks, or harbor dressing in ordinary skyscraper bands

### Tooling Definition

- add `building/skyscraper` to the scene builder
- confirm what floor and stage authoring flows should look like for a nine-floor building
- confirm whether scene-builder exports remain sufficient for tower-floor authoring or need floor-class-aware export conventions
- define how the player and authoring tools move up and down the tower: floor selection, stack grouping, and visible-floor context for a much taller building
- remediate the current multi-floor viewing model so skyscraper navigation is not just a copy of the Porter's low-rise flow

## Execution Plan

### Phase 1: Package Contract Grounding

Deliverables:

- create `public/data/svg-environments/hq/skyscraper/`
- add real skyscraper `parts`, `reference`, and `recipes` roots
- stop pointing the skyscraper manifest at bodega paths
- define the shell-family, structure-family, and backdrop-package contract in `hq-environment-index.json`

Exit criteria:

- skyscraper is no longer pretending to be a bodega-rooted package
- the package contract exists even if room scenes do not yet

### Phase 2: Scene Builder Enablement

Deliverables:

- add `building/skyscraper` to the scene builder building selector
- validate that floor selection and stage selection behave correctly for skyscraper layouts
- confirm the builder can author and preview the intended floor classes
- confirm the builder can handle giant square floor plates without immediately collapsing the framing back to low-rise assumptions

Rationale:

- we should not commit to full room-scene production for a building that is not even selectable in the primary authoring tool

### Phase 3: Size And Footprint Lock

Deliverables:

- lock the canonical shell size and room-footprint assumptions for skyscraper floors
- document any deviation between lobby, tower-core, and rooftop footprints
- confirm whether the current runtime floor layouts are the final art-facing room box sizes or just gameplay placeholders
- lock the intended "tower itself is the focus" framing, with much larger floor plates than bodega or Porter's
- define whether each room remains one square module within that larger square tower shell, and how much negative space or circulation the floor plate should preserve around those modules

Exit criteria:

- room-scene production can target stable dimensions instead of moving placeholders

### Phase 4: Elevation-Band Package Plan

Deliverables:

- lock reusable backdrop packages for `ground-floor`, `mid-tower`, and `rooftop`
- define how those bands behave across `sunrise`, `day`, `sunset`, and `night`
- decide whether Penthouse needs a distinct upper-band treatment or can reuse `mid-tower`
- lock the high-altitude composition rules so skyscraper packages read as far above street level
- define tower-adjacent decoration families that fit a super-high futuristic tower rather than ground-level city dressing

Rationale:

- the tower should be reusable by band, not rebuilt from scratch per floor unless the outside read genuinely changes
- the tower should read as altitude and scale first, not as another low-rise shell with swapped props

### Phase 5: Vertical Navigation Remediation

Deliverables:

- define the runtime UX for moving up and down a tower that keeps gaining floors
- decide what floor context stays visible when the player is focused on one floor or one stack group
- separate skyscraper vertical navigation from the simpler Porter's floor-switching idiom
- document the expected interaction between floor navigation, stack groups, and room focus

Exit criteria:

- the tower has a coherent navigation/view model before room-scene production depends on it

### Phase 6: Baseline Room Package Plan

Only after Phases 1 through 5 are complete should the baseline room package be executed.

Baseline rooms:

1. Lobby
2. Front Desk
3. Bullpen
4. Situation Room
5. Clinic
6. Dojo
7. Crew Lounge
8. Supply Hall
9. Fabrication Bay
10. Helipad
11. Sky Garden

### Phase 7: Expansion Floor Room Package Plan

Only after baseline package rules are proven should the expansion rooms be executed.

Expansion rooms:

1. Club
2. Green Room
3. Drill Floor
4. Recon Course
5. Trauma Bay
6. Executive Office
7. Compliance Office
8. War Room
9. Sky Lounge
10. Private Cellar

## Verification

1. Confirm `building/skyscraper` is selectable in the scene builder.
2. Confirm skyscraper package roots resolve to real skyscraper directories.
3. Confirm the viewer/catalog can discover skyscraper assets once they exist, without manual per-asset registration.
4. Confirm elevation-band package definitions are explicit before room-scene production starts.
5. Confirm vertical navigation and multi-floor viewing rules are explicit before room-scene production starts.
6. Confirm room scenes are produced only after shell size and floor footprint assumptions are locked.

## Recommended First Slice

The first slice should be builder enablement plus shell-size, elevation-band definition, and vertical-navigation definition.

Why:

- that is the real blocker
- it prevents us from authoring 21 room scenes against unstable assumptions
- it separates "tower package definition" from "tower room production," which will make the later art pass much cleaner
- it avoids locking in the wrong skyscraper framing before the tower's altitude, massing, and navigation model are settled

## Open Questions

- Are the current skyscraper floor shell sizes in `content/building-layouts.ts` final art-facing dimensions or temporary gameplay scaffolds?
- Does the Penthouse need its own distinct exterior elevation band, or is `mid-tower` plus rooftop enough?
- Should the skyscraper shell and structure family be defined first as a single baseline package before any room family briefs are turned into scene work?
- What should the default skyscraper viewing mode be: one selected floor, a partial stacked slice, or a hybrid tower-context view that keeps neighboring floors legible?
