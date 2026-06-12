/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailDeliveryRecord,
  EmailDeliveryType,
  MaintenanceRequest,
} from "../types";

function getLatestDelivery(
  request: MaintenanceRequest,
  type: EmailDeliveryType
): EmailDeliveryRecord | undefined {
  const deliveries = request.emailDeliveries || [];
  const filtered = deliveries
    .filter((d) => d.type === type)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  return filtered[0];
}

export type EmailStatusVisual = "sent" | "failed" | "skipped" | "pending";

export interface EmailStatusInfo {
  type: EmailDeliveryType;
  label: string;
  status: EmailStatusVisual;
  latest?: EmailDeliveryRecord;
  tooltip: string;
}

const TYPE_LABELS: Record<EmailDeliveryType, string> = {
  budget: "Orçamento",
  maintenance_started: "Manutenção",
  rat: "RAT",
  tracking: "Rastreio",
  equipment_received: "Recebimento",
};

function legacySentAt(request: MaintenanceRequest, type: EmailDeliveryType): string | undefined {
  switch (type) {
    case "budget":
      return request.budgetEmailSentAt;
    case "rat":
      return request.ratEmailSentAt;
    case "maintenance_started":
      return request.maintenanceStartedEmailSentAt || request.paymentConfirmationEmailSentAt;
    case "equipment_received":
      return request.equipmentReceivedEmailSentAt;
    case "tracking":
      return request.trackingEmailSentAt;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function getEmailStatusForType(
  request: MaintenanceRequest,
  type: EmailDeliveryType
): EmailStatusInfo {
  const latest = getLatestDelivery(request, type);
  const label = TYPE_LABELS[type];

  if (latest) {
    const status: EmailStatusVisual =
      latest.status === "sent" ? "sent" : latest.status === "failed" ? "failed" : "skipped";
    const tooltipParts = [
      `${label}: ${status === "sent" ? "enviado" : status === "failed" ? "falhou" : "ignorado"}`,
      latest.recipient ? `Para: ${latest.recipient}` : "",
      `Em: ${formatDate(latest.sentAt)}`,
      latest.error ? `Motivo: ${latest.error}` : "",
    ].filter(Boolean);
    return { type, label, status, latest, tooltip: tooltipParts.join("\n") };
  }

  const legacy = legacySentAt(request, type);
  if (legacy) {
    return {
      type,
      label,
      status: "sent",
      tooltip: `${label}: enviado\nEm: ${formatDate(legacy)}`,
    };
  }

  return {
    type,
    label,
    status: "pending",
    tooltip: `${label}: não enviado`,
  };
}

export function getEmailStatusesForRequest(
  request: MaintenanceRequest,
  types: EmailDeliveryType[]
): EmailStatusInfo[] {
  return types.map((type) => getEmailStatusForType(request, type));
}

export function isEmailApplicable(request: MaintenanceRequest, type: EmailDeliveryType): boolean {
  switch (type) {
    case "budget":
      return Boolean(request.budget);
    case "maintenance_started":
      return request.columnId === "manutencao" || request.budgetPayment?.status === "paid";
    case "rat":
      return request.rat?.status === "Finalizado";
    case "tracking":
      return Boolean(request.shippingLabel?.trackingCode);
    case "equipment_received":
      return Boolean(request.equipmentReceivedDate);
  }
}
