import type { ScenarioMetrics } from "../../types";

export default function ScenarioCompare({
  metrics,
}: {
  metrics: ScenarioMetrics[];
}) {
  if (metrics.length < 2) return null;

  const rows: {
    label: string;
    key: keyof ScenarioMetrics;
    fmt: (v: number) => string;
    higher: "good" | "bad" | "neutral";
  }[] = [
    {
      label: "Giá TB",
      key: "avgPrice",
      fmt: (v) => v.toFixed(2),
      higher: "neutral",
    },
    {
      label: "Biến động (σ)",
      key: "volatility",
      fmt: (v) => (v * 100).toFixed(4) + "%",
      higher: "bad",
    },
    {
      label: "Hệ số Gini",
      key: "gini",
      fmt: (v) => v.toFixed(3),
      higher: "bad",
    },
    {
      label: "Tổng khối lượng",
      key: "totalVolume",
      fmt: (v) => v.toLocaleString(),
      higher: "good",
    },
    {
      label: "Flash Crash",
      key: "crashEvents",
      fmt: (v) => v.toFixed(0) + " lần",
      higher: "bad",
    },
    {
      label: "Spread TB",
      key: "avgSpread",
      fmt: (v) => v.toFixed(3) + " đ",
      higher: "bad",
    },
    {
      label: "Liquidity Freeze",
      key: "liquidityFreezes",
      fmt: (v) => v.toFixed(0) + " lần",
      higher: "bad",
    },
  ];

  // Reference scenario is the first one
  const ref = metrics[0];

  const diffColor = (diff: number, higher: "good" | "bad" | "neutral") => {
    if (diff === 0 || higher === "neutral") return "#64748b";
    return (higher === "good") === diff > 0 ? "#10b981" : "#ef4444";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs font-mono">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="py-1.5 px-2 text-left text-gray-600 font-medium">
              Chỉ số
            </th>
            {metrics.map((m) => (
              <th
                key={m.label}
                className="py-1.5 px-2 text-right text-slate-400 font-bold"
              >
                {m.label}
              </th>
            ))}
            {metrics.length === 2 && (
              <th className="py-1.5 px-2 text-center text-gray-600 font-medium">
                Δ (b−a)
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const vals = metrics.map((m) => m[row.key] as number);
            const refVal = vals[0];
            return (
              <tr key={row.label} className="border-b border-slate-900">
                <td className="py-1 px-2 text-gray-600">{row.label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="py-1 px-2 text-right text-slate-200">
                    {row.fmt(v)}
                  </td>
                ))}
                {metrics.length === 2 && (
                  <td
                    className="py-1 px-2 text-center font-semibold"
                    style={{ color: diffColor(vals[1] - refVal, row.higher) }}
                  >
                    {vals[1] === refVal
                      ? "—"
                      : `${vals[1] > refVal ? "▲" : "▼"} ${row.fmt(Math.abs(vals[1] - refVal))}`}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
