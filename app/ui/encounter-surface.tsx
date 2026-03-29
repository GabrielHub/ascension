import { useState, useMemo, useEffect, useRef } from "react";

import type {
  EncounterView,
  EncounterActorView,
  EncounterStatus,
  InterventionUsageState,
  EncounterActionRecord,
  EncounterActionKind,
  InterventionId,
} from "sim";
import { INTERVENTION_DEFINITIONS } from "sim";
import { OperatorPortrait } from "./operator-portrait";
import { getBossArtPath } from "./boss-art";
import {
  getAbilityMeta,
  getEncounterActorKindMeta,
  getEncounterConditionMeta,
  getNarrativeTagMeta,
  getRoleMeta,
  getStatusMeta,
  getWeaknessTargetMeta,
} from "./_glossary";
import { Tooltip } from "./_tooltip";
import { glassPanelSubtleClass } from "./styles";

// ── Props ─────────────────────────────────────────────────────────────────

export interface EncounterSurfaceProps {
  encounter: EncounterView;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onRetreat: () => void;
  onDismiss: () => void;
  onUseIntervention: (interventionId: string) => void;
  isDevMode: boolean;
}

// ── Intervention definition lookup ────────────────────────────────────────

const INTERVENTION_MAP = new Map(INTERVENTION_DEFINITIONS.map((d) => [d.id, d]));

// ── Helpers ───────────────────────────────────────────────────────────────

function isTerminal(status: EncounterStatus): boolean {
  return (
    status === "victory" || status === "wipe" || status === "retreat" || status === "forced_abort"
  );
}

function statusLabel(status: EncounterStatus): string {
  switch (status) {
    case "pending":
      return "Preparing";
    case "active":
      return "In Progress";
    case "paused":
      return "Paused";
    case "victory":
      return "Victory";
    case "retreat":
      return "Retreated";
    case "wipe":
      return "Wiped";
    case "forced_abort":
      return "Aborted";
  }
}

function formatRank(rank: string): string {
  return rank.toUpperCase();
}

/** Build a map of actorId → label for log formatting. */
function buildActorLabelMap(actors: readonly EncounterActorView[]): Map<string, string> {
  return new Map(actors.map((a) => [a.actorId, a.label]));
}

function getEncounterLogEntryKey(entry: EncounterActionRecord | undefined): string {
  if (!entry) return "";
  return `${entry.timestamp}:${entry.round}:${entry.actorId}:${entry.actionKind}:${entry.abilityId}`;
}

// ── Feed entry formatting ─────────────────────────────────────────────────

interface FeedEntry {
  key: string;
  round: number;
  icon: string;
  text: string;
  detail: string;
  colorClass: string;
  kind: EncounterActionKind;
}

const ACTION_ICONS: Partial<Record<EncounterActionKind, string>> = {
  attack: "\u2694",
  skill: "\u2726",
  ultimate: "\u2605",
  boss_action: "\u26A0",
  intervention: "\u2691",
  phase_transition: "\u26A1",
  summon: "\u271A",
  defeat: "\u2620",
  status_tick: "\u23F1",
  passive_trigger: "\u2727",
  encounter_start: "\u25B6",
  encounter_end: "\u25A0",
  round_start: "\u25CB",
};

function formatFeedEntry(
  entry: EncounterActionRecord,
  index: number,
  actorLabels: Map<string, string>,
): FeedEntry {
  const actor = actorLabels.get(entry.actorId) ?? entry.actorId.split(":").pop() ?? "?";
  const abilityName = entry.abilityId
    ? entry.actionKind === "intervention"
      ? (INTERVENTION_MAP.get(entry.abilityId as InterventionId)?.name ??
        getAbilityMeta(entry.abilityId).label)
      : getAbilityMeta(entry.abilityId).label
    : "";

  let text = "";
  let detail = "";
  let colorClass = "text-silver/60";

  switch (entry.actionKind) {
    case "attack":
      text = `${actor} attacks`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-silver/70";
      break;
    case "skill":
      text = `${actor} \u2014 ${abilityName}`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-frost";
      break;
    case "ultimate":
      text = `${actor} \u2014 ${abilityName}`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-gold";
      break;
    case "boss_action":
      text = `${actor} \u2014 ${abilityName}`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-ember";
      break;
    case "intervention":
      text = `Command: ${abilityName}`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-gold";
      break;
    case "phase_transition":
      text = "Phase Shift";
      detail = "The boss transforms";
      colorClass = "text-smolder";
      break;
    case "summon":
      text = `${actor} arrives`;
      detail = "";
      colorClass = "text-[#e08060]";
      break;
    case "defeat":
      text = `${actor} is down`;
      detail = "";
      colorClass = "text-magma";
      break;
    case "encounter_start":
      text = "Encounter begins";
      detail = "";
      colorClass = "text-gold-dim";
      break;
    case "encounter_end":
      text = "Encounter ends";
      detail = "";
      colorClass = "text-gold-dim";
      break;
    case "round_start":
      text = `Round ${entry.round}`;
      detail = "";
      colorClass = "text-silver/40";
      break;
    default:
      text = `${actor}: ${entry.actionKind}`;
      detail = formatEffects(entry, actorLabels);
      colorClass = "text-silver/50";
  }

  return {
    key: `${entry.round}-${entry.actionKind}-${index}`,
    round: entry.round,
    icon: ACTION_ICONS[entry.actionKind] ?? "\u25AA",
    text,
    detail,
    colorClass,
    kind: entry.actionKind,
  };
}

