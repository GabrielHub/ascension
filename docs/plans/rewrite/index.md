# Numbered Rewrite Plans

Status: not started
Plan ID: rewrite/implementation-index
Implementation order: 00
Blockers: none

This is the active implementation queue for *Hazard-Pay: Dungeon Management*. Work plans in numeric order unless a plan's dependencies explicitly allow parallel work.

## Status Legend

- `not started` — no implementation work has begun.
- `in progress` — an agent owns the plan and is actively changing code, content, assets, or docs.
- `waiting review` — implementation and verification are done; a separate review pass is required.
- `completed` — review passed; move the plan to `docs/plans/graveyard/`.

## Active Queue

| Order | Plan | Status | Primary blockers |
|---:|---|---|---|
| 01 | [Repo Setup](./01-repo-setup.md) | not started | none |
| 02 | [World Doc Rewrite](./02-world-doc-rewrite.md) | not started | rewrite/master-plan |
| 03 | [Product Doc Cleanup](./03-product-doc-cleanup.md) | not started | rewrite/world-doc-rewrite |
| 04 | [Asset Pipeline](./04-asset-pipeline.md) | not started | none |
| 05 | [Raid Backdrop Pipeline](./05-raid-backdrop-pipeline.md) | not started | rewrite/asset-pipeline |
| 06 | [Visual Language Audit](./06-visual-language-audit.md) | not started | none |
| 07 | [Floor Model](./07-floor-model.md) | not started | none |
| 08 | [Rooms Catalog](./08-rooms-catalog.md) | not started | rewrite/floor-model |
| 09 | [Cascading Panel Shell](./09-cascading-panel-shell.md) | not started | none |
| 10 | [UI Shell](./10-ui-shell.md) | not started | rewrite/cascading-panel-shell |
| 11 | [Bottom Bar Shortcuts](./11-bottom-bar-shortcuts.md) | not started | rewrite/rooms-catalog |
| 12 | [HQ Environment Index](./12-hq-environment-index.md) | not started | rewrite/asset-pipeline, rewrite/floor-model, rewrite/rooms-catalog |
| 13 | [Operator Movement](./13-operator-movement.md) | not started | rewrite/floor-model, rewrite/rooms-catalog, rewrite/hq-environment-index |
| 14 | [Operator Model](./14-operator-model.md) | not started | none |
| 15 | [Encounter Engine](./15-encounter-engine.md) | not started | rewrite/operator-model |
| 16 | [Encounter Effects Pool](./16-encounter-effects-pool.md) | not started | rewrite/encounter-engine |
| 17 | [Operations Loop](./17-operations-loop.md) | not started | rewrite/operator-model |
| 18 | [Recruitment Loop](./18-recruitment-loop.md) | not started | rewrite/operator-model, rewrite/rooms-catalog |
| 19 | [Combat Package Content Rewrite](./19-combat-package-content-rewrite.md) | not started | rewrite/operator-model, rewrite/encounter-effects-pool |
| 20 | [Dungeons Catalog](./20-dungeons-catalog.md) | not started | rewrite/operations-loop |
| 21 | [Raid Minimap](./21-raid-minimap.md) | not started | rewrite/operations-loop, rewrite/raid-backdrop-pipeline |
| 22 | [Boss Commitment Prep Screen](./22-boss-commitment-prep-screen.md) | not started | rewrite/encounter-engine, rewrite/operations-loop |
| 23 | [Encounter SFX](./23-encounter-sfx.md) | not started | rewrite/encounter-engine |
| 24 | [Weapon Asset Family](./24-weapon-asset-family.md) | not started | rewrite/asset-pipeline |
| 25 | [Weapon Loot Tables](./25-weapon-loot-tables.md) | not started | rewrite/weapon-asset-family |
| 26 | [Workshop Market](./26-workshop-market.md) | not started | rewrite/weapon-loot-tables, rewrite/rooms-catalog |
| 27 | [Presenters Catalog](./27-presenters-catalog.md) | not started | rewrite/rooms-catalog |
| 28 | [Presenter Domain Rework](./28-presenter-domain-rework.md) | not started | rewrite/rooms-catalog, rewrite/presenters-catalog |
| 29 | [Narrative Events](./29-narrative-events.md) | not started | rewrite/rooms-catalog |
| 30 | [Guidance System](./30-guidance-system.md) | not started | rewrite/rooms-catalog, rewrite/operations-loop |
| 31 | [Rival Loop](./31-rival-loop.md) | not started | rewrite/operations-loop |
| 32 | [Rivals Catalog](./32-rivals-catalog.md) | not started | rewrite/rival-loop |
| 33 | [AI Surfaces](./33-ai-surfaces.md) | not started | none |
| 34 | [Audio Inventory](./34-audio-inventory.md) | not started | none |
| 35 | [Dev Menu](./35-dev-menu.md) | not started | rewrite/repo-setup |
| 36 | [Dev Console](./36-dev-console.md) | not started | rewrite/repo-setup |
| 37 | [Scene Builder](./37-scene-builder.md) | not started | rewrite/asset-pipeline, rewrite/hq-environment-index |
| 38 | [Asset Playground](./38-asset-playground.md) | not started | rewrite/asset-pipeline |
| 39 | [SVG Asset Audit](./39-svg-asset-audit.md) | not started | none |
| 40 | [Headless Sim Harness](./40-headless-sim-harness.md) | not started | rewrite/repo-setup, rewrite/operator-model |
| 41 | [Economy](./41-economy.md) | not started | rewrite/floor-model, rewrite/rooms-catalog, rewrite/operations-loop, rewrite/headless-sim-harness |
| 42 | [Unique Operators Catalog](./42-unique-operators-catalog.md) | not started | rewrite/operator-model, rewrite/dungeons-catalog |
| 43 | [Unique Weapons Catalog](./43-unique-weapons-catalog.md) | not started | rewrite/workshop-market, rewrite/unique-operators-catalog |
| 44 | [Unique Unlock Goals](./44-unique-unlock-goals.md) | not started | rewrite/unique-operators-catalog, rewrite/dungeons-catalog |

## Parallelization Notes

- After `rewrite/repo-setup`, `rewrite/asset-pipeline`, `rewrite/visual-language-audit`, `rewrite/operator-model`, `rewrite/ai-surfaces`, and `rewrite/audio-inventory` can proceed in parallel because they do not depend on each other.
- After `rewrite/asset-pipeline`, raid backdrop, weapon asset, asset playground, scene builder, and SVG audit work can fan out according to their specific blockers.
- After `rewrite/floor-model` and `rewrite/rooms-catalog`, HQ environment, operator movement, UI, recruitment, presenters, and guidance work can fan out.
- After `rewrite/operator-model`, operations, encounter, recruitment, and combat-package work can fan out.
- After `rewrite/operations-loop`, dungeons, minimap, rivals, guidance, and economy work can proceed in parallel with clear ownership boundaries.

## Review Gate

Before any plan moves to `completed`, the reviewer checks:

- The implementation did not reintroduce a dropped Ascension system.
- The plan's scope stayed bounded.
- Product/world docs still agree with the implementation.
- Verification listed in the plan was run or a concrete blocker is recorded.
- Follow-up plans were created only for real out-of-scope work, not cleanup drift.
