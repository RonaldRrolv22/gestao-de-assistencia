/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface MetricMiniCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "orange";
  dotColor?: string;
  compact?: boolean;
}

export default function MetricMiniCard({
  label,
  value,
  hint,
  accent = "default",
  dotColor,
  compact = false,
}: MetricMiniCardProps) {
  return (
    <div className={`report-mini-stat ${compact ? "p-2.5" : "p-4"}`}>
      <div className={`flex items-center gap-2 ${compact ? "mb-1" : "mb-1.5"}`}>
        {dotColor && (
          <span
            className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold truncate">
          {label}
        </p>
      </div>
      <p
        className={`font-bold tracking-tight ${
          compact ? "text-xl" : "text-2xl"
        } ${accent === "orange" ? "text-brand-orange" : "text-heading"}`}
      >
        {value}
      </p>
      {hint && (
        <p className={`text-text-secondary/65 leading-snug truncate ${compact ? "text-[9px] mt-0.5" : "text-[10px] mt-1"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}
