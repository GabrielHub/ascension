# Operators And Staff

The guild employs two fundamentally different kinds of people: **operators** (superhumans who go into dungeons) and **staff** (regular humans who keep the guild running).

## Operators

Operators are attuned individuals who do the dangerous work. They are the core asset the player manages and the primary recruitment target.

### Identity

Every operator is a deliberately authored person with:

- A full name
- A visual identity assembled from modular parts (head shape, hair, eyes, face details, body silhouette)
- A rank (F through S) reflecting attunement intensity
- An attunement that shapes how they operate in the field
- A recognizable field role
- A personality expressed through preferences and behavioral tendencies
- Traits that add flavor and influence behavior

Operators should read as authored people first. Their humor comes from personality, voice, and the specific ways they fit or fail to fit inside the guild, not from gimmicks, rarity framing, or interchangeable archetype shells.

### Traits

Traits are persistent descriptors attached to operators that influence behavior, capability, and narrative flavor.

| Category    | Examples                                                              | Content Use                                  |
| ----------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Personality | Cautious, Reckless, Gregarious, Loner, Drama Queen, Workaholic        | Preferences, social friction, office comedy  |
| Aptitude    | Quick Learner, Natural Leader, Crack Shot, Glass Cannon               | Capability, style, role emphasis             |
| Background  | Former Cop, Street Kid, EMT, College Dropout, Trust Fund, Ex-Military | Flavor, dialogue tone, recruitment context   |
| Condition   | Scarred, Chronic Pain, Insomnia, Night Owl                            | Limits, habits, visual and narrative texture |
| Earned      | Veteran, Survivor, Boss Killer, Team Player, Last One Standing        | What the operator has lived through          |

Traits should be specific enough to create strong voice, clear social friction, and meaningful authored identity. Personality traits drive the workplace comedy. Background and earned traits ground operators in the world and in the consequences of what they have lived through.

## Staff

Staff are non-attuned people hired to run the guild's non-combat operations. They are not operators. They do not go into dungeons.

**Staff have individual personality, morale, and loyalty.** They are part of the office comedy. The receptionist has opinions. The logistics person holds grudges. The admin is passive-aggressive about the printer. Staff are authored people with names and personality, not faceless upgrade slots.

Staff roles are organizational, not combat:

| Function       | Description                                                 |
| -------------- | ----------------------------------------------------------- |
| Reception      | Front desk, visitor management, public-facing operations    |
| Logistics      | Supply management, equipment maintenance, resource movement |
| Maintenance    | Building upkeep, room repairs, facility management          |
| Medical        | Non-field medical care, recovery support, injury treatment  |
| Administrative | Paperwork, compliance, scheduling                           |

Staff are the infrastructure that lets operators focus on the dangerous work. Think of them as the guild's support team - the receptionist who handles walk-ins, the logistics person who makes sure the gear is maintained, the admin who files the paperwork so the city does not shut you down. They have traits, preferences, and opinions about everything, and they will let the player know.

### Narrative Presenters

Some staff and support characters serve as recurring narrative presenters in interruption modals, guidance beats, and event briefings. Presenter characters are not required to be simulation staff roles. Presenter status is a narrative and presentation role, not a separate gameplay-authority layer — the simulation still owns the event, the choices, and the outcomes.

**Presenters are feature-domain voices, not building-locked.** Each presenter owns an area of the guild's operation and appears wherever that domain is the right voice — bodega, Porter's, skyscraper, or in-between. They are recurring narrative anchors for long-running guidance, not one-off flavor characters.

Every tutorial event, guide event, interruption modal, and incident briefing must name a presenter explicitly or inherit a clear fallback. Never default to anonymous narrator copy.

#### Presenter Roster

Six recurring presenters anchor the game's guidance and narrative interruption surface. Each is a deliberately authored person with specific NYC grounding. Treat them as real employees whose voice must stay consistent across the bodega, Porter's, and skyscraper bands.

**Mara Cordero** — `presenter/assistant`

- Domain: operations, staffing, paperwork, management, fallback operational briefings.
- Canon: late 20s to early 30s Afro-Latina guild assistant, composed and quick, carries the look of someone who has been keeping a chaotic operation functioning for months.
- Voice: dry, composed, efficient. Treats supernatural disaster like bad paperwork. Short sentences. Wry rather than warm. Default mode: _"Here is what we need to do next."_

