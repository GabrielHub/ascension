# Porter's Entry Plan

Implement the locked second-headquarters target: Porter's in Red Hook, with a no-regression handoff from the bodega, multi-floor HQ support, lightweight prep-room consumables, and the first playable Porter's slice.

## Canon Inputs

Read before implementing:

- `docs/roadmap.md` (Current Milestone and Phase 3)
- `docs/plans/bodega-closure-phases-4-5-spec.md`
- `docs/plans/narrative-character-system-plan.md`
- `docs/product/gameplay-systems.md`
- `docs/product/presentation.md`
- `docs/product/asset-production.md`
- `docs/world/headquarters-and-rooms.md`
- `docs/world/premise-and-tone.md`
- `docs/world/content-rules.md`
- `content/templates/buildings.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `content/building-layouts.ts`
- `content/data/hq-environment-index.json`
- `app/ui/hq-panel.tsx`
- `app/ui/room-detail-panel.tsx`
- `app/ui/view-models.tsx`
- `app/ui/interruption-host.tsx`

## Goal

Make Porter's a concrete runtime target for the bodega relocation handoff and prove that the second headquarters changes gameplay through space, facilities, room families, and public/private building identity.

## Locked Constraints

- Porter's is the second headquarters. Do not re-open the successor-building concept.
- The relocation handoff rules from `bodega-closure-phases-4-5-spec.md` remain authoritative.
- Porter's base tier must not regress room count or staging relative to the fully upgraded bodega.
- Porter's starts with **7** rooms and **12** operator cap.
- Starter rooms are: The Floor, The Bar, The Office, The Stockroom, The Infirmary, The Gym, The Prep Room.
- Upgrade order is fixed:
  1. Kitchen Overhaul
  2. Upstairs Conversion
  3. The Remodel
  4. The Waterfront
- Upgrade 2 unlocks The Break Room and The Briefing Room.
- Upgrade 4 unlocks The Dock and The Deck.
- The Prep Room supports deployment staging and **lightweight consumable prep only**. Full gear workshop crafting is out of scope for Porter's.
- Porter's contract-rank ceiling is D. On arrival, E-rank contracts join the board beside F-rank contracts.
- Presenter-system integration should reuse `narrative-character-system-plan.md`; do not invent Porter's-only modal machinery.

## Scope

### In Scope

- Porter's building template, room templates, upgrades, and layouts
- multi-floor HQ runtime support sufficient for Porter's
- Porter's exterior package and floor-aware background selection
- relocation landing into Porter's from the bodega
- prep-room consumable-prep surface and recipe contract
- Porter's-specific staff/content hooks needed for the entry slice

### Out Of Scope

- full later-tier crafting and gear workshop systems
- third-building foreshadow implementation beyond basic narrative hooks
- complete Porter's incident library beyond the core binding set needed for the first slice
- a broader city-map or district simulation

## Implementation Phases

### Phase 1: Porter's Runtime Target And Relocation Landing

Make Porter's a valid destination for the existing bodega handoff contract.

Deliverables:

- Add Porter's building template and upgrade definitions.
- Add starter Porter's room templates and upgrade-gated room templates.
- Add Porter's initial layout and upgraded layouts to the building-layout system.
- Add floor-aware HQ state sufficient to support:
  - ground floor
  - upper floor
  - waterfront area once unlocked
- Update the relocation flow so accepting the bodega move lands the player in Porter's starter state per the locked handoff contract.
- Ensure staff assignments clear, building-bound room state resets, and carried-over guild state survives the move intact.

Likely files:

- `content/templates/buildings.ts`
- `content/templates/rooms.ts`
- `content/templates/upgrades.ts`
- `content/building-layouts.ts`
- save / migration code touched by the relocation handoff
- HQ view-model and floor-selection state

### Phase 2: Porter's Base Slice

Ship the base playable second headquarters.

Deliverables:

- Ground floor rooms:
  - The Floor
  - The Bar
- Upper floor starter rooms:
  - The Office
  - The Stockroom
  - The Infirmary
  - The Gym
  - The Prep Room
- Operator cap 12 on arrival
- Room-slot count 7 on arrival
- Porter's base exterior package for all four time-of-day states
- Base Porter's room details and copy in keeping with the world doc

Gameplay expectations:

- The Bar is the recruitment surface.
- The Floor is public meals / decompression.
- The Prep Room preserves staging and introduces narrow consumable prep from monster drops.
- Training unlocks through The Gym.
- Dedicated recovery unlocks through The Infirmary.

### Phase 3: Upgrade Path And New Rooms

Implement the four-upgrade Porter's progression.

Deliverables:

- `Kitchen Overhaul`
- `Upstairs Conversion`
- `The Remodel`
- `The Waterfront`
- Upgrade 2 adds 2 room slots and unlocks:
  - The Break Room
  - The Briefing Room
- Upgrade 4 adds 2 room slots and unlocks:
  - The Dock
  - The Deck
- Final Porter's max state is 11 rooms and 18 operator cap

Constraints:

- Quality upgrades improve income, recruitment quality, and morale without adding slots.
- Expansion upgrades add slots and operator cap.
- The rhythm remains improve -> expand -> improve -> expand.

### Phase 4: Prep-Room Consumable Layer

Introduce the narrow crafting precursor that belongs to Porter's.

Deliverables:

- Define the first consumable-prep recipe family using monster drops as inputs.
- Keep outputs temporary and operational:
  - tonics
  - salves
  - wards
  - similar short-duration raid aids
- Gate the system through The Prep Room and assigned staff support.
- Make recipe logic legible and authored. No freeform crafting sim.

Constraints:

- Do not turn Porter's into a full workshop tier.
- Do not let consumables replace the equipment market.
- Use this slice to establish recipe families and resource tags that later real crafting can extend.

Likely files:

- item / recipe content definitions
- room-effect wiring for The Prep Room
- inventory / command surfaces where consumables are produced or assigned

### Phase 5: Porter's Content And Presentation Finish

Land the first slice that makes Porter's feel like Porter's instead of just “bigger HQ.”

Deliverables:

- Porter's-specific recruitment / income / contract-rank tuning
- Porter's-specific environment package in `content/data/hq-environment-index.json`
- Porter's-specific named staff hooks:
  - the cook
  - the bartender
- incident hooks that can later bind to those characters through the presenter system
- floor navigation and view affordances that read clearly in the HQ UI

Dependency:

- Presenter portraits and bindings should reuse `narrative-character-system-plan.md`.

## Data And UI Notes

- Recruitment remains a capability, not a separate room family. The Bar owns it at Porter's.
- Public social pressure and private decompression should stay distinct. The Bar and The Floor are public. The Break Room is private.
- Floor selection should be explicit in runtime-facing HQ state, not inferred from art alone.
- Porter's exterior package should reuse the shell-relative and elevation-band contracts already documented in the product plan.

## Verification

When code changes land for this plan:

- run `vp check`
- run `vp test`
- run `vp build`

Verification expectations:

- relocating from a valid late-bodega save lands in Porter's starter state without data loss
- Porter's starter state has 7 rooms and 12 operator cap
- staging is available on arrival through The Prep Room
- Porter's base tier supports floor switching cleanly
- Porter's upgrades land the expected slot and cap changes
- prep-room consumables consume the intended monster drops and produce only temporary raid aids
- F/E contract board on arrival and D-rank expansion through the arc behave as authored

Browser verification should cover:

- relocation acceptance and handoff
- Porter's arrival read
- floor switching
- room inspection for all starter rooms
- one prep-room consumable-prep flow
- one upgrade path through Upstairs Conversion and Waterfront

## Done When

- Porter's is a real relocation target, not just a concept doc
- the player lands in a no-regression Porter's starter state after relocating from the bodega
- Porter's introduces training, dedicated recovery, private break space, and prep-room consumables without overreaching into later workshop systems
- the second headquarters changes how the player reads and manages the guild instead of acting like a palette-swapped bodega
