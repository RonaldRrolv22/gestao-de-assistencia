/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceRequest } from "../types";

export type ReportTimeFilter = "30" | "90" | "year" | "all";

export const REPORT_TIME_FILTER_LABELS: Record<ReportTimeFilter, string> = {
  all: "Todo período",
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  year: "Este ano",
};

/** Interpreta YYYY-MM-DD (e ISO) como data local — evita deslocamento UTC. */
export function parseReportDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (br) {
    const date = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isDateInTimeFilter(
  dateStr: string | undefined | null,
  timeFilter: ReportTimeFilter,
  now = new Date()
): boolean {
  if (timeFilter === "all") return true;

  const date = parseReportDate(dateStr);
  if (!date) return false;

  const today = startOfLocalDay(now);
  const target = startOfLocalDay(date);
  const diffDays = (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return false;

  if (timeFilter === "30") return diffDays <= 30;
  if (timeFilter === "90") return diffDays <= 90;
  if (timeFilter === "year") return target.getFullYear() === today.getFullYear();
  return true;
}

export function collectRequestActivityDates(request: MaintenanceRequest): string[] {
  const dates: string[] = [];

  if (request.openingDate) dates.push(request.openingDate);
  if (request.releasedDate) dates.push(request.releasedDate);
  if (request.equipmentReceivedDate) dates.push(request.equipmentReceivedDate);
  if (request.rat?.finalizedDate) dates.push(request.rat.finalizedDate);
  if (request.budgetPayment?.paidAt) dates.push(request.budgetPayment.paidAt);
  if (request.budget?.approvedDate) dates.push(request.budget.approvedDate);

  for (const log of request.movementHistory || []) {
    if (log.timestamp) dates.push(log.timestamp);
  }

  return dates;
}

/** O.S. com qualquer atividade registrada dentro do período selecionado. */
export function matchesReportTimeFilter(
  request: MaintenanceRequest,
  timeFilter: ReportTimeFilter,
  now = new Date()
): boolean {
  if (timeFilter === "all") return true;
  return collectRequestActivityDates(request).some((dateStr) =>
    isDateInTimeFilter(dateStr, timeFilter, now)
  );
}

export function filterRequestsByReportTime(
  requests: MaintenanceRequest[],
  timeFilter: ReportTimeFilter,
  now = new Date()
): MaintenanceRequest[] {
  if (timeFilter === "all") return requests;
  return requests.filter((request) => matchesReportTimeFilter(request, timeFilter, now));
}

export function isReleasedInReportPeriod(
  request: MaintenanceRequest,
  timeFilter: ReportTimeFilter,
  now = new Date()
): boolean {
  if (request.columnId !== "liberado") return false;
  if (timeFilter === "all") return true;
  const releaseRef = request.releasedDate || request.openingDate;
  return isDateInTimeFilter(releaseRef, timeFilter, now);
}

export function isOrcamentoColumn(columnId: MaintenanceRequest["columnId"]): boolean {
  return columnId === "orcamento" || columnId === "recusado";
}
