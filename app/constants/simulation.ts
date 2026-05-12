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

export const T0_VOLUME_SCALE = 3;
