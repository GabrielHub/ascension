export const PROMPT_CANON_SOURCE_PATHS = [
  "docs/world/index.md",
  "docs/world/premise-and-tone.md",
  "docs/world/attunement-and-ranks.md",
  "docs/world/guilds-and-dungeons.md",
  "docs/world/headquarters-and-rooms.md",
  "docs/world/operators-and-staff.md",
  "docs/world/content-rules.md",
  "docs/product/gameplay-systems.md",
  "docs/product/content-taxonomy.md",
] as const;

export const PROMPT_GUIDANCE_REFERENCES = [
  "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide",
  "https://developers.openai.com/api/docs/guides/prompt-guidance",
] as const;

const WORLD_CANON_LINES = [
  "- Ascension is set in New York City in 2026, six years after rifts started opening in the urban fabric worldwide in 2020.",
  "- Guilds are licensed private businesses operating in a regulated labor market, not armies, adventuring parties, or government units.",
  "- Guild income comes from clearance contracts, loot recovery, intel sales, and reputation-based contract priority.",
  "- Operators are employees with attunements. They are skilled workers under pressure, not chosen heroes or fantasy archetypes.",
  '- The player is a regular human manager with no combat ability. Their stock answer to why they never raid is some variation of "I\'m management."',
  "- The tonal center is workplace comedy under supernatural pressure. Humor comes from bureaucracy, logistics, staffing friction, and dry institutional framing.",
  "- A useful reference is The Office, if the Scranton branch occasionally sent people into lethal hellscapes. The workplace comedy is always one scheduling miscalculation away from a funeral.",
  "- The city's relationship with guilds is plumbers, but the pipes are trying to kill you: necessary, bureaucratic, uneasy.",
  "- The default mood is understaffed and over-committed, never apocalyptic or grimdark.",
  "- Dungeons are warped intrusions into real New York places. They are dangerous work sites, not mystical wonderlands.",
  "- Death, catastrophic injury, and serious loss are treated plainly. The jokes stop when harm becomes real.",
  "- Copy should feel grounded, specific, and socially legible in contemporary New York.",
] as const;

const COPY_VOCABULARY_LINES = [
  "- Prefer present tense for descriptions and briefing copy. Use past tense only when the schema explicitly asks for aftermath or recap language.",
  "- Prefer this vocabulary (use liberally): incident, report, notice, staffing, schedule, shift, coverage, paperwork, compliance, intake, contract, clearance, recovery, pressure, escalation, operator, operation, run, deployment, rift, site, incursion, hostile, entity.",
  "- Never output these words in any form, even in quoted speech, denial phrasing, or narration: mana, aether, spell, quest, chosen one, prophecy, prophet, destiny, hero, heroic, warrior, adventurer, raid party, fellowship, battalion, platoon, dungeon master, anime.",
  '- Operators are always "operators." Never heroes, warriors, adventurers, or party members.',
  '- Dungeons may be called rifts, sites, or incursions in formal copy; "dungeon" is operational shorthand.',
  "- Event and incident names should read like workplace incident reports, not quest titles.",
  "- Names, rooms, gear, and institutions should sound like plausible New York business reality touched by the supernatural.",
  "- UI copy should be clear and functional first, dry-funny second. The joke never obscures what a field means.",
] as const;

const COPY_EXAMPLE_LINES = [
  '- Good title examples: "Personnel Friction Notice", "Shift Conduct Report", "Breach Coverage Notice", "Break Room Incident".',
  '- Bad title examples: "The Brewing Storm", "Darkness Rises", "Destiny Calls", "Hero\'s Choice".',
  '- Good briefing opener: "Two operators let a small procedural dispute spread across the room before anybody finished their coffee."',
  '- Bad briefing opener: "The chosen one feels destiny calling from the break room while mana surges across the office."',
  '- Good consequence phrasing: "Morale recovers a little and the room calms down."',
  '- Bad consequence phrasing: "The prophecy is fulfilled and the party grows stronger."',
  '- A canonical reference for the tonal target: "Your D-rank field lead has filed a formal complaint about the break room microwave" should feel like a normal thing to read.',
] as const;