function formatEffects(entry: EncounterActionRecord, actorLabels: Map<string, string>): string {
  if (entry.effects.length === 0) return "";
  const parts: string[] = [];
  for (const eff of entry.effects) {
    const target = actorLabels.get(eff.targetId) ?? eff.targetId.split(":").pop() ?? "?";
    if (eff.blocked) {
      parts.push(`${target}: blocked`);
    } else if (eff.effectKind === "damage") {
      parts.push(`${target} \u2212${eff.value} HP`);
    } else if (eff.effectKind === "heal") {
      parts.push(`${target} +${eff.value} HP`);
    } else if (eff.effectKind === "shield") {
      parts.push(`${target} +${eff.value} shield`);
    } else if (eff.statusApplied) {
      parts.push(`${target} \u2190 ${getStatusMeta(eff.statusApplied).label}`);
    } else if (eff.statusRemoved) {
      parts.push(`${target}: ${getStatusMeta(eff.statusRemoved).label} removed`);
    } else if (eff.value !== 0) {
      parts.push(`${target} ${eff.value > 0 ? "+" : ""}${eff.value}`);
    }
  }
  return parts.join(" \u00B7 ");
}

// ── Boss HP bar with phase markers ────────────────────────────────────────

function BossHpBar({
  fraction,
  phaseThresholdFractions,
}: {
  fraction: number;
  phaseThresholdFractions: readonly number[];
}) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  const isCritical = fraction <= 0.2 && fraction > 0;
  const thresholdFractions = phaseThresholdFractions.slice(1);

  return (
    <div className="relative">
      <div
        className={`relative h-3.5 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.7)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] ${isCritical ? "enc-hp-critical" : ""}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: isCritical
              ? "linear-gradient(90deg, #b42c1a, #d4541e)"
              : "linear-gradient(90deg, #c8a84c, #8a7040)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s ease infinite",
          }}
        />
        {thresholdFractions.map((thresholdFraction, i) => {
          const thresholdPct = thresholdFraction * 100;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${thresholdPct}%`,
                background:
                  fraction <= thresholdFraction ? "rgba(200,168,76,0.15)" : "rgba(200,168,76,0.35)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Actor HP bar ──────────────────────────────────────────────────────────

function ActorHpBar({
  current,
  max,
  shield,
  variant,
}: {
  current: number;
  max: number;
  shield: number;
  variant: "ally" | "enemy" | "boss";
}) {
  const hpFraction = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const shieldFraction = max > 0 ? Math.max(0, Math.min(1, shield / max)) : 0;
  const isCritical = hpFraction <= 0.25 && hpFraction > 0;

  const barBg = variant === "ally" ? "bg-[#2ea87a]" : variant === "boss" ? "bg-gold" : "bg-magma";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative h-2 flex-1 overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)] ${isCritical ? "enc-hp-critical" : ""}`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${barBg}`}
          style={{ width: `${hpFraction * 100}%` }}
        />
        {shieldFraction > 0 && (
          <div
            className="absolute inset-y-0 rounded-full bg-[rgba(200,168,76,0.35)]"
            style={{
              left: `${hpFraction * 100}%`,
              width: `${Math.min(shieldFraction, 1 - hpFraction) * 100}%`,
            }}
          />
        )}
      </div>
      <span className="min-w-[3.5rem] text-right text-xs tabular-nums text-silver/50">
        {current}/{max}
      </span>
    </div>
  );
}

// ── Operator detail panel (shown when a card is selected) ────────────────

