import type { TimeScale, AgentBehaviorParams } from "../types";
import { BASE_POINT } from "../utils/stockData";

export const NUM_AGENTS = 1000;
export const INITIAL_PRICE = BASE_POINT;

export const TICK_LIMITS: Record<TimeScale, number> = {
  "1H": 50,
  "1D": 300,
  "1W": 2000,
  "1M": 8000,
};

export const DEFAULT_BEHAVIOR_PARAMS: AgentBehaviorParams = {
  fundGapMult: 1.0,
  momSensitMult: 1.0,
  hftSpreadMult: 1.0,
  noiseRateMult: 1.0,
};

export const GINI_ZONE_LOW = 0.35;
export const GINI_ZONE_MID = 0.55;

// Không dùng multiplier nhân tạo: volume difference giữa T+0 và T+2.5
// phải phát sinh tự nhiên từ việc vốn T+0 được giải phóng ngay lập tức
export const T0_VOLUME_SCALE = 1;

// Số tick đại diện cho 1 ngày giao dịch trong từng time scale.
// Dùng để tính settlement delay cho T+2.5 một cách có ý nghĩa thực tế:
//   1W: 2000 tick / 5 ngày = 400 tick/ngày
//   1M: 8000 tick / 22 ngày ≈ 364 tick/ngày
//   1D: 300 tick / ~5 phiên sáng-chiều = 60 tick/phiên
//   1H: 50 tick / 5 khung giờ = 10 tick/khung
export const TICKS_PER_SIM_DAY: Record<string, number> = {
  "1H": 10,
  "1D": 60,
  "1W": 400,
  "1M": 364,
};
