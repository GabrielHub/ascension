import { useState, useMemo } from "react";

import type {
  GameCallbacks,
  GuildViewModel,
  InventoryItemViewModel,
  MarketItemViewModel,
} from "./view-models";
import { ItemCategoryIcon, ItemRankBadge, ItemTagChips, StatEffectChips } from "./item-surface";

interface MarketPanelProps {
  marketItems: readonly MarketItemViewModel[];
  inventory: readonly InventoryItemViewModel[];
  guild: GuildViewModel;
  day: number;
  callbacks: GameCallbacks;
}

export function MarketPanel({ marketItems, inventory, guild, day, callbacks }: MarketPanelProps) {
  const [search, setSearch] = useState("");
  const query = search.toLowerCase().trim();

  const buyableItems = useMemo(
    () => marketItems.filter((mi) => mi.available && mi.buyPrice > 0),
    [marketItems],
  );

  const sellableItems = useMemo(() => {
    return inventory.flatMap((inv) => {
      const market = marketItems.find((mi) => mi.itemId === inv.itemId);
      if (!market || market.sellPrice <= 0) return [];
      return [{ ...inv, sellPrice: market.sellPrice }];
    });
  }, [inventory, marketItems]);

  const filteredBuy = useMemo(
    () =>
      query
        ? buyableItems.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.tags.some((t) => t.toLowerCase().includes(query)),
          )
        : buyableItems,
    [buyableItems, query],
  );

  const filteredSell = useMemo(
    () =>
      query
        ? sellableItems.filter(
            (item) =>
              item.name.toLowerCase().includes(query) ||
              item.tags.some((t) => t.toLowerCase().includes(query)),
          )
        : sellableItems,
    [sellableItems, query],
  );

  return (
    <div className="animate-enter" data-testid="market-panel">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold/80">Market</h3>
        <span className="text-sm tabular-nums text-gold" data-testid="market-treasury">
          ${guild.treasury}
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="market-search"
          className="w-full rounded-lg border border-gold/8 bg-[rgba(6,6,8,0.5)] px-3 py-1.5 text-sm text-silver placeholder-silver/30 outline-none transition-colors duration-200 focus:border-gold/25 focus:bg-[rgba(6,6,8,0.7)]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-silver/40 transition-colors hover:text-silver/70"
          >
            clear
          </button>
        )}
      </div>

      {/* Responsive columns */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {/* Buy column */}
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
              Buy ({filteredBuy.length})
            </span>
            <span className="text-xs tabular-nums text-silver/30">Day {day} stock</span>
          </div>
          <div className="space-y-0.5">
            {filteredBuy.length > 0 ? (
              filteredBuy.map((item) => {
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
                          <ItemCategoryIcon category={item.category} />
                          <span className="min-w-0 truncate text-xs text-silver-bright">
                            {item.name}
                          </span>
                          <ItemRankBadge rank={item.rank} />
                        </div>
                        <p className="mt-0.5 text-sm leading-snug text-silver/55">
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
              })
            ) : (
              <p className="px-2.5 py-2 text-sm text-silver/30">
                {query ? "No matches" : "Nothing to buy"}
              </p>
            )}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="relative min-w-0 border-t border-gold/6 pt-3 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
          {/* Sell column */}
          <div className="mb-1.5 flex items-center gap-2 px-1">
            <span className="text-sm uppercase tracking-[0.15em] text-gold/60">
              Sell ({filteredSell.length})
            </span>
          </div>
          <div className="space-y-0.5">
            {filteredSell.length > 0 ? (
              filteredSell.map((inv) => {
                const sellPrice = inv.sellPrice;
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
                          <ItemCategoryIcon category={inv.category} />
                          <span className="min-w-0 truncate text-xs text-silver-bright">
                            {inv.name}
                          </span>
                          <ItemRankBadge rank={inv.rank} />
                          <span className="text-sm tabular-nums text-silver/50">
                            x{inv.quantity}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm leading-snug text-silver/55">
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
              })
            ) : (
              <p className="px-2.5 py-2 text-sm text-silver/30">
                {query ? "No matches" : "Nothing to sell"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
