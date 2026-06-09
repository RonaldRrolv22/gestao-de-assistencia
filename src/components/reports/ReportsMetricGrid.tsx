/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import KpiCard from "../ui/KpiCard";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export interface KpiItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { text: string; positive?: boolean };
}

interface ReportsMetricGridProps {
  items: KpiItem[];
  compact?: boolean;
}

export default function ReportsMetricGrid({ items, compact = false }: ReportsMetricGridProps) {
  const reducedMotion = useReducedMotion();
  const gridClass = compact
    ? "grid grid-cols-2 lg:grid-cols-4 gap-3"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5";

  if (reducedMotion) {
    return (
      <div className={gridClass}>
        {items.map((item) => (
          <div key={item.label} className="animate-stagger-item">
            <KpiCard {...item} elevated compact={compact} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={gridClass}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {items.map((item) => (
        <motion.div
          key={item.label}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
          }}
        >
          <KpiCard {...item} elevated compact={compact} />
        </motion.div>
      ))}
    </motion.div>
  );
}
