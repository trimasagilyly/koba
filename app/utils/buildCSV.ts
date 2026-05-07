import type { ActiveAgentType, SettlementType, TimeScale } from "../types";
import type { Candle, Trade, ScenarioMetrics } from "../types";
import {
  NUM_AGENTS,
  GINI_ZONE_LOW,
  GINI_ZONE_MID,
} from "../constants/simulation";
import { AGENT_NAMES, AGENT_TYPES } from "../constants/ui";

interface ExportParams {
  settlement: SettlementType;
  driftPct: number;
  timeScale: TimeScale;
  tick: number;
  pctFund: number;
  pctMom: number;
  pctHft: number;
  pctNoise: number;
  midPrice: number;
  gini: number;
  totalVolume: number;
  spread: number;
  crashEvents: number;
  freezeEvents: number;
  systemState: string;
  candles: Candle[];
  wealthByType: Record<ActiveAgentType, number>;
  agentPct: Record<ActiveAgentType, number>;
  recentTrades: Trade[];
  scenarioMetrics: ScenarioMetrics[];
}

function giniCategory(g: number): string {
  if (g < GINI_ZONE_LOW) return "Thị trường công bằng";
  if (g < GINI_ZONE_MID) return "Bắt đầu mất cân bằng";
  return "HFT chiếm lợi thế lớn";
}

