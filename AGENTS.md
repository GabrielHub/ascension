# AGENTS.md

Repo-specific correctional guidance only. Assume normal engineering competence.

## Agent Autonomy

- Challenge requests you believe are wrong, suboptimal, or improvable — offer alternatives before executing
- Think before acting: read the relevant code, understand context, and form a plan before making changes
- The user is not always right — pushback grounded in evidence or engineering judgment is expected

## Coding Discipline

- Read code before modifying it — do not propose changes to files you have not read
- Do not add features, refactor, or make improvements beyond what was asked
- Do not create helpers, utilities, or abstractions for one-time operations — prefer inline simplicity
- Do not add error handling or validation for scenarios that cannot occur — validate only at system boundaries
- Do not add backwards-compatibility shims, re-exports, or placeholder comments for removed code
- Prefer editing existing files over creating new ones
- Do not introduce security vulnerabilities (command injection, XSS, SQL injection, etc.)

## Toolchain

- Use `Vite+`.
- Prefer `vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, and `vp preview` for standard web workflows.
- Do not assume standard Vite-only workflows unless explicitly documented.
- Use package scripts only when there is no `vp` equivalent, such as `pnpm tauri:dev`, `pnpm tauri:build`, `pnpm test:tauri`, and `pnpm mcp:tauri-test`.

## Architecture

- ECS owns authoritative mutable gameplay state.
- Templates own static gameplay definitions.
- Systems own gameplay consequences.
- UI owns presentation and typed intents only.
- React Router owns shell navigation only.
- Save code owns serialization and migration, not gameplay repair.
- Render and SVG code must not become alternate rule engines.

## Content Generation

- Consult `docs/world/` before generating any content: design, visual assets, copy, narrative, SFX, or naming
- The world foundation is the canonical tone and content reference for all authored material
- The product plan owns mechanics and systems; `docs/world/` owns what things look, sound, read, and feel like

## Documentation Policy

- Code, tests, templates, and assets are the source of truth for implemented behavior.
- Do not write docs that duplicate behavior already explained by the implementation.
- Keep `docs/` for roadmap, future-facing questions, and research only.
- Keep repo workflow rules in `AGENTS.md` and `CLAUDE.md`.

## HQ SVG Asset Contract

- HQ SVG work must follow `docs/product/asset-production.md` and `docs/product/presentation.md`.
- For runtime-facing placement data, `content/data/hq-environment-index.json` is the source of truth for the current HQ grid, scene origin, viewBox, room footprint, asset roots, and shell-relative backdrop zones.
- Do not invent a new camera, grid, room footprint, origin, viewBox, or anchor convention per asset. Read the active building contract first and match it exactly.
- HQ assets use one canonical angled/isometric 2:1 presentation language. Horizontal edges follow the shared tile axes and verticals stay vertical.
- If an HQ asset only looks correct in isolation, on a blank canvas, or from a different camera angle, it is not production-ready.

### HQ Asset Family Boundaries

- Shell/perimeter assets own the building envelope, cutaway silhouette, and exterior shell read.
- Structural assets own floors, walls, corners, thresholds, doors, and windows. Those are engine-rendered building parts, not room-scene art.
- Reference fixtures may include a full room box with walls and floor, but they are exploration/preview artifacts only and must never be treated as approved runtime room art.
- Room scene SVGs are the approved production room-interior asset: one pre-composed SVG per room containing furniture, fixtures, and decorations only.
- Background/surroundings assets own shell-relative exterior context such as neighboring buildings, harbor/street dressing, skyline, rooftop machinery, and scale cues. They must not duplicate shell, structure, or room-scene responsibilities.
- Individual prop SVGs are for non-room uses or deliberate exterior composition. Room furniture should normally be authored inside the room's pre-composed scene SVG, not shipped as floating standalone room pieces.
- When remediating HQ rooms, treat the currently shipped HQ exterior/background asset language as the positive reference for projection discipline and grounding. Do not treat current room scenes as authoritative if they violate the contract.

### HQ Grid Fit And Geometry Rules

- Every line that is meant to follow the floor plane must be exactly parallel to one of the two canonical isometric axes. "Almost parallel" is a failure.
- In screen space, horizontal footprint edges must follow the canonical 2:1 isometric directions only. Do not introduce near-iso slants, ad hoc skew angles, or perspective convergence.
- Upright edges stay vertical. Do not lean walls, posts, cabinets, or furniture supports unless the object is intentionally damaged and the lean is clearly authored.
- Grounded rectangles on the floor plane must read as isometric parallelograms aligned to the tile axes, never as front-on rectangles.
- Circular forms on the floor or top planes must read as isometric ellipses, not literal circles. Top ellipses should respect the canonical 2:1 compression.
- Asset bases and footprints must snap cleanly to the shared room/grid logic. If the footprint cannot be described cleanly on the tile axes, the asset is off-contract.
- Do not eyeball fit against a screenshot alone. Check the asset against the shared grid/scene contract in the viewer, builder, or in-engine composition.

### HQ Room Scene Rules

- HQ room interiors use pre-composed scene SVGs containing props only.
- Scene SVGs must never include walls, floors, tile grids, measurements, labels, room-box outlines, or other structural elements.
- Recipe previews for rooms must show the full room box first. Approved production output is the props-only scene extracted from that preview.
- Every object inside a room scene must align to the canonical tile axes and read in isometric 2:1 projection, including wall-adjacent assets.
- Flat camera-facing rectangles, front-on cabinets, straight-on posters pretending to be furniture, and top-down symbols are never valid HQ room assets.
- Room layouts must preserve circulation and wall clearance on the shared room footprint. Furniture that only fits by cheating the angle or sliding off-axis is invalid.
- Scene SVGs must be validated over engine-rendered walls and floors and next to neighboring rooms. If a room breaks when snapped into the real layout, reject it.

### HQ Room Scene Alignment Checklist

- Treat `content/data/hq-environment-index.json` scene-system values (`canonicalOrigin`, `canonicalViewBox`, `roomFootprint`) as the source of truth for room-scene placement.
- Scene SVGs are authored in a canonical room-scene frame; runtime placement must center that canonical frame inside the actual slot footprint when slot size differs.
- For alignment bugs, debug in this order: (1) runtime contract/placement math, (2) slot vs active footprint inputs, (3) SVG internal composition.
- Do not "fix" systemic centering issues with one-off per-room renderer offsets or ad hoc camera tweaks.
- After any placement change, validate at least one non-canonical slot size (wider/taller/square) via tests plus in-engine preview before sign-off.

### HQ Background And Exterior Rules

- Exterior/background assets are shell-relative layers, not generic filler dropped anywhere that looks empty.
- Background assets must reinforce the building's site context and time-of-day package without redefining the building structure.
- Background assets must align to the same isometric axes as the shell and room system.
- Background assets must not introduce a second fake floor plane, horizon, or camera angle.
- Skyscraper backgrounds are altitude-first: neighboring towers, haze, rooftop machinery, aircraft cues, and city-glow below. Do not backslide into sidewalk, curb-clutter, or harbor language unless the view is explicitly a ground-entry package.

### Grounding And Shadow Rules

- HQ assets must feel grounded on the shared plane. Bases, feet, posts, wheels, and support points should meet the implied floor or ground contact cleanly.
- Prefer cel shading, face shading, overlap, and material/value separation over baked cast shadows for depth cues.
- Do not bake broad oval drop shadows, detached shadow pads, or fuzzy underlays that make props look like they are floating above the grid.
- Small contact or occlusion shadowing that is tight to the asset footprint is acceptable. Large cast-light decisions belong to runtime lighting/backdrop treatment, not arbitrary per-asset shadow blobs.
- Asset shading must not imply a conflicting sun direction or a different ground plane from the rest of the HQ composition.

### HQ Acceptance Checks

- Reject the asset if any intended parallel floor-plane edges drift off the canonical grid axes.
- Reject the asset if its footprint does not sit cleanly on the room/grid contract when previewed in context.
- Reject the asset if depth is carried by a flat front-facing rectangle instead of isometric planes.
- Reject the asset if shadows do more work than the form shading and make the object read as pasted-on or hovering.
- Reject the asset if it looks correct only as a standalone illustration and not when layered into the actual HQ composition.

### Required HQ SVG Workflow

- Before authoring HQ assets, read the relevant building/room canon in `docs/world/`, then the HQ asset rules in `docs/product/asset-production.md` and `docs/product/presentation.md`, then the active building contract in `content/data/hq-environment-index.json`.
- For rooms, produce the reference fixture/recipe preview first, then extract the props-only scene SVG.
- For surroundings/backgrounds, lock the shell-relative composition zones before producing final SVG layers.
- Review HQ SVGs in the asset viewer/playground and in the actual game composition before treating them as approved.

## Forbidden Mistakes

- gameplay logic in React components
- direct UI-owned gameplay mutation
- router-owned gameplay state
- named-content branches without documentation
- treat scaffold defaults or stale docs as stronger than code-level contracts
- `as any`
- walls, floors, or structural elements inside room scene SVGs
- flat camera-facing props (non-isometric rectangles) in any HQ asset
- detached oval drop shadows or fuzzy shadow pads that make HQ assets float
- inventing per-asset HQ grid/origin/viewBox/footprint rules instead of using `content/data/hq-environment-index.json`
- treating a full-room illustration or reference fixture as approved runtime room-scene output
- background assets that duplicate shell/interior structure responsibilities
- font sizes below `text-xs` (0.75rem / 12px)

## UI Rule

- Always use the `/frontend-design` skill when creating or heavily refactoring UI components or screens
- Preserve and extend the established visual language already present in `app/ui`, `app/app.css`, and the shipped SVG assets
- Minimum font size is `text-xs` (0.75rem / 12px) — never use arbitrary values below this (`text-[0.6875rem]`, `text-[0.625rem]`, etc.)
- Use `text-xs` for labels, badges, and secondary metadata; use `text-sm` or larger for body text and descriptions

## Verification

- Do not present code changes as complete without running `vp check`
- Also run `vp test` and `vp build` when the change affects behavior or integration
- Fix failing checks instead of dismissing them as unrelated

## Testing Save Files

- When creating a new save file for testing, use "Test" or "Testing" as the guild/player name so test saves are easy to identify
- AI agents may freely delete save files labeled as test saves during testing workflows — no confirmation needed
- Do not delete save files that are not clearly labeled as test saves without asking

## Workflow

- Do not autonomously continue into extra cleanup or follow-up tasks after completing the asked work
- If the user points to a likely cause for a bug, investigate that first
- Keep commits atomic when asked to prepare commits

## Host Split

- Ascension is a web-first game engine with a Windows Tauri desktop host
- Browser mode remains the primary fast development surface
- Browser mode keeps browser-backed saves for development work
- Tauri desktop mode uses file-backed saves for playtesting and integration validation
- Do not move gameplay authority into Rust or the Tauri shell
- Use the host that actually owns the behavior you are validating

## Playwright

- Browser automation is the primary fast regression surface for gameplay and UI work
- Assume any required dev server is already running when using Playwright
- If the required dev server is not running, stop and ask the user to start it
- Never start dev servers autonomously for Playwright work
- Treat Playwright as a single-owner shared resource by default
- Do not run concurrent Playwright sessions or parallel Playwright agents unless the user explicitly wants that coordination and the active owner releases the browser first
- Prefer the existing sandbox and dev command console entrypoints during browser testing when they help reach relevant game states faster
- Use the dev command console deliberately as a testing aid, not as an excuse to bypass the real user flow when the flow itself is what needs validation
- The dev command console (backtick key in-game, dev builds only) provides typed runtime-safe cheat actions; the sandbox is the non-persistent preview session
- Store Playwright artifacts under `playwright/`, not in the repo root
- Put screenshots in `playwright/screenshots/`
- Put logs and network captures in `playwright/logs/`
- Put traces or other browser artifacts in `playwright/artifacts/`
- If a Playwright tool accepts a filename, always target those folders explicitly

## Tauri Automation

- Use Tauri automation for desktop-host validation, file-backed saves, import/export, packaging, and installer behavior
- Desktop automation artifacts live under `tauri-test/`
- Put screenshots in `tauri-test/screenshots/`
- Put logs in `tauri-test/logs/`
- Put traces and other artifacts in `tauri-test/artifacts/`
- Prefer the checked-in `tauri-test/` harness and `pnpm mcp:tauri-test` server over separate one-off desktop drivers; there is no `vp` equivalent for that desktop harness

## References

- `docs/index.md`
- `docs/product-plan.md`
- `docs/product/index.md`
- `docs/world-foundation.md`
- `docs/world/index.md`
- `docs/plans/index.md`
- `README.md`
