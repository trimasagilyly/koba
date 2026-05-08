import { useState, useRef, useCallback, useEffect } from "react";
import type {
  Agent,
  Trade,
  Candle,
  ScenarioMetrics,
  SettlementType,
  SystemState,
  TimeScale,
  GiniPoint,
  AgentTradeStat,
  AgentBehaviorParams,
  ActiveAgentType,
} from "../types";
import { stdDev } from "../utils/stdDev";
import { TICK_LIMITS } from "../constants/simulation";
import { SIM_STOCKS, SIM_SYMBOLS, BASE_POINT } from "../utils/stockData";
import { computeVNIndex } from "../utils/computeVNIndex";
import { computeGini } from "../utils/computeGini";
import { computeLorenzCurve } from "../utils/computeLorenzCurve";
import { agentDecideForStock } from "../utils/agentDecide";
import { computeEnrichedFairValue } from "../utils/computeEnrichedFairValue";
import { matchOrders } from "../utils/matchOrders";
import { createAgents } from "../utils/createAgents";
import { buildLOBs } from "../utils/buildLOBs";
import type { StockLOB, SettlementEntry } from "../utils/matchOrders";

const safe = (v: number, fallback = 0) =>
  isFinite(v) && !isNaN(v) ? v : fallback;

const EMPTY_TRADES_BY_TYPE = (): Record<ActiveAgentType, AgentTradeStat> => ({
  fundamentalist: { count: 0, value: 0 },
  momentum: { count: 0, value: 0 },
  hft: { count: 0, value: 0 },
  noise: { count: 0, value: 0 },
});

const INITIAL_WEALTH: Record<ActiveAgentType, number> = {
  fundamentalist: 25,
  momentum: 25,
  hft: 25,
  noise: 25,
};

let enrichedFairValues: Record<string, number> = {};

function initEnrichedFairValues() {
  enrichedFairValues = {};
  for (const stock of SIM_STOCKS)
    enrichedFairValues[stock.symbol] = computeEnrichedFairValue(stock);
}

