/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import DashboardPanel, { DashboardChip } from "./DashboardPanel";

export interface MonthlyDataPoint {
  monthName: string;
  count: number;
  index: number;
  year: number;
}

interface OperationalLineChartProps {
  monthlyData: MonthlyDataPoint[];
  pathD: string;
  areaD: string;
}

export default function OperationalLineChart({
  monthlyData,
  pathD,
  areaD,
}: OperationalLineChartProps) {
  const maxVal = Math.max(...monthlyData.map((d) => d.count), 5);
  const isEmpty = monthlyData.every((d) => d.count === 0);
  const total = monthlyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <DashboardPanel
      title="Visão Geral Operacional"
      subtitle="Evolução mensal de atendimentos finalizados"
      action={<DashboardChip tone="brand">{total} finalizações</DashboardChip>}
    >
      <div className="relative w-full">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none min-h-[180px]">
            <p className="text-xs text-slate-500 bg-white/90 px-4 py-2 rounded-lg border border-slate-200">
              Sem finalizações no período — altere o filtro acima
            </p>
          </div>
        )}
        <div className="w-full h-[180px] sm:h-[200px]">
          <svg
            viewBox="0 0 500 160"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
            role="img"
            aria-label="Gráfico de finalizações mensais"
          >
            <defs>
              <linearGradient id="areaGradientLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E84E00" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#E84E00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="20" y1="25" x2="480" y2="25" className="chart-grid-line" />
            <line x1="20" y1="58" x2="480" y2="58" className="chart-grid-line" />
            <line x1="20" y1="91" x2="480" y2="91" className="chart-grid-line" />
            <line x1="20" y1="124" x2="480" y2="124" stroke="#e2e8f0" strokeWidth="1" />
            <path d={areaD} fill="url(#areaGradientLine)" />
            <path
              d={pathD}
              fill="none"
              stroke="#E84E00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line-draw"
            />
            {monthlyData.map((d, i) => {
              const x = 40 + i * 84;
              const y = 124 - (d.count / maxVal) * 99;
              return (
                <g key={`${d.monthName}-${d.year}`}>
                  <circle cx={x} cy={y} r="4.5" fill="#E84E00" stroke="#ffffff" strokeWidth="2">
                    <title>{`${d.monthName}: ${d.count} finalização(ões)`}</title>
                  </circle>
                  {d.count > 0 && (
                    <text x={x} y={y - 10} fill="#C43D00" fontSize="10" fontWeight="600" textAnchor="middle">
                      {d.count}
                    </text>
                  )}
                </g>
              );
            })}
            {monthlyData.map((d, i) => {
              const x = 40 + i * 84;
              return (
                <text
                  key={`label-${d.monthName}-${i}`}
                  x={x}
                  y="148"
                  fill="#64748b"
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {d.monthName.toUpperCase()}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
        <span>Últimos 6 meses</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-orange" />
          Finalizações
        </span>
      </div>
    </DashboardPanel>
  );
}
