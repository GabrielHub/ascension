# Asset Pipeline Contract

The contract for authored game assets. Defines the asset family inventory, layer model, directory conventions, generation paths, and workflow rules. Use this when creating any asset that ships into the game.

Read [Room Themes](./room-themes.md) for per-room visual canon. Read [Image Generation Prompting Guide](./image-generation-prompting-guide.md) for raster image prompting rules.

## Scope

**In scope:** every authored visual asset and audio asset family that ships into the runtime.

**Not in scope:**
- **VFX (visual effects).** Implemented as CSS + Framer Motion + React components, overlaid on portrait cards in encounter UI. Code, not assets. Authored in the encounter sub-plan.
- **SFX (sound effects).** Implemented as code-defined cues following the existing `AudioCueDefinition` pattern in `app/features/audio/cues.ts`. Code-generated audio, not asset files. Authored in the encounter SFX sub-plan.

## Asset Family Inventory

| Family | Generation | Per-tier? | Status | Notes |
|---|---|---|---|---|
| Outdoor backdrop | AI raster | Per phase (4: sunrise, day, sunset, night) | Rebuild from existing skyscraper reference | Sky, neighboring towers, time-of-day. Swapped by clock; no canvas filter. |
| Room interior backdrops | AI raster | Per tier per room | New | The bulk of the new asset work. Replaces dropped SVG room scenes. Shells start small at T1, grow with tier upgrades. |
| Operator portraits | AI raster | No (1 per operator) | Existing pipeline | 1024×1536 family. Per-rank visual escalation; authored prompts. |
| Chibi tokens | Composable parts | No | Existing, pending `rewrite/svg-asset-audit` | 2D flat. Composed from operator parts (face, hair, etc.). Survives subset of current SVG asset catalog after audit. |
| Presenter portraits | AI raster | No (1 per expression × 4 expressions per presenter) | Existing, locked workflow | 1024×1536. See [Image Gen Guide](./image-generation-prompting-guide.md). |
| Rival leader portraits + insignia | AI raster | No | Existing, locked workflow | See [Rival Guild Creation](./rival-guilds.md) for rival authoring contract. |
| Boss SVGs (non-unique) | Manually authored SVG | No (1 per boss) | New assets | Authored as part of dungeon authoring per rank. Do not copy current boss SVGs forward. |
| Unique boss portraits | AI raster | No (1 per unique boss) | New | Authored at content time per unique dungeon. |
| Weapon icons | AI raster | Per rank tier | New | F/E/D grounded → C/B real → B/A mystical → unique. See [Content Rules](../world/content-rules.md). |
| Unique operator portraits | Authored raster, glow border | No | New | Production-time AI-agent asset work plus human approval, with the **shared glow effect** (see Glow Effect Rule below). Not runtime AI. |
| Unique weapon portraits | Authored raster, glow border | No | New | Production-time AI-agent asset work plus human approval. Same shared glow effect, with distinct weapon identity. Not runtime AI. |
| Raid backdrops | AI raster | No (1 per dungeon) | New | Revealed via fog of war during exploration. |

## Layer Model

Render order, top to bottom (UI is highest, outdoor backdrop is lowest):

1. **UI overlays** — panels, tooltips, modals, badges, the persistent guide card.
2. **Chibi tokens** — operators and visitors walking inside their current room's footprint.
3. **Room interior backdrops** — painted per-room art layered into the building shell at the room's grid footprint.
4. **Building shell / structure** — engine-rendered isometric shell, floor edges, room delimiters. Reuses existing skyscraper structure code.
5. **Outdoor backdrop** — sky, neighboring towers, time-of-day art.

