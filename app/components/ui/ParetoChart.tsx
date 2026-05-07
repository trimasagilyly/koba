const W = 300;
const H = 210;
const PAD = { t: 14, r: 38, b: 34, l: 32 };
const cW = W - PAD.l - PAD.r;
const cH = H - PAD.t - PAD.b;
const N = 10;

function interp(curve: { x: number; y: number }[], x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return curve[curve.length - 1].y;
  const i = curve.findIndex((p) => p.x >= x);
  if (i <= 0) return curve[0]?.y ?? 0;
  const p0 = curve[i - 1],
    p1 = curve[i];
  const t = (x - p0.x) / (p1.x - p0.x || 1);
  return p0.y + t * (p1.y - p0.y);
}

export default function ParetoChart({
  curve,
  gini,
}: {
  curve: { x: number; y: number }[];
  gini: number;
}) {
  if (curve.length < 2) {
    return (
      <div className="h-[140px] flex items-center justify-center text-xs text-gray-700">
        Đang chờ dữ liệu… (cần ít nhất 10 ticks)
      </div>
    );
  }

  const bars = Array.from({ length: N }, (_, k) => {
    const hi = 1 - k / N;
    const lo = 1 - (k + 1) / N;
    return (interp(curve, hi) - interp(curve, lo)) * 100;
  });

  let acc = 0;
  const cumLine = bars.map((b) => {
    acc += b;
    return acc;
  });

  const barW = cW / N;
  const toBarH = (v: number) => (v / 100) * cH;
  const toY = (pct: number) => PAD.t + (1 - pct / 100) * cH;
  const dotX = (k: number) => PAD.l + (k + 0.5) * barW;

  const linePoints = cumLine
    .map((v, k) => `${dotX(k).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(" ");
  const pareto80 = cumLine.findIndex((v) => v >= 80);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-4/5 mx-auto">
      <rect x={PAD.l} y={PAD.t} width={cW} height={cH} fill="#070d17" rx="2" />

      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.l}
            x2={PAD.l + cW}
            y1={toY(v)}
            y2={toY(v)}
            stroke="#1e293b"
            strokeWidth="0.5"
            strokeDasharray="3,3"
          />
          <text
            x={PAD.l - 3}
            y={toY(v) + 2.5}
            fontSize="4.5"
            fill="#374151"
            textAnchor="end"
            fontFamily="monospace"
          >
            {v}%
          </text>
          <text
            x={PAD.l + cW + 3}
            y={toY(v) + 2.5}
            fontSize="4.5"
            fill="#06b6d4"
            textAnchor="start"
            fontFamily="monospace"
          >
            {v}%
          </text>
        </g>
      ))}

      <line
        x1={PAD.l}
        x2={PAD.l + cW}
        y1={toY(80)}
        y2={toY(80)}
        stroke="#ef4444"
        strokeWidth="0.8"
        strokeDasharray="4,2"
        opacity="0.5"
      />

      {bars.map((d, k) => {
        const bH = toBarH(d);
        const color = k < 2 ? "#ef4444" : k < 5 ? "#f59e0b" : "#3b82f6";
        return (
          <rect
            key={k}
            x={PAD.l + k * barW + 1.5}
            y={PAD.t + cH - bH}
            width={barW - 3}
            height={bH}
            fill={color}
            opacity="0.72"
            rx="1"
          />
        );
      })}

      <polyline
        points={linePoints}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {cumLine.map((v, k) => (
        <circle key={k} cx={dotX(k)} cy={toY(v)} r="1.8" fill="#06b6d4" />
      ))}

      {pareto80 >= 0 && (
        <>
          <line
            x1={dotX(pareto80)}
            x2={dotX(pareto80)}
            y1={PAD.t}
            y2={PAD.t + cH}
            stroke="#ef4444"
            strokeWidth="0.8"
            strokeDasharray="4,2"
            opacity="0.6"
          />
          <text
            x={dotX(pareto80) + 2}
            y={PAD.t + 7}
            fontSize="4.5"
            fill="#ef4444"
            fontFamily="monospace"
          >
            {(pareto80 + 1) * 10}%→80%
          </text>
        </>
      )}

      <line
        x1={PAD.l}
        x2={PAD.l + cW}
        y1={PAD.t + cH}
        y2={PAD.t + cH}
        stroke="#374151"
        strokeWidth="0.8"
      />
      <line
        x1={PAD.l}
        x2={PAD.l}
        y1={PAD.t}
        y2={PAD.t + cH}
        stroke="#374151"
        strokeWidth="0.8"
      />

      {bars.map((_, k) => (
        <text
          key={k}
          x={PAD.l + (k + 0.5) * barW}
          y={H - PAD.b + 8}
          fontSize="4"
          fill="#374151"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {(k + 1) * 10}%
        </text>
      ))}

      <rect
        x={PAD.l + cW - 46}
        y={PAD.t + 2}
        width={44}
        height={10}
        rx="2"
        fill="#0f172a"
        opacity="0.85"
      />
      <text
        x={PAD.l + cW - 43}
        y={PAD.t + 8}
        fontSize="5"
        fill="#94a3b8"
        fontFamily="monospace"
      >
        Gini =
      </text>
      <text
        x={PAD.l + cW - 20}
        y={PAD.t + 8}
        fontSize="5"
        fontFamily="monospace"
        fontWeight="bold"
        fill={gini > 0.55 ? "#ef4444" : gini > 0.35 ? "#f59e0b" : "#10b981"}
      >
        {gini.toFixed(3)}
      </text>

      <rect
        x={PAD.l + 2}
        y={PAD.t + 2}
        width={4}
        height={4}
        fill="#ef4444"
        rx="1"
        opacity="0.8"
      />
      <text
        x={PAD.l + 8}
        y={PAD.t + 6}
        fontSize="4.5"
        fill="#ef4444"
        fontFamily="monospace"
      >
        Top 20%
      </text>
      <circle cx={PAD.l + 44} cy={PAD.t + 4} r="1.5" fill="#06b6d4" />
      <text
        x={PAD.l + 47}
        y={PAD.t + 6}
        fontSize="4.5"
        fill="#06b6d4"
        fontFamily="monospace"
      >
        % tích lũy
      </text>

      <text
        x={PAD.l + cW / 2}
        y={H - 3}
        fontSize="5"
        fill="#4b5563"
        textAnchor="middle"
        fontFamily="monospace"
      >
        Nhóm agent (giàu → nghèo, 10%/cột)
      </text>
      <text
        x={8}
        y={PAD.t + cH / 2}
        fontSize="5"
        fill="#4b5563"
        textAnchor="middle"
        fontFamily="monospace"
        transform={`rotate(-90, 8, ${PAD.t + cH / 2})`}
      >
        % tài sản
      </text>
    </svg>
  );
}
