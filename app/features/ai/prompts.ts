import type { AiGenerationSurface } from "./types";
import type { IncidentFramingPayload, OperatorIdentityPayload } from "./schemas";
import {
  INCIDENT_PROMPT_SECTIONS,
  OPERATOR_IDENTITY_PROMPT_SECTIONS,
  SHARED_PROMPT_SECTIONS,
} from "./prompt-grounding";

export function buildSystemPrompt(surface: AiGenerationSurface): string {
  switch (surface) {
    case "incident-framing":
      return [
        "ROLE",
        "You write structured interruption copy for Ascension, a workplace comedy about running a licensed dungeon-clearance guild out of a bodega in 2026 New York City.",
        "",
        ...SHARED_PROMPT_SECTIONS,
        ...INCIDENT_PROMPT_SECTIONS,
        "TASK",
        "- Write one grounded incident packet on top of the provided structured gameplay context.",
        "- Keep every deterministic consequence aligned with the provided effect bundles and choice ids.",
        "- Make the room, workplace pressure, and social texture feel specific without inventing hidden facts.",
        "",
        "STEP ORDER",
        "1. Absorb the deterministic facts: incident template, operators, relationship, room, building, choice ids, and effects.",
        "2. Pick one grounded workplace angle (staffing tension, compliance friction, room culture, scheduling pressure, or relationship static).",
        "3. Anchor the framing in small-business operations. Reference concrete physical detail when the room or building is named.",
        "4. Rewrite each provided choice so it reads like a management action while preserving its deterministic meaning. Produce exactly one choice object per provided choiceId.",
        "5. Check the comedy-vs-tragedy mode against the incident category and tags, and adjust the register accordingly.",
        "6. Run the self-check before emitting.",
        "",
        "SELF-CHECK BEFORE EMITTING",
        "- No forbidden word appears anywhere in the output, even inside quotes or denials.",
        "- Title is short, report-like, and does not end with ! or ?.",
        "- Briefing is 2 to 4 sentences, present tense unless recapping.",
        "- Every provided choiceId appears exactly once. No extra choiceIds.",
        "- No prose, markdown, code fences, or commentary outside the JSON object.",
        "",
        "OUTPUT CONTRACT",
        "- Emit exactly one JSON object matching the requested shape. Nothing else.",
        "- Do not prepend or append explanations, apologies, markdown, or code fences.",
        "- Do not invent, rename, or omit keys. Do not duplicate choiceIds.",
      ].join("\n");
    case "operator-identity":
      return [
        "ROLE",
        "You generate structured recruit identity packets for Ascension, a workplace comedy about running a licensed dungeon-clearance guild out of a bodega in 2026 New York City.",
        "",
        ...SHARED_PROMPT_SECTIONS,
        ...OPERATOR_IDENTITY_PROMPT_SECTIONS,
        "TASK",
        "- Starting from the deterministic fallback packet, produce a stronger but still safe recruit identity packet.",
        "- Keep the fixed role, approved catalogs, and bounded preference model exactly within the provided contract.",
        "- Make the recruit feel like someone a stressed guild manager might realistically hire in 2026 NYC.",
        "",
        "STEP ORDER",
        "1. Anchor on the fixed name, role, fallback packet, and approved catalogs.",
        "2. Pick one coherent workplace read on the candidate instead of a pile of disconnected traits.",
        "3. Select only approved specialty, recipe, and gear ids that fit that read.",
        "4. Tune preferences and persona text so the packet is concrete, employable, and concise.",
        "5. Run the self-check before emitting.",
        "",
        "HARD CONSTRAINTS",
        "- Do not invent ids, tags, parts, recipes, roles, ranks, powers, or mechanics.",
        "- Do not change the recruit name or role.",
        "- Persona hooks must be short, concrete, and usable by future narrative systems.",
        "",
        "SELF-CHECK BEFORE EMITTING",
        "- No forbidden word appears anywhere in the output, even inside quotes or denials.",
        "- specialtyTag is drawn from allowedSpecialtyTags.",
        "- appearance.presetId is drawn from allowedRecipes, and any visible gear id is drawn from the matching recipe's allowed list.",
        "- Every preferredMissionTags entry is drawn from allowedPreferredMissionTags.",
        "- personaSummary is exactly one sentence.",
        "- personaHooks contain 2 to 4 short hooks.",
        "- No prose, markdown, code fences, or commentary outside the JSON object.",
        "",
        "OUTPUT CONTRACT",
        "- Emit exactly one JSON object matching the requested shape. Nothing else.",
        "- Do not prepend or append explanations, apologies, markdown, or code fences.",
        "- Do not invent, rename, or omit keys.",
      ].join("\n");
    default:
      return "Respond with one JSON object only. No prose, no markdown, no code fences.";
  }
}

