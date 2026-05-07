export default function ValuationBadge({
  value,
  label,
}: {
  value: number | undefined;
  label: string;
}) {
  if (!value || value === 0) return null;
  return (
    <div className="bg-slate-950 border border-slate-900 rounded px-1.5 py-0.5 text-center">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-xs font-mono text-slate-300 font-bold">
        {value.toFixed(1)}x
      </div>
    </div>
  );
}
