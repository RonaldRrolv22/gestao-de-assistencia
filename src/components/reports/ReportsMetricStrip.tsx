/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import MetricTile, { MetricVariant } from "./MetricTile";

export interface MetricStripItem {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  variant?: MetricVariant;
  sparklineData?: number[];
  hintWarm?: boolean;
  hintAlert?: boolean;
}

interface ReportsMetricStripProps {
  items: MetricStripItem[];
  filterKey?: string;
}

export default function ReportsMetricStrip({ items, filterKey = "all" }: ReportsMetricStripProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-card divide-y sm:divide-y-0 sm:divide-x divide-slate-100/90 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
      {items.map((item) => (
        <MetricTile key={`${filterKey}-${item.label}`} {...item} />
      ))}
    </div>
  );
}
