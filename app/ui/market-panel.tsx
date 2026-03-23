import type {
  GameCallbacks,
  GuildViewModel,
  InventoryItemViewModel,
  MarketItemViewModel,
} from "./view-models";

interface MarketPanelProps {
  marketItems: readonly MarketItemViewModel[];
  inventory: readonly InventoryItemViewModel[];
  guild: GuildViewModel;
  callbacks: GameCallbacks;
}

export function MarketPanel({ marketItems, inventory, guild, callbacks }: MarketPanelProps) {
  const buyableItems = marketItems.filter((mi) => mi.available && mi.buyPrice > 0);
  const sellableItems = inventory.filter((inv) => {
    const market = marketItems.find((mi) => mi.itemId === inv.itemId);
    return market && market.sellPrice > 0;
  });

  return (
    <div className="animate-enter space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Market</h3>
        <span className="text-[0.6875rem] tabular-nums text-gold">${guild.treasury}</span>
      </div>

      {/* Buy section */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
            Buy ({buyableItems.length})
          </span>
        </div>
        {buyableItems.length > 0 ? (
          <div className="space-y-0.5">
            {buyableItems.map((item) => {
              const canAfford = guild.treasury >= item.buyPrice;
              return (
                <div
                  key={item.itemId}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[rgba(200,168,76,0.03)]"
                >
                  <span className="min-w-0 truncate text-xs text-silver-bright">{item.name}</span>
                  <span className="ml-auto shrink-0 text-[0.6875rem] tabular-nums text-gold/70">
                    ${item.buyPrice}
                  </span>
                  <button
                    type="button"
                    className="btn-primary shrink-0 px-2 py-0.5 text-[0.6875rem]"
                    disabled={!canAfford}
                    onClick={() => callbacks.buyItem(item.itemId)}
                  >
                    buy
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-[0.6875rem] text-silver/30">Nothing to buy</p>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-gold/6" />

      {/* Sell section */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[0.6875rem] uppercase tracking-[0.15em] text-gold/60">
            Sell ({sellableItems.length})
          </span>
        </div>
        {sellableItems.length > 0 ? (
          <div className="space-y-0.5">
            {sellableItems.map((inv) => {
              const market = marketItems.find((mi) => mi.itemId === inv.itemId);
              const sellPrice = market?.sellPrice ?? 0;
              return (
                <div
                  key={inv.itemId}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-[rgba(200,168,76,0.03)]"
                >
                  <span className="min-w-0 truncate text-xs text-silver-bright">{inv.name}</span>
                  <span className="shrink-0 text-[0.6875rem] tabular-nums text-silver/50">
                    x{inv.quantity}
                  </span>
                  <span className="ml-auto shrink-0 text-[0.6875rem] tabular-nums text-gold/70">
                    ${sellPrice}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 px-1.5 py-0.5 text-[0.6875rem]"
                    onClick={() => callbacks.sellItem(inv.itemId, 1)}
                  >
                    sell 1
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-[0.6875rem] text-silver/30">Nothing to sell</p>
        )}
      </div>
    </div>
  );
}
