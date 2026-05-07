export default function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  accentColor = "#3b82f6",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  accentColor?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs text-slate-300 font-mono">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer h-1"
        style={{ accentColor }}
      />
    </div>
  );
}
