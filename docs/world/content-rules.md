# World Content Rules

Tone, naming, and rank-escalation rules for content authoring. This file owns the **rules** that govern enemies, bosses, weapons, copy, and Unique (`U`) treatment. Specific catalogs (named bosses, enemy archetypes per dungeon, weapon tables, unique rosters) live in `docs/product/`, not here.

## Rank Escalation Contract

The game needs a deliberate climb in tone and visual language as rank rises. Difficulty alone is not enough.

- F and E content should stay grounded in recognizable city reality. The place or object is wrong, but it still clearly comes from the ordinary world.
- D and C content can become more visibly rift-touched, specialized, and physically implausible. This is where the game starts leaning harder into impossible architecture, stranger materials, and rarer operator presence.
- B and A content should feel institutionally famous, expensive, and hard to mistake for ordinary hazard work.
- Unique (`U`) content is where the game can spend its most spectacular ideas: singular bosses, impossible spaces, celebrity operators, and signature gear.
- This climb applies across dungeons, enemies, bosses, operators, and weapons. Do not spend Unique (`U`) spectacle on early-rank content.

## Enemy And Boss Tone

### Enemies

Enemies are hostile entities found inside dungeons. They are not people. They are products of whatever supernatural process creates dungeons — symptoms of the rift, not independent creatures with their own society.

- Enemy design should reflect the dungeon's theme. A subway dungeon produces different hostiles than a park dungeon.
- Enemies should feel like warped byproducts of the site, not generic monsters dropped into a themed backdrop.
- Subway dungeon enemies look like distorted transit infrastructure come alive. Park dungeon enemies look like overgrown organic forms. The dungeon shapes its threats.
- Dungeons contain weaker and tougher enemies in a spectrum, but the boss is the only named unique entity inside.

Specific enemy archetypes and per-rank rosters live in `docs/product/`, not here.

### Bosses

Bosses anchor dungeons. A dungeon exists as long as its boss does. Killing the boss closes the dungeon.

- Each dungeon has exactly one boss.
- Bosses have ranks matching the dungeon. An F-rank dungeon has an F-rank boss. A Unique (`U`) dungeon has a Unique (`U`) boss that is a genuine crisis.
- Bosses should feel like the dungeon's core, not just a harder enemy. They define the space.

### Boss Design Principles

- A boss should feel like the culmination of its dungeon's theme.
- Bosses should have names. They are specific entities. Not "The Guardian" or "Dark Lord." Something that implies the dungeon's theme. For example, "The Dispatcher" for a subway boss or "The Superintendent" for a residential boss.
- Lower-rank bosses should still feel like the warped core of a recognizable place. Higher-rank bosses can become stranger, more singular, and more visually extravagant as long as they still read as the culmination of that place.
- Unique (`U`) bosses should be genuine spectacles — unique visual design, lore implications, and lasting world consequences.
- Unique bosses are not recruitable. They are dungeon goals tied to Unique-operator unlock chains, not future operators themselves.

## Weapon Logic

Weapons are the only items in the game. No outfits, no accessories. Operators carry weapons; that is the entire equipment surface. Weapons should feel consistent with the grounded-but-superhuman tone.

### Weapon Tone Climb

Weapons climb in tone with rank, not just stat power.

- **F and E** — grounded, makeshift, plausibly improvised. Scissors, broken kitchen knives, bats, pipes. The kind of thing a desperate person grabs.
- **D and C** — real weapons. Combat knives, sidearms, swords, tactical rifles. Equipment a professional would carry.
- **B and A** — mystical weapons. Attunement-powered, visibly rift-touched. Recognizable as weapons but no longer ordinary. Each one can carry an authored effect beyond raw stats.
- **Unique (`U`)** — named, signature weapons paired with specific Unique operators. The most extraordinary visual signatures in the game.

### Weapon Rules

- Weapons should look like equipment professionals carry into dangerous jobs. Not fantasy armor, not sci-fi power suits.
- F and E should remain grounded, practical, and plausible. D and C can start showing stranger materials and silhouettes. B and A can carry mystical attunement signatures. Unique weapons can be the boldest.
- Anyone can wield any weapon. There is no rank-locking on equip — a low-rank operator carrying a high-rank weapon is allowed, even if it looks absurd.
- Weapon flavor should reinforce the dungeon-clearing-as-blue-collar-work tone, not heroic-knight-quest tone.
- Unique (`U`) weapons are named and tied to operator identity. Each Unique weapon belongs to a specific Unique operator. Not every Unique operator has a Unique weapon, but every Unique weapon has an associated operator.

