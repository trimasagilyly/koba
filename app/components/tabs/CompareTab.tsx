import ScenarioCompare from "../ui/ScenarioCompare";
import GiniBar from "../ui/GiniBar";
import GiniLineChart from "../ui/GiniLineChart";
import AgentTransactionChart from "../ui/AgentTransactionChart";
import type { ScenarioMetrics } from "../../types";
import { SCENARIO_COLORS, SCENARIO_GUIDE } from "../../constants/ui";

interface CompareTabProps {
  scenarioMetrics: ScenarioMetrics[];
}

export default function CompareTab({ scenarioMetrics }: CompareTabProps) {
  const colors = scenarioMetrics.map((_, i) => SCENARIO_COLORS[i] ?? "#9ca3af");

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
          <strong className="text-gray-500">Hướng dẫn:</strong> Cấu hình từng
          kịch bản ở bảng điều khiển trái → Nhấn{" "}
          <strong className="text-cyan-400">▶ Chạy</strong> (~50 ticks) → Nhấn{" "}
          <strong className="text-cyan-400">Lưu kịch bản</strong>. Lặp lại cho
          đủ 4 kịch bản.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIO_GUIDE.map((sg) => (
            <div
              key={sg.id}
              className="bg-slate-950 border border-slate-800 rounded p-2.5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: sg.color }}>
                  {sg.id}: {sg.label}
                </span>
                <span className={`text-xs font-semibold ${sg.evalCls}`}>
                  {sg.eval}
                </span>
              </div>
              <div className="text-xs text-gray-600 leading-snug">
                {sg.desc}
              </div>
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
              <GiniBar value={m.gini} label={`${m.label}`} />
            </div>
          ))}
          <div className="text-xs text-gray-600 mt-2 border-t border-slate-900 pt-2 leading-relaxed">
            <strong className="text-gray-500">Phát hiện chính:</strong> T+0
            thường tăng thanh khoản nhưng đẩy Gini lên ~0.60+ do HFT thu lợi
            nhanh hơn trong môi trường không có độ trễ thanh toán.
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
