# Skyscraper Prestige Pressure

## Intent

Deepen the final HQ so endgame pressure comes from being a visible institution, not just from bigger numbers or more rooms.

This slice should make the skyscraper feel like a place the city, rival guilds, and high-end operators care about.

## Why This Slice Exists

- The product docs want later-building pressure to rise through regulation, competition, factional response, and prestige.
- A final HQ without new social and political pressure will plateau into a larger Porter's.
- The skyscraper needs systems that justify staying there for the long tail.

## Scope

- Add skyscraper-specific pressure and incident hooks.
- Add prestige-facing room identities that belong in the final HQ.
- Increase recruitment, retention, and faction consequences for how the tower is run.

## Non-Goals

- No full S-rank celebrity system yet unless a later plan explicitly calls for it.
- No broad AI narrative overhaul.
- No simulated rival interiors.

## Concrete Deliverables

1. Add skyscraper-specific pressure sources tied to reputation, regulation, rivalry, and public exposure.
2. Add incident templates that only make sense once the guild is a visible institution.
3. Add prestige room families or floor identities such as:
   - club or lounge recruitment spaces
   - role-specific training floors
   - executive ops, compliance, or faction-facing rooms
4. Tie those rooms into retention, attraction, incident weighting, or faction standing where the simulation already owns the consequence.
5. Extend UI summaries so the player can read skyscraper pressure without digging through hidden state.

## Likely Code Areas

- `sim/systems/incidents.ts`
- city-pressure and faction systems
- `content/templates/events.ts`
- `content/templates/rooms.ts`
- `app/ui/management-panel.tsx`
- `app/ui/room-detail-panel.tsx`
- `app/ui/view-models.ts`

## Implementation Notes

- Pressure must remain simulation-owned. Do not push consequence logic into presentation code.
- Add only the prestige rooms that have concrete gameplay consequences in this slice.
- Keep the tone aligned with the world docs: workplace comedy under real institutional pressure.
- Make the skyscraper feel harder to run because it matters more, not because everything gets flat numeric inflation.

## Verification

- Add tests for the new pressure hooks and incidents.
- Add tests for any new room effects that change retention, recruitment, or faction outcomes.
- Run `vp check`.
- Run `vp test`.
- Run `vp build`.

## Done When

- The skyscraper produces recognizably different strategic pressure from Porter's.
- The final HQ feels like the start of a prestige game rather than a larger midgame building.
- Later B-rank and above content can layer onto a pressure model that already fits the building.
