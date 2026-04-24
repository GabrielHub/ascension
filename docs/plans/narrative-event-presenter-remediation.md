# Narrative Event Presenter Remediation

Agent-actionable plan for tightening the narrative-event presentation contract so every narrative beat, including AI-phrased ones, is always delivered by an explicit presenter with the correct domain voice.

This is a remediation pass on top of already-shipped guidance, interruption, relocation, and AI framing systems. It does not introduce a new narrative authority layer. ECS and authored content still own triggers, choices, outcomes, and progression. This plan only fixes who presents those beats and how presenter-specific prose is enforced.

---

## 1. Sequencing

- [ ] Do not start this pass until the remaining skyscraper expansion-floor consequence slices are shipped: Nightlife recruitment, Specialist Training role-specific training, and Penthouse A-rank recruitment.
- [ ] Start this pass before any broader AI narrative-breadth work. Presenter ownership and tone must be corrected before adding more generated narrative surfaces.
- [ ] Treat this as the next content-governance cleanup after the current skyscraper stack, not as a competing parallel initiative.

Rationale:

- The remaining skyscraper slices still add authoritative room and pressure content that may create new narrative beats.
- Presenter remediation should land once that content surface is stable enough to audit in one pass.
- AI incident/event breadth should not expand while the current prompt path still writes in a mostly presenter-agnostic house voice.

---

## 2. Problem Statement

The canon contract already says presenters are feature-domain voices, not building-locked narrators, and that tutorial events, guide events, interruption modals, and incident briefings should name a presenter explicitly or inherit a clear fallback. The shipped runtime only partially enforces that.

Current gaps to remediate:

- [ ] Incident templates still permit missing `presenterId` / `presenterExpression`.
- [ ] Runtime incident materialization still falls back too broadly to the assistant instead of requiring the domain-correct presenter.
- [ ] AI incident framing payloads do not carry presenter identity, presenter voice rules, or presenter-specific tone instructions.
- [ ] Generated incident copy therefore defaults to a generic institutional register instead of dynamically shifting with the presenter.
- [ ] There is no repo-level audit proving that every narrative surface, authored or AI-assisted, is presenter-bound.

This is the correction:

- [ ] Every narrative event must resolve to a presenter before it reaches the player.
- [ ] Assistant remains the fallback only for true operations / contract / staffing / relocation continuity beats, not as a blanket default for unresolved incidents.
- [ ] AI-written narrative copy must receive the same presenter contract the authored path uses, and must shift prose accordingly.

---

## 3. Target Contract

### 3.1 Core Rule

- [ ] Every narrative presentation surface resolves a presenter before rendering.
- [ ] In-scope surfaces: guidance beats, blocking briefings, interruption-backed incidents, relocation framing, boss-commitment narration, AI-generated incident framing, and any future AI recap / briefing surface.
- [ ] No shipped narrative event may surface as anonymous narrator copy.

### 3.2 Authority Boundary

- [ ] Simulation remains authoritative for triggers, choice availability, deterministic effect bundles, and outcome application.
- [ ] Content/templates remain authoritative for authored event identity and preferred presenter ownership.
- [ ] Presenter selection is a presentation/content contract layered on top of that authority, not a gameplay-authority rewrite.
- [ ] AI may vary phrasing only after presenter selection is already resolved.

### 3.3 Presenter Resolution Rule

Use this precedence order:

1. [ ] Explicit authored `presenterId` on the beat/template.
2. [ ] Deterministic runtime presenter resolver keyed by cause domain when explicit binding is absent during migration.
3. [ ] Assistant fallback only when the resolved cause domain is truly general operations / contracts / staffing / relocation continuity.
4. [ ] Validation failure for any shipped authored narrative surface that still depends on an ambiguous catch-all fallback after remediation is complete.

### 3.4 Presenter Ownership Contract

- [ ] `presenter/assistant` owns contracts, staffing, operations, fallback campaign guidance, and relocation continuity.
- [ ] `presenter/cook` owns hospitality, food quality, comfort-first recovery, and kitchen-adjacent rooms/incidents.
- [ ] `presenter/bartender` owns recruitment reads, front-of-house pressure, nightlife, and public-facing social beats.
- [ ] `presenter/vicente-ortega` owns gear readiness, loot triage, manual selling, loot-filter teaching, stock flow, and workshop/fabrication.
- [ ] `presenter/dr-june-park` owns injury, treatment, recovery, infirmary/trauma support, and post-mission medical consequence beats.
- [ ] `presenter/compliance-officer` owns compliance, policy, regulator-facing paperwork, institutional pressure, and executive-floor consequence beats.