export function buildCSV(p: ExportParams): string {
  const rows: string[] = [];

  rows.push("=== CẤU HÌNH MÔ PHỎNG ===");
  rows.push("Tham số,Giá trị");
  rows.push(`Chu kỳ thanh toán,${p.settlement}`);
  rows.push(`Biên độ giá,±${p.driftPct}%`);
  rows.push(`Thời lượng chạy,${p.timeScale}`);
  rows.push(`Tổng số tick,${p.tick}`);
  rows.push(`Tổng số agent,${NUM_AGENTS}`);
  rows.push(`% Fundamentalist,${p.pctFund}%`);
  rows.push(`% Momentum,${p.pctMom}%`);
  rows.push(`% HFT,${p.pctHft}%`);
  rows.push(`% Noise,${p.pctNoise}%`);
  rows.push("");

  rows.push("=== LIVE MARKET — KPI ===");
  rows.push("Chỉ số,Giá trị");
  rows.push(`VN-Index,${p.midPrice.toFixed(2)}`);
  rows.push(`Gini Coefficient,${p.gini.toFixed(4)}`);
  rows.push(`Khối lượng tích lũy,${p.totalVolume.toLocaleString()}`);
  rows.push(`Spread trung bình,${p.spread.toFixed(3)}`);
  rows.push(`Flash Crash events,${p.crashEvents}`);
  rows.push(`Liquidity Freeze events,${p.freezeEvents}`);
  rows.push(`Trạng thái hệ thống,${p.systemState}`);
  rows.push("");

  rows.push("=== DIỄN BIẾN GIÁ — NẾN NHẬT (LIVE MARKET) ===");
  rows.push("Tick,Open,High,Low,Close,Volume");
  p.candles.forEach((c) => {
    rows.push(
      `${c.tick},${c.open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${c.close.toFixed(2)},${c.volume}`,
    );
  });
  rows.push("");

  rows.push("=== PHÂN TÍCH AGENT ===");
  rows.push("Loại Agent,% Trong thị trường,Số lượng agent,% Tài sản nắm giữ");
  AGENT_TYPES.forEach((type) => {
    const pct = p.agentPct[type];
    const count = Math.round((NUM_AGENTS * pct) / 100);
    rows.push(
      `${AGENT_NAMES[type]},${pct}%,${count},${p.wealthByType[type].toFixed(1)}%`,
    );
  });
  rows.push("");

  rows.push("=== RỦI RO & GINI ===");
  rows.push("Chỉ số rủi ro,Giá trị,Ngưỡng cảnh báo,Trạng thái");
  rows.push(
    `Flash Crash,${p.crashEvents},3,${p.crashEvents >= 3 ? "⚠ Vượt ngưỡng" : "Bình thường"}`,
  );
  rows.push(
    `Liquidity Freeze,${p.freezeEvents},2,${p.freezeEvents >= 2 ? "⚠ Vượt ngưỡng" : "Bình thường"}`,
  );
  rows.push(
    `Limit Hit,${p.systemState === "Limit Hit" ? 1 : 0},1,${p.systemState === "Limit Hit" ? "⚠ Kích hoạt" : "Bình thường"}`,
  );
  rows.push("");
  rows.push("Hệ số Gini,Giá trị,Phân loại");
  rows.push(
    `Gini (${p.settlement} · Tick #${p.tick}),${p.gini.toFixed(4)},${giniCategory(p.gini)}`,
  );
  rows.push("");

  if (p.scenarioMetrics.length > 0) {
    rows.push("=== SO SÁNH KỊCH BẢN ===");

    if (p.scenarioMetrics.length === 1) {
      const m = p.scenarioMetrics[0];
      rows.push(`Chỉ số,${m.label}`);
      rows.push(`Giá trung bình,${m.avgPrice.toFixed(2)}`);
      rows.push(`Biến động (σ),${(m.volatility * 100).toFixed(4)}%`);
      rows.push(`Hệ số Gini,${m.gini.toFixed(3)}`);
      rows.push(`Tổng khối lượng,${m.totalVolume.toLocaleString()}`);
      rows.push(`Flash Crash,${m.crashEvents} lần`);
      rows.push(`Spread trung bình,${m.avgSpread.toFixed(3)} đ`);
      rows.push(`Liquidity Freeze,${m.liquidityFreezes} lần`);
    } else {
      const [a, b] = p.scenarioMetrics;
      rows.push(`Chỉ số,${a.label},${b.label},Δ (b−a),Đánh giá`);

      type CompareRow = {
        label: string;
        key: keyof ScenarioMetrics;
        fmt: (v: number) => string;
        higher: "good" | "bad" | "neutral";
      };

      const compareRows: CompareRow[] = [
        {
          label: "Giá trung bình",
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
          label: "Spread trung bình",
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

      compareRows.forEach(({ label, key, fmt, higher }) => {
        const va = a[key] as number;
        const vb = b[key] as number;
        const diff = vb - va;
        const assessment =
          diff === 0 || higher === "neutral"
            ? "—"
            : (higher === "good") === diff > 0
              ? "✓ Tốt hơn"
              : "✗ Xấu hơn";
        const diffStr =
          diff === 0 ? "—" : `${diff > 0 ? "▲" : "▼"} ${fmt(Math.abs(diff))}`;
        rows.push(`${label},${fmt(va)},${fmt(vb)},${diffStr},${assessment}`);
      });

      rows.push("");
      rows.push("Hệ số Gini theo kịch bản");
      rows.push("Kịch bản,Gini,Phân loại");
      p.scenarioMetrics.forEach((m) => {
        const cat =
          m.gini < 0.35
            ? "Công bằng"
            : m.gini < 0.55
              ? "Mất cân bằng"
              : "Bất bình đẳng cao";
        rows.push(`${m.label},${m.gini.toFixed(3)},${cat}`);
      });
    }
    rows.push("");
  }

  if (p.recentTrades?.length > 0) {
    rows.push("=== LỊCH SỬ LỆNH KHỚP GẦN NHẤT ===");
    rows.push("Mã CK,Giá khớp,Khối lượng,Bên mua,Bên bán");
    [...p.recentTrades].reverse().forEach((t) => {
      rows.push(
        `${t.symbol},${t.price.toFixed(2)},${t.qty},${t.buyerType},${t.sellerType}`,
      );
    });
  }

  return "﻿" + rows.join("\n");
}
