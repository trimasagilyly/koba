import type {
  Agent,
  Order,
  SettlementType,
  StockInfo,
  AgentBehaviorParams,
} from "../types";
import { computeEnrichedFairValue } from "./computeEnrichedFairValue";
import { computeSeededSigma } from "./computeSeededSigma";
import { compositeSignal } from "./compositeSignal";
import { rsi } from "./rsi";
import { computeHFTQuotes } from "./computeHFTQuotes";
import { T0_VOLUME_SCALE } from "../constants/simulation";

// Hàm hỗ trợ tạo số lượng cổ phiếu ngẫu nhiên theo lô 100.
// Các tham số truyền vào là số "lot", không phải số cổ phiếu.
function getRandomLots(minLots: number, maxLots: number): number {
  const lo = Math.max(1, Math.floor(minLots));
  const hi = Math.max(lo, Math.floor(maxLots));
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

  // Hệ số tùy chỉnh hành vi từ params
  const fundGapMult = behaviorParams?.fundGapMult ?? 1.0;
  const momSensitMult = behaviorParams?.momSensitMult ?? 1.0;
  const hftSpreadMult = behaviorParams?.hftSpreadMult ?? 1.0;
  const noiseRateMult = behaviorParams?.noiseRateMult ?? 1.0;

  // Tính toán độ biến động nội sinh
  const sigma = computeSeededSigma(stock, priceHistory, midPrice);
  const currentShares = agent.shares?.[stock.symbol] ?? 0;
  const lockedShares = agent.lockedShares?.[stock.symbol] ?? 0;
  const effectiveInventory = currentShares + lockedShares;

  // Tính tổng tài sản agent
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

  // Tính fair value
  let enrichedFairValue = computeEnrichedFairValue(stock);

  // Bounded rationality: fundamental value có điều chỉnh nhẹ theo SMA50
  if (priceHistory.length > 50) {
    const sma50 = priceHistory.slice(-50).reduce((a, b) => a + b, 0) / 50;
    enrichedFairValue = enrichedFairValue * 0.8 + sma50 * 0.2;
  }

  // ---------------------------------------------------------
  // 1. NHÀ ĐẦU TƯ GIÁ TRỊ
  // ---------------------------------------------------------
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
  }

  // ---------------------------------------------------------
  // 2. NHÀ ĐẦU TƯ THEO XU HƯỚNG
  // ---------------------------------------------------------
  else if (agent.type === "momentum") {
    const signal = compositeSignal(priceHistory);

    // Giữ logic gốc: tín hiệu kỹ thuật của cổ phiếu + xu hướng thị trường chung
    const combinedSignal = signal * 0.75 + marketReturn * beta * 0.25;

    // Dải 0.002–0.100 thay vì 0.002–0.021: các momentum agent có ngưỡng kích hoạt khác nhau,
    // tránh tình trạng tất cả cùng mua/bán một lúc — đúng với thực tế thị trường
    const personalSensitivity =
      (0.002 + (agent.id % 50) * 0.002) * momSensitMult;

    const sigmaPct = midPrice > 0 ? sigma / midPrice : 0.002;

    const volScale = Math.min(
      1.5,
      Math.max(0.5, 1 + (sigmaPct - 0.01) * 15),
    );

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
  }

  // ---------------------------------------------------------
  // 3. HFT / MARKET MAKER
  // ---------------------------------------------------------
 else if (agent.type === "hft") {
  /**
   * HFT dùng mô hình quote riêng trong computeHFTQuotes.ts.
   *
   * Quan trọng:
   * target inventory phải là target theo từng mã, không phải 20% tổng wealth
   * áp cho mọi mã. Nếu không, HFT sẽ luôn nghĩ mình thiếu inventory và thiên mua.
   */
  const numSymbols = Math.max(1, Object.keys(agent.shares || {}).length);

  const targetInventoryValue = (wealth * 0.2) / numSymbols;

  const targetInventory = Math.max(
    100,
    Math.floor(targetInventoryValue / midPrice),
  );

  const { resPrice, spreadHalf } = computeHFTQuotes(
    midPrice,
    effectiveInventory,
    targetInventory,
    sigma,
    isT0,
  );

  const invValue = effectiveInventory * midPrice;
  const targetInvValue = targetInventory * midPrice;

  const inventoryGap =
    targetInvValue > 0 ? (invValue - targetInvValue) / targetInvValue : 0;

  /**
   * Nếu inventory hiện tại cao hơn target của mã này -> nghiêng bán.
   * Nếu inventory thấp hơn target -> nghiêng mua.
   */
  const sellProb = Math.min(
    0.85,
    Math.max(0.15, 0.5 + inventoryGap * 0.35),
  );

  side = Math.random() < sellProb ? "sell" : "buy";
  price = side === "buy" ? resPrice - spreadHalf : resPrice + spreadHalf;

  const sigmaPct = midPrice > 0 ? sigma / midPrice : 0.002;

  const volPenalty = Math.max(0.2, 1 - (sigmaPct - 0.01) * 10);

  targetQty = getRandomLots(
    Math.floor(2 * volumeScale * volPenalty),
    Math.floor(6 * volumeScale * volPenalty),
  );

  if (hftSpreadMult !== 1) {
    const spreadDistance = Math.abs(price - resPrice) * hftSpreadMult;
    price =
      side === "buy" ? resPrice - spreadDistance : resPrice + spreadDistance;
  }
}

  // ---------------------------------------------------------
  // 4. NOISE TRADER
  // ---------------------------------------------------------
  else {
    const baseNoise = 0.15;

    const noiseThreshold = Math.max(
      0.05,
      1 - baseNoise * noiseRateMult * (isT0 ? 2 : 1),
    );

    if (Math.random() > noiseThreshold) {
      side = Math.random() < 0.5 ? "buy" : "sell";

      const epsilon = (Math.random() - 0.5) * 0.01;
      price = midPrice * (1 + epsilon);

      targetQty = getRandomLots(volumeScale, 5 * volumeScale);
    }
  }

  // ---------------------------------------------------------
  // KIỂM TRA ĐIỀU KIỆN ĐẶT LỆNH
  // ---------------------------------------------------------
  if (!side || targetQty <= 0 || !isFinite(price) || price <= 0) return null;

  let finalQty = targetQty;

  if (side === "buy") {
    const maxLots = Math.floor(Math.max(0, agent.cash || 0) / (price * 100));

    if (maxLots >= 1) {
      finalQty = Math.min(targetQty, maxLots * 100);
    } else {
      return null;
    }
  }

  if (side === "sell") {
    const maxLots = Math.floor(Math.max(0, currentShares) / 100);

    if (agent.type === "hft") {
      const shortLimitLots = Math.floor(
        (Math.max(0, agent.cash || 0) * 0.5) / (price * 100),
      );

      if (maxLots + shortLimitLots >= 1) {
        finalQty = Math.min(targetQty, (maxLots + shortLimitLots) * 100);
      } else {
        return null;
      }
    } else {
      if (maxLots >= 1) {
        finalQty = Math.min(targetQty, maxLots * 100);
      } else {
        return null;
      }
    }
  }

  // Điều chỉnh giá theo biên độ - áp dụng cho cả T+0 và non-T+0.
  // Dùng SMA 20 ticks làm tham chiếu thay vì priceHistory[0] (giá cũ nhất):
  // - SMA20 trôi dần theo thị trường → không ghim cứng tại giá ban đầu
  // - SMA20 cập nhật chậm hơn midPrice → vẫn tạo được sức cản khi giá rơi nhanh
  if (driftPct > 0) {
    const SMA_WINDOW = 20;
    const recentPrices = priceHistory.slice(-SMA_WINDOW);
    const refPrice =
      recentPrices.length > 0
        ? recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
        : stock.initialPrice || midPrice;

    price = Math.min(
      refPrice * (1 + driftPct / 100),
      Math.max(refPrice * (1 - driftPct / 100), price),
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
