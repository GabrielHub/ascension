# Visual / UI Direction

The UI direction for the rewrite **matches the existing game's visual language**. Replicate the patterns shipped in `app/ui/` and `app/app.css`, with a consolidation pass to remove duplication.

Code reuse from the current app is **not** allowed, but **visual language reuse is encouraged**. New code should reproduce the look and feel of the existing patterns, not the literal source.

## What To Replicate From The Current Game

### Color Palette

The existing CSS variables in `app/app.css` are the locked palette:

- `--color-void` (background — near-black, `#060608`)
- `--color-gold`, `--color-gold-dim` (primary accent / interactive — guild-tier gold)
- `--color-silver`, `--color-silver-bright` (text / structure)
- `--color-ember`, `--color-magma`, `--color-smolder`, `--color-ash` (warning / danger / fire palette)
- `--color-midnight`, `--color-steel`, `--color-slate` (cool surface depth)
- `--color-frost` (cool accent)
- `--color-danger` (error / death state)

Carry these forward as-is. They establish the game's tone — dark, gold-and-silver-on-near-black, with ember and frost accents for state.

### Glass Panel Surfaces

`.glass-panel` and `.glass-panel-subtle` from current `app/app.css`. Translucent panels with consistent opacity and blur, used for header, nav, cascading panels, event log rail. Replicate.

### Cascading Right-Anchored Panel Stack

The existing `app/ui/_panel-stack.tsx` pattern. Right-anchored, FIFO collapse, click-outside-collapses. Implementation lives in `rewrite/cascading-panel-shell` and `rewrite/ui-shell`.

### Tooltips

The existing `app/ui/_tooltip.tsx` (34 lines — already clean) is the canonical tooltip component. **Drop all other tooltip variants** that have accumulated in the current codebase during the consolidation pass.

### Bottom-Bar Shortcuts With Badges

Bottom-bar shortcut icons map 1:1 to room panels. Each shortcut supports a `!` badge for new attention surfaces (new visitors in recruitment, contract result needs review, narrative event fires, etc.).

### Top Bar

Always-visible cash + reputation readouts. Cog button for save/settings/pause.

### Event Log

Right-anchored persistent notice rail. Scrollable, click-through to actionable surfaces (operators, teams, raid summaries). Stays visible during cascading panel use; not displaced by the panel stack.

### Old-Style Modals

Reserved exclusively for narrative events and operator-death events. Block sim while open.

### Animation Library

**`motion`** (Framer Motion successor, already in `package.json`). Use for cascading panel transitions, modal entry/exit, badge attention, VFX overlays on portrait cards in encounter UI.

### Typography

- Tailwind v4 utilities by default. Use `className`.
- **Minimum font size: `text-xs`** (0.75rem / 12px). Never below.
- `text-xs` for labels, badges, secondary metadata. `text-sm` or larger for body text and descriptions.
- Replicate the existing font choice from `app/app.css`.

## CSS Migration Rules (Hard)

The current repo has 1,390 lines of `app.css` and accumulated UI duplication. The rewrite is a chance to fix this. **These are hard rules, not suggestions:**

- **Never copy over CSS that the new repo isn't actively using.** Don't carry forward dead rules. If a rule isn't referenced from a component the rewrite is keeping, drop it.
- **Never write custom CSS that could be done with Tailwind utility classes instead.** Padding, margin, color, spacing, typography, layout, flex/grid, borders, opacity, shadows — all should be Tailwind utilities applied via `className`.
- **Custom CSS only survives where Tailwind can't reach** — color variables (because the palette is project-specific), `backdrop-filter` blur on glass panels, complex multi-surface visual effects, and animation keyframes that aren't expressible as utility classes.
- **One canonical pattern per UI primitive.** Single tooltip (the existing `_tooltip.tsx`). Single cascading panel stack (the existing `_panel-stack.tsx` shape). Single modal pattern (narrative events only). Single badge pattern.
- **Component-scoped styles inline via `className`** rather than CSS-class lookups when possible. Easier for AI agents to read and refactor.

The `rewrite/visual-language-audit` sub-plan owns the deliverable: a kept / restyled / dropped list of CSS rules and components, plus the migration plan for the new repo's UI scaffolding.

## Hard Rules (From Rewrite Plan, Restated For Convenience)

- Tailwind v4 + `className`. No sprawling custom CSS.
- Minimum font size `text-xs`.
- Cascading right-anchored panel stack is the canonical UI shape for room/feature panels.
- Old-style modals stay only for narrative events.
- No top-level button menus that duplicate room features. Click rooms to open panels.
- Bottom bar = shortcut icons only, with `!` badges for attention.
- FIFO collapse, no hard cap, click-outside-collapses, panels categorized by entry point.
- Desktop-only. No responsive / mobile support.
- Animations are open to design pass — smooth, modern, clean, never overdone.
- Keyboard shortcuts: roadmap, not initial scope.
- Panel reuse principle: detail panels (operator detail, weapon detail, recruit, leaderboard, raid detail) are reusable components opening from any entry point that references the underlying entity.

## Locked Decisions

- **Color palette:** keep the existing gold/silver/ember on near-black palette. The palette is part of the game's identity, and the existing rivals, presenters, and portraits are designed against it.

## Cross-Doc References

- UI shell implementation: `rewrite/ui-shell`
- HQ click-to-panel contract: `rewrite/rooms-catalog` and `rewrite/cascading-panel-shell`
- Existing UI patterns to replicate: `app/ui/_panel-stack.tsx`, `app/ui/_tooltip.tsx`, `app/app.css`
- Existing motion library usage: `package.json` (`motion`)
- VFX overlay rules: see Asset Pipeline Contract — VFX is code (CSS + motion + React) layered on portrait cards in encounter UI
