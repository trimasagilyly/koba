import { AGENT_COLORS, AGENT_NAMES, AGENT_DESCS } from "../constants/ui";
import { NUM_AGENTS, SIM_STOCKS } from "../constants";
import type { AgentType } from "../types";

interface AgentsTabProps {
  wealthByType: Record<AgentType, number>;
  agentPct: Record<AgentType, number>;
}

const AGENT_TYPES: AgentType[] = ["fundamentalist", "momentum", "hft", "noise"];

function ValuationBadge({
  value,
  label,
}: {
  value: number | undefined;
  label: string;
}) {
  if (!value || value === 0) return null;
  return (
    <div className="bg-slate-950 border border-slate-900 rounded px-1.5 py-0.5 text-center">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-xs font-mono text-slate-300 font-bold">
        {value.toFixed(1)}x
      </div>
    </div>
  );
}

function StockFundamentals() {
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

function PriceHistoryStats() {
  const withHistory = SIM_STOCKS.filter(
    (s) => s.priceHistory && s.priceHistory.length > 0,
  );
  const withValuation = SIM_STOCKS.filter((s) => s.pe && s.pe > 0);
  const totalStocks = SIM_STOCKS.length;

  if (withHistory.length === 0) return null;

  // Calculate average historical volatility across stocks with price history
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

export default function AgentsTab({ wealthByType, agentPct }: AgentsTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {AGENT_TYPES.map((type) => {
          const wealth = wealthByType[type];
          return (
            <div
              key={type}
              className="bg-slate-900 border border-slate-800 rounded p-3.5"
            >
              <div className="flex justify-between mb-1.5">
                <div>
                  <div
                    className="text-xs font-bold"
                    style={{ color: AGENT_COLORS[type] }}
                  >
                    {AGENT_NAMES[type]}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Tài sản</div>
                  <div
                    className="text-base font-bold"
                    style={{ color: AGENT_COLORS[type] }}
                  >
                    {wealth.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-600 leading-relaxed mb-2">
                {AGENT_DESCS[type]}
              </div>
              <div className="h-1 bg-gray-900 rounded">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${Math.min(100, wealth)}%`,
                    background: AGENT_COLORS[type],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* HFT model */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2.5">
          📐 Mô hình HFT: Avellaneda–Stoikov Market Making
        </div>
        <div className="bg-slate-950 border border-slate-900 rounded p-3 font-mono text-xs text-sky-300 leading-loose mb-2.5">
          <div>
            P<sub>res</sub> = P<sub>mid</sub> &nbsp;−&nbsp; q · γ · σ² · T
          </div>
          <div>spread = γ · σ² · T + (2/γ) · ln(1 + γ/κ)</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {[
            ["P_res", "Reservation price — giá HFT thực sự muốn giao dịch"],
            ["q", "Inventory — số cổ phiếu đang nắm giữ"],
            ["γ", "Risk aversion — mức độ sợ rủi ro tồn kho"],
            ["σ²", "Variance — độ biến động giá hiện tại"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="bg-slate-950 border border-slate-900 rounded p-1.5"
            >
              <span className="text-sky-400 font-bold">{k}</span>: {v}
            </div>
          ))}
        </div>
      </div>

      {/* Momentum model signals */}
      <div className="bg-slate-900 border border-gray-900 rounded p-3.5">
        <div className="text-xs text-gray-500 font-semibold mb-2.5">
          📉 Mô hình Momentum: Composite Signal
        </div>
        <div className="bg-slate-950 border border-slate-900 rounded p-3 font-mono text-xs text-amber-300 leading-loose mb-2.5">
          <div>signal = EMA_cross×0.3 + ret5×0.25 + ret10×0.15</div>
          <div>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ ret20×0.1 +
            streak×0.12 + RSI×0.08
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {[
            ["EMA_cross", "EMA(8) vs EMA(21) — xu hướng ngắn/dài hạn"],
            ["ret5/10/20", "Lợi suất 5, 10, 20 bar — đa khung thời gian"],
            ["streak", "Số bar tăng/giảm liên tiếp — FOMO/panic"],
            ["RSI(14)", "Quá mua (>75) hoặc quá bán (<25) — guard"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="bg-slate-950 border border-slate-900 rounded p-1.5"
            >
              <span className="text-amber-400 font-bold">{k}</span>: {v}
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-600 leading-relaxed border-t border-slate-900 pt-2">
          Tín hiệu được tính trên toàn bộ{" "}
          <span className="text-amber-400">priceHistory</span> (60 bar lịch sử +
          live ticks). Beta cổ phiếu điều chỉnh quy mô lệnh theo rủi ro thị
          trường.
        </div>
      </div>

      {/* Stock fundamentals from enriched data */}
      <StockFundamentals />

      {/* Price history coverage */}
      <PriceHistoryStats />
    </div>
  );
}
