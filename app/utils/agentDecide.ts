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
import { T0_VOLUME_SCALE } from "../constants/simulation";

// Hàm hỗ trợ tạo số lượng cổ phiếu ngẫu nhiên theo lô 100
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

  // Hệ số tùy chỉnh hành vi từ params
  const fundGapMult = behaviorParams?.fundGapMult ?? 1.0;
  const momSensitMult = behaviorParams?.momSensitMult ?? 1.0;
  const hftSpreadMult = behaviorParams?.hftSpreadMult ?? 1.0;
  const noiseRateMult = behaviorParams?.noiseRateMult ?? 1.0;

  // Tính toán độ biến động nội sinh (sigma)
  const sigma = computeSeededSigma(stock, priceHistory, midPrice);
  const currentShares = agent.shares?.[stock.symbol] ?? 0;
  const lockedShares = agent.lockedShares?.[stock.symbol] ?? 0;
  const effectiveInventory = currentShares + lockedShares;

  // Xác định tổng tài sản để kiểm tra khả năng sống sót của tác nhân
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
  
  // Tính V_fair (Giá trị hợp lý mở rộng)
  let enrichedFairValue = computeEnrichedFairValue(stock);

  // Điều chỉnh V_fair theo kỳ vọng thị trường (Bounded rationality)
  if (priceHistory.length > 50) {
    const sma50 = priceHistory.slice(-50).reduce((a, b) => a + b, 0) / 50;
    enrichedFairValue = enrichedFairValue * 0.8 + sma50 * 0.2;
  }

  // ---------------------------------------------------------
  // 1. NHÀ ĐẦU TƯ GIÁ TRỊ (Fundamentalist)
  // ---------------------------------------------------------
  if (agent.type === "fundamentalist") {
    // Gap = (V_fair - P_mid) / V_fair
    const gapPct = (enrichedFairValue - midPrice) / enrichedFairValue;
    // T_i = (0.01 + (i mod 7) * 0.005) * mu_fund
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
  // 2. NHÀ ĐẦU TƯ THEO XU HƯỚNG (Momentum)
  // ---------------------------------------------------------
  else if (agent.type === "momentum") {
    // S_combined = 0.75 * S_tech + 0.25 * (beta * R_m)
    const signal = compositeSignal(priceHistory);
    const combinedSignal = signal * 0.75 + marketReturn * beta * 0.25;
    
    const personalSensitivity = (0.002 + (agent.id % 20) * 0.001) * momSensitMult;
    const sigmaPct = midPrice > 0 ? sigma / midPrice : 0.002;
    
    // Vol_scale = min(1.5, max(0.5, 1 + (sigma/P_mid - 0.01) * 15))
    const volScale = Math.min(1.5, Math.max(0.5, 1 + (sigmaPct - 0.01) * 15));
    const rsiVal = rsi(priceHistory, Math.min(14, Math.floor(priceHistory.length / 2)));

    // Ràng buộc RSI: Tránh trạng thái quá mua (>85) và quá bán (<15)
    if (combinedSignal > personalSensitivity && rsiVal < 85) {
      side = "buy";
      const aggr = isT0
        ? 0.002 + Math.abs(combinedSignal) * 0.004
        : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 + aggr);
      targetQty = getRandomLots(Math.floor(5 * volScale), Math.floor(15 * volScale));
    } else if (combinedSignal < -personalSensitivity && rsiVal > 15) {
      side = "sell";
      const aggr = isT0
        ? 0.002 + Math.abs(combinedSignal) * 0.004
        : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 - aggr);
      targetQty = getRandomLots(Math.floor(10 * volScale), Math.floor(20 * volScale));
    }
  } 
  
  // ---------------------------------------------------------
  // 3. NHÀ GIAO DỊCH TẦN SUẤT CAO (HFT)
  // ---------------------------------------------------------
  else if (agent.type === "hft") {
    const targetInv = Math.floor(5_000_000 / 50); // Mức mục tiêu giả định
    const gamma = 0.1; // Hệ số ngại rủi ro
    const kappa = 100; // Độ sâu thanh khoản (market liquidity)
    
    // q = max(-1, min(1, (Inv_current - Inv_target) / Inv_target))
    const q = Math.max(-1, Math.min(1, (effectiveInventory - targetInv) / targetInv));
    
    // P_res = P_mid - q * gamma * sigma^2
    const variance = Math.pow(sigma, 2);
    const Pres = midPrice - q * gamma * variance;
    
    // delta = gamma * sigma^2 + (2/gamma) * ln(1 + gamma/kappa)
    const rawSpread = gamma * variance + (2 / gamma) * Math.log(1 + gamma / kappa);
    const delta = rawSpread * hftSpreadMult;

    // Đặt lệnh mua hoặc bán dựa trên trạng thái tồn kho
    if (q < 0) {
        side = "buy";
    } else if (q > 0) {
        side = "sell";
    } else {
        side = Math.random() > 0.5 ? "buy" : "sell"; // Cân bằng, cung cấp thanh khoản ngẫu nhiên
    }

    // P_bid = P_res - delta/2; P_ask = P_res + delta/2
    price = side === "buy" ? Pres - delta / 2 : Pres + delta / 2;

    const sigmaPct = sigma / midPrice;
    const volPenalty = Math.max(0.2, 1 - (sigmaPct - 0.01) * 10);
    targetQty = getRandomLots(
      Math.floor(2 * volumeScale * volPenalty),
      Math.floor(6 * volumeScale * volPenalty),
    );
  } 

  // ---------------------------------------------------------
  // 4. NHÀ ĐẦU TƯ NHIỄU (Noise Trader)
  // ---------------------------------------------------------
  else {
    const baseNoise = 0.15;
    // Ngưỡng U(0,1) > max(0.05, 1 - Base_noise * mu_noise)
    const noiseThreshold = Math.max(0.05, 1 - baseNoise * noiseRateMult * (isT0 ? 2 : 1));
    
    if (Math.random() > noiseThreshold) {
      side = Math.random() < 0.5 ? "buy" : "sell";
      // epsilon ~ U(-0.005, 0.005) => (Math.random() - 0.5) * 0.01
      const epsilon = (Math.random() - 0.5) * 0.01;
      price = midPrice * (1 + epsilon);
      targetQty = getRandomLots(volumeScale, 5 * volumeScale);
    }
  }

  // ---------------------------------------------------------
  // KIỂM TRA ĐIỀU KIỆN ĐẶT LỆNH CHUNG
  // ---------------------------------------------------------
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
      // HFT được phép bán khống (Short-selling) với giới hạn ký quỹ
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

  // Điều chỉnh giá theo biên độ (Price Limit / Circuit Breaker)
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
