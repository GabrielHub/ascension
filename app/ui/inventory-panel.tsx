import type {
  EquipmentViewModel,
  GameCallbacks,
  InventoryItemViewModel,
  LootAutomationViewModel,
  MarketItemViewModel,
} from "./view-models";
import { ItemRankBadge, ItemTagChips, StatEffectChips } from "./item-surface";
import { emptyStateClass, emptyStateIconClass } from "./styles";

interface InventoryPanelProps {
  inventory: readonly InventoryItemViewModel[];
  lootAutomation: LootAutomationViewModel | null;
  equipment: readonly EquipmentViewModel[];
  marketItems: readonly MarketItemViewModel[];
  callbacks: GameCallbacks;
}

const CATEGORY_ORDER = ["weapons", "outfits", "accessories", "loot", "misc"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  weapons: "Weapons",
  outfits: "Outfits",
  accessories: "Accessories",
  loot: "Loot",
  misc: "Misc",
};

export function InventoryPanel({
  inventory,
  lootAutomation,
  equipment,
  marketItems,
  callbacks,
}: InventoryPanelProps) {
  const grouped = new Map<string, InventoryItemViewModel[]>();
  for (const item of inventory) {
    const group = grouped.get(item.category) ?? [];
    group.push(item);
    grouped.set(item.category, group);
  }

  const sellPriceByItemId = new Map(marketItems.map((mi) => [mi.itemId, mi.sellPrice]));

  if (inventory.length === 0 && equipment.length === 0) {
    return (
      <div className="animate-enter space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Inventory</h3>
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-10`}
        >
          <div className={emptyStateIconClass}>&#9744;</div>
          <p className="text-sm font-medium text-gold/70">No items</p>
          <p className="mt-1 text-xs text-silver/60">
            Items are acquired from raids and the market
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-enter space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">
            Inventory
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-silver/55">
            Raid loot lands here first. Auto-filtering is balance-owned and only sells gear the
            guild has already outgrown, plus junk monster parts.
          </p>
        </div>
        <div className="text-right">
          <span className="block text-sm tabular-nums text-silver/50">
            {inventory.reduce((sum, it) => sum + it.quantity, 0)} items
          </span>
          <button
            type="button"
            data-testid="inventory-loot-filter-toggle"
            className="btn-ghost mt-2 px-1.5 py-0.5 text-sm"
            onClick={() => callbacks.setLootFilterEnabled(!(lootAutomation?.enabled ?? false))}
          >
            {lootAutomation?.enabled ? "loot filter on" : "loot filter off"}
          </button>
        </div>
      </div>

      {lootAutomation && (
        <div className="glass-card-inset rounded-xl border border-[rgba(200,168,76,0.08)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-gold/55">Loot Filter</p>
              <p className="mt-1 text-sm leading-relaxed text-silver/65">
                {lootAutomation.enabled
                  ? "Enabled. New raid drops are filtered automatically."
                  : "Disabled. All loot stays in storage until you review it."}
              </p>
            </div>
            <span className={`badge ${lootAutomation.enabled ? "badge-gold" : "badge-slate"}`}>
              {lootAutomation.enabled ? "Auto" : "Manual"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {lootAutomation.equipmentRules.map((rule) => (
              <div key={rule.category} className="rounded-lg border border-gold/8 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.12em] text-gold/55">{rule.label}</p>
                <p className="mt-1 text-sm text-silver/65">
                  {rule.sellBelowRank ? `Sell below ${rule.sellBelowRank}` : "Keep all ranks"}
                </p>
              </div>
            ))}
          </div>
          {lootAutomation.autoSellJunkMonsterParts && (
            <p className="mt-3 text-sm leading-relaxed text-silver/60">
              Junk monster parts sell automatically. Parts reserved for prep and later consumable
              crafting stay in storage.
            </p>
          )}
        </div>
      )}

      {equipment.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
              Current Loadouts
            </span>
            <span className="text-sm text-silver/40">{equipment.length} operators</span>
          </div>
          <div className="space-y-1">
            {equipment.map((assignment) => (
              <div key={assignment.operatorId} className="glass-card-inset px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-silver-bright">{assignment.operatorName}</span>
                  <span className="text-sm text-gold/60">{assignment.accessorySummary}</span>
                </div>
                <div className="mt-1 grid gap-2 text-sm text-silver/55">
                  {assignment.weaponId ? (
                    <div>
                      <span>Weapon: {assignment.weaponName}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatEffectChips effects={assignment.weaponStatEffects} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-silver/35">Weapon: empty</span>
                  )}
                  {assignment.outfitOverlayId ? (
                    <div>
                      <span>Outfit: {assignment.outfitOverlayName}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatEffectChips effects={assignment.outfitStatEffects} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-silver/35">Outfit: empty</span>
                  )}
                  {assignment.accessoryId ? (
                    <div>
                      <span>Accessory: {assignment.accessoryName}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatEffectChips effects={assignment.accessoryStatEffects} />
                      </div>
                    </div>
                  ) : (
                    <span className="text-silver/35">Accessory: none assigned</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn-ghost px-1.5 py-0.5 text-sm"
                    onClick={() => callbacks.autoAssignAccessory(assignment.operatorId)}
                  >
                    auto-assign
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-1.5 py-0.5 text-sm"
                    onClick={() => callbacks.unequipItem(assignment.operatorId, "accessory")}
                    disabled={!assignment.accessoryId}
                  >
                    clear accessory
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inventory.length === 0 && (
        <div
          className={`${emptyStateClass} rounded-lg border border-dashed border-gold-dim/15 py-10`}
        >
          <div className={emptyStateIconClass}>&#9744;</div>
          <p className="text-sm font-medium text-gold/70">No stored items</p>
          <p className="mt-1 text-xs text-silver/60">
            The market and raid loot will replenish inventory over time
          </p>
        </div>
      )}

      {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
        const items = grouped.get(cat) ?? [];
        return (
          <div key={cat}>
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
                {CATEGORY_LABELS[cat] ?? cat} ({items.length})
              </span>
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const sellPrice = sellPriceByItemId.get(item.itemId) ?? 0;
                return (
                  <div
                    key={item.itemId}
                    className="rounded-lg px-2.5 py-2 hover:bg-[rgba(200,168,76,0.03)]"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="min-w-0 truncate text-xs text-silver-bright">
                            {item.name}
                          </span>
                          <ItemRankBadge rank={item.rank} />
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-silver/55">
                          {item.description}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <StatEffectChips effects={item.statEffects} />
                          <ItemTagChips tags={item.tags} />
                        </div>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums text-gold/60">x{item.quantity}</span>
                        {sellPrice > 0 && (
                          <button
                            type="button"
                            className="btn-ghost shrink-0 px-1.5 py-0.5 text-sm"
                            onClick={() => callbacks.sellItem(item.itemId, 1)}
                            title={`Sell 1 for ${sellPrice}`}
                          >
                            sell ${sellPrice}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
