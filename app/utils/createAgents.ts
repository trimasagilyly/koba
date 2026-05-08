import type { Agent, AgentType } from "../types";
import { SIM_STOCKS, SIM_SYMBOLS } from "./stockData";
import { NUM_AGENTS } from "../constants/simulation";

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
  const types: AgentType[] = ["fundamentalist", "momentum", "hft", "noise"];
  const counts = [pctFund, pctMom, pctHft, pctNoise].map((p) =>
    Math.round((NUM_AGENTS * p) / 100),
  );
  let id = 0;

  counts.forEach((cnt, ti) => {
    const agentType = types[ti];
    for (let i = 0; i < cnt; i++) {
      const sharesMap: Record<string, number> = {};
      const lockedSharesMap: Record<string, number> = {};
      SIM_SYMBOLS.forEach((sym) => {
        sharesMap[sym] = 0;
        lockedSharesMap[sym] = 0;
      });

      let numStocksToHold: number;
      let baseLots: number;
      if (agentType === "hft") {
        numStocksToHold = SIM_SYMBOLS.length;
        baseLots = 50_000;
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

      let totalPortfolioValue = 0;
      const shuffled = [...SIM_SYMBOLS].sort(() => 0.5 - Math.random());
      shuffled.slice(0, numStocksToHold).forEach((sym) => {
        const price =
          SIM_STOCKS.find((s) => s.symbol === sym)?.initialPrice ?? 10_000;
        const shares =
          Math.max(10, Math.floor(baseLots * (0.8 + Math.random() * 0.4))) *
          100;
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
