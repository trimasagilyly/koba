import type { Agent, ActiveAgentType } from "../types";
import { SIM_STOCKS } from "./stockData";

/**
 * Wealth seeding rationale:
 *
 * Main scenario thường dùng:
 *   Fundamentalist / Momentum / HFT / Noise = 15 / 60 / 5 / 20 theo số lượng agent.
 *
 * Nhưng số lượng agent không nên đồng nghĩa với sức ảnh hưởng tài sản.
 * Vì vậy wealth được chia theo target wealth share:
 *
 *   Fundamentalist: 35%
 *   Momentum:       35%
 *   HFT:             5%
 *   Noise:          25%
 *
 * Ý nghĩa:
 * - Fundamentalist ít hơn nhưng vốn/agent lớn hơn, đại diện quỹ/tổ chức/nhà đầu tư giá trị.
 * - Momentum đông nhưng vốn/agent thấp hơn, đại diện nhóm retail/trend-following.
 * - HFT ít về wealth share nhưng cash-heavy, đại diện liquidity provider.
 * - Noise có wealth đáng kể để phản ánh retail participation cao ở thị trường Việt Nam.
 *
 * Cash / Stock split:
 * - Fundamentalist: 40% cash, 60% stock
 * - Momentum:       60% cash, 40% stock
 * - HFT:            80% cash, 20% stock
 * - Noise:          50% cash, 50% stock
 */

const TOTAL_INITIAL_WEALTH = 100_000_000_000_000; // 100 nghìn tỷ VND cho toàn hệ mô phỏng

const TARGET_WEALTH_SHARE: Record<ActiveAgentType, number> = {
  fundamentalist: 0.35,
  momentum: 0.35,
  hft: 0.05,
  noise: 0.25,
};

const CASH_RATIO: Record<ActiveAgentType, number> = {
  fundamentalist: 0.4,
  momentum: 0.6,
  hft: 0.8,
  noise: 0.5,
};

const DISPERSION: Record<ActiveAgentType, number> = {
  fundamentalist: 0.45,
  momentum: 0.65,
  hft: 0.25,
  noise: 0.8,
};

function getLognormalWeight(sd: number): number {
  let u = 0;
  let v = 0;

  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.exp(sd * z);
}

function roundToLot(shares: number): number {
  return Math.max(0, Math.floor(shares / 100) * 100);
}

function getAgentType(agent: Agent): ActiveAgentType {
  return agent.type as ActiveAgentType;
}

function pickHoldings(type: ActiveAgentType) {
  const stocks = [...SIM_STOCKS];

  if (type === "hft") {
    // HFT cần báo giá trên diện rộng
    return stocks;
  }

  if (type === "fundamentalist") {
    // Fundamentalists nắm danh mục rộng, ưu tiên cổ phiếu vốn hóa lớn
    const n = Math.max(5, Math.floor(stocks.length * 0.6));
    return stocks
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, n);
  }

  if (type === "momentum") {
    // Momentum tập trung hơn, xoay vòng trên một rổ mã vừa phải
    const n = Math.min(stocks.length, 8 + Math.floor(Math.random() * 8)); // 8-15 mã
    return stocks.sort(() => Math.random() - 0.5).slice(0, n);
  }

  // Noise trader nắm ít mã, ngẫu nhiên
  const n = Math.min(stocks.length, 3 + Math.floor(Math.random() * 7)); // 3-9 mã
  return stocks.sort(() => Math.random() - 0.5).slice(0, n);
}

function allocateStockBudget(
  agent: Agent,
  type: ActiveAgentType,
  stockBudget: number,
) {
  const holdings = pickHoldings(type);
  if (!holdings.length || stockBudget <= 0) return;

  const totalWeight = holdings.reduce(
    (sum, stock) => sum + Math.max(1, stock.marketCap ?? stock.initialPrice),
    0,
  );

  for (const stock of holdings) {
    const price = stock.initialPrice;
    if (!price || price <= 0) continue;

    const weight = Math.max(1, stock.marketCap ?? stock.initialPrice) / totalWeight;
    const budgetForStock = stockBudget * weight;
    const shares = roundToLot(budgetForStock / price);

    agent.shares[stock.symbol] = shares;
  }
}

export function seedAgentWealth(agents: Agent[], numStocks: number) {
  if (!agents.length || numStocks <= 0 || !SIM_STOCKS.length) return;

  const byType: Record<ActiveAgentType, Agent[]> = {
    fundamentalist: [],
    momentum: [],
    hft: [],
    noise: [],
  };

  for (const agent of agents) {
    const type = getAgentType(agent);
    byType[type].push(agent);

    agent.cash = 0;
    agent.lockedCash = 0;

    for (const stock of SIM_STOCKS) {
      agent.shares[stock.symbol] = 0;
      agent.lockedShares[stock.symbol] = 0;
    }
  }

  for (const type of Object.keys(byType) as ActiveAgentType[]) {
    const groupAgents = byType[type];
    if (!groupAgents.length) continue;

    const groupTargetWealth = TOTAL_INITIAL_WEALTH * TARGET_WEALTH_SHARE[type];

    const weights = groupAgents.map(() => getLognormalWeight(DISPERSION[type]));
    const weightSum = weights.reduce((sum, w) => sum + w, 0);

    for (let i = 0; i < groupAgents.length; i++) {
      const agent = groupAgents[i];
      const agentWealth = groupTargetWealth * (weights[i] / weightSum);

      const cash = agentWealth * CASH_RATIO[type];
      const stockBudget = agentWealth - cash;

      agent.cash = cash;
      allocateStockBudget(agent, type, stockBudget);
    }
  }
}
