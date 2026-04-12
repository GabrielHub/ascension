import { getIdentifierLabel, getTagMeta } from "./_glossary";
import type { StatEffectViewModel } from "./view-models";

// ── Item visual family contract ──────────────────────────────────────────
// Items use a category-icon family system rather than per-item bespoke art.
// Each item category maps to a glyph and accent color for inventory/market UI.

export type ItemCategoryVisual = {
  glyph: string;
  accentClass: string;
  label: string;
};

const ITEM_CATEGORY_VISUALS: Record<string, ItemCategoryVisual> = {
  weapon: { glyph: "\u2694", accentClass: "text-ember", label: "Weapon" },
  weapons: { glyph: "\u2694", accentClass: "text-ember", label: "Weapon" },
  "outfit-overlay": { glyph: "\u{1F6E1}", accentClass: "text-gold", label: "Outfit" },
  outfits: { glyph: "\u{1F6E1}", accentClass: "text-gold", label: "Outfit" },
  accessory: { glyph: "\u2B50", accentClass: "text-silver", label: "Accessory" },
  accessories: { glyph: "\u2B50", accentClass: "text-silver", label: "Accessory" },
  loot: { glyph: "\u{1F48E}", accentClass: "text-teal", label: "Loot" },
  consumable: { glyph: "\u{1F9EA}", accentClass: "text-green-400", label: "Consumable" },
  consumables: { glyph: "\u{1F9EA}", accentClass: "text-green-400", label: "Consumable" },
  misc: { glyph: "\u2753", accentClass: "text-silver/50", label: "Misc" },
};

const FALLBACK_VISUAL: ItemCategoryVisual = {
  glyph: "\u2753",
  accentClass: "text-silver/50",
  label: "Item",
};

/** Resolve the visual family treatment for an item category. */
export function getItemCategoryVisual(category: string): ItemCategoryVisual {
  return ITEM_CATEGORY_VISUALS[category] ?? FALLBACK_VISUAL;
}

/** Compact item icon badge using the category family glyph. */
export function ItemCategoryIcon({
  category,
  size = "sm",
}: {
  category: string;
  size?: "sm" | "md";
}) {
  const visual = getItemCategoryVisual(category);
  const sizeClass = size === "md" ? "text-base" : "text-sm";
  return (
    <span
      className={`${visual.accentClass} ${sizeClass}`}
      title={visual.label}
      aria-label={visual.label}
    >
      {visual.glyph}
    </span>
  );
}

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
    return emptyLabel ? <span className="text-xs text-silver/35">{emptyLabel}</span> : null;
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