function OperatorDetailPanel({
  actor,
  onClose,
}: {
  actor: EncounterActorView;
  onClose: () => void;
}) {
  const roleMeta = actor.roleTag ? getRoleMeta(actor.roleTag) : null;

  return (
    <div className="enc-detail-panel glass-card-inset flex w-72 shrink-0 flex-col rounded-xl border border-[rgba(200,168,76,0.12)] bg-[rgba(10,10,14,0.85)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(200,168,76,0.08)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          {actor.presetId && actor.operatorId && (
            <OperatorPortrait
              name={actor.label}
              roleTag={actor.roleTag ?? "role:field_lead"}
              presetId={actor.presetId}
              size="roster"
            />
          )}
          <div>
            <h3 className="text-sm font-medium text-silver-bright">{actor.label}</h3>
            {roleMeta && (
              <span className="text-xs uppercase tracking-[0.1em] text-gold-dim">
                {roleMeta.label}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Close ${actor.label} details`}
          className="flex h-6 w-6 items-center justify-center rounded-full text-silver/40 transition-colors hover:bg-[rgba(200,168,76,0.1)] hover:text-silver/70"
          onClick={onClose}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Stats section */}
      <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
        <div className="mb-2">
          <ActorHpBar
            current={actor.currentHp}
            max={actor.maxHp}
            shield={actor.shield}
            variant="ally"
          />
        </div>

        {/* Condition */}
        {actor.condition !== "alive" && (
          <Tooltip content={getEncounterConditionMeta(actor.condition).tip}>
            <span className="inline-block rounded bg-[rgba(180,44,26,0.12)] px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-magma">
              {getEncounterConditionMeta(actor.condition).label}
            </span>
          </Tooltip>
        )}

        {/* Base combat stats */}
        {(actor.baseAttack != null || actor.baseDefense != null || actor.baseSpeed != null) && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {actor.baseAttack != null && (
              <div className="rounded bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-center">
                <div className="text-[0.625rem] uppercase tracking-[0.1em] text-silver/35">ATK</div>
                <div className="text-sm tabular-nums text-silver-bright">{actor.baseAttack}</div>
              </div>
            )}
            {actor.baseDefense != null && (
              <div className="rounded bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-center">
                <div className="text-[0.625rem] uppercase tracking-[0.1em] text-silver/35">DEF</div>
                <div className="text-sm tabular-nums text-silver-bright">{actor.baseDefense}</div>
              </div>
            )}
            {actor.baseSpeed != null && (
              <div className="rounded bg-[rgba(6,6,8,0.5)] px-2 py-1.5 text-center">
                <div className="text-[0.625rem] uppercase tracking-[0.1em] text-silver/35">SPD</div>
                <div className="text-sm tabular-nums text-silver-bright">{actor.baseSpeed}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Abilities section */}
      {(actor.skillId || actor.ultimateId || actor.regularAttackId) && (
        <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
          <h4 className="mb-2 text-[0.6875rem] uppercase tracking-[0.14em] text-silver/40">
            Abilities
          </h4>
          <div className="space-y-1.5">
            {actor.regularAttackId && (
              <AbilityRow id={actor.regularAttackId} kind="Attack" icon="\u2694" />
            )}
            {actor.skillId && <AbilityRow id={actor.skillId} kind="Skill" icon="\u2726" />}
            {actor.ultimateId && <AbilityRow id={actor.ultimateId} kind="Ultimate" icon="\u2605" />}
          </div>
        </div>
      )}

      {/* Passives section */}
      {actor.passiveIds && actor.passiveIds.length > 0 && (
        <div className="border-b border-[rgba(200,168,76,0.06)] px-4 py-3">
          <h4 className="mb-2 text-[0.6875rem] uppercase tracking-[0.14em] text-silver/40">
            Passives
          </h4>
          <div className="space-y-1.5">
            {actor.passiveIds.map((pid) => (
              <AbilityRow key={pid} id={pid} kind="Passive" icon="\u2727" />
            ))}
          </div>
        </div>
      )}

      {/* Active status effects */}
      {actor.activeStatuses.length > 0 && (
        <div className="px-4 py-3">
          <h4 className="mb-2 text-[0.6875rem] uppercase tracking-[0.14em] text-silver/40">
            Status Effects
          </h4>
          <div className="space-y-1">
            {actor.activeStatuses.map((s, i) => {
              const meta = getStatusMeta(s.statusId);
              return (
                <Tooltip key={`${s.statusId}-${i}`} content={meta.tip}>
                  <div className="flex items-center justify-between rounded bg-[rgba(200,168,76,0.04)] px-2 py-1">
                    <span className="text-xs text-gold-dim">{meta.label}</span>
                    <span className="text-xs tabular-nums text-silver/30">
                      {s.remainingDuration} rounds
                    </span>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AbilityRow({ id, kind, icon }: { id: string; kind: string; icon: string }) {
  const meta = getAbilityMeta(id);
  return (
    <div className="flex items-center gap-2 rounded bg-[rgba(6,6,8,0.4)] px-2.5 py-1.5">
      <span className="text-sm leading-none text-silver/50">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-silver-bright">{meta.label}</span>
        <span className="ml-1.5 text-[0.625rem] text-silver/30">{kind}</span>
      </div>
    </div>
  );
}

// ── Squad member card — card-game style ──────────────────────────────────

function SquadMemberCard({
  actor,
  isNextTurn,
  isSelected,
  dealDelay,
  reaction,
  onClick,
}: {
  actor: EncounterActorView;
  isNextTurn: boolean;
  isSelected: boolean;
  dealDelay: number;
  reaction?: "act" | "hit";
  onClick: () => void;
}) {
  const isDown = actor.condition === "incapacitated" || actor.condition === "retreated";
  const roleMeta = actor.roleTag ? getRoleMeta(actor.roleTag) : null;

  const reactionClass =
    reaction === "act" ? "enc-card-act" : reaction === "hit" ? "enc-card-hit" : "";

  return (
    <button
      type="button"
      aria-label={`View details for ${actor.label}`}
      aria-pressed={isSelected}
      className={`enc-squad-card enc-card-deal flex w-36 shrink-0 flex-col text-left ${
        isDown ? "enc-squad-card--down" : ""
      } ${isNextTurn ? "enc-squad-card--active" : ""} ${isSelected ? "enc-squad-card--selected" : ""} ${reactionClass}`}
      style={{ animationDelay: `${dealDelay}ms` }}
      onClick={onClick}
    >
      {/* Top bevel highlight */}
      <div className="enc-squad-card__bevel" />

      {/* Portrait area */}
      <div className="relative flex items-center justify-center px-2 pt-2.5 pb-1.5">
        {actor.presetId && actor.operatorId ? (
          <OperatorPortrait
            name={actor.label}
            roleTag={actor.roleTag ?? "role:field_lead"}
            presetId={actor.presetId}
            size="card"
          />
        ) : (
          <div className="flex h-24 w-[calc(120*6rem/160)] items-center justify-center rounded-lg border border-[rgba(200,168,76,0.06)] bg-[rgba(6,6,8,0.5)]">
            <span className="text-2xl text-silver/20">{actor.label[0]}</span>
          </div>
        )}

        {/* Role tag — top right corner of portrait */}
        {roleMeta && (
          <span className="absolute top-1.5 right-1.5 rounded bg-[rgba(6,6,8,0.7)] px-1 py-0.5 text-[0.5625rem] uppercase tracking-[0.1em] text-gold-dim">
            {roleMeta.label}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="px-2 text-center">
        <span className="block truncate text-sm font-medium text-silver-bright">{actor.label}</span>
      </div>

      {/* HP bar */}
      <div className="mt-1 px-2 pb-2">
        <ActorHpBar
          current={actor.currentHp}
          max={actor.maxHp}
          shield={actor.shield}
          variant="ally"
        />
      </div>

      {/* Condition badge */}
      {actor.condition !== "alive" && (
        <div className="border-t border-[rgba(200,168,76,0.06)] px-2 py-1 text-center">
          <Tooltip content={getEncounterConditionMeta(actor.condition).tip} side="top">
            <span className="text-[0.5625rem] uppercase tracking-[0.1em] text-magma">
              {getEncounterConditionMeta(actor.condition).label}
            </span>
          </Tooltip>
        </div>
      )}

      {/* Status effects */}
      {actor.activeStatuses.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5 border-t border-[rgba(200,168,76,0.06)] px-1.5 py-1">
          {actor.activeStatuses.map((s, i) => {
            const meta = getStatusMeta(s.statusId);
            return (
              <Tooltip key={`${s.statusId}-${i}`} content={meta.tip} side="top">
                <span className="rounded bg-[rgba(200,168,76,0.06)] px-1 py-0.5 text-[0.5625rem] uppercase tracking-[0.04em] text-gold-dim">
                  {meta.label}
                  <span className="ml-0.5 text-silver/25">({s.remainingDuration})</span>
                </span>
              </Tooltip>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── Enemy add/summon card ─────────────────────────────────────────────────

function EnemyCard({ actor }: { actor: EncounterActorView }) {
  const isDown = actor.condition === "incapacitated" || actor.condition === "retreated";

  return (
    <div
      className={`glass-card-inset rounded-lg px-3 py-2 transition-opacity ${isDown ? "opacity-35" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-[#e08060]">{actor.label}</span>
        <Tooltip
          content={
            actor.condition !== "alive"
              ? getEncounterConditionMeta(actor.condition).tip
              : getEncounterActorKindMeta(actor.kind).tip
          }
          side="top"
        >
          <span className="text-xs uppercase tracking-[0.08em] text-silver/35">
            {actor.condition !== "alive"
              ? getEncounterConditionMeta(actor.condition).label
              : getEncounterActorKindMeta(actor.kind).label}
          </span>
        </Tooltip>
      </div>
      <div className="mt-1">
        <ActorHpBar
          current={actor.currentHp}
          max={actor.maxHp}
          shield={actor.shield}
          variant="enemy"
        />
      </div>
    </div>
  );
}

// ── Intervention card ─────────────────────────────────────────────────────

const INTERVENTION_ICONS: Partial<Record<InterventionId, string>> = {
  intel_reveal: "\uD83D\uDD0D",
  emergency_stabilize: "\u2695",
  force_regroup: "\uD83D\uDEE1",
  defensive_posture: "\u2B21",
  extraction_window: "\uD83D\uDEAA",
  consumable_boost: "\u26A1",
};

function InterventionCard({
  intervention,
  onUse,
  disabled,
}: {
  intervention: InterventionUsageState;
  onUse: () => void;
  disabled: boolean;
}) {
  const def = INTERVENTION_MAP.get(intervention.interventionId);
  const noUses = intervention.usesRemaining <= 0;
  const maxUses = def?.usesPerEncounter ?? intervention.usesRemaining;

  return (
    <button
      type="button"
      className="enc-intervention-card flex flex-col items-start gap-1.5 px-3 py-2.5 text-left"
      disabled={disabled || noUses}
      onClick={onUse}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">
            {INTERVENTION_ICONS[intervention.interventionId] ?? "\u2726"}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-silver-bright">
            {def?.name ?? getAbilityMeta(intervention.interventionId).label}
          </span>
        </div>
        {/* Charge pips */}
        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          {Array.from({ length: maxUses }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i < intervention.usesRemaining ? "bg-gold" : "bg-[rgba(200,168,76,0.15)]"
              }`}
            />
          ))}
        </div>
      </div>
      {def?.summary && (
        <p className="text-[0.6875rem] leading-relaxed text-silver/45">{def.summary}</p>
      )}
    </button>
  );
}

// ── Encounter action feed ─────────────────────────────────────────────────

function EncounterFeed({
  entries,
  actors,
}: {
  entries: readonly EncounterActionRecord[];
  actors: readonly EncounterActorView[];
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const actorLabels = useMemo(() => buildActorLabelMap(actors), [actors]);
  const latestEntryKey = getEncounterLogEntryKey(entries[entries.length - 1]);
  const feedEntries = useMemo(
    () => entries.map((e, i) => formatFeedEntry(e, i, actorLabels)).reverse(),
    [entries, actorLabels],
  );

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [latestEntryKey]);

  if (feedEntries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-silver/30">Awaiting first action...</p>
      </div>
    );
  }

  return (
    <div ref={feedRef} className="h-full overflow-y-auto">
      {feedEntries.map((entry, i) => (
        <div
          key={entry.key}
          className="enc-feed-entry border-b border-[rgba(200,168,76,0.03)] px-3 py-2"
          style={{ animationDelay: i === 0 ? "0ms" : undefined }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm leading-none opacity-60">
              {entry.icon}
            </span>
            <div className="min-w-0 flex-1">
              <span className={`text-sm leading-tight ${entry.colorClass}`}>{entry.text}</span>
              {entry.detail && <span className="ml-2 text-xs text-silver/35">{entry.detail}</span>}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-silver/20">R{entry.round}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Trace log (dev only) ──────────────────────────────────────────────────

function TraceLog({ entries }: { entries: readonly EncounterActionRecord[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-card-inset mt-2 rounded-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs uppercase tracking-[0.12em] text-gold-dim"
        onClick={() => setExpanded((v) => !v)}
      >
        <span>Trace Log ({entries.length})</span>
        <span>{expanded ? "collapse" : "expand"}</span>
      </button>

      {expanded && (
        <div className="max-h-40 overflow-y-auto border-t border-[rgba(200,168,76,0.06)] px-3 py-2">
          {entries.length === 0 && <p className="text-xs text-silver/40">No log entries yet.</p>}
          {entries.map((entry, i) => (
            <div
              key={i}
              className="border-b border-[rgba(200,168,76,0.03)] py-0.5 text-[0.6875rem] leading-relaxed text-silver/60"
            >
              <span className="mr-2 tabular-nums text-silver/30">R{entry.round}</span>
              <span className="mr-1 text-silver/50">[{entry.actionKind}]</span>
              <span className="text-silver/70">{entry.actorId}</span>
              {entry.abilityId && <span className="ml-1 text-gold-dim">{entry.abilityId}</span>}
              {entry.effects.length > 0 && (
                <span className="ml-1 text-silver/40">
                  {entry.effects.map((e) => `${e.effectKind}:${e.value}`).join(", ")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Terminal state overlay ────────────────────────────────────────────────

function TerminalOverlay({ status }: { status: EncounterStatus }) {
  if (!isTerminal(status)) return null;

  const isVictory = status === "victory";
  const isWipe = status === "wipe";

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center ${
        isVictory ? "enc-victory-glow" : "enc-defeat-fade"
      }`}
    >
      {/* Tinted veil */}
      <div
        className="absolute inset-0"
        style={{
          background: isVictory
            ? "radial-gradient(ellipse at center, rgba(200,168,76,0.12) 0%, rgba(6,6,8,0.6) 70%)"
            : isWipe
              ? "radial-gradient(ellipse at center, rgba(180,44,26,0.15) 0%, rgba(6,6,8,0.7) 70%)"
              : "radial-gradient(ellipse at center, rgba(42,53,85,0.12) 0%, rgba(6,6,8,0.6) 70%)",
        }}
      />

      {/* Terminal label */}
      <div className="relative z-10 text-center">
        <h2
          className={`font-[family-name:var(--font-display)] text-4xl font-light tracking-[0.25em] uppercase ${
            isVictory ? "text-gold" : isWipe ? "text-magma" : "text-silver/60"
          }`}
          style={{
            textShadow: isVictory
              ? "0 0 40px rgba(200,168,76,0.4)"
              : isWipe
                ? "0 0 40px rgba(180,44,26,0.4)"
                : "none",
          }}
        >
          {statusLabel(status)}
        </h2>
        <p className="mt-3 text-sm uppercase tracking-[0.16em] text-silver/40">
          {isVictory
            ? "The boss has been defeated"
            : isWipe
              ? "All operators are down"
              : status === "retreat"
                ? "Your team has pulled back"
                : "Encounter forcibly terminated"}
        </p>
      </div>
    </div>
  );
}

// ── Chamber backdrop ──────────────────────────────────────────────────────

function ChamberBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base darkness — fully opaque to occlude game chrome */}
      <div className="absolute inset-0 bg-[#060608]" />

      {/* Radial chamber light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(212,84,30,0.04) 0%, transparent 60%)",
        }}
      />

      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,168,76,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,168,76,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Atmospheric particles */}
      <div className="enc-chamber-particle absolute left-[15%] top-[25%] h-1 w-1 rounded-full bg-[rgba(200,168,76,0.15)]" />
      <div
        className="enc-chamber-particle absolute left-[70%] top-[35%] h-0.5 w-0.5 rounded-full bg-[rgba(212,84,30,0.12)]"
        style={{ animationDelay: "3s" }}
      />
      <div
        className="enc-chamber-particle absolute left-[45%] top-[60%] h-1 w-1 rounded-full bg-[rgba(200,168,76,0.1)]"
        style={{ animationDelay: "7s" }}
      />
      <div
        className="enc-chamber-particle absolute left-[85%] top-[50%] h-0.5 w-0.5 rounded-full bg-[rgba(212,84,30,0.1)]"
        style={{ animationDelay: "5s" }}
      />
      <div
        className="enc-chamber-particle absolute left-[25%] top-[70%] h-1 w-1 rounded-full bg-[rgba(200,168,76,0.08)]"
        style={{ animationDelay: "9s" }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,6,8,0.5) 100%)",
        }}
      />
    </div>
  );
}

