/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";

const KANBAN_REJECTED_VISIBLE_DAYS = 5;

export function isBudgetRejected(request: MaintenanceRequest): boolean {
  if (request.budgetRejectedAt) return true;
  return request.columnId === "recusado";
}

export function getRejectedAt(request: MaintenanceRequest): string | null {
  if (request.budgetRejectedAt) return request.budgetRejectedAt;

  if (request.columnId !== "recusado") return null;

  const logs = [...(request.movementHistory || [])]
    .filter((log) => log.toColumn === "recusado")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return logs[0]?.timestamp ?? null;
}

export function getDaysSinceRejected(request: MaintenanceRequest): number | null {
  const rejectedAt = getRejectedAt(request);
  if (!rejectedAt) return null;

  const rejected = new Date(rejectedAt);
  const today = new Date();
  const dStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dEnd = new Date(rejected.getFullYear(), rejected.getMonth(), rejected.getDate());
  const diffMs = dStart.getTime() - dEnd.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getRejectedDaysRemainingInKanban(request: MaintenanceRequest): number | null {
  const daysSince = getDaysSinceRejected(request);
  if (daysSince === null) return null;
  return Math.max(0, KANBAN_REJECTED_VISIBLE_DAYS - daysSince);
}

/** Orçamento reprovado visível na coluna Orçamento por até 5 dias */
export function isRejectedVisibleInOrcamento(request: MaintenanceRequest): boolean {
  if (!isBudgetRejected(request)) return false;
  const daysSince = getDaysSinceRejected(request);
  if (daysSince === null) return true;
  return daysSince <= KANBAN_REJECTED_VISIBLE_DAYS;
}

/** @deprecated use isRejectedVisibleInOrcamento */
export function isRejectedVisibleInKanban(request: MaintenanceRequest): boolean {
  return isRejectedVisibleInOrcamento(request);
}