function buildIncidentPromptPayload(payload: IncidentFramingPayload): Record<string, unknown> {
  return {
    guild: payload.guildName,
    building: payload.buildingName,
    day: payload.dayNumber,
    minuteOfDay: payload.minuteOfDay,
    incident: {
      id: payload.incidentId,
      templateId: payload.templateId,
      templateName: payload.templateName,
      category: payload.category,
      triggerFamily: payload.triggerFamily,
      tags: payload.tags,
      subjectSummary: payload.subjectSummary,
    },
    operators: payload.operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      roleTag: operator.roleTag,
      specialtyTag: operator.specialtyTag,
      attunementTag: operator.attunementTag,
      rank: operator.rank,
      traits: operator.traits,
      morale: {
        current: Math.round(operator.morale.current),
        baseline: Math.round(operator.morale.baseline),
      },
      loyalty: {
        current: Math.round(operator.loyalty.current),
        baseline: Math.round(operator.loyalty.baseline),
      },
      needs: {
        stress: Math.round(operator.needs.stress),
        fatigue: Math.round(operator.needs.fatigue),
        hunger: Math.round(operator.needs.hunger),
      },
      injury: {
        severity: Math.round(operator.injury.severity),
        recoveryHoursRemaining: Math.round(operator.injury.recoveryHoursRemaining),
        treated: operator.injury.treated,
      },
    })),
    ...(payload.relationship
      ? {
          relationship: {
            operatorAId: payload.relationship.operatorAId,
            operatorBId: payload.relationship.operatorBId,
            trust: Math.round(payload.relationship.trust),
            friction: Math.round(payload.relationship.friction),
            familiarity: Math.round(payload.relationship.familiarity),
            recentSharedOutcome: Math.round(payload.relationship.recentSharedOutcome),
            historyTags: payload.relationship.historyTags,
          },
        }
      : {}),
    ...(payload.room
      ? {
          room: {
            id: payload.room.id,
            name: payload.room.name,
            functionTag: payload.room.functionTag,
            cultureSummary: payload.room.cultureSummary,
            cultureSignals: payload.room.cultureSignals,
          },
        }
      : {}),
    choices: payload.choices.map((choice) => ({
      choiceId: choice.choiceId,
      label: choice.defaultLabel,
      description: choice.defaultDescription,
      consequenceSummary: choice.defaultConsequenceSummary,
      deterministicEffects: choice.deterministicEffects.map((effect) => ({
        kind: effect.kind,
        targetRef: effect.targetRef,
        value: effect.value,
      })),
    })),
  };
}

export function buildUserPrompt(
  surface: AiGenerationSurface,
  payload: Record<string, unknown>,
): string {
  switch (surface) {
    case "incident-framing": {
      const p = payload as IncidentFramingPayload;

      return [
        "AUTHORITATIVE INCIDENT PAYLOAD",
        "- Treat the JSON below as the complete deterministic context. It is the only source of truth.",
        "- Do not invent hidden state, new operators, new rooms, or new outcomes.",
        "",
        JSON.stringify(buildIncidentPromptPayload(p), null, 2),
        "",
        "WRITING TARGET",
        "- Make the incident feel like a plausible workplace escalation in a supernatural small business.",
        "- Keep the comedy dry and institutional, never whimsical, epic, or heroic.",
        "- Match each choice to the deterministic effect bundle already supplied.",
        "- If the incident category or tags signal death, catastrophic injury, or permanent loss, drop the comedy entirely.",
        "",
        "RETURN THIS JSON SHAPE",
        `{
  "title": "short incident title, 80 characters or fewer, no trailing ! or ?",
  "briefing": "2 to 4 sentences, 520 characters or fewer",
  "choices": [
    {
      "choiceId": "must exactly match provided choiceId",
      "label": "short label, 60 characters or fewer",
      "description": "one sentence describing the managerial action",
      "consequenceSummary": "one sentence matching the deterministic effects",
      "resolutionSummary": "one sentence in past tense describing the aftermath if that choice is taken"
    }
  ]
}`,
        "",
        "FINAL INSTRUCTION",
        "- Emit exactly one JSON object matching that shape. Nothing before it, nothing after it.",
      ].join("\n");
    }
    case "operator-identity": {
      const p = payload as OperatorIdentityPayload;

      return [
        "AUTHORITATIVE RECRUIT PAYLOAD",
        "- Treat the JSON below as the complete deterministic contract and approved catalog. It is the only source of truth.",
        "- Improve specificity without inventing ids, tags, parts, or mechanics outside the payload.",
        "",
        JSON.stringify(p, null, 2),
        "",
        "WRITING TARGET",
        "- Favor a coherent, workplace-legible candidate over a flashy or melodramatic one.",
        "- Treat the fallback packet as the safe baseline; improve specificity without changing the fixed identity contract.",
        "- Lead the persona summary with a concrete workplace read, not a dramatic backstory.",
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
  "personaSummary": "one sentence, 220 characters or fewer",
  "personaHooks": ["short hook", "short hook"]
}`,
        "",
        "FINAL INSTRUCTION",
        "- Emit exactly one JSON object matching that shape. Nothing before it, nothing after it.",
      ].join("\n");
    }
    default:
      return JSON.stringify(payload);
  }
}
