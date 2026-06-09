/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface ReportPanelCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
  compact?: boolean;
  className?: string;
}

export default function ReportPanelCard({
  title,
  subtitle,
  badge,
  icon,
  children,
  emptyState,
  isEmpty = false,
  compact = false,
  className = "",
}: ReportPanelCardProps) {
  return (
    <section className={`report-panel flex flex-col min-h-0 ${className}`}>
      <div
        className={`report-panel-header flex items-start justify-between gap-2 shrink-0 ${
          compact ? "px-4 py-3" : "px-5 py-4 sm:px-6"
        }`}
      >
        <div className="min-w-0 flex items-start gap-2.5">
          {icon && (
            <span
              className={`icon-badge-gradient shrink-0 rounded-xl shadow-glow-orange ${
                compact ? "w-8 h-8 [&_svg]:h-3.5 [&_svg]:w-3.5" : "w-9 h-9"
              }`}
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h4
              className={`font-bold text-heading tracking-tight ${
                compact ? "text-sm" : "text-sm sm:text-[0.9375rem]"
              }`}
            >
              {title}
            </h4>
            {subtitle && (
              <p
                className={`text-text-secondary/75 leading-snug ${
                  compact ? "text-[10px] mt-0.5" : "text-[11px] sm:text-xs mt-0.5"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div
        className={`min-h-0 ${
          compact ? "px-4 py-3 pb-4 flex-1 overflow-y-auto" : "px-5 py-5 sm:px-6 sm:py-6 pb-6 sm:pb-7"
        }`}
      >
        {isEmpty && emptyState ? emptyState : children}
      </div>
    </section>
  );
}
