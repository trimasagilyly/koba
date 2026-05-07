export type AgentType = "fundamentalist" | "momentum" | "noise" | "hft" | "whale";

export interface Agent {
  id: number;
  type: AgentType;
  cash: number;
  shares: Record<string, number>;
  lockedCash: number;
  lockedShares: Record<string, number>;
  // Whale execution state: Almgren-Chriss (2000) parent→child order slicing
  parentOrder?: {
    symbol: string;
    side: "buy" | "sell";
    remaining: number;
    childSize: number;
  };
}

export interface Order {
  id: number;
  agentId: number;
  side: "buy" | "sell";
  price: number;
  qty: number;
  timestamp: number;
}

export interface Trade {
  price: number;
  qty: number;
  timestamp: number;
  buyerType: AgentType;
  sellerType: AgentType;
  symbol: string;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tick: number;
}

/** Single GINI time-series data point */
export interface GiniPoint {
  tick: number;
  gini: number;
}

/** Cumulative trade statistics for one agent type */
export interface AgentTradeStat {
  count: number;
  value: number;
}

export interface ScenarioMetrics {
  label: string;
  avgPrice: number;
  volatility: number;
  gini: number;
  totalVolume: number;
  crashEvents: number;
  avgSpread: number;
  liquidityFreezes: number;
  /** GINI time-series snapshot taken when the scenario was saved */
  giniHistory: GiniPoint[];
  /** Cumulative buy+sell stats per agent type for this scenario */
  tradesByType: Record<AgentType, AgentTradeStat>;
}

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  initialPrice: number;
  fundamentalValue: number;
  avgDailyVolume: number;
  marketCap: number;
  priceLimit: number;
  beta: number;
  beta_done: boolean;
  sharesOutstanding: number;
  mcap_real: boolean;
  pe?: number;
  pb?: number;
  eps?: number;
  priceHistory?: number[];
  beta_calculated?: boolean;
}

export type SettlementType = "T+2.5" | "T+0" | "T+1" | "T+3";

export type SystemState = "Normal" | "Volatile" | "Limit Hit" | "Freeze";

export type ActiveTab = "live" | "compare" | "agents" | "risk";

export type TimeScale = "1H" | "1D" | "1W" | "1M";

/**
 * Amplitude multipliers for agent trading behaviour.
 * Each param scales the corresponding "aggressiveness" dimension.
 * Range: 0.5 (passive) → 1.0 (default) → 2.0 (very aggressive).
 */
export interface AgentBehaviorParams {
  /** Scale fundamentalist gap threshold — lower = more trades */
  fundGapMult: number;
  /** Scale momentum signal sensitivity — lower = trades on weaker signals */
  momSensitMult: number;
  /** Scale HFT spread half-width — lower = tighter spreads */
  hftSpreadMult: number;
  /** Scale noise trader activity — higher = more random trades */
  noiseRateMult: number;
}
