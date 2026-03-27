# AI Content Layer Plan

This is the last active implementation plan. It adds optional generative variety only after the deterministic game is accepted as complete enough to stand on its own.

## Run This Last

Do not start this plan until the base game is playable offline, enjoyable with AI disabled, and stable enough that structured payload contracts are unlikely to churn.

## Canon Inputs

Read these before making changes:

- `docs/roadmap.md`
- `docs/product/gameplay-systems.md`
- `docs/product/content-taxonomy.md`
- `docs/world/index.md`

## Locked Decisions

- Use the latest AI SDK v6 patterns, not the legacy object-generation helpers.
- Use Vercel AI Gateway as the single integration surface for model access and observability.
- Use `minimax/minimax-m2.7` for operator identity generation.
- Use `google/gemini-3-flash` for narrative incident framing and recap text.
- Support BYOK for shareable builds.
- Support a local dev-env key fallback for development only.
- Simulation chooses triggers, subjects, choices, numeric effects, and hidden modifiers.
- AI may phrase, assemble, or vary content on top of structured deterministic payloads.
- Fallback behavior is required. Failed AI output must never break a run.
- AI is optional at runtime and must be safe to disable before or during a campaign.

## SDK And Gateway Contract

Implementation rules:

- Use AI SDK v6 with `generateText` / `streamText` plus `Output.object()` or `Output.text()`.
- Do not build new work on `generateObject` or `streamObject`; those are legacy APIs.
- Default to the AI SDK integration path rather than raw provider SDKs because AI Gateway documents AI SDK as the recommended API for new projects.
- Authenticate through the Vercel AI Gateway key and keep model selection provider-agnostic at the call site.

Selection rules:

- Use `generateText` with `Output.object()` for non-interactive structured generation that must validate before use.
- Use `streamText` with `Output.object()` only when the UI materially benefits from partial structured output while it is being generated.
- Use `streamText` with `Output.text()` for interactive narrative copy that should render progressively to the player.
- Do not use streaming for operator generation unless a real product surface needs partial previews; partial structured output is not schema-valid until complete.

## Key And Transport Resolution Contract

This project currently has no gameplay backend. The first implementation path is direct client-to-Gateway access with strict local-development and BYOK rules.

Resolution order:

1. Explicit user-provided BYOK configuration
2. Local development env fallback
3. Disabled

Rules:

- Never commit a real key, sample key, or populated env file to the public repository.
- Never ship the local dev key in browser or desktop bundles that are shared with anyone else.
- The local dev key path is development-only and must be gated so it does not initialize in shared builds.
- BYOK is allowed because the user is providing their own key intentionally.
- If no valid key source is available, AI feature toggles stay disabled.
- The rest of the AI stack must depend on a resolved `AiCredentialSource` contract rather than reading env vars directly throughout the app.

Credential source kinds:

- `disabled`
- `user-byok`
- `local-dev-env`

## Storage Contract By Host

### Tauri Desktop

- Use native OS credential storage, not plain files and not save data.
- For the current Windows desktop host, store BYOK secrets in Windows Credential Manager through Tauri-side commands.
- Keep desktop secret storage outside the ECS, outside save snapshots, and outside exported save JSON.
- The desktop frontend should never receive the local dev env key unless the current build is a local development build.

### Browser

- Default browser BYOK mode is session-only in memory. This is the most secure browser-only option.
- Optional browser persistence must not store the key in plaintext.
- If the user chooses “remember my key”, store only passphrase-encrypted ciphertext plus metadata in browser storage.
- Use Web Crypto in a secure context for browser-side encryption and decryption.
- Prefer IndexedDB for persisted ciphertext storage rather than plaintext local storage.
- If the user does not set a passphrase for browser persistence, do not persist the key.

Browser security note:

- Browser-only storage is not equivalent to OS credential storage.
- Without a backend, the browser still communicates directly with the remote AI provider.
- Once unlocked for use, the key exists in client memory and can be exposed by malicious same-origin code, XSS, extensions, or local device compromise.
- Therefore browser BYOK is acceptable as a user choice, but it must be described as convenience with best-effort local protection, not as hard secret storage.

