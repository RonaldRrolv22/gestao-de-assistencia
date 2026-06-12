/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DIAGNOSIS_BUSINESS_DAYS,
  MAINTENANCE_SLA_BUSINESS_DAYS,
} from "../config/operationalDeadlines";
import { MaintenanceRequest } from "../types";
import { parseReportDate } from "./reportMetrics";
import {
  addBusinessDays,
  formatBrDate,
  toDateOnly,
} from "./businessDays";

export interface DeadlineHintRow {
  label: string;
  value: string;
}

/** Linhas informativas de prazo para cards de solicitação. */
export function getRequestDeadlineHints(req: MaintenanceRequest): DeadlineHintRow[] {
  if (req.columnId !== "solicitacao") return [];

  const received = parseReportDate(req.equipmentReceivedDate);
  if (!received) {
    return [{ label: "Retorno até", value: "—" }];
  }

  return [
    {
      label: "Retorno até",
      value: formatBrDate(addBusinessDays(received, DIAGNOSIS_BUSINESS_DAYS)),
    },
  ];
}

/** Data limite de reparo em dias úteis a partir da confirmação de pagamento/aprovação. */
export function getRepairDeadlineDate(reference: Date): Date {
  return addBusinessDays(reference, MAINTENANCE_SLA_BUSINESS_DAYS);
}

export function formatIsoDate(d: Date): string {
  const normalized = toDateOnly(d);
  const y = normalized.getFullYear();
  const m = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