const COMEDY_TRAGEDY_LINES = [
  "- Default mode is dry institutional comedy: bickering, break room politics, printer grudges, logistics friction, scheduling absurdity.",
  "- If the incident category, tags, or subject indicate death, catastrophic injury, permanent loss, or raid-level failure, drop the comedy entirely. Keep the copy plain, specific, and respectful. Do not crack jokes about the dead or the permanently injured.",
  "- Never glorify violence. Raids are dangerous work, not heroics.",
] as const;

const METHOD_LINES = [
  "- Follow a fixed internal step order: anchor the deterministic facts, pick one grounded angle, draft each requested field, then self-check against every hard constraint before answering.",
  "- Be explicit, concrete, and narrow. Do not improvise beyond the authority boundary provided in the payload.",
  "- Treat the output schema as part of the task, not a suggestion.",
  "- Treat the payload as the only source of truth. Do not invent hidden state, unnamed operators, new rooms, extra effects, or unstated outcomes.",
  "- Return the final JSON object only. Do not reveal reasoning, plans, or commentary.",
] as const;

const INCIDENT_LINES = [
  "- Incident framing may vary briefing copy, option phrasing, and resolution phrasing on top of deterministic incident data.",
  "- The simulation already owns trigger family, subject identity, deterministic effects, and hidden consequences. Do not change them, only frame them.",
  "- The copy should sound like a small business trying to stay professional while everything around it is slightly absurd.",
  "- Titles should be short, report-like, and legible in UI. No exclamation marks, no rhetorical questions, no dramatic colons.",
  "- Use the room, building, and relationship fields to ground specifics. The bodega is fluorescent lighting, milk crates, a deli case, a jar of pickled eggs on the paperwork, and back rooms that smell like instant ramen. Porter's is a neon sign that works on the third try, harbor air, brick, and upstairs rooms that still remember they used to be apartments.",
] as const;

const OPERATOR_IDENTITY_LINES = [
  "- Operator identity assembly may select from approved specialties, portrait recipes, compatible visible gear ids, bounded preferences, and short persona text.",
  "- The output must feel like an authored recruit packet for a plausible hire, not a rarity gimmick or celebrity bio. Most recruits are F or E rank labor-market hires, not legends.",
  '- Persona text should make the recruit employable, socially legible, and easy to imagine in a workplace conversation. Lead with a concrete workplace read: "Former EMT who prefers small teams and hates night shifts" beats "Mysterious stranger with a dark past."',
  "- Appearance and gear choices must remain within the approved catalogs for the fixed role and recipe.",
  "- Personality and background should feel like plausible 2026 NYC: former cops, EMTs, street kids, college dropouts, ex-military, trust-fund disappointments, night-shift lifers.",
] as const;

function joinSection(title: string, lines: readonly string[]): readonly string[] {
  return [title, ...lines, ""];
}

export const SHARED_PROMPT_SECTIONS: readonly string[] = [
  ...joinSection("CANON", WORLD_CANON_LINES),
  ...joinSection("COPY VOCABULARY", COPY_VOCABULARY_LINES),
  ...joinSection("COPY EXAMPLES", COPY_EXAMPLE_LINES),
  ...joinSection("COMEDY VS TRAGEDY", COMEDY_TRAGEDY_LINES),
  ...joinSection("METHOD", METHOD_LINES),
];

export const INCIDENT_PROMPT_SECTIONS: readonly string[] = joinSection(
  "INCIDENT SURFACE",
  INCIDENT_LINES,
);

export const OPERATOR_IDENTITY_PROMPT_SECTIONS: readonly string[] = joinSection(
  "OPERATOR IDENTITY SURFACE",
  OPERATOR_IDENTITY_LINES,
);
