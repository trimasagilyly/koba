import { SIM_STOCKS, BASE_POINT } from "./stockData";

export function computeVNIndex(prices: Record<string, number>): number {
  let numerator = 0;
  let denominator = 0;
  for (const s of SIM_STOCKS) {
    numerator += prices[s.symbol] * s.sharesOutstanding;
    denominator += s.initialPrice * s.sharesOutstanding;
  }
  return denominator === 0
    ? BASE_POINT
    : (numerator / denominator) * BASE_POINT;
}
