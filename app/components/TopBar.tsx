import Badge from "./Badge";
import { STATE_BADGE } from "../constants/ui";
import { NUM_AGENTS } from "../constants";
import type { SystemState, SettlementType, TimeScale } from "../types";

interface TopBarProps {
  systemState: SystemState;
  tick: number;
  settlement: SettlementType;
  driftPct: number;
  timeScale: TimeScale;
  maxTick: number;
  isRunning: boolean;
  onReset: () => void;
  onToggleRun: () => void;
}

export default function TopBar({
  systemState,
  tick,
  settlement,
  driftPct,
  timeScale,
  maxTick,
  isRunning,
  onReset,
  onToggleRun,
}: TopBarProps) {
  return (
    <div className="bg-slate-900 border-b border-gray-800 px-4 flex items-center h-12 gap-3 shrink-0">
      <div className="w-7 h-7 bg-blue-700 rounded flex items-center justify-center text-sm shrink-0">
        📊
      </div>
      <span className="font-bold text-slate-100 text-sm tracking-wide">
        PoliSim
      </span>
      <Badge variant="blue">ABM v2.5</Badge>
      <span className="text-gray-600 text-xs">
        Hệ thống Mô phỏng Vi cấu trúc Thị trường · {NUM_AGENTS} agents
      </span>
      <div className="flex-1" />
      <Badge variant={STATE_BADGE[systemState]}>{systemState}</Badge>
      <span className="text-xs text-gray-600">
        Tick #{tick}/{maxTick}
      </span>
      <span className="text-xs text-gray-600">|</span>
      <span className="text-xs text-gray-600">
        {settlement}
        {settlement !== "T+0" ? ` · ±${driftPct}%` : ""} · {timeScale}
      </span>
      <button
        onClick={onReset}
        className="bg-gray-900 border border-gray-800 text-gray-500 rounded px-2.5 py-1 cursor-pointer text-xs hover:text-gray-300 transition-colors"
      >
        ↺ Reset
      </button>
      <button
        onClick={onToggleRun}
        className={`rounded px-4 py-1 cursor-pointer text-xs font-bold border transition-colors ${
          isRunning
            ? "bg-slate-900 border-red-800 text-red-400 hover:bg-red-950"
            : "bg-slate-900 border-emerald-800 text-emerald-400 hover:bg-emerald-950"
        }`}
      >
        {isRunning ? "⏸ Dừng" : "▶ Chạy"}
      </button>
    </div>
  );
}