When domains overlap:

- [ ] Bind the presenter whose system domain caused the beat to surface, not the one nearest in building space.
- [ ] Do not let building tier override feature ownership.
- [ ] Do not let AI choose the presenter.

---

## 4. Presenter Tone Contract

The presenter system is not only portrait selection. The prose must shift with the presenter.

- [ ] Mara writes in dry, composed, efficient operational framing.
- [ ] Rafi writes in blunt, tired, protective hospitality/recovery framing.
- [ ] Sloane writes in cool, observational, front-of-house social framing.
- [ ] Vicente writes in fast, technical, teen-prodigy quartermaster framing in comedy mode, then drops the bits under real danger.
- [ ] June writes in clinical, direct, economical medical framing with concrete bodily consequences and timelines.
- [ ] Laura writes in precise, controlled, institutional/regulator-facing framing.

Tone rules:

- [ ] Comedy-vs-tragedy modulation still applies across all presenters.
- [ ] Presenter-specific voice sits underneath the world tone, never outside it.
- [ ] Generated copy must not flatten every presenter into the same house voice.
- [ ] Generated copy must not exaggerate presenter gimmicks into caricature.

---

## 5. Implementation Plan

### Phase 0 - Audit And Coverage Map

- [ ] Inventory every narrative surface that can currently render copy:
      guidance beats, interruption incidents, relocation flows, boss commitment, authored event briefings, and the shipped AI `incident-framing` surface.
- [ ] Record for each surface: source file/data owner, current presenter behavior, whether presenter binding is explicit or implicit, whether AI is involved, and whether the current voice is domain-correct.
- [ ] Produce a machine-checkable coverage artifact or test input list so the repo can prove every shipped narrative path has a presenter.
- [ ] Flag every incident template currently using assistant by habit rather than domain fit.

Exit criteria:

- [ ] The repo has a finite audited list of narrative surfaces.
- [ ] We know which surfaces are content debt, which are schema debt, and which are runtime fallback debt.

### Phase 1 - Tighten The Data And Runtime Contract

- [ ] Require presenter resolution for incident/interruption payload creation.
- [ ] Add or formalize a deterministic presenter resolver for migration coverage. It should key off trigger family, incident category, preferred room, pressure tags, and bound context.
- [ ] Keep explicit authored presenter bindings on bespoke beats and templates as the preferred path.
- [ ] Stop silently converting unresolved beats into assistant-presented copy unless the resolver classifies them as true assistant-domain beats.
- [ ] Ensure generated incident presentation uses the resolved presenter from the pending incident/template instead of recomputing a weaker fallback later in the runtime path.

Recommended implementation stance:

- [ ] Explicit presenter binding for authored guidance, relocation, boss commitment, and bespoke incident templates.
- [ ] Deterministic resolver only as migration support and for future system-generated beats that are intentionally domain-derived.
- [ ] Validation should eventually reject new authored incident templates without either an explicit presenter or a resolver-approved domain tag.

Exit criteria:

- [ ] No narrative event reaches the UI without a resolved presenter.
- [ ] Assistant defaulting is narrowed to genuine assistant-domain cases.

### Phase 2 - AI Prompt Remediation

- [ ] Extend the incident framing payload with presenter metadata.
- [ ] Minimum presenter payload: `presenterId`, presenter name, presenter role/domain summary, presenter voice brief, and current tone mode if tragedy/comedy pressure is already known.
- [ ] Add presenter-specific prompt grounding beside the shared world canon.
- [ ] Update the incident system prompt so the model is told to write in the resolved presenter's prose, not just the global house register.
- [ ] Preserve the current authority boundary: the presenter affects phrasing only, never choice legality or deterministic effects.
- [ ] Keep the JSON output contract unchanged unless a specific presenter field must be echoed for validation/debugging.

Prompting rules:

- [ ] Shared canon stays global and stable.
- [ ] Presenter addendum is injected dynamically from the resolved presenter.
- [ ] Presenter addendum includes both positive voice instructions and anti-drift rules so Mara does not sound like Laura, Laura does not sound like June, and Vicente does not leak slang into tragedy beats.
- [ ] AI-disabled or failed-generation paths still surface the same resolved presenter through authored copy.

Exit criteria:

- [ ] Generated incident copy changes register by presenter while staying within world tone.
- [ ] The AI path and authored fallback path agree on who is presenting.

### Phase 3 - Content Migration

