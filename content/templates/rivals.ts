// Aggregates runtime-ready rival records.
//
// A new rival is a single data slice:
// - add one file in content/templates/rival-records/
// - include only the runtime fields from schema.ts
// - add the shipped leader portrait and insignia under public/data/rivals/<slug>/
// - export the record from content/templates/rival-records/index.ts
//
// Per-rival records live in content/templates/rival-records/.

import { rivalRecords } from "./rival-records";

import type {
  ReadyToWireRivalRecord,
  RivalMoveEffect,
  RivalMoveEffectKind,
  RivalMoveEffectTargetRef,
  RivalMoveFamily,
  RivalMoveTemplate,
  RivalNarrativeProfile,
  RivalRecord,
} from "./rival-records/schema";

export type {
  ReadyToWireRivalRecord,
  RivalAssetPaths,
  RivalCopySurface,
  RivalLeaderProfile,
  RivalMoveChoiceTemplate,
  RivalMoveEffect,
  RivalMoveEffectKind,
  RivalMoveEffectTargetRef,
  RivalMoveFamily,
  RivalMoveTemplate,
  RivalNarrativeProfile,
  RivalPressureLane,
  RivalRecord,
} from "./rival-records/schema";

export interface RivalRecordValidationIssue {
  rivalId: string;
  message: string;
}

export { rivalRecords };

export const rivalRecordById: ReadonlyMap<string, RivalRecord> = new Map(
  rivalRecords.map((rival) => [rival.id, rival]),
);

export const readyToWireRivals: readonly ReadyToWireRivalRecord[] = rivalRecords;

export const readyToWireRivalById: ReadonlyMap<string, ReadyToWireRivalRecord> = new Map(
  readyToWireRivals.map((rival) => [rival.id, rival]),
);

const SUPPORTED_MOVE_FAMILIES: ReadonlySet<RivalMoveFamily> = new Set([
  "contract_challenge",
  "public_comparison",
  "sponsor_interference",
  "recruitment_market_loss",
  "site_arrival",
  "press_gravity",
]);

const SUPPORTED_EFFECT_KINDS: ReadonlySet<RivalMoveEffectKind> = new Set([
  "morale_delta",
  "loyalty_delta",
  "treasury_delta",
  "reputation_delta",
  "intel_delta",
  "team_cohesion_delta",
  "contract_pressure_delta",
  "faction_relationship_delta",
  "public_pressure_delta",
]);

function isSupportedTargetRef(target: RivalMoveEffectTargetRef): boolean {
  return target === "guild" || target === "team" || target.startsWith("faction:");
}

const SUPPORTED_PRESSURE_LANES: ReadonlySet<string> = new Set([
  "prestige",
  "labor-market",
  "sponsor-network",
  "hybrid",
]);

export function validateRivalRecords(
  records: readonly RivalRecord[] = rivalRecords,
): RivalRecordValidationIssue[] {
  const issues: RivalRecordValidationIssue[] = [];
  const seenIds = new Set<string>();
  const requiredTopLevelFields: Array<keyof RivalRecord> = ["id", "guildName", "shortDisplayName"];

  records.forEach((record) => {
    if (seenIds.has(record.id)) {
      issues.push({ rivalId: record.id, message: "Duplicate rival id." });
    } else {
      seenIds.add(record.id);
    }

    requiredTopLevelFields.forEach((field) => {
      const value = record[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        issues.push({ rivalId: record.id, message: `${field} must be a non-empty string.` });
      }
    });

    if (!SUPPORTED_PRESSURE_LANES.has(record.pressureLane)) {
      issues.push({
        rivalId: record.id,
        message: `pressureLane ${record.pressureLane} is not a supported value.`,
      });
    }

    if (record.copy.currentRivalOneLiner.trim().length === 0) {
      issues.push({
        rivalId: record.id,
        message: "copy.currentRivalOneLiner must be non-empty.",
      });
    }

    if (record.leader.name.trim().length === 0) {
      issues.push({
        rivalId: record.id,
        message: "leader.name must be non-empty.",
      });
    }

    validateRecordAssetPaths(record, issues);
    validateNarrativeProfile(record.id, record.narrativeProfile, issues);
    validateMoves(record.id, record.moves, issues);
  });

  return issues;
}

