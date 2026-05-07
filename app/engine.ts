import type { Agent, Order, SettlementType, StockInfo, AgentBehaviorParams } from "./types";

import { stdDev } from "./constants";



const T0_TURNOVER_RATIO = 20;



export function computeGini(agents: Agent[], midPrice: number): number {

  const validAgents = agents; 

  

  const wealth = validAgents.map((a) => {

    // INTERN FIX: Thêm fallback || {} và || 0 để tránh tuyệt đối lỗi NaN làm crash Web

    const totalShares = Object.values(a.shares || {}).reduce((s, v) => s + v, 0);

    const totalLocked = Object.values(a.lockedShares || {}).reduce((s, v) => s + v, 0);

    const rawWealth = (a.cash || 0) + (a.lockedCash || 0) + (totalShares + totalLocked) * (midPrice || 0);

    

    // Ép sàn tài sản về 0 nếu bị âm vốn, chặn Gini vượt 1

    return Math.max(0, rawWealth); 

  });

  

  wealth.sort((a, b) => a - b);

  const n = wealth.length;

  const sum = wealth.reduce((s, v) => s + v, 0);

  

  if (sum === 0) return 0;

  

  let cumSum = 0;

  let giniNum = 0;

  wealth.forEach((w, i) => {

    cumSum += w;

    giniNum += (i + 1) * w;

  });

  

  return Math.max(0, Math.min(1, (2 * giniNum) / (n * sum) - (n + 1) / n));

}



export function computeLorenzCurve(agents: Agent[], midPrice: number): {x: number, y: number}[] {

  const validAgents = agents;

  

  const wealth = validAgents.map((a) => {

    const totalShares = Object.values(a.shares || {}).reduce((s, v) => s + v, 0);

    const totalLocked = Object.values(a.lockedShares || {}).reduce((s, v) => s + v, 0);

    const rawWealth = (a.cash || 0) + (a.lockedCash || 0) + (totalShares + totalLocked) * (midPrice || 0);

    return Math.max(0, rawWealth); 

  });

  

  wealth.sort((a, b) => a - b);

  const n = wealth.length;

  const totalWealth = wealth.reduce((s, v) => s + v, 0);

  

  if (totalWealth === 0) return [{ x: 0, y: 0 }];



  let cumWealth = 0;

  const lorenzCurve = [{ x: 0, y: 0 }];



  wealth.forEach((w, i) => {

    cumWealth += w;

    const x = (i + 1) / n;

    const y = cumWealth / totalWealth;

    lorenzCurve.push({ x, y });

  });



  return lorenzCurve;

}



export function computeHFTQuotes(

  mid: number,

  inventory: number,

  targetInventory: number,

  sigma: number,

  isT0: boolean

): { resPrice: number; spreadHalf: number } {

  if (targetInventory <= 0 || mid <= 0) return { resPrice: mid, spreadHalf: mid * 0.001 };



  // Normalize inventory imbalance q ∈ [-1, 1] (Avellaneda-Stoikov 2008, eq.7)

  const q = Math.max(-1, Math.min(1, (inventory - targetInventory) / targetInventory));

  const sigmaPct = sigma / mid;



  // Risk-aversion parameter calibrated by price scale

  const gamma = 0.05 / mid;

  const kappa = 1.5;



  // Reservation price: lean away from inventory imbalance (A-S eq.8)

  const riskPremium = q * gamma * (sigma * sigma);

  const boundedRiskPremium = Math.max(-mid * 0.05, Math.min(mid * 0.05, riskPremium));

  const resPrice = mid - boundedRiskPremium;



  // Spread: A-S formula with smooth vol scaling — no hard panic threshold

  // Higher volatility → continuously wider spread, not a step function

  let delta = (gamma * (sigma * sigma)) + (2 / gamma) * Math.log(1 + gamma / kappa);

  delta = delta * (1 + 8 * sigmaPct);   // smooth: vol 2% → 1.16×, vol 5% → 1.4×

  delta = delta * (isT0 ? 0.8 : 1.2);



  // Clamp: 0.1% – 1.5% of mid price

  delta = Math.max(mid * 0.001, Math.min(mid * 0.015, delta));



  return { resPrice, spreadHalf: delta / 2 };

}



function getRandomLots(min: number, max: number): number {

  const lo = Math.max(1, Math.round(min / 100));

  const hi = Math.max(lo, Math.round(max / 100));

  return (Math.floor(Math.random() * (hi - lo + 1)) + lo) * 100;

}



