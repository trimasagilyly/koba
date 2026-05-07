import { SIM_STOCKS } from "./stockData";

export function buildInitialPrices(): Record<string, number> {
  return Object.fromEntries(SIM_STOCKS.map((s) => [s.symbol, s.initialPrice]));
}
