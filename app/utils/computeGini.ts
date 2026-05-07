import type { Agent } from "../types";

export function computeGini(agents: Agent[], midPrice: number): number {
  const wealth = agents.map((a) => {
    const totalShares = Object.values(a.shares || {}).reduce(
      (s, v) => s + v,
      0,
    );
    const totalLocked = Object.values(a.lockedShares || {}).reduce(
      (s, v) => s + v,
      0,
    );
    return Math.max(
      0,
      (a.cash || 0) +
        (a.lockedCash || 0) +
        (totalShares + totalLocked) * (midPrice || 0),
    );
  });

  wealth.sort((a, b) => a - b);
  const n = wealth.length;
  const sum = wealth.reduce((s, v) => s + v, 0);
  if (sum === 0) return 0;

  let giniNum = 0;
  wealth.forEach((w, i) => {
    giniNum += (i + 1) * w;
  });
  return Math.max(0, Math.min(1, (2 * giniNum) / (n * sum) - (n + 1) / n));
}
