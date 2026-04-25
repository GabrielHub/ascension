import type { PresenterTemplate } from "./shared";

// Presenter portrait generation workflow (do not rewrite the masterPrompts back to style-heavy form):
//   1. For a presenter-family reset, build Ref 1 from the approved external style board and
//      generate `neutral` without chaining to stale legacy portraits.
//   2. Once the first neutral lands, that approved neutral becomes the family cast anchor.
//   3. Prompt text does identity work (who, age, costume, composition, constraints).
//      Style discipline lives in Ref 1 and the approved neutral; avoid piling style adjectives
//      into follow-up prompts.
//   4. Generate `concerned` / `serious` / `amused` from the approved neutral. Only expression
//      and minor posture should change; keep everything on the preserveList identical.
//   5. Canon brief is the short descriptive identity anchor. masterPrompt records the actual
//      approved prompt used for the current neutral. Preserve list is the hard consistency
//      checklist across the family.
//   6. Author the in-world chibi token at /data/presenters/{role}/chibi.svg and wire it through
//      `chibiUrl`. Every presenter must ship with one — the world view uses the chibi, not the
//      full portrait. Match the operator marker style (32x40 viewBox, same line weight and
//      head proportions) and key off one or two unmistakable silhouette cues from the approved
//      neutral so the presenter reads as themselves at token size.
export const presenterTemplates = [
  {
    id: "presenter/assistant",
    kind: "presenter",
    name: "Mara Cordero",
    tags: ["domain:operations", "domain:bodega", "domain:briefing", "role:assistant"],
    roleTitle: "Guild Assistant",
    roleDescription: "Guild assistant handling intake, paperwork, and management briefings.",
    portraitByExpression: {
      neutral: "/data/presenters/assistant/neutral.png",
      concerned: "/data/presenters/assistant/concerned.png",
      serious: "/data/presenters/assistant/serious.png",
      amused: "/data/presenters/assistant/amused.png",
    },
    chibiUrl: "/data/presenters/assistant/chibi.svg",
    defaultExpression: "serious",
    allowedRoomTemplateIds: [
      "room/register:tier_1",
      "room/counter:tier_1",
      "room/dining_area:tier_1",
      "room/back_office:tier_1",
      "room/office:tier_1",
      "room/briefing_room:tier_1",
      "room/lobby:tier_1",
      "room/reception:tier_1",
      "room/bullpen:tier_1",
      "room/executive_office:tier_1",
    ],
    domainSummary:
      "Guild assistant: intake, paperwork, briefings, and keeping the guild's administrative surface coherent.",
    voiceBrief:
      "Mara speaks in clipped, overworked operations shorthand; dry warmth under the exhaustion. Never performative.",
    generation: {
      canonBrief:
        "Late 20s to early 30s Afro-Latina guild assistant, composed and quick, stylish in a tired overworked way, carries the look of someone who has been keeping a chaotic supernatural operation functioning for months.",
      masterPrompt:
        "Approved Mara prompt record.\n\nNeutral summary:\n- kept Mara's identity, tired competent operations read, full-body presenter-roster framing, folder bundle, badge, and dark officewear silhouette locked\n- normalized the outfit to the flatter presenter-roster house style by reducing blouse, vest, trouser, belt, and sneaker detail\n- quieted hardware shine and removed fashion-illustration wrinkle chatter so the clothes stay grounded but calmer and more graphic\n- preserved the comfortable sneaker concept while simplifying paneling, seams, and material rendering\n\nExpression prompts:\n- Concerned: use the approved neutral as the identity anchor; keep the interrupted attentive pose with the paperwork active, and match the neutral's flatter clothing and hardware treatment.\n- Serious: use the approved neutral as the identity anchor; keep the crossed-arms silhouette and folder-to-chest hold, and match the neutral's calmer grouped-shadow clothing treatment.\n- Amused: use the approved neutral as the identity anchor; keep the dry half-smirk and relaxed presenting pose with believable prop handling, and match the neutral's flatter officewear rendering.",
      preserveList: [
        "late-20s-to-early-30s Afro-Latina face with sharp brows, warm brown skin, and tired but controlled eyes",
        "dark textured curls pinned back with a few escaped strands; messy from overwork, not glam-styled",
        "charcoal blouse and structured vest over softer comfort-first pants with worn simple sneakers",
        "work-used black notebook and loose paper bundle with clean badge read",
        "full-body presenter-roster framing on a plain warm-white background",
        "single-house-style rendering: crisp linework, calmer grouped shadow masses, flattened clothing planes, no glossy digital highlights",
      ],
    },
  },
  {
    id: "presenter/cook",
    kind: "presenter",
    name: "Rafi Alvarez",
    tags: ["domain:porters", "domain:kitchen", "domain:quality", "role:cook"],
    roleTitle: "Kitchen Lead",
    roleDescription:
      "Porter's kitchen lead, surfacing prep, food quality, and line pressure issues.",
    portraitByExpression: {
      neutral: "/data/presenters/cook/neutral.png",
      concerned: "/data/presenters/cook/concerned.png",
      serious: "/data/presenters/cook/serious.png",
      amused: "/data/presenters/cook/amused.png",
    },
    chibiUrl: "/data/presenters/cook/chibi.svg",
    defaultExpression: "serious",
    allowedRoomTemplateIds: [
      "room/dining_area:tier_1",
      "room/prep_room:tier_1",
      "room/break_room:tier_1",
      "room/backstock:tier_1",
    ],
    unlockFromRoomTemplateId: "room/dining_area:tier_1",
    domainSummary:
      "Porter's kitchen lead: prep, food quality, and line pressure. Translates kitchen state into problems management actually cares about.",
    voiceBrief:
      "Rafi speaks in short, grounded kitchen-authority beats; blunt without being theatrical, dry heat under the composure.",
    generation: {
      canonBrief:
        "Early 30s Puerto Rican line cook and kitchen lead, broad-shouldered, tired eyes, grounded kitchen authority with a muted ember-red hair tone, the kind of person who can keep service moving while glaring holes through everyone in the room.",
      masterPrompt:
        "Approved Rafi prompt record.\n\nNeutral anchor summary:\n- flattened the face, arms, apron, and overall rendering to match the presenter house style\n- removed gloss and extra render noise\n- added a small ear piercing\n- shifted the hair to a grounded ember-red / muted auburn read so he feels like named cast instead of generic kitchen staff\n\nExpression prompts:\n- Concerned: use the approved neutral as the identity anchor; keep the interrupted kitchen-pressure pose, but flatten the face, neck-to-chest area, and arms so the expression stays in-family with the neutral instead of becoming over-modeled.\n- Serious: use the approved neutral as the identity anchor; keep the command pose, but flatten the face, neck-to-chest area, and arms so the authority reads clearly without extra anatomical rendering.\n- Amused: use the approved neutral as the identity anchor; change the amused pose to a real laugh with one hand scratching the side or back of his head, keep the other hand grounded, and flatten the face, neck-to-chest area, and arms to match the neutral.",
      preserveList: [
        "square jaw with light stubble and simplified facial planes",
        "short muted ember-red hair with a small ear piercing",
        "dark henley and dark apron silhouette with flattened fabric planes",
        "broad-shouldered kitchen-worker build with grounded kitchen shoes and towel accents",
        "full-body framing on a warm-white background with no gloss or digital lighting drift",
      ],
    },
  },
  {
    id: "presenter/bartender",
    kind: "presenter",
    name: "Sloane Becker",
    tags: ["domain:porters", "domain:bar", "domain:recruitment", "role:bartender"],
    roleTitle: "Front of House",
    roleDescription:
      "Porter's front-of-house closer, reading recruits, regulars, and bar pressure before they turn into problems.",
    portraitByExpression: {
      neutral: "/data/presenters/bartender/neutral.png",
      concerned: "/data/presenters/bartender/concerned.png",
      serious: "/data/presenters/bartender/serious.png",
      amused: "/data/presenters/bartender/amused.png",
    },
    chibiUrl: "/data/presenters/bartender/chibi.svg",
    defaultExpression: "amused",
    allowedRoomTemplateIds: [
      "room/bar:tier_1",
      "room/floor:tier_1",
      "room/lobby:tier_1",
      "room/club:tier_1",
      "room/green_room:tier_1",
      "room/sky_lounge:tier_1",
      "room/private_cellar:tier_1",
    ],
    unlockFromRoomTemplateId: "room/bar:tier_1",
    domainSummary:
      "Porter's front-of-house closer: reads recruits, regulars, and bar pressure before they become actionable problems.",
    voiceBrief:
      "Sloane speaks in wry, clipped social-assessment lines; dangerous warmth when she wants it, cold evaluation underneath.",
    generation: {
      canonBrief:
        "Late 20s front-of-house closer and bartender with ash-blonde hair and pale mint accents, cool-eyed and composed, upscale nightlife polish pushed through Porter's rough edges, the kind of person who can sort a room at a glance and decide who is worth the trouble.",
      masterPrompt:
        "Approved Sloane prompt record.\n\nNeutral summary:\n- rebuilt the neutral in the locked presenter roster style instead of chaining to the old bartender raster family\n- corrected the overlong leg read and rebalanced the body proportions\n- differentiated her outfit from Mara and Rafi with a front-of-house nightlife silhouette instead of officewear\n- finalized the lower half as dark upscale jeans to keep her grounded, sharp, and distinct while preserving the sleeveless bartender upper silhouette\n\nExpression prompts:\n- Concerned: use the approved neutral as the only identity anchor; make her clearly concerned with a socially evaluative pose and a front-of-house prop such as a receipt slip, order chit, or folded reservation note so she reads as someone who just clocked a problem across the room.\n- Serious: use the approved neutral as the only identity anchor; make her clearly serious with cool front-of-house command, using a prop such as a wine key, receipt clip, folded note, or closing keys so she reads as bar authority and floor control.\n- Amused: use the approved neutral as the only identity anchor; make her clearly amused in Sloane's tone with dry, knowing social amusement, using a front-of-house prop such as a polished rocks glass, stemless glass, coaster stack, or folded receipt so she reads as wry bartender assessment rather than kitchen labor.",
      preserveList: [
        "ash-blonde hair with pale mint accents and cool pale eyes",
        "distinct sleeveless front-of-house silhouette with dark upscale jeans",
        "cool unreadable neutral expression and socially dangerous front-of-house read",
        "full-body framing on a warm-white background in the flattened roster house style",
      ],
    },
  },
  {
    id: "presenter/vicente-ortega",
    kind: "presenter",
    name: "Vicente Ortega",
    tags: [
      "domain:gear",
      "domain:workshop",
      "domain:loot",
      "domain:inventory",
      "domain:field-prep",
      "role:quartermaster",
    ],
    roleTitle: "Quartermaster",
    roleDescription:
      "Guild quartermaster, anchoring gear readiness, loot triage, inventory flow, and field-prep briefings.",
    portraitByExpression: {
      neutral: "/data/presenters/quartermaster/neutral.png",
      concerned: "/data/presenters/quartermaster/concerned.png",
      serious: "/data/presenters/quartermaster/serious.png",
      amused: "/data/presenters/quartermaster/amused.png",
    },
    chibiUrl: "/data/presenters/quartermaster/chibi.svg",
    defaultExpression: "neutral",
    allowedRoomTemplateIds: [
      "room/fabrication_bay:tier_1",
      "room/workshop:tier_1",
      "room/stockroom:tier_1",
      "room/supply_closet:tier_1",
      "room/supply_hall:tier_1",
      "room/dock:tier_1",
    ],
    unlockFromRoomTemplateId: "room/fabrication_bay:tier_1",
    domainSummary:
      "Guild quartermaster: gear readiness, loot triage, inventory flow, and field-prep briefings for every raid cycle.",
    voiceBrief:
      "Vicente speaks in fast, technical, terminally-online teen-prodigy bursts; precise under the jittery energy, dry when cornered.",
    generation: {
      canonBrief:
        "18-year-old Filipino-American guild quartermaster, Queens-raised specialized-high-school prodigy who deferred college to run gear and fabrication for the guild, lean still-growing frame, clean-shaven, terminally-online teen energy under visibly fussy technical focus.",
      masterPrompt:
        "Approved Vicente neutral prompt record.\n\nNeutral summary:\n- kept the lean Filipino-American teen identity, skin tone, hair, and exact full-body presenter-roster framing locked\n- replaced the earlier black-heavy techwear pass with a cleaner 2026-forward bright-color street-fashion silhouette\n- approved the cropped lime work jacket, white tee, relaxed cream trousers, and simplified blue-white sneakers as the new neutral clothing language\n- simplified the arm tattoo into larger graphic shapes with a few restrained glowing lines and removed the bracelet from the tattooed arm for a cleaner read\n- kept the wired earbud and single-artist flattened presenter rendering discipline instead of drifting into glossy fashion rendering\n\nFlatten pass:\n- reduced cloth wrinkle chatter across jacket, tee, trousers, and shoes so the figure holds the presenter house-style grouped-shadow discipline\n- simplified the tablet, clipboard, and cable handling so props stay graphic and readable instead of becoming high-detail focal points\n\nExpression prompts:\n- Concerned: use the approved neutral as the only identity anchor; keep the same outfit and silhouette, and make him clearly concerned in a quartermaster-read way with interrupted focus rather than panic.\n- Serious: use the approved neutral as the only identity anchor; keep the same outfit and silhouette, and make him clearly serious with clipped technical authority and a more grounded command posture.\n- Amused: use the approved neutral as the only identity anchor; keep the same outfit and silhouette, and make him clearly amused with Vicente's terminally-online teen-prodigy energy without changing the rendering discipline.",
      preserveList: [
        "18-year-old lean Filipino-American face with warm medium-brown skin, clean-shaven features, and tousled dark hair",
        "cropped bright-lime work jacket over a white tee with relaxed cream trousers",
        "simplified blue-white sneakers, one wired earbud, and a clean circuit-like forearm tattoo with subtle glow lines",
        "exact full-body presenter-roster framing on a warm-white background in the flattened presenter rendering style",
      ],
    },
  },
  {
    id: "presenter/dr-june-park",
    kind: "presenter",
    name: "Dr. June Park",
    tags: [
      "domain:medical",
      "domain:recovery",
      "domain:trauma",
      "domain:infirmary",
      "role:physician",
    ],
    roleTitle: "Physician",
    roleDescription:
      "Guild physician, anchoring injury, recovery, infirmary, and post-mission medical consequence beats.",
    portraitByExpression: {
      neutral: "/data/presenters/medical/neutral.png",
      concerned: "/data/presenters/medical/concerned.png",
      serious: "/data/presenters/medical/serious.png",
      amused: "/data/presenters/medical/amused.png",
    },
    chibiUrl: "/data/presenters/medical/chibi.svg",
    defaultExpression: "serious",
    allowedRoomTemplateIds: [
      "room/infirmary:tier_1",
      "room/clinic:tier_1",
      "room/trauma_bay:tier_1",
    ],
    unlockFromRoomTemplateId: "room/infirmary:tier_1",
    domainSummary:
      "Guild physician: injury, recovery, infirmary capacity, and post-mission medical consequence calls.",
    voiceBrief:
      "June speaks in composed, clinically direct sentences; dry exasperation underneath, no theatrics, lowest baseline stress in the cast.",
    generation: {
      canonBrief:
        "34-year-old Korean-American guild physician, Flushing-raised, Mount Sinai trauma fellowship, left hospital medicine to run real medical infrastructure for a guild, composed and clinically direct with a dry exasperated edge, lowest baseline stress in the cast.",
      masterPrompt:
        "Approved June portrait record.\n\nNeutral summary:\n- locked the final neutral to the flatter presenter-house rendering instead of the earlier more detailed splash-art pass\n- preserved June's face, glasses, medical silhouette, and the full Greek-inspired coat design while calming sleeve folds, neck/clavicle rendering, trim shine, and hardware emphasis\n- approved the ash-blonde hair with visible grown-in black roots as the final neutral hair treatment so she reads as overworked and grounded rather than salon-finished\n- corrected the family framing to the shipped presenter-roster portrait canvas (`1024x1536` / `1023x1537` family) after rejecting earlier narrow and landscape passes\n- approved `public/data/presenters/medical/neutral.png` as the canon cast anchor\n\nExpression approvals:\n- Concerned: approved `public/data/presenters/medical/concerned.png`; kept the neutral outfit and hair locked, pushed the brow and mouth into interrupted clinical attention, and used a small forward-engaged hand adjustment so it reads clearly at modal size on the roster canvas.\n- Serious: approved `public/data/presenters/medical/serious.png`; kept the neutral outfit and hair locked, squared the posture, and gave her clipped medical authority with a stronger command silhouette on the roster canvas.\n- Amused: approved `public/data/presenters/medical/amused.png`; kept the neutral outfit and hair locked, and made the amusement dry and wry rather than playful or flirtatious on the roster canvas.",
      preserveList: [
        "34-year-old Korean-American face with small wire-frame glasses and the approved neutral expression baseline",
        "ash-blonde hair with visible grown-in black roots, kept in the same clipped-up practical work hairstyle",
        "navy scrubs under a cream medical lab coat with the approved Greek-inspired wrap front, restrained gold trim, dark lining, and asymmetrical drape",
        "retractable medical ID badge at the chest and stethoscope around the neck",
        "full-body presenter-roster framing on a warm-white background in the flatter presenter-house rendering discipline",
      ],
    },
  },
  {
    id: "presenter/compliance-officer",
    kind: "presenter",
    name: "Laura Bennett",
    tags: [
      "domain:compliance",
      "domain:policy",
      "domain:regulation",
      "domain:pressure",
      "role:compliance-officer",
    ],
    roleTitle: "Compliance Officer",
    roleDescription:
      "Guild compliance officer, anchoring policy, regulator-facing paperwork, and institutional-pressure consequence beats.",
    portraitByExpression: {
      neutral: "/data/presenters/compliance/neutral.png",
      concerned: "/data/presenters/compliance/concerned.png",
      serious: "/data/presenters/compliance/serious.png",
      amused: "/data/presenters/compliance/amused.png",
    },
    chibiUrl: "/data/presenters/compliance/chibi.svg",
    defaultExpression: "neutral",
    allowedRoomTemplateIds: [
      "room/compliance_office:tier_1",
      "room/executive_office:tier_1",
      "room/war_room:tier_1",
      "room/situation_room:tier_1",
      "room/office:tier_1",
    ],
    unlockFromRoomTemplateId: "room/compliance_office:tier_1",
    domainSummary:
      "Guild compliance officer: policy, regulator-facing paperwork, and institutional-pressure consequence beats.",
    voiceBrief:
      "Laura speaks in precise, controlled, faintly unimpressed executive-floor beats; regulator charm with cold edges, never theatrical.",
    generation: {
      canonBrief:
        "41-year-old white American compliance officer, Long Island-raised former city auditor who now sells regulator-stack literacy to the guild, precise and controlled with faintly unimpressed executive-floor authority, dangerous regulator charm, and a polished oxblood officewear silhouette that reads like she has somewhere better to be.",
      masterPrompt:
        "Laura portrait record.\n\nNeutral summary:\n- established the compliance family under the locked presenter-roster house style using the existing shipped neutral portraits as the style anchor\n- approved the muted oxblood pencil-skirt suit, brushed-gold wrap blouse, clipped badge, slim electronic tablet, sheer black tights, and black pumps as Laura's domain-readable compliance silhouette\n- kept the expression neutral and faintly unimpressed so she reads as precise, controlled, professionally merciless, and quietly seductive rather than theatrical or nightclub-coded\n- corrected the body proportions away from runway-length legs and flattened the facial highlights, blouse, neckline, and fabric rendering so the whole figure stays in-family with the matte grouped-shadow presenter house style on a plain warm-white roster background\n- re-locked the blazer as fully sheer across the entire jacket, including front panels, lapels, torso, back panels, and sleeves, so the office-fashion accent stays consistent across the approved family instead of drifting into sleeve-only translucency\n- locked the final posture as a stronger, colder, weaponized-charm stance with a more deliberate hip angle and chest-open silhouette rather than a purely severe office pose\n\nExpression approvals:\n- Concerned: approved `public/data/presenters/compliance/concerned.png`; kept the corrected neutral outfit and face locked, used a fingernail-biting pose with the opposite arm folded under the torso, and pushed the expression into controlled, seductive concern rather than panic.\n- Serious: approved `public/data/presenters/compliance/serious.png`; kept the corrected neutral outfit and face locked, leaned her slightly toward the camera with both hands on her hips, and pushed the read into stern executive-floor enforcement authority.\n- Amused: approved `public/data/presenters/compliance/amused.png`; kept the corrected neutral outfit and face locked, replaced the earlier sly amusement with a drier scoffing contempt, and used a subtle access-card gesture so the amusement reads as dismissive institutional advantage rather than playful warmth.",
      preserveList: [
        "41-year-old white American face with controlled brows, neutral mouth, faintly unimpressed executive-floor composure, and flatter matte facial rendering with restrained highlights",
        "smooth shoulder-length ash-brown hair with a practical side part and polished but grounded styling",
        "muted oxblood pencil-skirt suit with a fully sheer structured blazer across the entire jacket over a brushed-gold wrap blouse, sheer black tights, and black pumps",
        "clipped badge and restrained gold hardware accents; props stay slim and compliance-readable, such as an access pass or tablet, never bulky assistant-like folders",
        "balanced adult body proportions with shorter, more realistic legs, a flatter shirt and neckline rendering than earlier drafts, and a more deliberate seductive posture",
        "full-body presenter-roster framing on a plain warm-white background in the locked presenter house style",
      ],
    },
  },
] satisfies readonly PresenterTemplate[];
