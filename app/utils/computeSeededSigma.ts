import type { StockInfo } from "../types";
import { stdDev } from "./stdDev";

export function computeSeededSigma(
  stock: StockInfo,
  livePriceHistory: number[],
  midPrice: number,
): number {
  if (livePriceHistory.length > 40) {
    const recent = livePriceHistory.slice(-40);
    const returns = recent.slice(1).map((p, i) => (p - recent[i]) / recent[i]);
    return stdDev(returns) * midPrice;
  }

  if (stock.priceHistory && stock.priceHistory.length > 5) {
    const ph = stock.priceHistory;
    const returns = ph.slice(1).map((p, i) => (p - ph[i]) / ph[i]);
    const historicalSigma = stdDev(returns) * midPrice;

    if (livePriceHistory.length > 5) {
      const liveWindow = livePriceHistory.slice(-40);
      const liveReturns = liveWindow
        .slice(1)
        .map((p, i) => (p - liveWindow[i]) / liveWindow[i]);
      const liveSigma = stdDev(liveReturns) * midPrice;
      const liveWeight = Math.min(0.8, livePriceHistory.length / 50);
      return liveSigma * liveWeight + historicalSigma * (1 - liveWeight);
    }

    return historicalSigma;
  }

  return midPrice * 0.002;
}
