import stocksJson from "../data/stocks_data.json";
import type { Agent, AgentType, TimeScale, StockInfo } from "../types";

// ---------------------------------------------------------------------------
// API config
// Set NEXT_PUBLIC_API_BASE_URL in .env.local (dev) or your hosting dashboard (prod).
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const STOCK_LENGTH = parseInt(process.env.NEXT_PUBLIC_STOCK_LENGTH ?? "50");
const API_LIMIT = 20; // vnstock rate limit threshold

/**
 * Hybrid fetch strategy:
 * - length ≤ 20  → call the live API (fresh vnstock data)
 * - length > 20  → use the bundled stocks_data.json (no rate limit risk)
 */
export async function fetchAllStocks(): Promise<Record<string, StockInfo>> {
  if (STOCK_LENGTH <= API_LIMIT) {
    const res = await fetch(
      `${API_BASE_URL}/api/stocks?length=${STOCK_LENGTH}`,
    );
    if (!res.ok) throw new Error(`GET /api/stocks → ${res.status}`);
    return res.json();
  }
  // Fall back to the local JSON — no network call needed
  return stocksJson as unknown as Record<string, StockInfo>;
}

/** Fetch a single stock by symbol */
export async function fetchStock(symbol: string): Promise<StockInfo> {
  const res = await fetch(`${API_BASE_URL}/api/stocks/${symbol.toUpperCase()}`);
  if (!res.ok)
    throw new Error(
      `GET /api/stocks/${symbol} → ${res.status} ${await res.text()}`,
    );
  return res.json();
}

// ---------------------------------------------------------------------------
// Runtime stock state — populated once by useStockData on app boot
// The simulation engine reads these module-level variables directly,
// exactly as it did when they came from the static JSON import.
// ---------------------------------------------------------------------------
export let ALL_STOCKS: Record<string, StockInfo> = {};
export let SIM_STOCKS: StockInfo[] = [];
export let SIM_SYMBOLS: string[] = [];
export const BASE_POINT = 1139.28;
export const FUNDAMENTAL_VALUE = BASE_POINT;

const TOP_N = 50;

/** Called once by useStockData after the API responds. */
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

// ---------------------------------------------------------------------------
// Simulation helpers (unchanged from original)
// ---------------------------------------------------------------------------
export function buildInitialPrices(): Record<string, number> {
  return Object.fromEntries(SIM_STOCKS.map((s) => [s.symbol, s.initialPrice]));
}

export function computeVNIndex(prices: Record<string, number>): number {
  let numerator = 0;
  let denominator = 0;
  for (const s of SIM_STOCKS) {
    numerator += prices[s.symbol] * s.sharesOutstanding;
    denominator += s.initialPrice * s.sharesOutstanding;
  }
  if (denominator === 0) return BASE_POINT;
  return (numerator / denominator) * BASE_POINT;
}

export const INITIAL_PRICE = BASE_POINT;
export const NUM_AGENTS = 1000;

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance =
    arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function getLognormalRandom(mean: number, sd: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.exp(
    mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v),
  );
}

export function createAgents(
  pctFund: number,
  pctMom: number,
  pctHft: number,
  pctNoise: number,
): Agent[] {
  const agents: Agent[] = [];
  const counts = [
    Math.round((NUM_AGENTS * pctFund) / 100),
    Math.round((NUM_AGENTS * pctMom) / 100),
    Math.round((NUM_AGENTS * pctHft) / 100),
    Math.round((NUM_AGENTS * pctNoise) / 100),
  ];
  const types: AgentType[] = ["fundamentalist", "momentum", "hft", "noise"];
  let id = 0;

  counts.forEach((cnt, ti) => {
    const agentType = types[ti] as AgentType;
    for (let i = 0; i < cnt; i++) {
      const sharesMap: Record<string, number> = {};
      const lockedSharesMap: Record<string, number> = {};
      let totalPortfolioValue = 0;

      SIM_SYMBOLS.forEach((sym) => {
        sharesMap[sym] = 0;
        lockedSharesMap[sym] = 0;
      });

      let numStocksToHold = 0;
      let baseLots = 0;

      if (agentType === "hft") {
        numStocksToHold = SIM_SYMBOLS.length;
        baseLots = 50000;
      } else if (agentType === "fundamentalist") {
        numStocksToHold = Math.floor(SIM_SYMBOLS.length * 0.6);
        baseLots = Math.floor(getLognormalRandom(10, 0.5));
      } else if (agentType === "momentum") {
        numStocksToHold = Math.floor(Math.random() * 5) + 2;
        baseLots = Math.floor(getLognormalRandom(8, 0.8));
      } else {
        numStocksToHold = Math.floor(Math.random() * 3) + 1;
        baseLots = Math.floor(getLognormalRandom(7, 0.5));
      }

      const shuffled = [...SIM_SYMBOLS].sort(() => 0.5 - Math.random());
      shuffled.slice(0, numStocksToHold).forEach((sym) => {
        const stock = SIM_STOCKS.find((s) => s.symbol === sym);
        const price = stock ? stock.initialPrice : 10000;
        const lots = Math.max(
          10,
          Math.floor(baseLots * (0.8 + Math.random() * 0.4)),
        );
        const shares = lots * 100;
        sharesMap[sym] = shares;
        totalPortfolioValue += shares * price;
      });

      const cashMult =
        agentType === "hft"
          ? 3.0
          : agentType === "fundamentalist"
            ? 1.0 + Math.random()
            : agentType === "momentum"
              ? 0.2 + Math.random() * 0.5
              : 0.5 + Math.random() * 0.5;

      agents.push({
        id: id++,
        type: agentType,
        cash: totalPortfolioValue * cashMult,
        shares: sharesMap,
        lockedCash: 0,
        lockedShares: lockedSharesMap,
      });
    }
  });

  return agents;
}

export const TICK_LIMITS: Record<TimeScale, number> = {
  "1H": 50,
  "1D": 300,
  "1W": 2000,
  "1M": 8000,
};