// HÀM MỚI TỪ CODE CỦA BẠN: Tính toán P/E và P/B trung bình
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
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [gini, setGini] = useState(0.45);
  const [spread, setSpread] = useState(0.5);
  const [totalVolume, setTotalVolume] = useState(0);
  const [crashEvents, setCrashEvents] = useState(0);
  const [freezeEvents, setFreezeEvents] = useState(0);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [systemState, setSystemState] = useState<SystemState>("Normal");
  const [wealthByType, setWealthByType] =
    useState<Record<ActiveAgentType, number>>(INITIAL_WEALTH);
  const [scenarioMetrics, setScenarioMetrics] = useState<ScenarioMetrics[]>([]);
  const [giniHistory, setGiniHistory] = useState<GiniPoint[]>([]);
  const [tradesByType, setTradesByType] = useState<
    Record<ActiveAgentType, AgentTradeStat>
  >(EMPTY_TRADES_BY_TYPE());
  const [lorenzCurve, setLorenzCurve] = useState<{ x: number; y: number }[]>(
    [],
  );

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
  const settlementQueueRef = useRef<SettlementEntry[]>([]);
  const giniHistoryRef = useRef<GiniPoint[]>([]);
  const tradesByTypeRef = useRef<Record<ActiveAgentType, AgentTradeStat>>(
    EMPTY_TRADES_BY_TYPE(),
  );
  const behaviorParamsRef = useRef<AgentBehaviorParams>(behaviorParams);

  useEffect(() => {
    behaviorParamsRef.current = behaviorParams;
  }, [behaviorParams]);

  const initSim = useCallback(() => {
    const numStocks = Math.max(1, SIM_SYMBOLS.length);
    const agents = createAgents(pctFund, pctMom, pctHft, pctNoise);
    
    // CÔNG THỨC 1 CỦA BẠN: GENESIS BLOCK - PHÂN BỔ DỊ THỂ (HETEROGENEOUS WEALTH)
    agents.forEach(agent => {
      const wealthMultiplier = 0.3 + (Math.random() * 1.7);
      
      if (agent.type === "fundamentalist") {
        agent.cash = 150000000000 * wealthMultiplier;  
        const sharesPerStock = Math.floor((400000 * wealthMultiplier) / numStocks);
        SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
      } 
      else if (agent.type === "momentum") {
        agent.cash = 40000000000 * wealthMultiplier;   
        const sharesPerStock = Math.floor((800000 * wealthMultiplier) / numStocks);
        SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
      } 
      else if (agent.type === "noise") {
        const noiseMultiplier = 0.1 + (Math.random() * 1.9);
        agent.cash = 15000000000 * noiseMultiplier;    
        const sharesPerStock = Math.floor((300000 * noiseMultiplier) / numStocks);
        SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
      } 
      else if (agent.type === "hft") {
        agent.cash = 20000000000;                      
        const sharesPerStock = Math.floor(500000 / numStocks);
        SIM_STOCKS.forEach(s => agent.shares[s.symbol] = sharesPerStock);
      }
    });

    agentsRef.current = agents;

    initEnrichedFairValues();
    lobsRef.current = buildLOBs();

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
    setWealthByType({ fundamentalist: 0, momentum: 0, hft: 0, noise: 0 });
    setGiniHistory([]);
    setTradesByType(EMPTY_TRADES_BY_TYPE());
    setLorenzCurve([]);
  }, [pctFund, pctMom, pctHft, pctNoise]);

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

      const due = settlementQueueRef.current.filter(
        (s) => s.tick <= tickRef.current,
      );
      settlementQueueRef.current = settlementQueueRef.current.filter(
        (s) => s.tick > tickRef.current,
      );
      for (const { agentId, symbol, cash, shares } of due) {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) continue;
        if (cash > 0) {
          agent.lockedCash = Math.max(0, agent.lockedCash - cash);
          agent.cash += cash;
        }
        if (shares > 0) {
          agent.lockedShares[symbol] = Math.max(
            0,
            agent.lockedShares[symbol] - shares,
          );
          agent.shares[symbol] += shares;
        }
      }

      const prevVnIndex =
        vnIndexHistoryRef.current[vnIndexHistoryRef.current.length - 2] ??
        BASE_POINT;
      const marketReturn = safe(
        (vnIndexRef.current - prevVnIndex) / prevVnIndex,
        0,
      );

      const allTrades: Trade[] = [];
      let totalSpread = 0;
      let freezeThisTick = false;
      const numStocks = SIM_SYMBOLS.length;
      const agentsPerStock = Math.max(
        15,
        Math.floor((agents.length / numStocks) * 1.2),
      );
      const shuffled = [...agents].sort(() => Math.random() - 0.5);
      const bp = behaviorParamsRef.current;

      for (let si = 0; si < numStocks; si++) {
        const sym = SIM_SYMBOLS[si];
        const stock = SIM_STOCKS[si];
        const lob = lobsRef.current[sym];
        if (!lob || !stock) continue;

        const base =
          (((tickRef.current * agentsPerStock + si * agentsPerStock) %
            agents.length) +
            agents.length) %
          agents.length;
        for (let k = 0; k < agentsPerStock; k++) {
          const agent = shuffled[(base + k) % shuffled.length];
          const order = agentDecideForStock(
            agent,
            stock,
            lob.midPrice,
            lob.priceHistory,
            orderIdRef,
            driftPct,
            settlement,
            marketReturn,
            bp,
          );
          if (!order || !isFinite(order.price) || order.price <= 0) continue;
          if (order.side === "buy") lob.bids.push(order);
          else lob.asks.push(order);
        }

        lob.bids.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
        lob.asks.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
        const now = Date.now();
        lob.bids = lob.bids
          .slice(0, 50)
          .filter((o) => now - o.timestamp < 10_000);
        lob.asks = lob.asks
          .slice(0, 50)
          .filter((o) => now - o.timestamp < 10_000);

        const { trades, volumeDelta } = matchOrders(
          lob,
          sym,
          agents,
          settlement,
          settlementQueueRef.current,
          tickRef.current,
          tradesByTypeRef.current,
        );
        allTrades.push(...trades);
        totalVolumeRef.current += volumeDelta;

        if (!isFinite(lob.midPrice) || lob.midPrice <= 0)
          lob.midPrice =
            lob.priceHistory.findLast((p) => isFinite(p) && p > 0) ??
            stock.initialPrice;

        lob.priceHistory.push(lob.midPrice);
        if (lob.priceHistory.length > 500) lob.priceHistory.shift();

        const bestBid = lob.bids[0]?.price ?? lob.midPrice;
        const bestAsk = lob.asks[0]?.price ?? lob.midPrice;
        totalSpread += Math.max(0, bestAsk - bestBid);
        if (!lob.bids.length) freezeThisTick = true;
      }

      const currentPrices: Record<string, number> = {};
      for (const sym of SIM_SYMBOLS)
        currentPrices[sym] = lobsRef.current[sym]?.midPrice ?? 0;
      const newVnIndex = safe(
        computeVNIndex(currentPrices),
        vnIndexRef.current,
      );
      vnIndexRef.current = newVnIndex;
      vnIndexHistoryRef.current.push(newVnIndex);
      if (vnIndexHistoryRef.current.length > 200)
        vnIndexHistoryRef.current.shift();

      spreadRef.current = safe(
        parseFloat((totalSpread / numStocks).toFixed(3)),
        0.5,
      );

      if (!currentCandleRef.current)
        currentCandleRef.current = {
          open: newVnIndex,
          high: newVnIndex,
          low: newVnIndex,
          trades: 0,
          vol: 0,
        };
      const cc = currentCandleRef.current;
      cc.high = Math.max(cc.high, newVnIndex);
      cc.low = Math.min(cc.low, newVnIndex);
      cc.vol += allTrades.reduce((s, t) => s + t.qty, 0);
      cc.trades++;
      if (cc.trades >= 5) {
        candlesRef.current.push({
          open: cc.open,
          high: cc.high,
          low: cc.low,
          close: newVnIndex,
          volume: cc.vol,
          tick: tickRef.current,
        });
        if (candlesRef.current.length > 80) candlesRef.current.shift();
        currentCandleRef.current = null;
      }

      const hist = vnIndexHistoryRef.current;
      const prevPrice = hist[hist.length - 6];
      const recentChange = safe(
        hist.length > 5 && prevPrice > 0
          ? Math.abs(newVnIndex - prevPrice) / prevPrice
          : 0,
        0,
      );
      if (recentChange > 0.03) crashRef.current++;
      if (freezeThisTick) freezeRef.current++;
      const sysState: SystemState =
        recentChange > 0.07
          ? "Limit Hit"
          : recentChange > 0.02
            ? "Volatile"
            : freezeThisTick
              ? "Freeze"
              : "Normal";

      if (tickRef.current % 10 === 0) {
        const priceProxy = (newVnIndex / BASE_POINT) * 1000;
        giniRef.current = safe(
          computeGini(agents, priceProxy),
          giniRef.current,
        );
        giniHistoryRef.current.push({
          tick: tickRef.current,
          gini: giniRef.current,
        });
        if (giniHistoryRef.current.length > 500) giniHistoryRef.current.shift();

        setLorenzCurve(computeLorenzCurve(agents, priceProxy));

        // CÔNG THỨC 2 CỦA BẠN: INTERN FIX 2 - TÍNH ĐÚNG GIÁ TRỊ TÀI SẢN
        const byType = { fundamentalist: 0, momentum: 0, hft: 0, noise: 0 };
        agents.forEach((a) => {
          if (a.type === "whale") return; 
          
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
        setTradesByType({ ...tradesByTypeRef.current });
      }

      tradeHistoryRef.current = [
        ...tradeHistoryRef.current,
        ...allTrades,
      ].slice(-50);

      const displayLob = lobsRef.current[SIM_SYMBOLS[0]];
      setTick(tickRef.current);
      setVnIndex(safe(parseFloat(newVnIndex.toFixed(2)), BASE_POINT));
      setBids(displayLob ? ([...displayLob.bids.slice(0, 8)] as any) : []);
      setAsks(displayLob ? ([...displayLob.asks.slice(0, 8)] as any) : []);
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
    const snap: ScenarioMetrics = {
      label,
      avgPrice: safe(hist.reduce((s, v) => s + v, 0) / hist.length, BASE_POINT),
      volatility: safe(stdDev(returns.slice(-50)), 0),
      gini: giniRef.current,
      totalVolume: totalVolumeRef.current,
      crashEvents: crashRef.current,
      avgSpread: spreadRef.current,
      liquidityFreezes: freezeRef.current,
      giniHistory: [...giniHistoryRef.current],
      tradesByType: JSON.parse(JSON.stringify(tradesByTypeRef.current)),
    };
    setScenarioMetrics((prev) =>
      [...prev.filter((m) => m.label !== label), snap].slice(-4),
    );
  }, []);

  const handleToggleRun = useCallback(() => {
    if (!isRunning) {
      initSim();
      setTimeout(() => setIsRunning(true), 60);
    } else setIsRunning(false);
  }, [isRunning, initSim]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeout(initSim, 50);
  }, [initSim]);

  return {
    isRunning,
    maxTick: TICK_LIMITS[timeScale],
    tick,
    midPrice: vnIndex,
    candles,
    bids,
    asks,
    gini,
    spread,
    totalVolume,
    crashEvents,
    freezeEvents,
    recentTrades,
    systemState,
    wealthByType,
    scenarioMetrics,
    giniHistory,
    tradesByType,
    lorenzCurve,
    handleToggleRun,
    handleReset,
    saveScenario,
  };
}
