import GiniBar from "./GiniBar";
import GiniLineChart from "./GiniLineChart";
import type { SystemState, SettlementType, GiniPoint, AgentTradeStat } from "../types";
import type { AgentType } from "../types";
import { AGENT_COLORS, AGENT_NAMES } from "../constants/ui";

interface RiskTabProps {
  crashEvents: number;
  freezeEvents: number;
  systemState: SystemState;
  driftPct: number;
  gini: number;
  tick: number;
  settlement: SettlementType;
  giniHistory: GiniPoint[];
  tradesByType: Record<AgentType, AgentTradeStat>;
  lorenzCurve: { x: number; y: number }[];
}

const AGENT_TYPES: AgentType[] = ["fundamentalist", "momentum", "hft", "noise"];

function AgentTradeStatsPanel({
  tradesByType,
}: {
  tradesByType: Record<AgentType, AgentTradeStat>;
}) {
  const totalCount = AGENT_TYPES.reduce(
    (s, t) => s + tradesByType[t].count,
    0,
  );
  const totalValue = AGENT_TYPES.reduce(
    (s, t) => s + tradesByType[t].value,
    0,
  );
  if (totalCount === 0) {
    return (
      <div className="text-xs text-gray-600 italic py-2">
        Chưa có giao dịch — nhấn ▶ để bắt đầu mô phỏng.
      </div>
    );
  }

  const fmtValue = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(1) + " tỷ";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + " tr";
    return v.toLocaleString();
  };

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
                style={{ width: `${countPct}%`, background: color, opacity: 0.8 }}
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

