"use client";

import { useState } from "react";
import type {
  ActiveTab,
  SettlementType,
  TimeScale,
  AgentBehaviorParams,
} from "./types";
import { NUM_AGENTS, DEFAULT_BEHAVIOR_PARAMS } from "./constants/simulation";
import { useStockData } from "./hooks/useStockData";
import { useSimulation } from "./hooks/useSimulation";
import { buildCSV } from "./utils/buildCSV";
import { downloadCSV } from "./utils/downloadCSV";
import TopBar from "./components/layout/TopBar";
import KpiBar from "./components/layout/KpiBar";
import TabBar from "./components/layout/TabBar";
import LeftPanel from "./components/layout/LeftPanel";
import LiveTab from "./components/tabs/LiveTab";
import CompareTab from "./components/tabs/CompareTab";
import AgentsTab from "./components/tabs/AgentsTab";
import RiskTab from "./components/tabs/RiskTab";

function LoadingScreen({
  state,
  error,
  apiUrl,
}: {
  state: "loading" | "error";
  error: string | null;
  apiUrl: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-4xl">📊</div>
      <div className="text-lg font-bold text-slate-100">PoliSim ABM v2.5</div>
      {state === "loading" && (
        <>
          <div className="flex items-center gap-3 text-cyan-400 text-sm">
            <span className="animate-spin inline-block">⟳</span>
            <span>Đang tải dữ liệu cổ phiếu từ API…</span>
          </div>
          <div className="text-xs text-slate-600">{apiUrl}/api/stocks</div>
        </>
      )}
      {state === "error" && (
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="text-red-400 text-sm font-bold">
            ⚠ Không thể tải dữ liệu
          </div>
          <div className="text-slate-500 text-xs leading-relaxed">
            Hệ thống tạm thời không khả dụng. Vui lòng thử lại sau.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            ↺ Thử lại
          </button>
        </div>
      )}
    </div>
  );
}

export default function PoliSimDashboard() {
  const { loadState, stockCount, error, apiUrl } = useStockData();

  const [settlement, setSettlement] = useState<SettlementType>("T+2.5");
  const [driftPct, setDriftPct] = useState(7);
  const [timeScale, setTimeScale] = useState<TimeScale>("1D");

  const [pctFund, setPctFund] = useState(25);
  const [pctMom, setPctMom] = useState(25);
  const [pctHft, setPctHft] = useState(25);
  const [pctNoise, setPctNoise] = useState(25);

  const [activeTab, setActiveTab] = useState<ActiveTab>("live");
  const [behaviorParams, setBehaviorParams] = useState<AgentBehaviorParams>(
    DEFAULT_BEHAVIOR_PARAMS,
  );

  const sim = useSimulation(
    settlement,
    timeScale,
    driftPct,
    pctFund,
    pctMom,
    pctHft,
    pctNoise,
    behaviorParams,
  );

  const agentPct = {
    fundamentalist: pctFund,
    momentum: pctMom,
    hft: pctHft,
    noise: pctNoise,
  };

  const handleExport = () => {
    if (!sim.candles?.length) {
      alert(
        "Chưa có dữ liệu nến để xuất! Hãy cho hệ thống chạy vài tick trước.",
      );
      return;
    }
    const csv = buildCSV({
      settlement,
      driftPct,
      timeScale,
      tick: sim.tick,
      pctFund,
      pctMom,
      pctHft,
      pctNoise,
      midPrice: sim.midPrice,
      gini: sim.gini,
      totalVolume: sim.totalVolume,
      spread: sim.spread,
      crashEvents: sim.crashEvents,
      freezeEvents: sim.freezeEvents,
      systemState: sim.systemState,
      candles: sim.candles,
      wealthByType: sim.wealthByType,
      agentPct,
      recentTrades: sim.recentTrades,
      scenarioMetrics: sim.scenarioMetrics,
    });
    downloadCSV(csv, `PoliSim_${settlement}_${Date.now()}.csv`);
  };

  if (loadState !== "ready") {
    return <LoadingScreen state={loadState} error={error} apiUrl={apiUrl} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-mono text-xs flex flex-col">
      <TopBar
        systemState={sim.systemState}
        tick={sim.tick}
        settlement={settlement}
        driftPct={driftPct}
        timeScale={timeScale}
        maxTick={sim.maxTick}
        isRunning={sim.isRunning}
        onReset={sim.handleReset}
        onToggleRun={sim.handleToggleRun}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          settlement={settlement}
          onSettlementChange={setSettlement}
          driftPct={driftPct}
          onDriftChange={setDriftPct}
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          pctFund={pctFund}
          onPctFundChange={setPctFund}
          pctMom={pctMom}
          onPctMomChange={setPctMom}
          pctHft={pctHft}
          onPctHftChange={setPctHft}
          pctNoise={pctNoise}
          onPctNoiseChange={setPctNoise}
          behaviorParams={behaviorParams}
          onBehaviorParamsChange={setBehaviorParams}
          scenarioMetrics={sim.scenarioMetrics}
          onSaveScenario={() => sim.saveScenario(settlement)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <KpiBar
            midPrice={sim.midPrice}
            gini={sim.gini}
            totalVolume={sim.totalVolume}
            spread={sim.spread}
            crashEvents={sim.crashEvents}
            freezeEvents={sim.freezeEvents}
            systemState={sim.systemState}
            tick={sim.tick}
          />

          <div className="flex justify-between items-center pr-4 border-b border-slate-800">
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-700">
                ● {stockCount} mã ·{" "}
                {apiUrl.replace("https://", "").replace("http://", "")}
              </span>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 bg-blue-900/40 text-blue-400 rounded border border-blue-700/50 hover:bg-blue-800/60 transition-colors text-xs font-medium"
              >
                📥 Xuất CSV
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5">
            {activeTab === "live" && (
              <LiveTab
                candles={sim.candles}
                bids={sim.bids}
                asks={sim.asks}
                midPrice={sim.midPrice}
                recentTrades={sim.recentTrades}
                settlement={settlement}
              />
            )}
            {activeTab === "compare" && (
              <CompareTab scenarioMetrics={sim.scenarioMetrics} />
            )}
            {activeTab === "agents" && (
              <AgentsTab wealthByType={sim.wealthByType} agentPct={agentPct} />
            )}
            {activeTab === "risk" && (
              <RiskTab
                crashEvents={sim.crashEvents}
                freezeEvents={sim.freezeEvents}
                systemState={sim.systemState}
                driftPct={driftPct}
                gini={sim.gini}
                tick={sim.tick}
                settlement={settlement}
                giniHistory={sim.giniHistory}
                tradesByType={sim.tradesByType}
                lorenzCurve={sim.lorenzCurve}
              />
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-950 border-t border-slate-900 px-4 py-0.5 flex justify-between text-xs text-gray-900 shrink-0">
        <span>
          PoliSim ABM · Avellaneda–Stoikov HFT · LOB · {NUM_AGENTS} agents
        </span>
        <span className={sim.isRunning ? "text-emerald-800" : "text-gray-600"}>
          {sim.isRunning ? "● RUNNING" : "○ IDLE"} · tick #{sim.tick}
        </span>
      </div>
    </div>
  );
}
