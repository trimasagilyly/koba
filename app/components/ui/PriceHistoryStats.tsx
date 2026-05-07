import { SIM_STOCKS } from "../../utils/stockData";

export default function PriceHistoryStats() {
  const withHistory = SIM_STOCKS.filter(
    (s) => s.priceHistory && s.priceHistory.length > 0,
  );
  const withValuation = SIM_STOCKS.filter((s) => s.pe && s.pe > 0);

  if (withHistory.length === 0) return null;

  const avgVol =
    withHistory.reduce((sum, s) => {
      const ph = s.priceHistory!;
      if (ph.length < 2) return sum;
      const returns = ph.slice(1).map((p, i) => (p - ph[i]) / ph[i]);
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
      return sum + Math.sqrt(variance) * 100;
    }, 0) / withHistory.length;

  return (
    <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
      <div className="text-xs text-gray-500 font-semibold mb-2.5">
        📈 Dữ liệu lịch sử giá
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div className="bg-slate-950 border border-slate-900 rounded p-2">
          <div className="text-base font-bold text-cyan-400">
            {withHistory.length}
          </div>
          <div className="text-xs text-gray-600">Mã có lịch sử giá</div>
        </div>
        <div className="bg-slate-950 border border-slate-900 rounded p-2">
          <div className="text-base font-bold text-blue-400">
            {withValuation.length}
          </div>
          <div className="text-xs text-gray-600">Mã có P/E, P/B</div>
        </div>
        <div className="bg-slate-950 border border-slate-900 rounded p-2">
          <div className="text-base font-bold text-amber-400">
            {avgVol.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-600">Biến động TB ngày</div>
        </div>
      </div>
      <div className="text-xs text-gray-600 leading-relaxed">
        Dữ liệu lịch sử được dùng để tính EMA, RSI và tín hiệu momentum.
        Momentum agent sử dụng{" "}
        {withHistory.length > 0
          ? (withHistory[0].priceHistory?.length ?? 60)
          : 60}
        -bar history để quyết định giao dịch.
      </div>
    </div>
  );
}