Per-tier weapon catalogs and unique weapon rosters live in `docs/product/`, not here.

## Copy And Naming Rules

### General Copy Rules

- Write in present tense for descriptions. Past tense for event logs and history.
- Avoid heavy fantasy jargon. No "mana," "aether," "quest," or "dungeon master." Use workplace and operational language with a comedic edge.
- Operators are "operators." Not "heroes," "warriors," or "adventurers."
- The player uses a chosen personal name. NPCs, UI copy, and authored text should address them by that name, not by a fixed title like "Boss."
- The player's organization uses a chosen guild name. When copy refers to the player's guild specifically, use that name.
- Dungeons are "rifts," "sites," or "incursions" in formal copy. "Dungeon" is the operational shorthand everyone actually uses.
- Enemies are "hostiles," "threats," or "entities" in reports. Operators probably have ruder names for them.
- Raids are "operations," "runs," or "deployments" in formal copy. "Raid" is what everyone says.
- Staff are "staff," "hires," or "the team." Not "NPCs" or "support units."

### Naming Rules For Operators

- Operators have full names (first + last). No single-name handles.
- Names should reflect New York's real diversity without being stereotypical.
- No joke names, pun names, or anime-style names. Operators are authored people. Their humor comes from personality, not their name.
- Names should sound like people who live in New York.

### Naming Rules For Staff

- Staff have full names too. They are people, not furniture.
- Staff names follow the same diversity and authenticity rules as operators.

### Naming Rules For Dungeons

- Dungeons should be named after the real location they have consumed, modified to be recognizable but wrong. For example, "Flatbush Substation" for a subway-themed dungeon in Brooklyn or "Lenox Terrace" for a residential dungeon in Harlem.
- Boss names should be evocative and specific. Not generic titles. Something that implies the dungeon's theme and makes you slightly uncomfortable. For example, "The Dispatcher" for a subway boss or "The Superintendent" for a residential boss.

### Naming Rules For Weapons

- Weapon names should be functional and descriptive. "Tactical rifle" not "Shadowbane." "Broken kitchen knife" not "Cleaver of Doom."
- Higher-rank weapons can have slightly more evocative names as they pick up mystical attunement, but they should still sound like equipment rather than fantasy artifacts.
- Unique (`U`) weapons have proper names. These are signature items tied to famous operators.

### Naming Rules For Events

- Event names should read like workplace incident reports, not quest titles.
- "Personnel Conflict" not "The Brewing Storm." "Breach Emergency" not "Darkness Rises."
- The comedy is in the bureaucratic framing of extraordinary situations.

### Copy Tone

- Professional, slightly dry, frequently absurd.
- The game's humor comes from the juxtaposition of mundane management language and supernatural danger. "Your D-rank field lead has filed a formal complaint about the break room microwave" should feel like a normal thing to read.
- UI copy should be clear and functional first, funny second. The joke should never obscure what a button does.
- Death and serious injury copy should not be funny. These are the moments the comedy stops.

## Unique (U-Rank) Content Rules

Unique (`U`) is the true endgame prestige tier. It deserves its own section because it behaves differently from everything else.

### Unique (U-Rank) Operators

- Unique (`U`) operators are celebrities. They are known by name in-world. Other guilds talk about them.
- Unique (`U`) operators are authored, not runtime-AI-generated. Their portrait assets may be produced by AI agents during content authoring, then manually reviewed and approved, with a glowing border.
- Unique (`U`) operators are not visitors in the regular recruitment room. Each is unlocked through a deterministic gameplay goal — typically a specific dungeon defeated plus a currency threshold met. Unlock chains are authored per operator.
- Unlocking a Unique (`U`) operator should feel extraordinary, not routine.
- Unique (`U`) operators have high standards, strong opinions, and alternatives.

### Unique (U-Rank) Dungeons

- Unique (`U`) dungeons are national emergencies. They are not routine contracts.
- Clearing a Unique (`U`) dungeon should be a major story moment with lasting world consequences.
- Unique bosses are not recruitable. They are dungeon-completion goals used to unlock Unique operator recruitment elsewhere.

### Unique (U-Rank) Weapons

- Unique (`U`) weapons are unique, named, and tied to a specific Unique operator.
- Not every Unique operator has a Unique weapon, but every Unique weapon has an associated Unique operator.
- Unique weapons are unlocked through their own authored goal chain, separate from the operator's recruitment chain. The Unique Weapon room unlocks after the Unique Operator room.
- Unique weapons have authored portraits with their own distinct glowing border. These may be produced by AI agents during content authoring, then manually reviewed and approved. This is where the weapon-art budget goes.
