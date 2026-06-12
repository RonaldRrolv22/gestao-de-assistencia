/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KanbanColumnId, MaintenanceRequest } from "../types";
import { isBudgetRejected } from "./rejectedBudget";
import { buildFreteSummaryLabel } from "./budgetCommercialPdf";
import { formatCurrency } from "../utils";
import {
  ReportTimeFilter,
  matchesReportTimeFilter,
  parseReportDate,
} from "./reportMetrics";

export type BudgetDecision = "Pendente" | "Aprovado" | "Reprovado";
export type StageFilter = "all" | "orcamento" | "manutencao" | "liberado" | "recusado";
export type TimeFilter = ReportTimeFilter;

export function getBudgetDecision(request: MaintenanceRequest): BudgetDecision {
  if (isBudgetRejected(request)) return "Reprovado";
  if (request.budget?.isApproved) return "Aprovado";
  return "Pendente";
}

export function getFriendlyColumnLabel(col: string): string {
  switch (col) {
    case "nova_solicitacao":
      return "Solicitação Criada";
    case "solicitacao":
      return "Solicitação";
    case "orcamento":
      return "Orçamento";
    case "manutencao":
      return "Em Manutenção";
    case "liberado":
      return "Liberado";
    case "recusado":
      return "Orçamento Recusado";
    default:
      return String(col).toUpperCase();
  }
}

export function formatDateBr(value?: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
}

export function formatDateTimeBr(value?: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export function formatBudgetValue(request: MaintenanceRequest): string {
  if (!request.budget) return "-";
  if (request.budget.isWarranty) return "R$ 0,00";
  return formatCurrency(request.budget.totalFinal);
}

export function formatFreteSummary(request: MaintenanceRequest): string {
  if (!request.budget) return "-";
  const shipping = request.budget.shipping ?? 0;
  if (shipping <= 0 && !request.budget.shippingService) return "-";
  return buildFreteSummaryLabel(shipping, request.budget.shippingService);
}

export function formatPaymentStatus(request: MaintenanceRequest): string {
  const payment = request.budgetPayment;
  if (!payment || payment.status === "none") return "-";
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    failed: "Falhou",
    expired: "Expirado",
  };
  const status = labels[payment.status] || payment.status;
  if (payment.paidAt) {
    return `${status} (${formatDateTimeBr(payment.paidAt)})`;
  }
  return status;
}

export function formatRatStatus(request: MaintenanceRequest): string {
  if (!request.rat) return "-";
  if (request.rat.finalizedDate) {
    return `${request.rat.status} (${formatDateBr(request.rat.finalizedDate)})`;
  }
  return request.rat.status;
}

export function formatReleaseInfo(request: MaintenanceRequest): string {
  if (!request.releasedDate && !request.paymentProof?.paymentDate) return "-";
  const parts: string[] = [];
  if (request.releasedDate) parts.push(`Liberado: ${formatDateBr(request.releasedDate)}`);
  if (request.paymentProof?.paymentDate) {
    parts.push(`Pagamento: ${formatDateBr(request.paymentProof.paymentDate)}`);
  }
  return parts.join(" • ");
}

export function matchesStageFilter(request: MaintenanceRequest, stage: StageFilter): boolean {
  if (stage === "all") return true;
  return request.columnId === stage;
}

export function matchesTimeFilter(request: MaintenanceRequest, timeFilter: TimeFilter): boolean {
  return matchesReportTimeFilter(request, timeFilter);
}

export function matchesSearch(request: MaintenanceRequest, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    request.id,
    request.requestNumber,
    request.clientName,
    request.clientCompany,
    request.productName,
    request.serialNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterOsDatabaseRows(
  requests: MaintenanceRequest[],
  options: {
    search: string;
    stage: StageFilter;
    timeFilter: TimeFilter;
  }
): MaintenanceRequest[] {
  return requests
    .filter((r) => r.budget != null)
    .filter((r) => matchesSearch(r, options.search))
    .filter((r) => matchesStageFilter(r, options.stage))
    .filter((r) => matchesTimeFilter(r, options.timeFilter))
    .sort((a, b) => {
      const da = parseReportDate(a.openingDate)?.getTime() ?? 0;
      const db = parseReportDate(b.openingDate)?.getTime() ?? 0;
      return db - da;
    });
}

export function columnIdToBadgeVariant(columnId: KanbanColumnId) {
  return columnId as "solicitacao" | "orcamento" | "manutencao" | "liberado" | "recusado";
}

export function budgetDecisionToBadgeVariant(decision: BudgetDecision) {
  switch (decision) {
    case "Aprovado":
      return "paid" as const;
    case "Reprovado":
      return "recusado" as const;
    default:
      return "pending" as const;
  }
}
