import type { ScenarioMetrics, AgentTradeStat } from "../../types";
import { AGENT_COLORS, AGENT_NAMES, AGENT_TYPES } from "../../constants/ui";

function fmtValue(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "tỷ";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "tr";
  return v.toLocaleString();
}

interface AgentTransactionChartProps {
  scenarios: ScenarioMetrics[];
  colors: string[];
}

export default function AgentTransactionChart({
  scenarios,
  colors,
}: AgentTransactionChartProps) {
  if (scenarios.length === 0) return null;

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
            <div className="text-xs font-bold mb-1" style={{ color }}>
              {AGENT_NAMES[type]}
            </div>
            <div className="flex flex-col gap-1">
              {scenarios.map((sc, i) => {
                const stat: AgentTradeStat = sc.tradesByType?.[type] ?? {
                  count: 0,
                  value: 0,
                };
                const countPct =
                  maxCount > 0 ? (stat.count / maxCount) * 100 : 0;
                const valuePct =
                  maxValue > 0 ? (stat.value / maxValue) * 100 : 0;
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
                          style={{
                            width: `${countPct}%`,
                            background: scColor,
                            opacity: 0.7,
                          }}
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