- [ ] Rebind legacy incident templates to the correct presenters where the current assistant default is wrong.
- [ ] Review all kitchen, hospitality, recovery-through-comfort, workshop, loot, recruitment, nightlife, medical, and compliance/event-pressure incidents against the ownership matrix.
- [ ] Review skyscraper-specific institutional beats to ensure Laura, not Mara, fronts regulator/institution consequences unless the beat is truly operations continuity.
- [ ] Review bodega and Porter's narrative events so domain presenters persist cleanly across buildings.
- [ ] Ensure future content authoring guidance says "pick the causing domain presenter" instead of "pick the room/building presenter."

Exit criteria:

- [ ] Shipped authored incidents no longer rely on a broad assistant catch-all.
- [ ] Domain ownership reads consistently across bodega, Porter's, and skyscraper.

### Phase 4 - Validation And Tooling

- [ ] Add tests that fail when a shipped narrative event surface lacks presenter resolution.
- [ ] Add tests for incident payload building so AI framing payloads include presenter metadata.
- [ ] Add tests for incident materialization so generated and authored paths preserve the same presenter id/expression.
- [ ] Add prompt tests proving presenter instructions are injected for AI incident framing.
- [ ] Add at least one fixture per presenter to catch voice drift in prompt/eval review.
- [ ] If a coverage table is checked in, derive it from source data rather than maintaining a second handwritten inventory.

Exit criteria:

- [ ] Presenter binding is enforced by tests rather than memory.
- [ ] AI prompt regressions are visible before they ship.

---

## 6. Recommended Resolver Shape

Do not make presenter choice purely room-driven or purely template-name-driven. Use a narrow deterministic resolver with explicit precedence:

1. [ ] Explicit template/beat presenter.
2. [ ] Trigger-family mapping.
3. [ ] Room-family override where the room is the actual cause domain.
4. [ ] Pressure-tag / faction / compliance override for institutional beats.
5. [ ] Assistant only for unresolved true-operations continuity.

Starter mapping direction:

- [ ] `contract_pressure` -> assistant unless the pressure is explicitly regulator/compliance-facing, then compliance officer.
- [ ] `operator_conflict` -> bartender for public/front-of-house social reads, doctor for medically consequential fallout, assistant otherwise.
- [ ] `injury_setback` and `casualty_aftermath` -> doctor.
- [ ] `room_breakdown` -> cook for kitchen/hospitality rooms, quartermaster for workshop/gear/logistics rooms, doctor for infirmary/trauma rooms, assistant otherwise.
- [ ] `workshop_disruption` -> quartermaster.
- [ ] recruitment/nightlife social pressure -> bartender.
- [ ] `compliance_pressure`, regulator scrutiny, borough hearings, sponsor prestige tied to institutional visibility -> compliance officer.
- [ ] comfort-first recovery incidents with no medical consequence -> cook.

This mapping is intentionally conservative. Prefer explicit content bindings wherever ambiguity would otherwise remain.

---

## 7. Out Of Scope

- [ ] Adding new presenter characters.
- [ ] Rewriting deterministic incident choice bundles or gameplay effects.
- [ ] Moving gameplay authority into UI, prompt code, or AI output.
- [ ] Broad new AI narrative surfaces before this presenter contract is stable.
- [ ] Re-authoring the entire world tone guide.

---

## 8. Verification

Do not report this pass complete without:

- [ ] `vp check`
- [ ] `vp test`
- [ ] `vp build`

And explicit coverage for:

- [ ] at least one authored incident per presenter
- [ ] at least one AI-generated incident per presenter fixture
- [ ] authored fallback when AI is disabled
- [ ] relocation continuity still owned by the assistant
- [ ] skyscraper compliance/institutional beats fronted by the compliance officer
- [ ] workshop/loot/manual-sell teaching beats fronted by the quartermaster

---

## 9. Deliverables

- [ ] This checked-in plan.
- [ ] A presenter-coverage audit for all shipped narrative event surfaces.
- [ ] Tightened incident/presentation contracts so every narrative beat resolves a presenter.
- [ ] Presenter-aware AI incident prompting with dynamic voice instructions.
- [ ] Tests preventing presenterless narrative events and presenter-agnostic AI prompts from regressing.

---

## 10. Completion Definition

This remediation is complete when all of the following are true:

- [ ] Every shipped narrative event surface resolves to a presenter before render.
- [ ] Assistant is no longer a broad hidden fallback for unrelated domains.
- [ ] AI incident framing receives presenter metadata and dynamically shifts voice by presenter.
- [ ] Authored and generated versions of the same beat agree on presenter ownership.
- [ ] The six-presenter domain contract is consistently enforced across bodega, Porter's, and skyscraper content.
- [ ] Tests fail if future narrative content ships without presenter coverage.
