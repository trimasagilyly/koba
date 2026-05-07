import CandlestickChart from "../ui/CandlestickChart";
import LOBPanel from "../ui/LOBPanel";
import Badge from "../ui/Badge";
import StockFundamentalsPanel from "../ui/StockFundamentalsPanel";
import { AGENT_COLORS, TRADE_SHORT } from "../../constants/ui";
import type { Candle, Order, Trade, SettlementType } from "../../types";

interface LiveTabProps {
  candles: Candle[];
  bids: Order[];
  asks: Order[];
  midPrice: number;
  recentTrades: Trade[];
  settlement: SettlementType;
}

export default function LiveTab({
  candles,
  bids,
  asks,
  midPrice,
  recentTrades,
  settlement,
}: LiveTabProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1 flex flex-col gap-3">
        {/* Chart */}
        <div className="bg-slate-900 border border-gray-900 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 font-semibold">
              📉 Diễn biến Giá — {settlement}
            </span>
            <div className="flex gap-1.5">
              <Badge variant="green">Tăng</Badge>
              <Badge variant="red">Giảm</Badge>
            </div>
          </div>
          <CandlestickChart candles={candles} scenario={settlement} />
        </div>

        {/* Trade history */}
        <div className="bg-slate-900 border border-gray-900 rounded p-3">
          <div className="text-xs text-gray-600 font-semibold mb-2">
            ⚡ Lịch sử Lệnh khớp
          </div>
          <div className="grid grid-cols-5 gap-1 mb-1.5">
            {["Mã", "Giá", "KL", "Bên mua", "Bên bán"].map((h) => (
              <div key={h} className="text-xs text-gray-600">
                {h}
              </div>
            ))}
          </div>
          <div className="max-h-36 overflow-y-auto">
            {recentTrades.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-1 py-0.5 border-b border-slate-950"
              >
                <div className="text-xs text-cyan-400 font-bold">
                  {t.symbol}
                </div>
                <div className="text-xs text-slate-200">
                  {t.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">{t.qty}</div>
                <div
                  className="text-xs"
                  style={{ color: AGENT_COLORS[t.buyerType] }}
                >
                  {TRADE_SHORT[t.buyerType]}
                </div>
                <div
                  className="text-xs"
                  style={{ color: AGENT_COLORS[t.sellerType] }}
                >
                  {TRADE_SHORT[t.sellerType]}
                </div>
              </div>
            ))}
            {!recentTrades.length && (
              <div className="text-xs text-gray-600 py-2.5">
                Chưa có lệnh khớp. Nhấn ▶ Chạy.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right column: LOB + Fundamentals */}
      <div className="w-48 flex flex-col gap-3 shrink-0">
        {/* LOB */}
        <div className="bg-slate-900 border border-gray-900 rounded p-3">
          <div className="text-xs text-yellow-400 font-bold mb-1">
            📒 Sổ Lệnh (LOB)
          </div>
          <div className="text-xs text-gray-600 mb-2.5">
            Khớp lệnh liên tục · real-time
          </div>
          <LOBPanel bids={bids} asks={asks} midPrice={midPrice} />
          <div className="mt-2.5 border-t border-slate-900 pt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-600">Lệnh Mua</div>
              <div className="text-base font-bold text-emerald-400">
                {bids.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600">Lệnh Bán</div>
              <div className="text-base font-bold text-red-400">
                {asks.length}
              </div>
            </div>
          </div>
        </div>

        {/* Stock fundamentals panel — powered by enriched PE/PB data */}
        <StockFundamentalsPanel />
      </div>
    </div>
  );
}
