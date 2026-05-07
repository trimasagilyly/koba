import type { Agent } from "../types";

export function computeLorenzCurve(
  agents: Agent[],
  midPrice: number,
): { x: number; y: number }[] {
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
  const totalWealth = wealth.reduce((s, v) => s + v, 0);
  if (totalWealth === 0) return [{ x: 0, y: 0 }];

  let cumWealth = 0;
  const curve = [{ x: 0, y: 0 }];
  wealth.forEach((w, i) => {
    cumWealth += w;
    curve.push({ x: (i + 1) / n, y: cumWealth / totalWealth });
  });
  return curve;
}
