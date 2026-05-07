import GiniBar from "../ui/GiniBar";
import GiniLineChart from "../ui/GiniLineChart";
import ParetoChart from "../ui/ParetoChart";
import AgentTradeStatsPanel from "../ui/AgentTradeStatsPanel";
import type {
  SystemState,
  SettlementType,
  GiniPoint,
  ActiveAgentType,
  AgentTradeStat,
} from "../../types";
import { GINI_LEGEND } from "../../constants/ui";

interface RiskTabProps {
  crashEvents: number;
  freezeEvents: number;
  systemState: SystemState;
  driftPct: number;
  gini: number;
  tick: number;
  settlement: SettlementType;
  giniHistory: GiniPoint[];
  tradesByType: Record<ActiveAgentType, AgentTradeStat>;
  lorenzCurve: { x: number; y: number }[];
}

const riskCounterDefs = (
  crashEvents: number,
  freezeEvents: number,
  systemState: SystemState,
  settlement: SettlementType,
  driftPct: number,
) => [
  {
    label: "Flash Crash",
    value: crashEvents,
    desc: "Biến động >3% trong 5 ticks liên tiếp",
    warnCls: "border-red-800",
    valueCls: "text-red-400",
    dimCls: "text-gray-600",
    warn: 3,
  },
  {
    label: "Liquidity Freeze",
    value: freezeEvents,
    desc: "Sổ lệnh bên mua hoàn toàn trống (trắng bên mua)",
    warnCls: "border-yellow-700",
    valueCls: "text-yellow-400",
    dimCls: "text-gray-600",
    warn: 2,
  },
  {
    label: "Limit Hit",
    value: systemState === "Limit Hit" ? 1 : 0,
    desc:
      settlement !== "T+0"
        ? `Giá vượt biên độ ±${driftPct}%`
        : "Không áp dụng biên độ (T+0)",
    warnCls: "border-violet-700",
    valueCls: "text-violet-400",
    dimCls: "text-gray-600",
    warn: 1,
  },
];

export default function RiskTab({
  crashEvents,
  freezeEvents,
  systemState,
  driftPct,
  gini,
  tick,
  settlement,
  giniHistory,
  tradesByType,
  lorenzCurve,
}: RiskTabProps) {
  const isT0 = settlement === "T+0";
  const lineColor = isT0 ? "#ef4444" : "#06b6d4";
  const riskCounters = riskCounterDefs(
    crashEvents,
    freezeEvents,
    systemState,
    settlement,
    driftPct,
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Gini time-series */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2">
          📈 Đường GINI theo thời gian — {settlement} · Tick #{tick}
        </div>
        {giniHistory.length >= 2 ? (
          <GiniLineChart
            series={[
              { label: settlement, color: lineColor, points: giniHistory },
            ]}
            height={300}
          />
        ) : (
          <div className="h-[150px] flex items-center justify-center text-xs text-gray-700">
            Đang chờ dữ liệu… (cần ít nhất 20 ticks)
          </div>
        )}
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-emerald-400">■ &lt;0.35 Công bằng</span>
          <span className="text-yellow-400">■ 0.35–0.55 Mất cân bằng</span>
          <span className="text-red-400">■ &gt;0.55 Tập trung</span>
        </div>
      </div>

      {/* Gini static bar */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-3">
          ⚖️ Hệ số Gini — Bất bình đẳng Tài sản
        </div>
        <GiniBar value={gini} label={`${settlement} · Tick #${tick}`} />
        <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
          {GINI_LEGEND.map(([range, desc, cls]) => (
            <div
              key={range}
              className="bg-slate-950 border border-slate-900 rounded p-2"
            >
              <div className={`font-semibold mb-1 font-mono ${cls}`}>
                {range}
              </div>
              <div className="text-gray-600">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pareto chart */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-1">
          📊 Biểu đồ Pareto — Phân phối Tài sản Agent
        </div>
        <div className="text-xs text-gray-700 mb-2.5 leading-snug">
          Mỗi cột = 10% dân số (từ giàu nhất → nghèo nhất). Đường{" "}
          <span className="text-cyan-700">xanh</span> = % tích lũy. Quy tắc
          80/20: nếu <span className="text-red-700">20% agent giàu nhất</span>{" "}
          nắm ≥80% tài sản → thị trường tập trung cao.
        </div>
        <ParetoChart curve={lorenzCurve} gini={gini} />
      </div>

      {/* Per-agent trade statistics */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2.5">
          🤖 Giao dịch theo loại Agent — {settlement}
        </div>
        <AgentTradeStatsPanel tradesByType={tradesByType} />
      </div>

      {/* Risk counters */}
      <div className="grid grid-cols-3 gap-3">
        {riskCounters.map((r) => (
          <div
            key={r.label}
            className={`bg-slate-900 border rounded p-3.5 ${r.value >= r.warn ? r.warnCls : "border-gray-900"}`}
          >
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              {r.label}
            </div>
            <div
              className={`text-4xl font-bold my-1.5 ${r.value >= r.warn ? r.valueCls : r.dimCls}`}
            >
              {r.value}
            </div>
            <div className="text-xs text-gray-600 leading-snug">{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Policy trade-off */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2.5">
          📋 Trade-off Chính sách T+0 vs T+2.5
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-emerald-400 mb-2">
              ✅ T+0 — Lợi ích
            </div>
            {[
              "Thanh khoản tăng đáng kể",
              "Vốn quay vòng tức thì",
              "Spread giảm xuống",
              "Ít lệnh bị treo do settlement",
            ].map((s) => (
              <div key={s} className="text-xs text-gray-600 leading-loose">
                · {s}
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-bold text-red-400 mb-2">
              ⚠️ T+0 — Rủi ro
            </div>
            {[
              "Gini tăng → bất bình đẳng",
              "Flash crash thường xuyên hơn",
              "HFT thu lợi không cân xứng",
              "Volatility clustering tăng",
            ].map((s) => (
              <div key={s} className="text-xs text-gray-600 leading-loose">
                · {s}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 border-t border-slate-900 pt-2.5 text-xs text-gray-600">
          Nghiên cứu mô phỏng (Lux &amp; Marchesi 1999, LeBaron 2006): ABM tái
          hiện fat tails, volatility clustering — cơ sở để dự báo tác động chính
          sách T+0.
        </div>
      </div>
    </div>
  );
}
