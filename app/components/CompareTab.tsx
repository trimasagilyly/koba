import ScenarioCompare from "./ScenarioCompare";
import GiniBar from "./GiniBar";
import GiniLineChart from "./GiniLineChart";
import type { ScenarioMetrics, AgentType, AgentTradeStat } from "../types";
import { AGENT_COLORS, AGENT_NAMES } from "../constants/ui";

interface CompareTabProps {
  scenarioMetrics: ScenarioMetrics[];
}

/** Palette for up to 4 scenarios */
const SCENARIO_COLORS = ["#06b6d4", "#f59e0b", "#3b82f6", "#a78bfa"];

const AGENT_TYPES: AgentType[] = ["fundamentalist", "momentum", "hft", "noise"];

/** Two-row grouped bar chart: trade count + value per agent type, across all scenarios */
function AgentTransactionChart({
  scenarios,
  colors,
}: {
  scenarios: ScenarioMetrics[];
  colors: string[];
}) {
  if (scenarios.length === 0) return null;

  const fmtValue = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "tỷ";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "tr";
    return v.toLocaleString();
  };

  // Max count and value across all scenarios + types for normalisation
  let maxCount = 1;
  let maxValue = 1;
  scenarios.forEach((sc) => {
    AGENT_TYPES.forEach((t) => {
      const s: AgentTradeStat = sc.tradesByType?.[t] ?? { count: 0, value: 0 };
      maxCount = Math.max(maxCount, s.count);
      maxValue = Math.max(maxValue, s.value);
    });
  });

  return (
    <div className="flex flex-col gap-3">
      {AGENT_TYPES.map((type) => {
        const color = AGENT_COLORS[type];
        return (
          <div key={type}>
            <div
              className="text-xs font-bold mb-1"
              style={{ color }}
            >
              {AGENT_NAMES[type]}
            </div>
            <div className="flex flex-col gap-1">
              {scenarios.map((sc, i) => {
                const stat: AgentTradeStat = sc.tradesByType?.[type] ?? { count: 0, value: 0 };
                const countPct = maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                const valuePct = maxValue > 0 ? (stat.value / maxValue) * 100 : 0;
                const scColor = colors[i] ?? "#9ca3af";
                return (
                  <div key={sc.label}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className="inline-block w-2 h-2 rounded-sm shrink-0"
                        style={{ background: scColor }}
                      />
                      <span className="text-xs text-gray-600 w-20 truncate">
                        {sc.label}
                      </span>
                      <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${countPct}%`, background: scColor, opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-500 w-16 text-right shrink-0">
                        {stat.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 shrink-0" />
                      <span className="text-xs text-gray-700 w-20" />
                      <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${valuePct}%`, background: scColor }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-600 w-16 text-right shrink-0">
                        {fmtValue(stat.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="text-xs text-gray-600 border-t border-slate-900 pt-2">
        Thanh đậm: số lệnh khớp · Thanh mảnh: giá trị giao dịch
      </div>
    </div>
  );
}

/** 4 reference scenario descriptions */
const SCENARIO_GUIDE = [
  {
    id: "S1",
    label: "T+2.5 · Cân bằng",
    color: "#06b6d4",
    desc: "30% Fund, 30% Mom, 10% HFT, 30% Noise · Biên độ 7%",
    eval: "Tốt",
    evalCls: "text-emerald-400",
  },
  {
    id: "S2",
    label: "T+0 · Cân bằng",
    color: "#f59e0b",
    desc: "Cùng thành phần Agent như S1, chuyển sang T+0",
    eval: "Trung bình",
    evalCls: "text-yellow-400",
  },
  {
    id: "S3",
    label: "T+2.5 · HFT Cao",
    color: "#3b82f6",
    desc: "15% Fund, 20% Mom, 40% HFT, 25% Noise · Biên độ 7%",
    eval: "Trung bình",
    evalCls: "text-yellow-400",
  },
  {
    id: "S4",
    label: "T+0 · HFT Cao",
    color: "#a78bfa",
    desc: "15% Fund, 20% Mom, 40% HFT, 25% Noise · T+0",
    eval: "Xấu",
    evalCls: "text-red-400",
  },
];

export default function CompareTab({ scenarioMetrics }: CompareTabProps) {
  const colors = scenarioMetrics.map((_, i) => SCENARIO_COLORS[i] ?? "#9ca3af");

  // Build GINI line chart series from saved scenarios
  const giniSeries = scenarioMetrics.map((m, i) => ({
    label: m.label,
    color: SCENARIO_COLORS[i] ?? "#9ca3af",
    points: m.giniHistory ?? [],
  }));

  const maxTick = Math.max(
    300,
    ...giniSeries.flatMap((s) => s.points.map((p) => p.tick)),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* ── Scenario setup guide ── */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-sm text-blue-300 font-bold mb-1">
          ⚖️ Mô phỏng 4 Kịch bản — So sánh T+0 vs T+2.5
        </div>
        <div className="text-xs text-gray-600 mb-3 leading-relaxed">
          <strong className="text-gray-500">Hướng dẫn:</strong> Cấu hình từng kịch bản
          ở bảng điều khiển trái → Nhấn <strong className="text-cyan-400">▶ Chạy</strong>{" "}
          (~50 ticks) → Nhấn <strong className="text-cyan-400">Lưu kịch bản</strong>.
          Lặp lại cho đủ 4 kịch bản.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIO_GUIDE.map((sg) => (
            <div
              key={sg.id}
              className="bg-slate-950 border border-slate-800 rounded p-2.5"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-bold"
                  style={{ color: sg.color }}
                >
                  {sg.id}: {sg.label}
                </span>
                <span className={`text-xs font-semibold ${sg.evalCls}`}>
                  {sg.eval}
                </span>
              </div>
              <div className="text-xs text-gray-600 leading-snug">{sg.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-700">
          Đã lưu: {scenarioMetrics.length}/4 kịch bản
          {scenarioMetrics.length > 0 && (
            <span className="ml-2 text-slate-400">
              ({scenarioMetrics.map((m) => m.label).join(", ")})
            </span>
          )}
        </div>
      </div>

      {/* ── Multi-scenario GINI line chart ── */}
      {giniSeries.some((s) => s.points.length >= 2) && (
        <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
          <div className="text-xs text-gray-500 font-semibold mb-2">
            📈 Đường GINI theo kịch bản — so sánh T+0 vs T+2.5
          </div>
          <GiniLineChart series={giniSeries} height={180} maxTick={maxTick} />
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
            {scenarioMetrics.map((m, i) => (
              <span key={m.label} style={{ color: SCENARIO_COLORS[i] }}>
                ■ {m.label} (Gini={m.gini.toFixed(3)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Gini bars per scenario ── */}
      {scenarioMetrics.length > 0 && (
        <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
          <div className="text-xs text-gray-500 font-semibold mb-2.5">
            ⚖️ Hệ số Gini cuối kỳ theo kịch bản
          </div>
          {scenarioMetrics.map((m, i) => (
            <div key={m.label} className="mb-1">
              <GiniBar
                value={m.gini}
                label={`${m.label}`}
              />
            </div>
          ))}
          <div className="text-xs text-gray-600 mt-2 border-t border-slate-900 pt-2 leading-relaxed">
            <strong className="text-gray-500">Phát hiện chính:</strong> T+0 thường
            tăng thanh khoản nhưng đẩy Gini lên ~0.60+ do HFT thu lợi nhanh hơn
            trong môi trường không có độ trễ thanh toán.
          </div>
        </div>
      )}

      {/* ── Per-agent transaction visualization ── */}
      {scenarioMetrics.length > 0 && (
        <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
          <div className="text-xs text-gray-500 font-semibold mb-2.5">
            🤖 Giao dịch theo loại Agent & Kịch bản
          </div>
          <AgentTransactionChart scenarios={scenarioMetrics} colors={colors} />
        </div>
      )}

      {/* ── Metric comparison table ── */}
      {scenarioMetrics.length >= 2 && (
        <div className="bg-slate-900 border border-gray-900 rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-2.5">
            📊 Bảng so sánh chỉ số
          </div>
          <ScenarioCompare metrics={scenarioMetrics} />
        </div>
      )}
    </div>
  );
}
