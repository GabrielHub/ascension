import type {
  GameCallbacks,
  GuildViewModel,
  InventoryItemViewModel,
  MarketItemViewModel,
} from "./view-models";
import { ItemRankBadge, ItemTagChips, StatEffectChips } from "./item-surface";

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
    <div className="animate-enter space-y-4" data-testid="market-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Market</h3>
        <span className="text-sm tabular-nums text-gold" data-testid="market-treasury">
          ${guild.treasury}
        </span>
      </div>

      {/* Buy section */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
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
                  data-testid="market-buy-row"
                  data-item-id={item.itemId}
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
                      <span className="text-sm tabular-nums text-gold/70">${item.buyPrice}</span>
                      <button
                        type="button"
                        data-testid="market-buy-button"
                        data-item-id={item.itemId}
                        className="btn-primary shrink-0 px-2 py-0.5 text-sm"
                        disabled={!canAfford}
                        onClick={() => callbacks.buyItem(item.itemId)}
                      >
                        buy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-sm text-silver/30">Nothing to buy</p>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-gold/6" />

      {/* Sell section */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
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
                  data-testid="market-sell-row"
                  data-item-id={inv.itemId}
                  className="rounded-lg px-2.5 py-2 hover:bg-[rgba(200,168,76,0.03)]"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-xs text-silver-bright">
                          {inv.name}
                        </span>
                        <ItemRankBadge rank={inv.rank} />
                        <span className="text-sm tabular-nums text-silver/50">x{inv.quantity}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-silver/55">
                        {inv.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatEffectChips effects={inv.statEffects} />
                        <ItemTagChips tags={inv.tags} />
                      </div>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-gold/70">${sellPrice}</span>
                      <button
                        type="button"
                        data-testid="market-sell-button"
                        data-item-id={inv.itemId}
                        className="btn-ghost shrink-0 px-1.5 py-0.5 text-sm"
                        onClick={() => callbacks.sellItem(inv.itemId, 1)}
                      >
                        sell 1
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2.5 py-2 text-sm text-silver/30">Nothing to sell</p>
        )}
      </div>
    </div>
  );
}
