// Aggregates authored rival records and exposes the slim ready-to-wire slice
// that later gameplay work should consume.
//
// Rival authoring lifecycle:
// - in-progress rivals may keep transient designNotes until assets are locked
// - ready-to-wire rivals should be reduced to stable ids, copy, pressure
//   identity, and shipped asset paths only
//
// Per-rival records live in content/templates/rival-records/.

import { rivalRecords } from "./rival-records";

import type {
  ReadyToWireRivalRecord,
  RivalAuthoringRecord,
  RivalRecord,
  RivalStatus,
} from "./rival-records/schema";

export type {
  ReadyToWireRivalRecord,
  RivalAssetPaths,
  RivalAuthoringRecord,
  RivalCopySurface,
  RivalDesignNotes,
  RivalLeaderProfile,
  RivalParentGuild,
  RivalPressureLane,
  RivalRecord,
  RivalStatus,
} from "./rival-records/schema";

export interface RivalRecordValidationIssue {
  rivalId: string;
  message: string;
}

export { rivalRecords };

const typedRivalRecords = rivalRecords as unknown as readonly RivalRecord[];

export const rivalRecordById: ReadonlyMap<string, RivalRecord> = new Map(
  typedRivalRecords.map((rival) => [rival.id, rival]),
);

export const readyToWireRivals = typedRivalRecords.filter(
  (rival): rival is ReadyToWireRivalRecord => rival.status === "ready-to-wire",
);

export const readyToWireRivalById: ReadonlyMap<string, ReadyToWireRivalRecord> = new Map(
  readyToWireRivals.map((rival) => [rival.id, rival]),
);

export function validateRivalRecords(
  records: readonly RivalRecord[] = typedRivalRecords,
): RivalRecordValidationIssue[] {
  const issues: RivalRecordValidationIssue[] = [];
  const seenIds = new Set<string>();
  const requiredTopLevelFields: Array<keyof RivalRecord> = [
    "guildName",
    "shortDisplayName",
    "districtAnchor",
    "districtIdHint",
    "baseLocation",
    "publicPitch",
    "internalSummary",
    "pressureStyle",
    "rivalryFantasy",
    "toneAndVoice",
  ];

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

    if (record.moveFamilyAffinities.length === 0) {
      issues.push({
        rivalId: record.id,
        message: "moveFamilyAffinities must include at least one move-family note.",
      });
    }
    record.moveFamilyAffinities.forEach((affinity, index) => {
      if (affinity.trim().length === 0) {
        issues.push({
          rivalId: record.id,
          message: `moveFamilyAffinities[${index}] must be non-empty.`,
        });
      }
    });

    if (record.copy.leaderboardName.trim().length === 0) {
      issues.push({ rivalId: record.id, message: "copy.leaderboardName must be non-empty." });
    }
    if (record.copy.dossierOneLiner.trim().length === 0) {
      issues.push({ rivalId: record.id, message: "copy.dossierOneLiner must be non-empty." });
    }
    if (record.copy.currentRivalOneLiner.trim().length === 0) {
      issues.push({
        rivalId: record.id,
        message: "copy.currentRivalOneLiner must be non-empty.",
      });
    }
    if (record.copy.publicBlurb.trim().length === 0) {
      issues.push({ rivalId: record.id, message: "copy.publicBlurb must be non-empty." });
    }
    if (record.copy.internalAuthorNote.trim().length === 0) {
      issues.push({
        rivalId: record.id,
        message: "copy.internalAuthorNote must be non-empty.",
      });
    }

    const hasBelievableFullName = record.leader.fullName.trim().split(/\s+/).length >= 2;
    const isExplicitNonHumanPrincipal = /\bandroid\b|\bnon-human\b/i.test(record.leader.background);
    if (!hasBelievableFullName && !isExplicitNonHumanPrincipal) {
      issues.push({
        rivalId: record.id,
        message: "leader.fullName must include a believable full name.",
      });
    }

    if (record.interruptionCopySamples.length === 0) {
      issues.push({
        rivalId: record.id,
        message: "interruptionCopySamples must include at least one sample.",
      });
    }
    record.interruptionCopySamples.forEach((sample, index) => {
      if (sample.trim().length === 0) {
        issues.push({
          rivalId: record.id,
          message: `interruptionCopySamples[${index}] must be non-empty.`,
        });
      }
    });

    validateRecordAssetPaths(record, issues);

    const status = record.status as RivalStatus;
    const rivalId = record.id;
    if (status === "ready-to-wire") {
      if (!record.assetsShipped) {
        issues.push({
          rivalId,
          message: "ready-to-wire rivals must have shipped runtime assets.",
        });
      }
      return;
    }

    validateAuthoringRecord(record as RivalAuthoringRecord, issues);
  });

  return issues;
}

function validateRecordAssetPaths(record: RivalRecord, issues: RivalRecordValidationIssue[]): void {
  if (record.assetPaths === null) {
    const rivalId = record.id;
    const status = record.status as RivalStatus;
    if (status === "ready-to-wire") {
      issues.push({
        rivalId,
        message: "ready-to-wire rivals must include runtime asset paths.",
      });
    }
    return;
  }

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

function validateAuthoringRecord(
  record: RivalAuthoringRecord,
  issues: RivalRecordValidationIssue[],
): void {
  const designNoteFields: Array<keyof RivalAuthoringRecord["designNotes"]> = [
    "visualBrandingNotes",
    "leaderPortraitBrief",
    "guildInsigniaBrief",
    "dossierMotif",
  ];

  designNoteFields.forEach((field) => {
    const value = record.designNotes[field];
    if (value.trim().length === 0) {
      issues.push({
        rivalId: record.id,
        message: `designNotes.${field} must be non-empty before a rival leaves authoring.`,
      });
    }
  });

  if (record.assetsShipped) {
    issues.push({
      rivalId: record.id,
      message: "Only ready-to-wire rivals may mark assetsShipped as true.",
    });
  }
}
