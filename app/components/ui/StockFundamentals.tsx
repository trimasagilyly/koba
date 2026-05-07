import { SIM_STOCKS } from "../../utils/stockData";
import ValuationBadge from "./ValuationBadge";

export default function StockFundamentals() {
  const stocksWithData = SIM_STOCKS.filter(
    (s) => s.pe && s.pe > 0 && s.pb && s.pb > 0,
  ).slice(0, 6);

  if (stocksWithData.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
      <div className="text-xs text-gray-500 font-semibold mb-2.5">
        📊 Định giá cổ phiếu mô phỏng (sample)
      </div>
      {stocksWithData.map((s) => {
        const gap =
          ((s.fundamentalValue - s.initialPrice) / s.fundamentalValue) * 100;
        const isUndervalued = gap > 5;
        const isOvervalued = gap < -5;
        return (
          <div key={s.symbol} className="mb-2.5 last:mb-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-cyan-400 font-bold text-xs">
                {s.symbol}
              </span>
              <span className="text-gray-600 text-xs truncate flex-1">
                {s.name?.split(" ").slice(0, 3).join(" ")}
              </span>
              {isUndervalued && (
                <span className="text-emerald-500 text-xs">↑ mua</span>
              )}
              {isOvervalued && (
                <span className="text-red-400 text-xs">↓ bán</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <ValuationBadge value={s.pe} label="P/E" />
              <ValuationBadge value={s.pb} label="P/B" />
              {s.eps && s.eps > 0 && (
                <ValuationBadge value={s.eps / 1000} label="EPS(k)" />
              )}
            </div>
          </div>
        );
      })}
      <div className="mt-2 text-xs text-gray-600 leading-relaxed border-t border-slate-900 pt-2">
        ↑ Giá thị trường thấp hơn giá trị nội tại · Fundamentalist mua vào
      </div>
    </div>
  );
}
