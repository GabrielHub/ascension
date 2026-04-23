/**
 * @deprecated The split regular-attack / skill / ultimate / passive kit model
 * has been replaced by the unified combat-package contract in
 * `content/templates/combat-packages.ts`. This file only re-exports a few
 * shared vocabulary types for backward compatibility with import paths that
 * still reach here. Remove this file once no imports reference it.
 */

export {
  STATUS_IDS,
  TARGETING_RULES,
  type StatusId,
  type TargetingRule,
  type AbilityEffect,
  type CombatStat,
  type CombatRank,
} from "./combat-packages";
