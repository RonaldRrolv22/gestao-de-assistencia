/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Activity } from "lucide-react";
import DashboardPanel from "./DashboardPanel";

interface EfficiencyPanelProps {
  recurrenceRate: string;
  mttrValue: string;
  onNavigateToKanban?: () => void;
}

export default function EfficiencyPanel({
  recurrenceRate,
  mttrValue,
  onNavigateToKanban,
}: EfficiencyPanelProps) {
  return (
    <DashboardPanel title="Eficiência operacional" subtitle="Desempenho e qualidade">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-red-50/70 border border-red-100/90 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-red-700/80 uppercase tracking-wide">
            Taxa de recorrência
          </p>
          <p className="text-lg font-bold text-red-700 mt-0.5 tabular-nums">{recurrenceRate}</p>
        </div>
        <div className="rounded-lg bg-orange-50/80 border border-orange-100/90 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-brand-orange/90 uppercase tracking-wide">MTTR</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5 tabular-nums">{mttrValue}</p>
        </div>
      </div>

      {onNavigateToKanban && (
        <button
          type="button"
          onClick={onNavigateToKanban}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-brand-orange py-2 rounded-lg border border-slate-200 hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
        >
          <Activity className="h-3.5 w-3.5" />
          Ver painel operacional
        </button>
      )}
    </DashboardPanel>
  );
}
