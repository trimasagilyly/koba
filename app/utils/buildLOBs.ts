import { SIM_STOCKS, SIM_SYMBOLS } from "./stockData";
import { buildInitialPrices } from "./buildInitialPrices";
import type { StockLOB } from "./matchOrders";

export function buildLOBs(): Record<string, StockLOB> {
  const initialPrices = buildInitialPrices();
  const lobs: Record<string, StockLOB> = {};
  for (let i = 0; i < SIM_SYMBOLS.length; i++) {
    const sym = SIM_SYMBOLS[i];
    const stock = SIM_STOCKS[i] as (typeof SIM_STOCKS)[0] & {
      priceHistory?: number[];
    };
    const seedHistory =
      stock.priceHistory && stock.priceHistory.length > 0
        ? [...stock.priceHistory]
        : [initialPrices[sym]];
    if (seedHistory[seedHistory.length - 1] !== initialPrices[sym])
      seedHistory.push(initialPrices[sym]);
    lobs[sym] = {
      bids: [],
      asks: [],
      midPrice: initialPrices[sym],
      priceHistory: seedHistory,
    };
  }
  return lobs;
}
