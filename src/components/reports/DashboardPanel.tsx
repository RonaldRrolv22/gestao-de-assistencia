/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface DashboardPanelProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Badge padrão dos painéis — paleta quente + neutros. */
export function DashboardChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "warm" | "alert";
}) {
  const tones = {
    neutral: "bg-slate-50 text-slate-600 border-slate-200",
    brand: "bg-orange-50 text-brand-orange border-orange-200/70",
    warm: "bg-amber-50 text-amber-800 border-amber-200/70",
    alert: "bg-red-50 text-red-700 border-red-200/70",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-md border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section
      className={`bg-white rounded-xl border border-slate-200/80 shadow-card transition-shadow hover:shadow-card-hover ${className}`}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100/90">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