## Dev And Tooling Test Contract

The AI layer needs a pre-E2E test path. Do not require the full player-facing auto-trigger path to be live before AI features can be exercised.

Rules:

- Add explicit dev-mode triggers for AI generation through the existing in-game dev menu.
- Dev-mode triggers must work even when the player-facing AI setting is off.
- Dev-mode triggers are for targeted testing; they must not silently enable normal automatic AI behavior for the campaign.
- Keep one shared generation pipeline. Dev triggers, automatic runtime triggers, and isolated tooling should call the same backend generation functions and validation layer.
- Keep AI execution asynchronous. UI must show pending, success, and failure states without blocking the simulation loop.
- The ECS and runtime remain the authority for when gameplay-affecting content is consumed. An AI request may be in flight asynchronously, but writeback into runtime state must still go through one authoritative integration point.
- Dev-menu key management must not display stored secrets in plaintext once saved.

## ECS And Request-Lifecycle Contract

Avoid duplicate AI calls by making request state first-class.

Rules:

- Introduce a single runtime-owned AI request record keyed by a stable subject identity and generation purpose, for example `incident-framing:{incidentId}` or `operator-identity:{candidateId}`.
- Automatic triggers and dev-menu triggers must both consult the same request registry before starting a call.
- Request records must track at least:
  - request key
  - subject id
  - generation surface
  - trigger source: `auto`, `dev-menu`, or `tooling`
  - status: `idle`, `pending`, `succeeded`, `failed`
  - model id
  - payload version
  - started at / finished at
  - result reference or error reference
- If a valid result already exists for the current payload version, reuse it instead of re-requesting.
- If a request is already pending for the same key, additional triggers should subscribe to or reveal the existing request instead of launching another one.
- Only retry when the prior request failed, the payload version changed, or the user explicitly requested a regeneration action.
- Keep AI I/O outside pure ECS simulation steps. ECS can enqueue intent and consume validated results, but the network call itself should run in an async orchestration layer.

## Phase 1: Define Structured Payload Contracts

Owner: systems/design

Tasks:

1. Define the payload contracts for the first AI surfaces:
   - incident framing
   - operator identity assembly
2. Define exactly which fields AI may produce and which fields remain deterministic-only.
3. Include world-grounded tone inputs without giving AI authority over hidden gameplay state.
4. Define the exact output schemas with property descriptions, output names, and output descriptions so structured generation is strongly guided and validated.
5. Lock the call strategy per surface:
   - operator generation: `generateText` + `Output.object()` + `minimax/minimax-m2.7`
   - narrative event text: `streamText` or `generateText` depending on UX, using `google/gemini-3-flash`
6. Define the request keys, request statuses, cache or reuse rules, and regeneration rules for dev-mode, auto-mode, and tooling callers.
7. Define the `AiCredentialSource` and transport-resolution contract shared by browser, Tauri, dev menu, and tooling surfaces.

Done when:

- Every AI surface has a strict input and output contract with a documented authority boundary.

## Phase 2: Build Validation And Fallbacks

Owner: systems

Tasks:

1. Add schema validation, semantic validation, and quality gates.
2. Add fallback behavior for every failure path:
   - authored copy fallback
   - prefab assembly fallback
   - no-op or stock text fallback where appropriate
3. Ensure generated state is save-safe and replaceable.
4. Ensure request results are versioned so stale results can be invalidated without ambiguous reuse.

Done when:

- Repeated AI failures still leave the campaign playable.

## Phase 3: Build Dev-Mode Triggering And Async Orchestration

Owner: runtime/UI integration

Tasks:

1. Add explicit AI test actions to the existing dev menu for each shipped AI surface.
2. Allow those actions to trigger AI generation while the player-facing AI setting remains off.
3. Route dev-menu triggers through the shared request registry and generation pipeline.
4. Surface pending, success, failure, and regenerate states asynchronously in the dev UI.
5. Prevent duplicate calls when a dev-triggered request is already pending or has a reusable result.

Done when:

- AI features can be exercised deliberately before the full automatic player-facing trigger path is ready.

## Phase 4: Ship Runtime Settings And Persistence Rules

