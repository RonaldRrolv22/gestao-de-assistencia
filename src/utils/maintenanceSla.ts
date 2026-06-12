/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";
import { warrantyChargesShipping } from "./maintenanceAccess";
import { MAINTENANCE_SLA_BUSINESS_DAYS } from "../config/operationalDeadlines";
import {
  businessDaysOverdue,
  businessDaysRemaining,
  toDateOnly,
} from "./businessDays";
import { formatIsoDate, getRepairDeadlineDate } from "./operationalDeadlineInfo";

export const MAINTENANCE_SLA_DAYS = MAINTENANCE_SLA_BUSINESS_DAYS;

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

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Data de confirmação do pagamento ou aprovação em garantia. */
export function getPaymentConfirmedDate(req: MaintenanceRequest): Date | null {
  if (req.budget?.isWarranty) {
    if (warrantyChargesShipping(req.budget) && req.budgetPayment?.status === "paid" && req.budgetPayment.paidAt) {
      return parseDate(req.budgetPayment.paidAt);
    }
    return parseDate(req.budget.approvedDate) ?? parseDate(req.openingDate);
  }
  if (req.budgetPayment?.status === "paid" && req.budgetPayment.paidAt) {
    return parseDate(req.budgetPayment.paidAt);
  }
  return null;
}

export function isAwaitingPayment(req: MaintenanceRequest): boolean {
  if (req.budget?.isWarranty && !warrantyChargesShipping(req.budget)) return false;
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
    maxDays: MAINTENANCE_SLA_BUSINESS_DAYS,
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

  const deadline = getRepairDeadlineDate(paymentDate);
  const today = toDateOnly(new Date());
  const deadlineDay = toDateOnly(deadline);

  const paymentDateStr = formatIsoDate(paymentDate);
  const deadlineStr = formatIsoDate(deadline);
  const isWarranty = Boolean(req.budget?.isWarranty);

  if (today > deadlineDay) {
    const overdue = businessDaysOverdue(deadlineDay, today);
    return {
      status: "overdue",
      paymentDate: paymentDateStr,
      deadlineDate: deadlineStr,
      daysRemaining: 0,
      daysOverdue: overdue,
      maxDays: MAINTENANCE_SLA_BUSINESS_DAYS,
      label: `Atrasado há ${overdue} dia${overdue === 1 ? "" : "s"} útei${overdue === 1 ? "l" : "s"}`,
    };
  }

  const daysRemaining = businessDaysRemaining(today, deadlineDay);

  if (daysRemaining <= WARNING_DAYS_THRESHOLD) {
    return {
      status: "warning",
      paymentDate: paymentDateStr,
      deadlineDate: deadlineStr,
      daysRemaining,
      daysOverdue: null,
      maxDays: MAINTENANCE_SLA_BUSINESS_DAYS,
      label: `Restam ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} útei${daysRemaining === 1 ? "l" : "s"}`,
    };
  }

  return {
    status: isWarranty ? "warranty" : "on_track",
    paymentDate: paymentDateStr,
    deadlineDate: deadlineStr,
    daysRemaining,
    daysOverdue: null,
    maxDays: MAINTENANCE_SLA_BUSINESS_DAYS,
    label: `Restam ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} útei${daysRemaining === 1 ? "l" : "s"}`,
  };
}

export function getRemainingDaysForMaintenance(req: MaintenanceRequest): number {
  const sla = getMaintenanceSlaInfo(req);
  if (sla.status === "awaiting_payment" || sla.status === "not_applicable") {
    return MAINTENANCE_SLA_BUSINESS_DAYS;
  }
  if (sla.daysRemaining !== null && sla.daysRemaining >= 0) {
    return sla.daysRemaining;
  }
  if (sla.daysOverdue !== null) {
    return -sla.daysOverdue;
  }
  return MAINTENANCE_SLA_BUSINESS_DAYS;
}
