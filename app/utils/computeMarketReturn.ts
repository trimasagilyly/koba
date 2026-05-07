import type { StockInfo } from "../types";

export function computeMarketReturn(
  prices: Record<string, number>,
  prevPrices: Record<string, number>,
  stocks: Record<string, StockInfo>,
): number {
  let weightedSum = 0;
  let totalCap = 0;
  for (const sym of Object.keys(prices)) {
    const cap = stocks[sym].marketCap;
    const prevP = prevPrices[sym] || stocks[sym].initialPrice;
    const ret = (prices[sym] - prevP) / prevP;
    weightedSum += cap * ret;
    totalCap += cap;
  }
  return totalCap > 0 ? weightedSum / totalCap : 0;
}
