import { GINI_ZONE_LOW, GINI_ZONE_MID } from "../../constants/simulation";

export default function GiniBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const isLow = value < GINI_ZONE_LOW;
  const isMid = value >= GINI_ZONE_LOW && value < GINI_ZONE_MID;

  const valueColor = isLow
    ? "text-emerald-400"
    : isMid
      ? "text-yellow-400"
      : "text-red-400";
  const barColor = isLow
    ? "bg-emerald-400"
    : isMid
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={`text-sm font-bold font-mono ${valueColor}`}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}