**Rafi Alvarez** — `presenter/cook`

- Domain: hospitality, food quality, kitchen pressure, morale-through-hospitality, kitchen-adjacent consequence beats.
- Canon: early 30s Puerto Rican line cook and kitchen lead, broad-shouldered, tired eyes, the kind of person who can keep service moving while glaring holes through everyone in the room.
- Voice: blunt, tired, protective. Clipped statements. Dry humor under fatigue. Default mode: _"Your people need to eat, or they'll make mistakes out there."_

**Sloane Becker** — `presenter/bartender`

- Domain: recruitment reads, front-of-house social pressure, nightlife and public-facing / regular-pressure beats.
- Canon: late 20s front-of-house closer and bartender, ash-blonde with pale mint accents, upscale nightlife polish pushed through Porter's rough edges.
- Voice: cool, observational, unsentimental. Speaks with economy. Sharp when she wants to be; never raises her voice. Default mode: _"I watched them walk in. Here is what I saw."_

**Vicente Ortega** — `presenter/vicente-ortega`

- Domain: gear readiness, loot triage, inventory flow, stock pressure, workshop and fabrication, practical field-prep beats.
- Canon: 18, Filipino-American, Queens-raised (Woodside). The guild's quartermaster. Specialized-high-school kid who posted viral gear-breakdown videos at 14 and deferred college because an underpaid guild recruiter DM'd him. Genuinely elite gear brain. His mom is not thrilled. His workshop is the cleanest room in the building and also looks like a teenage bedroom.
- Voice: fast-talking terminally-online teen-prodigy register. Mock-formal that collapses into casual. Absurd metaphors. Sincerity hidden behind ironic distance. Pettiness about broken straps treated as drama. Default mode: _"okay so. okay. look at this."_ **Drops register entirely when operators are injured or in danger — clipped, fast, focused, no bits.** That switch is the character. Describe the register in canon content; do not codify specific current slang (ages in months).

**Dr. June Park** — `presenter/dr-june-park`

- Domain: injury, recovery, treatment, infirmary and trauma support, post-mission medical consequence beats.
- Canon: 34, Korean-American, Flushing-raised. NYU undergrad, Mount Sinai residency, trauma fellowship. Left hospital medicine after she watched rift-injury patients get mishandled in triage for two years straight and decided the industry needed real medical infrastructure. Her parents think she is wasting her degree.
- Voice: clinical, direct, economical, with a dry exasperated edge. Leads with assessment, then implication. Uses specific medical terms and concrete timelines. Will not soft-pedal. Sighs through her nose instead of raising her voice. Keeps a mental leaderboard of which operators lie about pain, and will rat them out to the player. Default mode: _"Tell me what happened. Then I'll tell you how bad it is."_ Warmth is present but underneath the clinical; deadpan is her comedy mode.
- Portrait status: the approved asset family now lives under `public/data/presenters/medical/`. `neutral` is the cast anchor and the current `concerned`, `serious`, and `amused` variants are approved descendants of that neutral, not of any discarded earlier pass.

**Laura Bennett** — `presenter/compliance-officer`

- Domain: compliance, policy, regulator-facing paperwork, institutional pressure, executive-floor tone, and "the city is watching" consequence beats.
- Canon: 41, white American, Long Island-raised. Former city compliance officer who spent six years auditing licensed guilds, quit after deciding most of the regulator stack was punishing disorganization instead of reducing harm, and now sells that knowledge to the kind of guild willing to listen. Dresses like she has somewhere better to be and always looks faintly unimpressed by the room.
- Voice: precise, controlled, professionally merciless. Explains pressure in institutional terms rather than emotional ones. The city's demands become legible when she talks. She does not posture, does not rant, and does not raise her voice. Her comedy mode is immaculate disdain directed at preventable paperwork disasters. Default mode: _"This is not a crisis yet. It becomes one if we ignore it."_

#### Presenter Tone Rules