function computeStreak(history: number[]): number {

  if (history.length < 2) return 0;

  const last = history[history.length - 1];

  const prev = history[history.length - 2];

  const dir = last > prev ? 1 : last < prev ? -1 : 0;

  if (dir === 0) return 0;

  let streak = dir;

  for (let i = history.length - 2; i > 0; i--) {

    const d =

      history[i] > history[i - 1] ? 1 : history[i] < history[i - 1] ? -1 : 0;

    if (d !== dir) break;

    streak += dir;

  }

  return streak;

}



function ema(history: number[], period: number): number {

  if (history.length === 0) return 0;

  const slice = history.slice(-period * 2);

  const k = 2 / (period + 1);

  let e = slice[0];

  for (let i = 1; i < slice.length; i++) e = slice[i] * k + e * (1 - k);

  return e;

}



function rsi(history: number[], period: number = 14): number {

  if (history.length < period + 1) return 50;

  const slice = history.slice(-(period + 1));

  let gains = 0,

    losses = 0;

  for (let i = 1; i < slice.length; i++) {

    const diff = slice[i] - slice[i - 1];

    if (diff > 0) gains += diff;

    else losses -= diff;

  }

  if (losses === 0) return 100;

  const rs = gains / losses;

  return 100 - 100 / (1 + rs);

}



function compositeSignal(history: number[]): number {

  if (history.length < 6) {

    const tail = history.length;

    return tail >= 2

      ? (history[tail - 1] - history[tail - 2]) / history[tail - 2]

      : 0;

  }



  const last = history[history.length - 1];

  const fastPeriod = Math.min(8, Math.floor(history.length / 3));

  const slowPeriod = Math.min(21, Math.floor(history.length * 0.6));

  const fastEma = ema(history, fastPeriod);

  const slowEma = ema(history, slowPeriod);

  const emaCross = slowEma > 0 ? (fastEma - slowEma) / slowEma : 0;



  const ret5 =

    history.length >= 6

      ? (last - history[history.length - 6]) / history[history.length - 6]

      : 0;

  const ret10 =

    history.length >= 11

      ? (last - history[history.length - 11]) / history[history.length - 11]

      : ret5;

  const ret20 =

    history.length >= 21

      ? (last - history[history.length - 21]) / history[history.length - 21]

      : ret10;



  const streak = computeStreak(history) / 10;

  const rsiVal = rsi(history, Math.min(14, Math.floor(history.length / 2)));

  const rsiSignal = (rsiVal - 50) / 100;



  const signal =

    emaCross * 0.3 +

    ret5 * 0.25 +

    ret10 * 0.15 +

    ret20 * 0.1 +

    streak * 0.12 +

    rsiSignal * 0.08;



  return Math.max(-1, Math.min(1, signal));

}



export function computeEnrichedFairValue(stock: StockInfo): number {

  // Lấy giá khởi điểm (initialPrice) làm mỏ neo tuyệt đối

  const base = stock.initialPrice > 0 ? stock.initialPrice : stock.fundamentalValue;

  const hasEps = stock.eps !== undefined && stock.eps > 0;

  const hasPe = stock.pe !== undefined && stock.pe > 0;



  if (!hasEps) return base;



  const dynamicPE = hasPe ? stock.pe! : 15; 

  const earningsValue = stock.eps! * dynamicPE; 



  let bookValue = base;

  if (stock.pb !== undefined && stock.pb > 0 && stock.initialPrice > 0) {

    bookValue = stock.initialPrice / stock.pb;

  }



  const blended = 0.4 * earningsValue + 0.4 * base + 0.2 * bookValue;



  // Nới biên ±15%: cho phép fundamentalist phản ứng với mispricing thực sự

  // (Cont 2001: giá lệch khỏi fundamental mới sinh ra giao dịch có ý nghĩa)

  return Math.max(base * 0.85, Math.min(base * 1.15, blended));

}



