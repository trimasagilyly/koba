import { SIM_STOCKS } from "../../utils/stockData";

export default function StockFundamentalsPanel() {
  const stocks = SIM_STOCKS.filter(
    (s) => s.pe !== undefined && s.pe > 0 && s.pb !== undefined && s.pb > 0,
  ).slice(0, 8);

  if (stocks.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-gray-900 rounded p-3">
      <div className="text-xs text-yellow-400 font-bold mb-2">
        📋 Định giá cổ phiếu (enriched data)
      </div>

      {/* Header */}
      <div
        className="grid gap-0.5 mb-1"
        style={{ gridTemplateColumns: "3fr 1.2fr 1.2fr 1.5fr" }}
      >
        {["Mã", "P/E", "P/B", "Gap%"].map((h) => (
          <div key={h} className="text-xs text-gray-600 font-semibold">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="max-h-52 overflow-y-auto">
        {stocks.map((s) => {
          const gap =
            s.fundamentalValue > 0
              ? ((s.fundamentalValue - s.initialPrice) / s.fundamentalValue) *
                100
              : 0;
          const gapColor =
            gap > 10
              ? "text-emerald-400"
              : gap < -10
                ? "text-red-400"
                : "text-gray-500";
          const gapSign = gap > 0 ? "+" : "";

          return (
            <div
              key={s.symbol}
              className="grid gap-0.5 py-0.5 border-b border-slate-950"
              style={{ gridTemplateColumns: "3fr 1.2fr 1.2fr 1.5fr" }}
            >
              <div className="text-xs text-cyan-400 font-bold truncate">
                {s.symbol}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {s.pe && s.pe > 0 ? s.pe.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-slate-300 font-mono">
                {s.pb && s.pb > 0 ? s.pb.toFixed(2) : "—"}
              </div>
              <div className={`text-xs font-mono font-bold ${gapColor}`}>
                {gapSign}
                {gap.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-xs text-gray-700 leading-relaxed">
        Gap% = (FV − Price) / FV · Fundamentalist mua khi Gap &gt; 0
      </div>
    </div>
  );
}
