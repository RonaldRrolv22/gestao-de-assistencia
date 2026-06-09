/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface SummaryCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
  headerAction?: React.ReactNode;
}

export default function SummaryCard({
  title,
  subtitle,
  children,
  className = "",
  sticky = false,
  headerAction,
}: SummaryCardProps) {
  return (
    <section
      className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden ${sticky ? "lg:sticky lg:top-4" : ""} ${className}`}
    >
      {(title || headerAction) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold text-sm text-slate-800">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
