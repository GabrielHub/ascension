# Narrative Character System Plan

Add authored presenter characters to interruption-backed guidance, incidents, and briefings without changing gameplay authority.

## Canon Inputs

Read before implementing:

- `docs/roadmap.md` (Current Milestone and sequencing)
- `docs/product/gameplay-systems.md` (Guided Onboarding And Narrative Framing)
- `docs/product/presentation.md` (Overlay UI Direction)
- `docs/product/asset-production.md`
- `docs/world/premise-and-tone.md`
- `docs/world/content-rules.md`
- `docs/world/operators-and-staff.md`
- `docs/research/shipped-plans/opening-campaign-spec.md`
- `docs/plans/porters-entry-plan.md`
- `app/ui/interruption-host.tsx`
- `app/ui/guidance-host.tsx`
- `app/ui/game-modal.tsx`
- `content/templates/events.ts`

## Goal

Give the game's interruption-backed narrative surfaces a consistent human face without creating a second authority path. The first slice is the assistant retrofitted into the bodega path. Porter's-specific presenters come later on the same system.

## Locked Constraints

- Gameplay authority stays in ECS state, interruption state, and authored consequence bundles. Presenter characters do not own triggers, choices, or outcomes.
- The existing interruption and guidance systems remain the only authority paths for blocking narrative delivery. Do not introduce a parallel modal framework.
- Presenter binding is optional. Events and guidance beats without a presenter binding must continue to render correctly in the current text-only format.
- Presenter definitions are authored content, not hardcoded UI labels.
- Presenter characters are authored narrative entities. They do not need to exist as simulation staff roles, room assignments, or hireable roster entries.
- Portraits follow the asset-production contract and remain distinct from operator portraits. They do not need gear overlays or combat hooks.
- Presenter portraits are a raster-image family, not a modular SVG family.
- The first presenter art direction is **manhwa-inspired modern dungeon-fantasy portrait art**: high-contrast, clean facial readability, controlled lighting, grounded NYC-worker styling, and cinematic webtoon energy. Treat "Solo Leveling" as directional shorthand, not as a literal franchise-copy target.
- For the first shipped raster portrait slice, generate characters on a plain light background with consistent bust-up or waist-up framing. Do not depend on transparent PNG support.
- The first shipped presenter UI mode is **faux cutout on a dark portrait panel**, not a framed portrait card.
- CSS-only white-background knockout is acceptable as part of that faux-cutout presentation, but it is **not** the long-term production guarantee. If a true cutout is needed later, plan an explicit extraction/edit pass instead of relying on luma-key hacks alone.
- Presenter image prompts should follow `docs/product/image-generation-prompting-guide.md`.
- The first shipped presenter slice is the assistant in the bodega path. Porter's cook and bartender come after that foundation exists.

## Scope

This plan is split into a bodega-first foundation and a Porter's follow-through.

### In Scope

- presenter data contract and registry
- optional presenter binding on guidance beats and incident-style interruption payloads
- interruption and guidance UI support for portrait + name rendering
- assistant definition, portrait set, and retrofit into the bodega opening / operational briefings
- Porter's cook and bartender definitions and bindings for Porter's-specific incidents once Porter's content lands
- raster-portrait generation workflow for presenter images, including consistency rules and background policy

### Out Of Scope

- live dialogue trees
- gameplay effects owned by presenters
- AI-authored presenter logic
- replacing existing event, guidance, or incident systems
- full voice acting or audio dialogue
- replacing the shipped modular SVG operator portrait system with raster generation
- broad raster generation for ordinary operators, room art, or base HQ composition in this plan

## Implementation Phases

### Phase 1: Presenter Contract And UI Foundation

Add the system surface with no canon drift and no dependency on Porter's.

Deliverables:

- Add an authored presenter registry. A new content module is acceptable if existing template files are not a clean fit.
- Define the presenter content shape:
  - stable id
  - display name
  - role / domain description for copy guidance
  - portrait asset refs keyed by expression state
  - default expression
  - domain tags for authoring convenience
- Extend interruption and guidance payloads to support an optional `presenterId` and optional explicit expression override.
- Update the modal layout so interruption-backed surfaces can render presenter portrait + name beside the existing text and choices.
- Preserve a clean fallback path when no presenter is bound.
- Define the presenter asset-path and registration contract for raster portraits and expression variants.

Implementation notes:

- Favor small extensions to existing payload shapes over a new event model.
- Keep presenter lookup outside React-only local state. The runtime event state should carry the presenter binding when one exists.
- Reuse shared portrait display primitives where possible, but do not force presenter portraits into operator-specific gear or body-part assumptions.
- The first modal rendering mode is locked:
  - soft-edged faux cutout on a dark portrait panel
  - future true cutout only after an explicit extraction path exists

Likely files:

- `content/templates/events.ts`
- new presenter content module under `content/templates/`
- `app/ui/interruption-host.tsx`
- `app/ui/guidance-host.tsx`
- `app/ui/game-modal.tsx`
- `app/ui/operator-portrait.tsx` or a presenter-specific sibling component if reuse becomes messy

### Phase 2: The Assistant Slice

Ship the first authored presenter in the bodega path.

Deliverables:

