import type { BadgeVariant } from "../components/ui/Badge";
import type {
  AgentType,
  SystemState,
  ActiveTab,
  ActiveAgentType,
} from "../types";

export const STATE_BADGE: Record<SystemState, BadgeVariant> = {
  Normal: "green",
  Volatile: "yellow",
  "Limit Hit": "red",
  Freeze: "purple",
};

export const AGENT_COLORS: Record<string, string> = {
  fundamentalist: "#3b82f6",
  momentum: "#f59e0b",
  hft: "#ef4444",
  noise: "#8b5cf6",
};

export const AGENT_NAMES: Record<string, string> = {
  fundamentalist: "Nhà đầu tư Giá trị",
  momentum: "Nhà đầu tư Theo đà",
  hft: "HFT Market Maker",
  noise: "Noise Trader",
};

export const AGENT_DESCS: Record<string, string> = {
  fundamentalist:
    "Dựa trên giá trị nội tại (fundamental value). Mua khi thị trường rẻ hơn giá trị thật, bán khi đắt hơn. Đại diện quỹ đầu tư dài hạn.",
  momentum:
    "Giao dịch theo xu hướng giá. Mua khi giá tăng liên tiếp (FOMO), panic sell khi giảm mạnh. Khuếch đại biến động.",
  hft: "Market maker kiểu Avellaneda–Stoikov. Đặt lệnh 2 chiều quanh reservation price, điều chỉnh spread theo inventory và volatility.",
  noise:
    "Giao dịch ngẫu nhiên không có thông tin. Tạo thanh khoản nền, giảm adverse selection. Không có chiến lược cụ thể.",
};

export const TRADE_SHORT: Record<string, string> = {
  fundamentalist: "Giá trị",
  momentum: "Momentum",
  hft: "HFT",
  noise: "Noise",
};

export const TABS: { id: ActiveTab; label: string }[] = [
  { id: "live", label: "📈 Live Market" },
  { id: "compare", label: "⚖️ So sánh Kịch bản" },
  { id: "agents", label: "👥 Agent Analysis" },
  { id: "risk", label: "⚠️ Rủi ro & Gini" },
];

export const AGENT_TYPES: ActiveAgentType[] = [
  "fundamentalist",
  "momentum",
  "hft",
  "noise",
];

export const SCENARIO_COLORS: string[] = [
  "#06b6d4",
  "#f59e0b",
  "#3b82f6",
  "#a78bfa",
];

export const SCENARIO_GUIDE = [
  {
    id: "S1",
    label: "T+2.5 · Cân bằng",
    color: "#06b6d4",
    desc: "30% Fund, 30% Mom, 10% HFT, 30% Noise · Biên độ 7%",
    eval: "Tốt",
    evalCls: "text-emerald-400",
  },
  {
    id: "S2",
    label: "T+0 · Cân bằng",
    color: "#f59e0b",
    desc: "Cùng thành phần Agent như S1, chuyển sang T+0",
    eval: "Trung bình",
    evalCls: "text-yellow-400",
  },
  {
    id: "S3",
    label: "T+2.5 · HFT Cao",
    color: "#3b82f6",
    desc: "15% Fund, 20% Mom, 40% HFT, 25% Noise · Biên độ 7%",
    eval: "Trung bình",
    evalCls: "text-yellow-400",
  },
  {
    id: "S4",
    label: "T+0 · HFT Cao",
    color: "#a78bfa",
    desc: "15% Fund, 20% Mom, 40% HFT, 25% Noise · T+0",
    eval: "Xấu",
    evalCls: "text-red-400",
  },
];

export const GINI_LEGEND: [string, string, string][] = [
  ["Gini < 0.35", "Thị trường công bằng", "text-emerald-400"],
  ["Gini 0.35–0.55", "Bắt đầu mất cân bằng", "text-yellow-400"],
  ["Gini > 0.55", "HFT chiếm lợi thế lớn", "text-red-400"],
  ["Gini → 0.65+ (T+0)", "Tài sản tập trung cá mập", "text-red-400"],
];
