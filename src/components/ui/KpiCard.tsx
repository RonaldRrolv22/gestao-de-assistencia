/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { text: string; positive?: boolean };
  sparkline?: React.ReactNode;
  elevated?: boolean;
  compact?: boolean;
  className?: string;
}

export default function KpiCard({
  label,
  value,
  icon,
  trend,
  sparkline,
  elevated = false,
  compact = false,
  className = "",
}: KpiCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl relative shadow-card flex flex-col justify-between ${
        compact ? "min-h-[80px] p-3 sm:p-4" : "min-h-[130px] p-5 sm:p-6"
      } ${elevated ? "report-kpi-card" : ""} ${className}`}
    >
      <div className={compact ? "pr-10" : "pr-12"}>
        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
          {label}
        </span>
        <h3
          className={`font-bold text-heading truncate tracking-tight leading-none ${
            compact ? "text-xl mt-1" : "text-2xl sm:text-[1.75rem] mt-2"
          }`}
        >
          {value}
        </h3>
        {trend && (
          <p
            className={`font-medium flex items-center gap-1 ${
              compact ? "text-[10px] mt-1" : "text-[11px] mt-2"
            } ${
              trend.positive === true
                ? "text-success"
                : trend.positive === false
                  ? "text-danger"
                  : "text-text-secondary"
            }`}
          >
            <span
              className={`w-1 h-1 rounded-full shrink-0 ${
                trend.positive === true
                  ? "bg-success"
                  : trend.positive === false
                    ? "bg-danger"
                    : "bg-text-secondary/40"
              }`}
            />
            {trend.text}
          </p>
        )}
      </div>
      {sparkline && (
        <div className={`absolute opacity-60 ${compact ? "bottom-3 right-12" : "bottom-4 right-16"}`}>
          {sparkline}
        </div>
      )}
      <div
        className={`absolute icon-badge-gradient shrink-0 rounded-xl shadow-glow-orange ${
          compact ? "top-3 right-3 w-8 h-8 [&_svg]:h-3.5 [&_svg]:w-3.5" : "top-5 right-5 w-11 h-11"
        }`}
      >
        {icon}
      </div>
    </div>
  );
}