- Every presenter is a recurring authored person, not an anonymous narrator. Copy that reads as generic feature-prompt text is off-voice.
- Presenter humor comes from personality, workplace friction, and specific voice — not from fourth-wall breaks, genre parody, or one-liner jokes pasted onto mechanical descriptions.
- Presenter register follows the world's comedy-tragedy axis. Default mode is workplace comedy under supernatural pressure. When an operator is injured, a raid fails, or a character dies, every presenter's humor recedes.
- Do not lock a presenter to one building. Presenters persist across bodega, Porter's, and skyscraper wherever their feature domain is the right voice.
- When two domains overlap (Rafi and Sloane both on Porter's morale; Vicente and June both on a bad raid return; Mara and Laura both on paperwork pressure), pick the presenter whose domain _caused_ the beat to surface, not the one nearest in space.
- Vicente's brainrot register and June's clinical deadpan are load-bearing only in comedy mode. In tragedy mode they are simply competent and direct, like the rest of the cast.

#### Presenter Feature Ownership Contract

Use this as the implementation-facing default when binding presenters to tutorial events, guide events, interruption modals, and incident briefings. This is a feature-ownership contract, not a hard ban on overlap. When in doubt, use the presenter whose domain most directly caused the beat to surface.

**Mara Cordero** owns:

- contracts, bidding, result review, and general operations framing
- staffing basics, assignment, management pressure, and fallback "what do we do next" guidance
- room / upgrade explanation when no more specific domain presenter is the better fit
- relocation handoff framing and broad campaign continuity

**Rafi Alvarez** owns:

- hospitality and food-quality systems
- recovery-through-comfort beats where the emphasis is care, morale, meal quality, or service pressure rather than medicine
- kitchen-adjacent rooms, upgrades, and incidents

**Sloane Becker** owns:

- recruitment reads and public-facing intake pressure
- bar, nightlife, regulars, and front-of-house social pressure
- social-atmosphere beats where the issue is who walked in, what they want, and how the room reads them

**Vicente Ortega** owns:

- gear readiness, loadouts, and field-prep explanation
- loot triage, manual selling, loot-filter teaching, and inventory cleanup
- stock pressure, supply flow, workshop / fabrication, and recipe-material-readiness beats

**Dr. June Park** owns:

- injuries, recovery, treatment, and medical consequence explanation
- infirmary / trauma-bay / medical-room unlocks, upgrades, and incidents
- post-mission "can this roster keep going" beats where the issue is actual bodily cost rather than general comfort

**Laura Bennett** owns:

- compliance, policy, licensing, and regulator-facing paperwork
- city / faction / institutional pressure when the emphasis is oversight, scrutiny, consequences, and executive-floor expectations
- skyscraper A-rank institutionalization beats where the guild starts being treated like an organization the city and sponsors can formally judge

#### Presenter Portrait Style And Generation Process

Presenter portrait art uses the locked visual language defined in [`docs/product/image-generation-prompting-guide.md`](../product/image-generation-prompting-guide.md): modern Korean action-webtoon portrait art with grounded NYC supernatural-labor styling, the shipped presenter-roster portrait canvas (approximately `1024x1536` / `2:3`), plain warm-white background, and a single-house-style rendering discipline. Read the full style spec there before authoring or regenerating any presenter portrait.

Each presenter ships four expressions (`neutral`, `concerned`, `serious`, `amused`). To keep identity and style consistent across all four, generate in this order:

1. **Generate `neutral` first**, using the current family workflow:
   - **Ref 1 — style anchor.** For a presenter-family reset, this is the approved external style board that locks linework, shading, color logic, and character structure.
   - **Ref 2 — cast anchor.** Only use a project portrait once an approved neutral already exists. Do not chain a fresh reset to stale legacy presenter art.
2. **Approve the neutral** against the canon brief and preserve list before generating variants.
3. **Generate `concerned`, `serious`, and `amused`** using the approved neutral as the reference image. Only the expression and minor posture change. Everything on the preserve list stays identical.
4. **Record** the winning prompt and preserve list in the character's `PresenterTemplate` in [`content/templates/presenters.ts`](../../content/templates/presenters.ts).

Prompt text does identity work (who, age, ethnicity, costume, composition, constraints). Do not pile style adjectives into the prompt when Ref 1 is present — they fight the reference and drift the result off-style. Review for single-artist consistency: if shoes, props, hair, or hardware look more digitally rendered than the face and clothes, reject the asset.
