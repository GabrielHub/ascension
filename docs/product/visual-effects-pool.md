# Visual Effects Pool

The enumerated VFX library used across operator and boss combat. **5 effects, fixed for initial scope.** Every operator basic chain stage, operator ultimate, weapon attack, and boss attack maps to exactly one of these 5 effects.

VFX is **code, not assets.** Implemented as CSS + Framer Motion + React components, overlaid on portrait cards in live-card boss encounters. See [Asset Pipeline Contract](./asset-pipeline.md) for the asset-vs-code split.

This doc enumerates the initial combat VFX pool for the rewrite.

## The 5 Effects

| # | Effect | Visual character | Maps to attack type | Base palette |
|---|---|---|---|---|
| 1 | **Strike** | Quick flash + impact frame, short percussive | Close-range melee single-target (punch, jab, baton tap) | silver impact |
| 2 | **Slash** | Directional arc sweep, slightly longer than Strike | Melee cleave / sword-style / sweeping melee | silver arc |
| 3 | **Burst** | Radial AoE explosion centered on target | AoE damage (close or ranged), explosive | ember fire |
| 4 | **Beam** | Linear streak source → target, fast | Ranged single-target (gunshot, laser, sniper) | gold streak |
| 5 | **Pulse** | Soft circular wave on target/self | Status / heal / buff / debuff / aura | soft frost |

Each kit / weapon / boss attack tags **exactly one** of these effects. No multi-effect attacks; no custom effects outside the pool.

## Per-Rank Visual Escalation

Each effect has 7 visual rank levels (F → U). Scaling is **subtle** — not a dramatic glow-up. Authored as a single component with rank-driven parameters (brightness, size, duration, particle count).

| Rank | Scaling target |
|---|---|
| F | Smallest, dimmest, shortest |
| E | ↑ subtle |
| D | ↑ subtle |
| C | ↑ subtle |
| B | ↑ subtle, attunement glow begins |
| A | ↑ subtle, attunement glow visible |
| U | Signature treatment — full intensity, extended duration, signature glow |

The visual climb F → A is intentionally subtle — noticeable side-by-side but not dramatic. Rank identity is established by the kit/weapon/boss flavor, not by VFX inflation.

## Per-Kit / Per-Weapon Override

Each kit, weapon, and boss attack declares:

- **Effect choice** (one of the 5)
- **Color override** — overrides the base palette. Examples: frost-themed weapon → blue Strike; rift-touched ult → violet Beam; gold-flavored kit → amber Slash.
- **Visual rank level** — typically matches the kit/weapon/boss's rank, but can override. A low-rank kit can use a flashier visual for tone reasons, or a high-rank kit can use a restrained visual.

This keeps the pool to 5 effects while letting authors flavor each attack distinctly.

## SFX Pairing

Every VFX has a **paired SFX cue.** SFX is also code (`AudioCueDefinition` pattern), authored alongside the VFX. Effect → SFX pairing is fixed by effect kind:

| Effect | SFX character |
|---|---|
| Strike | Sharp percussive impact |
| Slash | Whoosh + impact tail |
| Burst | Explosion / radial concussion |
| Beam | Streak / piercing tone |
| Pulse | Soft wave / tonal aura |

Color and intensity overrides may modulate SFX timbre (frost Strike colder; ember Burst hotter), but the base cue category is locked by effect.

## Where VFX Renders

- **Live-card boss encounters:** full VFX overlay on portrait cards. Every attack from operators and boss renders its VFX with the kit-declared color and rank level.
- **Non-boss skirmish transcript playback:** **VFX does not render.** The transcript shows the operator's attack kit (kit name, damage, target) — the visual effect is not described. Transcript stays text-driven.
- **Asset playground:** VFX is previewable for authoring — CSS + motion playback in the playground. See [Asset Pipeline Contract](./asset-pipeline.md).

## Pool Expandability

**5 effects fixed for initial scope.** Adding a 6th+ effect is a roadmap decision, not an incremental authoring path. If a unique boss or unique operator's signature attack genuinely doesn't fit any of the 5 mappings, that's a signal to author a 6th — but require the design pass first, don't fold it in by accident.

## Authoring Path

- **Implementation:** CSS + Framer Motion + React. Each effect is a self-contained component accepting parameters (color, rank level, target ref, source ref).
- **Sub-plan ownership:** authored in `rewrite/encounter-effects-pool`.
- **Playground integration:** previewable in the asset playground alongside other asset families.

## What This Doc Doesn't Cover

- **Specific kit / weapon / boss VFX assignments.** That's per-kit/per-weapon/per-boss content; lives in templates and runtime data.
- **Effect implementation details.** Lives in code (CSS/motion components in `app/features/encounter/vfx/` or equivalent path).
- **SFX cue authoring.** Lives in `rewrite/encounter-sfx` sub-plan.
- **Status effect simulation logic.** Code-side; reuses the operator-kit effect engine.

## Cross-Doc References

- VFX implementation: `rewrite/encounter-effects-pool`
- Asset-vs-code split: [Asset Pipeline Contract](./asset-pipeline.md)
- UI animation library reference: [Visual / UI Direction](./ui-direction.md)
- Combat package shape: `rewrite/combat-package-content-rewrite`
- Operator rank visual escalation: [Operator Rank Requirements](./operator-ranks.md)
- Weapon tier visual escalation: [Weapon Tier Requirements](./weapon-tiers.md)
