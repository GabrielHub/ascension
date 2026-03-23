import type { TemplateRegistry } from "content/templates";

import { GuildState } from "../components";
import { addToInventory, removeFromInventory } from "./inventory";
import type { SimSystemContext } from "./types";

export interface MarketItemView {
  itemId: string;
  buyPrice: number;
  sellPrice: number;
  available: boolean;
}

let cachedMarketItems: MarketItemView[] | null = null;
let cachedRegistryRef: TemplateRegistry | null = null;

export function getMarketItems(registry: TemplateRegistry): MarketItemView[] {
  if (cachedMarketItems && cachedRegistryRef === registry) {
    return cachedMarketItems;
  }

  cachedMarketItems = registry.items.map((item) => ({
    itemId: item.id,
    buyPrice: item.buyPrice,
    sellPrice: item.sellPrice,
    available: item.buyPrice > 0,
  }));
  cachedRegistryRef = registry;
  return cachedMarketItems;
}

export function getMarketPriceForItem(
  registry: TemplateRegistry,
  itemId: string,
): { buyPrice: number; sellPrice: number } | null {
  const item = registry.itemById.get(itemId);
  if (!item) return null;
  return { buyPrice: item.buyPrice, sellPrice: item.sellPrice };
}

export function buyItem(context: SimSystemContext, itemId: string, price: number): boolean {
  const guildEntity = context.singletonEntities.guild;
  const treasury = GuildState.treasury[guildEntity];

  if (treasury < price) return false;

  GuildState.treasury[guildEntity] = treasury - price;
  addToInventory(context, itemId, 1);
  return true;
}

export function sellItem(
  context: SimSystemContext,
  itemId: string,
  quantity: number,
  pricePerUnit: number,
): boolean {
  if (quantity <= 0) return false;
  if (!removeFromInventory(context, itemId, quantity)) return false;

  const guildEntity = context.singletonEntities.guild;
  GuildState.treasury[guildEntity] += quantity * pricePerUnit;
  return true;
}