export function computeSeededSigma(

  stock: StockInfo,

  livePriceHistory: number[],

  midPrice: number,

): number {

  if (livePriceHistory.length > 20) {

    const recent = livePriceHistory.slice(-20);

    const returns = recent.slice(1).map((p, i) => (p - recent[i]) / recent[i]);

    return stdDev(returns) * midPrice;

  }



  if (stock.priceHistory && stock.priceHistory.length > 5) {

    const ph = stock.priceHistory;

    const returns = ph.slice(1).map((p, i) => (p - ph[i]) / ph[i]);

    const historicalSigmaPct = stdDev(returns);

    const historicalSigma = historicalSigmaPct * midPrice;



    if (livePriceHistory.length > 5) {

      const liveReturns = livePriceHistory

        .slice(-livePriceHistory.length)

        .slice(1)

        .map((p, i) => (p - livePriceHistory[i]) / livePriceHistory[i]);

      const liveSigma = stdDev(liveReturns) * midPrice;

      const liveWeight = Math.min(0.8, livePriceHistory.length / 30);

      return liveSigma * liveWeight + historicalSigma * (1 - liveWeight);

    }



    return historicalSigma;

  }



  return midPrice * 0.002;

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

  const fundGapMult    = behaviorParams?.fundGapMult    ?? 1.0;
  const momSensitMult  = behaviorParams?.momSensitMult  ?? 1.0;
  const hftSpreadMult  = behaviorParams?.hftSpreadMult  ?? 1.0;
  const noiseRateMult  = behaviorParams?.noiseRateMult  ?? 1.0;

  const sigma = computeSeededSigma(stock, priceHistory, midPrice);
  const currentShares = (agent.shares && agent.shares[stock.symbol]) ? agent.shares[stock.symbol] : 0;
  const lockedShares = (agent.lockedShares && agent.lockedShares[stock.symbol]) ? agent.lockedShares[stock.symbol] : 0;
  const effectiveInventory = currentShares + lockedShares;

  let portfolioValue = 0;
  Object.keys(agent.shares || {}).forEach(sym => {
    const priceToUse = sym === stock.symbol ? midPrice : stock.initialPrice; 
    portfolioValue += (agent.shares![sym] || 0) * priceToUse;
  });
  Object.keys(agent.lockedShares || {}).forEach(sym => {
    const priceToUse = sym === stock.symbol ? midPrice : stock.initialPrice;
    portfolioValue += (agent.lockedShares![sym] || 0) * priceToUse;
  });

  const wealth = (agent.cash || 0) + (agent.lockedCash || 0) + portfolioValue;

  if (wealth <= 0 && agent.type !== "hft") return null;

  // FIX 1: T+0 giảm volume scale từ 20 xuống 3 để Fundamentlist không bị cháy tài khoản trong 2 tick
  const volumeScale = isT0 ? 3 : 1; 

  let side: "buy" | "sell" | null = null;
  let price = midPrice;
  let targetQty = 0;
  let enrichedFairValue = computeEnrichedFairValue(stock);

  if (priceHistory.length > 50) {
    const recentPrices = priceHistory.slice(-50);
    const sma50 = recentPrices.reduce((a, b) => a + b, 0) / 50;
    enrichedFairValue = enrichedFairValue * 0.8 + sma50 * 0.2;
  }

  // ==========================================
  // NÃO BỘ TÁC TỬ ĐÃ ĐƯỢC CÂN CHỈNH LẠI
  // ==========================================
  
  if (agent.type === "fundamentalist") {
    const gapPct = (enrichedFairValue - midPrice) / enrichedFairValue;
    const personalTolerance = (0.01 + (agent.id % 7) * 0.005) * fundGapMult;

    if (gapPct > personalTolerance) {
      side = "buy";
      // FIX 2: Mua giá thấp, kê lệnh tạo thanh khoản đệm (Support) chứ không FOMO đuổi giá
      price = midPrice * 0.998; 
      const severity = Math.min(4, gapPct / personalTolerance);
      targetQty = getRandomLots(3 * volumeScale, Math.floor(8 * volumeScale * severity));
    } else if (gapPct < -personalTolerance) {
      side = "sell";
      // FIX 2: Bán giá cao, kê đệm Ask (Resistance)
      price = midPrice * 1.002; 
      const severity = Math.min(4, Math.abs(gapPct) / personalTolerance);
      targetQty = getRandomLots(3 * volumeScale, Math.floor(8 * volumeScale * severity));
    }
  } 
  
  else if (agent.type === "momentum") {
    const signal = compositeSignal(priceHistory);
    const systematicImpact = marketReturn * beta;
    const combinedSignal = signal * 0.75 + systematicImpact * 0.25;

    // FIX 3: Nới rộng module ngẫu nhiên để 600 agents không mua đồng loạt cùng 1 tích tắc
    const personalSensitivity = (0.002 + (agent.id % 20) * 0.001) * momSensitMult;
    const sigmaPct = midPrice > 0 ? sigma / midPrice : 0.002;
    const volScale = Math.min(1.5, Math.max(0.5, 1 + (sigmaPct - 0.01) * 15));

    const rsiVal = rsi(priceHistory, Math.min(14, Math.floor(priceHistory.length / 2)));
    
    // FIX 4: Tháo xích RSI! Cho phép RSI lên 95 mới ngưng mua, và rớt xuống 5 mới ngưng bán
    if (combinedSignal > personalSensitivity && rsiVal < 85) {
      side = "buy";
      const aggressionPct = isT0 ? 0.002 + Math.abs(combinedSignal) * 0.004 : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 + aggressionPct);
      targetQty = getRandomLots(Math.floor(5 * volScale), Math.floor(15 * volScale));
    } else if (combinedSignal < -personalSensitivity && rsiVal > 15) { 
      side = "sell";
      const aggressionPct = isT0 ? 0.002 + Math.abs(combinedSignal) * 0.004 : 0.001 + Math.abs(combinedSignal) * 0.002;
      price = midPrice * (1 - aggressionPct);
      targetQty = getRandomLots(Math.floor(10 * volScale), Math.floor(20 * volScale));
    }
  } 
  
  else if (agent.type === "hft") {
    // Để HFT sống được, Target Inventory phải khớp với lượng gán ban đầu (Ví dụ 50 mã)
    const numStocks = 50; 
    const targetInv = Math.floor(5000000 / numStocks); // Mốc chuẩn 100k cổ phiếu

    const { resPrice, spreadHalf: rawSpreadHalf } = computeHFTQuotes(midPrice, effectiveInventory, targetInv, sigma, isT0);
    const spreadHalf = rawSpreadHalf * hftSpreadMult;

    const invImbalance = effectiveInventory - targetInv;
    side = invImbalance < 0 ? "buy" : invImbalance > 0 ? "sell" : (Math.random() > 0.5 ? "buy" : "sell");
    
    price = side === "buy" ? resPrice - spreadHalf : resPrice + spreadHalf;

    const sigmaPctHft = sigma / midPrice;
    const volPenalty = Math.max(0.2, 1 - (sigmaPctHft - 0.01) * 10);
    targetQty = getRandomLots(Math.floor(2 * volumeScale * volPenalty), Math.floor(6 * volumeScale * volPenalty));
  }
  else {
    const baseNoise = isT0 ? 0.08 : 0.15;
    const noiseThreshold = Math.min(0.95, Math.max(0.05, 1 - (baseNoise * noiseRateMult)));
    
    if (Math.random() > noiseThreshold) {
      side = Math.random() < 0.5 ? "buy" : "sell";
      const randomSpread = (Math.random() - 0.5) * 0.01; 
      price = midPrice * (1 + randomSpread);
      targetQty = getRandomLots(1 * volumeScale, 5 * volumeScale);
    }
  }

  // ==========================================
  // XỬ LÝ QUỸ & KHỚP LỆNH (Giữ Nguyên)
  // ==========================================
  if (!side || targetQty <= 0 || !isFinite(price) || price <= 0) return null;

  let finalQty = targetQty;
  if (side === "buy") {
    const availableCash = Math.max(0, agent.cash || 0); 
    const maxLots = Math.floor(availableCash / (price * 100));
    if (maxLots >= 1) finalQty = Math.min(targetQty, maxLots * 100);
    else return null;
  }
  
  if (side === "sell") {
    const maxLots = Math.floor(Math.max(0, currentShares) / 100);
    
    if (agent.type === "hft") {
      const availableCashForMargin = Math.max(0, agent.cash || 0);
      const shortLimitLots = Math.floor((availableCashForMargin * 0.5) / (price * 100));
      if (maxLots + shortLimitLots >= 1) {
        finalQty = Math.min(targetQty, (maxLots + shortLimitLots) * 100);
      } else return null;
    } 
    else {
      if (maxLots >= 1) finalQty = Math.min(targetQty, maxLots * 100);
      else return null;
    }
  }

  if (settlement !== "T+0") {
    const refPrice = priceHistory.length > 0 ? priceHistory[0] : (stock.initialPrice || midPrice);
    const drift = driftPct || 0; 
    const maxP = refPrice * (1 + drift / 100);
    const minP = refPrice * (1 - drift / 100);
    price = Math.min(maxP, Math.max(minP, price));
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



export function computeMarketReturn(

  prices: Record<string, number>,

  prevPrices: Record<string, number>,

  stocks: Record<string, StockInfo>,

): number {

  let weightedSum = 0;

  let totalCap = 0;

  for (const sym of Object.keys(prices)) {

    const cap = stocks[sym].marketCap;

    const prevP = prevPrices[sym] || stocks[sym].initialPrice;

    const ret = (prices[sym] - prevP) / prevP;

    weightedSum += cap * ret;

    totalCap += cap;

  }

  return totalCap > 0 ? weightedSum / totalCap : 0;

}