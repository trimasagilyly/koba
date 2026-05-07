const toMult = (raw: number) => raw / 100;
const fromMult = (m: number) => Math.round(m * 100);

export default function BehaviorSlider({
  label,
  tooltip,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  tooltip: string;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  return (
    <div className="mb-2.5" title={tooltip}>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs text-slate-300 font-mono">
          {value.toFixed(1)}×
        </span>
      </div>
      <input
        type="range"
        min={50}
        max={200}
        step={10}
        value={fromMult(value)}
        onChange={(e) => onChange(toMult(Number(e.target.value)))}
        className="w-full cursor-pointer h-1"
        style={{ accentColor }}
      />
      <div className="flex justify-between text-xs text-gray-800 mt-0.5">
        <span>thụ động</span>
        <span>mặc định</span>
        <span>hung hăng</span>
      </div>
    </div>
  );
}
