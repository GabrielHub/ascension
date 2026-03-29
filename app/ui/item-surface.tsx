import { getIdentifierLabel, getTagMeta } from "./_glossary";
import type { StatEffectViewModel } from "./view-models";

export const STAT_LABELS: Record<string, string> = {
  strength: "STR",
  speed: "SPD",
  endurance: "END",
  resilience: "RES",
  perception: "PER",
  intelligence: "INT",
};

export function formatStatEffectLabel(effect: StatEffectViewModel): string {
  const prefix = effect.value >= 0 ? "+" : "";
  return `${prefix}${effect.value} ${STAT_LABELS[effect.stat] ?? getIdentifierLabel(effect.stat)}`;
}

export function ItemRankBadge({ rank }: { rank: string }) {
  return <span className="badge badge-gold">Rank {rank.toUpperCase()}</span>;
}

export function StatEffectChips({
  effects,
  className = "badge badge-slate",
  emptyLabel = null,
}: {
  effects: readonly StatEffectViewModel[];
  className?: string;
  emptyLabel?: string | null;
}) {
  if (effects.length === 0) {
    return emptyLabel ? <span className="text-[0.625rem] text-silver/35">{emptyLabel}</span> : null;
  }

  return (
    <>
      {effects.map((effect) => (
        <span key={`${effect.stat}-${effect.value}`} className={className}>
          {formatStatEffectLabel(effect)}
        </span>
      ))}
    </>
  );
}

export function ItemTagChips({ tags, max = 3 }: { tags: readonly string[]; max?: number }) {
  const displayTags = tags.filter((tag) => !tag.startsWith("rank:")).slice(0, max);
  if (displayTags.length === 0) {
    return null;
  }

  return (
    <>
      {displayTags.map((tag) => (
        <span key={tag} className="badge badge-slate">
          {getTagMeta(tag).label || getIdentifierLabel(tag)}
        </span>
      ))}
    </>
  );
}
