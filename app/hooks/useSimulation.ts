import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Agent,
  Order,
  Trade,
  Candle,
  ScenarioMetrics,
  AgentType,
  SettlementType,
  SystemState,
  TimeScale,
  GiniPoint,
  AgentTradeStat,
  AgentBehaviorParams,
} from "../types";
import {
  NUM_AGENTS,
  stdDev,
  createAgents,
  TICK_LIMITS,
  SIM_STOCKS,
  SIM_SYMBOLS,
  buildInitialPrices,
  computeVNIndex,
  BASE_POINT,
} from "../constants";
import {
  computeGini,
  computeLorenzCurve,
  agentDecideForStock,
  computeEnrichedFairValue,
} from "../engine";

const safe = (v: number, fallback = 0) =>
  isFinite(v) && !isNaN(v) ? v : fallback;

interface StockLOB {
  bids: Order[];
  asks: Order[];
  midPrice: number;
  priceHistory: number[];
}

type ActiveAgentType = Exclude<AgentType, "whale">;

const EMPTY_TRADES_BY_TYPE = (): Record<ActiveAgentType, AgentTradeStat> => ({
  fundamentalist: { count: 0, value: 0 },
  momentum:       { count: 0, value: 0 },
  hft:            { count: 0, value: 0 },
  noise:          { count: 0, value: 0 },
});

let enrichedFairValues: Record<string, number> = {};

function initEnrichedFairValues() {
  enrichedFairValues = {};
  for (const stock of SIM_STOCKS) {
    enrichedFairValues[stock.symbol] = computeEnrichedFairValue(stock);
  }
}

export function computeMarketMultiples(): {
  avgPE: number | null;
  avgPB: number | null;
} {
  const withPE = SIM_STOCKS.filter((s) => s.pe && s.pe > 0);
  const withPB = SIM_STOCKS.filter((s) => s.pb && s.pb > 0);
  return {
    avgPE:
      withPE.length > 0
        ? withPE.reduce((s, st) => s + (st.pe ?? 0), 0) / withPE.length
        : null,
    avgPB:
      withPB.length > 0
        ? withPB.reduce((s, st) => s + (st.pb ?? 0), 0) / withPB.length
        : null,
  };
}