// ── Boss presence zone ────────────────────────────────────────────────────

function BossPresence({ encounter }: { encounter: EncounterView }) {
  const bossArtPath = getBossArtPath(encounter.bossDefinitionId);
  const bossActor = encounter.actors.find((a) => a.kind === "boss");

  return (
    <div className="enc-boss-rise flex flex-col items-center gap-3">
      {/* Boss portrait */}
      <div className="relative">
        {bossArtPath ? (
          <div className="enc-boss-menace relative">
            <img
              src={bossArtPath}
              alt={encounter.bossName}
              className="h-36 w-auto drop-shadow-[0_0_20px_rgba(212,84,30,0.2)]"
              style={{ imageRendering: "auto" }}
            />
          </div>
        ) : (
          /* Fallback: abstract threat sigil */
          <div className="enc-boss-menace flex h-28 w-28 items-center justify-center rounded-full border border-[rgba(212,84,30,0.15)] bg-[rgba(212,84,30,0.04)]">
            <svg viewBox="0 0 48 48" className="h-14 w-14 text-ember opacity-40">
              <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.4" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" opacity="0.5" />
              <circle cx="30" cy="20" r="1.5" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Boss identity block */}
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-light tracking-[0.18em] text-gold">
          {encounter.bossName}
        </h2>
        <div className="mt-1.5 flex items-center justify-center gap-3">
          <span className="badge badge-ember text-xs">Rank {formatRank(encounter.bossRank)}</span>
          <span className="text-xs uppercase tracking-[0.1em] text-silver/45">
            Phase {encounter.currentPhaseIndex + 1}/{encounter.phaseCount}
          </span>
        </div>
      </div>

      {/* Boss tags */}
      {encounter.bossTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {encounter.bossTags.map((tag) => {
            const meta = getNarrativeTagMeta(tag);
            return (
              <Tooltip key={tag} content={meta.tip} side="bottom">
                <span className="rounded border border-[rgba(212,84,30,0.12)] bg-[rgba(212,84,30,0.04)] px-2 py-0.5 text-xs uppercase tracking-[0.06em] text-ember/70">
                  {meta.label}
                </span>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Boss HP bar */}
      <div className="w-full max-w-md px-4">
        <BossHpBar
          fraction={encounter.bossHpFraction}
          phaseThresholdFractions={encounter.phaseThresholdFractions}
        />
        {bossActor && (
          <div className="mt-1 flex justify-between text-xs tabular-nums text-silver/40">
            <span>
              {bossActor.currentHp} / {bossActor.maxHp}
            </span>
            {bossActor.shield > 0 && (
              <span className="text-gold-dim">+{bossActor.shield} shield</span>
            )}
          </div>
        )}
      </div>

      {/* Boss statuses */}
      {bossActor && bossActor.activeStatuses.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {bossActor.activeStatuses.map((s, i) => {
            const meta = getStatusMeta(s.statusId);
            return (
              <Tooltip key={`${s.statusId}-${i}`} content={meta.tip} side="bottom">
                <span className="rounded border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-1.5 py-0.5 text-xs uppercase tracking-[0.06em] text-gold-dim">
                  {meta.label} ({s.remainingDuration})
                </span>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Encounter controls (prominent play/pause/step) ──────────────────────

function EncounterControls({
  encounter,
  onPause,
  onResume,
  onStep,
  terminal,
  isDevMode,
}: {
  encounter: EncounterView;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  terminal: boolean;
  isDevMode: boolean;
}) {
  if (terminal || !isDevMode) return null;

  const isRunning = encounter.status === "active" || encounter.autoplayEnabled;

  return (
    <div className="flex items-center gap-2">
      {isRunning ? (
        <button
          type="button"
          className="enc-control-btn group flex items-center gap-2 rounded-lg border border-[rgba(200,168,76,0.2)] bg-[rgba(200,168,76,0.06)] px-4 py-2 text-sm font-medium uppercase tracking-[0.1em] text-gold transition-all hover:border-[rgba(200,168,76,0.4)] hover:bg-[rgba(200,168,76,0.12)] hover:shadow-[0_0_20px_rgba(200,168,76,0.1)]"
          onClick={onPause}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
          Pause
        </button>
      ) : (
        <button
          type="button"
          className="enc-control-btn group flex items-center gap-2 rounded-lg border border-[rgba(46,168,122,0.25)] bg-[rgba(46,168,122,0.08)] px-4 py-2 text-sm font-medium uppercase tracking-[0.1em] text-[#2ea87a] transition-all hover:border-[rgba(46,168,122,0.45)] hover:bg-[rgba(46,168,122,0.15)] hover:shadow-[0_0_20px_rgba(46,168,122,0.1)]"
          onClick={onResume}
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
            <path d="M4 2l10 6-10 6z" />
          </svg>
          Resume
        </button>
      )}
      <button
        type="button"
        className="enc-control-btn flex items-center gap-1.5 rounded-lg border border-[rgba(200,168,76,0.12)] bg-[rgba(6,6,8,0.5)] px-3 py-2 text-sm uppercase tracking-[0.1em] text-silver/60 transition-all hover:border-[rgba(200,168,76,0.25)] hover:text-silver/80"
        onClick={onStep}
        disabled={isRunning}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
          <path d="M4 2l6 6-6 6z" />
          <rect x="11" y="2" width="2" height="12" rx="0.5" />
        </svg>
        Step
      </button>
    </div>
  );
}

// ── Main surface ──────────────────────────────────────────────────────────

export function EncounterSurface({
  encounter,
  onPause,
  onResume,
  onStep,
  onRetreat,
  onDismiss,
  onUseIntervention,
  isDevMode,
}: EncounterSurfaceProps) {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  const allies = useMemo(
    () => encounter.actors.filter((a) => a.side === "ally"),
    [encounter.actors],
  );
  const nonBossEnemies = useMemo(
    () => encounter.actors.filter((a) => a.side === "enemy" && a.kind !== "boss"),
    [encounter.actors],
  );
  const terminal = isTerminal(encounter.status);
  const nextActorId = encounter.initiativeQueue[0] ?? null;
  const latestLogEntryKey = getEncounterLogEntryKey(
    encounter.recentLog[encounter.recentLog.length - 1],
  );

  // Track card reaction animations from the latest log entry
  const EMPTY_REACTIONS = useMemo(() => new Map<string, "act" | "hit">(), []);
  const [cardReactions, setCardReactions] = useState(EMPTY_REACTIONS);
  const lastAnimatedLogKey = useRef(latestLogEntryKey);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!latestLogEntryKey || latestLogEntryKey === lastAnimatedLogKey.current) {
      return;
    }
    lastAnimatedLogKey.current = latestLogEntryKey;

    const latest = encounter.recentLog[encounter.recentLog.length - 1];
    if (!latest) return;

    const allyIds = new Set(
      encounter.actors.filter((a) => a.side === "ally").map((a) => a.actorId),
    );
    const next = new Map<string, "act" | "hit">();

    if (allyIds.has(latest.actorId)) {
      next.set(latest.actorId, "act");
    }

    for (const eff of latest.effects) {
      if (eff.effectKind === "damage" && !eff.blocked && allyIds.has(eff.targetId)) {
        next.set(eff.targetId, "hit");
      }
    }

    if (next.size > 0) {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
      setCardReactions(next);
      reactionTimer.current = setTimeout(() => setCardReactions(EMPTY_REACTIONS), 600);
    }

    return () => {
      if (reactionTimer.current) clearTimeout(reactionTimer.current);
    };
  }, [EMPTY_REACTIONS, encounter.actors, encounter.recentLog, latestLogEntryKey]);

  const selectedActor = selectedActorId
    ? (encounter.actors.find((a) => a.actorId === selectedActorId) ?? null)
    : null;

  return (
    <div
      className="enc-backdrop-in fixed inset-0 z-60 flex flex-col"
      data-testid="encounter-surface"
    >
      <ChamberBackdrop />

      {/* Terminal state overlay */}
      <TerminalOverlay status={encounter.status} />

      {/* Content frame */}
      <div
        className={`relative z-10 flex flex-1 flex-col ${terminal ? "pointer-events-none opacity-50" : ""}`}
      >
        {/* ── Top chrome: status bar ──────────────────────────────────── */}
        <header
          className={`${glassPanelSubtleClass} flex items-center gap-4 border-b border-[rgba(200,168,76,0.08)] px-5 py-2.5`}
        >
          <span
            className={`badge ${
              encounter.status === "victory"
                ? "badge-gold"
                : encounter.status === "wipe" || encounter.status === "forced_abort"
                  ? "badge-ember"
                  : "badge-slate"
            }`}
          >
            {statusLabel(encounter.status)}
          </span>

          <div className="flex items-center gap-3">
            <span className="text-sm uppercase tracking-[0.1em] text-silver/50">
              Round{" "}
              <span className="tabular-nums text-silver-bright">{encounter.currentRound}</span>
            </span>
            <span className="text-xs tabular-nums text-silver/30">
              {encounter.elapsedMinutes}m elapsed
            </span>
          </div>

          <div className="flex-1" />

          {/* Weakness hints */}
          {encounter.bossWeaknesses.length > 0 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="text-xs uppercase tracking-[0.1em] text-silver/30">Weak to</span>
              {encounter.bossWeaknesses.map((w, i) => {
                const meta = getWeaknessTargetMeta(w.target);
                return (
                  <Tooltip key={i} content={meta.tip} side="bottom">
                    <span className="text-xs text-frost/70">{meta.label}</span>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Prominent encounter controls */}
          <EncounterControls
            encounter={encounter}
            onPause={onPause}
            onResume={onResume}
            onStep={onStep}
            terminal={terminal}
            isDevMode={isDevMode}
          />
        </header>

        {/* ── Center area: boss + feed + detail panel ──────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Boss presence — top center */}
          <div className="shrink-0 px-5 pt-3 pb-2">
            <BossPresence encounter={encounter} />
          </div>

          {/* Feed + Detail panel + Hostiles row — no flex-grow so it hugs content */}
          <div className="enc-feed-slide flex shrink-0 gap-3 px-5 pb-2">
            {/* Operator detail panel — left side when selected */}
            {selectedActor && (
              <OperatorDetailPanel actor={selectedActor} onClose={() => setSelectedActorId(null)} />
            )}

            {/* Center: Encounter feed (compact, capped height) */}
            <div className="min-w-0 flex-1">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-[0.16em] text-silver/40">
                Encounter Log
              </h3>
              <div className="glass-card-inset max-h-48 overflow-hidden rounded-lg">
                <EncounterFeed entries={encounter.recentLog} actors={encounter.actors} />
              </div>
            </div>

            {/* Right: Non-boss enemies (adds/summons) if present */}
            {nonBossEnemies.length > 0 && (
              <div className="w-48 shrink-0">
                <h3 className="mb-1.5 text-xs font-medium uppercase tracking-[0.16em] text-[#e08060]/60">
                  Hostiles
                </h3>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {nonBossEnemies.map((actor) => (
                    <EnemyCard key={actor.actorId} actor={actor} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom: Squad hand + Command deck ───────────────────────── */}
        <footer
          className={`enc-deck-in ${glassPanelSubtleClass} border-t border-[rgba(200,168,76,0.08)]`}
        >
          {/* Squad card hand */}
          <div className="border-b border-[rgba(200,168,76,0.06)] px-5 py-3">
            <div className="flex items-end justify-center gap-3">
              {allies.map((actor, i) => (
                <SquadMemberCard
                  key={actor.actorId}
                  actor={actor}
                  isNextTurn={actor.actorId === nextActorId}
                  isSelected={actor.actorId === selectedActorId}
                  dealDelay={350 + i * 100}
                  reaction={cardReactions.get(actor.actorId)}
                  onClick={() =>
                    setSelectedActorId((prev) => (prev === actor.actorId ? null : actor.actorId))
                  }
                />
              ))}
              {allies.length === 0 && (
                <p className="py-4 text-sm text-silver/35">No allied operators.</p>
              )}
            </div>
          </div>

          {/* Interventions row */}
          <div className="px-5 py-2.5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {encounter.interventions.map((iv) => (
                <InterventionCard
                  key={iv.interventionId}
                  intervention={iv}
                  onUse={() => onUseIntervention(iv.interventionId)}
                  disabled={terminal || encounter.status === "paused"}
                />
              ))}
            </div>

            {/* Retreat button + dev trace */}
            <div className="mt-2 flex items-center justify-between">
              <div>
                {!terminal && (
                  <button
                    type="button"
                    className="btn-ghost text-sm text-ember"
                    onClick={onRetreat}
                  >
                    Order Retreat
                  </button>
                )}
              </div>

              {/* Dev trace */}
              {isDevMode && (
                <div className="flex-1 pl-4">
                  <TraceLog entries={encounter.recentLog} />
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>

      {/* Terminal state dismiss hint — overlaid on top */}
      {terminal && (
        <div className="absolute inset-x-0 bottom-0 z-40 pb-8 text-center">
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <p className="text-sm uppercase tracking-[0.14em] text-silver/30">
              Outcome recorded. Review the log, then close the encounter.
            </p>
            <button type="button" className="btn-primary" onClick={onDismiss}>
              return to operations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
