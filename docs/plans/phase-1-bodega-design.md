# Phase 1 Design

This plan covers all design-owned work for Phase 1, including code work when the task is design-led.

## Ownership Rule

Design agents own:

- UI implementation
- SVG work
- world-surface visual readability work
- typography, layout, motion, and styling
- focused-detail presentation
- mixed visual-code tasks that cannot be cleanly separated

Design agents may write code. The distinction is ownership, not whether code is involved.

## Scope

Primary ownership:

- `app/ui`
- presentation concerns in `app/routes`
- `app/app.css`
- `render/`
- presentational adapters that exist only to support visual surfaces

The current style direction in `docs/style-guide.md` remains the baseline unless the manager approves a documented change.

## Hard Constraints

- do not put gameplay rules in React components
- do not turn render code into a hidden gameplay layer
- consume typed selectors and commands from runtime or app glue
- if a mixed task cannot be split cleanly, keep it with a design agent and request the needed contract first

## Workstreams

### Workstream A: Headquarters surfaces

Targets:

- bodega floor and room readability
- roster and recruitment surfaces
- staffing and operational status surfaces
- upgrade and room-state presentation

### Workstream B: Raid-facing surfaces

Targets:

- dispatch flow presentation
- raid watch mode
- focused inspection views
- readable logs and summary surfaces driven by structured outcomes

### Workstream C: Operator visual and SVG pipeline

Targets:

- operator detail presentation
- SVG part tagging, search, and composition polish
- context-aware appearance presentation for HQ versus raid contexts
- any mixed render-plus-design code required for clarity

## Coordination Rules

- ask for stable selectors instead of reaching into runtime internals
- keep route modules as shell navigation and presentation only
- any new data need should go back through the manager if it changes runtime or save ownership

## Exit Criteria

- Phase 1 has production-facing bodega, roster, recruitment, and raid surfaces
- SVG and canvas presentation remain design-owned
- UI dispatches commands and renders authoritative data without owning gameplay outcomes