export function useSimulation(
  settlement: SettlementType,
  timeScale: TimeScale,
  driftPct: number,
  pctFund: number,
  pctMom: number,
  pctHft: number,
  pctNoise: number,
  behaviorParams: AgentBehaviorParams,
) {
  const [isRunning, setIsRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [vnIndex, setVnIndex] = useState(BASE_POINT);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [bids, setBids] = useState<Order[]>([]);
  const [asks, setAsks] = useState<Order[]>([]);
  const [gini, setGini] = useState(0.45);
  const [spread, setSpread] = useState(0.5);
  const [totalVolume, setTotalVolume] = useState(0);
  const [crashEvents, setCrashEvents] = useState(0);
  const [freezeEvents, setFreezeEvents] = useState(0);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [systemState, setSystemState] = useState<SystemState>("Normal");
  
  const [wealthByType, setWealthByType] = useState<Record<ActiveAgentType, number>>({
    fundamentalist: 25,
    momentum: 25,
    hft: 25,
    noise: 25,
  });
  
  const [scenarioMetrics, setScenarioMetrics] = useState<ScenarioMetrics[]>([]);
  const [giniHistory, setGiniHistory] = useState<GiniPoint[]>([]);
  const [tradesByType, setTradesByType] = useState<Record<ActiveAgentType, AgentTradeStat>>(
    EMPTY_TRADES_BY_TYPE(),
  );
  const [lorenzCurve, setLorenzCurve] = useState<{ x: number; y: number }[]>([]);

  const agentsRef = useRef<Agent[]>([]);
  const lobsRef = useRef<Record<string, StockLOB>>({});
  const vnIndexHistoryRef = useRef<number[]>([BASE_POINT]);
  const vnIndexRef = useRef(BASE_POINT);
  const orderIdRef = useRef(0);
  const totalVolumeRef = useRef(0);
  const crashRef = useRef(0);
  const freezeRef = useRef(0);
  const tradeHistoryRef = useRef<Trade[]>([]);
  const tickRef = useRef(0);
  const candlesRef = useRef<Candle[]>([]);
  const currentCandleRef = useRef<{
    open: number;
    high: number;
    low: number;
    trades: number;
    vol: number;
  } | null>(null);
  const giniRef = useRef(0.45);
  const spreadRef = useRef(0.5);
  const settlementQueueRef = useRef
    <{
      tick: number;
      agentId: number;
      symbol: string;
      cash: number;
      shares: number;
    }[]
  >([]);
  const giniHistoryRef = useRef<GiniPoint[]>([]);
  const tradesByTypeRef = useRef<Record<ActiveAgentType, AgentTradeStat>>(EMPTY_TRADES_BY_TYPE());
  const behaviorParamsRef = useRef<AgentBehaviorParams>(behaviorParams);
  
  useEffect(() => {
    behaviorParamsRef.current = behaviorParams;
  }, [behaviorParams]);

  const initLOBs = () => {
    const initialPrices = buildInitialPrices();
    const lobs: Record<string, StockLOB> = {};
    for (let i = 0; i < SIM_SYMBOLS.length; i++) {
      const sym = SIM_SYMBOLS[i];
      const stock = SIM_STOCKS[i] as (typeof SIM_STOCKS)[0] & {
        priceHistory?: number[];
      };
      const seedHistory: number[] =
        stock.priceHistory && stock.priceHistory.length > 0
          ? [...stock.priceHistory]
          : [initialPrices[sym]];

      const lastHistorical = seedHistory[seedHistory.length - 1];
      if (lastHistorical !== initialPrices[sym]) {
        seedHistory.push(initialPrices[sym]);
      }
      lobs[sym] = {
        bids: [],
        asks: [],
        midPrice: initialPrices[sym],
        priceHistory: seedHistory,
      };
    }
    lobsRef.current = lobs;
  };

const initSim = useCallback(() => {
    agentsRef.current = createAgents(pctFund, pctMom, pctHft, pctNoise);
    
    // 2. GENESIS BLOCK - XỬ LÝ KHỦNG HOẢNG THANH KHOẢN CHO 608 MÃ
    const numStocks = SIM_SYMBOLS.length > 0 ? SIM_SYMBOLS.length : 1;

    // GENESIS BLOCK - PHÂN BỔ DỊ THỂ (HETEROGENEOUS WEALTH)
      agentsRef.current.forEach(agent => {
  const wealthMultiplier = 0.3 + (Math.random() * 1.7);
  
  if (agent.type === "fundamentalist") {
    agent.cash = 150000000000 * wealthMultiplier;  // 150 tỷ (giảm từ 600 tỷ)
    const sharesPerStock = Math.floor((400000 * wealthMultiplier) / numStocks);
    SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
  } 
  else if (agent.type === "momentum") {
    agent.cash = 40000000000 * wealthMultiplier;   // 40 tỷ (tăng từ 14 tỷ)
    const sharesPerStock = Math.floor((800000 * wealthMultiplier) / numStocks);
    SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
  } 
  else if (agent.type === "noise") {
    const noiseMultiplier = 0.1 + (Math.random() * 1.9);
    agent.cash = 15000000000 * noiseMultiplier;    // 15 tỷ (tăng từ 10 tỷ)
    const sharesPerStock = Math.floor((300000 * noiseMultiplier) / numStocks);
    SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
  } 
  else if (agent.type === "hft") {
    agent.cash = 20000000000;                      // 20 tỷ (giảm từ 50 tỷ)
    const sharesPerStock = Math.floor(500000 / numStocks);
    SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
  }
});

    initEnrichedFairValues();
    initLOBs();
    // ... (Giữ nguyên các đoạn reset State bên dưới của bạn)
    vnIndexHistoryRef.current = [BASE_POINT];
    vnIndexRef.current = BASE_POINT;
    orderIdRef.current = 0;
    totalVolumeRef.current = 0;
    crashRef.current = 0;
    freezeRef.current = 0;
    tradeHistoryRef.current = [];
    tickRef.current = 0;
    candlesRef.current = [];
    currentCandleRef.current = null;
    giniRef.current = 0.45;
    spreadRef.current = 0.5;
    settlementQueueRef.current = [];
    giniHistoryRef.current = [];
    tradesByTypeRef.current = EMPTY_TRADES_BY_TYPE();

    setVnIndex(BASE_POINT);
    setCandles([]);
    setBids([]);
    setAsks([]);
    setTick(0);
    setGini(0.45); 
    setSpread(0.5);
    setTotalVolume(0);
    setCrashEvents(0);
    setFreezeEvents(0);
    setRecentTrades([]);
    setSystemState("Normal");
    
    // Reset bảng hiển thị tài sản
    setWealthByType({ fundamentalist: 0, momentum: 0, hft: 0, noise: 0 } as any);
    setGiniHistory([]);
    setTradesByType(EMPTY_TRADES_BY_TYPE());
    setLorenzCurve([]);
  }, [pctFund, pctMom, pctHft, pctNoise]); // Truyền lại dependency chuẩn của UI

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const agents = agentsRef.current;
      if (!agents.length) return;
      tickRef.current++;

      if (tickRef.current > TICK_LIMITS[timeScale]) {
        setIsRunning(false);
        return;
      }

      const due = settlementQueueRef.current.filter((s) => s.tick <= tickRef.current);
      settlementQueueRef.current = settlementQueueRef.current.filter((s) => s.tick > tickRef.current);
      due.forEach(({ agentId, symbol, cash, shares }) => {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) return;
        if (cash > 0) {
          agent.lockedCash = Math.max(0, agent.lockedCash - cash);
          agent.cash += cash;
        }
        if (shares > 0) {
          agent.lockedShares[symbol] = Math.max(0, agent.lockedShares[symbol] - shares);
          agent.shares[symbol] += shares;
        }
      });

      const prevVnIndex = vnIndexHistoryRef.current[vnIndexHistoryRef.current.length - 2] ?? BASE_POINT;
      const marketReturn = safe((vnIndexRef.current - prevVnIndex) / prevVnIndex, 0);

      const newTrades: Trade[] = [];
      let totalSpread = 0;
      let freezeThisTick = false;

      const numStocks = SIM_SYMBOLS.length;
      // Sửa dòng này:
      const AGENTS_PER_STOCK = Math.max(15, Math.floor((agents.length / SIM_SYMBOLS.length) * 1.2));
      const shuffled = [...agents].sort(() => Math.random() - 0.5);
      const bp = behaviorParamsRef.current;

      for (let si = 0; si < numStocks; si++) {
        const sym = SIM_SYMBOLS[si];
        const stock = SIM_STOCKS[si];
        const lob = lobsRef.current[sym];
        if (!lob || !stock) continue;

        const base = (((tickRef.current * AGENTS_PER_STOCK + si * AGENTS_PER_STOCK) % agents.length) + agents.length) % agents.length;
        const stockAgents: Agent[] = [];
        for (let k = 0; k < AGENTS_PER_STOCK; k++) {
          stockAgents.push(shuffled[(base + k) % shuffled.length]);
        }

        for (const agent of stockAgents) {
          const order = agentDecideForStock(
            agent, stock, lob.midPrice, lob.priceHistory, orderIdRef, driftPct, settlement, marketReturn, bp
          );
          if (!order) continue;
          if (!isFinite(order.price) || isNaN(order.price) || order.price <= 0) continue;
          if (order.side === "buy") lob.bids.push(order);
          else lob.asks.push(order);
        }

        lob.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
        lob.asks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);

        const LOB_DEPTH = 50;
        lob.bids = lob.bids.slice(0, LOB_DEPTH);
        lob.asks = lob.asks.slice(0, LOB_DEPTH);

        const currentTimestamp = Date.now();
        const TIME_IN_FORCE_MS = 1000 * 10;
        lob.bids = lob.bids.filter((o) => currentTimestamp - o.timestamp < TIME_IN_FORCE_MS);
        lob.asks = lob.asks.filter((o) => currentTimestamp - o.timestamp < TIME_IN_FORCE_MS);

        let attempts = 0;
        while (lob.bids.length > 0 && lob.asks.length > 0 && attempts++ < 200) {
          const bb = lob.bids[0];
          const ba = lob.asks[0];

          if (bb.price < ba.price) break;

          const tradePrice = safe(bb.id < ba.id ? bb.price : ba.price, lob.midPrice);
          const tradeQty = Math.min(bb.qty, ba.qty);

          if (tradePrice <= 0 || tradeQty <= 0) {
            lob.bids.shift();
            lob.asks.shift();
            continue;
          }

          const buyer = agents.find((a) => a.id === bb.agentId);
          const seller = agents.find((a) => a.id === ba.agentId);

          if (!buyer || !seller || buyer.id === seller.id) {
            lob.bids.shift();
            lob.asks.shift();
            continue;
          }

          const totalValue = tradePrice * tradeQty;
          const feeRate = settlement === "T+0" ? 0.0025 : 0.0002;
          const fee = totalValue * feeRate;

          if (buyer.cash < totalValue + fee) {
            lob.bids.shift();
            continue;
          }
          if (seller.shares[sym] < tradeQty) {
            lob.asks.shift();
            continue;
          }

          buyer.cash -= totalValue + fee;
          if (buyer.cash < 0) buyer.cash = 0;
          seller.shares[sym] -= tradeQty;

          const settleDays = settlement === "T+0" ? 0 : settlement === "T+1" ? 1 : settlement === "T+3" ? 3 : 2.5;

          if (settleDays > 0) {
            buyer.lockedShares[sym] += tradeQty;
            seller.lockedCash += totalValue - fee;
            const unlockTick = tickRef.current + Math.round(settleDays * 10);
            settlementQueueRef.current.push(
              { tick: unlockTick, agentId: buyer.id, symbol: sym, cash: 0, shares: tradeQty },
              { tick: unlockTick, agentId: seller.id, symbol: sym, cash: totalValue - fee, shares: 0 }
            );
          } else {
            buyer.shares[sym] += tradeQty;
            seller.cash += totalValue - fee;
          }

          totalVolumeRef.current += tradeQty;

          const bType = buyer.type as ActiveAgentType;
          const sType = seller.type as ActiveAgentType;
          
          if (tradesByTypeRef.current[bType]) {
            tradesByTypeRef.current[bType].count++;
            tradesByTypeRef.current[bType].value += totalValue;
          }
          if (tradesByTypeRef.current[sType]) {
            tradesByTypeRef.current[sType].count++;
            tradesByTypeRef.current[sType].value += totalValue;
          }

          newTrades.push({
            price: tradePrice,
            qty: tradeQty,
            timestamp: Date.now(),
            buyerType: buyer.type,
            sellerType: seller.type,
            symbol: sym,
          });

          bb.qty -= tradeQty;
          ba.qty -= tradeQty;
          if (bb.qty <= 0) lob.bids.shift();
          if (ba.qty <= 0) lob.asks.shift();
          lob.midPrice = tradePrice;
        }

        if (!isFinite(lob.midPrice) || isNaN(lob.midPrice) || lob.midPrice <= 0) {
          lob.midPrice = lob.priceHistory.findLast((p) => isFinite(p) && p > 0) ?? stock.initialPrice;
        }

        lob.priceHistory.push(lob.midPrice);
        if (lob.priceHistory.length > 500) lob.priceHistory.shift();

        const bestBid = lob.bids.length > 0 ? lob.bids[0].price : lob.midPrice;
        const bestAsk = lob.asks.length > 0 ? lob.asks[0].price : lob.midPrice;
        totalSpread += Math.max(0, bestAsk - bestBid);

        if (!lob.bids.length) freezeThisTick = true;
      }

      const currentPrices: Record<string, number> = {};
      for (const sym of SIM_SYMBOLS) {
        currentPrices[sym] = lobsRef.current[sym]?.midPrice ?? 0;
      }
      const newVnIndex = safe(computeVNIndex(currentPrices), vnIndexRef.current);
      vnIndexRef.current = newVnIndex;
      vnIndexHistoryRef.current.push(newVnIndex);
      if (vnIndexHistoryRef.current.length > 200) vnIndexHistoryRef.current.shift();

      spreadRef.current = safe(parseFloat((totalSpread / SIM_SYMBOLS.length).toFixed(3)), 0.5);

      if (!currentCandleRef.current) {
        currentCandleRef.current = { open: newVnIndex, high: newVnIndex, low: newVnIndex, trades: 0, vol: 0 };
      }
      const cc = currentCandleRef.current;
      cc.high = Math.max(cc.high, newVnIndex);
      cc.low = Math.min(cc.low, newVnIndex);
      cc.vol += newTrades.reduce((s, t) => s + t.qty, 0);
      cc.trades++;
      if (cc.trades >= 5) {
        candlesRef.current.push({
          open: cc.open, high: cc.high, low: cc.low, close: newVnIndex, volume: cc.vol, tick: tickRef.current,
        });
        if (candlesRef.current.length > 80) candlesRef.current.shift();
        currentCandleRef.current = null;
      }

      const hist = vnIndexHistoryRef.current;
      const prevPrice = hist[hist.length - 6];
      const recentChange = hist.length > 5 && prevPrice > 0 ? Math.abs(hist[hist.length - 1] - prevPrice) / prevPrice : 0;
      const safeRecentChange = safe(recentChange, 0);

      if (safeRecentChange > 0.03) crashRef.current++;
      if (freezeThisTick) freezeRef.current++;

      let sysState: SystemState = "Normal";
      if (safeRecentChange > 0.07) sysState = "Limit Hit";
      else if (safeRecentChange > 0.02) sysState = "Volatile";
      else if (freezeThisTick) sysState = "Freeze";

      if (tickRef.current % 10 === 0) {
        const priceProxy = (newVnIndex / BASE_POINT) * 1000;
        giniRef.current = safe(computeGini(agents, priceProxy), giniRef.current);

        giniHistoryRef.current.push({ tick: tickRef.current, gini: giniRef.current });
        if (giniHistoryRef.current.length > 500) giniHistoryRef.current.shift();

        const curve = computeLorenzCurve(agents, priceProxy);
        setLorenzCurve(curve);

        const byType = { fundamentalist: 0, momentum: 0, hft: 0, noise: 0 };
        
        agents.forEach((a) => {
          if (a.type === "whale") return; 
          
          // INTERN FIX 2: TÍNH ĐÚNG GIÁ TRỊ TÀI SẢN
          // Thay vì dùng VNIndex nhân bừa, bây giờ nhân số lượng cổ với đúng giá thực tế của mã đó
          let portfolioValue = 0;
          Object.keys(a.shares || {}).forEach(sym => {
            portfolioValue += (a.shares[sym] || 0) * (currentPrices[sym] || 10000);
          });
          Object.keys(a.lockedShares || {}).forEach(sym => {
            portfolioValue += (a.lockedShares[sym] || 0) * (currentPrices[sym] || 10000);
          });
          
          const w = safe((a.cash || 0) + (a.lockedCash || 0) + portfolioValue, 0);
          
          if (a.type === "fundamentalist") byType.fundamentalist += w;
          else if (a.type === "momentum") byType.momentum += w;
          else if (a.type === "hft") byType.hft += w;
          else if (a.type === "noise") byType.noise += w;
        });
        
        const totalW = Math.max(1, byType.fundamentalist + byType.momentum + byType.hft + byType.noise);
        
        setWealthByType({
          fundamentalist: safe(parseFloat(((byType.fundamentalist / totalW) * 100).toFixed(1)), 0),
          momentum: safe(parseFloat(((byType.momentum / totalW) * 100).toFixed(1)), 0),
          hft: safe(parseFloat(((byType.hft / totalW) * 100).toFixed(1)), 0),
          noise: safe(parseFloat(((byType.noise / totalW) * 100).toFixed(1)), 0),
        });
        
        setGini(safe(parseFloat(giniRef.current.toFixed(4)), 0));
        setGiniHistory([...giniHistoryRef.current]);
        setTradesByType({ ...tradesByTypeRef.current } as Record<ActiveAgentType, AgentTradeStat>);
      }

      tradeHistoryRef.current = [...tradeHistoryRef.current, ...newTrades].slice(-50);

      const displayLob = lobsRef.current[SIM_SYMBOLS[0]];

      setTick(tickRef.current);
      setVnIndex(safe(parseFloat(newVnIndex.toFixed(2)), BASE_POINT));
      setBids(displayLob ? [...displayLob.bids.slice(0, 8)] : []);
      setAsks(displayLob ? [...displayLob.asks.slice(0, 8)] : []);
      setCandles([...candlesRef.current]);
      setTotalVolume(totalVolumeRef.current);
      setCrashEvents(crashRef.current);
      setFreezeEvents(freezeRef.current);
      setSpread(spreadRef.current);
      setSystemState(sysState);
      setRecentTrades([...tradeHistoryRef.current].reverse().slice(0, 15));
    }, 280);

    return () => clearInterval(interval);
  }, [isRunning, settlement, driftPct, timeScale]);

  const saveScenario = useCallback((label: string) => {
    const hist = vnIndexHistoryRef.current;
    const returns = hist.slice(1).map((v, i) => (v - hist[i]) / hist[i]);
    const vol = safe(stdDev(returns.slice(-50)), 0);

    const snap: ScenarioMetrics = {
      label,
      avgPrice: safe(hist.reduce((s, v) => s + v, 0) / hist.length, BASE_POINT),
      volatility: vol,
      gini: giniRef.current,
      totalVolume: totalVolumeRef.current,
      crashEvents: crashRef.current,
      avgSpread: spreadRef.current,
      liquidityFreezes: freezeRef.current,
      giniHistory: [...giniHistoryRef.current],
      tradesByType: JSON.parse(JSON.stringify(tradesByTypeRef.current)),
    };
    setScenarioMetrics((prev) => [...prev.filter((m) => m.label !== label), snap].slice(-4));
  }, []);

  const handleToggleRun = useCallback(() => {
    if (!isRunning) {
      initSim();
      setTimeout(() => setIsRunning(true), 60);
    } else {
      setIsRunning(false);
    }
  }, [isRunning, initSim]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeout(initSim, 50);
  }, [initSim]);

  return {
    isRunning, maxTick: TICK_LIMITS[timeScale], tick, midPrice: vnIndex, candles,
    bids, asks, gini, spread, totalVolume, crashEvents, freezeEvents,
    recentTrades, systemState, wealthByType, scenarioMetrics, giniHistory,
    tradesByType, lorenzCurve, handleToggleRun, handleReset, saveScenario,
  };
}