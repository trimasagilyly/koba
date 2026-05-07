import SliderRow from "../ui/SliderRow";
import AgentDonut from "../ui/AgentDonut";
import BehaviorSlider from "../ui/BehaviorSlider";
import type {
  SettlementType,
  ScenarioMetrics,
  TimeScale,
  AgentBehaviorParams,
} from "../../types";

interface LeftPanelProps {
  settlement: SettlementType;
  onSettlementChange: (s: SettlementType) => void;
  driftPct: number;
  onDriftChange: (v: number) => void;
  timeScale: TimeScale;
  onTimeScaleChange: (t: TimeScale) => void;
  pctFund: number;
  onPctFundChange: (v: number) => void;
  pctMom: number;
  onPctMomChange: (v: number) => void;
  pctHft: number;
  onPctHftChange: (v: number) => void;
  pctNoise: number;
  onPctNoiseChange: (v: number) => void;
  behaviorParams: AgentBehaviorParams;
  onBehaviorParamsChange: (p: AgentBehaviorParams) => void;
  scenarioMetrics: ScenarioMetrics[];
  onSaveScenario: () => void;
}

const clamp = (v: number) =>
  Math.min(100, Math.max(0, Math.round(isNaN(v) ? 0 : v)));

export default function LeftPanel({
  settlement,
  onSettlementChange,
  driftPct,
  onDriftChange,
  timeScale,
  onTimeScaleChange,
  pctFund,
  onPctFundChange,
  pctMom,
  onPctMomChange,
  pctHft,
  onPctHftChange,
  pctNoise,
  onPctNoiseChange,
  behaviorParams,
  onBehaviorParamsChange,
  scenarioMetrics,
  onSaveScenario,
}: LeftPanelProps) {
  const fund = clamp(pctFund);
  const mom = clamp(pctMom);
  const hft = clamp(pctHft);
  const noise = clamp(pctNoise);

  const handleFundChange = (raw: number) => {
    const v = clamp(raw);
    onPctFundChange(v);
    if (v === 100) {
      onPctMomChange(0);
      onPctHftChange(0);
      onPctNoiseChange(0);
      return;
    }
    if (v + mom > 100) {
      onPctMomChange(100 - v);
      onPctHftChange(0);
      onPctNoiseChange(0);
    } else if (v + mom + hft > 100) {
      onPctHftChange(100 - v - mom);
      onPctNoiseChange(0);
    } else {
      onPctNoiseChange(100 - v - mom - hft);
    }
  };

  const handleMomChange = (raw: number) => {
    const v = clamp(raw);
    if (fund + v > 100) {
      onPctMomChange(100 - fund);
      onPctHftChange(0);
      onPctNoiseChange(0);
    } else if (fund + v + hft > 100) {
      onPctMomChange(v);
      onPctHftChange(100 - fund - v);
      onPctNoiseChange(0);
    } else {
      onPctMomChange(v);
      onPctNoiseChange(100 - fund - v - hft);
    }
  };

  const handleHftChange = (raw: number) => {
    const v = clamp(raw);
    if (fund + mom + v > 100) {
      onPctHftChange(100 - fund - mom);
      onPctNoiseChange(0);
    } else {
      onPctHftChange(v);
      onPctNoiseChange(100 - fund - mom - v);
    }
  };

  const setBp = (key: keyof AgentBehaviorParams, val: number) => {
    onBehaviorParamsChange({ ...behaviorParams, [key]: val });
  };

  return (
    <div className="w-56 bg-slate-900 border-r border-slate-900 px-3.5 py-3.5 overflow-y-auto shrink-0 flex flex-col">
      <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">
        ⚙ Tham số
      </div>

      <div className="mb-3.5">
        <div className="text-xs text-gray-600 mb-1.5">Chu kỳ thanh toán</div>
        <div className="grid grid-cols-2 gap-1">
          {(["T+0", "T+1", "T+2.5", "T+3"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSettlementChange(s)}
              className={`rounded px-1 py-1.5 cursor-pointer text-xs border transition-colors ${
                settlement === s
                  ? "bg-blue-950 border-blue-600 text-blue-300 font-bold"
                  : "bg-slate-950 border-slate-800 text-gray-600 hover:text-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Time scale selector */}
      <div className="mb-3.5">
        <div className="text-xs text-gray-600 mb-1.5">Thời lượng chạy</div>
        <div className="grid grid-cols-4 gap-1">
          {(["1H", "1D", "1W", "1M"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onTimeScaleChange(t)}
              className={`rounded px-1 py-1.5 cursor-pointer text-xs border transition-colors ${
                timeScale === t
                  ? "bg-cyan-950 border-cyan-600 text-cyan-300 font-bold"
                  : "bg-slate-950 border-slate-800 text-gray-600 hover:text-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {settlement !== "T+0" && (
        <SliderRow
          label={`Biên độ giá ±${driftPct}%`}
          value={driftPct}
          min={1}
          max={20}
          onChange={onDriftChange}
          accentColor="#06b6d4"
        />
      )}

      <div className="border-t border-slate-900 pt-3 mb-2">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">
          👥 Tỷ lệ Agent
        </div>
      </div>

      <SliderRow
        label="Giá trị (Fundamentalist)"
        value={fund}
        min={0}
        max={100}
        onChange={handleFundChange}
        accentColor="#3b82f6"
      />
      <SliderRow
        label="Theo đà (Momentum)"
        value={mom}
        min={0}
        max={100}
        onChange={handleMomChange}
        accentColor="#f59e0b"
      />
      <SliderRow
        label="Cá mập HFT"
        value={hft}
        min={0}
        max={100}
        onChange={handleHftChange}
        accentColor="#ef4444"
      />
      <SliderRow
        label="Ngẫu nhiên (Noise)"
        value={noise}
        min={0}
        max={100}
        onChange={() => {}}
        accentColor="#8b5cf6"
      />

      <AgentDonut
        pcts={{
          fundamentalist: fund,
          momentum: mom,
          hft: hft,
          noise: noise,
        }}
      />

      {/* ── Agent behaviour amplitude sliders ── */}
      <div className="border-t border-slate-900 pt-3 mt-1 mb-2">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">
          🎚 Biên độ Hành vi
        </div>
        <div className="text-xs text-gray-700 mb-2 leading-snug">
          Thay đổi mức độ hung hăng của từng chiến lược. Ảnh hưởng trực tiếp đến
          đường GINI.
        </div>
      </div>

      <BehaviorSlider
        label="Fund · Gap threshold"
        tooltip="Nhỏ hơn = Fund giao dịch khi chênh lệch nhỏ hơn (hung hăng hơn)"
        value={behaviorParams.fundGapMult}
        onChange={(v) => setBp("fundGapMult", v)}
        accentColor="#3b82f6"
      />
      <BehaviorSlider
        label="Mom · Sensitivity"
        tooltip="Nhỏ hơn = Mom bắt tín hiệu yếu hơn (trade nhiều hơn)"
        value={behaviorParams.momSensitMult}
        onChange={(v) => setBp("momSensitMult", v)}
        accentColor="#f59e0b"
      />
      <BehaviorSlider
        label="HFT · Spread width"
        tooltip="Nhỏ hơn = HFT đặt spread hẹp hơn (cung cấp nhiều thanh khoản hơn)"
        value={behaviorParams.hftSpreadMult}
        onChange={(v) => setBp("hftSpreadMult", v)}
        accentColor="#ef4444"
      />
      <BehaviorSlider
        label="Noise · Activity"
        tooltip="Lớn hơn = Noise trader giao dịch thường xuyên hơn"
        value={behaviorParams.noiseRateMult}
        onChange={(v) => setBp("noiseRateMult", v)}
        accentColor="#8b5cf6"
      />

      {/* ── Scenario snapshot ── */}
      <div className="mt-1 border-t border-slate-900 pt-3">
        <div className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
          📸 Snapshot Kịch bản
        </div>
        <button
          onClick={onSaveScenario}
          className="w-full bg-slate-950 border border-slate-800 text-cyan-400 rounded px-0 py-1.5 cursor-pointer text-xs font-semibold hover:bg-cyan-950 transition-colors"
        >
          Lưu → {settlement}
        </button>
        {scenarioMetrics.length > 0 && (
          <div className="mt-1.5 text-xs text-gray-600">
            Đã lưu ({scenarioMetrics.length}/4):{" "}
            {scenarioMetrics.map((m) => m.label).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