Owner: UI/gameplay integration

Tasks:

1. Add AI feature settings to the start screen and in-game settings.
2. Add BYOK management UI with separate host-aware behavior:
   - browser session-only key entry
   - browser optional remembered key via passphrase-encrypted storage
   - Tauri desktop key entry stored in native credential storage
3. Add explicit status surfaces:
   - no key configured
   - using user BYOK
   - using local dev env fallback
4. Define save behavior for AI-enabled and AI-disabled runs.
5. Define how dev-triggered results behave when the setting is off:
   - allow isolated testing
   - avoid unintentionally turning on automatic behavior
   - avoid duplicate future calls when the tested result is already reusable
6. Verify that toggling AI mid-campaign does not corrupt state or strand generated content in unusable formats.
7. Ensure AI settings never write secrets into save files, exported saves, logs, or ordinary debug snapshots.

Done when:

- AI behaves like an optional variation layer, not a runtime dependency.

## Phase 5: Add Isolated Playground And Viewer Surfaces

Owner: tooling/UI

Tasks:

1. Extend the SVG playground and asset viewer so operator generation can be tested in isolation from the campaign runtime.
2. Add a narrative-generation review surface in tooling so incident framing and recap generation can be tested without waiting for full in-game trigger conditions.
3. Reuse the same schemas, prompts, model routing, validation, and fallback logic used by runtime integration.
4. Keep tooling results clearly marked as isolated test artifacts unless explicitly promoted into approved content pools.
5. Support async request inspection in tooling:
   - payload preview
   - pending state
   - final result
   - validation failure
   - regenerate action
6. Support tooling-side key resolution without leaking secrets in screenshots, logs, or viewer exports.

Done when:

- Operator generation and narrative generation can be reviewed in isolation before full campaign integration is complete.

## Phase 6: Integrate One AI Surface At A Time

Owner: systems/content

Tasks:

1. Start with the lower-risk surface that is easiest to validate and fall back from.
2. Ship one surface to production quality before enabling the next one.
3. Keep reusable candidates behind human review before promoting them into approved authored pools.
4. After the first rollout is stable, add later allowed surfaces one at a time:
   - incident briefing and recap copy
   - operator identity packets
   - descriptive text for skills, items, and operators whose numeric payloads are already locked
5. Keep structured outputs narrow and versioned. Prefer small purpose-built schemas over one large polymorphic schema for every AI feature.

Done when:

- The first AI surface improves variety without obscuring debugging or balance.

## Phase 7: Failure And Offline Verification

Owner: QA

Tasks:

1. Verify fully offline play with AI disabled.
2. Verify repeated model-call failure during a live run.
3. Verify deterministic incident outcomes when phrasing varies.
4. Verify operator-generation compatibility with the prefab asset pipeline and save codec.
5. Verify that dev-mode triggers do not create duplicate automatic runtime calls later for the same subject and payload version.
6. Verify that isolated tooling calls do not mutate live campaign state unless explicitly wired to a runtime test action.
7. Verify that browser remembered-key storage contains only encrypted ciphertext and metadata, not plaintext keys.
8. Verify that Tauri desktop BYOK is stored through native credential storage and not through save data or plaintext app files.
9. Verify that local dev env fallback is unavailable in shared production-style builds.

Done when:

- AI can fail, be disabled, or be absent without damaging the campaign.

## Parallel Rules

- Phase 1 and research or prompt iteration may run before final implementation work.
- Do not enable multiple AI gameplay-adjacent surfaces at once during the first rollout.
- Do not use AI to invent unsupported assets, rank budgets, or numeric payloads.
- Do not use `streamText` by default just because it exists; choose streaming only when the user-facing experience benefits from partial output.
- Do not create one code path for dev-triggered AI and another separate code path for automatic runtime AI. Share the request registry, validation, and result-writeback contracts.
- Do not persist plaintext BYOK secrets in browser storage.
- Do not place secrets in save files, exported saves, or general-purpose diagnostics.

## Verification

- Run `vp check` after code changes.
- Run `vp test` and `vp build` when the change touches runtime behavior, saves, or app integration.
