/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";

interface KpiSparklineProps {
  data: number[];
  strokeColor?: string;
  fillColor?: string;
  className?: string;
  id?: string;
}

/** Sparkline SVG discreto para KPIs — escala automática dos dados. */
export default function KpiSparkline({
  data,
  strokeColor = "#E84E00",
  fillColor = "rgba(232,78,0,0.1)",
  className = "",
  id = "spark",
}: KpiSparklineProps) {
  const { linePath, areaPath } = useMemo(() => {
    const values = data.length > 0 ? data : [0];
    const max = Math.max(...values, 0.001);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const w = 72;
    const h = 32;
    const padX = 2;
    const padY = 3;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;

    const points = values.map((v, i) => {
      const x = padX + (i / Math.max(values.length - 1, 1)) * innerW;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${h - padY} L ${points[0].x.toFixed(1)} ${h - padY} Z`;

    return { linePath: line, areaPath: area };
  }, [data]);

  const gradId = `${id}-fill`;

  return (
    <svg
      viewBox="0 0 72 32"
      className={`w-[72px] h-8 shrink-0 opacity-80 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="1" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