- Define the assistant as a named authored character with a consistent voice and role.
- Produce the minimum approved portrait-expression set for the assistant.
- Bind the assistant to the opening guidance path and the general operational briefing surfaces where a consistent presenter improves readability.
- Retrofit existing bodega guidance and interruption-backed narrative beats to use the assistant where appropriate.
- Establish the reusable image-generation workflow:
  - neutral master portrait first
  - expression variants generated from that master through an identity-preserving edit/reference workflow
  - locked framing, background, and prompt structure recorded for reuse

Constraints:

- Do not re-author every passive event-log line into dialogue.
- Use the assistant where the game already stops and addresses the player directly: tutorial beats, critical briefings, relocation framing, major operational notices.
- Keep Aina and Boris distinct. The assistant is a separate narrative entity, not an existing staff role.
- Do not chase perfect transparent-background cutouts in the first slice. Prioritize consistent identity, readable expressions, and reliable modal integration.

Likely files:

- guidance content definitions used by the opening path
- `app/ui/guidance-host.tsx`
- presenter registry
- presenter portrait assets and relevant manifest/registration points

### Phase 3: Porter's Presenter Extension

Use the same system for building-specific faces once Porter's exists.

Deliverables:

- Define **the cook** and **the bartender** as authored presenters.
- Produce their minimum portrait sets.
- Bind them to Porter's-specific incidents in their domains:
  - kitchen / food-quality incidents for the cook
  - bar / recruitment / regular drama incidents for the bartender
- Keep fallback text-only rendering functional for any Porter's incident that ships before a presenter binding is authored.
- Reuse the assistant image-generation pipeline rather than re-inventing prompts or framing for each character.
- Do not require the cook or bartender to exist as simulation staff entities unless a later plan explicitly chooses that integration.

Dependency:

- This phase depends on `porters-entry-plan.md` landing the relevant building content and incidents.

## Authoring Contract

Presenter-bound content must remain legible even if the presenter layer is hidden. The presenter improves framing; it must not become the only way the player understands what is happening.

When binding a presenter:

- choose the presenter whose role naturally owns the information
- keep the copy in that character's register
- do not invent new choices or consequences just to justify the character
- preserve the existing deterministic effect bundle

## Asset Contract

Presenter portraits follow the character-portrait workflow from `docs/product/asset-production.md`.

Raster-generation workflow for presenter portraits:

1. Write a short canon brief first: role, age band, social read, clothing language, attitude, and emotional register.
2. Generate a **neutral master portrait** on a plain light background with locked framing.
3. Approve the neutral master before generating expressions.
4. Generate expression variants by preserving identity and changing only expression / minor pose.
5. Review portraits inside the actual interruption modal, not just on a blank page.
6. Keep the final prompt set and invariants alongside the asset registration so later edits stay consistent.

Minimum recommended expression set for the first slice:

- neutral
- concerned
- serious
- amused

Do not expand the expression count until the modal layout and production cadence are proven.

Recommended first-slice framing:

- single character
- bust-up or waist-up
- 3/4 or front-facing portrait
- plain warm-white or light neutral background
- no scene clutter
- enough edge separation that a dark-panel faux-cutout treatment remains viable

## Tricky Parts And Open Design Questions

These are the parts most likely to create drift or implementation pain if they are not handled deliberately.

1. **Background handling.**
   A plain white or off-white background is a practical generation default, but CSS-only removal is brittle because highlights, teeth, eyes, and pale clothing can get damaged. For the first slice, treat the white background as a controlled portrait-card backdrop or dark-panel faux-cutout aid, not as guaranteed true transparency.

2. **Identity consistency across expressions.**
   The plan now depends on a neutral-master-first workflow. If expression variants are generated from scratch instead of from the approved master, the assistant will drift.

3. **Raster vs SVG family split.**
   Presenters can be raster without forcing ordinary operators or room art to become raster. That split is intentional. This plan should not quietly rewrite the existing operator portrait pipeline.

4. **Style consistency beyond presenters.**
   If the game later uses image generation for S-rank items, S-rank operators, or prestige boss art, those families should inherit the same prompting guide and review discipline, but not necessarily the same framing. Presenter portraits are the pilot family, not the entire raster spec.

5. **UI integration mode.**
   The first slice is locked to faux cutout on a dark panel. The remaining question is not card vs cutout anymore; it is whether the faux-cutout treatment is visually strong enough to remain the long-term default or whether a later true-cutout pipeline is worth the cost.

6. **Prompt-library reuse.**
   Without a checked-in prompting guide and locked invariants, every future character generation pass will drift stylistically. This plan now assumes the guide is a dependency, not optional nice-to-have.

## Verification

When code changes land for this plan:

- run `vp check`
- run `vp test`
- run `vp build`

Verification expectations:

- save/load restores the same unresolved interruption with the same presenter binding
- guidance beats with presenters and guidance beats without presenters both render correctly
- interruption modals with presenters and interruption modals without presenters both render correctly
- the bodega opening path still progresses correctly after the assistant retrofit

Likely test targets:

- `app/ui/interruption-host.test.tsx`
- guidance-host tests or new guidance rendering coverage
- any payload serialization tests affected by presenter bindings

## Done When

- presenter definitions exist as authored content, not ad hoc UI constants
- interruption and guidance surfaces can optionally show presenter portrait + name without changing authority or save behavior
- the assistant is visible in the bodega's authored guidance / briefing path
- Porter's-specific presenters are blocked only on Porter's content, not on unresolved presenter-system design
