import type { BadgeVariant } from "../components/Badge";
import type { AgentType, SystemState, ActiveTab } from "../types";

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