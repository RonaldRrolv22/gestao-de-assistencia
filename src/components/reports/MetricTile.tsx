/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import KpiSparkline from "./KpiSparkline";
import { KPI_WARM_VARIANT } from "./reportsPalette";

export type MetricVariant = "revenue" | "maintenance" | "resolution" | "warranty";

interface MetricTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  variant?: MetricVariant;
  sparklineData?: number[];
  hintWarm?: boolean;
  hintAlert?: boolean;
}

export default function MetricTile({
  label,
  value,
  hint,
  icon,
  variant = "resolution",
  sparklineData = [],
  hintWarm,
  hintAlert,
}: MetricTileProps) {
  const styles = KPI_WARM_VARIANT[variant];

  return (
    <div className="group flex items-center gap-3 px-4 py-4 min-w-0 transition-colors hover:bg-slate-50/80">
      {icon && (
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0 text-white ${styles.iconClass}`}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-xl lg:text-[1.35rem] font-bold text-slate-900 tracking-tight mt-0.5 truncate leading-none">
          {value}
        </p>
        {hint && (
          <p
            className={`text-[10px] mt-1.5 truncate font-medium ${
              hintAlert
                ? KPI_WARM_VARIANT.warranty.hintClass
                : hintWarm
                  ? KPI_WARM_VARIANT.revenue.hintClass
                  : styles.hintClass
            }`}
          >
            {hint}
          </p>
        )}
      </div>
      {sparklineData.length > 0 && (
        <KpiSparkline
          id={`kpi-${variant}`}
          data={sparklineData}
          strokeColor={styles.sparkStroke}
          fillColor={styles.sparkFill}
          className="hidden sm:block w-[72px] h-8 opacity-80"
        />
      )}
    </div>
  );
}
