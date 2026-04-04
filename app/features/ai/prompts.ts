import type { AiGenerationSurface } from "./types";
import type { IncidentFramingPayload, OperatorIdentityPayload } from "./schemas";

function formatTag(tag: string): string {
  return tag.includes(":") ? tag.slice(tag.indexOf(":") + 1).replaceAll("_", " ") : tag;
}

function formatMinuteOfDay(minuteOfDay: number): string {
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minutes = String(minuteOfDay % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function buildSystemPrompt(surface: AiGenerationSurface): string {
  switch (surface) {
    case "incident-framing":
      return [
        "ROLE",
        "You write interruption copy for Ascension, a management sim set in New York City in 2026.",
        "",
        "WORLD",
        "- Dungeons appeared in 2020 and are now a dangerous licensed industry.",
        "- Guilds are small businesses, not armies, heroes, or government units.",
        "- The tone is workplace comedy under supernatural pressure.",
        "- Humor comes from bureaucracy, labor friction, logistics, and dry institutional framing.",
        "- Death and serious injury are treated plainly and without jokes.",
        "",
        "TASK",
        "- Use the provided structured gameplay context to invent a specific narrative incident.",
        "- You may invent the precipitating office drama, operational absurdity, and social texture.",
        "- You must not invent new operators, new gameplay outcomes, or hidden modifiers.",
        "- Keep the deterministic consequences aligned with the provided effect bundles.",
        "",
        "STYLE",
        "- Write in grounded present-tense managerial language.",
        "- Avoid epic, military, prophecy, fantasy-RPG, or anime framing.",
        "- Prefer incident-report language, small-business pressure, and NYC workplace specificity.",
        "- Operators are employees with powers, not adventurers.",
        "",
        "OUTPUT RULES",
        "- Return valid JSON only.",
        "- Do not include markdown, commentary, or extra keys.",
        "- Keep the title short and report-like.",
        "- Keep the briefing to 2-4 sentences.",
        "- Return exactly one choice object for each provided choiceId.",
      ].join("\n");
    case "operator-identity":
      return [
        "ROLE",
        "You generate structured recruit identity packets for Ascension.",
        "",
        "WORLD",
        "- The game is set in New York City in 2026 after dungeons became a licensed labor industry.",
        "- Operators are employees first: skilled, pressured, and shaped by workplace reality.",
        "- Guilds are scrappy businesses dealing with staffing, paperwork, risk, and dungeon logistics.",
        "- The tone is grounded workplace drama with dry humor, not epic heroism or destiny fiction.",
        "- Operators should read as authored people, not random anime archetypes or rarity gimmicks.",
        "",
        "TASK",
        "- Starting from the provided deterministic fallback packet, produce a stronger recruit identity packet.",
        "- Keep the fixed role exactly as provided.",
        "- Choose only approved specialty tags, appearance recipe ids, and visible gear ids from the supplied catalogs.",
        "- Use preferences and persona text to make the recruit feel specific, employable, and socially legible.",
        "- The output must remain safe for deterministic simulation and rendering.",
        "",
        "STYLE",
        "- Ground the recruit in labor-market realism, small-business pressure, and NYC workplace texture.",
        "- Keep persona writing concise, specific, and human.",
        "- Avoid prophecy, chosen-one language, military hero framing, or exaggerated JRPG diction.",
        "",
        "HARD CONSTRAINTS",
        "- Do not invent ids, tags, parts, recipes, roles, ranks, powers, or mechanics.",
        "- Do not change the recruit name or role.",
        "- Do not output explanations, prose outside JSON, or keys not requested.",
        "- Persona hooks must be short, concrete, and usable by future narrative systems.",
        "",
        "OUTPUT RULES",
        "- Return valid JSON only.",
        "- Keep personaSummary to one sentence.",
        "- Keep personaHooks short.",
      ].join("\n");
    default:
      return "Respond with valid JSON only.";
  }
}

function buildIncidentOperatorLines(payload: IncidentFramingPayload): string[] {
  return payload.operators.map((operator) => {
    const preferenceSummary = [
      `risk ${Math.round(operator.preferences.riskTolerance)}`,
      `reward ${Math.round(operator.preferences.rewardFocus)}`,
      `recovery ${Math.round(operator.preferences.recoveryBias)}`,
      `social ${Math.round(operator.preferences.socialBias)}`,
      `training ${Math.round(operator.preferences.trainingBias)}`,
      `comfort ${Math.round(operator.preferences.comfortBias)}`,
    ].join(", ");

    return [
      `- ${operator.name} (${formatTag(operator.roleTag)}, ${formatTag(operator.attunementTag)}, rank ${operator.rank.toUpperCase()})`,
      `  specialty: ${formatTag(operator.specialtyTag)}`,
      `  traits: ${operator.traits.map((trait) => formatTag(trait)).join(", ") || "none"}`,
      `  morale ${Math.round(operator.morale.current)}/${Math.round(operator.morale.baseline)}, loyalty ${Math.round(operator.loyalty.current)}/${Math.round(operator.loyalty.baseline)}`,
      `  needs: stress ${Math.round(operator.needs.stress)}, fatigue ${Math.round(operator.needs.fatigue)}, hunger ${Math.round(operator.needs.hunger)}`,
      `  injury: severity ${Math.round(operator.injury.severity)}, recovery ${Math.round(operator.injury.recoveryHoursRemaining)}h, treated ${operator.injury.treated ? "yes" : "no"}`,
      `  preferences: ${preferenceSummary}`,
      `  preferred missions: ${operator.preferences.preferredMissionTags.map((tag) => formatTag(tag)).join(", ") || "none"}`,
    ].join("\n");
  });
}

function buildIncidentChoiceLines(payload: IncidentFramingPayload): string[] {
  return payload.choices.map((choice) => {
    const effects =
      choice.deterministicEffects.length > 0
        ? choice.deterministicEffects
            .map(
              (effect) =>
                `${effect.kind} ${effect.targetRef} ${effect.value > 0 ? "+" : ""}${effect.value}`,
            )
            .join("; ")
        : "no immediate deterministic effect";

    return [
      `- choiceId: ${choice.choiceId}`,
      `  current label: ${choice.defaultLabel}`,
      `  current description: ${choice.defaultDescription}`,
      `  current consequence summary: ${choice.defaultConsequenceSummary}`,
      `  deterministic effects: ${effects}`,
    ].join("\n");
  });
}

function buildOperatorIdentityRecipeLines(payload: OperatorIdentityPayload): string[] {
  return payload.allowedRecipes.map((recipe) => {
    const visibleGear = payload.allowedVisibleGearByRecipe.find(
      (entry) => entry.recipeId === recipe.id,
    );
    return [
      `- ${recipe.id} (${recipe.name})`,
      `  silhouette: ${recipe.bodySilhouette}`,
      `  palette: ${recipe.palette}`,
      `  skin tone: ${recipe.skinTone}`,
      `  approved weapon ids: ${visibleGear?.weaponPartIds.join(", ") || "none"}`,
      `  approved outfit overlay ids: ${visibleGear?.outfitOverlayPartIds.join(", ") || "none"}`,
      `  approved accessory ids: ${visibleGear?.accessoryPartIds.join(", ") || "none"}`,
    ].join("\n");
  });
}

function buildOperatorIdentityGearLines(
  parts: OperatorIdentityPayload["gearCatalog"]["weapon"],
): string[] {
  return parts.map((part) => `- ${part.id} (${part.rarity}; ${part.tags.join(", ")})`);
}

export function buildUserPrompt(
  surface: AiGenerationSurface,
  payload: Record<string, unknown>,
): string {
  switch (surface) {
    case "incident-framing": {
      const p = payload as IncidentFramingPayload;
      const relationshipLines = p.relationship
        ? [
            "RELATIONSHIP",
            `- ${p.relationship.operatorAId} <> ${p.relationship.operatorBId}`,
            `- trust ${Math.round(p.relationship.trust)}, friction ${Math.round(p.relationship.friction)}, familiarity ${Math.round(p.relationship.familiarity)}, recent shared outcome ${Math.round(p.relationship.recentSharedOutcome)}`,
            `- history tags: ${p.relationship.historyTags.map((tag) => formatTag(tag)).join(", ") || "none"}`,
            "",
          ]
        : [];
      const roomLines = p.room
        ? [
            "ROOM",
            `- ${p.room.name} (${p.room.templateId}, ${formatTag(p.room.functionTag)})`,
            ...(p.room.cultureSummary ? [`- culture summary: ${p.room.cultureSummary}`] : []),
            ...(p.room.cultureSignals && p.room.cultureSignals.length > 0
              ? [`- culture signals: ${p.room.cultureSignals.join(", ")}`]
              : []),
            "",
          ]
        : [];

      return [
        "CONTEXT",
        `Guild: ${p.guildName}`,
        `Building: ${p.buildingName} (${p.buildingId})`,
        `Time: day ${p.dayNumber}, ${formatMinuteOfDay(p.minuteOfDay)}`,
        "",
        "INCIDENT",
        `- incident id: ${p.incidentId}`,
        `- template id: ${p.templateId}`,
        `- template name: ${p.templateName}`,
        `- category: ${formatTag(p.category)}`,
        `- trigger family: ${formatTag(p.triggerFamily)}`,
        `- tags: ${p.tags.map((tag) => formatTag(tag)).join(", ") || "none"}`,
        `- subject summary: ${p.subjectSummary}`,
        "",
        "OPERATORS",
        ...buildIncidentOperatorLines(p),
        "",
        ...relationshipLines,
        ...roomLines,
        "CHOICES",
        ...buildIncidentChoiceLines(p),
        "",
        "RETURN THIS JSON SHAPE",
        `{
  "title": "short incident title",
  "briefing": "2-4 sentence briefing",
  "choices": [
    {
      "choiceId": "must exactly match provided choiceId",
      "label": "short label",
      "description": "one sentence describing the managerial action",
      "consequenceSummary": "one sentence matching the deterministic effects",
      "resolutionSummary": "one sentence in past tense describing the aftermath if that choice is taken"
    }
  ]
}`,
      ].join("\n");
    }
    case "operator-identity": {
      const p = payload as OperatorIdentityPayload;

      return [
        "CONTEXT",
        `Guild: ${p.guildName}`,
        `Building: ${p.buildingName}`,
        `Day: ${p.dayNumber}`,
        "",
        "RECRUIT",
        `- candidate id: ${p.candidateId}`,
        `- name: ${p.name}`,
        `- fixed role: ${formatTag(p.roleTag)}`,
        `- quality: ${Math.round(p.quality)}`,
        `- expected loyalty: ${Math.round(p.expectedLoyalty)}`,
        "",
        "DETERMINISTIC FALLBACK PACKET",
        `- specialty: ${formatTag(p.fallbackIdentity.specialtyTag)}`,
        `- recipe: ${p.fallbackIdentity.appearance.presetId}`,
        `- visible gear: ${JSON.stringify(p.fallbackIdentity.appearance.visibleGear ?? {})}`,
        `- preferences: ${JSON.stringify(p.fallbackIdentity.preferences)}`,
        `- persona summary: ${p.fallbackIdentity.personaSummary}`,
        `- persona hooks: ${p.fallbackIdentity.personaHooks.join(" | ")}`,
        "",
        "APPROVED SPECIALTY TAGS",
        ...p.allowedSpecialtyTags.map((tag) => `- ${tag}`),
        "",
        "APPROVED PREFERRED MISSION TAGS",
        ...p.allowedPreferredMissionTags.map((tag) => `- ${tag}`),
        "",
        "APPROVED RECIPES AND COMPATIBLE VISIBLE GEAR",
        ...buildOperatorIdentityRecipeLines(p),
        "",
        "VISIBLE GEAR CATALOG",
        "WEAPONS",
        ...buildOperatorIdentityGearLines(p.gearCatalog.weapon),
        "",
        "OUTFIT OVERLAYS",
        ...buildOperatorIdentityGearLines(p.gearCatalog.outfitOverlay),
        "",
        "ACCESSORIES",
        ...buildOperatorIdentityGearLines(p.gearCatalog.accessory),
        "",
        "RETURN THIS JSON SHAPE",
        `{
  "specialtyTag": "must be one approved specialty tag",
  "appearance": {
    "presetId": "must be one approved recipe id",
    "visibleGear": {
      "weaponPartId": "optional approved weapon id for the chosen recipe",
      "outfitOverlayPartId": "optional approved outfit overlay id for the chosen recipe",
      "accessoryPartId": "optional approved accessory id for the chosen recipe"
    }
  },
  "preferences": {
    "riskTolerance": 0,
    "rewardFocus": 0,
    "recoveryBias": 0,
    "socialBias": 0,
    "trainingBias": 0,
    "comfortBias": 0,
    "preferredMissionTags": ["approved mission tag"]
  },
  "personaSummary": "one sentence",
  "personaHooks": ["short hook", "short hook"]
}`,
      ].join("\n");
    }
    default:
      return JSON.stringify(payload);
  }
}