function ParetoChart({ curve, gini }: { curve: { x: number; y: number }[]; gini: number }) {
  const W = 300;
  const H = 210;
  const PAD = { t: 14, r: 38, b: 34, l: 32 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const N = 10; // deciles

  if (curve.length < 2) {
    return (
      <div className="h-[140px] flex items-center justify-center text-xs text-gray-700">
        Đang chờ dữ liệu… (cần ít nhất 10 ticks)
      </div>
    );
  }

  // Interpolate lorenzCurve at arbitrary x ∈ [0,1]
  const interp = (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return curve[curve.length - 1].y;
    const i = curve.findIndex((p) => p.x >= x);
    if (i <= 0) return curve[0]?.y ?? 0;
    const p0 = curve[i - 1], p1 = curve[i];
    const t = (x - p0.x) / (p1.x - p0.x || 1);
    return p0.y + t * (p1.y - p0.y);
  };

  // Decile wealth %: richest group first (x = 1→0.9, 0.9→0.8, …)
  const bars = Array.from({ length: N }, (_, k) => {
    const hi = 1 - k / N;
    const lo = 1 - (k + 1) / N;
    return (interp(hi) - interp(lo)) * 100;
  });

  // Cumulative wealth % from richest group left to right
  const cumLine: number[] = [];
  let acc = 0;
  bars.forEach((b) => { acc += b; cumLine.push(acc); });

  const barW = cW / N;
  const toBarH = (v: number) => (v / 100) * cH;
  const toY = (pct: number) => PAD.t + (1 - pct / 100) * cH;
  const dotX = (k: number) => PAD.l + (k + 0.5) * barW;

  const linePoints = cumLine.map((v, k) => `${dotX(k).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const pareto80 = cumLine.findIndex((v) => v >= 80);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-4/5 mx-auto">
      <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#070d17" rx="2" />

      {/* Grid + left axis labels */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={PAD.l + cW} y1={toY(v)} y2={toY(v)}
            stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={PAD.l - 3} y={toY(v) + 2.5}
            fontSize="4.5" fill="#374151" textAnchor="end" fontFamily="monospace">{v}%</text>
          {/* Right axis (cumulative %) */}
          <text x={PAD.l + cW + 3} y={toY(v) + 2.5}
            fontSize="4.5" fill="#06b6d4" textAnchor="start" fontFamily="monospace">{v}%</text>
        </g>
      ))}

      {/* 80% cumulative reference line */}
      <line x1={PAD.l} x2={PAD.l + cW} y1={toY(80)} y2={toY(80)}
        stroke="#ef4444" strokeWidth="0.8" strokeDasharray="4,2" opacity="0.5" />

      {/* Bars: red=top20%, amber=next30%, blue=bottom50% */}
      {bars.map((d, k) => {
        const bH = toBarH(d);
        const color = k < 2 ? "#ef4444" : k < 5 ? "#f59e0b" : "#3b82f6";
        return (
          <rect key={k}
            x={PAD.l + k * barW + 1.5} y={PAD.t + cH - bH}
            width={barW - 3} height={bH}
            fill={color} opacity="0.72" rx="1" />
        );
      })}

      {/* Cumulative line */}
      <polyline points={linePoints} fill="none"
        stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {cumLine.map((v, k) => (
        <circle key={k} cx={dotX(k)} cy={toY(v)} r="1.8" fill="#06b6d4" />
      ))}

      {/* Pareto 80/20 vertical marker */}
      {pareto80 >= 0 && (
        <>
          <line x1={dotX(pareto80)} x2={dotX(pareto80)} y1={PAD.t} y2={PAD.t + cH}
            stroke="#ef4444" strokeWidth="0.8" strokeDasharray="4,2" opacity="0.6" />
          <text x={dotX(pareto80) + 2} y={PAD.t + 7}
            fontSize="4.5" fill="#ef4444" fontFamily="monospace">
            {((pareto80 + 1) * 10)}%→80%
          </text>
        </>
      )}

      {/* Axes */}
      <line x1={PAD.l} x2={PAD.l + cW} y1={PAD.t + cH} y2={PAD.t + cH} stroke="#374151" strokeWidth="0.8" />
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={PAD.t + cH} stroke="#374151" strokeWidth="0.8" />

      {/* X-axis labels */}
      {bars.map((_, k) => (
        <text key={k} x={PAD.l + (k + 0.5) * barW} y={H - PAD.b + 8}
          fontSize="4" fill="#374151" textAnchor="middle" fontFamily="monospace">
          {(k + 1) * 10}%
        </text>
      ))}

      {/* Gini badge */}
      <rect x={PAD.l + cW - 46} y={PAD.t + 2} width={44} height={10} rx="2" fill="#0f172a" opacity="0.85" />
      <text x={PAD.l + cW - 43} y={PAD.t + 8} fontSize="5" fill="#94a3b8" fontFamily="monospace">Gini =</text>
      <text x={PAD.l + cW - 20} y={PAD.t + 8} fontSize="5" fontFamily="monospace" fontWeight="bold"
        fill={gini > 0.55 ? "#ef4444" : gini > 0.35 ? "#f59e0b" : "#10b981"}>
        {gini.toFixed(3)}
      </text>

      {/* Legend */}
      <rect x={PAD.l + 2} y={PAD.t + 2} width={4} height={4} fill="#ef4444" rx="1" opacity="0.8" />
      <text x={PAD.l + 8} y={PAD.t + 6} fontSize="4.5" fill="#ef4444" fontFamily="monospace">Top 20%</text>
      <circle cx={PAD.l + 44} cy={PAD.t + 4} r="1.5" fill="#06b6d4" />
      <text x={PAD.l + 47} y={PAD.t + 6} fontSize="4.5" fill="#06b6d4" fontFamily="monospace">% tích lũy</text>

      {/* Axis labels */}
      <text x={PAD.l + cW / 2} y={H - 3}
        fontSize="5" fill="#4b5563" textAnchor="middle" fontFamily="monospace">
        Nhóm agent (giàu → nghèo, 10%/cột)
      </text>
      <text x={8} y={PAD.t + cH / 2}
        fontSize="5" fill="#4b5563" textAnchor="middle" fontFamily="monospace"
        transform={`rotate(-90, 8, ${PAD.t + cH / 2})`}>
        % tài sản
      </text>
    </svg>
  );
}

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
  const riskCounters = [
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

  const giniLegend = [
    ["Gini < 0.35", "Thị trường công bằng", "text-emerald-400"],
    ["Gini 0.35–0.55", "Bắt đầu mất cân bằng", "text-yellow-400"],
    ["Gini > 0.55", "HFT chiếm lợi thế lớn", "text-red-400"],
    ["Gini → 0.65+ (T+0)", "Tài sản tập trung cá mập", "text-red-400"],
  ];

  const isT0 = settlement === "T+0";
  const lineColor = isT0 ? "#ef4444" : "#06b6d4";

  return (
    <div className="flex flex-col gap-3">
      {/* ── GINI time-series line chart ── */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2">
          📈 Đường GINI theo thời gian — {settlement} · Tick #{tick}
        </div>
        {giniHistory.length >= 2 ? (
          <GiniLineChart
            series={[{ label: settlement, color: lineColor, points: giniHistory }]}
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

      {/* ── Gini static bar ── */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-3">
          ⚖️ Hệ số Gini — Bất bình đẳng Tài sản
        </div>
        <GiniBar value={gini} label={`${settlement} · Tick #${tick}`} />
        <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
          {giniLegend.map(([range, desc, cls]) => (
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

      {/* ── Pareto Chart ── */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-1">
          📊 Biểu đồ Pareto — Phân phối Tài sản Agent
        </div>
        <div className="text-xs text-gray-700 mb-2.5 leading-snug">
          Mỗi cột = 10% dân số (từ giàu nhất → nghèo nhất). Đường <span className="text-cyan-700">xanh</span> = % tích lũy.
          Quy tắc 80/20: nếu <span className="text-red-700">20% agent giàu nhất</span> nắm ≥80% tài sản → thị trường tập trung cao.
        </div>
        <ParetoChart curve={lorenzCurve} gini={gini} />
      </div>

      {/* ── Per-agent trade statistics ── */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2.5">
          🤖 Giao dịch theo loại Agent — {settlement}
        </div>
        <AgentTradeStatsPanel tradesByType={tradesByType} />
      </div>

      {/* ── Risk counters ── */}
      <div className="grid grid-cols-3 gap-3">
        {riskCounters.map((r) => (
          <div
            key={r.label}
            className={`bg-slate-900 border rounded p-3.5 ${
              r.value >= r.warn ? r.warnCls : "border-gray-900"
            }`}
          >
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              {r.label}
            </div>
            <div
              className={`text-4xl font-bold my-1.5 ${
                r.value >= r.warn ? r.valueCls : r.dimCls
              }`}
            >
              {r.value}
            </div>
            <div className="text-xs text-gray-600 leading-snug">{r.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Policy trade-off ── */}
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
