/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  /** Preenche a altura restante da coluna */
  fill?: boolean;
}

export default function EmptyState({
  title = "Nenhum item",
  description = "Arraste cards para esta coluna ou crie uma nova solicitação.",
  icon,
  fill = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center border border-dashed border-border/60 rounded-xl bg-slate-50/30 transition-colors duration-200 ${
        fill ? "flex-1 min-h-[120px] h-full px-4 py-10" : "py-12 px-5"
      }`}
    >
      <div className="p-2 rounded-lg bg-white/90 border border-border/50 text-text-secondary/50 mb-2.5">
        {icon ?? <Inbox className="h-4 w-4" />}
      </div>
      <p className="text-[11px] font-medium text-text-primary">{title}</p>
      <p className="text-[10px] text-text-secondary/80 mt-1 max-w-[160px] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
