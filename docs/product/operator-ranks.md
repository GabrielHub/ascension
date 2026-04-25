# Operator Rank Requirements

The pattern contract for **regular (non-unique) operator generation** across the F → A rank ladder. Defines stat envelopes, kit pool requirements, AI generation workflow, and visual escalation per rank.

Unique (`U`) operators are authored individually; their roster lives in a separate product doc (gated on the dungeons catalog).

Read [Content Taxonomy](./content-taxonomy.md) for tag/id formats. Read [Operators And Staff](../world/operators-and-staff.md) for canon (roles, traits, voice).

## Stat Envelope Per Rank

Stats are 1–99 across the board.

### Trainable Stats (STR / SPD / END / RES)

**Banded with overlap.** A well-trained low-rank can match an untrained higher-rank in raw stat value. This is intentional labor-market texture.

| Rank | Spawn Range (untrained baseline) | Max Trained Cap |
|---|---|---|
| F | 1–15 | 35 |
| E | 10–25 | 50 |
| D | 20–40 | 65 |
| C | 35–55 | 75 |
| B | 50–65 | 85 |
| A | 65–80 | 95 |
| U | authored, typically 80–99 | 99 |

Spawn ranges are the operator's untrained baseline at recruitment. Training inside the [Training](./rooms-catalog.md#training) room raises stats up to the rank's cap.

These are starting balance numbers. Final tuning lives in `rewrite/economy` and the seeded simulation harness.

### Fixed Stats (Intelligence, Perception)

**Soft-tied to rank** via a normal distribution per rank. Higher-rank operators *tend* to have higher Int/Perc, but with overlap — a "dumb A rank" exists in the lower tail of A's distribution; a "smart F" exists in the upper tail of F's. This is intentional.

| Rank | Mean (INT, PERC) | Std Dev |
|---|---|---|
| F | 25 | 12 |
| E | 30 | 12 |
| D | 40 | 14 |
| C | 50 | 15 |
| B | 60 | 15 |
| A | 70 | 16 |
| U | authored | — |

Sample from a normal distribution per rank, clamped to `[1, 99]`. Intelligence and Perception are sampled independently.

## Kit Pool Requirements

Combat packages (kits) are role-tagged and sub-flavor-tagged. Recruitment picks role first, then rank, then a kit from the matching pool. Duplicate kits across regular operators are allowed — two F-rank Field Leads with the same kit is fine.

### Sub-Flavor Coverage (All Ranks)

Every rank has all sub-flavors per role. Lower-rank kits are weaker versions of the same flavors; the player never loses access to a comp option due to recruitment rank.

| Role | Sub-Flavors |
|---|---|
| Field Lead | damage, frontline, rally |
| Scout | burst, debuff, hazard |
| Support | heal, mitigate, buff |

### Pool Sizing — Initial Minimum

Start with the minimum coverage that doesn't break recruitment variety. Expand later via parallel content sub-plans (`rewrite/operator-kit-expansion-c-rank`, etc.).

| Rank | Kits per (role × sub-flavor) | Total kits per rank | Notes |
|---|---|---|---|
| F | 1 | 9 (3 roles × 3 flavors) | Minimum coverage |
| E | 1 | 9 | Minimum coverage |
| D | 1 | 9 | Minimum coverage |
| C | 1 | 9 | Minimum coverage |
| B | 1 | 9 | Minimum coverage. **Mystical effects begin** at this rank. |
| A | 1 | 9 | Minimum coverage. **Mystical effects expand** at this rank. |
| U | authored individually per unique | varies | Each unique has 1 unique kit. |

Initial total: ~63 authored kits + per-unique kits. Higher-rank tiers (C, B, A) are expected to grow to 2–3 kits per (role × sub-flavor) over time as content sub-plans expand.

### Passive Availability

- **F, E, D:** no passive on regular kits.
- **C, B, A, U:** passive optional. Each kit declares whether it carries a passive.

This matches the locked rule for the rewrite's operator model.

## AI Generation Workflow

The workflow is **code-first, then prompt-driven against game content as examples.**

### Step-by-Step

1. **Code rolls rank.** Probabilistic table keyed on the recruitment room's current tier. Higher tiers shift the distribution toward higher ranks.
2. **Code rolls role.** Weighted toward whichever role the player's roster is short on; otherwise rotates evenly.
3. **Code rolls sub-flavor** within the (role × rank) kit pool. Equal weight by default.
4. **Code selects an example sample.** A small random sample of approved kits, portraits, chibis, and traits filtered by the rolled rank and role. The sample is the prompt's reference pool.
5. **Code passes a rank-and-role-specific system prompt** to the LLM, including the example sample.
6. **LLM generates** the operator: free name, persona summary, persona hooks, trait selections from the approved pool, kit selection from the rolled pool, portrait composition from approved appearance parts, chibi composition from approved parts.
7. **Code validates** the output against the schema and approved pools. Invalid output falls back to authored seed copy.
8. **Operator instantiates** in the recruitment room as a chibi visitor.

