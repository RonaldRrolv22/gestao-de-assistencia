/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  OPERATIONAL_DEADLINES,
  OperationalDeadline,
  REPAIR_EXECUTION_MAX_DAYS,
} from "../config/operationalDeadlines";
import { MaintenanceRequest } from "../types";
import { parseReportDate } from "./reportMetrics";
import { getPaymentConfirmedDate } from "./maintenanceSla";

export interface DeadlineHintRow {
  label: string;
  value: string;
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatBrDate(d: Date): string {
  return d.toLocaleDateString("pt-BR");
}

export function addCalendarDays(start: Date, days: number): Date {
  const result = toDateOnly(start);
  result.setDate(result.getDate() + days);
  return result;
}

export function addBusinessDays(start: Date, businessDays: number): Date {
  const result = toDateOnly(start);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) {
      added += 1;
    }
  }
  return result;
}

function computeDeadlineDate(
  deadline: OperationalDeadline,
  reference: Date
): Date | null {
  if (deadline.maxDays != null) {
    return addCalendarDays(reference, deadline.maxDays);
  }
  if (deadline.businessDays != null) {
    return addBusinessDays(reference, deadline.businessDays);
  }
  return null;
}

function isDeadlineApplicable(deadline: OperationalDeadline, req: MaintenanceRequest): boolean {
  if (deadline.excludeWarranty && req.budget?.isWarranty) return false;
  return deadline.applicableStages.includes(req.columnId);
}

/** Linhas informativas de prazo para exibição no card do Kanban. */
export function getRequestDeadlineHints(req: MaintenanceRequest): DeadlineHintRow[] {
  const rows: DeadlineHintRow[] = [];
  const received = parseReportDate(req.equipmentReceivedDate);
  const isWarranty = Boolean(req.budget?.isWarranty);

  if (req.columnId === "solicitacao") {
    const diagnosis = OPERATIONAL_DEADLINES.find((d) => d.id === "diagnosis")!;
    const rat = OPERATIONAL_DEADLINES.find((d) => d.id === "rat_opening")!;
    rows.push({ label: "Diagnóstico", value: diagnosis.shortLabel });
    if (received) {
      rows.push({
        label: "Retorno até",
        value: formatBrDate(addCalendarDays(received, diagnosis.maxDays!)),
      });
    }
    rows.push({ label: "Abertura RAT", value: rat.shortLabel });
    if (!isWarranty) {
      const budget = OPERATIONAL_DEADLINES.find((d) => d.id === "budget_send")!;
      rows.push({ label: "Orçamento", value: budget.shortLabel });
    }
    return rows;
  }

  if (req.columnId === "orcamento" || req.columnId === "recusado") {
    if (!isWarranty) {
      const budget = OPERATIONAL_DEADLINES.find((d) => d.id === "budget_send")!;
      rows.push({ label: "Envio orçamento", value: budget.shortLabel });
    }
    return rows;
  }

  if (req.columnId === "manutencao") {
    const repair = OPERATIONAL_DEADLINES.find((d) => d.id === "repair_execution")!;
    rows.push({ label: "Reparo (CDC)", value: repair.shortLabel });

    const paymentDate = getPaymentConfirmedDate(req);
    if (paymentDate) {
      rows.push({
        label: "Limite reparo",
        value: formatBrDate(addCalendarDays(paymentDate, REPAIR_EXECUTION_MAX_DAYS)),
      });
    }

    if (req.rat?.status === "Finalizado" && req.rat.finalizedDate) {
      const finalized = parseReportDate(req.rat.finalizedDate);
      const productReturn = OPERATIONAL_DEADLINES.find((d) => d.id === "product_return")!;
      if (finalized) {
        rows.push({
          label: "Devolução até",
          value: formatBrDate(addBusinessDays(finalized, productReturn.businessDays!)),
        });
      }
    } else {
      const productReturn = OPERATIONAL_DEADLINES.find((d) => d.id === "product_return")!;
      rows.push({ label: "Devolução", value: productReturn.shortLabel });
    }
    return rows;
  }

  if (req.columnId === "liberado") {
    const productReturn = OPERATIONAL_DEADLINES.find((d) => d.id === "product_return")!;
    rows.push({ label: "Devolução", value: productReturn.shortLabel });
    if (req.releasedDate) {
      const released = parseReportDate(req.releasedDate);
      if (released) {
        rows.push({ label: "Liberado em", value: formatBrDate(released) });
      }
    }
    return rows;
  }

  return rows;
}

export function getStageDeadlineSummary(stage: MaintenanceRequest["columnId"]): string {
  const items = OPERATIONAL_DEADLINES.filter((d) => d.applicableStages.includes(stage));
  if (items.length === 0) return "";
  return items.map((d) => `${d.title}: ${d.shortLabel}`).join(" · ");
}

export function getDeadlineTargetIso(
  deadline: OperationalDeadline,
  referenceIso: string
): string | null {
  const reference = parseReportDate(referenceIso);
  if (!reference) return null;
  const target = computeDeadlineDate(deadline, reference);
  return target ? formatIsoDate(target) : null;
}

export function isApplicableToRequest(deadline: OperationalDeadline, req: MaintenanceRequest): boolean {
  return isDeadlineApplicable(deadline, req);
}
