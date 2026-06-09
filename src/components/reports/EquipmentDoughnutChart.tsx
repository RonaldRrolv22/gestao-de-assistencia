/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Inbox } from "lucide-react";
import DashboardPanel, { DashboardChip } from "./DashboardPanel";

export interface DoughnutSegment {
  name: string;
  count: number;
  percent: string;
  color: string;
  strokeDash: string;
  strokeOffset: number;
}

interface EquipmentDoughnutChartProps {
  segments: DoughnutSegment[];
  totalRepairs: number;
  totalRequests: number;
}

export default function EquipmentDoughnutChart({
  segments,
  totalRepairs,
  totalRequests,
}: EquipmentDoughnutChartProps) {
  const isEmpty = segments.length === 0;

  if (isEmpty) {
    return (
      <DashboardPanel
        title="Equipamentos recorrentes"
        subtitle="Distribuição por tipo de equipamento"
        action={<DashboardChip tone="neutral">{totalRequests} O.S.</DashboardChip>}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Inbox className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-700">Sem dados de equipamentos</p>
          <p className="text-xs text-slate-500 mt-1">Os dados aparecerão conforme ordens forem registradas.</p>
        </div>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel
      title="Equipamentos recorrentes"
      subtitle="Distribuição por tipo de equipamento"
      action={<DashboardChip tone="neutral">{totalRequests} O.S.</DashboardChip>}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="relative w-[120px] h-[120px] shrink-0">
          <svg
            viewBox="0 0 180 180"
            className="w-full h-full transform -rotate-90"
            aria-hidden
          >
            <circle cx="90" cy="90" r="50" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
            {segments.map((segment, idx) => (
              <circle
                key={segment.name}
                cx="90"
                cy="90"
                r="50"
                fill="transparent"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={segment.strokeDash}
                strokeDashoffset={segment.strokeOffset}
                strokeLinecap="butt"
                className="transition-all duration-700 ease-out"
                style={{ transitionDelay: `${idx * 60}ms` }}
              >
                <title>{`${segment.name}: ${segment.count} (${segment.percent}%)`}</title>
              </circle>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{totalRepairs}</span>
            <span className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider">Reparos</span>
          </div>
        </div>

        <div className="flex-1 w-full min-w-0 space-y-1.5">
          {segments.map((segment) => (
            <div key={segment.name} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="flex-1 min-w-0 truncate text-slate-700 font-medium" title={segment.name}>
                {segment.name}
              </span>
              <span className="shrink-0 font-bold text-slate-900 tabular-nums">{segment.count}x</span>
              <span className="shrink-0 text-[10px] text-slate-400 tabular-nums w-8 text-right">
                {segment.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardPanel>
  );
}
