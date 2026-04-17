# Skyscraper Floor Expansion

## Intent

Add the first repeatable expansion loop for the final HQ by letting the player acquire and fit additional skyscraper floors.

This is the slice that turns the skyscraper from a final relocation target into the foundation of a long-tail campaign.

## Why This Slice Exists

- The final HQ is supposed to carry the rest of the game.
- The project wants endgame growth to happen inside one building rather than through a fourth headquarters.
- The current multi-floor model supports authored floors, but not a persistent player-facing floor-acquisition loop.

## Scope

- Add persistent owned-floor state for the skyscraper.
- Add a floor-acquisition command or building action with explicit costs and gating.
- Add reusable floor bands or floor packages so expansion does not require bespoke content for every step.
- Surface purchased floors in HQ management and floor selection.

## Non-Goals

- No literal infinite procgen tower.
- No requirement to support 20+ simultaneously visible floors.
- No new rank band in this slice by itself.

## Concrete Deliverables

1. Add save-safe skyscraper floor ownership state.
2. Add runtime commands/systems to purchase or unlock a new floor.
3. Extend building layout resolution so owned floors append cleanly to the skyscraper stack.
4. Add UI surfaces for:
   - viewing owned versus locked floors
   - purchasing the next floor
   - understanding what kind of floor package is being added
5. Add reusable floor package contracts so new floors can be authored in families rather than one-off hand wiring.
6. Add verification for save/load, floor selection, and room-slot growth after purchase.

## Recommended Floor Model

- Use authored floor packages or elevation-band families.
- Keep the acquisition order explicit.
- Let repeated purchases deepen space, staffing, and room access rather than only increasing raw slot count.
- Keep the first implementation readable from the HQ shell. If the UI cannot explain the floor stack, the model is too wide for this slice.

## Likely Code Areas

- `content/building-layouts.ts`
- `content/templates/buildings.ts`
- runtime save schema and migration code
- `sim/systems/commands.ts`
- building progression or relocation-adjacent state
- `app/ui/management-panel.tsx`
- `app/ui/view-models.ts`

## Implementation Notes

- Treat floor acquisition as a building-owned progression system, not a UI-local list mutation.
- Keep costs and gates deterministic and inspectable.
- Prefer one clear "next floor" action over a wide menu of parallel tower-planning choices in the first pass.
- Make the resulting floor stack reusable by later environment cleanup and presentation work.

## Verification

- Add tests for purchasing a floor, saving, loading, and still owning that floor.
- Add tests for room-slot growth or floor visibility after acquisition.
- Run `vp check`.
- Run `vp test`.
- Run `vp build`.

## Done When

- The skyscraper can grow after relocation without introducing another headquarters.
- Purchased floors persist through save/load.
- The model is clean enough that later prestige and pressure slices can build on it instead of replacing it.
