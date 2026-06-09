/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export type StatusBadgeVariant =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "none"
  | "warranty"
  | "solicitacao"
  | "orcamento"
  | "manutencao"
  | "liberado"
  | "recusado"
  | "neutral";

const STYLES: Record<StatusBadgeVariant, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200/70",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  expired: "bg-red-50 text-red-700 border-red-200/70",
  failed: "bg-red-50 text-red-700 border-red-200/70",
  none: "bg-slate-50 text-text-secondary border-border",
  warranty: "bg-violet-50 text-violet-700 border-violet-200/70",
  solicitacao: "bg-slate-50 text-text-secondary border-border",
  orcamento: "bg-blue-50 text-action-blue border-blue-200/70",
  manutencao: "bg-orange-50/80 text-brand-orange border-orange-200/55",
  liberado: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  recusado: "bg-red-50 text-red-700 border-red-200/70",
  neutral: "bg-slate-50 text-text-secondary border-border",
};

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export default function StatusBadge({
  variant,
  children,
  className = "",
  compact = false,
}: StatusBadgeProps) {
  const sizeClass = compact
    ? "px-1.5 py-px rounded text-[9px] font-medium tracking-normal"
    : "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide";

  return (
    <span
      className={`inline-flex items-center border ${sizeClass} ${STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
