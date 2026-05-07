const AGENT_COLORS = {
  fundamentalist: "#3b82f6",
  momentum: "#f59e0b",
  hft: "#ef4444",
  noise: "#8b5cf6",
};

export default function AgentDonut({
  pcts,
}: {
  pcts: {
    fundamentalist: number;
    momentum: number;
    hft: number;
    noise: number;
  };
}) {
  // INTERN FIX: Đã xóa hoàn toàn logic cộng dồn số lượng của Whale và scale.
  // Bây giờ 4 phe sẽ tự động chia đều 100% theo data truyền vào.
  const data = [
    { label: "Giá trị", value: pcts.fundamentalist, color: AGENT_COLORS.fundamentalist },
    { label: "Theo đà", value: pcts.momentum, color: AGENT_COLORS.momentum },
    { label: "HFT", value: pcts.hft, color: AGENT_COLORS.hft },
    { label: "Ngẫu nhiên", value: pcts.noise, color: AGENT_COLORS.noise },
  ];

  const R = 36,
    CX = 50,
    CY = 50,
    strokeW = 13;
  let startAngle = -90;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const slice = { ...d, startAngle, endAngle: startAngle + angle };
    startAngle += angle;
    return slice;
  });
  const arc = (sa: number, ea: number) => {
    const r1 = (sa * Math.PI) / 180,
      r2 = (ea * Math.PI) / 180;
    const x1 = CX + R * Math.cos(r1),
      y1 = CY + R * Math.sin(r1);
    const x2 = CX + R * Math.cos(r2),
      y2 = CY + R * Math.sin(r2);
    return `M ${x1} ${y1} A ${R} ${R} 0 ${ea - sa > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 100 100" width={76} height={76} className="shrink-0">
        {slices.map((s, i) => (
          <path
            key={i}
            d={arc(s.startAngle, s.endAngle - 1)}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="flex-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 mb-1">
            <div
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-xs text-slate-500 flex-1">{d.label}</span>
            <span className="text-xs text-slate-300 font-mono">
              {Math.round(d.value)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}