### The Examples Rule

- **Examples used in prompts are always actual in-game content.** Real authored kits, real authored portraits, real authored chibis, real traits.
- **Never fake examples in prompts.** No invented operators "for the prompt."
- **The example pool grows with the game.** When new authored kits ship, they automatically join the example pool for their (rank × role) bucket. Random sampling keeps every recruitment generation fresh.
- **Rank filters the pool.** F-rank prompts pull from F-bucket examples only. A-rank prompts pull from A-bucket examples only.

### What The LLM Decides

- **Name** (free generation, no pool — names should feel natural, NYC-rooted, not stereotypical, no joke names per [Content Rules](../world/content-rules.md)).
- **Persona summary** (free, ≤220 chars).
- **Persona hooks** (free, short personality bullets).
- **Trait selections** from the approved trait pool, filtered by rank.
- **Kit selection** from the (role × rank × sub-flavor) kit pool.
- **Portrait composition** from approved appearance parts, filtered by rank.
- **Chibi composition** from approved chibi parts, filtered by rank.

### What The LLM Never Decides

- Rank — code rolls.
- Role — code rolls.
- Sub-flavor — code rolls.
- Stat values — code rolls (using the envelope tables above).
- Whether a passive exists — kit data declares.
- Schema-validity — the LLM may not invent ids, parts, kits, or tags outside the approved pools.

## Visual Escalation Per Rank

Visual identity should climb visibly with rank. The current repo's SVG asset playground has authored examples that already scale in complexity from F → A. Use those as reference material only; the rewrite reuses the same scaling philosophy.

What scales by rank:

| Aspect | F (grounded) | E | D | C (specialized) | B | A (industry-famous) | U (singular) |
|---|---|---|---|---|---|---|---|
| Hair complexity / color | realistic, common cuts and natural colors | realistic, slight stylization | small color accent allowed | distinctive cut, mild non-natural color | bolder color, signature shape | exotic / signature, non-natural color expected | unique authored hair, possibly with effect |
| Clothing complexity | casual / practical / generic | slightly nicer practical | more deliberate practical kit | specialized / professional read | high-quality professional | signature professional look | one-of-a-kind authored clothing |
| Visible attunement effects | none | none | hint allowed (small accent) | mild visible (subtle glow on a feature) | clearer visible (small particle, glow patch) | obvious visible (signature effect) | full signature effect, may include unique animation |
| Personal details | none or one minor piece | one piece | up to two pieces | two pieces, one signature | three pieces, signature | signature detail set, recognizable | unique authored details |

The scaling should be **deliberate**. Do not jump F → A in a single visual leap. Rank steps should be readable when comparing two adjacent ranks side by side.

The asset playground (rebuild scope, see [Asset Pipeline Contract](./asset-pipeline.md)) must be able to compare per-rank examples side by side for authoring reference.

## Trait Pool Per Rank

Traits per operator follow the categories in [Operators And Staff](../world/operators-and-staff.md): Personality, Aptitude, Background, Condition, Earned.

- **Personality, Background, Condition** traits are mostly **rank-agnostic** — any operator at any rank can have them.
- **Aptitude** traits scale by rank — high-impact aptitudes (e.g. "Crack Shot," "Natural Leader") only appear at C+.
- **Earned** traits are stripped at recruitment for non-uniques (you earn them by surviving, not by recruitment). Authored uniques may ship with Earned traits already attached.

Trait counts per operator follow existing operator-template conventions (typically 2–4 traits per operator). Specific trait pools per rank are defined alongside kit content in `rewrite/combat-package-content-rewrite`.

## Recruitment Probability Table (Reference)

Progression-Tier owns the hard rank-band cap for recruitment. Recruitment room tier controls visitor capacity, cooldown, and the odds of rolling the highest currently unlocked rank within that PT band; it cannot roll above the current PT band. Tier-to-rank percentages are balance content (lives in `rewrite/economy` for tuning), but the structural shape is:

| PT Level | Rank Distribution |
|---|---|
| T1 | mostly F, rare E |
| T2 | F-E heavy, rare D |
| T3 | E-D heavy, rare C |
| T4 | D-C heavy, rare B |
| T5 | C-B heavy, rare A |
| T6 | B-A only, weighted by Recruitment tier |

Specific percentages live in the economy balance tables, not here. This doc defines the structural max-rank reachable per PT band. Recruitment tier shifts the odds toward the top of the allowed band.

## Cross-Doc References

- Operator model implementation: `rewrite/operator-model`
- Combat package shape and role tagging: `rewrite/combat-package-content-rewrite`
- Recruitment loop: [Rooms Catalog](./rooms-catalog.md#recruitment) and `rewrite/recruitment-loop`
- Operator canon (traits, voice, names): [Operators And Staff](../world/operators-and-staff.md), [Content Rules](../world/content-rules.md)
- AI generation surfaces: `rewrite/ai-surfaces` — `operator-identity` is the surface this workflow runs on
- Asset escalation reference: current repo SVG playground as reference material only (chibi part complexity ladder)
