import type { Candle } from "../../types";
import { SIM_STOCKS } from "../../utils/stockData";

export default function CandlestickChart({
  candles,
  scenario,
}: {
  candles: Candle[];
  scenario: string;
}) {
  // Count stocks with price history seeded
  const seededCount = SIM_STOCKS.filter(
    (s) => s.priceHistory && s.priceHistory.length > 0,
  ).length;
  const historyBars =
    SIM_STOCKS.find((s) => s.priceHistory && s.priceHistory.length > 0)
      ?.priceHistory?.length ?? 0;

  if (!candles.length)
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2">
        <div className="text-slate-700 text-xs">
          Nhấn ▶ Chạy để bắt đầu mô phỏng...
        </div>
        {seededCount > 0 && (
          <div className="text-xs text-slate-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-900 inline-block" />
            {seededCount} mã đã nạp {historyBars}-bar lịch sử giá thực
          </div>
        )}
      </div>
    );

  const W = 600,
    H = 200;
  const allP = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allP) - 0.5;
  const maxP = Math.max(...allP) + 0.5;
  const range = maxP - minP || 1;
  const pad = { top: 10, bottom: 22, left: 44, right: 8 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const bw = Math.max(1.5, (cW / candles.length) * 0.65);
  const toY = (p: number) => pad.top + cH - ((p - minP) / range) * cH;
  const toX = (i: number) => pad.left + (i + 0.5) * (cW / candles.length);
  const labels = Array.from({ length: 5 }, (_, i) => minP + (range / 4) * i);

  // Compute a simple price change % for annotation
  const firstClose = candles[0]?.open ?? 0;
  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const changePct =
    firstClose > 0
      ? (((lastClose - firstClose) / firstClose) * 100).toFixed(2)
      : null;
  const isUp = lastClose >= firstClose;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block">
      <rect width={W} height={H} fill="#070d17" rx="4" />

      {labels.map((p, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            y1={toY(p)}
            x2={W - pad.right}
            y2={toY(p)}
            stroke="#111827"
            strokeWidth="0.6"
            strokeDasharray="3,4"
          />
          <text
            x={pad.left - 4}
            y={toY(p) + 3.5}
            fontSize="7.5"
            fill="#374151"
            textAnchor="end"
            fontFamily="monospace"
          >
            {p.toFixed(1)}
          </text>
        </g>
      ))}

      {candles.map((c, i) => {
        const x = toX(i);
        const isGreen = c.close >= c.open;
        const col = isGreen ? "#10b981" : "#ef4444";
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));
        return (
          <g key={i}>
            <line
              x1={x}
              y1={toY(c.high)}
              x2={x}
              y2={toY(c.low)}
              stroke={col}
              strokeWidth="0.8"
              opacity="0.7"
            />
            <rect
              x={x - bw / 2}
              y={bodyTop}
              width={bw}
              height={bodyH}
              fill={col}
              opacity="0.9"
            />
          </g>
        );
      })}

      <line
        x1={pad.left}
        y1={pad.top}
        x2={pad.left}
        y2={H - pad.bottom}
        stroke="#1f2937"
        strokeWidth="1"
      />
      <line
        x1={pad.left}
        y1={H - pad.bottom}
        x2={W - pad.right}
        y2={H - pad.bottom}
        stroke="#1f2937"
        strokeWidth="1"
      />

      {/* Bottom bar: scenario label + change % + history seed badge */}
      <text
        x={W - pad.right}
        y={H - 5}
        fontSize="8"
        fill="#1f2937"
        textAnchor="end"
        fontFamily="monospace"
      >
        {scenario}
      </text>

      {changePct !== null && (
        <text
          x={pad.left + 4}
          y={H - 5}
          fontSize="8"
          fill={isUp ? "#065f46" : "#7f1d1d"}
          fontFamily="monospace"
        >
          {isUp ? "▲" : "▼"} {Math.abs(Number(changePct))}%
        </text>
      )}

      {/* History seed indicator dot */}
      {seededCount > 0 && (
        <g>
          <circle cx={pad.left + 80} cy={H - 6} r="2.5" fill="#164e63" />
          <text
            x={pad.left + 86}
            y={H - 4}
            fontSize="7"
            fill="#164e63"
            fontFamily="monospace"
          >
            {historyBars}bar seed
          </text>
        </g>
      )}
    </svg>
  );
}