function validateRecordAssetPaths(record: RivalRecord, issues: RivalRecordValidationIssue[]): void {
  const assetPaths = [
    ["leaderPortrait", record.assetPaths.leaderPortrait],
    ["insignia", record.assetPaths.insignia],
  ] as const;

  assetPaths.forEach(([field, assetPath]) => {
    if (assetPath.trim().length === 0) {
      issues.push({ rivalId: record.id, message: `assetPaths.${field} must be non-empty.` });
    } else if (!assetPath.startsWith("/data/rivals/")) {
      issues.push({
        rivalId: record.id,
        message: `assetPaths.${field} must live under /data/rivals/.`,
      });
    }
  });
}

function validateNarrativeProfile(
  rivalId: string,
  profile: RivalNarrativeProfile,
  issues: RivalRecordValidationIssue[],
): void {
  const narrativeFields: Array<keyof RivalNarrativeProfile> = [
    "operatingBase",
    "publicPitch",
    "pressureStyle",
    "rivalryFantasy",
    "toneAndVoice",
  ];
  narrativeFields.forEach((field) => {
    if (profile[field].trim().length === 0) {
      issues.push({ rivalId, message: `narrativeProfile.${field} must be non-empty.` });
    }
  });
}

function validateMoves(
  rivalId: string,
  moves: readonly RivalMoveTemplate[],
  issues: RivalRecordValidationIssue[],
): void {
  if (moves.length < 3) {
    issues.push({ rivalId, message: "moves must include at least three templates." });
  }

  const seenMoveIds = new Set<string>();
  moves.forEach((move) => {
    if (seenMoveIds.has(move.id)) {
      issues.push({ rivalId, message: `moves include duplicate id ${move.id}.` });
    } else {
      seenMoveIds.add(move.id);
    }

    if (!SUPPORTED_MOVE_FAMILIES.has(move.family)) {
      issues.push({ rivalId, message: `move ${move.id} has unsupported family ${move.family}.` });
    }

    if (move.weight <= 0) {
      issues.push({ rivalId, message: `move ${move.id} weight must be positive.` });
    }

    if (move.cooldownMinutes <= 0) {
      issues.push({ rivalId, message: `move ${move.id} cooldownMinutes must be positive.` });
    }

    if (move.briefingTemplate.trim().length === 0) {
      issues.push({ rivalId, message: `move ${move.id} briefingTemplate must be non-empty.` });
    }

    if (move.choices.length < 2 || move.choices.length > 3) {
      issues.push({ rivalId, message: `move ${move.id} must have two or three choices.` });
    }

    const seenChoiceIds = new Set<string>();
    move.choices.forEach((choice) => {
      if (seenChoiceIds.has(choice.choiceId)) {
        issues.push({
          rivalId,
          message: `move ${move.id} includes duplicate choiceId ${choice.choiceId}.`,
        });
      } else {
        seenChoiceIds.add(choice.choiceId);
      }

      if (choice.label.trim().length === 0) {
        issues.push({
          rivalId,
          message: `move ${move.id} choice ${choice.choiceId} label must be non-empty.`,
        });
      }
      if (choice.description.trim().length === 0) {
        issues.push({
          rivalId,
          message: `move ${move.id} choice ${choice.choiceId} description must be non-empty.`,
        });
      }
      if (choice.consequenceSummary.trim().length === 0) {
        issues.push({
          rivalId,
          message: `move ${move.id} choice ${choice.choiceId} consequenceSummary must be non-empty.`,
        });
      }
      if (choice.effects.length === 0) {
        issues.push({
          rivalId,
          message: `move ${move.id} choice ${choice.choiceId} must have at least one effect.`,
        });
      }
      choice.effects.forEach((effect, effectIndex) => {
        validateMoveEffect(rivalId, move.id, choice.choiceId, effect, effectIndex, issues);
      });
    });
  });
}

function validateMoveEffect(
  rivalId: string,
  moveId: string,
  choiceId: string,
  effect: RivalMoveEffect,
  effectIndex: number,
  issues: RivalRecordValidationIssue[],
): void {
  const location = `move ${moveId} choice ${choiceId} effect[${effectIndex}]`;
  if (!SUPPORTED_EFFECT_KINDS.has(effect.kind)) {
    issues.push({ rivalId, message: `${location} has unsupported kind ${effect.kind}.` });
  }
  if (!isSupportedTargetRef(effect.targetRef)) {
    issues.push({
      rivalId,
      message: `${location} has unsupported targetRef ${effect.targetRef}.`,
    });
  }
  if (!Number.isFinite(effect.value)) {
    issues.push({ rivalId, message: `${location} value must be a finite number.` });
  }
}
