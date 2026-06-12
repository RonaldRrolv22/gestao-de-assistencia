/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import DashboardPanel, { DashboardChip } from "./DashboardPanel";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export interface ServiceAverageItem {
  description: string;
  avgHours: number;
  count: number;
}

interface ServiceTimeBarsChartProps {
  data: ServiceAverageItem[];
  formatHours: (decimalHours: number) => string;
}

export default function ServiceTimeBarsChart({ data, formatHours }: ServiceTimeBarsChartProps) {
  const reducedMotion = useReducedMotion();
  const [animate, setAnimate] = useState(reducedMotion);
  const maxAvg = Math.max(...data.map((s) => s.avgHours), 1);

  useEffect(() => {
    if (reducedMotion) {
      setAnimate(true);
      return;
    }
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, [data, reducedMotion]);

  return (
    <DashboardPanel
      title="Tempo por tipo de serviço"
      subtitle="Média de horas até conclusão"
      action={<DashboardChip tone="brand">Média em horas</DashboardChip>}
    >
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            Sem serviços finalizados no período selecionado.
          </p>
        ) : (
          data.map((srv, idx) => {
          const widthPercent = (srv.avgHours / maxAvg) * 100;
          return (
            <div key={`${srv.description}-${idx}`} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={srv.description}>
                    {srv.description}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {srv.count} atendimento{srv.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-brand-orange shrink-0 tabular-nums">
                  {formatHours(srv.avgHours)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full chart-bar-grow"
                  style={{
                    width: animate ? `${widthPercent}%` : "0%",
                    backgroundImage: "linear-gradient(90deg, #FFAB66, #E84E00)",
                    transitionDelay: reducedMotion ? "0ms" : `${idx * 50}ms`,
                  }}
                />
              </div>
            </div>
          );
        })
        )}
      </div>
    </DashboardPanel>
  );
}
