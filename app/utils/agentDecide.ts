import type {
  Agent,
  Order,
  SettlementType,
  StockInfo,
  AgentBehaviorParams,
} from "../types";
import { computeHFTQuotes } from "./computeHFTQuotes";
import { computeEnrichedFairValue } from "./computeEnrichedFairValue";
import { computeSeededSigma } from "./computeSeededSigma";
import { compositeSignal } from "./compositeSignal";
import { rsi } from "./rsi";
import { T0_VOLUME_SCALE } from "../constants/simulation";

function getRandomLots(min: number, max: number): number {
  const lo = Math.max(1, Math.round(min / 100));
  const hi = Math.max(lo, Math.round(max / 100));
  return (Math.floor(Math.random() * (hi - lo + 1)) + lo) * 100;
}

export function agentDecideForStock(
  agent: Agent,
  stock: StockInfo,
  midPrice: number,
  priceHistory: number[],
  orderIdRef: { current: number },
  driftPct: number,
  settlement: SettlementType,
  marketReturn: number = 0,
  behaviorParams?: AgentBehaviorParams,
): Order | null {
  const isT0 = settlement === "T+0";
  const beta = stock.beta ?? 1.0;

  const fundGapMult = behaviorParams?.fundGapMult ?? 1.0;
  const momSensitMult = behaviorParams?.momSensitMult ?? 1.0;
  const hftSpreadMult = behaviorParams?.hftSpreadMult ?? 1.0;
  const noiseRateMult = behaviorParams?.noiseRateMult ?? 1.0;

  const sigma = computeSeededSigma(stock, priceHistory, midPrice);
  const currentShares = agent.shares?.[stock.symbol] ?? 0;
  const lockedShares = agent.lockedShares?.[stock.symbol] ?? 0;
  const effectiveInventory = currentShares + lockedShares;

  let portfolioValue = 0;
  Object.keys(agent.shares || {}).forEach((sym) => {
    const price = sym === stock.symbol ? midPrice : stock.initialPrice;
    portfolioValue += (agent.shares![sym] || 0) * price;
  });
  Object.keys(agent.lockedShares || {}).forEach((sym) => {
    const price = sym === stock.symbol ? midPrice : stock.initialPrice;
    portfolioValue += (agent.lockedShares![sym] || 0) * price;
  });

  const wealth = (agent.cash || 0) + (agent.lockedCash || 0) + portfolioValue;
  if (wealth <= 0 && agent.type !== "hft") return null;

  const volumeScale = isT0 ? T0_VOLUME_SCALE : 1;

  let side: "buy" | "sell" | null = null;
  let price = midPrice;
  let targetQty = 0;
  let enrichedFairValue = computeEnrichedFairValue(stock);

  if (priceHistory.length > 50) {
    const sma50 = priceHistory.slice(-50).reduce((a, b) => a + b, 0) / 50;
    enrichedFairValue = enrichedFairValue * 0.8 + sma50 * 0.2;
  }

  if (agent.type === "fundamentalist") {
    const gapPct = (enrichedFairValue - midPrice) / enrichedFairValue;
    const personalTolerance = (0.01 + (agent.id % 7) * 0.005) * fundGapMult;

    if (gapPct > personalTolerance) {
      side = "buy";
      price = midPrice * 0.998;
      const severity = Math.min(4, gapPct / personalTolerance);
      targetQty = getRandomLots(
        3 * volumeScale,
        Math.floor(8 * volumeScale * severity),
      );
    } else if (gapPct < -personalTolerance) {
      side = "sell";
      price = midPrice * 1.002;
      const severity = Math.min(4, Math.abs(gapPct) / personalTolerance);
      targetQty = getRandomLots(
        3 * volumeScale,
        Math.floor(8 * volumeScale * severity),
      );
    }
  } else if (agent.type === "momentum") {
    const signal = compositeSignal(priceHistory);
    const combinedSignal = signal * 0.75 + marketReturn * beta * 0.25;
    const personalSensitivity =
      (0.002 + (agent.id % 20) * 0.001) * momSensitMult;
    const sigmaPct = midPrice > 0 ? sigma / midPrice : 0.002;
    const volScale = Math.min(1.5, Math.max(0.5, 1 + (sigmaPct - 0.01) * 15));
    const rsiVal = rsi(
      priceHistory,
      Math.min(14, Math.floor(priceHistory.length / 2)),
    );

    if (combinedSignal > personalSensitivity && rsiVal < 85) {
      side = "buy";
      const aggr = isT0
        ? 0.002 + Math.abs(combinedSignal) * 0.004
        : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 + aggr);
      targetQty = getRandomLots(
        Math.floor(5 * volScale),
        Math.floor(15 * volScale),
      );
    } else if (combinedSignal < -personalSensitivity && rsiVal > 15) {
      side = "sell";
      const aggr = isT0
        ? 0.002 + Math.abs(combinedSignal) * 0.004
        : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 - aggr);
      targetQty = getRandomLots(
        Math.floor(10 * volScale),
        Math.floor(20 * volScale),
      );
    }
  } else if (agent.type === "hft") {
    const targetInv = Math.floor(5_000_000 / 50);
    const { resPrice, spreadHalf: rawSpreadHalf } = computeHFTQuotes(
      midPrice,
      effectiveInventory,
      targetInv,
      sigma,
      isT0,
    );
    const spreadHalf = rawSpreadHalf * hftSpreadMult;

    const invImbalance = effectiveInventory - targetInv;
    side =
      invImbalance < 0
        ? "buy"
        : invImbalance > 0
          ? "sell"
          : Math.random() > 0.5
            ? "buy"
            : "sell";
    price = side === "buy" ? resPrice - spreadHalf : resPrice + spreadHalf;

    const sigmaPct = sigma / midPrice;
    const volPenalty = Math.max(0.2, 1 - (sigmaPct - 0.01) * 10);
    targetQty = getRandomLots(
      Math.floor(2 * volumeScale * volPenalty),
      Math.floor(6 * volumeScale * volPenalty),
    );
  } else if (agent.type === "whale") {
    if (
      agent.parentOrder &&
      agent.parentOrder.symbol === stock.symbol &&
      agent.parentOrder.remaining > 0
    ) {
      const po = agent.parentOrder;
      const childQty = Math.min(po.childSize, po.remaining);
      side = po.side;
      price = side === "buy" ? midPrice * 0.998 : midPrice * 1.002;
      targetQty = childQty;
      po.remaining -= childQty;
      if (po.remaining <= 0) agent.parentOrder = undefined;
    } else if (!agent.parentOrder && Math.random() < 0.05) {
      const gapPct = (enrichedFairValue - midPrice) / enrichedFairValue;
      const signal = compositeSignal(priceHistory);
      if (Math.abs(gapPct) > 0.05 || Math.abs(signal) > 0.3) {
        const dir: "buy" | "sell" = gapPct > 0 || signal > 0 ? "buy" : "sell";
        const totalQty = getRandomLots(100_000, 1_000_000);
        const childSize = Math.max(
          10_000,
          Math.round((totalQty * 0.1) / 100) * 100,
        );
        const estPrice = dir === "buy" ? midPrice * 0.998 : midPrice * 1.002;
        if (dir === "buy" && agent.cash < estPrice * childSize) return null;
        agent.parentOrder = {
          symbol: stock.symbol,
          side: dir,
          remaining: totalQty - childSize,
          childSize,
        };
        side = dir;
        price = estPrice;
        targetQty = childSize;
      }
    }
  } else {
    // Noise trader
    const noiseThreshold = Math.min(
      0.95,
      Math.max(0.05, 1 - 0.15 * noiseRateMult * (isT0 ? 2 : 1)),
    );
    if (Math.random() > noiseThreshold) {
      side = Math.random() < 0.5 ? "buy" : "sell";
      price = midPrice * (1 + (Math.random() - 0.5) * 0.01);
      targetQty = getRandomLots(volumeScale, 5 * volumeScale);
    }
  }

  if (!side || targetQty <= 0 || !isFinite(price) || price <= 0) return null;

  let finalQty = targetQty;
  if (side === "buy") {
    const maxLots = Math.floor(Math.max(0, agent.cash || 0) / (price * 100));
    if (maxLots >= 1) finalQty = Math.min(targetQty, maxLots * 100);
    else return null;
  }
  if (side === "sell") {
    const maxLots = Math.floor(Math.max(0, currentShares) / 100);
    if (agent.type === "hft") {
      const shortLimitLots = Math.floor(
        (Math.max(0, agent.cash || 0) * 0.5) / (price * 100),
      );
      if (maxLots + shortLimitLots >= 1)
        finalQty = Math.min(targetQty, (maxLots + shortLimitLots) * 100);
      else return null;
    } else {
      if (maxLots >= 1) finalQty = Math.min(targetQty, maxLots * 100);
      else return null;
    }
  }

  if (settlement !== "T+0") {
    const refPrice =
      priceHistory.length > 0
        ? priceHistory[0]
        : stock.initialPrice || midPrice;
    const drift = driftPct || 0;
    price = Math.min(
      refPrice * (1 + drift / 100),
      Math.max(refPrice * (1 - drift / 100), price),
    );
  }

  return {
    id: orderIdRef.current++,
    agentId: agent.id,
    side,
    price: parseFloat(price.toFixed(2)),
    qty: finalQty,
    timestamp: Date.now(),
  };
}
