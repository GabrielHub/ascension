# New Repo Agent Guidance Draft

Use this as the source draft for the new repo's `AGENTS.md` and `CLAUDE.md`. It keeps the rules that still apply to *Hazard-Pay: Dungeon Management* and drops current-repo rules tied to Ascension, Tauri, multi-HQ progression, and the old SVG room-scene pipeline.

## Agent Autonomy

- Read the relevant code, product docs, world docs, and active `rewrite/*` plan before changing files.
- Challenge requests that conflict with the active numbered plan, product docs, world docs, architecture, or current implementation evidence.
- Do not add features, broad refactors, or cleanup beyond the active plan's scope.
- Prefer editing existing files over creating new ones unless the plan calls for new files.
- Do not add one-off helpers, shims, placeholder comments, or backwards-compatibility layers for removed Ascension systems.

## Toolchain

- Use Vite Plus: `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, and `vp preview`.
- Use package scripts only where there is no `vp` equivalent.
- Browser mode is the primary development and validation surface.
- No Tauri, desktop host, file-backed saves, or `tauri-test/` workflow exists in the initial rewrite.

## Architecture

- ECS owns authoritative mutable gameplay state.
- Templates own static gameplay definitions.
- Systems own gameplay consequences.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code owns serialization and migration, not gameplay repair.
- Runtime local AI never owns gameplay authority. It may phrase, contextualize, or assemble approved content only after deterministic systems choose the trigger, subject, choices, and effects.

## Documentation

- Active canon is the rewritten world docs, product docs, and actionable `rewrite/*` plans.
- Current Ascension docs and code may be used as reference material only. Do not copy a current pattern forward if it conflicts with the active numbered plan, product docs, or world docs.
- World docs own tone, voice, lore, naming, and content feel.
- Product docs own content tables and content requirements.
- Plans own implementation steps, blockers, and acceptance criteria.
- Code, tests, templates, and assets are the source of truth for implemented behavior once written.

## AI And Assets

- Runtime local AI surfaces are limited and optional. The game must remain playable with AI disabled.
- Production-time AI asset work is different from runtime AI. Engineering/content agents may generate and revise images or SVGs while executing plans, but assets are checked in only after human approval.
- Manual human steps such as background removal are part of asset production and must be called out in asset plans.
- No runtime image generation.
- Reuse approved current assets only where the rewrite explicitly keeps them: operator portraits, chibi tokens/parts after audit, presenter portraits, and rival portraits/insignia where still valid.
- Do not copy current boss SVGs. Author new boss SVGs as part of new dungeon packets.
- The new repo needs a remediated single-building HQ environment registry. Do not copy the current multi-building `hq-environment-index.json` verbatim.

## Gameplay Boundaries

- One HQ: the skyscraper.
- Browser storage saves only. No Ascension save migration.
- Cash and Reputation are the only resources.
- Weapons are the only equipment/items.
- No crafting, outfits, accessories, consumables, districts, factions, public pressure, Tauri, rank advancement, hunger, manual mid-raid withdraw, mobile UI, or direct rival battles in initial scope.
- Rivals are the late-game pressure system; new-game rival plans supersede current public-pressure implementation details.

## UI Rules

- Use Tailwind v4 utilities via `className`.
- Minimum font size is `text-xs` / 12px. Never use smaller arbitrary text.
- Cascading right-anchored panel stack is the canonical room/feature panel pattern.
- Old-style blocking modals are reserved for narrative events and operator-death events.
- Bottom bar is shortcut icons with attention badges, not duplicate top-level feature menus.
- Desktop-only for initial scope. Do not spend effort on responsive/mobile behavior.
- Preserve the established dark/gold/silver/ember visual language unless a plan explicitly changes it.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when a change touches runtime behavior, saves, systems, templates, integration, or user-facing workflows.
- For docs-only changes, review links and cross-doc references relevant to the edit.
- Fix failing checks instead of dismissing them as unrelated.
