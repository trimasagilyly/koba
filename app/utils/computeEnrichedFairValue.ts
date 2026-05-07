import type { StockInfo } from "../types";

export function computeEnrichedFairValue(stock: StockInfo): number {
  const base =
    stock.initialPrice > 0 ? stock.initialPrice : stock.fundamentalValue;
  const hasEps = stock.eps !== undefined && stock.eps > 0;
  const hasPe = stock.pe !== undefined && stock.pe > 0;
  if (!hasEps) return base;

  const dynamicPE = hasPe ? stock.pe! : 15;
  const earningsValue = stock.eps! * dynamicPE;

  let bookValue = base;
  if (stock.pb !== undefined && stock.pb > 0 && stock.initialPrice > 0) {
    bookValue = stock.initialPrice / stock.pb;
  }

  const blended = 0.4 * earningsValue + 0.4 * base + 0.2 * bookValue;
  // Allow ±15% deviation from anchor to trigger meaningful fundamentalist trades (Cont 2001)
  return Math.max(base * 0.85, Math.min(base * 1.15, blended));
}