Day/night phases swap the outdoor backdrop (#5) only. The HQ canvas itself is not filtered.

## Walkable Area And Chibi Behavior

- **No pathfinding.** Chibis idle inside their current room's grid footprint, walking somewhat aimlessly.
- **Walkable area = the room's grid footprint** (`col, row, cols, rows`). Defined per room in the new repo's single-building HQ environment registry. The current `content/data/hq-environment-index.json` is reference only; do not copy its multi-building / SVG-scene contract verbatim.
- **Room transitions** = a simple visual animation or effect (fade, slide, dissolve) for a chibi exiting one room and appearing in another. No pathfinding through corridors.

## Glow Effect Rule

There is **one shared glow effect** in the game, used to mark "this is a unique." Apply it to:
- Unique operator portraits.
- Unique weapon portraits.
- Any future surface that needs to mark a unique entity.

**Do not author multiple glow effects.** Implementing agents pick the specifics (color, thickness, animation behavior) once; the chosen pattern then propagates everywhere. Iterate by changing the single pattern; never fork it.

## Directory Structure

Assets live under `public/data/`:

```
public/data/
  outdoor-backdrops/
    <phase>.png                      # sunrise | day | sunset | night
  rooms/
    <floor-id>/<room-id>/<tier>.png  # e.g. rooms/floor-recruitment/recruitment/t2.png
  operators/
    portraits/<id>.png
    parts/...                        # chibi composition parts (post-audit)
  presenters/<slug>/<expression>.png
  rivals/<slug>/leader-neutral.png
  rivals/<slug>/insignia.png
  bosses/
    <dungeon-theme>/<name>.svg       # non-unique bosses
  uniques/
    bosses/<name>.png                # unique boss portraits
    operators/<id>.png               # unique operator portraits
    weapons/<id>.png                 # unique weapon portraits
  weapons/<rank>/<id>.png
  raids/<dungeon-id>/backdrop.png
```

## Generation Paths

Each asset family ships through one of three paths:

- **AI raster.** Generated by engineering/content agents via the [Image Gen Guide](./image-generation-prompting-guide.md) workflow. Iteration is human-and-agent back-and-forth at content-authoring time. **No runtime generation.**
- **Manually authored.** SVG (boss families) or raster (unique operator/weapon portraits). AI agents may produce drafts and revisions, but the asset is a checked-in authored artifact approved by the human before promotion.
- **Composable.** Chibi tokens are composed from authored parts. Parts are added to the parts library; runtime composes per-operator from parts data.

## Background-Removal Step

For every AI-generated raster asset that needs a transparent background (presenters, rivals, room interior backdrops where they layer over building shell, unique portraits, weapons, raid backdrops where masked, etc.):

1. Generate the asset.
2. **Manually run it through a background remover** (human step, not AI-automated).
3. Verify transparency in the asset playground.
4. Check into the repo at the canonical location.

Asset plans must call this step out explicitly when applicable.

## Manifest / Runtime Asset Registry

- **Single source of truth** for what assets exist at runtime.
- **Avoid massive monolithic files** — split into per-family registries if needed (e.g. `rooms-manifest.json`, `weapons-manifest.json`) rather than one giant index.
- **Implementing agent picks the format** — generated index, hand-maintained JSON, or convention-based discovery — but it must be machine-readable and agent-edit-friendly.
- **Runtime imports the registry**, never hard-codes asset paths in component code.

## Asset Versioning

- **Always overwrite.** Regenerated assets replace the old file in place.
- **No suffix versioning** (`name-v2.png` is forbidden).
- **Version history lives in git.**

## Asset Production Workflow

Every asset family follows the same shape:

1. **Brief.** Asset id reservation + generation path + reference to the relevant theme/canon doc.
2. **Generate / author.** AI raster generation or manual authoring or part composition.
3. **Background removal** if applicable (manual human step).
4. **Preview in asset playground.** Confirm composition, identity, alignment.
5. **Place in scene builder** if applicable (room backdrops only).
6. **Human review and approval.** Required before promotion.
7. **Promote.** Move to canonical directory, update manifest if needed.

Steps 2–4 iterate until the asset is satisfying.

## Tooling

### Scene Builder (rebuild scope)

- **Purpose:** layout tool for placing room interior backdrops onto the canvas grid.
- **Inputs:** the canonical floor stack and room footprints (from the new repo's remediated `hq-environment-index.json`).
- **Operations:** load a backdrop image into a room footprint, adjust scale and offset within the footprint, save placement metadata.
- **References:** the existing scene builder pattern from the current skyscraper implementation; rebuild around raster backdrops instead of SVG scenes.
- **Out of scope:** no chibi positioning logic (chibis idle within the footprint at runtime); no game-state preview (that's the dev menu).

Detailed implementation lives in `rewrite/scene-builder`.

### Asset Playground (rebuild scope)

- **Purpose:** generic previewer for every asset family.
- **Replaces:** the current SVG playground.
- **Operations:** load any asset (room backdrop at any tier, operator portrait, presenter expression, rival, boss, unique, weapon, raid backdrop, chibi token composed live, audio cue playback, VFX animation playback).
- **Optional:** combine with the AI playground so prompt experimentation and asset preview live in one tool.

Detailed implementation lives in `rewrite/asset-playground`.

## Cross-Doc References

- Per-room visual themes: [Room Themes](./room-themes.md)
- Image generation prompting rules: [Image Generation Prompting Guide](./image-generation-prompting-guide.md)
- Rooms catalog (sizes / footprint context): [Rooms Catalog](./rooms-catalog.md)
- Floor stack and slot positions: [Floors Catalog](./floors-catalog.md)
- Audio cue pattern (SFX implementation): `app/features/audio/cues.ts`
- Walkable area / room footprint reference: current `lib/hq-room-state.ts` (`HqRoomFootprint`) and current `content/data/hq-environment-index.json` as reference only; new repo authors a remediated single-building registry
- Archived decision source: [Full Rewrite Source](../reference/fullrewrite-source.md) §4
