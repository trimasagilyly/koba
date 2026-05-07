import {
  AGENT_COLORS,
  AGENT_NAMES,
  AGENT_DESCS,
  AGENT_TYPES,
} from "../../constants/ui";
import type { ActiveAgentType } from "../../types";
import StockFundamentals from "../ui/StockFundamentals";
import PriceHistoryStats from "../ui/PriceHistoryStats";

interface AgentsTabProps {
  wealthByType: Record<ActiveAgentType, number>;
  agentPct: Record<ActiveAgentType, number>;
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
                  <div className="text-xs text-gray-600 mt-0.5"></div>
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

      <StockFundamentals />
      <PriceHistoryStats />
    </div>
  );
}
