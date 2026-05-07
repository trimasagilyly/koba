import { BASE_POINT, SIM_SYMBOLS, SIM_STOCKS } from "../constants";
import type { SystemState } from "../types";

interface KpiBarProps {
  midPrice: number;
  gini: number;
  totalVolume: number;
  spread: number;
  crashEvents: number;
  freezeEvents: number;
  systemState: SystemState;
  tick: number;
}

export default function KpiBar({
  midPrice,
  gini,
  totalVolume,
  spread,
  crashEvents,
  freezeEvents,
  systemState,
  tick,
}: KpiBarProps) {
  const priceChange = midPrice - BASE_POINT;
  const priceUp = priceChange >= 0;

  // Count stocks with enriched fundamental data
  const enrichedCount = SIM_STOCKS.filter(
    (s) => s.pe !== undefined && s.pe > 0,
  ).length;

  // Average P/E across enriched stocks (market-wide blended PE)
  const avgPE =
    enrichedCount > 0
      ? SIM_STOCKS.filter((s) => s.pe && s.pe > 0).reduce(
          (sum, s) => sum + (s.pe ?? 0),
          0,
        ) / enrichedCount
      : null;

  return (
    <div className="bg-slate-900 border-b border-slate-900 px-4 py-2 flex gap-5 shrink-0 flex-wrap">
      <div className="min-w-28">
        <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
          VN-Index
        </div>
        <div className="text-lg font-bold text-slate-100 leading-tight">
          {midPrice.toFixed(2)}
        </div>
        <div
          className={`text-xs mt-0.5 ${priceUp ? "text-emerald-400" : "text-red-400"}`}
        >
          {priceUp ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}
          <span className="text-gray-600 ml-1">({SIM_SYMBOLS.length} cp)</span>
        </div>
      </div>

      <div className="min-w-28">
        <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
          Gini Coefficient
        </div>
        <div className="text-lg font-bold text-slate-100 leading-tight">
          {gini.toFixed(3)}
        </div>
        <div
          className={`text-xs mt-0.5 ${gini > 0.55 ? "text-red-400" : "text-emerald-400"}`}
        >
          {gini > 0.55 ? "⚠ Bất bình đẳng cao" : "✓ Ổn định"}
        </div>
      </div>

      <div className="min-w-28">
        <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
          Khối lượng tích lũy
        </div>
        <div className="text-lg font-bold text-slate-100 leading-tight">
          {totalVolume.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Spread TB {spread.toFixed(2)}đ
        </div>
      </div>

      <div className="min-w-28">
        <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
          Flash Crash
        </div>
        <div className="text-lg font-bold text-slate-100 leading-tight">
          {crashEvents}
        </div>
        <div
          className={`text-xs mt-0.5 ${crashEvents > 3 ? "text-red-400" : "text-gray-500"}`}
        >
          Freeze {freezeEvents}x
        </div>
      </div>

      {/* Blended market PE — only shown when enriched data is available */}
      {avgPE !== null && (
        <div className="min-w-28">
          <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
            P/E Thị trường
          </div>
          <div className="text-lg font-bold text-slate-100 leading-tight">
            {avgPE.toFixed(1)}x
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {enrichedCount} mã có PE · avg
          </div>
        </div>
      )}

      <div className="min-w-28">
        <div className="text-xs text-gray-600 uppercase tracking-wide mb-0.5">
          Trạng thái
        </div>
        <div className="text-lg font-bold text-slate-100 leading-tight">
          {systemState}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{tick} ticks</div>
      </div>
    </div>
  );
}
