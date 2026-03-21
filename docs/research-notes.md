# Research Notes

This file captures the source-backed adjustments that informed the revised plan.

## Researched Decisions

| Topic                   | Recommendation                                                                                             | Why                                                                                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite baseline           | Use `Vite+` as the unified toolchain. Keep standard Vite 8 as the documented fallback.                     | `Vite+` is alpha (v0.1.x) as of March 2026. It bundles Vite 8, Oxlint, Oxfmt, tsgolint, Vitest, and Rolldown under one CLI (`vp`). Vite 8 is the current stable standalone release if rollback is needed. |
| Routing layer           | Use React Router 7 as light client-side shell routing.                                                     | The project needs app navigation, not a full-stack framework architecture. Keep routing focused on shell transitions rather than gameplay ownership.                                                      |
| AI Gateway usage        | AI SDK + AI Gateway is valid without Next.js. For this project, local env usage is an acceptable baseline. | Current AI SDK docs show direct `AI_GATEWAY_API_KEY` or `createGateway({ apiKey })` usage with no Next.js requirement.                                                                                    |
| Runtime hosted AI       | Keep it optional for gameplay-critical flows.                                                              | The core loop does not need remote inference, and optional runtime AI reduces operational and UX risk.                                                                                                    |
| SVG generation strategy | Prefer pre-generated modular SVG parts over on-demand full-character SVG generation.                       | Better fit for cheap runtime models, stronger style control, easier validation, and lower in-session cost.                                                                                                |
| Content authoring       | Prefer TypeScript-authored gameplay definitions over JSON for the initial architecture.                    | This project's abstractions are still evolving, and TypeScript gives stronger refactor safety and validation for a solo developer.                                                                        |
| Save layer              | Prefer `idb` over `idb-keyval` if save slots gain metadata, migration, or indexing needs.                  | `idb-keyval` is intentionally tiny and only a key/value wrapper; even its own README points to `idb` for more complex usage.                                                                              |
| `bitECS`                | Keep it for simulation.                                                                                    | The library is still positioned as minimal, data-oriented, lightweight, and includes serialization support.                                                                                               |
| `easystarjs`            | Acceptable for early pathfinding, but wrap it.                                                             | It remains a small asynchronous A\* library intended for browser game use.                                                                                                                                |
| `@tweenjs/tween.js`     | Acceptable for event polish, not as a general animation architecture.                                      | It is intentionally narrow and does not own the animation loop, which makes it easy to integrate sparingly.                                                                                               |

## Sources

### Vite and Vite+

- [Vite+ guide](https://viteplus.dev/guide)
- [Vite+ GitHub](https://github.com/voidzero-dev/vite-plus)
- [Vite blog index](https://vite.dev/blog)

### Routing

- [React Router docs](https://reactrouter.com/home)
- [React Router modes](https://reactrouter.com/start/modes)

### Vercel AI SDK and AI Gateway

- [AI Gateway provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway)
- [Choosing a provider](https://ai-sdk.dev/docs/getting-started/choosing-a-provider)
- [Node.js getting started](https://ai-sdk.dev/docs/getting-started/nodejs)
- [AI Gateway Anthropic compatibility](https://vercel.com/docs/ai-gateway/anthropic-compat)
- [AI Gateway BYOK](https://vercel.com/docs/ai-gateway/authentication-and-byok/byok)
- [Browser AI community provider](https://ai-sdk.dev/providers/community-providers/browser-ai)

### Libraries

- [bitECS README](https://github.com/NateTheGreatt/bitECS)
- [EasyStar.js README](https://github.com/prettymuchbryce/easystarjs)
- [tween.js README](https://github.com/tweenjs/tween.js)
- [idb-keyval README](https://github.com/jakearchibald/idb-keyval)

## Interpretation Notes

### On `Vite+`

`Vite+` is a unified toolchain by VoidZero that wraps Vite 8, Oxlint, Oxfmt, tsgolint, Vitest, and Rolldown under a single `vp` CLI. It is alpha (v0.1.x as of March 2026) but actively maintained by the Vite core team. The fallback path to standard Vite 8 + ESLint + Prettier is straightforward since `Vite+` wraps Vite itself.

### On Routing

The project needs app-shell routing, not a server-oriented framework. The current recommendation is:

- bootstrap with `Vite+` and React
- add React Router as a library dependency
- use it for start screen, save management, and game-shell transitions
- keep simulation ownership inside ECS, not in the router

### On AI Gateway

Your correction is valid: AI SDK and AI Gateway do not require Next.js integration, and local environment variable usage is documented directly. The revised docs therefore keep AI Gateway in the plan.

The narrower recommendation is operational:

- local and tooling use is straightforward
- for a personal local-first project, direct local usage is a reasonable default
- the public GitHub repo constraint mainly means secrets stay out of version control
- runtime AI should still be optional for the core gameplay loop

### On SVG Generation

The earlier draft leaned too hard on full SVG generation. The modular parts direction is better:

- use stronger models offline to build a large library of reusable visual parts
- validate and curate those parts once
- let runtime generation operate on text and structured choices
- assemble the final character locally from approved pieces

### On Content Definitions

The plan now assumes a clear split between:

- authored templates in TypeScript
- ECS instances in runtime state
- systems that interpret generic requirements and effects

That is the right shape for this project because it keeps the architecture extensible without committing too early to external data formats.

### On Feature-Gap Priorities

The current plan treats these as active infrastructure, not later garnish:

- reputation-driven external pressure
- chained system consequences
- an event or storyteller skeleton with hardcoded definitions first
- loyalty as a real long-term operator state layered on top of morale
- a small but extensible mission-definition model

The plan explicitly does not treat AI-generated portraits, scene art, or runtime narrative generation as first-playable requirements.

### On Persistence

The original `idb-keyval` choice is good only if saves stay extremely simple. The moment the project wants slot previews, schema upgrades, last-played timestamps, or any structured indexing, `idb` becomes the cleaner base.

## Open Questions

These are the design questions still worth arguing about before implementation accelerates:

1. Which gear categories beyond weapon, outfit, and one accessory should be added first after MVP?
2. How much authored variation should exist between buildings of the same phase before the project starts overbuilding content breadth?
3. When weekly AI narrative reports are added later, how much editorial control should the player have over tone and format?
4. How much memorialization or long-term history UI should exist for dead operators in the first major post-MVP iteration?
