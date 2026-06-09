/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MaintenanceRequest } from "../../types";
import { formatRequestDisplayId } from "../../services/requestIds";
import SummaryCard from "../ui/SummaryCard";
import StatusBadge from "../ui/StatusBadge";
import { BUDGET_LABEL } from "./budgetModalStyles";

const COLUMN_LABELS: Record<string, string> = {
  solicitacao: "Solicitação",
  orcamento: "Orçamento",
  manutencao: "Em Manutenção",
  liberado: "Liberado",
  recusado: "Recusado",
};

interface BudgetOsSummaryCardProps {
  request: MaintenanceRequest;
}

export default function BudgetOsSummaryCard({ request }: BudgetOsSummaryCardProps) {
  return (
    <SummaryCard
      title="Dados da O.S."
      subtitle={`Código ${formatRequestDisplayId(request.id, request.columnId)}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="space-y-2">
          <p className={BUDGET_LABEL}>Cliente</p>
          <p className="font-semibold text-slate-800">{request.clientName}</p>
          <p className="text-slate-500">{request.clientCompany}</p>
          <p className="text-slate-500">{request.clientEmail} • {request.clientPhone}</p>
        </div>
        <div className="space-y-2">
          <p className={BUDGET_LABEL}>Equipamento</p>
          <p className="font-semibold text-slate-800">{request.productName}</p>
          <p className="text-slate-500 font-mono">S/N: {request.serialNumber || "N/A"}</p>
          <p className="text-slate-600 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200/80 text-[11px] leading-relaxed">
            <span className="font-semibold text-slate-800">Sintoma:</span> {request.problemDescription}
          </p>
          <div className="pt-1">
            <StatusBadge variant={request.columnId as "orcamento"}>
              {COLUMN_LABELS[request.columnId] || request.columnId}
            </StatusBadge>
          </div>
        </div>
      </div>
    </SummaryCard>
  );
}
