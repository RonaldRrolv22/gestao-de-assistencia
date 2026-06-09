/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import SummaryCard from "../ui/SummaryCard";
import {
  BUDGET_SEGMENTED_ACTIVE,
  BUDGET_SEGMENTED_IDLE,
  BUDGET_SEGMENTED_WRAP,
} from "./budgetModalStyles";

interface WarrantyCardProps {
  isWarranty: boolean;
  canEdit: boolean;
  onChange: (value: boolean) => void;
}

export default function WarrantyCard({ isWarranty, canEdit, onChange }: WarrantyCardProps) {
  return (
    <SummaryCard title="Garantia técnica" subtitle="Cobertura de peças e serviços">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 items-start">
          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-100 shrink-0">
            <ShieldCheck className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">Serviço coberto por garantia?</p>
            <p className="text-slate-500 text-[11px] mt-1 leading-relaxed">
              {isWarranty
                ? "Valores zerados por cobertura integral."
                : "Cobrança conforme itens do orçamento."}
            </p>
          </div>
        </div>
        <div className={BUDGET_SEGMENTED_WRAP}>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onChange(true)}
            className={isWarranty ? BUDGET_SEGMENTED_ACTIVE : BUDGET_SEGMENTED_IDLE}
          >
            Sim
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onChange(false)}
            className={!isWarranty ? BUDGET_SEGMENTED_ACTIVE : BUDGET_SEGMENTED_IDLE}
          >
            Não
          </button>
        </div>
      </div>
    </SummaryCard>
  );
}
