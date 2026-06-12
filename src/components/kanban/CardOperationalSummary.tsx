/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { MaintenanceRequest } from "../../types";
import EmailStatusIcons from "../ui/EmailStatusIcons";
import { formatDate } from "../../utils";
import { getMaintenanceSlaInfo, isAwaitingPayment, MaintenanceSlaInfo } from "../../utils/maintenanceSla";
import { getRequestDeadlineHints } from "../../utils/operationalDeadlineInfo";
import { getRejectedDaysRemainingInKanban, isBudgetRejected } from "../../utils/rejectedBudget";
import { KANBAN_COLUMNS } from "./kanbanConfig";

type SummaryTone = "neutral" | "success" | "warning" | "danger";

interface SummaryRow {
  label: string;
  value: string;
}

interface OperationalSummary {
  headline: string;
  tone: SummaryTone;
  rows: SummaryRow[];
}

const TONE_CLASS: Record<SummaryTone, string> = {
  neutral: "kanban-ops-neutral",
  success: "kanban-ops-success",
  warning: "kanban-ops-warning",
  danger: "kanban-ops-danger",
};

function getStageLabel(columnId: MaintenanceRequest["columnId"]): string {
  const col = KANBAN_COLUMNS.find((c) => c.id === columnId);
  if (col) return col.shortTitle ?? col.title;
  if (columnId === "recusado") return "Orçamento";
  return columnId;
}

function getPaymentLabel(req: MaintenanceRequest, awaitingPayment: boolean): string | null {
  if (req.budget?.isWarranty) return "Garantia";
  if (awaitingPayment) return "Pendente";
  if (req.budgetPayment?.status === "paid") return "Confirmado";
  return null;
}

function buildMaintenanceSlaRows(sla: MaintenanceSlaInfo): SummaryRow[] {
  const rows: SummaryRow[] = [{ label: "Prazo", value: `${sla.maxDays} dias úteis` }];

  if (sla.deadlineDate) {
    rows.push({ label: "Data limite", value: formatDate(sla.deadlineDate) });
  }

  if (sla.status === "overdue" && sla.daysOverdue !== null) {
    rows.push({
      label: "Tempo restante",
      value: `Atrasado ${sla.daysOverdue} dia${sla.daysOverdue === 1 ? "" : "s"} útei${sla.daysOverdue === 1 ? "l" : "s"}`,
    });
  } else if (sla.daysRemaining !== null) {
    rows.push({
      label: "Tempo restante",
      value: `${sla.daysRemaining} dia${sla.daysRemaining === 1 ? "" : "s"} útei${sla.daysRemaining === 1 ? "l" : "s"}`,
    });
  }

  if (sla.deadlineDate) {
    rows.push({ label: "Limite reparo", value: formatDate(sla.deadlineDate) });
  }

  return rows;
}

function buildSummary(req: MaintenanceRequest): OperationalSummary | null {
  const rejected = isBudgetRejected(req);
  const isOrcamento = req.columnId === "orcamento" || req.columnId === "recusado";
  const stage = getStageLabel(req.columnId);
  const awaitingPayment =
    !req.budget?.isWarranty &&
    req.budgetPayment?.status !== "paid" &&
    (isAwaitingPayment(req) || (isOrcamento && !rejected && Boolean(req.budget?.isApproved)));

  const payment = getPaymentLabel(req, awaitingPayment);
  const sla = getMaintenanceSlaInfo(req);
  const showMaintenanceSla =
    req.columnId === "manutencao" &&
    sla.status !== "not_applicable" &&
    sla.status !== "awaiting_payment";

  if (rejected && isOrcamento) {
    const rows: SummaryRow[] = [{ label: "Etapa", value: stage }];
    const days = getRejectedDaysRemainingInKanban(req);
    if (days !== null) {
      rows.push({
        label: "No kanban",
        value: days === 0 ? "Sai hoje" : `${days} dia${days === 1 ? "" : "s"}`,
      });
    }
    return {
      headline: "Orçamento reprovado",
      tone: "danger",
      rows,
    };
  }

  if (req.columnId === "solicitacao") {
    return {
      headline: "Triagem de entrada",
      tone: "neutral",
      rows: getRequestDeadlineHints(req),
    };
  }

  if (showMaintenanceSla) {
    const headline =
      sla.status === "overdue"
        ? "Prazo vencido"
        : sla.status === "warning"
          ? "Prazo se aproximando"
          : "Dentro do prazo";
    const tone: SummaryTone =
      sla.status === "overdue" ? "danger" : sla.status === "warning" ? "warning" : "success";
    return {
      headline,
      tone,
      rows: buildMaintenanceSlaRows(sla),
    };
  }

  const rows: SummaryRow[] = [{ label: "Etapa", value: stage }];

  if (req.rat?.status === "Finalizado" && req.columnId !== "liberado") {
    rows.push({ label: "Status", value: "Aguardando liberação" });
    if (payment) rows.push({ label: "Pagamento", value: payment });
    return {
      headline: "RAT finalizada",
      tone: "neutral",
      rows,
    };
  }

  if (payment) {
    rows.push({ label: "Pagamento", value: payment });
  }

  if (awaitingPayment) {
    return {
      headline: "Aguardando pagamento",
      tone: "neutral",
      rows,
    };
  }

  if (req.columnId === "orcamento" && req.budget?.isApproved) {
    return {
      headline: "Orçamento aprovado",
      tone: "neutral",
      rows,
    };
  }

  if (req.columnId === "manutencao") {
    return {
      headline: "Manutenção em andamento",
      tone: "neutral",
      rows,
    };
  }

  if (req.columnId === "liberado") {
    if (req.shippingLabel?.trackingCode) {
      rows.push({ label: "Rastreio", value: req.shippingLabel.trackingCode });
    }
    return {
      headline: "Liberado para entrega",
      tone: "success",
      rows,
    };
  }

  return {
    headline: stage,
    tone: "neutral",
    rows,
  };
}

function SummaryRowItem({ label, value }: SummaryRow) {
  return (
    <div className="flex items-baseline justify-between gap-3 min-w-0">
      <span className="text-[9px] uppercase tracking-wide text-text-secondary/55 shrink-0">{label}</span>
      <span className="text-[10px] font-medium text-heading/90 truncate text-right">{value}</span>
    </div>
  );
}

interface CardOperationalSummaryProps {
  request: MaintenanceRequest;
}

export default function CardOperationalSummary({ request }: CardOperationalSummaryProps) {
  const summary = buildSummary(request);
  if (!summary) return null;

  return (
    <div className={`kanban-card-ops ${TONE_CLASS[summary.tone]}`}>
      <p className="kanban-card-ops-headline">{summary.headline}</p>
      <div className="mt-1.5 space-y-1">
        {summary.rows.map((row) => (
          <SummaryRowItem key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200/60">
        <EmailStatusIcons
          request={request}
          types={["budget", "maintenance_started", "rat", "tracking"]}
        />
      </div>
    </div>
  );
}
