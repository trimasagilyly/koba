import type { ActiveAgentType, AgentTradeStat } from "../../types";
import { AGENT_COLORS, AGENT_NAMES, AGENT_TYPES } from "../../constants/ui";

function fmtValue(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + " tỷ";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + " tr";
  return v.toLocaleString();
}

export default function AgentTradeStatsPanel({
  tradesByType,
}: {
  tradesByType: Record<ActiveAgentType, AgentTradeStat>;
}) {
  const totalCount = AGENT_TYPES.reduce((s, t) => s + tradesByType[t].count, 0);
  const totalValue = AGENT_TYPES.reduce((s, t) => s + tradesByType[t].value, 0);

  if (totalCount === 0) {
    return (
      <div className="text-xs text-gray-600 italic py-2">
        Chưa có giao dịch — nhấn ▶ để bắt đầu mô phỏng.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {AGENT_TYPES.map((type) => {
        const stat = tradesByType[type];
        const countPct = totalCount > 0 ? (stat.count / totalCount) * 100 : 0;
        const valuePct = totalValue > 0 ? (stat.value / totalValue) * 100 : 0;
        const color = AGENT_COLORS[type];
        return (
          <div key={type}>
            <div className="flex justify-between mb-0.5">
              <span className="text-xs font-semibold" style={{ color }}>
                {AGENT_NAMES[type]}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {stat.count.toLocaleString()} lệnh ·{" "}
                <span className="text-slate-300">{fmtValue(stat.value)}</span>
              </span>
            </div>
            <div className="h-1 bg-slate-800 rounded mb-0.5 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${countPct}%`,
                  background: color,
                  opacity: 0.8,
                }}
              />
            </div>
            <div className="h-1 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${valuePct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="text-xs text-gray-600 mt-1">
        Trên: số lệnh khớp · Dưới: giá trị giao dịch (tỷ đồng)
      </div>
    </div>
  );
}
