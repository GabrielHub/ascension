import { useMemo } from "react";

import {
  OPERATOR_TIPS,
  RAID_TIPS,
  getContractHintMeta,
  getIntelMeta,
  getNarrativeTagMeta,
  getRoleMeta,
  getSpecialtyMeta,
  getWeaknessTargetMeta,
  resolveContributingFactors,
} from "./_glossary";
import { getBossArtPath } from "./boss-art";
import { OperatorPortrait } from "./operator-portrait";
import { RaidEventFeed, RaidFocusFrame } from "./raid-world";
import type { FocusEncounter, FocusOperatorStatus } from "./raid-world/raid-focus-frame";
import type { RaidTeamMarker } from "render";
import { Tooltip } from "./_tooltip";
import { emptyStateClass, emptyStateIconClass, progressBarFillClass } from "./styles";
import {
  rankBadgeClass,
  type ActiveRaidViewModel,
  type ContractResultViewModel,
  type ContractSiteViewModel,
  type OperationsViewModel,
  type OperatorViewModel,
  type PostedContractViewModel,
  type RaidOpportunityViewModel,
  type RaidSummaryViewModel,
  type RosterPressureViewModel,
} from "./view-models";

// ── Shared helpers ────────────────────────────────────────────────────────

function getBoardIntelLabel(boardIntel: PostedContractViewModel["boardIntel"]): string {
  switch (boardIntel.source) {
    case "office":
      return "Office Dossier";
    case "back_office":
      return "Back Office Review";
    default:
      return "Street Board";
  }
}

function getBoardIntelDetail(boardIntel: PostedContractViewModel["boardIntel"]): string {
  switch (boardIntel.quality) {
    case "dossier":
      return "Risk filed, boss rumors cross-checked, and site traits read cleanly before you bid.";
    case "reviewed":
      return "Paperwork is reviewed, but the board still carries blind spots.";
    default:
      return "This is raw board traffic. Expect missing context and thin risk reads.";
  }
}

function getBriefingLabel(briefing: NonNullable<ContractSiteViewModel["briefing"]>): string {
  return briefing.status === "drilled" ? "Team Drilled" : "Team Briefed";
}

function getBriefingDetail(briefing: NonNullable<ContractSiteViewModel["briefing"]>): string {
  return briefing.source === "briefing_room_and_prep"
    ? `Briefing Room and Prep Room are feeding launch notes. Each raid leaves with +${briefing.opportunityIntelBonus} field intel and +${briefing.bossIntelBonus} boss-read progress.`
    : `The Briefing Room is shaping the launch package. Each raid leaves with +${briefing.opportunityIntelBonus} field intel and +${briefing.bossIntelBonus} boss-read progress.`;
}

function ContractPolicySummary({ factors }: { factors: readonly string[] }) {
  const displayFactors = resolveContributingFactors(factors);
  if (displayFactors.length === 0) return null;

  return (
    <div className="relative mt-4 rounded-lg border border-[rgba(200,168,76,0.08)] bg-[rgba(200,168,76,0.04)] px-3 py-3">
      <p className="text-xs uppercase tracking-wider text-gold/60">Management Context</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {displayFactors.map(({ factor, policyMeta, factorMeta }) =>
          policyMeta ? (
            <Tooltip
              key={factor}
              content={`${policyMeta.explanation} Tradeoff: ${policyMeta.tradeoff}`}
            >
              <span className="rounded bg-[rgba(200,168,76,0.08)] px-1.5 py-0.5 text-sm text-gold/85">
                {policyMeta.policyLabel}: {policyMeta.optionLabel}
              </span>
            </Tooltip>
          ) : factorMeta ? (
            <Tooltip key={factor} content={factorMeta.tip}>
              <span className="rounded bg-[rgba(200,168,76,0.06)] px-1.5 py-0.5 text-sm text-silver/70">
                {factorMeta.label}
              </span>
            </Tooltip>
          ) : null,
        )}
      </div>
    </div>
  );
}

