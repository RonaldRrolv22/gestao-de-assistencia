/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface StatusProgressRowProps {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export default function StatusProgressRow({ label, value, percent, color }: StatusProgressRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium text-slate-700 truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 tabular-nums">
          <span className="font-bold text-slate-900">{value}</span>
          <span className="text-[10px] text-slate-400">{percent}%</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
