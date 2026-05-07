import type { Agent, ActiveAgentType } from "../types";

const safe = (v: number, fallback: number) =>
  isFinite(v) && !isNaN(v) ? v : fallback;

export function computeAgentWealthShares(
  agents: Agent[],
  currentPrices: Record<string, number>,
): Record<ActiveAgentType, number> {
  const byType = { fundamentalist: 0, momentum: 0, hft: 0, noise: 0 };

  for (const a of agents) {
    if (a.type === "whale") continue;
    let portfolioValue = 0;
    for (const sym of Object.keys(a.shares || {}))
      portfolioValue += (a.shares[sym] || 0) * (currentPrices[sym] || 10000);
    for (const sym of Object.keys(a.lockedShares || {}))
      portfolioValue +=
        (a.lockedShares[sym] || 0) * (currentPrices[sym] || 10000);
    const w = safe((a.cash || 0) + (a.lockedCash || 0) + portfolioValue, 0);
    if (a.type === "fundamentalist") byType.fundamentalist += w;
    else if (a.type === "momentum") byType.momentum += w;
    else if (a.type === "hft") byType.hft += w;
    else if (a.type === "noise") byType.noise += w;
  }

  const total = Math.max(
    1,
    byType.fundamentalist + byType.momentum + byType.hft + byType.noise,
  );
  const pct = (v: number) =>
    safe(parseFloat(((v / total) * 100).toFixed(1)), 0);
  return {
    fundamentalist: pct(byType.fundamentalist),
    momentum: pct(byType.momentum),
    hft: pct(byType.hft),
    noise: pct(byType.noise),
  };
}
