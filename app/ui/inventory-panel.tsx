import type {
  EquipmentViewModel,
  GameCallbacks,
  InventoryItemViewModel,
  MarketItemViewModel,
} from "./view-models";

interface InventoryPanelProps {
  inventory: readonly InventoryItemViewModel[];
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
        <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-10">
          <div className="empty-state-icon">&#9744;</div>
          <p className="text-[0.7rem] font-medium text-gold/70">No items</p>
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
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Inventory</h3>
        <span className="text-[0.6875rem] tabular-nums text-silver/50">
          {inventory.reduce((sum, it) => sum + it.quantity, 0)} items
        </span>
      </div>

      {equipment.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
              Current Loadouts
            </span>
            <span className="text-[0.6875rem] text-silver/40">{equipment.length} operators</span>
          </div>
          <div className="space-y-1">
            {equipment.map((assignment) => (
              <div key={assignment.operatorId} className="glass-card-inset px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-silver-bright">{assignment.operatorName}</span>
                  <span className="text-[0.6875rem] text-gold/60">
                    {assignment.accessorySummary}
                  </span>
                </div>
                <div className="mt-1 grid gap-1 text-[0.6875rem] text-silver/55">
                  {assignment.weaponId ? (
                    <span>Weapon: {assignment.weaponName}</span>
                  ) : (
                    <span className="text-silver/35">Weapon: empty</span>
                  )}
                  {assignment.outfitOverlayId ? (
                    <span>Outfit: {assignment.outfitOverlayName}</span>
                  ) : (
                    <span className="text-silver/35">Outfit: empty</span>
                  )}
                  {assignment.accessoryId ? (
                    <span>Accessory: {assignment.accessoryName}</span>
                  ) : (
                    <span className="text-silver/35">Accessory: none assigned</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className="btn-ghost px-1.5 py-0.5 text-[0.6875rem]"
                    onClick={() => callbacks.autoAssignAccessory(assignment.operatorId)}
                  >
                    auto-assign
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-1.5 py-0.5 text-[0.6875rem]"
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
        <div className="empty-state rounded-lg border border-dashed border-gold-dim/15 py-10">
          <div className="empty-state-icon">&#9744;</div>
          <p className="text-[0.7rem] font-medium text-gold/70">No stored items</p>
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
              <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
                {CATEGORY_LABELS[cat] ?? cat} ({items.length})
              </span>
            </div>
            <div className="space-y-0.5">
              {items.map((item) => {
                const sellPrice = sellPriceByItemId.get(item.itemId) ?? 0;
                return (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[rgba(200,168,76,0.03)]"
                  >
                    <span className="min-w-0 truncate text-xs text-silver-bright">{item.name}</span>
                    <span className="ml-auto shrink-0 text-[0.6875rem] tabular-nums text-gold/60">
                      x{item.quantity}
                    </span>
                    {sellPrice > 0 && (
                      <button
                        type="button"
                        className="btn-ghost shrink-0 px-1.5 py-0.5 text-[0.6875rem]"
                        onClick={() => callbacks.sellItem(item.itemId, 1)}
                        title={`Sell 1 for ${sellPrice}`}
                      >
                        sell ${sellPrice}
                      </button>
                    )}
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
