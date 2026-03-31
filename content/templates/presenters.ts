import type { PresenterTemplate } from "./shared";

export const presenterTemplates = [
  {
    id: "presenter/assistant",
    kind: "presenter",
    name: "Mara Cordero",
    tags: ["domain:operations", "domain:bodega", "domain:briefing", "role:assistant"],
    roleDescription: "Guild assistant handling intake, paperwork, and management briefings.",
    portraitByExpression: {
      neutral: "/data/presenters/assistant/neutral.jpg",
      concerned: "/data/presenters/assistant/concerned.jpg",
      serious: "/data/presenters/assistant/serious.jpg",
      amused: "/data/presenters/assistant/amused.jpg",
    },
    defaultExpression: "serious",
    generation: {
      canonBrief:
        "Late 20s to early 30s Afro-Latina office assistant, composed and quick, grounded NYC workwear, carries the look of someone who has been keeping a chaotic operation functioning for months.",
      masterPrompt:
        "Use case: narrative presenter portrait\nAsset type: interruption modal portrait\nPrimary request: create a recurring narrative portrait for Mara Cordero, the guild assistant who anchors bodega guidance and operational briefings\nSubject: competent office assistant in a modern supernatural labor guild, late 20s to early 30s, Afro-Latina, dry and composed, visibly used to chaos\nStyle/medium: polished modern dungeon-fantasy manhwa character art with grounded NYC workplace styling, crisp linework, clean facial readability, and controlled JRPG presenter energy\nComposition/framing: full-body standing portrait, centered in a vertical 4:5 composition, readable when cropped into a modal portrait panel, front-facing to slight 3/4 angle\nLighting/mood: controlled indoor light, calm cinematic contrast, practical rather than glamorous\nBackground: plain warm-white background, no scene detail, designed for faux-cutout presentation on a dark portrait panel\nKey details: textured dark curls pinned back, tailored charcoal blouse with rolled sleeves, fitted slacks, practical heels, worn lanyard badge, slim black folder, intelligent and slightly tired expression\nConstraints: single character only, no text, no logos, no clutter, no dramatic action pose, no armor\nAvoid: generic anime school styling, neon overload, fantasy armor, messy background, extra people",
      preserveList: [
        "oval face with sharp brows",
        "dark textured curls pinned back",
        "charcoal officewear silhouette with lanyard and folder",
        "full-body framing on a warm-white background",
      ],
    },
  },
  {
    id: "presenter/cook",
    kind: "presenter",
    name: "Rafi Alvarez",
    tags: ["domain:porters", "domain:kitchen", "domain:quality", "role:cook"],
    roleDescription:
      "Porter's kitchen lead, surfacing prep, food quality, and line pressure issues.",
    portraitByExpression: {
      neutral: "/data/presenters/cook/neutral.jpg",
      concerned: "/data/presenters/cook/concerned.jpg",
      serious: "/data/presenters/cook/serious.jpg",
      amused: "/data/presenters/cook/amused.jpg",
    },
    defaultExpression: "serious",
    generation: {
      canonBrief:
        "Early 30s Puerto Rican line cook and kitchen lead, broad-shouldered, tired eyes, practical kitchen clothes, the kind of person who can keep service moving while glaring holes through everyone in the room.",
      masterPrompt:
        "Use case: narrative presenter portrait\nAsset type: interruption modal portrait\nPrimary request: create a recurring narrative portrait for Rafi Alvarez, the Porter's kitchen lead presenter\nSubject: Puerto Rican line cook in his early 30s who manages kitchen pressure inside a modern supernatural labor guild headquarters, practical, blunt, dependable\nStyle/medium: polished modern dungeon-fantasy manhwa character art with grounded NYC kitchen-workwear styling, strong silhouette separation, and controlled JRPG presenter energy\nComposition/framing: full-body standing portrait, centered in a vertical 4:5 composition, readable when cropped into a modal portrait panel, slight 3/4 angle\nLighting/mood: controlled kitchen-adjacent light, warm highlights with restrained cinematic contrast\nBackground: plain warm-white background, no scene detail\nKey details: short dark hair, light stubble, black tee under a worn dark apron, dark work pants, non-slip shoes, dish towel at the waist or over one shoulder optional, heavy forearms, expression readable without caricature\nConstraints: single character only, no text, no logos, no clutter, no action pose, no fantasy armor\nAvoid: chef-hat comedy styling, neon fantasy effects, extra props, extra people",
      preserveList: [
        "square jaw with light stubble",
        "short dark hair",
        "dark tee and apron silhouette",
        "full-body framing on a warm-white background",
      ],
    },
  },
  {
    id: "presenter/bartender",
    kind: "presenter",
    name: "Sloane Becker",
    tags: ["domain:porters", "domain:bar", "domain:recruitment", "role:bartender"],
    roleDescription:
      "Porter's front-of-house closer, reading recruits, regulars, and bar pressure before they turn into problems.",
    portraitByExpression: {
      neutral: "/data/presenters/bartender/neutral.jpg",
      concerned: "/data/presenters/bartender/concerned.jpg",
      serious: "/data/presenters/bartender/serious.jpg",
      amused: "/data/presenters/bartender/amused.jpg",
    },
    defaultExpression: "amused",
    generation: {
      canonBrief:
        "Late 20s front-of-house closer and bartender with dyed ash-blonde hair and pale mint accents, cool-eyed and composed, upscale nightlife polish pushed through Porter's rough edges, the kind of person who can sort a room at a glance and decide who is worth the trouble.",
      masterPrompt:
        "Use case: narrative presenter portrait\nAsset type: interruption modal portrait\nPrimary request: create a recurring narrative portrait for Sloane Becker, the Porter's bartender and front-of-house closer\nSubject: stylish bartender in her late 20s who handles recruitment reads, regular pressure, and public-facing tension for a modern supernatural labor guild in 2026 New York, perceptive, unsentimental, impossible to rattle\nStyle/medium: polished modern dungeon-fantasy manhwa character art with upscale nightlife styling, crisp linework, strong silhouette separation, and cool controlled facial readability\nComposition/framing: full-body standing portrait, centered in a vertical 4:5 composition, readable when cropped into a modal portrait panel, slight 3/4 angle\nLighting/mood: low-key interior contrast translated into a clean studio portrait, cool and composed, stylish without becoming idol glam\nBackground: plain warm-white background, no scene detail\nKey details: pale ash-blonde hair with soft mint-tinted accents, elegant loose strands and tied-back volume, sharp pale eyes, fitted white blouse layered under a cropped dark vest or structured front-of-house piece, short dark skirt or tailored nightlife uniform with premium detailing, statement boots, polished jewelry kept minimal, expression that can read dry amusement or clinical skepticism\nConstraints: single character only, no text, no logos, no clutter, no drink prop required, no fantasy armor, no obvious sci-fi gear, grounded upscale nightlife workwear only\nAvoid: photorealism, generic officewear, bubbly idol styling, school uniform coding, nightclub neon overload, extra people, busy background, comedy caricature",
      preserveList: [
        "ash-blonde hair with pale mint accents",
        "high-contrast black-and-white nightlife silhouette",
        "cool poised posture with long-leg silhouette",
        "full-body framing on a warm-white background",
      ],
    },
  },
] satisfies readonly PresenterTemplate[];
