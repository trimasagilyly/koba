import type { Agent } from "../types";
import { SIM_STOCKS } from "./stockData";

export function seedAgentWealth(agents: Agent[], numStocks: number) {
  for (const agent of agents) {
    const m = 0.3 + Math.random() * 1.7;
    if (agent.type === "fundamentalist") {
      agent.cash = 150_000_000_000 * m;
      const shares = Math.floor((400_000 * m) / numStocks);
      SIM_STOCKS.forEach((s) => {
        agent.shares[s.symbol] = shares;
      });
    } else if (agent.type === "momentum") {
      agent.cash = 40_000_000_000 * m;
      const shares = Math.floor((800_000 * m) / numStocks);
      SIM_STOCKS.forEach((s) => {
        agent.shares[s.symbol] = shares;
      });
    } else if (agent.type === "noise") {
      const nm = 0.1 + Math.random() * 1.9;
      agent.cash = 15_000_000_000 * nm;
      const shares = Math.floor((300_000 * nm) / numStocks);
      SIM_STOCKS.forEach((s) => {
        agent.shares[s.symbol] = shares;
      });
    } else if (agent.type === "hft") {
      agent.cash = 20_000_000_000 *m;
      const shares = Math.floor(500_000 * m / numStocks);
      SIM_STOCKS.forEach((s) => {
        agent.shares[s.symbol] = shares;
      });
    }
  }
}