function ContractResultCard({ result }: { result: ContractResultViewModel }) {
  const isVictory = result.outcome !== "contract_lost";
  const title =
    result.outcome === "boss_defeated"
      ? "Boss Defeated"
      : result.outcome === "mission_complete"
        ? "Contract Complete"
        : "Contract Lost";

  return (
    <div
      className="glass-card animate-enter relative overflow-hidden p-5"
      style={{
        borderColor: isVictory ? "rgba(200, 168, 76, 0.2)" : "rgba(212, 84, 30, 0.2)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{
          background: isVictory
            ? "linear-gradient(180deg, rgba(200, 168, 76, 0.08) 0%, transparent 100%)"
            : "linear-gradient(180deg, rgba(212, 84, 30, 0.06) 0%, transparent 100%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3
            className="text-xs font-medium uppercase tracking-[0.18em]"
            style={{ color: isVictory ? "var(--color-gold)" : "var(--color-ember)" }}
          >
            {title}
          </h3>
          <p className="mt-1.5 font-display text-base font-semibold text-silver-bright">
            {result.siteConceptName}
          </p>
          <p className="mt-0.5 text-xs text-silver/50">
            {result.missionName} — {result.location}
          </p>
        </div>
        <span className={`badge ${isVictory ? "badge-gold" : "badge-ember"}`}>
          Rank {result.rank.toUpperCase()}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-4 gap-3">
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Raids</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            {result.totalRaids}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Cash</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalCashEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">Rep</p>
          <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-silver-bright">
            +{result.totalReputationEarned}
          </p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className="text-xs uppercase tracking-wider text-gold/60">KIA</p>
          <p
            className="mt-0.5 font-display text-sm font-semibold tabular-nums"
            style={{
              color:
                result.operatorDeaths > 0 ? "var(--color-magma)" : "var(--color-silver-bright)",
            }}
          >
            {result.operatorDeaths}
          </p>
        </div>
      </div>

      <ContractPolicySummary factors={result.contributingFactors} />
    </div>
  );
}

// ── Contract root ───────────────────────────────────────────────────────

interface ContractsRootBodyProps {
  operations: OperationsViewModel;
  onOpenPostingBoard: () => void;
  onOpenReview: () => void;
  onOpenSite: () => void;
  onOpenActiveOperation: () => void;
  onAdvance: () => void;
}

export function ContractsRootBody({
  operations,
  onOpenPostingBoard,
  onOpenReview,
  onOpenSite,
  onOpenActiveOperation,
  onAdvance,
}: ContractsRootBodyProps) {
  const lifecycle = operations.contractLifecycle;
  const site = operations.contractSite;
  const result = operations.contractResult;
  const postedCount = operations.postedContracts.length;

  return (
    <div className="space-y-4" data-testid="operations-panel" data-category="contract">
      {lifecycle === "active" && site && (
        <div className="glass-card p-4" data-testid="contract-status">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                Secured Contract
              </h3>
              <p className="mt-1 truncate font-display text-sm font-medium text-silver-bright">
                {site.siteConceptName}
              </p>
              <p className="mt-0.5 truncate text-xs text-silver/50">
                {site.missionName} — {site.location}
              </p>
            </div>
            <span className={`badge ${rankBadgeClass(site.rank)} shrink-0`}>
              Rank {site.rank.toUpperCase()}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs">
            <span className="text-silver/55">
              <span className="text-gold/70">Threat</span>{" "}
              <span className="tabular-nums text-silver-bright">{site.threat}</span>
            </span>
            <span className="text-silver/55">
              <span className="text-gold/70">Reward</span>{" "}
              <span className="tabular-nums text-silver-bright">{Math.round(site.reward)}</span>
            </span>
            {site.requiresBossClear && (
              <span
                className={`tabular-nums ${site.bossAvailable ? "text-ember" : "text-silver/50"}`}
              >
                {site.bossAvailable ? "Boss ready" : "Boss locked"}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="contract-site-open"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={onOpenSite}
            >
              Review site details
            </button>
            <button
              type="button"
              data-testid="contract-active-open"
              className="btn-primary px-3 py-1.5 text-xs"
              onClick={onOpenActiveOperation}
            >
              Active operation
            </button>
          </div>
        </div>
      )}

      {lifecycle === "resolved" && (
        <div className="glass-card p-4" data-testid="contract-review">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                Contract Review
              </h3>
              <p className="mt-1 text-sm text-silver/70">
                {result
                  ? "Operations is holding on the finished contract. Review the outcome, then open the next board."
                  : "Operations is waiting for the previous contract to close out before posting new work."}
              </p>
            </div>
            <span
              className={`badge ${result?.outcome === "contract_lost" ? "badge-ember" : "badge-gold"}`}
            >
              {result?.outcome === "boss_defeated"
                ? "Boss Defeated"
                : result?.outcome === "mission_complete"
                  ? "Complete"
                  : result?.outcome === "contract_lost"
                    ? "Lost"
                    : "Pending"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {result && (
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-xs"
                onClick={onOpenReview}
              >
                View details
              </button>
            )}
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-xs"
              data-testid="contract-review-next"
              onClick={onAdvance}
            >
              Review Next Board
            </button>
          </div>
        </div>
      )}

      {lifecycle === "bidding" && (
        <div className="glass-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
                Contract Board
              </h3>
              <p className="mt-1 text-sm text-silver/70">
                {postedCount > 0
                  ? `${postedCount} posting${postedCount === 1 ? "" : "s"} on the street board.`
                  : "Waiting for postings to land on the board."}
              </p>
            </div>
            <span className="badge badge-slate">Bidding</span>
          </div>
          <button
            type="button"
            className="btn-primary mt-3 w-full px-3 py-1.5 text-xs"
            onClick={onOpenPostingBoard}
            disabled={postedCount === 0}
          >
            Browse postings
          </button>
          {result && (
            <button
              type="button"
              className="btn-ghost mt-2 w-full px-3 py-1.5 text-xs"
              onClick={onOpenReview}
            >
              Review previous outcome
            </button>
          )}
        </div>
      )}

      {lifecycle === "idle" && (
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}
        >
          <div className={emptyStateIconClass}>&#9876;</div>
          <p className="text-sm font-medium text-gold/70">No secured contract</p>
          <p className="mt-1 text-xs text-silver/60">Waiting for the contract board to refresh.</p>
          {result && (
            <button
              type="button"
              className="btn-ghost mt-3 px-3 py-1.5 text-xs"
              onClick={onOpenReview}
            >
              Review last outcome
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Posting board branch ────────────────────────────────────────────────

function PostingSummaryRow({
  posting,
  isSelected,
  onSelect,
}: {
  posting: PostedContractViewModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="contract-card"
      data-posting-id={posting.postingId}
      data-selected={isSelected || undefined}
      className={`glass-card-inset flex w-full flex-col gap-1.5 p-3 text-left transition-all ${
        isSelected ? "ring-1 ring-gold/30 shadow-[0_0_12px_rgba(200,168,76,0.08)]" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium text-silver-bright">
            {posting.siteConceptName}
          </h4>
          <p className="mt-0.5 truncate text-xs text-silver/55">
            {posting.neighborhoodLabel || posting.location} &middot; {posting.missionName}
          </p>
        </div>
        <span className={`badge ${rankBadgeClass(posting.rank)} shrink-0`}>
          {posting.rank.toUpperCase()}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-silver/60">
          <span className="text-gold/60">Threat</span>{" "}
          <span className="tabular-nums text-silver-bright">{posting.threat}</span>
        </span>
        <span className="text-silver/60">
          <span className="text-gold/60">Reward</span>{" "}
          <span className="tabular-nums text-gold">{Math.round(posting.reward)}</span>
        </span>
        <span className="text-silver/60">
          <span className="text-gold/60">Risk</span>{" "}
          <span className="tabular-nums text-ember">{Math.round(posting.risk)}</span>
        </span>
      </div>
    </button>
  );
}

interface PostingBoardBodyProps {
  postings: readonly PostedContractViewModel[];
  selectedPostingId: string | null;
  onSelect: (postingId: string) => void;
}

export function PostingBoardBody({ postings, selectedPostingId, onSelect }: PostingBoardBodyProps) {
  if (postings.length === 0) {
    return (
      <div className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}>
        <div className={emptyStateIconClass}>&#9876;</div>
        <p className="text-sm font-medium text-gold/70">No contracts available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="contract-board">
      {postings.map((posting) => (
        <PostingSummaryRow
          key={posting.postingId}
          posting={posting}
          isSelected={posting.postingId === selectedPostingId}
          onSelect={() => onSelect(posting.postingId)}
        />
      ))}
    </div>
  );
}

// ── Posting detail branch ────────────────────────────────────────────────

interface PostingDetailBodyProps {
  posting: PostedContractViewModel;
  onBid: (postingId: string) => void;
}

export function PostingDetailBody({ posting, onBid }: PostingDetailBodyProps) {
  const bossArtPath = posting.bossHint ? getBossArtPath(posting.bossHint) : null;
  const bossLabel = posting.bossHint ? getContractHintMeta(posting.bossHint).label : null;

  return (
    <div className="space-y-4" data-testid="posting-detail" data-posting-id={posting.postingId}>
      <div className="relative overflow-hidden rounded-lg border border-[rgba(212,84,30,0.08)] bg-[rgba(212,84,30,0.04)] p-4">
        <div className="flex items-start gap-3">
          {bossArtPath ? (
            <img
              src={bossArtPath}
              alt={bossLabel ?? "Boss"}
              className="h-16 w-16 rounded border border-[rgba(200,168,76,0.08)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-[rgba(200,168,76,0.08)] bg-[rgba(6,6,8,0.35)] text-2xl text-gold/30">
              ?
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-silver-bright">{posting.siteConceptName}</h3>
            <p className="mt-0.5 text-xs text-silver/55">
              {posting.neighborhoodLabel || posting.location}
            </p>
            <p className="text-xs text-silver/50">{posting.missionName}</p>
            {bossLabel && (
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ember/60">{bossLabel}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm italic leading-relaxed text-silver/55">{posting.siteSummary}</p>

      <div className="grid grid-cols-4 gap-2">
        <div className="glass-card-inset rounded-lg px-2 py-2 text-center" title={RAID_TIPS.threat}>
          <p className="font-display text-base font-semibold tabular-nums text-silver-bright">
            {posting.threat}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Threat</p>
        </div>
        <div className="glass-card-inset rounded-lg px-2 py-2 text-center" title={RAID_TIPS.intel}>
          <p className="font-display text-base font-semibold tabular-nums text-silver-bright">
            {posting.intel}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Intel</p>
        </div>
        <div className="glass-card-inset rounded-lg px-2 py-2 text-center" title={RAID_TIPS.reward}>
          <p className="font-display text-base font-semibold tabular-nums text-gold">
            {Math.round(posting.reward)}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Reward</p>
        </div>
        <div className="glass-card-inset rounded-lg px-2 py-2 text-center" title={RAID_TIPS.risk}>
          <p className="font-display text-base font-semibold tabular-nums text-ember">
            {Math.round(posting.risk)}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Risk</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip content={getBoardIntelDetail(posting.boardIntel)}>
          <span className="badge badge-slate">{getBoardIntelLabel(posting.boardIntel)}</span>
        </Tooltip>
        <span className="text-xs uppercase tracking-[0.12em] text-gold/40">
          {posting.boardIntel.quality}
        </span>
      </div>

      {(posting.districtName || posting.sponsorName || posting.pressureTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {posting.districtName && (
            <span className="text-silver/55">
              <span className="text-gold/40">{"\u25A3"}</span> {posting.districtName}
            </span>
          )}
          {posting.sponsorName && (
            <span className="text-silver/55">
              <span className="text-gold/40">{"\u2302"}</span> {posting.sponsorName}
            </span>
          )}
          {posting.pressureTags.length > 0 && (
            <span className="text-ember/60">
              {posting.pressureTags.length} pressure{posting.pressureTags.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {(posting.knownTraits.length > 0 ||
        posting.enemyHints.length > 0 ||
        posting.lootFamilyHints.length > 0) && (
        <div className="space-y-2">
          {posting.knownTraits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {posting.knownTraits.map((trait) => {
                const meta = getContractHintMeta(trait);
                return (
                  <span
                    key={trait}
                    className="rounded-sm bg-steel/60 px-2 py-0.5 text-xs text-silver/70"
                    title={meta.tip || undefined}
                  >
                    {meta.label}
                  </span>
                );
              })}
              {posting.hiddenTraitCount > 0 && (
                <span className="rounded-sm bg-steel/30 px-2 py-0.5 text-xs text-silver/40">
                  +{posting.hiddenTraitCount} unknown
                </span>
              )}
            </div>
          )}
          {(posting.enemyHints.length > 0 || posting.lootFamilyHints.length > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-silver/40">
              {posting.enemyHints.length > 0 && (
                <span>
                  <span className="text-gold/45">Hostiles:</span>{" "}
                  {posting.enemyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
                </span>
              )}
              {posting.lootFamilyHints.length > 0 && (
                <span>
                  <span className="text-gold/45">Loot:</span>{" "}
                  {posting.lootFamilyHints
                    .map((hint) => getContractHintMeta(hint).label)
                    .join(", ")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[rgba(200,168,76,0.06)] pt-3">
        <span className="text-xs tabular-nums text-silver/35">
          Filing cost: <span className="text-silver/55">{posting.bidCost}</span>
        </span>
        <button
          data-testid="contract-bid-button"
          data-posting-id={posting.postingId}
          className="btn-primary"
          disabled={!posting.canBid}
          onClick={() => onBid(posting.postingId)}
        >
          Secure Contract
        </button>
      </div>
    </div>
  );
}

// ── Contract review branch ──────────────────────────────────────────────

interface ContractReviewBodyProps {
  result: ContractResultViewModel;
  onAdvance: () => void;
}

export function ContractReviewBody({ result, onAdvance }: ContractReviewBodyProps) {
  return (
    <div className="space-y-4">
      <ContractResultCard result={result} />
      <button
        type="button"
        className="btn-primary w-full px-3 py-1.5 text-sm"
        data-testid="contract-review-next"
        onClick={onAdvance}
      >
        Review Next Board
      </button>
    </div>
  );
}

// ── Contract site branch ────────────────────────────────────────────────

interface ContractSiteBodyProps {
  contract: ContractSiteViewModel;
}

export function ContractSiteBody({ contract }: ContractSiteBodyProps) {
  const isEnded = contract.bossDefeated || contract.missionCompleted || contract.contractLost;
  const progressPct =
    contract.closureThreshold <= 0
      ? 0
      : Math.min(100, (contract.closureProgress / contract.closureThreshold) * 100);
  const statusLabel = contract.bossDefeated
    ? "Boss Defeated"
    : contract.missionCompleted
      ? "Objective Secured"
      : contract.contractLost
        ? "Contract Lost"
        : "Active";
  const statusTip =
    contract.bossDefeated || contract.missionCompleted
      ? RAID_TIPS.contractWon
      : contract.contractLost
        ? RAID_TIPS.contractLost
        : RAID_TIPS.contractActive;

  return (
    <div className="space-y-3" data-testid="contract-site-detail">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-sm font-medium text-silver-bright">
            {contract.siteConceptName}
          </p>
          <p className="mt-0.5 text-xs text-silver/55">
            {contract.missionName} — {contract.location}
          </p>
          {contract.neighborhoodLabel && (
            <p className="mt-0.5 text-xs text-gold/60">{contract.neighborhoodLabel}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Tooltip content={RAID_TIPS.rank}>
            <span className={`badge ${rankBadgeClass(contract.rank)}`}>
              Rank {contract.rank.toUpperCase()}
            </span>
          </Tooltip>
          <Tooltip content={statusTip}>
            <span
              className={`badge ${
                contract.bossDefeated || contract.missionCompleted
                  ? "badge-gold"
                  : contract.contractLost
                    ? "badge-ember"
                    : "badge-slate"
              }`}
            >
              {statusLabel}
            </span>
          </Tooltip>
        </div>
      </div>

      {!isEnded && (
        <>
          <div className="glass-card-inset rounded-lg px-3 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Site read</p>
            <p className="mt-1 text-sm leading-relaxed text-silver/65">{contract.siteSummary}</p>
          </div>

          {contract.briefing && (
            <div className="glass-card-inset rounded-lg px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Briefing Layer</p>
                <span className="badge badge-gold">{getBriefingLabel(contract.briefing)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-silver/65">
                {getBriefingDetail(contract.briefing)}
              </p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.threat}>
                <span className="text-gold/70">Threat</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{contract.threat}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.intel}>
                <span className="text-gold/70">Intel</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{contract.intel}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <Tooltip content={RAID_TIPS.reward}>
                <span className="text-gold/70">Reward</span>
              </Tooltip>
              <span className="tabular-nums text-silver-bright">{Math.round(contract.reward)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <Tooltip content={RAID_TIPS.revealProgress}>
                <span className="text-gold/60">
                  {contract.requiresBossClear ? "Objective Prep" : "Objective Progress"}
                </span>
              </Tooltip>
              <span className="tabular-nums text-silver/60">{Math.round(progressPct)}%</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-void/80">
              <div className={progressBarFillClass} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {(contract.knownTraits.length > 0 ||
            contract.enemyHints.length > 0 ||
            contract.lootFamilyHints.length > 0) && (
            <div className="glass-card-inset rounded-lg px-3 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Operational Read</p>
              {contract.knownTraits.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contract.knownTraits.map((trait) => {
                    const meta = getContractHintMeta(trait);
                    return (
                      <Tooltip key={trait} content={meta.tip}>
                        <span className="badge badge-slate">{meta.label}</span>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
              {contract.enemyHints.length > 0 && (
                <p className="mt-2 text-sm leading-relaxed text-silver/60">
                  Hostiles:{" "}
                  {contract.enemyHints.map((hint) => getContractHintMeta(hint).label).join(", ")}
                </p>
              )}
              {contract.lootFamilyHints.length > 0 && (
                <p className="mt-1 text-sm leading-relaxed text-silver/60">
                  Likely loot:{" "}
                  {contract.lootFamilyHints
                    .map((hint) => getContractHintMeta(hint).label)
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="glass-card-inset rounded-lg px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Boss Stakes</p>
              <Tooltip
                content={contract.bossAvailable ? RAID_TIPS.routeOpen : RAID_TIPS.routeLocked}
              >
                <span className={`badge ${contract.bossAvailable ? "badge-ember" : "badge-slate"}`}>
                  {contract.bossAvailable ? "Route Open" : "Route Locked"}
                </span>
              </Tooltip>
            </div>
            <p className="mt-2 text-sm text-silver-bright">
              {contract.requiresBossClear
                ? (contract.bossName ?? "Boss identity unconfirmed")
                : "Ordinary clearance contract"}
            </p>
            {contract.requiresBossClear && contract.bossTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contract.bossTags.map((tag) => {
                  const meta = getNarrativeTagMeta(tag);
                  return (
                    <Tooltip key={tag} content={meta.tip}>
                      <span className="badge badge-slate">{meta.label}</span>
                    </Tooltip>
                  );
                })}
              </div>
            )}
            {contract.requiresBossClear && contract.bossWeaknesses.length > 0 && (
              <div className="mt-2">
                <p className="text-xs uppercase tracking-[0.12em] text-frost/75">Weaknesses</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {contract.bossWeaknesses.map((weakness) => {
                    const meta = getWeaknessTargetMeta(weakness.target);
                    return (
                      <Tooltip key={`${weakness.kind}-${weakness.target}`} content={meta.tip}>
                        <span className="badge border border-frost/20 bg-frost/10 text-frost">
                          {meta.label}
                        </span>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="mt-2 text-sm leading-relaxed text-silver/60">
              {contract.requiresBossClear
                ? contract.bossAvailable
                  ? "The boss route is open. Enter the site expecting a decisive fight."
                  : "Secure more of the contract objective before expecting the boss route to appear."
                : "This job is scoped as ordinary contract work. Secure the objective, get out, and keep the guild moving."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── Active root ─────────────────────────────────────────────────────────

function DeployedOperatorPortrait({ op }: { op: OperatorViewModel }) {
  const isDead = op.lifecycle.status === "dead";
  return (
    <div className="flex flex-col items-center gap-0.5" title={op.name}>
      <div className="relative">
        <OperatorPortrait
          name={op.name}
          roleTag={op.roleTag}
          presetId={op.appearancePresetId}
          size="roster"
          visibleGear={op.visibleGear}
        />
        {isDead && <div className="absolute inset-0 rounded bg-void/50" />}
      </div>
      <span
        className={`max-w-[5rem] truncate text-sm ${
          isDead ? "text-magma line-through" : "text-silver/60"
        }`}
      >
        {op.name}
      </span>
      {isDead && <span className="text-sm font-medium text-magma">KIA</span>}
    </div>
  );
}

function ActiveRaidSummaryRow({
  raid,
  operatorMap,
  isSelected,
  onSelect,
}: {
  raid: ActiveRaidViewModel;
  operatorMap: ReadonlyMap<string, OperatorViewModel>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const progressPct = Math.min(100, Math.max(0, raid.revealProgress));
  const deployedOps = raid.operatorIds
    .map((id) => operatorMap.get(id))
    .filter((op): op is OperatorViewModel => op !== undefined);
  const casualtyCount = deployedOps.filter((op) => op.lifecycle.status === "dead").length;

  return (
    <button
      type="button"
      data-testid="active-raid-card"
      data-raid-id={raid.id}
      data-selected={isSelected || undefined}
      className={`glass-card-inset flex w-full flex-col gap-2 p-3 text-left transition-all ${
        isSelected ? "ring-1 ring-gold/30 shadow-[0_0_12px_rgba(200,168,76,0.08)]" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium text-silver-bright">{raid.missionName}</h4>
          {raid.location && (
            <p className="mt-0.5 truncate text-xs text-silver/55">{raid.location}</p>
          )}
        </div>
        <span className="badge badge-ember shrink-0">Active</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gold/70">
        {raid.operatorIds.length > 0 && <span>{raid.operatorIds.length} deployed</span>}
        {raid.threat > 0 && <span title={RAID_TIPS.threat}>Threat {raid.threat}</span>}
        {raid.cohesion > 0 && (
          <span title={RAID_TIPS.cohesion}>Cohesion {Math.round(raid.cohesion)}</span>
        )}
        {casualtyCount > 0 && (
          <span className="text-magma">
            {casualtyCount} {casualtyCount === 1 ? "casualty" : "casualties"}
          </span>
        )}
      </div>

      <div title={RAID_TIPS.revealProgress}>
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-gold/70">Reveal</span>
          <span className="tabular-nums text-ember">{Math.round(progressPct)}%</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[rgba(6,6,8,0.6)]">
          <div
            className="h-full rounded-full bg-ember/60 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

interface ActiveRootBodyProps {
  operations: OperationsViewModel;
  operators: readonly OperatorViewModel[];
  focusedTeamId: string | null;
  onOpenTeam: (teamId: string) => void;
  onOpenSite: () => void;
}

export function ActiveRootBody({
  operations,
  operators,
  focusedTeamId,
  onOpenTeam,
  onOpenSite,
}: ActiveRootBodyProps) {
  const operatorMap = useMemo(() => new Map(operators.map((op) => [op.id, op])), [operators]);
  const activeRaids = operations.activeRaids;
  const site = operations.contractSite;

  return (
    <div className="space-y-4" data-testid="active-root">
      {site && (
        <div className="glass-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Site</p>
              <p className="mt-0.5 truncate text-sm text-silver-bright">{site.siteConceptName}</p>
              <p className="truncate text-xs text-silver/55">
                {site.missionName} — {site.location}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0 px-2 py-1 text-xs"
              onClick={onOpenSite}
            >
              Details
            </button>
          </div>
        </div>
      )}

      {activeRaids.length === 0 ? (
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}
        >
          <div className={emptyStateIconClass}>&mdash;</div>
          <p className="text-sm font-medium text-gold/70">No active raids</p>
          <p className="mt-1 text-xs text-silver/60">Operators are currently between operations.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-ember">
            Active Operations ({activeRaids.length})
          </h3>
          {activeRaids.map((raid) => (
            <ActiveRaidSummaryRow
              key={raid.id}
              raid={raid}
              operatorMap={operatorMap}
              isSelected={raid.id === focusedTeamId}
              onSelect={() => onOpenTeam(raid.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team detail branch ──────────────────────────────────────────────────

function OperatorInspectionRow({ op }: { op: OperatorViewModel }) {
  const isDead = op.lifecycle.status === "dead";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-[rgba(6,6,8,0.3)] px-3 py-2 ${
        isDead ? "opacity-60" : ""
      }`}
    >
      <div className="flex-shrink-0">
        <OperatorPortrait
          name={op.name}
          roleTag={op.roleTag}
          presetId={op.appearancePresetId}
          size="roster"
          visibleGear={op.visibleGear}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isDead ? "text-magma line-through" : "text-silver-bright"
            }`}
          >
            {op.name}
          </span>
          {(() => {
            const role = getRoleMeta(op.roleTag);
            return (
              <span className="text-sm text-gold/70" title={role.tip}>
                {role.label}
              </span>
            );
          })()}
          {op.specialtyTag &&
            (() => {
              const spec = getSpecialtyMeta(op.specialtyTag);
              return (
                <span className="text-sm text-silver/60" title={spec.tip}>
                  {spec.label}
                </span>
              );
            })()}
          {isDead && <span className="text-sm font-medium text-magma">KIA</span>}
          {!isDead && op.injurySeverity > 0 && <span className="text-sm text-ember">Injured</span>}
        </div>
        {!isDead && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
            <span className="text-silver/60" title={OPERATOR_TIPS.morale}>
              Morale{" "}
              <span
                className={`tabular-nums ${op.moraleCurrent < 30 ? "text-ember" : "text-silver/80"}`}
              >
                {op.moraleCurrent}
              </span>
            </span>
            <span className="text-silver/60" title={OPERATOR_TIPS.loyalty}>
              Loyalty{" "}
              <span
                className={`tabular-nums ${op.loyaltyCurrent < 30 ? "text-ember" : "text-silver/80"}`}
              >
                {op.loyaltyCurrent}
              </span>
            </span>
            <span className="text-silver/60" title={OPERATOR_TIPS.readiness}>
              Readiness <span className="tabular-nums text-silver/80">{op.readinessScore}</span>
            </span>
            {op.needFatigue > 40 && (
              <span className="text-ember" title={OPERATOR_TIPS.fatigue}>
                Fatigue {op.needFatigue}
              </span>
            )}
            {op.needStress > 40 && (
              <span className="text-ember" title={OPERATOR_TIPS.stress}>
                Stress {op.needStress}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamDetailBodyProps {
  raid: ActiveRaidViewModel;
  raidTeamMarker: RaidTeamMarker | null;
  operators: readonly OperatorViewModel[];
  operatorStatuses: ReadonlyMap<string, FocusOperatorStatus> | undefined;
  encounter: FocusEncounter | null;
  onDismissFocus: () => void;
}

export function TeamDetailBody({
  raid,
  raidTeamMarker,
  operators,
  operatorStatuses,
  encounter,
  onDismissFocus,
}: TeamDetailBodyProps) {
  const operatorMap = useMemo(() => new Map(operators.map((op) => [op.id, op])), [operators]);
  const deployedOps = raid.operatorIds
    .map((id) => operatorMap.get(id))
    .filter((op): op is OperatorViewModel => op !== undefined);
  const livingCount = deployedOps.filter((op) => op.lifecycle.status === "active").length;
  const casualtyCount = deployedOps.length - livingCount;
  const roleBreakdown = new Map<string, { count: number; tip: string }>();
  for (const op of deployedOps) {
    const meta = getRoleMeta(op.roleTag);
    const existing = roleBreakdown.get(meta.label);
    roleBreakdown.set(meta.label, {
      count: (existing?.count ?? 0) + 1,
      tip: meta.tip,
    });
  }

  return (
    <div className="space-y-4" data-testid="raid-team-inspection" data-raid-id={raid.id}>
      {raidTeamMarker && (
        <RaidFocusFrame
          team={raidTeamMarker}
          getOperatorName={(id) => operatorMap.get(id)?.name ?? null}
          operatorStatuses={operatorStatuses}
          encounter={encounter}
          onDismiss={onDismissFocus}
        />
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        {raid.threat > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.threat}>
            <span className="text-gold/70">Threat</span>
            <span className="tabular-nums text-silver-bright">{raid.threat}</span>
          </div>
        )}
        {raid.cohesion > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.cohesion}>
            <span className="text-gold/70">Cohesion</span>
            <span className="tabular-nums text-silver-bright">{Math.round(raid.cohesion)}</span>
          </div>
        )}
        {raid.durationHours > 0 && (
          <div className="flex items-baseline gap-1" title={RAID_TIPS.duration}>
            <span className="text-gold/70">Duration</span>
            <span className="tabular-nums text-silver-bright">{raid.durationHours}h</span>
          </div>
        )}
        {Array.from(roleBreakdown.entries()).map(([role, { count, tip }]) => (
          <div key={role} className="flex items-baseline gap-1" title={tip}>
            <span className="text-gold/70">{role}</span>
            <span className="tabular-nums text-silver-bright">{count}</span>
          </div>
        ))}
      </div>

      {deployedOps.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-[rgba(200,168,76,0.04)] pt-3">
          {deployedOps.map((op) => (
            <DeployedOperatorPortrait key={op.id} op={op} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Team Inspection
          </h4>
          <div className="flex items-center gap-2 text-xs text-silver/60">
            <span>{livingCount} active</span>
            {casualtyCount > 0 && <span className="text-magma">{casualtyCount} KIA</span>}
          </div>
        </div>
        {deployedOps.length > 0 ? (
          <div className="space-y-2">
            {deployedOps.map((op) => (
              <OperatorInspectionRow key={op.id} op={op} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-silver/60">No operator data available for this team.</p>
        )}
      </div>

      <div className="border-t border-[rgba(200,168,76,0.04)] pt-3">
        <RaidEventFeed events={raid.recentEvents} />
      </div>
    </div>
  );
}

// ── Opportunities ───────────────────────────────────────────────────────

const OPPORTUNITY_STATUS_BADGE: Record<
  RaidOpportunityViewModel["status"],
  { className: string; label: string }
> = {
  available: { className: "badge-gold", label: "Open" },
  claimed: { className: "badge-ember", label: "Claimed" },
  expired: { className: "badge-slate", label: "Expired" },
};

const OPPORTUNITY_THREAT_COLORS: Record<string, string> = {
  E: "text-gold/70",
  D: "text-gold/80",
  C: "text-gold",
  B: "text-ember",
  A: "text-ember",
  S: "text-smolder",
};

function RosterThinWarning({ rosterPressure }: { rosterPressure: RosterPressureViewModel }) {
  const isCritical = rosterPressure.replacementPressureLevel === "critical";
  return (
    <div
      className={`glass-card-inset flex items-center gap-2 px-3 py-2 ${
        isCritical ? "border-l-2 border-l-magma" : "border-l-2 border-l-ember"
      }`}
    >
      <span className={`text-xs font-medium ${isCritical ? "text-magma" : "text-ember"}`}>
        {isCritical ? "Roster critical" : "Roster strained"}
      </span>
      <span className="text-sm text-silver/60">
        {rosterPressure.livingOperatorCount}/{rosterPressure.operatorCapacity} on roster
        {rosterPressure.vacancyCount > 0 &&
          ` · ${rosterPressure.vacancyCount} ${rosterPressure.vacancyCount === 1 ? "vacancy" : "vacancies"}`}
      </span>
    </div>
  );
}

function OpportunitySummaryRow({
  opportunity,
  isSelected,
  onSelect,
}: {
  opportunity: RaidOpportunityViewModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusStyle = OPPORTUNITY_STATUS_BADGE[opportunity.status];
  const threatColor = OPPORTUNITY_THREAT_COLORS[opportunity.threatRank] ?? "text-silver/60";

  return (
    <button
      type="button"
      data-testid="opportunity-card"
      data-opportunity-id={opportunity.id}
      data-selected={isSelected || undefined}
      className={`glass-card-inset flex w-full flex-col gap-1.5 p-3 text-left transition-all ${
        isSelected ? "ring-1 ring-gold/30 shadow-[0_0_12px_rgba(200,168,76,0.08)]" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-medium text-silver-bright">
            {opportunity.missionName}
          </h4>
          <p className="mt-0.5 truncate text-xs text-silver/55">{opportunity.location}</p>
        </div>
        <span className={`badge ${statusStyle.className} shrink-0`}>{statusStyle.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className={threatColor} title={RAID_TIPS.threatRank}>
          Threat {opportunity.threatRank}
        </span>
        {opportunity.reward > 0 && (
          <span className="text-gold/70">Reward {Math.round(opportunity.reward)}</span>
        )}
        {opportunity.interestedCount > 0 && (
          <span className="text-gold/60">{opportunity.interestedCount} interested</span>
        )}
      </div>
    </button>
  );
}

interface OpportunitiesRootBodyProps {
  guildName: string;
  opportunities: readonly RaidOpportunityViewModel[];
  rosterPressure: RosterPressureViewModel;
  operators: readonly OperatorViewModel[];
  selectedOpportunityId: string | null;
  onSelect: (opportunityId: string) => void;
}

export function OpportunitiesRootBody({
  guildName,
  opportunities,
  rosterPressure,
  operators,
  selectedOpportunityId,
  onSelect,
}: OpportunitiesRootBodyProps) {
  const rosterThin = rosterPressure.replacementPressureLevel !== "stable";
  const livingOperators = operators.filter((op) => op.lifecycle.status === "active");
  const willingCount = livingOperators.filter(
    (op) => op.availableForRaid && !op.refusalRisk,
  ).length;
  const refusingCount = livingOperators.filter((op) => op.refusalRisk).length;

  if (opportunities.length === 0) {
    return (
      <div className="space-y-3">
        {rosterThin && <RosterThinWarning rosterPressure={rosterPressure} />}
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}
        >
          <div className={emptyStateIconClass}>&#9672;</div>
          <p className="text-sm font-medium text-gold/70">No opportunities posted</p>
          <p className="mt-1 text-xs text-silver/60">
            Opportunities appear as {guildName} gains reputation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-silver/60">
        Operators evaluate and claim opportunities autonomously.
      </p>
      {livingOperators.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gold/70">{willingCount} willing</span>
          {refusingCount > 0 && <span className="text-ember">{refusingCount} refusing</span>}
        </div>
      )}
      {rosterThin && <RosterThinWarning rosterPressure={rosterPressure} />}
      <div className="space-y-2">
        {opportunities.map((opp) => (
          <OpportunitySummaryRow
            key={opp.id}
            opportunity={opp}
            isSelected={opp.id === selectedOpportunityId}
            onSelect={() => onSelect(opp.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface OpportunityDetailBodyProps {
  opportunity: RaidOpportunityViewModel;
}

export function OpportunityDetailBody({ opportunity }: OpportunityDetailBodyProps) {
  const statusStyle = OPPORTUNITY_STATUS_BADGE[opportunity.status];
  const threatColor = OPPORTUNITY_THREAT_COLORS[opportunity.threatRank] ?? "text-silver/60";
  const intel = getIntelMeta(opportunity.intelConfidence.toLowerCase());

  return (
    <div
      className="space-y-4"
      data-testid="opportunity-detail"
      data-opportunity-id={opportunity.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-silver-bright">
            {opportunity.missionName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-silver/55">{opportunity.location}</p>
        </div>
        <span className={`badge ${statusStyle.className} shrink-0`}>{statusStyle.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p className={`font-display text-base font-semibold tabular-nums ${threatColor}`}>
            {opportunity.threatRank}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Threat</p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center" title={intel.tip}>
          <p className="font-display text-base font-semibold tabular-nums text-silver-bright">
            {opportunity.intelConfidence}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Intel</p>
        </div>
        {opportunity.reward > 0 && (
          <div
            className="glass-card-inset rounded-lg px-3 py-2 text-center"
            title={RAID_TIPS.reward}
          >
            <p className="font-display text-base font-semibold tabular-nums text-gold">
              {Math.round(opportunity.reward)}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Reward</p>
          </div>
        )}
        {opportunity.risk > 0 && (
          <div className="glass-card-inset rounded-lg px-3 py-2 text-center" title={RAID_TIPS.risk}>
            <p className="font-display text-base font-semibold tabular-nums text-ember">
              {Math.round(opportunity.risk)}
            </p>
            <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Risk</p>
          </div>
        )}
      </div>

      <div className="space-y-1 border-t border-[rgba(200,168,76,0.04)] pt-3 text-sm text-silver/65">
        {opportunity.recommendedOperatorCount > 0 && (
          <p title={RAID_TIPS.recommended}>
            Recommended deployment:{" "}
            <span className="text-silver-bright">{opportunity.recommendedOperatorCount}</span>{" "}
            operators
          </p>
        )}
        <p title={RAID_TIPS.interested}>
          {opportunity.interestedCount} operators interested
          {opportunity.claimedCount > 0 && (
            <span className="text-ember"> · {opportunity.claimedCount} already committed</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── History ─────────────────────────────────────────────────────────────

const HISTORY_RESULT_STYLES: Record<
  RaidSummaryViewModel["result"],
  { badge: string; label: string }
> = {
  success: { badge: "badge-gold", label: "Success" },
  failure: { badge: "badge-ember", label: "Failed" },
  mixed: { badge: "badge-slate", label: "Mixed" },
};

function formatSummaryTimestamp(endedAt: string): string {
  const endedDate = new Date(endedAt);
  if (Number.isNaN(endedDate.getTime())) return endedAt;
  return endedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function HistorySummaryRow({
  summary,
  isSelected,
  onSelect,
}: {
  summary: RaidSummaryViewModel;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const style = HISTORY_RESULT_STYLES[summary.result];
  const casualties = summary.operatorOutcomes.filter((o) => o.died);
  const endedAtLabel = formatSummaryTimestamp(summary.endedAt);
  const summaryLine = summary.location ? `${summary.location} · ${endedAtLabel}` : endedAtLabel;

  return (
    <button
      type="button"
      data-testid="raid-summary-card"
      data-summary-id={summary.id}
      data-selected={isSelected || undefined}
      className={`glass-card-inset flex w-full flex-col gap-1.5 p-3 text-left transition-all ${
        isSelected ? "ring-1 ring-gold/30 shadow-[0_0_12px_rgba(200,168,76,0.08)]" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-xs font-medium text-silver-bright">{summary.missionName}</h4>
          <p className="mt-0.5 truncate text-xs text-silver/55">{summaryLine}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {casualties.length > 0 && (
            <span className="badge badge-ember">{casualties.length} KIA</span>
          )}
          <span className={`badge ${style.badge}`}>{style.label}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className={summary.cashDelta >= 0 ? "text-gold" : "text-danger"}>
          {summary.cashDelta >= 0 ? "+" : ""}
          {Math.round(summary.cashDelta)} cash
        </span>
        <span className={summary.reputationDelta >= 0 ? "text-gold/80" : "text-danger"}>
          {summary.reputationDelta >= 0 ? "+" : ""}
          {Math.round(summary.reputationDelta)} rep
        </span>
      </div>
    </button>
  );
}

interface HistoryRootBodyProps {
  history: readonly RaidSummaryViewModel[];
  selectedSummaryId: string | null;
  onSelect: (summaryId: string) => void;
}

export function HistoryRootBody({ history, selectedSummaryId, onSelect }: HistoryRootBodyProps) {
  const orderedHistory = useMemo(
    () =>
      [...history].sort(
        (a, b) =>
          new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime() || a.id.localeCompare(b.id),
      ),
    [history],
  );

  if (orderedHistory.length === 0) {
    return (
      <div className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-8`}>
        <p className="text-xs text-silver/60">No raid history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedHistory.map((summary) => (
        <HistorySummaryRow
          key={summary.id}
          summary={summary}
          isSelected={summary.id === selectedSummaryId}
          onSelect={() => onSelect(summary.id)}
        />
      ))}
    </div>
  );
}

interface RaidSummaryDetailBodyProps {
  summary: RaidSummaryViewModel;
}

export function RaidSummaryDetailBody({ summary }: RaidSummaryDetailBodyProps) {
  const style = HISTORY_RESULT_STYLES[summary.result];
  const casualties = summary.operatorOutcomes.filter((o) => o.died);
  const endedAtLabel = formatSummaryTimestamp(summary.endedAt);
  const displayTags = summary.narrativeTags.filter(
    (tag) =>
      !tag.startsWith("mission:") && !tag.startsWith("location:") && !tag.startsWith("result:"),
  );
  const displayFactors = resolveContributingFactors(summary.contributingFactors);

  return (
    <div className="space-y-4" data-testid="raid-summary-detail" data-summary-id={summary.id}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-medium text-silver-bright">
            {summary.missionName}
          </h3>
          <p className="mt-0.5 truncate text-xs text-silver/55">
            {summary.location ? `${summary.location} · ${endedAtLabel}` : endedAtLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`badge ${style.badge}`}>{style.label}</span>
          {casualties.length > 0 && (
            <span className="badge badge-ember">{casualties.length} KIA</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p
            className={`font-display text-base font-semibold tabular-nums ${
              summary.cashDelta >= 0 ? "text-gold" : "text-danger"
            }`}
          >
            {summary.cashDelta >= 0 ? "+" : ""}
            {Math.round(summary.cashDelta)}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Cash</p>
        </div>
        <div className="glass-card-inset rounded-lg px-3 py-2 text-center">
          <p
            className={`font-display text-base font-semibold tabular-nums ${
              summary.reputationDelta >= 0 ? "text-gold/80" : "text-danger"
            }`}
          >
            {summary.reputationDelta >= 0 ? "+" : ""}
            {Math.round(summary.reputationDelta)}
          </p>
          <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-gold/45">Reputation</p>
        </div>
      </div>

      {summary.operatorOutcomes.length > 0 && (
        <div className="space-y-1 border-t border-[rgba(200,168,76,0.04)] pt-3">
          <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Operators</p>
          {summary.operatorOutcomes.map((outcome) => (
            <div key={outcome.operatorId} className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${outcome.died ? "bg-magma" : "bg-gold/40"}`}
              />
              <span
                className={`text-sm ${outcome.died ? "text-magma line-through" : "text-silver/60"}`}
              >
                {outcome.operatorName}
              </span>
              {outcome.died && <span className="text-sm font-medium text-magma">KIA</span>}
            </div>
          ))}
        </div>
      )}

      {displayTags.length > 0 && (
        <div className="border-t border-[rgba(200,168,76,0.04)] pt-3">
          <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Tags</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {displayTags.map((tag) => {
              const { label, tip } = getNarrativeTagMeta(tag);
              return (
                <Tooltip key={tag} content={tip}>
                  <span className="rounded bg-[rgba(200,168,76,0.04)] px-1.5 py-0.5 text-sm text-silver/60">
                    {label}
                  </span>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {displayFactors.length > 0 && (
        <div className="border-t border-[rgba(200,168,76,0.04)] pt-3">
          <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Management Context</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {displayFactors.map(({ factor, policyMeta, factorMeta }) =>
              policyMeta ? (
                <Tooltip
                  key={factor}
                  content={`${policyMeta.explanation} Tradeoff: ${policyMeta.tradeoff}`}
                >
                  <span className="rounded bg-[rgba(200,168,76,0.06)] px-1.5 py-0.5 text-sm text-gold/80">
                    {policyMeta.policyLabel}: {policyMeta.optionLabel}
                  </span>
                </Tooltip>
              ) : factorMeta ? (
                <Tooltip key={factor} content={factorMeta.tip}>
                  <span className="rounded bg-[rgba(200,168,76,0.04)] px-1.5 py-0.5 text-sm text-silver/70">
                    {factorMeta.label}
                  </span>
                </Tooltip>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
