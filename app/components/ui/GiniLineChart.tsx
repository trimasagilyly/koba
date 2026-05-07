import { useRef, useEffect, useState } from "react";
import type { GiniPoint } from "../../types";
import { GINI_ZONE_LOW, GINI_ZONE_MID } from "../../constants/simulation";

export interface GiniLineSeries {
  label: string;
  color: string;
  points: GiniPoint[];
}

interface GiniLineChartProps {
  series: GiniLineSeries[];
  height?: number;
  maxTick?: number;
}

const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 8;
const PAD_B = 36;

function GiniLineChart({ series, height = 160, maxTick }: GiniLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(800); // wide default

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setW(entry.contentRect.width || 800);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = height;
  const cW = W - PAD_L - PAD_R;
  const cH = H - PAD_T - PAD_B;

  const allTicks = series.flatMap((s) => s.points.map((p) => p.tick));
  const domainMax =
    maxTick ?? (allTicks.length > 0 ? Math.max(...allTicks) : 300);
  const domainMin = 0;

  const xScale = (tick: number) =>
    PAD_L + ((tick - domainMin) / Math.max(1, domainMax - domainMin)) * cW;
  const yScale = (gini: number) =>
    PAD_T + (1 - Math.min(1, Math.max(0, gini))) * cH;

  const yTop = yScale(1.0);
  const yMid = yScale(GINI_ZONE_MID);
  const yLow = yScale(GINI_ZONE_LOW);
  const yBottom = yScale(0);

  const toPolyline = (points: GiniPoint[]) => {
    if (points.length < 2) return "";
    return points
      .map((p) => `${xScale(p.tick).toFixed(1)},${yScale(p.gini).toFixed(1)}`)
      .join(" ");
  };

  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) =>
    Math.round(domainMin + f * (domainMax - domainMin)),
  );

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        style={{ display: "block", overflow: "visible" }}
        // NO preserveAspectRatio="none" — let it scale naturally
      >
        {/* Zone bands */}
        <rect
          x={PAD_L}
          y={yTop}
          width={cW}
          height={yMid - yTop}
          fill="#ef4444"
          opacity="0.07"
        />
        <rect
          x={PAD_L}
          y={yMid}
          width={cW}
          height={yLow - yMid}
          fill="#f59e0b"
          opacity="0.07"
        />
        <rect
          x={PAD_L}
          y={yLow}
          width={cW}
          height={yBottom - yLow}
          fill="#10b981"
          opacity="0.07"
        />

        {/* Threshold lines */}
        <line
          x1={PAD_L}
          x2={PAD_L + cW}
          y1={yLow}
          y2={yLow}
          stroke="#10b981"
          strokeWidth="0.6"
          strokeDasharray="4,3"
          opacity="0.5"
        />
        <line
          x1={PAD_L}
          x2={PAD_L + cW}
          y1={yMid}
          y2={yMid}
          stroke="#f59e0b"
          strokeWidth="0.6"
          strokeDasharray="4,3"
          opacity="0.5"
        />

        {/* Zone labels */}
        <text
          x={PAD_L + cW + 3}
          y={yLow - 2}
          fontSize="7"
          fill="#10b981"
          opacity="0.8"
        >
          0.35
        </text>
        <text
          x={PAD_L + cW + 3}
          y={yMid - 2}
          fontSize="7"
          fill="#f59e0b"
          opacity="0.8"
        >
          0.55
        </text>

        {/* Y-axis grid + labels */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              x2={PAD_L + cW}
              y1={yScale(g)}
              y2={yScale(g)}
              stroke="#1e293b"
              strokeWidth="0.5"
            />
            <text
              x={PAD_L - 4}
              y={yScale(g) + 3}
              textAnchor="end"
              fontSize="7"
              fill="#4b5563"
            >
              {g.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Axes */}
        <line
          x1={PAD_L}
          x2={PAD_L}
          y1={PAD_T}
          y2={PAD_T + cH}
          stroke="#374151"
          strokeWidth="0.8"
        />
        <line
          x1={PAD_L}
          x2={PAD_L + cW}
          y1={PAD_T + cH}
          y2={PAD_T + cH}
          stroke="#374151"
          strokeWidth="0.8"
        />

        {/* X-axis labels */}
        {xTicks.map((t) => (
          <text
            key={t}
            x={xScale(t)}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fontSize="7"
            fill="#4b5563"
          >
            {t}
          </text>
        ))}
        <text
          x={PAD_L + cW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize="7"
          fill="#374151"
        >
          tick
        </text>

        {/* Data lines */}
        {series.map((s) => {
          const pts = toPolyline(s.points);
          if (!pts) return null;
          return (
            <polyline
              key={s.label}
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.95"
            />
          );
        })}

        {/* Last-value dots */}
        {series.map((s) => {
          if (!s.points.length) return null;
          const last = s.points[s.points.length - 1];
          return (
            <circle
              key={`dot-${s.label}`}
              cx={xScale(last.tick)}
              cy={yScale(last.gini)}
              r="2.5"
              fill={s.color}
            />
          );
        })}

        {/* Legend */}
        {series.map((s, i) => {
          const legendX =
            PAD_L + i * Math.min(120, cW / Math.max(1, series.length));
          const legendY = H - PAD_B + 22;
          return (
            <g key={`legend-${s.label}`}>
              <line
                x1={legendX}
                x2={legendX + 12}
                y1={legendY}
                y2={legendY}
                stroke={s.color}
                strokeWidth="1.8"
              />
              <text
                x={legendX + 15}
                y={legendY + 3}
                fontSize="7"
                fill="#9ca3af"
              >
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default GiniLineChart;
