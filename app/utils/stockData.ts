import type { StockInfo } from "../types";

export let ALL_STOCKS: Record<string, StockInfo> = {};
export let SIM_STOCKS: StockInfo[] = [];
export let SIM_SYMBOLS: string[] = [];

export const BASE_POINT = 1139.28;
export const FUNDAMENTAL_VALUE = BASE_POINT;

const TOP_N = 50;

export function initStockData(raw: Record<string, StockInfo>) {
  ALL_STOCKS = raw;
  SIM_STOCKS = Object.values(raw)
    .filter(
      (s) => s.marketCap > 0 && s.initialPrice > 0 && s.sharesOutstanding > 0,
    )
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, TOP_N);
  SIM_SYMBOLS = SIM_STOCKS.map((s) => s.symbol);
}
