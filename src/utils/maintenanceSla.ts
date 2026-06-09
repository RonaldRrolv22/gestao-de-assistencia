/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";

export const MAINTENANCE_SLA_DAYS = 14;
const WARNING_DAYS_THRESHOLD = 3;

export type SlaStatus =
  | "not_applicable"
  | "awaiting_payment"
  | "warranty"
  | "on_track"
  | "warning"
  | "overdue";

export interface MaintenanceSlaInfo {
  status: SlaStatus;
  paymentDate: string | null;
  deadlineDate: string | null;
  daysRemaining: number | null;
  daysOverdue: number | null;
  maxDays: number;
  label: string;
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Data de confirmação do pagamento ou aprovação em garantia. */
export function getPaymentConfirmedDate(req: MaintenanceRequest): Date | null {
  if (req.budget?.isWarranty) {
    return parseDate(req.budget.approvedDate) ?? parseDate(req.openingDate);
  }
  if (req.budgetPayment?.status === "paid" && req.budgetPayment.paidAt) {
    return parseDate(req.budgetPayment.paidAt);
  }
  return null;
}

export function isAwaitingPayment(req: MaintenanceRequest): boolean {
  if (req.budget?.isWarranty) return false;
  if (req.budgetPayment?.status === "paid") return false;
  if (req.columnId === "manutencao") return true;
  if (req.rat?.status === "Finalizado" && req.columnId !== "liberado") return true;
  return false;
}

export function getMaintenanceSlaInfo(req: MaintenanceRequest): MaintenanceSlaInfo {
  const na: MaintenanceSlaInfo = {
    status: "not_applicable",
    paymentDate: null,
    deadlineDate: null,
    daysRemaining: null,
    daysOverdue: null,
    maxDays: MAINTENANCE_SLA_DAYS,
    label: "",
  };

  const inMaintenance = req.columnId === "manutencao";
  const ratWaitingPayment =
    req.rat?.status === "Finalizado" && req.columnId !== "liberado";

  if (!inMaintenance && !ratWaitingPayment) return na;

  if (isAwaitingPayment(req)) {
    return {
      ...na,
      status: "awaiting_payment",
      label: "Aguardando pagamento",
    };
  }

  const paymentDate = getPaymentConfirmedDate(req);
  if (!paymentDate) {
    return na;
  }

  const deadline = new Date(paymentDate);
  deadline.setDate(deadline.getDate() + MAINTENANCE_SLA_DAYS);

  const today = toDateOnly(new Date());
  const deadlineDay = toDateOnly(deadline);
  const diffMs = deadlineDay.getTime() - today.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const paymentDateStr = toIsoDate(paymentDate);
  const deadlineStr = toIsoDate(deadline);
  const isWarranty = Boolean(req.budget?.isWarranty);

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining);
    return {
      status: "overdue",
      paymentDate: paymentDateStr,
      deadlineDate: deadlineStr,
      daysRemaining: 0,
      daysOverdue: overdue,
      maxDays: MAINTENANCE_SLA_DAYS,
      label: `Atrasado há ${overdue} dia${overdue === 1 ? "" : "s"}`,
    };
  }

  if (daysRemaining <= WARNING_DAYS_THRESHOLD) {
    return {
      status: "warning",
      paymentDate: paymentDateStr,
      deadlineDate: deadlineStr,
      daysRemaining,
      daysOverdue: null,
      maxDays: MAINTENANCE_SLA_DAYS,
      label: `Restam ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}`,
    };
  }

  return {
    status: isWarranty ? "warranty" : "on_track",
    paymentDate: paymentDateStr,
    deadlineDate: deadlineStr,
    daysRemaining,
    daysOverdue: null,
    maxDays: MAINTENANCE_SLA_DAYS,
    label: `Restam ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}`,
  };
}

export function getRemainingDaysForMaintenance(req: MaintenanceRequest): number {
  const sla = getMaintenanceSlaInfo(req);
  if (sla.status === "awaiting_payment" || sla.status === "not_applicable") {
    return MAINTENANCE_SLA_DAYS;
  }
  if (sla.daysRemaining !== null && sla.daysRemaining >= 0) {
    return sla.daysRemaining;
  }
  if (sla.daysOverdue !== null) {
    return -sla.daysOverdue;
  }
  return MAINTENANCE_SLA_DAYS;
}
